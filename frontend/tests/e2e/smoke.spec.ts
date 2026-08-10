import { test, expect } from "@playwright/test";

test("homepage loads with dashboard content", async ({ page }) => {
  await page.goto("/creator");
  await expect(
    page.getByRole("heading", { name: "My Courses" }),
  ).toBeVisible();
});

test("sidebar is visible with navigation", async ({ page }) => {
  await page.goto("/creator");
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
});
