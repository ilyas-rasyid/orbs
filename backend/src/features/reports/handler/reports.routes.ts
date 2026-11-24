import { route } from "../../../http/router.js";
import { getReport, exportReport } from "./report.handler.js";
import { getDashboardSummary } from "./dashboard.handler.js";

export function registerReportRoutes() {
  route("GET", "/reports/:type", getReport);
  route("GET", "/reports/:type/export", exportReport);
  route("GET", "/dashboard", getDashboardSummary);
}
