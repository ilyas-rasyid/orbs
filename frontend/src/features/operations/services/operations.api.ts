import { api } from "../../../shared/api/client";
import type { Booking } from "../../../shared/types/domain";

export const operationsApi = {
  approvals: () => api.get<Booking[]>("/operations/approvals"),
  handoverQueue: () => api.get<Booking[]>("/operations/handover-queue"),
  usage: <T>() => api.get<T>("/operations/usage"),
};
