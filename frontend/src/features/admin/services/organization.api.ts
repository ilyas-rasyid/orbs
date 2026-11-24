import { api } from "../../../shared/api/client";
import type { Location } from "../../../shared/types/domain";
import type { Settings } from "../types/settings.types";

export const organizationApi = {
  settings: () => api.get<Settings>("/admin/settings"),
  updateSettings: (payload: object, version: number) =>
    api.mutate("/admin/settings", payload, { method: "PATCH", version }),
  locations: () => api.get<Location[]>("/admin/locations"),
  createLocation: (code: string, name: string, address: string) =>
    api.mutate("/admin/locations", { code, name, address }),
};
