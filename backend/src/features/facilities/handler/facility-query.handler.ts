import type { Handler } from "../../../http/router.js";
import { admin, pagination } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError } from "../../../http/errors.js";
import { facilityInclude, getAvailabilityCalendar } from "../service/facilities.service.js";

export const listFacilityCategories: Handler = async () =>
  prisma.facilityCategory.findMany({ orderBy: { name: "asc" } });

export const listLocations: Handler = async () =>
  prisma.officeLocation.findMany({ where: { active: true }, orderBy: { name: "asc" } });

export const searchDirectoryUsers: Handler = async (ctx) => {
  const search = ctx.query.get("search") ?? "";
  if (search.length < 2) return { data: [] };
  return prisma.user.findMany({
    where: { status: "ACTIVE", name: { contains: search, mode: "insensitive" } },
    select: { id: true, name: true, department: { select: { name: true } } },
    take: 20,
    orderBy: { name: "asc" },
  });
};

export const listFacilities: Handler = async (ctx) => {
  const { take, skip, page, limit } = pagination(ctx.query);
  const category = ctx.query.get("category");
  const location = ctx.query.get("locationId");
  const search = ctx.query.get("search") ?? undefined;
  const status = ctx.actor?.role === "ADMIN" ? (ctx.query.get("status") ?? "ACTIVE") : "ACTIVE";
  const where = {
    status,
    ...(category ? { category: { code: category } } : {}),
    ...(location ? { locationId: location } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      include: facilityInclude,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.facility.count({ where }),
  ]);
  return { data, meta: { page, limit, total } };
};

export const getFacility: Handler = async (ctx) => {
  const id = ctx.params.id!;
  const data = await prisma.facility.findUnique({
    where: { id },
    include: facilityInclude,
  });
  if (!data || (data.status === "ARCHIVED" && ctx.actor?.role === "EMPLOYEE")) {
    throw new HttpError(404, "RESOURCE_NOT_FOUND", "Facility not found.");
  }
  return data;
};

export const getFacilityOperatingWindows: Handler = async (ctx) =>
  prisma.facilityOperatingWindow.findMany({
    where: { facilityId: ctx.params.id! },
    orderBy: { dayOfWeek: "asc" },
  });

export const getAvailability: Handler = (ctx) => getAvailabilityCalendar(ctx);

export const getFacilityAvailability: Handler = (ctx) =>
  getAvailabilityCalendar(ctx, ctx.params.id!);

export const listManagedFacilities: Handler = async (ctx) => {
  admin(ctx);
  return prisma.facility.findMany({
    include: facilityInclude,
    orderBy: { name: "asc" },
    take: 100,
  });
};
