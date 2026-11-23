import { createDatabasePool } from "./connection.js";
import { createDatabaseHealthCheck } from "./health.js";
import { loadEnvironment } from "../../config/env.js";

async function main() {
  const env = loadEnvironment();
  const pool = createDatabasePool(env.databaseUrl);
  try {
    const healthy = await createDatabaseHealthCheck(pool)();
    if (!healthy) throw new Error("PostgreSQL readiness check failed");
    console.log("OK PostgreSQL connection / SELECT 1");
  } finally {
    await pool.end();
  }
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database check failed");
  process.exitCode = 1;
});
