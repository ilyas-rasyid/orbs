import { api } from "../../../shared/api/client";
import type { Facility } from "../../../shared/types/domain";
import type { OperatingWindow } from "../types/operating-window.types";

export const facilityAdminApi = {
  list: () => api.get<Facility[]>("/admin/facilities"),
  create: (payload: object) => api.mutate<Facility>("/admin/facilities", payload),
  update: (id: string, payload: object, version: number) =>
    api.mutate(`/admin/facilities/${id}`, payload, { method: "PATCH", version }),
  windows: (id: string) => api.get<OperatingWindow[]>(`/facilities/${id}/operating-windows`),
  saveWindows: (id: string, windows: object[], version: number) =>
    api.mutate(
      `/admin/facilities/${id}/operating-windows`,
      { windows },
      {
        method: "PUT",
        version,
      },
    ),
};
