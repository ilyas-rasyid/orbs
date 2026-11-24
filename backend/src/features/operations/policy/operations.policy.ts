import type { Context } from "../../../http/router.js";
import { assert } from "../../../http/errors.js";

export function requireOfficer(context: Context) {
  assert(context.actor?.role !== "EMPLOYEE", 403, "ACCESS_DENIED", "Manager access required.");
}
