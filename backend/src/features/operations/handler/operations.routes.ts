import { route } from "../../../http/router.js";
import { decideApproval } from "../service/decide-approval.service.js";
import { startUsage } from "../service/start-usage.service.js";
import { finishUsage } from "../service/finish-usage.service.js";
import { markNoShow } from "../service/mark-no-show.service.js";

export function registerOperationRoutes() {
  route("POST", "/bookings/:id/check-in", (ctx) => startUsage(ctx, "MEETING_ROOM"));
  route("POST", "/bookings/:id/check-out", (ctx) => finishUsage(ctx, "MEETING_ROOM"));
  route("POST", "/operations/bookings/:id/approve", (ctx) => decideApproval(ctx, "APPROVED"));
  route("POST", "/operations/bookings/:id/reject", (ctx) => decideApproval(ctx, "REJECTED"));
  route("POST", "/operations/bookings/:id/handover", (ctx) => startUsage(ctx, "PHYSICAL"));
  route("POST", "/operations/bookings/:id/return", (ctx) => finishUsage(ctx, "PHYSICAL"));
  route("POST", "/operations/bookings/:id/no-show", markNoShow);
}
