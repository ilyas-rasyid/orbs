import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { bookingInclude } from "../../bookings/booking.select.js";
import { claimEnd } from "../../../shared/domain/scheduling.js";
import {
  checkVersion,
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { requireOfficer } from "../policy/operations.policy.js";
import { returnSchema } from "../payload/usage.schema.js";

export async function finishUsage(context: Context, category: "MEETING_ROOM" | "PHYSICAL") {
  if (category === "PHYSICAL") requireOfficer(context);
  const input = await context.body(returnSchema);
  const actor = context.actor!;
  const id = context.params.id!;
  return withMutation(context, `booking:${id}:finish`, async (tx) => {
    const old = await tx.booking.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Booking not found.");
    await lockFacility(tx, old.facilityId);
    await lockBooking(tx, old.id);
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: old.id },
      include: {
        facility: { include: { category: true } },
        usage: { include: { vehicle: true, equipment: true } },
        claim: true,
      },
    });
    checkVersion(context, booking.version);
    assert(
      booking.status === "IN_USE" && booking.usage?.state === "ACTIVE",
      409,
      "BOOKING_STATE_CONFLICT",
      "Booking is not currently in use.",
    );
    const kind = booking.facility.category.code;
    assert(
      (category === "MEETING_ROOM") === (kind === "MEETING_ROOM"),
      422,
      "INVALID_CATEGORY",
      "Use the correct checkout or return action.",
    );
    assert(
      category === "PHYSICAL" ||
        actor.role !== "EMPLOYEE" ||
        booking.responsibleUserId === actor.id,
      403,
      "ACCESS_DENIED",
      "You cannot check out this booking.",
    );
    const now = new Date();
    const usage = booking.usage;
    // Actual return can be accepted outside normal service hours to unblock physical custody.
    if (kind === "VEHICLE") {
      assert(
        input.endingOdometer !== undefined &&
          input.endingOdometer >= (usage.vehicle?.startOdometer ?? 0),
        422,
        "INVALID_ODOMETER",
        "Ending odometer cannot be below starting odometer.",
      );
      assert(
        input.condition !== "DAMAGED" || !!input.damageNotes?.trim(),
        422,
        "VALIDATION_FAILED",
        "Damage notes are required for damaged vehicles.",
      );
      await tx.vehicleUsageDetail.update({
        where: { usageId: usage.id },
        data: {
          endOdometer: input.endingOdometer,
          endCondition: input.condition,
          fuelEnd: input.fuel ?? null,
          returnOfficerId: actor.id,
          damageNotes: input.damageNotes ?? null,
          distance: input.endingOdometer! - usage.vehicle!.startOdometer,
        },
      });
      await tx.vehicleProfile.update({
        where: { facilityId: booking.facilityId },
        data: {
          currentOdometer: input.endingOdometer,
          currentCondition: input.condition,
        },
      });
    }
    if (kind === "EQUIPMENT") {
      assert(
        input.condition !== "DAMAGED" || !!input.damageNotes?.trim(),
        422,
        "VALIDATION_FAILED",
        "Damage notes are required for damaged equipment.",
      );
      await tx.equipmentUsageDetail.update({
        where: { usageId: usage.id },
        data: {
          endCondition: input.condition,
          damageNotes: input.damageNotes ?? null,
          returnOfficerId: actor.id,
        },
      });
      await tx.equipmentProfile.update({
        where: { facilityId: booking.facilityId },
        data: { currentCondition: input.condition },
      });
    }
    await tx.usageSession.update({
      where: { id: usage.id },
      data: {
        endAt: now,
        endedById: actor.id,
        state: "COMPLETED",
        endNotes: input.notes ?? "",
        version: { increment: 1 },
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", version: { increment: 1 } },
    });
    if (booking.claim && now < booking.claim.endAt) {
      const end = claimEnd(now, booking.claim.bufferMinutes);
      if (end < booking.claim.endAt)
        await tx.resourceTimeClaim.update({
          where: { id: booking.claim.id },
          data: {
            endAt:
              end > booking.claim.startAt ? end : new Date(booking.claim.startAt.getTime() + 1000),
          },
        });
    }
    await recordEvent(tx, actor.id, "USAGE_COMPLETED", "Booking", booking.id, {
      usageId: usage.id,
    });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
