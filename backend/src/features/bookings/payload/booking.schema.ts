import { z } from "zod";

export const bookingInput = z
  .object({
    facilityId: z.string().uuid(),
    startAt: z.string(),
    endAt: z.string(),
    purpose: z.string().trim().min(3).max(400),
    responsibleUserId: z.string().uuid().optional(),
    meetingTitle: z.string().trim().max(160).optional(),
    attendees: z.number().int().positive().optional(),
    destination: z.string().trim().max(240).optional(),
    travelPurpose: z.string().trim().max(400).optional(),
    designatedDriverId: z.string().uuid().optional(),
  })
  .strict();
