import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../infra/prisma.js";
import { HttpError } from "../http/errors.js";

export type Actor = {
  id: string;
  name: string;
  role: string;
  email: string;
  sessionId: string;
  csrfHash: string;
  mustChangePassword: boolean;
};
const production = process.env.NODE_ENV === "production";
const sessionName = production ? "__Host-orbs_session" : "orbs_session";
const preName = production ? "__Host-orbs_pre" : "orbs_pre";
const cookieFlags = `Path=/; SameSite=Lax; ${production ? "Secure; " : ""}`;
export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
export function secret(): string {
  return randomBytes(32).toString("base64url");
}
export function cookie(value: string, name = sessionName, age = 7 * 86400): string {
  return `${name}=${encodeURIComponent(value)}; ${cookieFlags}HttpOnly; Max-Age=${age}`;
}
export function clearCookie(): string {
  return cookie("", sessionName, 0);
}
export function preCookie(value: string): string {
  return cookie(value, preName, 600);
}
export function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export async function authenticate(request: Request): Promise<Actor | null> {
  const token = readCookie(request, sessionName);
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  )
    return null;
  if (Date.now() - session.lastSeenAt.getTime() > 8 * 3600_000) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    sessionId: session.id,
    csrfHash: session.csrfHash,
    mustChangePassword: session.user.mustChangePassword,
  };
}
export function checkOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const expected = process.env.ORBS_PUBLIC_ORIGIN || new URL(request.url).origin;
  let trusted: boolean;
  try {
    if (!origin) {
      trusted = false;
    } else {
      const originUrl = new URL(origin);
      const expectedUrl = new URL(expected);
      const isLocalLoopback =
        process.env.NODE_ENV !== "production" &&
        !process.env.ORBS_PUBLIC_ORIGIN &&
        ["127.0.0.1", "localhost"].includes(originUrl.hostname) &&
        ["127.0.0.1", "localhost"].includes(expectedUrl.hostname);
      trusted = originUrl.origin === expectedUrl.origin || isLocalLoopback;
    }
  } catch {
    trusted = false;
  }
  if (!trusted) {
    throw new HttpError(403, "CSRF_VALIDATION_FAILED", "Untrusted request origin.");
  }
}

export async function requireCsrf(request: Request, actor: Actor | null) {
  const token = request.headers.get("x-csrf-token") ?? "";
  if (!actor || !token || !equal(hash(token), actor.csrfHash)) {
    throw new HttpError(403, "CSRF_VALIDATION_FAILED", "Invalid CSRF token.");
  }
}
export function verifyPreCsrf(request: Request): void {
  const pre = readCookie(request, preName) ?? "";
  const supplied = request.headers.get("x-csrf-token") ?? "";
  if (!pre || !supplied || !equal(pre, supplied)) {
    throw new HttpError(403, "CSRF_VALIDATION_FAILED", "Refresh the login form.");
  }
}
export async function createSession(userId: string, request: Request) {
  const token = secret();
  const csrf = secret();
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1::uuid FOR UPDATE', userId);
    await tx.authSession.create({
      data: {
        userId,
        tokenHash: hash(token),
        csrfHash: hash(csrf),
        expiresAt,
        device: (request.headers.get("user-agent") ?? "").slice(0, 180),
      },
    });
    const active = await tx.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const staleIds = active.slice(5).map((entry) => entry.id);
    if (staleIds.length > 0) {
      await tx.authSession.updateMany({
        where: { id: { in: staleIds } },
        data: { revokedAt: new Date() },
      });
    }
  });
  return { token, csrf, expiresAt };
}
