import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "../infra/prisma.js";
import { HttpError } from "../http/errors.js";
import type { Context } from "../http/router.js";

export type Tx = Prisma.TransactionClient;

export async function recordEvent(
  tx: Tx,
  actorId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  after: unknown = null,
  reason?: string,
) {
  await tx.auditLog.create({
    data: {
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      action,
      resourceType,
      resourceId,
      after: after === null ? undefined : JSON.parse(JSON.stringify(after)),
      reason: reason ?? null,
    },
  });
  await tx.outboxEvent.create({
    data: {
      eventType: action,
      aggregateType: resourceType,
      aggregateId: resourceId,
      payload: { actorId, resourceType, resourceId, action },
    },
  });
}

export async function lockFacility(tx: Tx, facilityId: string) {
  await tx.$queryRawUnsafe(
    'SELECT "id" FROM "Facility" WHERE "id" = $1::uuid FOR UPDATE',
    facilityId,
  );
}
export async function lockBooking(tx: Tx, bookingId: string) {
  await tx.$queryRawUnsafe(
    'SELECT "id" FROM "Booking" WHERE "id" = $1::uuid FOR UPDATE',
    bookingId,
  );
}

export function checkVersion(context: Context, version: number) {
  const tag = context.request.headers.get("if-match");
  if (!tag)
    throw new HttpError(428, "PRECONDITION_REQUIRED", "Reload this record before making changes.");
  if (tag !== `"${version}"`)
    throw new HttpError(412, "RESOURCE_VERSION_MISMATCH", "The record has changed. Refresh it.");
}

export async function withMutation<T>(
  context: Context,
  scope: string,
  callback: (tx: Tx) => Promise<T>,
  options: { allowReplay?: boolean } = {},
): Promise<T> {
  const actorId = context.actor?.id;
  if (!actorId) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue.");
  const key = context.request.headers.get("idempotency-key");
  if (!key || key.length < 12 || key.length > 128) {
    throw new HttpError(422, "IDEMPOTENCY_REQUIRED", "Idempotency-Key header is required.");
  }
  const raw = await context.rawBody();
  const fingerprint = createHash("sha256")
    .update(`${context.request.method}:${scope}:${raw}`)
    .digest("hex");
  const findExisting = async () =>
    prisma.idempotencyRecord.findUnique({
      where: { actorId_scope_key: { actorId, scope, key } },
    });
  const existing = await findExisting();
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new HttpError(
        409,
        "IDEMPOTENCY_KEY_CONFLICT",
        "This key belongs to a different request.",
      );
    }
    if (existing.status !== "COMPLETED")
      throw new HttpError(409, "REQUEST_ALREADY_PROCESSING", "Try again shortly.");
    if (options.allowReplay === false) {
      throw new HttpError(
        409,
        "ALREADY_PROCESSED",
        "This credential operation was already processed. Use credential reset if needed.",
      );
    }
    return existing.response as T;
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.idempotencyRecord.create({
          data: {
            actorId,
            scope,
            key,
            fingerprint,
            expiresAt: new Date(Date.now() + 86400_000),
          },
        });
        const result = await callback(tx);
        await tx.idempotencyRecord.update({
          where: { actorId_scope_key: { actorId, scope, key } },
          data: {
            status: "COMPLETED",
            responseStatus: 200,
            response: JSON.parse(JSON.stringify(result)),
            completedAt: new Date(),
          },
        });
        return result;
      },
      { timeout: 20_000, maxWait: 8_000 },
    );
  } catch (error) {
    const after = await findExisting();
    if (after && after.fingerprint === fingerprint && after.status === "COMPLETED") {
      if (options.allowReplay === false)
        throw new HttpError(
          409,
          "ALREADY_PROCESSED",
          "Credential operation completed. Use reset if needed.",
        );
      return after.response as T;
    }
    throw error;
  }
}
