import { z } from "zod";
import { route } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError } from "../../../http/errors.js";
import {
  checkLoginAttempts,
  recordLoginFailure,
  clearLoginFailures,
} from "../../../security/login-rate-limit.js";
import {
  secret,
  hash,
  cookie,
  preCookie,
  clearCookie,
  verifyPreCsrf,
  createSession,
} from "../../../security/sessions.js";

const credentials = z.object({ email: z.string().email(), password: z.string().min(1) }).strict();
const safeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
});

export function registerAuthenticationRoutes() {
  route(
    "GET",
    "/auth/csrf",
    async ({ actor }) => {
      if (!actor) {
        const csrf = secret();
        return new Response(JSON.stringify({ data: { csrf } }), {
          headers: {
            "set-cookie": preCookie(csrf),
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      }
      const csrf = secret();
      await prisma.authSession.update({
        where: { id: actor.sessionId },
        data: { csrfHash: hash(csrf) },
      });
      return { csrf };
    },
    { public: true },
  );

  route(
    "POST",
    "/auth/login",
    async ({ request, body }) => {
      verifyPreCsrf(request);
      const input = await body(credentials);
      checkLoginAttempts(request, input.email);
      const user = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      });
      if (
        !user ||
        user.status !== "ACTIVE" ||
        !(await Bun.password.verify(input.password, user.passwordHash))
      ) {
        recordLoginFailure(request, input.email);
        throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      }
      clearLoginFailures(request, input.email);
      const session = await createSession(user.id, request);
      return new Response(JSON.stringify({ data: { user: safeUser(user), csrf: session.csrf } }), {
        headers: {
          "set-cookie": cookie(session.token),
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    },
    { public: true },
  );

  route("GET", "/auth/me", async ({ actor }) => {
    const current = actor!;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
    const organization = await prisma.organizationSetting.findFirst();
    return { user: safeUser(user), timezone: organization?.timezone ?? "Asia/Makassar" };
  });

  route("POST", "/auth/logout", async ({ actor }) => {
    await prisma.authSession.update({
      where: { id: actor!.sessionId },
      data: { revokedAt: new Date() },
    });
    return new Response(JSON.stringify({ data: { success: true } }), {
      headers: { "set-cookie": clearCookie(), "content-type": "application/json" },
    });
  });

  route("GET", "/auth/sessions", async ({ actor }) => {
    return prisma.authSession.findMany({
      where: { userId: actor!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, device: true },
      orderBy: { createdAt: "desc" },
    });
  });

  route("POST", "/auth/sessions/:id/revoke", async ({ actor, params }) => {
    const id = params.id!;
    const session = await prisma.authSession.findFirst({
      where: { id, userId: actor!.id },
    });
    if (!session) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Session not found.");
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return { success: true };
  });

  route("POST", "/auth/change-password", async ({ actor, body }) => {
    const input = await body(
      z.object({ currentPassword: z.string(), newPassword: z.string().min(12).max(128) }).strict(),
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: actor!.id } });
    if (
      !user.mustChangePassword &&
      !(await Bun.password.verify(input.currentPassword, user.passwordHash))
    ) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Current password is invalid.");
    }
    const passwordHash = await Bun.password.hash(input.newPassword, { algorithm: "argon2id" });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, version: { increment: 1 } },
      }),
      prisma.authSession.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      }),
    ]);
    return new Response(JSON.stringify({ data: { success: true, loginRequired: true } }), {
      headers: { "set-cookie": clearCookie(), "content-type": "application/json" },
    });
  });
}
