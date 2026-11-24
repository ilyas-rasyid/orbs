import { z } from "zod";

export const handoverSchema = z
  .object({
    actualDriverId: z.string().uuid().optional(),
    startingOdometer: z.number().int().nonnegative().optional(),
    condition: z.string().min(2).max(100),
    fuel: z.string().max(40).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const returnSchema = z
  .object({
    endingOdometer: z.number().int().nonnegative().optional(),
    condition: z.string().min(2).max(100),
    fuel: z.string().max(40).optional(),
    damageNotes: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();
