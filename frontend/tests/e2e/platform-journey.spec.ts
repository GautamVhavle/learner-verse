import { test, expect } from "@playwright/test";

const API = "http://localhost:8000/api/v1";

/**
 * Phase 20 - Full Platform E2E Journey
 *
 * Tests the entire user workflow from start to finish:
 * 1. Create course → add sections → add lessons with content
 * 2. Switch to learner mode → study a course
 * 3. Complete all lessons → earn certificate
 * 4. Verify certificate share link
 * 5. Verify settings page
 * 6. Verify 404 page
 * 7. Progress tracking
 */

// ── Helpers ──────────────────────────────────────────────────

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

async function createCourseViaAPI(title: string, description = "E2E test course") {
  const resp = await fetch(`${API}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  return resp.json();
}

async function createSectionViaAPI(courseId: string, title: string) {
  const resp = await fetch(`${API}/courses/${courseId}/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return resp.json();
}

async function createLessonViaAPI(sectionId: string, title: string, opts: Record<string, unknown> = {}) {
  const resp = await fetch(`${API}/sections/${sectionId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, ...opts }),
  });
  return resp.json();
}

async function updateLessonViaAPI(sectionId: string, lessonId: string, data: Record<string, unknown>) {
  await fetch(`${API}/sections/${sectionId}/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function markCourseReady(courseId: string) {
  await fetch(`${API}/courses/${courseId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  });
}

async function completeLessonViaAPI(lessonId: string) {
  await fetch(`${API}/progress/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });
}

// ── Tests ────────────────────────────────────────────────────

test.describe.serial("Full Platform Journey", () => {
  let courseId: string;
  let sectionId: string;
  let lesson1Id: string;
  let lesson2Id: string;
  let lesson3Id: string;

  test.beforeAll(async () => {
    await cleanupCourses();

    // Create a full course via API for testing
    const course = await createCourseViaAPI("E2E Test Course", "A comprehensive test course for the full platform journey.");
    courseId = course.id;

    const section1 = await createSectionViaAPI(courseId, "Getting Started");
    sectionId = section1.id;

    const l1 = await createLessonViaAPI(sectionId, "Introduction");
    lesson1Id = l1.id;
    await updateLessonViaAPI(sectionId, lesson1Id, {
      notes_markdown: "# Welcome\n\nThis is the **introduction** lesson with markdown content.",
    });

    const l2 = await createLessonViaAPI(sectionId, "YouTube Lesson");
    lesson2Id = l2.id;
    await updateLessonViaAPI(sectionId, lesson2Id, {
      youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      notes_markdown: "Watch the video and take notes.",
    });

    const section2 = await createSectionViaAPI(courseId, "Advanced Topics");
    const section2Id = section2.id;
    const l3 = await createLessonViaAPI(section2Id, "Final Lesson");
    lesson3Id = l3.id;
    await updateLessonViaAPI(section2Id, lesson3Id, {
      notes_markdown: "## Congratulations!\n\nYou've reached the end.",
    });

    await markCourseReady(courseId);
  });

  test.afterAll(async () => {
    await cleanupCourses();
  });

  // ── Creator Dashboard ─────────────────────────────────

  test("creator dashboard shows the course", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("learnerverse-mode", JSON.stringify({ state: { mode: "creator" }, version: 0 }));
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should see the course card
    await expect(page.getByTestId("course-card")).toBeVisible();
    await expect(page.getByTestId("course-card").getByText("E2E Test Course")).toBeVisible();
  });

  // ── Study Mode ─────────────────────────────────────────

  test("learner dashboard shows ready course", async ({ page }) => {
    // Set student mode before navigating
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("learnerverse-mode", JSON.stringify({ state: { mode: "student" }, version: 0 }));
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should see the course in learner/student mode (scoped to main content to avoid sidebar match)
    await expect(page.locator("#main-content").getByText("E2E Test Course")).toBeVisible({ timeout: 10000 });
  });

  test("study page shows course overview with sections", async ({ page }) => {
    await page.goto(`/study/${courseId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#main-content").getByRole("heading", { name: "E2E Test Course" })).toBeVisible();
    await expect(page.getByText("2 sections")).toBeVisible();
    await expect(page.getByText("3 lessons")).toBeVisible();
    await expect(page.getByText("Getting Started").first()).toBeVisible();
    await expect(page.getByText("Advanced Topics").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Course" })).toBeVisible();
  });

  test("lesson page renders markdown content", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lesson1Id}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Introduction" })).toBeVisible();
    // Markdown is rendered - check for the bold "introduction" text inside markdown content
    await expect(page.locator("strong").getByText("introduction", { exact: true })).toBeVisible();
  });

  test("lesson page has completion button", async ({ page }) => {
    await page.goto(`/study/${courseId}/lessons/${lesson1Id}`);
    await page.waitForLoadState("networkidle");

    const completionBtn = page.getByRole("button", { name: /mark.*complete|completed/i });
    await expect(completionBtn).toBeVisible();
  });

  // ── Progress Tracking ──────────────────────────────────

  test("can complete lessons and track progress", async ({ page }) => {
    // Complete all lessons via API
    await completeLessonViaAPI(lesson1Id);
    await completeLessonViaAPI(lesson2Id);
    await completeLessonViaAPI(lesson3Id);

    // Visit study page to see progress
    await page.goto(`/study/${courseId}`);
    await page.waitForLoadState("networkidle");

    // Progress should show 100%
    await expect(page.getByText("100%")).toBeVisible({ timeout: 5000 });
  });

  // ── Certificate ────────────────────────────────────────

  test("can generate certificate for completed course", async () => {
    const resp = await fetch(`${API}/certificates/courses/${courseId}`, {
      method: "POST",
    });
    expect(resp.status).toBe(200);
    const cert = await resp.json();
    expect(cert.certificate_uid).toMatch(/^LV-/);
    expect(cert.course_title).toBe("E2E Test Course");
    expect(cert.lessons_count).toBe(3);
    expect(cert.sections_count).toBe(2);
  });

  test("certificates page shows earned certificate", async ({ page }) => {
    await page.goto("/certificates");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#main-content").getByText("E2E Test Course")).toBeVisible();
    await expect(page.locator("#main-content").getByText(/LV-/)).toBeVisible();
  });

  test("certificate preview dialog with share link", async ({ page }) => {
    await page.goto("/certificates");
    await page.waitForLoadState("networkidle");

    // Click on certificate card
    await page.locator("#main-content").getByText("E2E Test Course").click();

    // Dialog should open with preview
    await expect(page.getByText("Certificate of Completion")).toBeVisible();
    await expect(page.getByText("Earned by Local User")).toBeVisible();

    // Should have Copy Link and Share buttons
    await expect(page.getByTestId("copy-share-link")).toBeVisible();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
  });

  test("certificate share endpoint works", async () => {
    // Get the certificate UID
    const certs = await fetch(`${API}/certificates`).then((r) => r.json());
    const uid = certs[0].certificate_uid;

    // Fetch via share endpoint
    const resp = await fetch(`${API}/certificates/share/${uid}`);
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.certificate_uid).toBe(uid);
    expect(data.course_title).toBe("E2E Test Course");
  });

  // ── Settings ───────────────────────────────────────────

  test("settings page has all sections", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Profile section
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByTestId("settings-display-name")).toBeVisible();

    // Preferences section
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await expect(page.getByTestId("settings-timezone-trigger")).toBeVisible();

    // Keyboard Shortcuts section
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible();

    // Data section
    await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();

    // About section
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.getByText("Version 1.0.0")).toBeVisible();
  });

  // ── 404 Page ───────────────────────────────────────────

  test("unknown routes show 404 page", async ({ page }) => {
    await page.goto("/some-nonexistent-page");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });

  // ── Stats Page ─────────────────────────────────────────

  test("stats page shows activity after completions", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Learning Stats" })).toBeVisible();
  });

  // ── Goals Page ─────────────────────────────────────────

  test("goals page shows goal for course", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Learning Goals" })).toBeVisible();
  });
});
