import { test, expect } from "@playwright/test";

const API = "http://localhost:8000/api/v1";

/**
 * Quiz Feature E2E - tests all three lesson types (video, reading, quiz)
 * including creator quiz management and learner quiz-taking.
 *
 * Flow:
 * 1. Create course via API with video, reading, and quiz lessons
 * 2. Add quiz questions via API
 * 3. Mark course ready
 * 4. Creator: verify builder shows all types, preview shows quiz
 * 5. Learner: study all lessons, take quiz, verify score
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

async function createCourseViaAPI(title: string, description: string) {
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

async function createLessonViaAPI(
  sectionId: string,
  title: string,
  opts: Record<string, unknown> = {},
) {
  const resp = await fetch(`${API}/sections/${sectionId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, ...opts }),
  });
  return resp.json();
}

async function updateLessonViaAPI(
  sectionId: string,
  lessonId: string,
  data: Record<string, unknown>,
) {
  await fetch(`${API}/sections/${sectionId}/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function addQuizQuestionViaAPI(
  lessonId: string,
  question: string,
  options: string[],
  correctOption: number,
) {
  const resp = await fetch(`${API}/quiz/lessons/${lessonId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, options, correct_option: correctOption }),
  });
  return resp.json();
}

async function markCourseReady(courseId: string) {
  const resp = await fetch(`${API}/courses/${courseId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  });
  return resp.json();
}

async function completeLessonViaAPI(lessonId: string) {
  await fetch(`${API}/progress/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });
}

async function submitQuizViaAPI(
  lessonId: string,
  answers: Record<string, number>,
) {
  const resp = await fetch(`${API}/quiz/lessons/${lessonId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return resp.json();
}

async function completeOnboarding() {
  await fetch(`${API}/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding_complete: true }),
  });
}

// ── Tests ────────────────────────────────────────────────────

test.describe.serial("Quiz Feature - All Lesson Types", () => {
  let courseId: string;
  let sectionId: string;
  let videoLessonId: string;
  let readingLessonId: string;
  let quizLessonId: string;
  let q1Id: string;
  let q2Id: string;
  let q3Id: string;

  test.beforeAll(async () => {
    await cleanupCourses();
    await completeOnboarding();

    // Create course
    const course = await createCourseViaAPI(
      "Quiz E2E Course",
      "A test course with video, reading, and quiz lessons.",
    );
    courseId = course.id;

    // Create section
    const section = await createSectionViaAPI(courseId, "Fundamentals");
    sectionId = section.id;

    // Video lesson
    const vl = await createLessonViaAPI(sectionId, "Video Introduction", {
      lesson_type: "video",
    });
    videoLessonId = vl.id;
    await updateLessonViaAPI(sectionId, videoLessonId, {
      youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtube_title: "Sample Video",
      youtube_duration: "3:32",
      youtube_channel: "Test Channel",
      notes_markdown: "# Video Notes\n\nWatch and learn.",
    });

    // Reading lesson
    const rl = await createLessonViaAPI(sectionId, "Reading Material", {
      lesson_type: "note",
    });
    readingLessonId = rl.id;
    await updateLessonViaAPI(sectionId, readingLessonId, {
      notes_markdown:
        "# Chapter 1\n\nThis is a **reading lesson** with detailed markdown content.\n\n## Key Points\n\n- Point A\n- Point B\n- Point C",
    });

    // Quiz lesson
    const ql = await createLessonViaAPI(sectionId, "Knowledge Check", {
      lesson_type: "quiz",
    });
    quizLessonId = ql.id;

    // Add quiz questions
    const q1 = await addQuizQuestionViaAPI(
      quizLessonId,
      "What is 2 + 2?",
      ["3", "4", "5", "6"],
      1,
    );
    q1Id = q1.id;

    const q2 = await addQuizQuestionViaAPI(
      quizLessonId,
      "Which planet is closest to the Sun?",
      ["Earth", "Venus", "Mercury", "Mars"],
      2,
    );
    q2Id = q2.id;

    const q3 = await addQuizQuestionViaAPI(
      quizLessonId,
      "What color is the sky on a clear day?",
      ["Green", "Red", "Blue", "Yellow"],
      2,
    );
    q3Id = q3.id;

    // Mark course ready
    await markCourseReady(courseId);
  });

  test.afterAll(async () => {
    await cleanupCourses();
  });

  // ── Backend API Tests ──────────────────────────────────

  test("quiz questions are created via API", async () => {
    const resp = await fetch(
      `${API}/quiz/lessons/${quizLessonId}/questions`,
    );
    expect(resp.status).toBe(200);
    const questions = await resp.json();
    expect(questions).toHaveLength(3);
    expect(questions[0].question).toBe("What is 2 + 2?");
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].correct_option).toBe(1);
  });

  test("learner questions endpoint hides correct answers", async () => {
    const resp = await fetch(
      `${API}/quiz/lessons/${quizLessonId}/questions/learner`,
    );
    expect(resp.status).toBe(200);
    const questions = await resp.json();
    expect(questions).toHaveLength(3);
    // Should NOT include correct_option
    expect(questions[0]).not.toHaveProperty("correct_option");
    expect(questions[0]).toHaveProperty("question");
    expect(questions[0]).toHaveProperty("options");
  });

  test("can submit quiz and get graded results", async () => {
    // Submit with all correct answers
    const result = await submitQuizViaAPI(quizLessonId, {
      [q1Id]: 1, // correct
      [q2Id]: 2, // correct
      [q3Id]: 2, // correct
    });
    expect(result.score).toBe(3);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].is_correct).toBe(true);
  });

  test("quiz with wrong answers scores correctly", async () => {
    const result = await submitQuizViaAPI(quizLessonId, {
      [q1Id]: 0, // wrong (3 instead of 4)
      [q2Id]: 2, // correct
      [q3Id]: 3, // wrong (Yellow instead of Blue)
    });
    expect(result.score).toBe(1);
    expect(result.total).toBe(3);
    expect(result.percentage).toBeCloseTo(33.3, 0);
    expect(result.passed).toBe(false);
  });

  test("best score endpoint returns highest attempt", async () => {
    const resp = await fetch(
      `${API}/quiz/lessons/${quizLessonId}/best`,
    );
    expect(resp.status).toBe(200);
    const best = await resp.json();
    expect(best.best_score).toBe(3);
    expect(best.best_percentage).toBe(100);
    expect(best.passed).toBe(true);
    expect(best.attempts_count).toBe(2); // two submits above
  });

  test("course with quiz validates to ready", async () => {
    // Validation runs inside the status update endpoint
    const resp = await fetch(`${API}/courses/${courseId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe("ready");
    expect(data.errors).toHaveLength(0);
  });

  // ── Creator Mode UI ────────────────────────────────────

  test("course builder shows all lesson types with correct badges", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "creator" }, version: 0 }),
      );
    });
    await page.goto(`/creator/courses/${courseId}/edit`);
    await page.waitForLoadState("networkidle");

    // All three lessons visible
    await expect(page.getByText("Video Introduction")).toBeVisible();
    await expect(page.getByText("Reading Material")).toBeVisible();
    await expect(page.getByText("Knowledge Check")).toBeVisible();

    // Quiz badge shows question count
    await expect(page.getByText(/Quiz · 3 Q/)).toBeVisible();

    // Reading lesson badge
    await expect(page.getByText("Reading Lesson")).toBeVisible();
  });

  test("creator can open quiz lesson and see quiz editor", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "creator" }, version: 0 }),
      );
    });
    await page.goto(`/creator/courses/${courseId}/edit`);
    await page.waitForLoadState("networkidle");

    // Click quiz lesson
    await page.getByText("Knowledge Check").click();
    await page.waitForLoadState("networkidle");

    // Should see quiz type toggle selected
    await expect(
      page.getByRole("radio", { name: "Quiz" }),
    ).toHaveAttribute("aria-checked", "true");

    // Should see quiz questions
    await expect(page.getByText("Quiz Questions (3)")).toBeVisible();
    await expect(page.getByText("What is 2 + 2?")).toBeVisible();
    await expect(
      page.getByText("Which planet is closest to the Sun?"),
    ).toBeVisible();
  });

  test("course preview shows quiz questions", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "creator" }, version: 0 }),
      );
    });
    await page.goto(`/creator/courses/${courseId}/preview`);
    await page.waitForLoadState("networkidle");

    // Expand section and click quiz lesson
    await page.getByText("Fundamentals").click();
    await page.getByText("Knowledge Check").click();

    // Should see quiz questions in preview with correct answers marked
    await expect(page.getByText("What is 2 + 2?")).toBeVisible();
    await expect(page.getByText("Quiz - 3 questions")).toBeVisible();
  });

  // ── Learner Mode UI ────────────────────────────────────

  test("learner study page shows all lesson types", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "learnerverse-mode",
        JSON.stringify({ state: { mode: "student" }, version: 0 }),
      );
    });
    await page.goto(`/learner/study/${courseId}`);
    await page.waitForLoadState("networkidle");

    // Overview visible
    await expect(
      page
        .locator("#main-content")
        .getByRole("heading", { name: "Quiz E2E Course" }),
    ).toBeVisible();
    await expect(page.getByText("1 section")).toBeVisible();
    await expect(page.getByText("3 lessons")).toBeVisible();
  });

  test("learner can view video lesson", async ({ page }) => {
    await page.goto(`/learner/study/${courseId}/lessons/${videoLessonId}`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Video Introduction" }),
    ).toBeVisible();
    // Markdown notes visible
    await expect(page.getByText("Watch and learn.")).toBeVisible();
  });

  test("learner can view reading lesson", async ({ page }) => {
    await page.goto(`/learner/study/${courseId}/lessons/${readingLessonId}`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Reading Material" }),
    ).toBeVisible();
    await expect(
      page.locator("strong").getByText("reading lesson"),
    ).toBeVisible();
  });

  test("learner sees quiz intro screen", async ({ page }) => {
    await page.goto(`/learner/study/${courseId}/lessons/${quizLessonId}`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Knowledge Check" }),
    ).toBeVisible();
    // Quiz intro
    await expect(page.getByText("Ready to take the quiz?")).toBeVisible();
    await expect(page.getByText("3 questions")).toBeVisible();
    await expect(page.getByText(/Score 60%/)).toBeVisible();
  });

  test("learner can take quiz and submit", async ({ page }) => {
    await page.goto(`/learner/study/${courseId}/lessons/${quizLessonId}`);
    await page.waitForLoadState("networkidle");

    // Wait for quiz intro to load
    await expect(
      page.getByRole("heading", { name: "Knowledge Check" }),
    ).toBeVisible({ timeout: 10000 });

    // Start quiz
    const startBtn = page.getByRole("button", { name: /Retake Quiz|Start Quiz/ });
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Q1: "What is 2 + 2?" - select "4" (option B, index 1)
    await expect(page.getByText("Question 1 of 3")).toBeVisible({ timeout: 10000 });
    await page.getByText("4").click();
    await page.getByRole("button", { name: "Next" }).click();

    // Q2: "Which planet is closest to the Sun?" - select "Mercury" (option C, index 2)
    await expect(page.getByText("Question 2 of 3")).toBeVisible();
    await page.getByText("Mercury").click();
    await page.getByRole("button", { name: "Next" }).click();

    // Q3: "What color is the sky?" - select "Blue" (option C, index 2)
    await expect(page.getByText("Question 3 of 3")).toBeVisible();
    await page.getByText("Blue").click();

    // Submit
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    // Results
    await expect(page.getByText("Great job!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("3/3")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("quiz results show answer review", async ({ page }) => {
    await page.goto(`/learner/study/${courseId}/lessons/${quizLessonId}`);
    await page.waitForLoadState("networkidle");

    // Wait for quiz page to load
    await expect(
      page.getByRole("heading", { name: "Knowledge Check" }),
    ).toBeVisible({ timeout: 10000 });

    // Start and complete quiz quickly
    await page.getByRole("button", { name: /Retake Quiz|Start Quiz/ }).click();
    await expect(page.getByText("Question 1 of 3")).toBeVisible({ timeout: 10000 });

    // Answer all correctly
    await page.getByText("4").click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByText("Mercury").click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByText("Blue").click();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    // Wait for results
    await expect(page.getByText("Great job!")).toBeVisible({ timeout: 10000 });

    // Answer review section
    await expect(page.getByText("Answer Review")).toBeVisible();
    await expect(page.getByText("Q1.")).toBeVisible();
    await expect(page.getByText("Q2.")).toBeVisible();
    await expect(page.getByText("Q3.")).toBeVisible();
  });

  // ── Progress Integration ───────────────────────────────

  test("completing all lessons including quiz shows 100%", async ({
    page,
  }) => {
    // Complete non-quiz lessons via API
    await completeLessonViaAPI(videoLessonId);
    await completeLessonViaAPI(readingLessonId);
    await completeLessonViaAPI(quizLessonId);

    await page.goto(`/learner/study/${courseId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("100%")).toBeVisible({ timeout: 5000 });
  });
});
