import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests use the synthetic development seed and an isolated database.
 * Never target production or a database containing real employee records.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run dev:backend",
      url: "http://127.0.0.1:3003/health/ready",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "bun run dev:frontend",
      url: "http://127.0.0.1:5175",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
