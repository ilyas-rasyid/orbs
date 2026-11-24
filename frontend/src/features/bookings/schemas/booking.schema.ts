import { z } from "zod";
import { localDatetime } from "../../../shared/utils/dates";

export const formSchema = z.object({
  facilityId: z.string().min(1, "Pilih fasilitas"),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  purpose: z.string().trim().min(3, "Isi tujuan minimal 3 karakter"),
  responsibleUserId: z.string().optional(),
  meetingTitle: z.string().optional(),
  attendees: z.number().int().min(1).optional(),
  destination: z.string().optional(),
  travelPurpose: z.string().optional(),
  designatedDriverId: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export function defaultTimes() {
  const start = new Date(Date.now() + 90 * 60_000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  return {
    startAt: localDatetime(start),
    endAt: localDatetime(new Date(start.getTime() + 60 * 60_000)),
  };
}
