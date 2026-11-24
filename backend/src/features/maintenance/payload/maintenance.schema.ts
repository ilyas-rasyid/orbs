import { z } from "zod";

export const createInput = z
  .object({
    facilityId: z.string().uuid(),
    startAt: z.string(),
    endAt: z.string(),
    reason: z.string().trim().min(3).max(300),
    notes: z.string().max(1000).default(""),
  })
  .strict();
