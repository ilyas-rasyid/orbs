import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "../../src/infra/prisma.js";
import { assertSafeTestDatabase } from "../../src/infrastructure/database/test-guard.js";

const prefix = crypto.randomUUID().slice(0, 8).toUpperCase();
let facilityId = "";
let userId = "";
let locationId = "";

function futureInterval(hoursFromNow: number) {
  const start = new Date(Date.now() + hoursFromNow * 3600_000);
  start.setMinutes(0, 0, 0);
  return { startAt: start, endAt: new Date(start.getTime() + 3600_000) };
}

async function createBooking(hoursFromNow: number) {
  const { startAt, endAt } = futureInterval(hoursFromNow);
  return prisma.booking.create({
    data: {
      reference: `TEST-${crypto.randomUUID()}`,
      facilityId,
      createdById: userId,
      requesterId: userId,
      responsibleUserId: userId,
      purpose: "Concurrency verification",
      startAt,
      endAt,
      status: "CONFIRMED",
      policySnapshot: { bufferMinutes: 0, approvalPolicy: "AUTO_CONFIRM" },
    },
  });
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  assertSafeTestDatabase(url, process.env.NODE_ENV ?? "");
  const category = await prisma.facilityCategory.upsert({
    where: { code: "MEETING_ROOM" },
    create: { code: "MEETING_ROOM", name: "Meeting Room" },
    update: {},
  });
  const location = await prisma.officeLocation.create({
    data: {
      code: `TEST-L-${prefix}`,
      name: `Test location ${prefix}`,
    },
  });
  const user = await prisma.user.create({
    data: {
      employeeCode: `TEST-E-${prefix}`,
      email: `test-${prefix.toLowerCase()}@example.invalid`,
      name: "Test Employee",
      role: "EMPLOYEE",
      passwordHash: "not-an-authentication-fixture",
    },
  });
  const facility = await prisma.facility.create({
    data: {
      code: `TEST-F-${prefix}`,
      name: `Test Resource ${prefix}`,
      categoryId: category.id,
      locationId: location.id,
      approvalPolicy: "AUTO_CONFIRM",
      room: { create: { capacity: 6 } },
      windows: { create: [{ dayOfWeek: 1, opens: "00:00", closes: "23:59" }] },
    },
  });
  facilityId = facility.id;
  userId = user.id;
  locationId = location.id;
});

afterAll(async () => {
  if (facilityId) {
    const bookings = await prisma.booking.findMany({ where: { facilityId }, select: { id: true } });
    const ids = bookings.map((booking) => booking.id);
    await prisma.usageSession.deleteMany({ where: { facilityId } });
    await prisma.resourceTimeClaim.deleteMany({ where: { facilityId } });
    await prisma.maintenance.deleteMany({ where: { facilityId } });
    await prisma.bookingApproval.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { facilityId } });
    await prisma.facilityOperatingWindow.deleteMany({ where: { facilityId } });
    await prisma.meetingRoomProfile.deleteMany({ where: { facilityId } });
    await prisma.facility.delete({ where: { id: facilityId } });
  }
  if (userId) await prisma.user.delete({ where: { id: userId } });
  if (locationId) await prisma.officeLocation.delete({ where: { id: locationId } });
  // The three business categories are shared reference data; retain them.
  await prisma.$disconnect();
});

describe("real PostgreSQL integrity under concurrent writes", () => {
  it("allows at most one overlapping ACTIVE reservation claim", async () => {
    const first = await createBooking(48);
    const second = await createBooking(48);
    const result = await Promise.allSettled(
      [first, second].map((booking) =>
        prisma.resourceTimeClaim.create({
          data: {
            facilityId,
            bookingId: booking.id,
            startAt: booking.startAt,
            endAt: booking.endAt,
          },
        }),
      ),
    );
    expect(result.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    const claims = await prisma.resourceTimeClaim.findMany({
      where: {
        facilityId,
        state: "ACTIVE",
        startAt: first.startAt,
      },
    });
    expect(claims).toHaveLength(1);
  });

  it("allows at most one ACTIVE UsageSession for a facility", async () => {
    const first = await createBooking(72);
    const second = await createBooking(73);
    const result = await Promise.allSettled(
      [first, second].map((booking) =>
        prisma.usageSession.create({
          data: {
            facilityId,
            bookingId: booking.id,
            actualUserId: userId,
            startedById: userId,
            state: "ACTIVE",
          },
        }),
      ),
    );
    expect(result.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.usageSession.count({ where: { facilityId, state: "ACTIVE" } })).toBe(1);
  });

  it("rejects maintenance claiming an already-booked interval", async () => {
    const booking = await createBooking(96);
    await prisma.resourceTimeClaim.create({
      data: {
        facilityId,
        bookingId: booking.id,
        startAt: booking.startAt,
        endAt: booking.endAt,
      },
    });
    const maintenance = await prisma.maintenance.create({
      data: {
        reference: `TEST-M-${crypto.randomUUID()}`,
        facilityId,
        createdById: userId,
        reason: "Test scheduling clash",
        startAt: booking.startAt,
        endAt: booking.endAt,
      },
    });
    let failed = false;
    try {
      await prisma.resourceTimeClaim.create({
        data: {
          facilityId,
          maintenanceId: maintenance.id,
          startAt: maintenance.startAt,
          endAt: maintenance.endAt,
        },
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    await prisma.maintenance.delete({ where: { id: maintenance.id } });
  });
});
