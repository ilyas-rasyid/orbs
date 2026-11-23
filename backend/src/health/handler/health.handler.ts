import { Elysia } from "elysia";
import type { DatabaseCheck } from "../../infrastructure/database/health.js";

export function createHealthHandler(checkDatabase: DatabaseCheck) {
  return new Elysia({ name: "orbs-health" })
    .get("/health/live", () => ({
      status: "ok" as const,
      service: "orbs-api",
      checked_at: new Date().toISOString(),
    }))
    .get("/health/ready", async ({ set }) => {
      const ready = await checkDatabase();
      if (!ready) set.status = 503;
      return {
        status: ready ? ("ok" as const) : ("unavailable" as const),
        service: "orbs-api",
        checked_at: new Date().toISOString(),
      };
    });
}
