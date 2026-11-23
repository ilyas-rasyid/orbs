import { z } from "zod";
import { route, admin, pagination } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import { checkVersion, recordEvent, withMutation } from "../../../shared/transactions.js";
import { secret } from "../../../security/sessions.js";

const userSafe = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  role: true,
  status: true,
  version: true,
  mustChangePassword: true,
  department: true,
  createdAt: true,
} as const;
const userInput = z
  .object({
    employeeCode: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    departmentId: z.string().uuid().nullable().optional(),
    role: z.enum(["EMPLOYEE", "FACILITY_MANAGER", "ADMIN"]).default("EMPLOYEE"),
  })
  .strict();

export function registerAdminRoutes() {
  route("GET", "/admin/users", async (ctx) => {
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
  });
  route("GET", "/admin/users/:id", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const user = await prisma.user.findUnique({ where: { id }, select: userSafe });
    if (!user) throw new HttpError(404, "RESOURCE_NOT_FOUND", "User not found.");
    return user;
  });
  route("POST", "/admin/users", async (ctx) => {
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
  });
  route("PATCH", "/admin/users/:id", async (ctx) => {
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
  });
  route("POST", "/admin/users/:id/deactivate", async (ctx) => {
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
  });
  route("POST", "/admin/users/:id/activate", async (ctx) => {
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
  });
  route("POST", "/admin/users/:id/credential-reset", async (ctx) => {
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
  });

  route("GET", "/admin/departments", async (ctx) => {
    admin(ctx);
    return prisma.department.findMany({ orderBy: { name: "asc" } });
  });
  route("POST", "/admin/departments", async (ctx) => {
    admin(ctx);
    const input = await ctx.body(
      z.object({ code: z.string().min(2), name: z.string().min(2) }).strict(),
    );
    return withMutation(ctx, "department:create", async (tx) => {
      const result = await tx.department.create({
        data: { code: input.code.toUpperCase(), name: input.name },
      });
      await recordEvent(tx, ctx.actor!.id, "DEPARTMENT_CREATED", "Department", result.id);
      return result;
    });
  });
  route("GET", "/admin/locations", async (ctx) => {
    admin(ctx);
    return prisma.officeLocation.findMany({ orderBy: { name: "asc" } });
  });
  route("POST", "/admin/locations", async (ctx) => {
    admin(ctx);
    const input = await ctx.body(
      z
        .object({
          code: z.string().min(2),
          name: z.string().min(2),
          address: z.string().default(""),
        })
        .strict(),
    );
    return withMutation(ctx, "locations:create", async (tx) => {
      const location = await tx.officeLocation.create({
        data: { ...input, code: input.code.toUpperCase() },
      });
      await recordEvent(tx, ctx.actor!.id, "LOCATION_CREATED", "OfficeLocation", location.id);
      return location;
    });
  });
  route("GET", "/admin/facility-categories", async (ctx) => {
    admin(ctx);
    return prisma.facilityCategory.findMany({ orderBy: { name: "asc" } });
  });
  route("GET", "/admin/settings", async (ctx) => {
    admin(ctx);
    return prisma.organizationSetting.findFirst();
  });
  route("PATCH", "/admin/settings", async (ctx) => {
    admin(ctx);
    const input = await ctx.body(
      z
        .object({
          name: z.string().min(2).max(200).optional(),
          timezone: z.string().min(3).max(80).optional(),
          leadMinutes: z.number().int().nonnegative().optional(),
          horizonDays: z.number().int().positive().max(365).optional(),
          noShowMinutes: z.number().int().nonnegative().optional(),
        })
        .strict(),
    );
    if (input.timezone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: input.timezone });
      } catch {
        throw new HttpError(422, "INVALID_TIMEZONE", "Unknown timezone.");
      }
    }
    return withMutation(ctx, "settings:update", async (tx) => {
      const old = await tx.organizationSetting.findFirst();
      assert(old, 500, "CONFIGURATION_ERROR", "Organization settings missing.");
      checkVersion(ctx, old.version);
      const result = await tx.organizationSetting.update({
        where: { id: old.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.leadMinutes !== undefined ? { leadMinutes: input.leadMinutes } : {}),
          ...(input.horizonDays !== undefined ? { horizonDays: input.horizonDays } : {}),
          ...(input.noShowMinutes !== undefined ? { noShowMinutes: input.noShowMinutes } : {}),
          version: { increment: 1 },
        },
      });
      await recordEvent(tx, ctx.actor!.id, "SETTINGS_UPDATED", "OrganizationSetting", old.id);
      return result;
    });
  });
  route("GET", "/admin/audit-logs", async (ctx) => {
    admin(ctx);
    const p = pagination(ctx.query);
    const resourceType = ctx.query.get("resourceType");
    return prisma.auditLog.findMany({
      take: p.take,
      skip: p.skip,
      orderBy: { createdAt: "desc" },
      where: resourceType ? { resourceType } : {},
    });
  });
  route("GET", "/admin/audit-logs/:id", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const result = await prisma.auditLog.findUnique({ where: { id } });
    assert(result, 404, "RESOURCE_NOT_FOUND", "Audit event not found.");
    return result;
  });
}
