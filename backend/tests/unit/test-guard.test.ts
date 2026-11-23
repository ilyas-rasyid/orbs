import { describe, expect, it } from "bun:test";
import { assertSafeTestDatabase } from "../../src/infrastructure/database/test-guard.js";

describe("test database guard", () => {
  it("accepts local test database", () => {
    expect(() =>
      assertSafeTestDatabase("postgresql://x:x@127.0.0.1:5432/orbs_test", "test"),
    ).not.toThrow();
  });

  it("blocks development and production databases", () => {
    expect(() =>
      assertSafeTestDatabase("postgresql://x:x@localhost:5432/orbs_dev", "test"),
    ).toThrow();
    expect(() =>
      assertSafeTestDatabase("postgresql://x:x@localhost:5432/orbs_test", "production"),
    ).toThrow();
  });
});
