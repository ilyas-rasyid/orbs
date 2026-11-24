import type { Handler } from "../../../http/router.js";
import { z } from "zod";
import { admin } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import { checkVersion, recordEvent, withMutation } from "../../../shared/transactions.js";

export const listDepartments: Handler = async (ctx) => {
  admin(ctx);
  return prisma.department.findMany({ orderBy: { name: "asc" } });
};

export const createDepartment: Handler = async (ctx) => {
  admin(ctx);
  const input = await ctx.body(
    z.object({ code: z.string().min(2), name: z.string().min(2) }).strict(),
  );
  return withMutation(ctx, "department:create", async (tx) => {
    const result = await tx.department.create({
      data: { code: input.code.toUpperCase(), name: input.name },
    });
    await recordEvent(tx, ctx.actor!.id, "DEPARTMENT_CREATED", "Department", result.id);
    return result;
  });
};

export const listManagedLocations: Handler = async (ctx) => {
  admin(ctx);
  return prisma.officeLocation.findMany({ orderBy: { name: "asc" } });
};

export const createLocation: Handler = async (ctx) => {
  admin(ctx);
  const input = await ctx.body(
    z
      .object({
        code: z.string().min(2),
        name: z.string().min(2),
        address: z.string().default(""),
      })
      .strict(),
  );
  return withMutation(ctx, "locations:create", async (tx) => {
    const location = await tx.officeLocation.create({
      data: { ...input, code: input.code.toUpperCase() },
    });
    await recordEvent(tx, ctx.actor!.id, "LOCATION_CREATED", "OfficeLocation", location.id);
    return location;
  });
};

export const listManagedFacilityCategories: Handler = async (ctx) => {
  admin(ctx);
  return prisma.facilityCategory.findMany({ orderBy: { name: "asc" } });
};

export const getOrganizationSettings: Handler = async (ctx) => {
  admin(ctx);
  return prisma.organizationSetting.findFirst();
};

export const updateOrganizationSettings: Handler = async (ctx) => {
  admin(ctx);
  const input = await ctx.body(
    z
      .object({
        name: z.string().min(2).max(200).optional(),
        timezone: z.string().min(3).max(80).optional(),
        leadMinutes: z.number().int().nonnegative().optional(),
        horizonDays: z.number().int().positive().max(365).optional(),
        noShowMinutes: z.number().int().nonnegative().optional(),
      })
      .strict(),
  );
  if (input.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: input.timezone });
    } catch {
      throw new HttpError(422, "INVALID_TIMEZONE", "Unknown timezone.");
    }
  }
  return withMutation(ctx, "settings:update", async (tx) => {
    const old = await tx.organizationSetting.findFirst();
    assert(old, 500, "CONFIGURATION_ERROR", "Organization settings missing.");
    checkVersion(ctx, old.version);
    const result = await tx.organizationSetting.update({
      where: { id: old.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.leadMinutes !== undefined ? { leadMinutes: input.leadMinutes } : {}),
        ...(input.horizonDays !== undefined ? { horizonDays: input.horizonDays } : {}),
        ...(input.noShowMinutes !== undefined ? { noShowMinutes: input.noShowMinutes } : {}),
        version: { increment: 1 },
      },
    });
    await recordEvent(tx, ctx.actor!.id, "SETTINGS_UPDATED", "OrganizationSetting", old.id);
    return result;
  });
};
