import type { Handler } from "../../../http/router.js";
import { admin } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";
import { z } from "zod";
import {
  checkVersion,
  lockFacility,
  recordEvent,
  withMutation,
} from "../../../shared/transactions.js";
import { validateWindows } from "../../../shared/domain/operating-windows.js";
import { facilityInclude } from "../service/facilities.service.js";
import { facilityInput, operatingWindowInput } from "../payload/facility.schema.js";

export const createFacility: Handler = async (ctx) => {
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
};

export const updateFacility: Handler = async (ctx) => {
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
};

export const updateFacilityOperatingWindows: Handler = async (ctx) => {
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
      facility.category.code !== "MEETING_ROOM" || input.windows.some((w) => w.kind === "BOOKING"),
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
};
