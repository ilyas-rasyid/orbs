import { z } from "zod";
import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { bookingInclude } from "../../bookings/booking.select.js";
import { claimEnd, isOperationallyUnavailable } from "../../../shared/domain/scheduling.js";
import { assertOperatingPolicy } from "../../../shared/domain/operating-windows.js";
import {
  checkVersion,
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { requireOfficer } from "../policy/operations.policy.js";

export async function decideApproval(context: Context, decision: "APPROVED" | "REJECTED") {
  requireOfficer(context);
  const input = await context.body(
    z
      .object({
        reason: z.string().trim().max(500).optional(),
        exceptionReason: z.string().trim().max(500).optional(),
      })
      .strict(),
  );
  const actor = context.actor!;
  const id = context.params.id!;
  return withMutation(context, `booking:${id}:${decision}`, async (tx) => {
    const existing = await tx.booking.findUnique({ where: { id } });
    assert(existing, 404, "RESOURCE_NOT_FOUND", "Booking not found.");
    await lockFacility(tx, existing.facilityId);
    await lockBooking(tx, existing.id);
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: existing.id },
      include: { facility: true, trip: true },
    });
    checkVersion(context, booking.version);
    assert(booking.status === "PENDING", 409, "BOOKING_STATE_CONFLICT", "Request already decided.");
    assert(
      booking.startAt > new Date(),
      409,
      "BOOKING_EXPIRED",
      "Booking has reached its start time.",
    );
    const own = [
      booking.createdById,
      booking.requesterId,
      booking.responsibleUserId,
      booking.trip?.designatedDriverId,
    ].includes(actor.id);
    const adminException = own && actor.role === "ADMIN";
    assert(!own || adminException, 403, "APPROVAL_NOT_ALLOWED", "Self-approval is not permitted.");
    assert(
      !adminException || !!input.exceptionReason,
      422,
      "VALIDATION_FAILED",
      "Exception reason is required.",
    );
    assert(
      decision !== "REJECTED" || !!input.reason,
      422,
      "VALIDATION_FAILED",
      "Rejection reason is required.",
    );
    if (decision === "APPROVED") {
      assert(
        booking.facility.status === "ACTIVE",
        409,
        "FACILITY_UNAVAILABLE",
        "Facility is not active.",
      );
      await isOperationallyUnavailable(tx, booking.facilityId, booking.startAt);
      const settings = await tx.organizationSetting.findFirst();
      const category = await tx.facilityCategory.findUniqueOrThrow({
        where: { id: booking.facility.categoryId },
      });
      await assertOperatingPolicy(
        tx,
        booking.facilityId,
        category.code,
        booking.startAt,
        booking.endAt,
        settings?.timezone ?? "Asia/Makassar",
      );
      const bufferMinutes = Number(
        (booking.policySnapshot as { bufferMinutes?: number }).bufferMinutes ?? 0,
      );
      await tx.resourceTimeClaim.create({
        data: {
          facilityId: booking.facilityId,
          bookingId: booking.id,
          startAt: booking.startAt,
          endAt: claimEnd(booking.endAt, bufferMinutes),
          bufferMinutes,
        },
      });
    }
    await tx.bookingApproval.create({
      data: {
        bookingId: booking.id,
        approverId: actor.id,
        decision,
        reason: input.reason ?? null,
        adminException,
        exceptionReason: adminException ? (input.exceptionReason ?? null) : null,
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: decision === "APPROVED" ? "CONFIRMED" : "REJECTED",
        confirmationSource: decision === "APPROVED" ? "APPROVAL" : null,
        confirmedAt: decision === "APPROVED" ? new Date() : null,
        version: { increment: 1 },
      },
    });
    await recordEvent(
      tx,
      actor.id,
      `BOOKING_${decision}`,
      "Booking",
      booking.id,
      { decision, adminException },
      input.reason ?? input.exceptionReason,
    );
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
