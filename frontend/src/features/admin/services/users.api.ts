import { api } from "../../../shared/api/client";
import type { ApiList, User } from "../../../shared/types/domain";

export const usersApi = {
  list: () => api.get<ApiList<User>>("/admin/users?limit=100"),
  detail: (id: string) => api.get<User>(`/admin/users/${id}`),
  create: (payload: object) => api.mutate<{ temporaryPassword: string }>("/admin/users", payload),
  update: (id: string, path: string, payload: object, method: "POST" | "PATCH", version?: number) =>
    api.mutate<{ temporaryPassword?: string }>(`/admin/users/${id}${path}`, payload, {
      method,
      ...(version === undefined ? {} : { version }),
    }),
};
