import { describe, expect, it } from "bun:test";
import { loadEnvironment } from "../../src/config/env.js";

const valid = {
  NODE_ENV: "test",
  PORT: "3001",
  LOG_LEVEL: "error",
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/orbs_test",
};

describe("backend environment", () => {
  it("accepts a valid configuration", () => {
    expect(loadEnvironment(valid).port).toBe(3001);
  });

  it("rejects missing required variables without revealing secrets", () => {
    expect(() => loadEnvironment({ PORT: "3001" })).toThrow("Invalid backend environment");
  });

  it("rejects a non-PostgreSQL database URL", () => {
    expect(() => loadEnvironment({ ...valid, DATABASE_URL: "https://example.com" })).toThrow();
  });
});
