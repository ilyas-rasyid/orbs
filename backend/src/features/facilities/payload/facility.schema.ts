import { z } from "zod";

export const operatingWindowInput = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    kind: z.enum(["BOOKING", "HANDOVER", "RETURN"]),
  })
  .strict();

export const facilityInput = z
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
