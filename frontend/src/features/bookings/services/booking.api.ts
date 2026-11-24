import { api } from "../../../shared/api/client";
import type { ApiList, Booking, User } from "../../../shared/types/domain";

export const bookingApi = {
  create: (payload: object) => api.mutate<Booking>("/bookings", payload),
  list: (status: string) =>
    api.get<ApiList<Booking>>(`/bookings?limit=100${status ? `&status=${status}` : ""}`),
  recent: () => api.get<{ data: Booking[] }>("/bookings?limit=5"),
  detail: (id: string) => api.get<Booking>(`/bookings/${id}`),
  directory: (search: string) =>
    api.get<User[]>(`/directory/users?search=${encodeURIComponent(search)}`),
  action: (path: string, payload: object, version: number) =>
    api.mutate(path, payload, { version }),
};
