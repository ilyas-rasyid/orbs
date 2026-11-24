import { route } from "../../../http/router.js";
import {
  listFacilityCategories,
  listLocations,
  searchDirectoryUsers,
  listFacilities,
  getFacility,
  getFacilityOperatingWindows,
  getAvailability,
  getFacilityAvailability,
  listManagedFacilities,
} from "./facility-query.handler.js";
import {
  createFacility,
  updateFacility,
  updateFacilityOperatingWindows,
} from "./facility-write.handler.js";
import {
  deactivateFacility,
  reactivateFacility,
  archiveFacility,
} from "./facility-lifecycle.handler.js";

export function registerFacilityRoutes() {
  route("GET", "/facility-categories", listFacilityCategories);
  route("GET", "/locations", listLocations);
  route("GET", "/directory/users", searchDirectoryUsers);
  route("GET", "/facilities", listFacilities);
  route("GET", "/facilities/:id", getFacility);
  route("GET", "/facilities/:id/operating-windows", getFacilityOperatingWindows);
  route("GET", "/availability", getAvailability);
  route("GET", "/facilities/:id/availability", getFacilityAvailability);
  route("GET", "/admin/facilities", listManagedFacilities);
  route("POST", "/admin/facilities", createFacility);
  route("PATCH", "/admin/facilities/:id", updateFacility);
  route("PUT", "/admin/facilities/:id/operating-windows", updateFacilityOperatingWindows);
  route("POST", "/operations/facilities/:id/deactivate", deactivateFacility);
  route("POST", "/admin/facilities/:id/reactivate", reactivateFacility);
  route("POST", "/admin/facilities/:id/archive", archiveFacility);
}
