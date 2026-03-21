import { test, expect } from "@playwright/test";

const API = "http://localhost:8000/api/v1";

/** Create a course with a section and two lessons, return IDs. */
async function seedCourse() {
  // Create course
  const course = await fetch(`${API}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Focus Test Course", description: "E2E" }),
  }).then((r) => r.json());

  // Create section
  const section = await fetch(`${API}/courses/${course.id}/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Section 1" }),
  }).then((r) => r.json());

  // Create two lessons
  const lesson1 = await fetch(
    `${API}/sections/${section.id}/lessons`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Lesson One" }),
    },
  ).then((r) => r.json());

  const lesson2 = await fetch(
    `${API}/sections/${section.id}/lessons`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Lesson Two" }),
    },
  ).then((r) => r.json());

  return { courseId: course.id, lessonIds: [lesson1.id, lesson2.id] };
}

/** Delete all courses (active + trashed). */
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

test.describe.serial("Focus Mode & Keyboard Shortcuts", () => {
  let courseId: string;
  let lessonIds: string[];

  test.beforeAll(async () => {
    await cleanupCourses();
    const data = await seedCourse();
    courseId = data.courseId;
    lessonIds = data.lessonIds;
  });

  test.afterAll(async () => {
    await cleanupCourses();
  });

  test("F key toggles focus mode on lesson page", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    // Wait for lesson content to load
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();

    // Breadcrumb visible initially (hidden in focus mode)
    const breadcrumb = page.getByText("← Course Overview");
    await expect(breadcrumb).toBeVisible();

    // Click on the page to ensure keyboard events reach document
    await page.getByRole("heading", { name: "Lesson One" }).click();

    // Press F to enter focus mode
    await page.keyboard.press("f");

    // Breadcrumb should be hidden
    await expect(breadcrumb).toBeHidden();

    // FocusOverlay should be visible
    const exitBtn = page.getByTitle("Exit focus mode (F / Esc)");
    await expect(exitBtn).toBeVisible();

    // Press F again to exit
    await page.keyboard.press("f");

    // Breadcrumb should reappear
    await expect(breadcrumb).toBeVisible();

    // Overlay should be gone
    await expect(exitBtn).toBeHidden();
  });

  test("Escape exits focus mode", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
    await page.getByRole("heading", { name: "Lesson One" }).click();

    // Enter focus mode
    await page.keyboard.press("f");
    await expect(page.getByTitle("Exit focus mode (F / Esc)")).toBeVisible();

    // Press Escape to exit
    await page.keyboard.press("Escape");
    await expect(page.getByText("← Course Overview")).toBeVisible();
  });

  test("focus mode button click works", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();

    // Click the focus mode toggle button (Maximize2 icon)
    const focusBtn = page.getByTitle("Focus mode (F)");
    await expect(focusBtn).toBeVisible();
    await focusBtn.click();

    // Should be in focus mode
    await expect(page.getByTitle("Exit focus mode (F / Esc)")).toBeVisible();
    await expect(page.getByText("← Course Overview")).toBeHidden();

    // Click exit in overlay
    await page.getByTitle("Exit focus mode (F / Esc)").click();
    await expect(page.getByText("← Course Overview")).toBeVisible();
  });

  test("N and P keyboard shortcuts navigate between lessons", async ({
    page,
  }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
    await page.getByRole("heading", { name: "Lesson One" }).click();

    // Press N to go to next lesson
    await page.keyboard.press("n");
    await expect(page.getByRole("heading", { name: "Lesson Two" })).toBeVisible();

    // Press P to go back
    await page.getByRole("heading", { name: "Lesson Two" }).click();
    await page.keyboard.press("p");
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
  });

  test("arrow keys navigate between lessons", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
    await page.getByRole("heading", { name: "Lesson One" }).click();

    // Press → to go to next
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "Lesson Two" })).toBeVisible();

    // Press ← to go back
    await page.getByRole("heading", { name: "Lesson Two" }).click();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
  });

  test("FocusOverlay nav buttons work", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();
    await page.getByRole("heading", { name: "Lesson One" }).click();

    // Enter focus mode
    await page.keyboard.press("f");
    await expect(page.getByTitle("Exit focus mode (F / Esc)")).toBeVisible();

    // Previous should be disabled on first lesson
    const prevBtn = page.getByTitle("Previous lesson (P / ←)");
    await expect(prevBtn).toBeDisabled();

    // Next should work
    const nextBtn = page.getByTitle("Next lesson (N / →)");
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Should navigate and stay in focus mode
    await expect(page.getByRole("heading", { name: "Lesson Two" })).toBeVisible();
    await expect(page.getByTitle("Exit focus mode (F / Esc)")).toBeVisible();
  });

  test("? shortcut opens keyboard shortcuts modal", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "My Courses" })).toBeVisible();
    await page.getByRole("heading", { name: "My Courses" }).click();

    // Press ? (Shift+/)
    await page.keyboard.press("Shift+?");

    // Shortcuts dialog should appear
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible();
    await expect(page.getByText("Global")).toBeVisible();
    await expect(page.getByText("Study View")).toBeVisible();
    await expect(page.getByText("Course Builder")).toBeVisible();
  });

  test("keyboard shortcuts don't fire when typing in input", async ({
    page,
  }) => {
    await page.goto(`/study/${courseId}/lessons/${lessonIds[0]}`);
    await expect(page.getByRole("heading", { name: "Lesson One" })).toBeVisible();

    // Click on the study notes textarea to focus it
    const notesArea = page.locator("textarea").first();
    if (await notesArea.isVisible()) {
      await notesArea.focus();
      await page.keyboard.type("fnp");

      // Should still be on the same page (shortcuts didn't fire)
      await expect(page).toHaveURL(new RegExp(lessonIds[0]));
      // Breadcrumb should still be visible (focus mode didn't toggle)
      await expect(page.getByText("← Course Overview")).toBeVisible();
    }
  });

  test("Ctrl+K opens search palette", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "My Courses" })).toBeVisible();
    await page.getByRole("heading", { name: "My Courses" }).click();

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
  });
});
