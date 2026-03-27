import { test, expect } from "@playwright/test";

test.describe("Auth — multi-user mode (Auth0)", () => {
  test("unauthenticated user visiting / sees loader then redirects to /login", async ({
    page,
  }) => {
    await page.goto("/");
    // Should end up at /login since user is not authenticated
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting /creator is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/creator");
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows Log In and Sign Up buttons", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Learner Verse" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
  });

  test("clicking Log In redirects to Auth0 Universal Login", async ({
    page,
  }) => {
    await page.goto("/login");
    const loginButton = page.getByRole("button", { name: "Log In" });
    await expect(loginButton).toBeVisible();

    // Click and wait for navigation to Auth0
    await Promise.all([
      page.waitForURL(/lightningzzz\.us\.auth0\.com/, { timeout: 15_000 }),
      loginButton.click(),
    ]);

    expect(page.url()).toContain("lightningzzz.us.auth0.com");
  });

  test("clicking Sign Up redirects to Auth0 with signup hint", async ({
    page,
  }) => {
    await page.goto("/login");
    const signUpButton = page.getByRole("button", { name: "Sign Up" });
    await expect(signUpButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/lightningzzz\.us\.auth0\.com/, { timeout: 15_000 }),
      signUpButton.click(),
    ]);

    expect(page.url()).toContain("lightningzzz.us.auth0.com");
    expect(page.url()).toContain("screen_hint=signup");
  });

  test("unknown routes show 404 page", async ({ page }) => {
    await page.goto("/some-random-page");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
