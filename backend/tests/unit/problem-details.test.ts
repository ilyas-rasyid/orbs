import { describe, expect, it } from "bun:test";
import { createProblemDetails } from "../../src/shared/errors/problem-details.js";

describe("RFC 9457 shape", () => {
  it("contains a safe machine-readable error and request ID", () => {
    const result = createProblemDetails({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      detail: "Dependency is unavailable.",
      instance: "/health/ready",
      requestId: "test-id",
    });
    expect(result.title).toBe("Service Unavailable");
    expect(result.request_id).toBe("test-id");
    expect(JSON.stringify(result)).not.toContain("password");
  });
});
