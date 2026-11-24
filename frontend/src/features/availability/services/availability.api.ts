import { api } from "../../../shared/api/client";
import type { CalendarData } from "../../../shared/types/domain";

export const availabilityApi = {
  calendar: (from: Date, to: Date, facilityId: string) => {
    const path =
      `/availability?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}` +
      (facilityId ? `&facilityIds=${facilityId}` : "");
    return api.get<CalendarData>(path);
  },
};
