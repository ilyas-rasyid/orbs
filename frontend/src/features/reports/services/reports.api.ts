import { api } from "../../../shared/api/client";
import type { Report } from "../types/report.types";

export const reportsApi = {
  get: (type: string, queryString: string) => api.get<Report>(`/reports/${type}?${queryString}`),
  exportCsv: (type: string, queryString: string) =>
    api.downloadCsv(`/reports/${type}/export?${queryString}`),
};
