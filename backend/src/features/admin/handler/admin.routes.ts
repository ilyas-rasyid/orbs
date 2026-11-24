import { route } from "../../../http/router.js";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserCredentials,
} from "./users.handler.js";
import {
  listDepartments,
  createDepartment,
  listManagedLocations,
  createLocation,
  listManagedFacilityCategories,
  getOrganizationSettings,
  updateOrganizationSettings,
} from "./organization.handler.js";
import { listAuditLogs, getAuditLog } from "./audit.handler.js";

export function registerAdminRoutes() {
  route("GET", "/admin/users", listUsers);
  route("GET", "/admin/users/:id", getUser);
  route("POST", "/admin/users", createUser);
  route("PATCH", "/admin/users/:id", updateUser);
  route("POST", "/admin/users/:id/deactivate", deactivateUser);
  route("POST", "/admin/users/:id/activate", activateUser);
  route("POST", "/admin/users/:id/credential-reset", resetUserCredentials);
  route("GET", "/admin/departments", listDepartments);
  route("POST", "/admin/departments", createDepartment);
  route("GET", "/admin/locations", listManagedLocations);
  route("POST", "/admin/locations", createLocation);
  route("GET", "/admin/facility-categories", listManagedFacilityCategories);
  route("GET", "/admin/settings", getOrganizationSettings);
  route("PATCH", "/admin/settings", updateOrganizationSettings);
  route("GET", "/admin/audit-logs", listAuditLogs);
  route("GET", "/admin/audit-logs/:id", getAuditLog);
}
