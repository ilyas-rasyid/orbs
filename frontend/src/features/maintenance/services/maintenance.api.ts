import { api } from "../../../shared/api/client";
import type { Maintenance } from "../../../shared/types/domain";

export const maintenanceApi = {
  list: () => api.get<Maintenance[]>("/operations/maintenance"),
  create: (payload: object) => api.mutate("/operations/maintenance", payload),
  transition: (id: string, action: "start" | "complete" | "cancel", version: number) =>
    api.mutate(
      `/operations/maintenance/${id}/${action}`,
      action === "cancel" ? { reason: "Cancelled by facility manager" } : {},
      { version },
    ),
};
