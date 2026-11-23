import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const url = process.env.DATABASE_URL;
const password = process.env.SEED_PASSWORD;
if (!url || !password || password.length < 12) {
  throw new Error("DATABASE_URL and SEED_PASSWORD (at least 12 chars) are required for seeding.");
}
if (process.env.NODE_ENV === "production" || /production|prod[_-]?db/i.test(url)) {
  throw new Error("Seed is forbidden on a production database.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
try {
  await prisma.vehicleUsageDetail.deleteMany();
  await prisma.equipmentUsageDetail.deleteMany();
  await prisma.usageSession.deleteMany();
  await prisma.resourceTimeClaim.deleteMany();
  await prisma.bookingApproval.deleteMany();
  await prisma.meetingBookingDetail.deleteMany();
  await prisma.vehicleBookingDetail.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  const company = await prisma.organizationSetting.findFirst();
  if (!company)
    await prisma.organizationSetting.create({
      data: { name: "Northstar Office", timezone: "Asia/Makassar" },
    });
  const departments = ["IT", "OPERATIONS", "HR", "FINANCE"];
  for (const code of departments)
    await prisma.department.upsert({
      where: { code },
      create: { code, name: code === "HR" ? "Human Resources" : code },
      update: {},
    });
  const location = await prisma.officeLocation.upsert({
    where: { code: "HQ" },
    create: { code: "HQ", name: "Head Office", address: "Denpasar, Indonesia" },
    update: {},
  });
  const categories = [
    { code: "MEETING_ROOM", name: "Meeting Room" },
    { code: "VEHICLE", name: "Vehicle" },
    { code: "EQUIPMENT", name: "Equipment" },
  ];
  for (const category of categories)
    await prisma.facilityCategory.upsert({
      where: { code: category.code },
      create: category,
      update: { name: category.name },
    });
  const accounts = [
    {
      employeeCode: "EMP-001",
      email: "admin@northstar.example",
      name: "Nadia Putri",
      role: "ADMIN",
    },
    {
      employeeCode: "EMP-002",
      email: "manager@northstar.example",
      name: "Arif Prasetyo",
      role: "FACILITY_MANAGER",
    },
    {
      employeeCode: "EMP-003",
      email: "employee@northstar.example",
      name: "Dewi Anjani",
      role: "EMPLOYEE",
    },
  ];
  for (const account of accounts)
    await prisma.user.upsert({
      where: { email: account.email },
      create: { ...account, passwordHash },
      update: {},
    });
  const meeting = await prisma.facilityCategory.findUniqueOrThrow({
    where: { code: "MEETING_ROOM" },
  });
  const vehicle = await prisma.facilityCategory.findUniqueOrThrow({ where: { code: "VEHICLE" } });
  const equipment = await prisma.facilityCategory.findUniqueOrThrow({
    where: { code: "EQUIPMENT" },
  });
  const facilities = [
    {
      code: "ROOM-A",
      name: "Meeting Room A",
      categoryId: meeting.id,
      approvalPolicy: "AUTO_CONFIRM",
      maxMinutes: 480,
      bufferMinutes: 0,
      windows: {
        create: Array.from({ length: 5 }, (_, day) => ({
          dayOfWeek: day + 1,
          opens: "08:00",
          closes: "18:00",
          kind: "BOOKING",
        })),
      },
      room: { create: { capacity: 10, floor: "2", amenities: ["Projector", "Video conference"] } },
    },
    {
      code: "ROOM-B",
      name: "Conference Room B",
      categoryId: meeting.id,
      approvalPolicy: "AUTO_CONFIRM",
      maxMinutes: 480,
      bufferMinutes: 0,
      windows: {
        create: Array.from({ length: 5 }, (_, day) => ({
          dayOfWeek: day + 1,
          opens: "08:00",
          closes: "18:00",
          kind: "BOOKING",
        })),
      },
      room: { create: { capacity: 22, floor: "3", amenities: ["Whiteboard", "Speakerphone"] } },
    },
    {
      code: "CAR-01",
      name: "Operational Car 01",
      categoryId: vehicle.id,
      approvalPolicy: "REQUIRE_APPROVAL",
      minMinutes: 60,
      maxMinutes: 10080,
      bufferMinutes: 30,
      vehicle: {
        create: {
          plateNumber: "DK 1001 OR",
          brand: "Toyota",
          model: "Avanza",
          passengerCapacity: 7,
        },
      },
    },
    {
      code: "PROJ-01",
      name: "Projector 01",
      categoryId: equipment.id,
      approvalPolicy: "REQUIRE_APPROVAL",
      leadMinutes: 0,
      minMinutes: 30,
      maxMinutes: 10080,
      bufferMinutes: 0,
      equipment: { create: { assetCode: "AST-PROJ-001", brand: "Epson", model: "EB-E01" } },
    },
  ];
  for (const facility of facilities) {
    await prisma.facility.upsert({
      where: { code: facility.code },
      create: {
        name: facility.name,
        code: facility.code,
        locationId: location.id,
        categoryId: facility.categoryId,
        approvalPolicy: facility.approvalPolicy,
        leadMinutes: "leadMinutes" in facility ? (facility.leadMinutes ?? 15) : 15,
        minMinutes: facility.minMinutes ?? 30,
        maxMinutes: facility.maxMinutes,
        bufferMinutes: facility.bufferMinutes,
        ...("room" in facility ? { room: facility.room } : {}),
        ...("windows" in facility ? { windows: facility.windows } : {}),
        ...("vehicle" in facility ? { vehicle: facility.vehicle } : {}),
        ...("equipment" in facility ? { equipment: facility.equipment } : {}),
      },
      update: {
        leadMinutes: "leadMinutes" in facility ? (facility.leadMinutes ?? 15) : 15,
      },
    });
  }
  console.log("Seed finished. Sign in with the SEED_PASSWORD you provided.");
} finally {
  await prisma.$disconnect();
}
