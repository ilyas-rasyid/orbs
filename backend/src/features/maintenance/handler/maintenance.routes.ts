import { z } from "zod";
import { route, manager } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { assert } from "../../../http/errors.js";
import {
  lockFacility,
  checkVersion,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { parseInterval } from "../../../shared/domain/scheduling.js";

const createInput = z
  .object({
    facilityId: z.string().uuid(),
    startAt: z.string(),
    endAt: z.string(),
    reason: z.string().trim().min(3).max(300),
    notes: z.string().max(1000).default(""),
  })
  .strict();
export function registerMaintenanceRoutes() {
  route("GET", "/operations/maintenance", async (ctx) => {
    manager(ctx);
    const status = ctx.query.get("status");
    return prisma.maintenance.findMany({
      where: status ? { status } : {},
      include: { facility: { include: { category: true } } },
      orderBy: { startAt: "desc" },
      take: 100,
    });
  });
  route("GET", "/operations/maintenance/:id", async (ctx) => {
    manager(ctx);
    const id = ctx.params.id!;
    const result = await prisma.maintenance.findUnique({
      where: { id },
      include: { facility: true },
    });
    assert(result, 404, "RESOURCE_NOT_FOUND", "Maintenance not found.");
    return result;
  });
  route("POST", "/operations/maintenance", async (ctx) => {
    manager(ctx);
    const input = await ctx.body(createInput);
    const { startAt, endAt } = parseInterval(input.startAt, input.endAt);
    return withMutation(ctx, "maintenance:create", async (tx) => {
      await lockFacility(tx, input.facilityId);
      const facility = await tx.facility.findUnique({ where: { id: input.facilityId } });
      assert(
        facility?.status === "ACTIVE",
        409,
        "FACILITY_UNAVAILABLE",
        "Facility must be active.",
      );
      const ongoing = await tx.usageSession.findFirst({
        where: { facilityId: facility.id, state: "ACTIVE" },
      });
      assert(!ongoing, 409, "FACILITY_IN_USE", "Facility is currently in use.");
      const item = await tx.maintenance.create({
        data: {
          reference: `MT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          facilityId: facility.id,
          startAt,
          endAt,
          reason: input.reason,
          notes: input.notes,
          createdById: ctx.actor!.id,
        },
      });
      await tx.resourceTimeClaim.create({
        data: {
          facilityId: facility.id,
          maintenanceId: item.id,
          startAt,
          endAt,
        },
      });
      await recordEvent(tx, ctx.actor!.id, "MAINTENANCE_SCHEDULED", "Maintenance", item.id);
      return item;
    });
  });
  route("POST", "/operations/maintenance/:id/start", (ctx) => transition(ctx, "start"));
  route("POST", "/operations/maintenance/:id/complete", (ctx) => transition(ctx, "complete"));
  route("POST", "/operations/maintenance/:id/cancel", (ctx) => transition(ctx, "cancel"));
  route("PATCH", "/operations/maintenance/:id", async (ctx) => {
    manager(ctx);
    const input = await ctx.body(
      z
        .object({
          reason: z.string().min(3).optional(),
          notes: z.string().max(1000).optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional(),
        })
        .strict(),
    );
    const id = ctx.params.id!;
    return withMutation(ctx, `maintenance:${id}:edit`, async (tx) => {
      const original = await tx.maintenance.findUnique({ where: { id } });
      assert(original, 404, "RESOURCE_NOT_FOUND", "Maintenance not found.");
      await lockFacility(tx, original.facilityId);
      const latest = await tx.maintenance.findUniqueOrThrow({ where: { id: original.id } });
      checkVersion(ctx, latest.version);
      assert(
        latest.status === "SCHEDULED",
        409,
        "MAINTENANCE_STATE_CONFLICT",
        "Only scheduled maintenance can be edited.",
      );
      const { startAt, endAt } = parseInterval(
        input.startAt ?? latest.startAt.toISOString(),
        input.endAt ?? latest.endAt.toISOString(),
      );
      const result = await tx.maintenance.update({
        where: { id: latest.id },
        data: {
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          startAt,
          endAt,
          version: { increment: 1 },
        },
      });
      await tx.resourceTimeClaim.update({
        where: { maintenanceId: latest.id },
        data: { startAt, endAt },
      });
      await recordEvent(tx, ctx.actor!.id, "MAINTENANCE_EDITED", "Maintenance", latest.id);
      return result;
    });
  });
}

async function transition(
  ctx: Parameters<Parameters<typeof route>[2]>[0],
  action: "start" | "complete" | "cancel",
) {
  manager(ctx);
  const input = await ctx.body(
    z.object({ reason: z.string().trim().max(500).optional() }).strict(),
  );
  const id = ctx.params.id!;
  return withMutation(ctx, `maintenance:${id}:${action}`, async (tx) => {
    const old = await tx.maintenance.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Maintenance not found.");
    await lockFacility(tx, old.facilityId);
    const item = await tx.maintenance.findUniqueOrThrow({
      where: { id: old.id },
      include: { claim: true },
    });
    checkVersion(ctx, item.version);
    if (action === "start") {
      assert(
        item.status === "SCHEDULED",
        409,
        "MAINTENANCE_STATE_CONFLICT",
        "Maintenance already started.",
      );
      const usage = await tx.usageSession.findFirst({
        where: { facilityId: item.facilityId, state: "ACTIVE" },
      });
      assert(!usage, 409, "FACILITY_IN_USE", "Return the asset before maintenance.");
      const now = new Date();
      if (item.claim && now < item.claim.startAt)
        await tx.resourceTimeClaim.update({
          where: { id: item.claim.id },
          data: { startAt: now },
        });
      await tx.maintenance.update({
        where: { id: item.id },
        data: {
          status: "IN_PROGRESS",
          actualStartAt: now,
          startedById: ctx.actor!.id,
          version: { increment: 1 },
        },
      });
    } else if (action === "complete") {
      assert(
        item.status === "IN_PROGRESS",
        409,
        "MAINTENANCE_STATE_CONFLICT",
        "Maintenance is not in progress.",
      );
      const now = new Date();
      await tx.maintenance.update({
        where: { id: item.id },
        data: {
          status: "COMPLETED",
          actualEndAt: now,
          completedById: ctx.actor!.id,
          version: { increment: 1 },
        },
      });
      if (item.claim && now < item.claim.endAt && now > item.claim.startAt) {
        await tx.resourceTimeClaim.update({ where: { id: item.claim.id }, data: { endAt: now } });
      }
    } else {
      assert(
        item.status === "SCHEDULED",
        409,
        "MAINTENANCE_STATE_CONFLICT",
        "Only scheduled maintenance can be cancelled.",
      );
      assert(!!input.reason, 422, "VALIDATION_FAILED", "Cancellation reason is required.");
      await tx.maintenance.update({
        where: { id: item.id },
        data: {
          status: "CANCELLED",
          cancelledById: ctx.actor!.id,
          cancellationReason: input.reason,
          version: { increment: 1 },
        },
      });
      await tx.resourceTimeClaim.updateMany({
        where: { maintenanceId: item.id, state: "ACTIVE" },
        data: { state: "RELEASED", releasedAt: new Date(), releaseReason: "CANCELLED" },
      });
    }
    await recordEvent(
      tx,
      ctx.actor!.id,
      `MAINTENANCE_${action.toUpperCase()}`,
      "Maintenance",
      item.id,
    );
    return tx.maintenance.findUniqueOrThrow({
      where: { id: item.id },
      include: { facility: true },
    });
  });
}
