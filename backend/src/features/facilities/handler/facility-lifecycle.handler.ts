import type { Handler } from "../../../http/router.js";
import { admin, manager } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { z } from "zod";
import {
  checkVersion,
  lockFacility,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";

export const deactivateFacility: Handler = async (ctx) => {
  manager(ctx);
  const id = ctx.params.id!;
  const { reason } = await ctx.body(z.object({ reason: z.string().min(3).max(500) }).strict());
  return withMutation(ctx, `facility:${id}:deactivate`, async (tx) => {
    await lockFacility(tx, id);
    const old = await tx.facility.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
    checkVersion(ctx, old.version);
    const facility = await tx.facility.update({
      where: { id: old.id },
      data: { status: "INACTIVE", version: { increment: 1 } },
    });
    await recordEvent(tx, ctx.actor!.id, "FACILITY_DEACTIVATED", "Facility", old.id, null, reason);
    return facility;
  });
};

export const reactivateFacility: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const { reason } = await ctx.body(z.object({ reason: z.string().min(3).max(500) }).strict());
  return withMutation(ctx, `facility:${id}:reactivate`, async (tx) => {
    await lockFacility(tx, id);
    const old = await tx.facility.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
    checkVersion(ctx, old.version);
    assert(
      old.status === "INACTIVE",
      409,
      "FACILITY_STATE_CONFLICT",
      "Only inactive facilities can be reactivated.",
    );
    const maintenance = await tx.maintenance.findFirst({
      where: { facilityId: old.id, status: "IN_PROGRESS" },
    });
    assert(
      !maintenance,
      409,
      "FACILITY_UNAVAILABLE",
      "Finish active maintenance before reactivation.",
    );
    const facility = await tx.facility.update({
      where: { id: old.id },
      data: {
        status: "ACTIVE",
        version: { increment: 1 },
      },
    });
    await recordEvent(tx, ctx.actor!.id, "FACILITY_REACTIVATED", "Facility", old.id, null, reason);
    return facility;
  });
};

export const archiveFacility: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const { reason } = await ctx.body(z.object({ reason: z.string().min(3) }).strict());
  return withMutation(ctx, `facility:${id}:archive`, async (tx) => {
    await lockFacility(tx, id);
    const old = await tx.facility.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
    checkVersion(ctx, old.version);
    const active = await tx.usageSession.findFirst({
      where: { facilityId: old.id, state: "ACTIVE" },
    });
    assert(!active, 409, "FACILITY_IN_USE", "Return the asset before archiving.");
    const updated = await tx.facility.update({
      where: { id: old.id },
      data: {
        status: "ARCHIVED",
        version: { increment: 1 },
      },
    });
    await recordEvent(tx, ctx.actor!.id, "FACILITY_ARCHIVED", "Facility", old.id, null, reason);
    return updated;
  });
};
