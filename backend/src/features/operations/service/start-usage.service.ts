import { directoryUser } from "../../../http/router.js";
import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { bookingInclude } from "../../bookings/booking.select.js";
import { isOperationallyUnavailable } from "../../../shared/domain/scheduling.js";
import { assertCurrentServiceWindow } from "../../../shared/domain/operating-windows.js";
import {
  checkVersion,
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { requireOfficer } from "../policy/operations.policy.js";
import { handoverSchema } from "../payload/usage.schema.js";

export async function startUsage(context: Context, category: "MEETING_ROOM" | "PHYSICAL") {
  if (category === "PHYSICAL") requireOfficer(context);
  const input = await context.body(handoverSchema);
  const actor = context.actor!;
  const id = context.params.id!;
  if (input.actualDriverId) await directoryUser(input.actualDriverId);
  return withMutation(context, `booking:${id}:start`, async (tx) => {
    const old = await tx.booking.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Booking not found.");
    await lockFacility(tx, old.facilityId);
    await lockBooking(tx, old.id);
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: old.id },
      include: {
        facility: { include: { category: true, vehicle: true } },
        trip: true,
        claim: true,
      },
    });
    checkVersion(context, booking.version);
    assert(
      booking.status === "CONFIRMED",
      409,
      "BOOKING_STATE_CONFLICT",
      "Booking must be confirmed.",
    );
    const kind = booking.facility.category.code;
    assert(
      booking.facility.status === "ACTIVE",
      409,
      "FACILITY_UNAVAILABLE",
      "Facility is inactive.",
    );
    assert(
      (category === "MEETING_ROOM") === (kind === "MEETING_ROOM"),
      422,
      "INVALID_CATEGORY",
      "Use the correct check-in or handover action.",
    );
    assert(
      category === "PHYSICAL" ||
        actor.role !== "EMPLOYEE" ||
        booking.responsibleUserId === actor.id,
      403,
      "ACCESS_DENIED",
      "You cannot check in this booking.",
    );
    const now = new Date();
    assert(
      now.getTime() >= booking.startAt.getTime() - 15 * 60_000 && now < booking.endAt,
      409,
      "INVALID_CHECK_IN_TIME",
      "Check-in is outside the allowed window.",
    );
    await isOperationallyUnavailable(tx, booking.facilityId, now);
    if (category === "PHYSICAL") {
      const settings = await tx.organizationSetting.findFirst();
      await assertCurrentServiceWindow(
        tx,
        booking.facilityId,
        "HANDOVER",
        settings?.timezone ?? "Asia/Makassar",
      );
    }
    if (now < booking.startAt && booking.claim) {
      await tx.resourceTimeClaim.update({
        where: { id: booking.claim.id },
        data: { startAt: now },
      });
    }
    if (kind === "VEHICLE") {
      assert(
        input.actualDriverId && input.startingOdometer !== undefined,
        422,
        "VALIDATION_FAILED",
        "Driver and starting odometer are required.",
      );
      assert(
        input.startingOdometer >= (booking.facility.vehicle?.currentOdometer ?? 0),
        422,
        "INVALID_ODOMETER",
        "Odometer cannot go backward.",
      );
    }
    const usage = await tx.usageSession.create({
      data: {
        bookingId: booking.id,
        facilityId: booking.facilityId,
        actualUserId: kind === "VEHICLE" ? input.actualDriverId! : booking.responsibleUserId,
        startedById: actor.id,
        startAt: now,
        startNotes: input.notes ?? "",
        ...(kind === "VEHICLE"
          ? {
              vehicle: {
                create: {
                  actualDriverId: input.actualDriverId!,
                  handoverOfficerId: actor.id,
                  startOdometer: input.startingOdometer!,
                  startCondition: input.condition,
                  fuelStart: input.fuel ?? null,
                },
              },
            }
          : {}),
        ...(kind === "EQUIPMENT"
          ? {
              equipment: {
                create: {
                  handoverOfficerId: actor.id,
                  startCondition: input.condition,
                },
              },
            }
          : {}),
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "IN_USE", version: { increment: 1 } },
    });
    await recordEvent(tx, actor.id, "USAGE_STARTED", "Booking", booking.id, { usageId: usage.id });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
