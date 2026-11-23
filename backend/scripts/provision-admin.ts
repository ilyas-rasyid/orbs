import "dotenv/config";
import { prisma } from "../src/infra/prisma.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters) are required.");
}
const existing = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
if (existing > 0) throw new Error("An active Admin already exists. Provisioning is disabled.");

const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
await prisma.$transaction(async (tx) => {
  const settings = await tx.organizationSetting.findFirst();
  if (!settings)
    await tx.organizationSetting.create({
      data: {
        name: process.env.ORBS_ORGANIZATION ?? "ORBS Company",
        timezone: "Asia/Makassar",
      },
    });
  for (const category of [
    { code: "MEETING_ROOM", name: "Meeting Room" },
    { code: "VEHICLE", name: "Vehicle" },
    { code: "EQUIPMENT", name: "Equipment" },
  ])
    await tx.facilityCategory.upsert({
      where: { code: category.code },
      create: category,
      update: {},
    });
  await tx.user.create({
    data: {
      employeeCode: "ADMIN-001",
      name: process.env.ADMIN_NAME ?? "System Administrator",
      email,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });
});
console.log("First Admin provisioned. Rotate initial credential at first login.");
await prisma.$disconnect();
