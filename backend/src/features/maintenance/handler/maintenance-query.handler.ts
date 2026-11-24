import type { Handler } from "../../../http/router.js";
import { manager } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { assert } from "../../../http/errors.js";

export const listMaintenance: Handler = async (ctx) => {
  manager(ctx);
  const status = ctx.query.get("status");
  return prisma.maintenance.findMany({
    where: status ? { status } : {},
    include: { facility: { include: { category: true } } },
    orderBy: { startAt: "desc" },
    take: 100,
  });
};

export const getMaintenance: Handler = async (ctx) => {
  manager(ctx);
  const id = ctx.params.id!;
  const result = await prisma.maintenance.findUnique({
    where: { id },
    include: { facility: true },
  });
  assert(result, 404, "RESOURCE_NOT_FOUND", "Maintenance not found.");
  return result;
};
