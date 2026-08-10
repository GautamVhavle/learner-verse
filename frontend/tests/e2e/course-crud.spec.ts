import { test, expect } from "@playwright/test";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Delete all courses (active + trashed) to ensure test isolation. */
async function cleanupCourses() {
  // Delete active courses
  const active = await fetch(`${API}/courses`).then((r) => r.json());
  for (const c of active.items) {
    await fetch(`${API}/courses/${c.id}`, { method: "DELETE" });
    await fetch(`${API}/courses/${c.id}/permanent`, { method: "DELETE" });
  }
  // Delete trashed courses
  const trash = await fetch(`${API}/courses/trash`).then((r) => r.json());
  for (const c of trash.items) {
    await fetch(`${API}/courses/${c.id}/permanent`, { method: "DELETE" });
  }
}

test.describe.serial("Course CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupCourses();
    await page.goto("/creator");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("shows empty state with create button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "No courses yet" })).toBeVisible();
    await expect(page.getByText("Create Course")).toBeVisible();
  });

  test("can create a new course", async ({ page }) => {
    // Click create from empty state
    await page.getByText("Create Course").click();

    // Fill the form
    await page.getByPlaceholder("e.g. Intro to Machine Learning").fill("Test Course");
    await page.getByPlaceholder("What's this course about?").fill("A test course description");
    await page.getByPlaceholder("e.g. python, machine learning").fill("testing, e2e");

    // Submit via the dialog button
    await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Create Course" }).click();

    // Wait for the mutation to finish so text still present in the form cannot
    // produce a false positive when course creation fails.
    await expect(page.locator("[data-slot='dialog-content']")).toBeHidden();
    await expect(
      page.getByTestId("course-card").getByRole("heading", { name: "Test Course" }),
    ).toBeVisible();
    // Tags should be visible
    await expect(page.getByText("testing")).toBeVisible();
  });

  test("can edit a course", async ({ page }) => {
    // Create a course first
    await page.getByText("Create Course").click();
    await page.getByPlaceholder("e.g. Intro to Machine Learning").fill("Original Title");
    await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByTestId("course-card").getByText("Original Title")).toBeVisible();

    // Open the action menu via the three-dots button
    const card = page.getByTestId("course-card").first();
    await card.hover();
    await card.getByRole("button").first().click();

    // Click Edit
    await page.getByText("Edit").click();

    // Update the title
    const titleInput = page.getByPlaceholder("e.g. Intro to Machine Learning");
    await titleInput.clear();
    await titleInput.fill("Updated Title");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify update
    await expect(page.getByTestId("course-card").getByText("Updated Title")).toBeVisible();
  });

  test("can delete a course and see it in trash", async ({ page }) => {
    // Create a course
    await page.getByText("Create Course").click();
    await page.getByPlaceholder("e.g. Intro to Machine Learning").fill("To Be Deleted");
    await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByTestId("course-card").getByText("To Be Deleted")).toBeVisible();

    // Wait for dialog to fully close
    await expect(page.locator("[data-slot='dialog-overlay']")).toBeHidden();

    // Delete it via action menu
    const card = page.getByTestId("course-card").first();
    await card.hover();
    await card.getByRole("button").first().click();
    await page.locator("[data-slot='dropdown-menu-item']").filter({ hasText: "Delete" }).click({ force: true });

    // Course should be gone from dashboard
    await expect(page.getByRole("heading", { name: "No courses yet" })).toBeVisible();

    // Navigate to trash
    await page.getByRole("button", { name: "Trash" }).click();

    // Should be visible in trash
    await expect(page.locator("main").getByText("To Be Deleted")).toBeVisible();
    await expect(page.getByRole("button", { name: /Restore/ })).toBeVisible();
  });

  test("can restore a course from trash", async ({ page }) => {
    // Create and delete a course
    await page.getByText("Create Course").click();
    await page.getByPlaceholder("e.g. Intro to Machine Learning").fill("Restore Me");
    await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByTestId("course-card").getByText("Restore Me")).toBeVisible();

    // Wait for dialog to fully close
    await expect(page.locator("[data-slot='dialog-overlay']")).toBeHidden();

    const card = page.getByTestId("course-card").first();
    await card.hover();
    await card.getByRole("button").first().click();
    await page.locator("[data-slot='dropdown-menu-item']").filter({ hasText: "Delete" }).click({ force: true });

    // Go to trash and restore
    await page.getByRole("button", { name: "Trash" }).click();
    await expect(page.locator("main").getByText("Restore Me")).toBeVisible();
    await page.getByRole("button", { name: /Restore/ }).click();

    // Go back to dashboard
    await page.getByRole("button", { name: "Dashboard" }).click();

    // Course should be back
    await expect(page.getByTestId("course-card").getByText("Restore Me")).toBeVisible();
  });

  test("can duplicate a course with confirm dialog", async ({ page }) => {
    // Create a course
    await page.getByText("Create Course").click();
    await page.getByPlaceholder("e.g. Intro to Machine Learning").fill("Original Course");
    await page.locator("[data-slot='dialog-content']").getByRole("button", { name: "Create Course" }).click();
    await expect(page.getByTestId("course-card").getByText("Original Course")).toBeVisible();

    // Wait for dialog to fully close
    await expect(page.locator("[data-slot='dialog-overlay']")).toBeHidden();

    // Open action menu
    const card = page.getByTestId("course-card").first();
    await card.hover();
    await card.getByRole("button").first().click();

    // Click Duplicate in dropdown
    await page.locator("[data-slot='dropdown-menu-item']").filter({ hasText: "Duplicate" }).click();

    // Confirm dialog should appear
    await expect(page.getByText("Duplicate Course")).toBeVisible();
    await expect(page.getByText(/full copy/)).toBeVisible();

    // Confirm the duplication
    await page.locator("[data-slot='alert-dialog-content']").getByRole("button", { name: "Duplicate" }).click();

    // Should navigate to the new course builder
    await page.waitForURL(/\/courses\/.*\/edit/);
    await expect(page.locator("main").getByText("Original Course (Copy)")).toBeVisible();
  });
});
