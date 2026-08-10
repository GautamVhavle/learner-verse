import { defineConfig, devices } from "@playwright/test";

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 5173);
const authFrontendPort = Number(process.env.E2E_AUTH_FRONTEND_PORT ?? 5174);
const frontendUrl = `http://localhost:${frontendPort}`;
const authFrontendUrl = `http://localhost:${authFrontendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "default",
      testIgnore: "auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "auth",
      testMatch: "auth.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: authFrontendUrl,
      },
    },
  ],
  webServer: [
    {
      command: `VITE_SINGLE_USER_MODE=true VITE_API_BASE_URL=${apiBaseUrl} npx vite --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `VITE_SINGLE_USER_MODE=false VITE_API_BASE_URL=${apiBaseUrl} npx vite --port ${authFrontendPort}`,
      url: authFrontendUrl,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
