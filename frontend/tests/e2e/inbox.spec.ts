import { test, expect } from "@playwright/test";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000/api/v1";
const JSON_HEADERS = { "Content-Type": "application/json" };

/** Ensure the user has completed onboarding. */
async function ensureOnboarded() {
  await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ onboarding_complete: true }),
  });
}

/** Delete all notifications for the current user. */
async function clearNotifications() {
  const res = await fetch(`${API}/notifications`);
  const items = await res.json();
  if (Array.isArray(items) && items.length > 0) {
    await Promise.all(
      items.map((n) =>
        fetch(`${API}/notifications/${n.id}`, { method: "DELETE" }),
      ),
    );
  }
}

/** Remove goal dates from all courses to prevent stale notifications. */
async function clearAllGoals() {
  const res = await fetch(`${API}/courses`);
  const data = await res.json();
  const courses = (Array.isArray(data) ? data : data.items ?? []).filter(
    (c: { goal_date: string | null }) => c.goal_date,
  );
  if (courses.length > 0) {
    await Promise.all(
      courses.map((c: { id: string }) =>
        fetch(`${API}/goals/courses/${c.id}`, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify({ goal_date: null }),
        }),
      ),
    );
  }
}

/** Local tomorrow date string matching Python's date.today() timezone. */
function localTomorrow(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Create a published course with content, enroll, and set a tight goal.
 * Parallelizes independent API calls for speed.
 */
async function createCourseWithGoal(title: string): Promise<string> {
  // 1. Create course
  const course = await fetch(`${API}/courses`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, description: "Test" }),
  }).then((r) => r.json());

  // 2. Create section (depends on course)
  const section = await fetch(`${API}/courses/${course.id}/sections`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title: "Section 1" }),
  }).then((r) => r.json());

  // 3. Create lesson (depends on section)
  const lesson = await fetch(`${API}/sections/${section.id}/lessons`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title: "Lesson 1" }),
  }).then((r) => r.json());

  // 4. Add content + publish in parallel (both depend on lesson existing, independent of each other)
  await Promise.all([
    fetch(`${API}/sections/${section.id}/lessons/${lesson.id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ notes_markdown: "Some notes" }),
    }),
    // Publish after content - but status validation checks lesson content, so chain it
  ]);

  await fetch(`${API}/courses/${course.id}/status`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ status: "ready" }),
  });

  // 5. Enroll (depends on published status)
  await fetch(`${API}/enrollments/${course.id}`, { method: "POST" });

  // 6. Set goal (depends on enrollment for pace calculation)
  await fetch(`${API}/goals/courses/${course.id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ goal_date: localTomorrow() }),
  });

  return course.id;
}

// ─── Fast tests (no course setup needed) ─────────────────────────

test.describe("Inbox - navigation", () => {
  test.beforeEach(async () => {
    await ensureOnboarded();
  });

  test("inbox page renders empty state", async ({ page }) => {
    // Clear just notifications for a clean empty state (lightweight)
    await clearNotifications();
    await page.goto("/learner/inbox");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(page.getByText("No notifications")).toBeVisible();
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  test("inbox is accessible from sidebar in learner mode", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "student" }, version: 0 }),
      );
    });
    await page.goto("/learner/dashboard");
    await expect(
      page.getByRole("heading", { name: "My Learning" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Inbox", exact: true }).click();
    await expect(page).toHaveURL(/\/learner\/inbox/);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  });
});

// ─── Notification tests (need course + goal setup) ───────────────

test.describe.serial("Inbox - notifications", () => {
  let courseId: string;

  test.beforeAll(async () => {
    await ensureOnboarded();
    await clearAllGoals();
    await clearNotifications();
    courseId = await createCourseWithGoal("Pace Warning Test Course");
    await fetch(`${API}/notifications/evaluate`, { method: "POST" });
  });

  test.afterAll(async () => {
    await Promise.all([
      fetch(`${API}/courses/${courseId}`, { method: "DELETE" }),
      clearAllGoals(),
      clearNotifications(),
    ]);
  });

  test("evaluate creates notifications for behind-pace goals", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "student" }, version: 0 }),
      );
    });
    await page.goto("/learner/inbox");
    await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

    const card = page.getByTestId("notification-card").first();
    await expect(card).toBeVisible({ timeout: 10_000 });
  });

  test("can mark notification as read and delete it", async ({ page }) => {
    // Clean slate: clear all goals except ours, clear notifications, re-evaluate
    await clearAllGoals();
    await clearNotifications();
    // Re-set goal for our test course
    await fetch(`${API}/goals/courses/${courseId}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ goal_date: localTomorrow() }),
    });
    await fetch(`${API}/notifications/evaluate`, { method: "POST" });

    await page.addInitScript(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "student" }, version: 0 }),
      );
    });
    await page.goto("/learner/inbox");
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true }),
    ).toBeVisible();

    const card = page.getByTestId("notification-card").first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Mark read - wait for the API to respond
    await card.hover();
    const [markReadResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/notifications/") && r.url().includes("/read") && r.request().method() === "PUT",
      ),
      card.getByRole("button", { name: "Mark read" }).click(),
    ]);
    expect(markReadResponse.ok()).toBeTruthy();

    // Delete - wait for the API to respond
    await card.hover();
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/notifications/") && r.request().method() === "DELETE",
      ),
      card.getByRole("button", { name: "Delete" }).click(),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();
  });
});
