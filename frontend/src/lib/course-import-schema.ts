import { z } from "zod";

// ── Reference Link ──────────────────────────────────────────────
export const referenceLinkSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https?:\/\//, "Only http/https URLs allowed"),
  title: z.string().max(300).optional(),
  description: z.string().max(1000).optional(),
  image: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  domain: z.string().max(100).optional(),
  position: z.number().int().min(0).optional(),
});

// ── Quiz Question ───────────────────────────────────────────────
export const quizQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required").max(1000),
  options: z
    .array(z.string().min(1, "Option text cannot be empty"))
    .length(4, "Must have exactly 4 options"),
  correct_option: z
    .number()
    .int()
    .min(0)
    .max(3, "correct_option must be 0-3 (index of the correct answer)"),
  position: z.number().int().min(0).optional(),
});

// ── Lesson ──────────────────────────────────────────────────────
export const lessonSchema = z
  .object({
    title: z.string().min(1, "Lesson title is required").max(200),
    lesson_type: z.enum(["video", "note", "quiz"]).default("video"),
    position: z.number().int().min(0).optional(),

    // Video fields (used when lesson_type is "video")
    youtube_url: z
      .string()
      .url()
      .regex(/^https?:\/\//, "Only http/https URLs allowed")
      .optional()
      .nullable(),
    youtube_title: z.string().max(300).optional().nullable(),
    youtube_thumbnail: z.string().url().optional().nullable(),
    youtube_duration: z.string().max(20).optional().nullable(),
    youtube_channel: z.string().max(200).optional().nullable(),

    // Note field (used when lesson_type is "note")
    notes_markdown: z.string().optional().nullable(),

    // Nested arrays
    reference_links: z.array(referenceLinkSchema).optional().default([]),
    quiz_questions: z.array(quizQuestionSchema).optional().default([]),
  })
  .superRefine((lesson, ctx) => {
    if (
      lesson.lesson_type === "quiz" &&
      (!lesson.quiz_questions || lesson.quiz_questions.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz lessons must have at least one quiz question",
        path: ["quiz_questions"],
      });
    }
  });

// ── Section ─────────────────────────────────────────────────────
export const sectionSchema = z.object({
  title: z.string().min(1, "Section title is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  position: z.number().int().min(0).optional(),
  lessons: z.array(lessonSchema).default([]),
});

// ── Course metadata ─────────────────────────────────────────────
export const courseMetaSchema = z.object({
  title: z.string().min(1, "Course title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  goal_date: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

// ── Top-level import payload ────────────────────────────────────
export const courseImportSchema = z
  .object({
    format: z.literal("learnerverse-course-export"),
    version: z.literal(1),
    course: courseMetaSchema,
    sections: z.array(sectionSchema).max(50, "Maximum 50 sections allowed"),
  })
  .refine(
    (data) => {
      const totalLessons = data.sections.reduce((sum, s) => sum + s.lessons.length, 0);
      return totalLessons <= 500;
    },
    { message: "Total lessons across all sections must not exceed 500", path: ["sections"] },
  );

export type CourseImportPayload = z.infer<typeof courseImportSchema>;

// ── Human-readable error formatting ────────────────────────────
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(" → ") : "root";
    return `${path}: ${issue.message}`;
  });
}

// ── JSON Schema documentation (for AI prompt / info dialog) ────
export const COURSE_JSON_SCHEMA_DOC = `{
  "format": "learnerverse-course-export",   // required, exact string
  "version": 1,                              // required, must be 1
  "course": {
    "title": "My Course Title",              // required, max 200 chars
    "description": "Course description",     // optional, max 5000 chars
    "category": "Programming",               // optional, max 100 chars
    "goal_date": "2025-12-31",               // optional, ISO date string
    "tags": ["python", "beginner"]           // optional, max 10 tags, each max 50 chars
  },
  "sections": [                              // required array, max 50 sections
    {
      "title": "Section Title",              // required, max 200 chars
      "description": "Section description",  // optional
      "position": 0,                         // optional, auto-assigned if omitted
      "lessons": [                           // array of lessons
        {
          "title": "Lesson Title",           // required, max 200 chars
          "lesson_type": "video",            // "video" | "note" | "quiz"
          "position": 0,                     // optional

          // ── Video lesson fields ──
          "youtube_url": "https://youtube.com/watch?v=...",
          "youtube_title": "Video Title",
          "youtube_thumbnail": "https://i.ytimg.com/...",
          "youtube_duration": "10:30",
          "youtube_channel": "Channel Name",

          // ── Note lesson fields ──
          "notes_markdown": "# Heading\\nMarkdown content...",

          // ── Reference links (any lesson type) ──
          "reference_links": [
            {
              "url": "https://example.com",  // required, must be http/https
              "title": "Resource Title",      // optional
              "description": "Brief desc",    // optional
              "position": 0                   // optional
            }
          ],

          // ── Quiz questions (required for quiz lessons) ──
          "quiz_questions": [
            {
              "question": "What is 2+2?",     // required
              "options": ["3", "4", "5", "6"],// exactly 4 options
              "correct_option": 1,            // 0-3 index of correct answer
              "position": 0                   // optional
            }
          ]
        }
      ]
    }
  ]
}`;

export const AI_PROMPT_TEMPLATE = `Generate a LearnerVerse course import JSON file for a course about: [YOUR TOPIC]

Rules:
- The JSON must follow this exact schema
- "format" must be "learnerverse-course-export" 
- "version" must be 1
- Each section needs a "title" (max 200 chars)
- Each lesson needs a "title" and a "lesson_type" ("video", "note", or "quiz")
- For video lessons: include youtube_url, youtube_title, youtube_duration, youtube_channel
- For note lessons: include notes_markdown with rich Markdown content
- For quiz lessons: include quiz_questions array, each with question text, exactly 4 options, and correct_option (0-3 index)
- Reference links are optional for any lesson type
- Maximum 50 sections, 500 total lessons, 10 tags
- All URLs must be valid http/https URLs

Schema:
${COURSE_JSON_SCHEMA_DOC}

Generate the complete JSON now:`;
