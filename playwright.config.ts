import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    locale: "en-SG",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
