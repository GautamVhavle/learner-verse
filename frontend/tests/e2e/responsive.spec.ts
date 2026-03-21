import { test, expect } from "@playwright/test";

/**
 * Phase 20 — Responsive Layout Tests
 *
 * Tests critical layout behavior at mobile, tablet, and desktop breakpoints.
 */

const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };

test.describe("Responsive Layout", () => {
  test("mobile: sidebar hidden, header visible", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On mobile the sidebar panel is hidden (rendered as a Sheet, closed by default).
    // The desktop sidebar wrapper has class "hidden md:block", so it should not be visible.
    const desktopSidebar = page.locator(".group.peer.hidden.md\\:block");
    await expect(desktopSidebar).toHaveCount(0);

    // Search trigger should be visible
    const searchBtn = page.getByTestId("search-trigger");
    await expect(searchBtn).toBeVisible();

    // Header should be visible
    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible();
  });

  test("mobile: can open sidebar via hamburger", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click sidebar trigger (hamburger)
    const trigger = page.locator("button[data-sidebar='trigger']");
    await trigger.click();

    // Sidebar should become visible
    await expect(page.getByText("Learner Verse")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
  });

  test("tablet: layout works at 768px", async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Header visible
    await expect(page.getByTestId("app-header")).toBeVisible();

    // Content should be visible
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("desktop: full layout with sidebar", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Sidebar fully visible
    await expect(page.getByText("Learner Verse")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

    // Header visible with search
    await expect(page.getByTestId("app-header")).toBeVisible();
    await expect(page.getByTestId("search-trigger")).toBeVisible();
  });

  test("mobile: settings page is readable", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.locator("#main-content h2").first()).toBeVisible();
  });

  test("mobile: certificates page is readable", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/certificates");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Certificates", exact: true })).toBeVisible();
  });

  test("mobile: 404 page renders correctly", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/nonexistent-page");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
