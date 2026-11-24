import { z } from "zod";
import { route, manager } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import {
  lockFacility,
  checkVersion,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";

export async function transition(
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
