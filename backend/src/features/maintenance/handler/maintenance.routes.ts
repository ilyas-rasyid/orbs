import { route } from "../../../http/router.js";
import { listMaintenance, getMaintenance } from "./maintenance-query.handler.js";
import {
  createMaintenance,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
  updateMaintenance,
} from "./maintenance-command.handler.js";

export function registerMaintenanceRoutes() {
  route("GET", "/operations/maintenance", listMaintenance);
  route("GET", "/operations/maintenance/:id", getMaintenance);
  route("POST", "/operations/maintenance", createMaintenance);
  route("POST", "/operations/maintenance/:id/start", startMaintenance);
  route("POST", "/operations/maintenance/:id/complete", completeMaintenance);
  route("POST", "/operations/maintenance/:id/cancel", cancelMaintenance);
  route("PATCH", "/operations/maintenance/:id", updateMaintenance);
}
