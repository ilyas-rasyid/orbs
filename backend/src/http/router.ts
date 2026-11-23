import { z } from "zod";
import { prisma } from "../infra/prisma.js";
import { authenticate, checkOrigin, requireCsrf, type Actor } from "../security/sessions.js";
import { HttpError, formatError } from "./errors.js";

export type Context = {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  actor: Actor | null;
  requestId: string;
  body: <T>(schema: z.ZodType<T>) => Promise<T>;
  rawBody: () => Promise<string>;
};
export type Handler = (context: Context) => Promise<unknown> | unknown;
type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler; public: boolean };
const routes: Route[] = [];

export function route(
  method: string,
  path: string,
  handler: Handler,
  options: { public?: boolean } = {},
) {
  const keys: string[] = [];
  const pattern = path.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, (_match, key: string) => {
    keys.push(key);
    return "([^/]+)";
  });
  routes.push({
    method,
    pattern: new RegExp(`^/api/v1${pattern}$`),
    keys,
    handler,
    public: options.public ?? false,
  });
}

export async function dispatch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();
  const match = routes.find(
    (item) => item.method === request.method && item.pattern.test(url.pathname),
  );
  const headers = { "cache-control": "no-store", "x-request-id": requestId };
  if (!match)
    return formatError(
      new HttpError(404, "RESOURCE_NOT_FOUND", "Route not found."),
      url.pathname,
      requestId,
    );
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) checkOrigin(request);
    const actor = await authenticate(request);
    if (!match.public && !actor) {
      throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue.");
    }
    if (
      actor?.mustChangePassword &&
      ![
        "/api/v1/auth/csrf",
        "/api/v1/auth/me",
        "/api/v1/auth/logout",
        "/api/v1/auth/change-password",
      ].includes(url.pathname)
    ) {
      throw new HttpError(
        403,
        "PASSWORD_CHANGE_REQUIRED",
        "Change your password before continuing.",
      );
    }
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      url.pathname !== "/api/v1/auth/login"
    ) {
      await requireCsrf(request, actor);
    }
    const matched = url.pathname.match(match.pattern)!;
    const params: Record<string, string> = Object.fromEntries(
      match.keys.map((key, index) => [key, matched[index + 1] ?? ""]),
    );
    // The request stream can only be read once. Reuse the cached bytes for
    // validation and the idempotency fingerprint inside the same request.
    let bodyPromise: Promise<string> | undefined;
    const rawBody = () => {
      bodyPromise ??= request.text();
      return bodyPromise;
    };
    const context: Context = {
      request,
      params,
      query: url.searchParams,
      actor,
      requestId,
      rawBody,
      body: async <T>(schema: z.ZodType<T>): Promise<T> => {
        if (!request.headers.get("content-type")?.includes("application/json")) {
          throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send application/json.");
        }
        const raw = await rawBody();
        if (raw.length > 48_000)
          throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request too large.");
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new HttpError(400, "BAD_REQUEST", "Invalid JSON.");
        }
        return schema.parse(parsed);
      },
    };
    const result = await match.handler(context);
    if (result instanceof Response) return result;
    const wrapped =
      result && typeof result === "object" && "data" in result ? result : { data: result };
    return Response.json(wrapped, { headers });
  } catch (error) {
    return formatError(error, url.pathname, requestId);
  }
}

export function currentUser(context: Context): Actor {
  if (!context.actor) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue.");
  return context.actor;
}
export function manager(context: Context): Actor {
  const actor = currentUser(context);
  if (actor.role === "EMPLOYEE")
    throw new HttpError(403, "ACCESS_DENIED", "Manager role required.");
  return actor;
}
export function admin(context: Context): Actor {
  const actor = currentUser(context);
  if (actor.role !== "ADMIN") throw new HttpError(403, "ACCESS_DENIED", "Admin role required.");
  return actor;
}
export function limit(query: URLSearchParams): number {
  const value = Number(query.get("limit") ?? 30);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new HttpError(422, "VALIDATION_FAILED", "Limit must be from 1 to 100.");
  }
  return value;
}
export function pagination(query: URLSearchParams) {
  const page = Number(query.get("page") ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 100_000) {
    throw new HttpError(422, "VALIDATION_FAILED", "Invalid page number.");
  }
  const size = limit(query);
  return { take: size, skip: (page - 1) * size, page, limit: size };
}
export async function directoryUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE")
    throw new HttpError(422, "INVALID_USER", "Choose an active employee.");
  return user;
}
