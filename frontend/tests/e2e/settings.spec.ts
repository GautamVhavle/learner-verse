import { test, expect } from "@playwright/test";

const API = "http://localhost:8000/api/v1";

/** Reset user settings to defaults before each test. */
async function resetUserSettings() {
  await fetch(`${API}/auth/me`);
  await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: "Local User",
      timezone: "UTC",
      playback_speed: 1.0,
      font_size: "normal",
    }),
  });
}

test.describe.serial("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await resetUserSettings();
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test.afterAll(async () => {
    await resetUserSettings();
  });

  test("renders profile section with user data", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByTestId("settings-display-name")).toHaveValue(
      "Local User",
    );
    await expect(
      page.getByRole("paragraph").filter({ hasText: "local@learnerverse.dev" }),
    ).toBeVisible();
  });

  test("can update display name", async ({ page }) => {
    const input = page.getByTestId("settings-display-name");
    await input.clear();
    await input.pressSequentially("New Display Name", { delay: 30 });

    // Wait for debounced save (600ms) to fire and the API response
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/me") && resp.request().method() === "PUT",
    );
    await responsePromise;

    // Reload to verify persistence
    await page.reload();
    await expect(page.getByTestId("settings-display-name")).toHaveValue(
      "New Display Name",
      { timeout: 10000 },
    );
  });

  test("can change timezone", async ({ page }) => {
    // Open timezone dropdown
    await page.getByTestId("settings-timezone-trigger").click();
    await expect(page.getByTestId("settings-timezone-search")).toBeVisible();

    // Search for a timezone
    await page.getByTestId("settings-timezone-search").fill("New_York");
    // Click the dropdown option (not the trigger)
    const tzOption = page.locator("button", { hasText: "America/New York" }).last();
    await tzOption.click();

    // Should show the new timezone
    await expect(page.getByTestId("settings-timezone-trigger")).toContainText(
      "America/New York",
    );

    // Wait for save to finish
    await page.waitForResponse(
      (resp) => resp.url().includes("/auth/me") && resp.request().method() === "PUT",
    );

    // Reload to verify persistence
    await page.reload();
    await expect(page.getByTestId("settings-timezone-trigger")).toContainText(
      "America/New York",
      { timeout: 10000 },
    );
  });

  test("can change playback speed", async ({ page }) => {
    // Click 1.5x speed
    await page.getByTestId("speed-1.5").click();

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Reload to verify persistence
    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Wait for user data to load and the button to be styled as selected
    const speedBtn = page.getByTestId("speed-1.5");
    await expect(speedBtn).toHaveClass(/bg-accent-blue/, { timeout: 10000 });
  });

  test("can change font size and it applies to page", async ({ page }) => {
    // Click Large font
    await page.getByTestId("font-large").click();

    // Wait for save
    await page.waitForTimeout(500);

    // HTML element should have font-large class
    const htmlClass = await page.evaluate(() =>
      document.documentElement.className,
    );
    expect(htmlClass).toContain("font-large");

    // Reload to verify persistence
    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Wait for user data to load and font class to be applied
    await page.waitForFunction(
      () => document.documentElement.classList.contains("font-large"),
      { timeout: 10000 },
    );
  });

  test("font size XL applies correctly", async ({ page }) => {
    await page.getByTestId("font-xl").click();

    const htmlClass = await page.evaluate(() =>
      document.documentElement.className,
    );
    expect(htmlClass).toContain("font-xl");
    expect(htmlClass).not.toContain("font-large");
  });

  test("font size normal removes size classes", async ({ page }) => {
    // First set to large
    await page.getByTestId("font-large").click();
    let htmlClass = await page.evaluate(() =>
      document.documentElement.className,
    );
    expect(htmlClass).toContain("font-large");

    // Then set back to normal
    await page.getByTestId("font-normal").click();
    htmlClass = await page.evaluate(() =>
      document.documentElement.className,
    );
    expect(htmlClass).not.toContain("font-large");
    expect(htmlClass).not.toContain("font-xl");
  });

  test("shows auto-save message", async ({ page }) => {
    await expect(
      page.getByText("Changes are saved automatically."),
    ).toBeVisible();
  });

  test("navigates to settings from sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "My Courses" }),
    ).toBeVisible();

    // Click Settings in sidebar
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
  });
});
