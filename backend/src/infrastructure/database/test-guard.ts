export function assertSafeTestDatabase(databaseUrl: string, environment: string): void {
  if (environment !== "test") {
    throw new Error("Integration tests require NODE_ENV=test");
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database.endsWith("_test") || database.length <= "_test".length) {
    throw new Error("Test database name must end with '_test'");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Test database must use PostgreSQL");
  }
  if (!["localhost", "127.0.0.1", "postgres"].includes(parsed.hostname)) {
    throw new Error("Test database host is not a recognized local/CI host");
  }
}
