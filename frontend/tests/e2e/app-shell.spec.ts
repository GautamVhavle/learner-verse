import { test, expect } from "@playwright/test";

test.describe("App Shell & Layout", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to reset mode state
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("sidebar is visible with all navigation items", async ({ page }) => {
    // Core nav items visible as sidebar buttons (Creator mode is default)
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Courses" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Certificates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trash" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  test("sidebar shows brand header", async ({ page }) => {
    await expect(page.locator("[data-slot='sidebar']").getByText("Learner Verse")).toBeVisible();
    await expect(page.locator("[data-slot='sidebar']").getByText("Creator Mode")).toBeVisible();
  });

  test("header shows breadcrumb with current page", async ({ page }) => {
    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible();
    await expect(header.getByText("Dashboard")).toBeVisible();
  });

  test("mode toggle shows Creator by default", async ({ page }) => {
    const toggle = page.getByTestId("mode-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle.getByText("Creator")).toBeVisible();
  });

  test("mode toggle switches between Creator and Learner", async ({
    page,
  }) => {
    const toggle = page.getByTestId("mode-toggle");

    // Start in Creator mode
    await expect(toggle.getByText("Creator")).toBeVisible();

    // Click toggle
    await toggle.click();

    // Should now be Learner mode
    await expect(toggle.getByText("Learner")).toBeVisible();

    // Trash should be hidden in Learner mode
    await expect(page.getByRole("button", { name: "Trash" })).toBeHidden();

    // Toggle back
    await toggle.click();
    await expect(toggle.getByText("Creator")).toBeVisible();
    await expect(page.getByRole("button", { name: "Trash" })).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    // Click "View All" under the Courses group (already open by default)
    await page.getByText("View All").click();
    await expect(page).toHaveURL("/courses");

    // Header breadcrumb should update
    const header = page.getByTestId("app-header");
    await expect(header.getByText("Courses")).toBeVisible();

    // Click Settings
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");

    // Click Dashboard
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/");
  });

  test("mode persists across page reload", async ({ page }) => {
    const toggle = page.getByTestId("mode-toggle");

    // Switch to Learner mode
    await toggle.click();
    await expect(toggle.getByText("Learner")).toBeVisible();

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be Learner mode
    await expect(page.getByTestId("mode-toggle").getByText("Learner")).toBeVisible();
  });

  test("user info is shown in sidebar footer", async ({ page }) => {
    const userTrigger = page.getByTestId("user-menu-trigger");
    await expect(userTrigger).toBeVisible();
    await expect(userTrigger.getByText("Local User")).toBeVisible();
    await expect(userTrigger.getByText("local@learnerverse.dev")).toBeVisible();
  });

  test("keyboard shortcut Ctrl+Shift+C toggles mode", async ({ page }) => {
    const toggle = page.getByTestId("mode-toggle");
    await expect(toggle.getByText("Creator")).toBeVisible();

    // Press Ctrl+Shift+C
    await page.keyboard.press("Control+Shift+c");

    await expect(toggle.getByText("Learner")).toBeVisible();

    // Press again to go back
    await page.keyboard.press("Control+Shift+c");

    await expect(toggle.getByText("Creator")).toBeVisible();
  });
});
