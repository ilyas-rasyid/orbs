import { prisma } from "../infra/prisma.js";
import { lockFacility, recordEvent } from "../shared/transactions.js";

export async function expirePending() {
  const pending = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      startAt: { lte: new Date() },
    },
    select: { id: true, facilityId: true },
    take: 100,
  });
  for (const booking of pending) {
    await prisma.$transaction(async (tx) => {
      await lockFacility(tx, booking.facilityId);
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "EXPIRED", expiredAt: new Date(), version: { increment: 1 } },
      });
      if (updated.count) await recordEvent(tx, null, "BOOKING_EXPIRED", "Booking", booking.id);
    });
  }
}

export async function processOutbox() {
  const queue = await prisma.outboxEvent.findMany({
    where: {
      status: "PENDING",
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  for (const event of queue) {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.outboxEvent.updateMany({
          where: { id: event.id, status: "PENDING" },
          data: { status: "PROCESSING", attempts: { increment: 1 } },
        });
        if (!claimed.count) return;
        let userIds: string[] = [];
        if (event.aggregateType === "Booking") {
          const booking = await tx.booking.findUnique({
            where: { id: event.aggregateId },
            select: { requesterId: true, responsibleUserId: true },
          });
          if (booking) userIds = [booking.requesterId, booking.responsibleUserId];
          if (event.eventType === "BOOKING_CREATED") {
            const managers = await tx.user.findMany({
              where: { role: { in: ["FACILITY_MANAGER", "ADMIN"] }, status: "ACTIVE" },
              select: { id: true },
            });
            userIds.push(...managers.map((u) => u.id));
          }
        }
        for (const userId of new Set(userIds)) {
          await tx.notification.create({
            data: {
              recipientId: userId,
              type: event.eventType,
              title: event.eventType.split("_").join(" "),
              message: `A booking event has been recorded.`,
              resourceType: event.aggregateType,
              resourceId: event.aggregateId,
            },
          });
        }
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
      });
    } catch (error) {
      await prisma.outboxEvent.updateMany({
        where: { id: event.id, status: "PENDING" },
        data: {
          attempts: { increment: 1 },
          availableAt: new Date(Date.now() + 60_000),
          lastError: "Processing failed; retry scheduled",
        },
      });
      console.error(
        "Outbox processing error",
        event.id,
        error instanceof Error ? error.message : "Unknown",
      );
    }
  }
}
