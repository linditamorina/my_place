import { defineConfig, devices } from "@playwright/test";

// Testet punojnë me databazën dhe dosjen e tyre, që të mos prekin të dhënat e zhvillimit.
export const E2E_ENV = {
  DATABASE_URL: "file:./prisma/e2e.db",
  UPLOAD_DIR: "storage/e2e-uploads",
  DEMO_MODE: "1",
};

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Testet ndryshojnë të njëjtën databazë, prandaj ekzekutohen njëri pas tjetrit.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "sq-AL",
    timezoneId: "Europe/Belgrade",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "admin", testMatch: /admin\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "banori", testMatch: /banori\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "promo", testMatch: /promo\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/hyr`,
    env: E2E_ENV,
    timeout: 300_000,
    reuseExistingServer: false,
  },
});
