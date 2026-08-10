import { test, expect } from "@playwright/test";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function setOnboarding(complete: boolean) {
  await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding_complete: complete }),
  });
}

async function cleanupCourses() {
  const active = await fetch(`${API}/courses`).then((r) => r.json());
  for (const c of active.items) {
    await fetch(`${API}/courses/${c.id}`, { method: "DELETE" });
    await fetch(`${API}/courses/${c.id}/permanent`, { method: "DELETE" });
  }
  const trash = await fetch(`${API}/courses/trash`).then((r) => r.json());
  for (const c of trash.items) {
    await fetch(`${API}/courses/${c.id}/permanent`, { method: "DELETE" });
  }
}

test.describe.serial("Onboarding & Empty States", () => {
  test.afterAll(async () => {
    await setOnboarding(true);
  });

  // ── Onboarding flow ────────────────────────────────────

  test("shows onboarding for new user", async ({ page }) => {
    await setOnboarding(false);
    await page.goto("/creator");
    await expect(page.getByTestId("onboarding")).toBeVisible();
    await expect(page.getByTestId("onboarding-title")).toHaveText(
      "Welcome to Learner Verse",
    );
  });

  test("can navigate through onboarding steps", async ({ page }) => {
    await setOnboarding(false);
    await page.goto("/creator");
    await expect(page.getByTestId("onboarding-title")).toHaveText(
      "Welcome to Learner Verse",
    );

    // Step 1 → 2
    await page.getByTestId("onboarding-next").click();
    await expect(page.getByTestId("onboarding-title")).toHaveText(
      "Your Dashboard",
    );

    // Step 2 → 3
    await page.getByTestId("onboarding-next").click();
    await expect(page.getByTestId("onboarding-title")).toHaveText(
      "Two Modes, One App",
    );
  });

  test("completing onboarding shows dashboard", async ({ page }) => {
    await setOnboarding(false);
    await page.goto("/creator");
    await expect(page.getByTestId("onboarding")).toBeVisible();

    // Navigate to last step
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-next").click();

    // Get Started
    await page.getByTestId("onboarding-next").click();

    // Should show the dashboard
    await expect(
      page.getByRole("heading", { name: "My Courses" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("onboarding persists after completion", async ({ page }) => {
    // Should already be complete from prior test
    await page.goto("/creator");
    // Should NOT see onboarding
    await expect(page.getByTestId("onboarding")).not.toBeVisible({
      timeout: 3000,
    }).catch(() => {
      // If onboarding is visible, it means it wasn't persisted - fail
      throw new Error("Onboarding should not be visible after completion");
    });
    await expect(
      page.getByRole("heading", { name: "My Courses" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("skip button completes onboarding", async ({ page }) => {
    await setOnboarding(false);
    await page.goto("/creator");
    await expect(page.getByTestId("onboarding")).toBeVisible();

    await page.getByTestId("onboarding-skip").click();

    // Should show the dashboard
    await expect(
      page.getByRole("heading", { name: "My Courses" }),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Empty states ───────────────────────────────────────

  test("trash page shows empty state", async ({ page }) => {
    await cleanupCourses();
    await setOnboarding(true);
    await page.goto("/creator/trash");
    await expect(page.getByText("Trash is empty")).toBeVisible();
  });

  test("certificates page shows empty state", async ({ page }) => {
    await page.goto("/learner/certificates");
    await expect(page.getByText("No certificates yet")).toBeVisible();
  });

  test("goals page shows empty state when no courses", async ({ page }) => {
    await page.goto("/learner/goals");
    await expect(
      page.getByRole("heading", { name: "Learning Goals" }),
    ).toBeVisible();
  });

  test("stats page shows empty state when no activity", async ({ page }) => {
    await page.goto("/learner/stats");
    await expect(
      page.getByRole("heading", { name: "Learning Stats" }),
    ).toBeVisible();
  });
});
