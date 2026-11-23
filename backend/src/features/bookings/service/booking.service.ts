import type { Prisma } from "../../../generated/prisma/client.ts";
import { z } from "zod";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import type { Context } from "../../../http/router.js";
import { directoryUser } from "../../../http/router.js";
import {
  lockFacility,
  lockBooking,
  recordEvent,
  withMutation,
  checkVersion,
} from "../../../shared/transactions.js";
import {
  claimEnd,
  parseInterval,
  validatePolicy,
  isOperationallyUnavailable,
} from "../../../shared/domain/scheduling.js";
import { assertOperatingPolicy } from "../../../shared/domain/operating-windows.js";

export const bookingInput = z
  .object({
    facilityId: z.string().uuid(),
    startAt: z.string(),
    endAt: z.string(),
    purpose: z.string().trim().min(3).max(400),
    responsibleUserId: z.string().uuid().optional(),
    meetingTitle: z.string().trim().max(160).optional(),
    attendees: z.number().int().positive().optional(),
    destination: z.string().trim().max(240).optional(),
    travelPurpose: z.string().trim().max(400).optional(),
    designatedDriverId: z.string().uuid().optional(),
  })
  .strict();

const facilityInclude = {
  category: true,
  location: true,
  room: true,
  vehicle: true,
  equipment: true,
} as const;
export const bookingInclude = {
  facility: { include: facilityInclude },
  requester: { select: { id: true, name: true } },
  responsibleUser: { select: { id: true, name: true } },
  meeting: true,
  trip: true,
  approval: true,
  usage: { include: { vehicle: true, equipment: true } },
} as const;

export async function createBooking(context: Context) {
  const input = await context.body(bookingInput);
  const actor = context.actor!;
  const { startAt, endAt } = parseInterval(input.startAt, input.endAt);
  const userId = actor.role === "EMPLOYEE" ? actor.id : (input.responsibleUserId ?? actor.id);
  await directoryUser(userId);
  if (input.designatedDriverId) await directoryUser(input.designatedDriverId);
  return withMutation(context, "bookings:create", async (tx) => {
    await lockFacility(tx, input.facilityId);
    const facility = await tx.facility.findUnique({
      where: { id: input.facilityId },
      include: facilityInclude,
    });
    assert(facility, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
    const settings = await tx.organizationSetting.findFirst();
    validatePolicy(facility, startAt, endAt, new Date(), settings?.horizonDays ?? 90);
    const category = facility.category.code;
    await assertOperatingPolicy(
      tx,
      facility.id,
      category,
      startAt,
      endAt,
      settings?.timezone ?? "Asia/Makassar",
    );
    if (category === "MEETING_ROOM") {
      assert(
        input.meetingTitle && input.attendees,
        422,
        "VALIDATION_FAILED",
        "Meeting title and attendees are required.",
      );
      assert(
        input.attendees <= (facility.room?.capacity ?? 0),
        422,
        "CAPACITY_EXCEEDED",
        "Attendee count exceeds capacity.",
      );
    }
    if (category === "VEHICLE") {
      assert(
        input.destination && input.travelPurpose && input.designatedDriverId,
        422,
        "VALIDATION_FAILED",
        "Destination, travel purpose and driver are required.",
      );
    }
    const auto = facility.approvalPolicy === "AUTO_CONFIRM";
    if (auto) await isOperationallyUnavailable(tx, facility.id, startAt);
    const created = await tx.booking.create({
      data: {
        reference: `BK-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        facilityId: facility.id,
        requesterId: actor.id,
        responsibleUserId: userId,
        createdById: actor.id,
        purpose: input.purpose,
        startAt,
        endAt,
        status: auto ? "CONFIRMED" : "PENDING",
        confirmationSource: auto ? "AUTO" : null,
        confirmedAt: auto ? new Date() : null,
        policySnapshot: {
          approvalPolicy: facility.approvalPolicy,
          bufferMinutes: facility.bufferMinutes,
        },
        ...(category === "MEETING_ROOM"
          ? {
              meeting: {
                create: {
                  title: input.meetingTitle!,
                  attendees: input.attendees!,
                },
              },
            }
          : {}),
        ...(category === "VEHICLE"
          ? {
              trip: {
                create: {
                  destination: input.destination!,
                  travelPurpose: input.travelPurpose!,
                  designatedDriverId: input.designatedDriverId!,
                },
              },
            }
          : {}),
      },
    });
    if (auto)
      await tx.resourceTimeClaim.create({
        data: {
          facilityId: facility.id,
          bookingId: created.id,
          startAt,
          endAt: claimEnd(endAt, facility.bufferMinutes),
          bufferMinutes: facility.bufferMinutes,
        },
      });
    await recordEvent(tx, actor.id, "BOOKING_CREATED", "Booking", created.id, {
      status: created.status,
    });
    return tx.booking.findUniqueOrThrow({ where: { id: created.id }, include: bookingInclude });
  });
}

export async function loadAccessibleBooking(context: Context) {
  const actor = context.actor!;
  const id = context.params.id!;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (
    !booking ||
    (actor.role === "EMPLOYEE" &&
      booking.requesterId !== actor.id &&
      booking.responsibleUserId !== actor.id &&
      booking.trip?.designatedDriverId !== actor.id)
  ) {
    throw new HttpError(404, "RESOURCE_NOT_FOUND", "Booking not found.");
  }
  return booking;
}

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

export async function listBookings(context: Context, all = false) {
  const actor = context.actor!;
  const page = Math.max(1, Number(context.query.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(context.query.get("limit") ?? 30)));
  const status = context.query.get("status");
  const where: Prisma.BookingWhereInput = {
    ...(!all
      ? {
          OR: [
            { requesterId: actor.id },
            { responsibleUserId: actor.id },
            { trip: { designatedDriverId: actor.id } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);
  return { data, meta: { page, limit, total } };
}
