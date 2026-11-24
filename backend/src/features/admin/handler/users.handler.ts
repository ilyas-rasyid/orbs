import type { Handler } from "../../../http/router.js";
import { z } from "zod";
import { admin, pagination } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import { checkVersion, recordEvent, withMutation } from "../../../shared/transactions.js";
import { secret } from "../../../security/sessions.js";
import { userInput } from "../payload/user.schema.js";
import { userSafe } from "../repository/user.select.js";

export const listUsers: Handler = async (ctx) => {
  admin(ctx);
  const p = pagination(ctx.query);
  const search = ctx.query.get("search") ?? "";
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSafe,
      take: p.take,
      skip: p.skip,
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where }),
  ]);
  return { data, meta: { page: p.page, limit: p.limit, total } };
};

export const getUser: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const user = await prisma.user.findUnique({ where: { id }, select: userSafe });
  if (!user) throw new HttpError(404, "RESOURCE_NOT_FOUND", "User not found.");
  return user;
};

export const createUser: Handler = async (ctx) => {
  admin(ctx);
  const input = await ctx.body(userInput);
  const password = secret().slice(0, 24) + "aB1!";
  const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
  const created = await withMutation(
    ctx,
    "users:create",
    async (tx) => {
      const user = await tx.user.create({
        data: {
          employeeCode: input.employeeCode,
          name: input.name,
          email: input.email.toLowerCase(),
          departmentId: input.departmentId ?? null,
          role: input.role,
          passwordHash,
          mustChangePassword: true,
        },
      });
      await recordEvent(tx, ctx.actor!.id, "USER_CREATED", "User", user.id);
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
    { allowReplay: false },
  );
  return {
    ...created,
    temporaryPassword: password,
    credentialNotice: "Show once. Use a secure delivery channel.",
  };
};

export const updateUser: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const input = await ctx.body(userInput.partial());
  return withMutation(ctx, `user:${id}:update`, async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    assert(user, 404, "RESOURCE_NOT_FOUND", "User not found.");
    checkVersion(ctx, user.version);
    await tx.$queryRawUnsafe('SELECT "id" FROM "OrganizationSetting" FOR UPDATE');
    if (user.role === "ADMIN" && input.role && input.role !== "ADMIN") {
      const count = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      assert(count > 1, 409, "LAST_ADMIN", "Cannot remove the last active Admin.");
    }
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        version: { increment: 1 },
      },
      select: userSafe,
    });
    if (input.role && input.role !== user.role)
      await tx.authSession.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });
    await recordEvent(tx, ctx.actor!.id, "USER_UPDATED", "User", user.id);
    return updated;
  });
};

export const deactivateUser: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const { reason } = await ctx.body(z.object({ reason: z.string().min(3).max(500) }).strict());
  return withMutation(ctx, `user:${id}:deactivate`, async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    assert(user, 404, "RESOURCE_NOT_FOUND", "User not found.");
    checkVersion(ctx, user.version);
    await tx.$queryRawUnsafe('SELECT "id" FROM "OrganizationSetting" FOR UPDATE');
    if (user.role === "ADMIN" && user.status === "ACTIVE") {
      const count = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      assert(count > 1, 409, "LAST_ADMIN", "Cannot deactivate the last Admin.");
    }
    const result = await tx.user.update({
      where: { id: user.id },
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        version: { increment: 1 },
      },
      select: userSafe,
    });
    await tx.authSession.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });
    await recordEvent(tx, ctx.actor!.id, "USER_DEACTIVATED", "User", user.id, null, reason);
    return result;
  });
};

export const activateUser: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  await ctx.body(z.object({}).strict());
  return withMutation(ctx, `user:${id}:activate`, async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    assert(user, 404, "RESOURCE_NOT_FOUND", "User not found.");
    checkVersion(ctx, user.version);
    const result = await tx.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        deactivatedAt: null,
        version: { increment: 1 },
      },
      select: userSafe,
    });
    await recordEvent(tx, ctx.actor!.id, "USER_ACTIVATED", "User", user.id);
    return result;
  });
};

export const resetUserCredentials: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  await ctx.body(z.object({}).strict());
  const temporary = secret().slice(0, 24) + "aB1!";
  const passwordHash = await Bun.password.hash(temporary, { algorithm: "argon2id" });
  const result = await withMutation(
    ctx,
    `user:${id}:password-reset`,
    async (tx) => {
      const old = await tx.user.findUnique({ where: { id } });
      assert(old, 404, "RESOURCE_NOT_FOUND", "User not found.");
      checkVersion(ctx, old.version);
      await tx.user.update({
        where: { id: old.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          version: { increment: 1 },
        },
      });
      await tx.authSession.updateMany({
        where: { userId: old.id },
        data: { revokedAt: new Date() },
      });
      await recordEvent(tx, ctx.actor!.id, "PASSWORD_RESET", "User", old.id);
      return { id: old.id, reset: true };
    },
    { allowReplay: false },
  );
  return { ...result, temporaryPassword: temporary };
};
