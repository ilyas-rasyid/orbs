import type { Handler } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";

export const getDashboardSummary: Handler = async (ctx) => {
  const actor = ctx.actor!;
  const where = actor.role === "EMPLOYEE" ? { responsibleUserId: actor.id } : {};
  const [pending, confirmed, active, completed, facilities] = await Promise.all([
    prisma.booking.count({ where: { ...where, status: "PENDING" } }),
    prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { ...where, status: "IN_USE" } }),
    prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.facility.count({ where: { status: "ACTIVE" } }),
  ]);
  return { pending, confirmed, active, completed, facilities };
};
