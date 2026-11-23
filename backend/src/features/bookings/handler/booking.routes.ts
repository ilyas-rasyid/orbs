import { route, manager } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import {
  createBooking,
  cancelBooking,
  listBookings,
  loadAccessibleBooking,
  bookingInclude,
} from "../service/booking.service.js";
import { decideApproval, startUsage, finishUsage, markNoShow } from "../../operations/index.js";

export function registerBookingRoutes() {
  route("GET", "/bookings", (ctx) => listBookings(ctx));
  route("POST", "/bookings", createBooking);
  route("GET", "/bookings/:id", loadAccessibleBooking);
  route("POST", "/bookings/:id/cancel", cancelBooking);
  route("POST", "/bookings/:id/check-in", (ctx) => startUsage(ctx, "MEETING_ROOM"));
  route("POST", "/bookings/:id/check-out", (ctx) => finishUsage(ctx, "MEETING_ROOM"));
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
  route("POST", "/operations/bookings/:id/approve", (ctx) => decideApproval(ctx, "APPROVED"));
  route("POST", "/operations/bookings/:id/reject", (ctx) => decideApproval(ctx, "REJECTED"));
  route("POST", "/operations/bookings/:id/handover", (ctx) => startUsage(ctx, "PHYSICAL"));
  route("POST", "/operations/bookings/:id/return", (ctx) => finishUsage(ctx, "PHYSICAL"));
  route("POST", "/operations/bookings/:id/no-show", markNoShow);
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
