import type { Handler } from "../../../http/router.js";
import { admin, pagination } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { assert } from "../../../http/errors.js";

export const listAuditLogs: Handler = async (ctx) => {
  admin(ctx);
  const p = pagination(ctx.query);
  const resourceType = ctx.query.get("resourceType");
  return prisma.auditLog.findMany({
    take: p.take,
    skip: p.skip,
    orderBy: { createdAt: "desc" },
    where: resourceType ? { resourceType } : {},
  });
};

export const getAuditLog: Handler = async (ctx) => {
  admin(ctx);
  const id = ctx.params.id!;
  const result = await prisma.auditLog.findUnique({ where: { id } });
  assert(result, 404, "RESOURCE_NOT_FOUND", "Audit event not found.");
  return result;
};
