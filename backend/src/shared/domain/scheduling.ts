import { HttpError, assert } from "../../http/errors.js";
import type { Tx } from "../transactions.js";

export function parseInterval(start: string, end: string): { startAt: Date; endAt: Date } {
  const iso = /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/;
  assert(
    iso.test(start) && iso.test(end),
    422,
    "INVALID_TIME",
    "Timestamps require an ISO offset.",
  );
  const startAt = new Date(start);
  const endAt = new Date(end);
  assert(
    !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()),
    422,
    "INVALID_TIME",
    "Invalid dates.",
  );
  assert(endAt > startAt, 422, "INVALID_TIME", "End time must be after start time.");
  for (const d of [startAt, endAt]) {
    assert(
      d.getUTCMinutes() % 15 === 0 && d.getUTCSeconds() === 0,
      422,
      "INVALID_GRID",
      "Booking times must align to 15-minute intervals.",
    );
  }
  return { startAt, endAt };
}

export function validatePolicy(
  facility: {
    minMinutes: number;
    maxMinutes: number;
    leadMinutes: number;
    status: string;
  },
  startAt: Date,
  endAt: Date,
  now = new Date(),
  horizonDays = 90,
) {
  assert(facility.status === "ACTIVE", 409, "FACILITY_UNAVAILABLE", "Facility is not active.");
  const duration = (endAt.getTime() - startAt.getTime()) / 60_000;
  assert(
    duration >= facility.minMinutes && duration <= facility.maxMinutes,
    422,
    "INVALID_DURATION",
    "Duration is outside this facility's booking limits.",
  );
  assert(
    startAt.getTime() - now.getTime() >= facility.leadMinutes * 60_000,
    422,
    "LEAD_TIME",
    "Start time does not meet the minimum lead time.",
  );
  assert(
    startAt.getTime() <= now.getTime() + horizonDays * 86400_000,
    422,
    "BOOKING_HORIZON",
    "Bookings cannot be made over 90 days ahead.",
  );
}

export async function isOperationallyUnavailable(tx: Tx, facilityId: string, startAt: Date) {
  const [usage, maintenance] = await Promise.all([
    tx.usageSession.findFirst({ where: { facilityId, state: "ACTIVE", endAt: null } }),
    tx.maintenance.findFirst({ where: { facilityId, status: "IN_PROGRESS" } }),
  ]);
  if (maintenance)
    throw new HttpError(409, "FACILITY_UNAVAILABLE", "Facility is under maintenance.");
  if (usage && startAt <= new Date())
    throw new HttpError(409, "FACILITY_IN_USE", "Facility has not been returned.");
  if (usage) {
    const b = await tx.booking.findUnique({ where: { id: usage.bookingId } });
    if (b && b.endAt < new Date())
      throw new HttpError(409, "FACILITY_UNAVAILABLE", "An overdue usage blocks new confirmation.");
  }
}

export function claimEnd(endAt: Date, bufferMinutes: number): Date {
  return new Date(endAt.getTime() + bufferMinutes * 60_000);
}
