import { z } from "zod";
import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { bookingInclude } from "../../bookings/booking.select.js";
import {
  checkVersion,
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { requireOfficer } from "../policy/operations.policy.js";

export async function markNoShow(context: Context) {
  requireOfficer(context);
  const id = context.params.id!;
  const { reason } = await context.body(z.object({ reason: z.string().min(3).max(500) }).strict());
  return withMutation(context, `booking:${id}:no-show`, async (tx) => {
    const old = await tx.booking.findUnique({ where: { id } });
    assert(old, 404, "RESOURCE_NOT_FOUND", "Booking not found.");
    await lockFacility(tx, old.facilityId);
    await lockBooking(tx, old.id);
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: old.id },
      include: { usage: true },
    });
    checkVersion(context, booking.version);
    const settings = await tx.organizationSetting.findFirst();
    assert(
      booking.status === "CONFIRMED" &&
        !booking.usage &&
        Date.now() >= booking.startAt.getTime() + (settings?.noShowMinutes ?? 30) * 60_000,
      409,
      "BOOKING_STATE_CONFLICT",
      "No-show not eligible.",
    );
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "NO_SHOW",
        noShowReason: reason,
        noShowById: context.actor!.id,
        noShowAt: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.resourceTimeClaim.updateMany({
      where: { bookingId: booking.id, state: "ACTIVE" },
      data: { state: "RELEASED", releasedAt: new Date(), releaseReason: "NO_SHOW" },
    });
    await recordEvent(
      tx,
      context.actor!.id,
      "BOOKING_NO_SHOW",
      "Booking",
      booking.id,
      null,
      reason,
    );
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
