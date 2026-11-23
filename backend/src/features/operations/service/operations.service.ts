import { z } from "zod";
import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { directoryUser } from "../../../http/router.js";
import { bookingInclude } from "../../bookings/index.js";
import { claimEnd, isOperationallyUnavailable } from "../../../shared/domain/scheduling.js";
import {
  assertOperatingPolicy,
  assertCurrentServiceWindow,
} from "../../../shared/domain/operating-windows.js";
import {
  checkVersion,
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";

function requireOfficer(context: Context) {
  assert(context.actor?.role !== "EMPLOYEE", 403, "ACCESS_DENIED", "Manager access required.");
}

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

const handoverSchema = z
  .object({
    actualDriverId: z.string().uuid().optional(),
    startingOdometer: z.number().int().nonnegative().optional(),
    condition: z.string().min(2).max(100),
    fuel: z.string().max(40).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

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

const returnSchema = z
  .object({
    endingOdometer: z.number().int().nonnegative().optional(),
    condition: z.string().min(2).max(100),
    fuel: z.string().max(40).optional(),
    damageNotes: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();
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
