import { api } from "../../../shared/api/client";
import type { Notification } from "../../../shared/types/domain";

export const notificationsApi = {
  list: () => api.get<Notification[]>("/notifications"),
  read: (id: string) => api.mutate(`/notifications/${id}/read`),
};
