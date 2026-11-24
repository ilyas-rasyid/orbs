import { api } from "../../shared/api/client";
import type { ApiList, Category, Facility, Location } from "../../shared/types/domain";

export const facilitiesApi = {
  categories: () => api.get<Category[]>("/facility-categories"),
  locations: () => api.get<Location[]>("/locations"),
  select: () => api.get<ApiList<Facility>>("/facilities?limit=100"),
  list: (params: URLSearchParams) => api.get<ApiList<Facility>>(`/facilities?${params}`),
  detail: (id: string) => api.get<Facility>(`/facilities/${id}`),
};
