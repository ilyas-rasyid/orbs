import { assert } from "../../../http/errors.js";
import { directoryUser } from "../../../http/router.js";
import type { Context } from "../../../http/router.js";
import { lockFacility, recordEvent, withMutation } from "../../../shared/transactions.js";
import {
  claimEnd,
  parseInterval,
  validatePolicy,
  isOperationallyUnavailable,
} from "../../../shared/domain/scheduling.js";
import { assertOperatingPolicy } from "../../../shared/domain/operating-windows.js";
import { bookingInput } from "../payload/booking.schema.js";
import { bookingInclude, facilityInclude } from "../booking.select.js";

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
