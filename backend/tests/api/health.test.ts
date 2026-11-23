import { describe, expect, it } from "bun:test";
import { createApp } from "../../src/app.js";

const url = (path: string) => `http://localhost${path}`;

describe("health API", () => {
  it("returns independent liveness while database is unavailable", async () => {
    const app = createApp({ checkDatabase: async () => false, logLevel: "error" });
    const response = await app.handle(new Request(url("/health/live")));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns readiness only when PostgreSQL is reachable", async () => {
    const app = createApp({ checkDatabase: async () => true, logLevel: "error" });
    const response = await app.handle(new Request(url("/health/ready")));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("returns 503 readiness if PostgreSQL fails", async () => {
    const app = createApp({ checkDatabase: async () => false, logLevel: "error" });
    const response = await app.handle(new Request(url("/health/ready")));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("unavailable");
  });

  it("sanitizes unknown route errors", async () => {
    const app = createApp({ checkDatabase: async () => true, logLevel: "error" });
    const response = await app.handle(new Request(url("/unknown")));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    const problem = (await response.json()) as { code: string; request_id: string };
    expect(problem.code).toBe("RESOURCE_NOT_FOUND");
    expect(problem.request_id).toBeTruthy();
  });
});
