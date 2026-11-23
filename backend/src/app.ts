import { Elysia } from "elysia";
import type { DatabaseCheck } from "./infrastructure/database/health.js";
import { createHealthHandler } from "./health/handler/health.handler.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { attachRequestId } from "./middleware/request-id.js";
import { dispatch } from "./http/router.js";
import { registerAuthenticationRoutes } from "./features/authentication/handler/auth.routes.js";
import { registerFacilityRoutes } from "./features/facilities/handler/facilities.routes.js";
import { registerBookingRoutes } from "./features/bookings/handler/booking.routes.js";
import { registerMaintenanceRoutes } from "./features/maintenance/handler/maintenance.routes.js";
import { registerAdminRoutes } from "./features/admin/handler/admin.routes.js";
import { registerNotificationRoutes } from "./features/notifications/handler/notification.routes.js";
import { registerReportRoutes } from "./features/reports/handler/reports.routes.js";

let registered = false;
function registerDomainRoutes() {
  if (registered) return;
  registerAuthenticationRoutes();
  registerFacilityRoutes();
  registerBookingRoutes();
  registerMaintenanceRoutes();
  registerAdminRoutes();
  registerNotificationRoutes();
  registerReportRoutes();
  registered = true;
}
export function createApp(options: { checkDatabase: DatabaseCheck; logLevel?: string }) {
  registerDomainRoutes();
  const app = registerErrorHandler(new Elysia())
    .onRequest(({ request, set }) => {
      set.headers["x-request-id"] = attachRequestId(request);
    })
    .use(createHealthHandler(options.checkDatabase));
  return app
    .all("/api/v1/*", async ({ request }) => dispatch(request))
    .all("/api/v1", async ({ request }) => dispatch(request));
}
