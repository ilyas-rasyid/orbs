import { createApp } from "./app.js";
import { loadEnvironment } from "./config/env.js";
import { createDatabasePool } from "./infrastructure/database/connection.js";
import { createDatabaseHealthCheck } from "./infrastructure/database/health.js";

const env = loadEnvironment();
const pool = createDatabasePool(env.databaseUrl);
const app = createApp({
  checkDatabase: createDatabaseHealthCheck(pool),
  logLevel: env.logLevel,
});

app.listen(
  { port: env.port, hostname: env.mode === "production" ? "0.0.0.0" : "127.0.0.1" },
  () => {
    console.log(
      JSON.stringify({
        level: "info",
        service: "orbs-api",
        message: "API listening",
        port: env.port,
      }),
    );
  },
);

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await app.stop();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
