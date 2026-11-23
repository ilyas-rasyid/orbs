import type { Pool } from "pg";

export type DatabaseCheck = () => Promise<boolean>;

export function createDatabaseHealthCheck(pool: Pick<Pool, "query">): DatabaseCheck {
  return async () => {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  };
}
