import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
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
        baseURL: "http://localhost:5174",
      },
    },
  ],
  webServer: [
    {
      command: "VITE_SINGLE_USER_MODE=true npx vite --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx vite --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
