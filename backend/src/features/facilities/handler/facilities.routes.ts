import { route, admin, manager, pagination } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import { z } from "zod";
import {
  checkVersion,
  lockFacility,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { validateWindows } from "../../../shared/domain/operating-windows.js";
import { facilityInclude, getAvailabilityCalendar } from "../service/facilities.service.js";

const operatingWindowInput = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    kind: z.enum(["BOOKING", "HANDOVER", "RETURN"]),
  })
  .strict();

const facilityInput = z
  .object({
    code: z.string().min(2).max(30),
    name: z.string().min(2).max(140),
    description: z.string().max(600).default(""),
    categoryId: z.string().uuid(),
    locationId: z.string().uuid(),
    approvalPolicy: z.enum(["AUTO_CONFIRM", "REQUIRE_APPROVAL"]),
    minMinutes: z.number().int().positive(),
    maxMinutes: z.number().int().positive(),
    leadMinutes: z.number().int().nonnegative().default(15),
    bufferMinutes: z.number().int().nonnegative().default(0),
    capacity: z.number().int().positive().optional(),
    floor: z.string().max(40).optional(),
    amenities: z.array(z.string()).max(30).optional(),
    plateNumber: z.string().max(30).optional(),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    vehicleType: z.string().max(50).optional(),
    passengerCapacity: z.number().int().positive().optional(),
    currentOdometer: z.number().int().nonnegative().optional(),
    assetCode: z.string().max(80).optional(),
    serialNumber: z.string().max(100).optional(),
  })
  .strict();

export function registerFacilityRoutes() {
  route("GET", "/facility-categories", async () =>
    prisma.facilityCategory.findMany({ orderBy: { name: "asc" } }),
  );
  route("GET", "/locations", async () =>
    prisma.officeLocation.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  );
  route("GET", "/directory/users", async (ctx) => {
    const search = ctx.query.get("search") ?? "";
    if (search.length < 2) return { data: [] };
    return prisma.user.findMany({
      where: { status: "ACTIVE", name: { contains: search, mode: "insensitive" } },
      select: { id: true, name: true, department: { select: { name: true } } },
      take: 20,
      orderBy: { name: "asc" },
    });
  });
  route("GET", "/facilities", async (ctx) => {
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
  });
  route("GET", "/facilities/:id", async (ctx) => {
    const id = ctx.params.id!;
    const data = await prisma.facility.findUnique({
      where: { id },
      include: facilityInclude,
    });
    if (!data || (data.status === "ARCHIVED" && ctx.actor?.role === "EMPLOYEE")) {
      throw new HttpError(404, "RESOURCE_NOT_FOUND", "Facility not found.");
    }
    return data;
  });
  route("GET", "/facilities/:id/operating-windows", async (ctx) =>
    prisma.facilityOperatingWindow.findMany({
      where: { facilityId: ctx.params.id! },
      orderBy: { dayOfWeek: "asc" },
    }),
  );

  route("GET", "/availability", (ctx) => getAvailabilityCalendar(ctx));
  route("GET", "/facilities/:id/availability", (ctx) =>
    getAvailabilityCalendar(ctx, ctx.params.id!),
  );

  route("GET", "/admin/facilities", async (ctx) => {
    admin(ctx);
    return prisma.facility.findMany({
      include: facilityInclude,
      orderBy: { name: "asc" },
      take: 100,
    });
  });
  route("POST", "/admin/facilities", async (ctx) => {
    admin(ctx);
    const input = await ctx.body(facilityInput);
    assert(
      input.maxMinutes >= input.minMinutes,
      422,
      "VALIDATION_FAILED",
      "Maximum duration must exceed minimum.",
    );
    return withMutation(ctx, "facilities:create", async (tx) => {
      const category = await tx.facilityCategory.findUnique({ where: { id: input.categoryId } });
      assert(category?.active, 422, "INVALID_CATEGORY", "Choose an active facility category.");
      const location = await tx.officeLocation.findUnique({ where: { id: input.locationId } });
      assert(location?.active, 422, "INVALID_LOCATION", "Choose an active location.");
      assert(
        category.code !== "MEETING_ROOM" || input.capacity !== undefined,
        422,
        "VALIDATION_FAILED",
        "Meeting room capacity is required.",
      );
      assert(
        category.code !== "VEHICLE" || !!input.plateNumber?.trim(),
        422,
        "VALIDATION_FAILED",
        "Vehicle plate number is required.",
      );
      assert(
        category.code !== "EQUIPMENT" || !!input.assetCode?.trim(),
        422,
        "VALIDATION_FAILED",
        "Equipment asset code is required.",
      );
      const defaultRoomWindows = Array.from({ length: 5 }, (_, day) => ({
        dayOfWeek: day + 1,
        opens: "08:00",
        closes: "18:00",
        kind: "BOOKING",
      }));
      const data = await tx.facility.create({
        data: {
          code: input.code.toUpperCase(),
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          locationId: input.locationId,
          approvalPolicy: input.approvalPolicy,
          minMinutes: input.minMinutes,
          maxMinutes: input.maxMinutes,
          leadMinutes: input.leadMinutes,
          bufferMinutes: input.bufferMinutes,
          ...(category.code === "MEETING_ROOM" ? { windows: { create: defaultRoomWindows } } : {}),
          ...(category.code === "MEETING_ROOM"
            ? {
                room: {
                  create: {
                    capacity: input.capacity ?? 0,
                    floor: input.floor ?? "",
                    amenities: input.amenities ?? [],
                  },
                },
              }
            : {}),
          ...(category.code === "VEHICLE"
            ? {
                vehicle: {
                  create: {
                    plateNumber: input.plateNumber ?? "",
                    brand: input.brand ?? "",
                    model: input.model ?? "",
                    vehicleType: input.vehicleType ?? "CAR",
                    passengerCapacity: input.passengerCapacity ?? 4,
                    currentOdometer: input.currentOdometer ?? 0,
                  },
                },
              }
            : {}),
          ...(category.code === "EQUIPMENT"
            ? {
                equipment: {
                  create: {
                    assetCode: input.assetCode ?? "",
                    brand: input.brand ?? "",
                    model: input.model ?? "",
                    serialNumber: input.serialNumber ?? null,
                  },
                },
              }
            : {}),
        },
      });
      await recordEvent(tx, ctx.actor!.id, "FACILITY_CREATED", "Facility", data.id);
      return tx.facility.findUniqueOrThrow({ where: { id: data.id }, include: facilityInclude });
    });
  });
  route("PATCH", "/admin/facilities/:id", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const input = await ctx.body(
      z
        .object({
          name: z.string().min(2).max(140).optional(),
          description: z.string().max(600).optional(),
          approvalPolicy: z.enum(["AUTO_CONFIRM", "REQUIRE_APPROVAL"]).optional(),
          minMinutes: z.number().int().positive().optional(),
          maxMinutes: z.number().int().positive().optional(),
          bufferMinutes: z.number().int().nonnegative().optional(),
          leadMinutes: z.number().int().nonnegative().optional(),
          locationId: z.string().uuid().optional(),
          capacity: z.number().int().positive().optional(),
          floor: z.string().max(40).optional(),
          amenities: z.array(z.string()).max(30).optional(),
          plateNumber: z.string().min(2).max(30).optional(),
          brand: z.string().max(100).optional(),
          model: z.string().max(100).optional(),
          passengerCapacity: z.number().int().positive().optional(),
          assetCode: z.string().min(2).max(80).optional(),
          serialNumber: z.string().max(100).nullable().optional(),
        })
        .strict(),
    );
    return withMutation(ctx, `facility:${id}:edit`, async (tx) => {
      await lockFacility(tx, id);
      const old = await tx.facility.findUnique({
        where: { id },
        include: { category: true },
      });
      assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
      checkVersion(ctx, old.version);
      if (input.locationId) {
        const location = await tx.officeLocation.findUnique({ where: { id: input.locationId } });
        assert(location?.active, 422, "INVALID_LOCATION", "Select an active office location.");
      }
      if (input.capacity !== undefined) {
        assert(
          old.category.code === "MEETING_ROOM",
          422,
          "INVALID_CATEGORY",
          "Capacity belongs to a meeting room.",
        );
        const incompatible = await tx.booking.findFirst({
          where: {
            facilityId: old.id,
            status: { in: ["PENDING", "CONFIRMED", "IN_USE"] },
            meeting: { attendees: { gt: input.capacity } },
          },
        });
        assert(
          !incompatible,
          409,
          "CAPACITY_EXCEEDED",
          "Existing bookings exceed the proposed capacity.",
        );
      }
      assert(
        (input.maxMinutes ?? old.maxMinutes) >= (input.minMinutes ?? old.minMinutes),
        422,
        "VALIDATION_FAILED",
        "Invalid booking duration limits.",
      );
      const facility = await tx.facility.update({
        where: { id: old.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.approvalPolicy !== undefined ? { approvalPolicy: input.approvalPolicy } : {}),
          ...(input.minMinutes !== undefined ? { minMinutes: input.minMinutes } : {}),
          ...(input.maxMinutes !== undefined ? { maxMinutes: input.maxMinutes } : {}),
          ...(input.bufferMinutes !== undefined ? { bufferMinutes: input.bufferMinutes } : {}),
          ...(input.leadMinutes !== undefined ? { leadMinutes: input.leadMinutes } : {}),
          ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
          version: { increment: 1 },
        },
      });
      if (old.category.code === "MEETING_ROOM") {
        await tx.meetingRoomProfile.update({
          where: { facilityId: old.id },
          data: {
            ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
            ...(input.floor !== undefined ? { floor: input.floor } : {}),
            ...(input.amenities !== undefined ? { amenities: input.amenities } : {}),
          },
        });
      } else if (old.category.code === "VEHICLE") {
        await tx.vehicleProfile.update({
          where: { facilityId: old.id },
          data: {
            ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
            ...(input.brand !== undefined ? { brand: input.brand } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.passengerCapacity !== undefined
              ? { passengerCapacity: input.passengerCapacity }
              : {}),
          },
        });
      } else if (old.category.code === "EQUIPMENT") {
        await tx.equipmentProfile.update({
          where: { facilityId: old.id },
          data: {
            ...(input.assetCode !== undefined ? { assetCode: input.assetCode } : {}),
            ...(input.brand !== undefined ? { brand: input.brand } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
          },
        });
      }
      await recordEvent(tx, ctx.actor!.id, "FACILITY_UPDATED", "Facility", old.id);
      return facility;
    });
  });
  route("PUT", "/admin/facilities/:id/operating-windows", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const input = await ctx.body(
      z.object({ windows: z.array(operatingWindowInput).max(40) }).strict(),
    );
    validateWindows(input.windows);
    return withMutation(ctx, `facility:${id}:operating-windows`, async (tx) => {
      await lockFacility(tx, id);
      const facility = await tx.facility.findUnique({
        where: { id },
        include: { category: true },
      });
      assert(facility, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
      checkVersion(ctx, facility.version);
      assert(
        facility.category.code !== "MEETING_ROOM" ||
          input.windows.some((w) => w.kind === "BOOKING"),
        422,
        "OPERATING_HOURS_UNCONFIGURED",
        "Meeting rooms require booking operating windows.",
      );
      await tx.facilityOperatingWindow.deleteMany({ where: { facilityId: facility.id } });
      if (input.windows.length)
        await tx.facilityOperatingWindow.createMany({
          data: input.windows.map((window) => ({ ...window, facilityId: facility.id })),
        });
      await tx.facility.update({ where: { id: facility.id }, data: { version: { increment: 1 } } });
      await recordEvent(tx, ctx.actor!.id, "OPERATING_WINDOWS_UPDATED", "Facility", facility.id);
      return tx.facilityOperatingWindow.findMany({
        where: { facilityId: facility.id },
        orderBy: [{ dayOfWeek: "asc" }, { opens: "asc" }],
      });
    });
  });

  route("POST", "/operations/facilities/:id/deactivate", async (ctx) => {
    manager(ctx);
    const id = ctx.params.id!;
    const { reason } = await ctx.body(z.object({ reason: z.string().min(3).max(500) }).strict());
    return withMutation(ctx, `facility:${id}:deactivate`, async (tx) => {
      await lockFacility(tx, id);
      const old = await tx.facility.findUnique({ where: { id } });
      assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
      checkVersion(ctx, old.version);
      const facility = await tx.facility.update({
        where: { id: old.id },
        data: { status: "INACTIVE", version: { increment: 1 } },
      });
      await recordEvent(
        tx,
        ctx.actor!.id,
        "FACILITY_DEACTIVATED",
        "Facility",
        old.id,
        null,
        reason,
      );
      return facility;
    });
  });
  route("POST", "/admin/facilities/:id/reactivate", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const { reason } = await ctx.body(z.object({ reason: z.string().min(3).max(500) }).strict());
    return withMutation(ctx, `facility:${id}:reactivate`, async (tx) => {
      await lockFacility(tx, id);
      const old = await tx.facility.findUnique({ where: { id } });
      assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
      checkVersion(ctx, old.version);
      assert(
        old.status === "INACTIVE",
        409,
        "FACILITY_STATE_CONFLICT",
        "Only inactive facilities can be reactivated.",
      );
      const maintenance = await tx.maintenance.findFirst({
        where: { facilityId: old.id, status: "IN_PROGRESS" },
      });
      assert(
        !maintenance,
        409,
        "FACILITY_UNAVAILABLE",
        "Finish active maintenance before reactivation.",
      );
      const facility = await tx.facility.update({
        where: { id: old.id },
        data: {
          status: "ACTIVE",
          version: { increment: 1 },
        },
      });
      await recordEvent(
        tx,
        ctx.actor!.id,
        "FACILITY_REACTIVATED",
        "Facility",
        old.id,
        null,
        reason,
      );
      return facility;
    });
  });

  route("POST", "/admin/facilities/:id/archive", async (ctx) => {
    admin(ctx);
    const id = ctx.params.id!;
    const { reason } = await ctx.body(z.object({ reason: z.string().min(3) }).strict());
    return withMutation(ctx, `facility:${id}:archive`, async (tx) => {
      await lockFacility(tx, id);
      const old = await tx.facility.findUnique({ where: { id } });
      assert(old, 404, "RESOURCE_NOT_FOUND", "Facility not found.");
      checkVersion(ctx, old.version);
      const active = await tx.usageSession.findFirst({
        where: { facilityId: old.id, state: "ACTIVE" },
      });
      assert(!active, 409, "FACILITY_IN_USE", "Return the asset before archiving.");
      const updated = await tx.facility.update({
        where: { id: old.id },
        data: {
          status: "ARCHIVED",
          version: { increment: 1 },
        },
      });
      await recordEvent(tx, ctx.actor!.id, "FACILITY_ARCHIVED", "Facility", old.id, null, reason);
      return updated;
    });
  });
}
