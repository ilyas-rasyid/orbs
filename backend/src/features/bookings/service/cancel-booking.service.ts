import { z } from "zod";
import { assert } from "../../../http/errors.js";
import type { Context } from "../../../http/router.js";
import {
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
  checkVersion,
} from "../../../shared/transactions.js";
import { bookingInclude } from "../booking.select.js";

export async function cancelBooking(context: Context) {
  const input = await context.body(
    z
      .object({
        reason: z.string().trim().max(500).optional(),
        reasonCategory: z.enum(["NORMAL", "RESOURCE_UNAVAILABLE"]).default("NORMAL"),
      })
      .strict(),
  );
  const actor = context.actor!;
  const id = context.params.id!;
  return withMutation(context, `booking:${id}:cancel`, async (tx) => {
    const existing = await tx.booking.findUnique({ where: { id } });
    assert(existing, 404, "RESOURCE_NOT_FOUND", "Booking not found.");
    await lockFacility(tx, existing.facilityId);
    await lockBooking(tx, existing.id);
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: existing.id } });
    checkVersion(context, booking.version);
    const privileged = actor.role !== "EMPLOYEE";
    assert(
      privileged || booking.responsibleUserId === actor.id,
      403,
      "ACCESS_DENIED",
      "Only the responsible user can cancel.",
    );
    assert(
      ["PENDING", "CONFIRMED"].includes(booking.status),
      409,
      "BOOKING_STATE_CONFLICT",
      "This booking cannot be cancelled.",
    );
    const exceptional = input.reasonCategory === "RESOURCE_UNAVAILABLE";
    if (exceptional)
      assert(
        privileged && !!input.reason,
        403,
        "ACCESS_DENIED",
        "An authorized officer and a reason are required.",
      );
    else
      assert(booking.startAt > new Date(), 409, "BOOKING_STATE_CONFLICT", "Start time has passed.");
    const usage = await tx.usageSession.findUnique({ where: { bookingId: booking.id } });
    assert(!usage, 409, "BOOKING_STATE_CONFLICT", "Booking has already been used.");
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancellationReason: input.reason ?? "Cancelled by user",
        cancelledById: actor.id,
        cancelledAt: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.resourceTimeClaim.updateMany({
      where: { bookingId: booking.id, state: "ACTIVE" },
      data: { state: "RELEASED", releasedAt: new Date(), releaseReason: "CANCELLED" },
    });
    await recordEvent(tx, actor.id, "BOOKING_CANCELLED", "Booking", booking.id, null, input.reason);
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
