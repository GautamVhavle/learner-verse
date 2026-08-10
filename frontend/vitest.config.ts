import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    // Resolve imports from the symlink location (frontend/src/) rather than
    // the symlink target (private/frontend/src/) so node_modules is found.
    preserveSymlinks: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    // Cold CI installs can spend several seconds evaluating the larger page
    // modules before Testing Library assertions run. Keep the timeout above
    // that startup cost without masking genuinely hung tests.
    testTimeout: 20_000,
    maxWorkers: 4,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    css: true,
  },
});
