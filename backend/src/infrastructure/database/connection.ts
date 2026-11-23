import { Pool } from "pg";

export function createDatabasePool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 2_500,
    idleTimeoutMillis: 10_000,
    statement_timeout: 2_500,
    application_name: "orbs-api",
  });
}
