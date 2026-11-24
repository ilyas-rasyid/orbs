import type { Handler } from "../../../http/router.js";
import { z } from "zod";
import { manager } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import {
  lockFacility,
  checkVersion,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { parseInterval } from "../../../shared/domain/scheduling.js";
import { createInput } from "../payload/maintenance.schema.js";
import { transition } from "../service/maintenance-lifecycle.service.js";

export const createMaintenance: Handler = async (ctx) => {
  manager(ctx);
  const input = await ctx.body(createInput);
  const { startAt, endAt } = parseInterval(input.startAt, input.endAt);
  return withMutation(ctx, "maintenance:create", async (tx) => {
    await lockFacility(tx, input.facilityId);
    const facility = await tx.facility.findUnique({ where: { id: input.facilityId } });
    assert(facility?.status === "ACTIVE", 409, "FACILITY_UNAVAILABLE", "Facility must be active.");
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
};

export const startMaintenance: Handler = (ctx) => transition(ctx, "start");

export const completeMaintenance: Handler = (ctx) => transition(ctx, "complete");

export const cancelMaintenance: Handler = (ctx) => transition(ctx, "cancel");

export const updateMaintenance: Handler = async (ctx) => {
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
};
