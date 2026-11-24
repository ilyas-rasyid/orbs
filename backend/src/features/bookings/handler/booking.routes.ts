import { route, manager } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { createBooking } from "../service/create-booking.service.js";
import { cancelBooking } from "../service/cancel-booking.service.js";
import { listBookings, loadAccessibleBooking } from "../service/query-booking.service.js";
import { bookingInclude } from "../booking.select.js";

export function registerBookingRoutes() {
  route("GET", "/bookings", (ctx) => listBookings(ctx));
  route("POST", "/bookings", createBooking);
  route("GET", "/bookings/:id", loadAccessibleBooking);
  route("POST", "/bookings/:id/cancel", cancelBooking);
  route("GET", "/operations/bookings", (ctx) => {
    manager(ctx);
    return listBookings(ctx, true);
  });
  route("GET", "/operations/approvals", async (ctx) => {
    manager(ctx);
    const data = await prisma.booking.findMany({
      where: { status: "PENDING" },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
      take: 100,
    });
    return { data };
  });
  route("GET", "/operations/usage", async (ctx) => {
    manager(ctx);
    const data = await prisma.usageSession.findMany({
      where: { state: "ACTIVE" },
      include: { booking: { include: bookingInclude }, vehicle: true, equipment: true },
      orderBy: { startAt: "asc" },
      take: 100,
    });
    return { data };
  });
  route("GET", "/operations/handover-queue", async (ctx) => {
    manager(ctx);
    const data = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        facility: {
          category: { code: { in: ["VEHICLE", "EQUIPMENT"] } },
        },
      },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
      take: 100,
    });
    return { data };
  });
}
