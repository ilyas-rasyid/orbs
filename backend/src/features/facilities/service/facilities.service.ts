import { prisma } from "../../../infra/prisma.js";
import { assert } from "../../../http/errors.js";

export const facilityInclude = {
  category: true,
  location: true,
  room: true,
  vehicle: true,
  equipment: true,
  windows: true,
} as const;

export async function getAvailabilityCalendar(
  ctx: { query: URLSearchParams; actor: { role: string } | null },
  onlyFacility?: string,
) {
  const from = new Date(ctx.query.get("from") ?? new Date().toISOString());
  const to = new Date(ctx.query.get("to") ?? new Date(Date.now() + 7 * 86400_000).toISOString());
  assert(
    Number.isFinite(from.getTime()) &&
      Number.isFinite(to.getTime()) &&
      to > from &&
      to.getTime() - from.getTime() <= 42 * 86400_000,
    422,
    "INVALID_RANGE",
    "Range must be at most 42 days.",
  );
  const facilityIds = onlyFacility
    ? [onlyFacility]
    : (ctx.query.get("facilityIds") ?? "").split(",").filter(Boolean);
  assert(facilityIds.length <= 20, 422, "INVALID_RANGE", "Maximum 20 facilities per request.");
  const where = {
    ...(facilityIds.length > 0 ? { facilityId: { in: facilityIds } } : {}),
    startAt: { lt: to },
    endAt: { gt: from },
  };
  const [claims, pending, active] = await Promise.all([
    prisma.resourceTimeClaim.findMany({
      where: { ...where, state: "ACTIVE" },
      take: 500,
      include: {
        booking: {
          select: {
            id: true,
            reference: true,
            status: true,
            responsibleUser: { select: { name: true } },
          },
        },
        maintenance: { select: { id: true, status: true, reason: true } },
      },
    }),
    prisma.booking.findMany({
      where: { ...where, status: "PENDING" },
      select: { facilityId: true, startAt: true, endAt: true },
      take: 200,
    }),
    prisma.usageSession.findMany({
      where: {
        state: "ACTIVE",
        ...(facilityIds.length ? { facilityId: { in: facilityIds } } : {}),
      },
      select: { facilityId: true, bookingId: true, startAt: true },
      take: 200,
    }),
  ]);
  return {
    data: {
      timezone: "Asia/Makassar",
      claims: claims.map((claim) => ({
        id: claim.id,
        facilityId: claim.facilityId,
        startAt: claim.startAt,
        endAt: claim.endAt,
        kind: claim.bookingId ? "BOOKING" : "MAINTENANCE",
        status: claim.booking?.status ?? claim.maintenance?.status,
        reference: ctx.actor?.role === "EMPLOYEE" ? undefined : claim.booking?.reference,
        responsible: claim.booking?.responsibleUser.name,
      })),
      pending,
      active,
    },
  };
}
