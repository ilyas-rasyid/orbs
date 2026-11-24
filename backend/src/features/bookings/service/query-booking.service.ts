import type { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../../infra/prisma.js";
import { HttpError } from "../../../http/errors.js";
import type { Context } from "../../../http/router.js";
import { bookingInclude } from "../booking.select.js";

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
