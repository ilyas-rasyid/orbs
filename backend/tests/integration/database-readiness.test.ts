import { expect, it } from "bun:test";
import { createDatabasePool } from "../../src/infrastructure/database/connection.js";
import { createDatabaseHealthCheck } from "../../src/infrastructure/database/health.js";
import { assertSafeTestDatabase } from "../../src/infrastructure/database/test-guard.js";

it("checks real PostgreSQL readiness against an isolated test database", async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for integration tests");
  assertSafeTestDatabase(url, process.env.NODE_ENV ?? "");
  const pool = createDatabasePool(url);
  try {
    expect(await createDatabaseHealthCheck(pool)()).toBe(true);
  } finally {
    await pool.end();
  }
});
