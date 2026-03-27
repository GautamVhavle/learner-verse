# Learner Verse — New Features Roadmap

## Feature 1: Notifications & Reminders

**Goal:** In-app notifications for pace warnings, streak nudges, goal deadline alerts — populating the existing Inbox sidebar placeholder.

### Backend

- **Model:** `Notification` — `id`, `user_id`, `type` (enum: pace_warning, streak_reminder, goal_deadline, system), `title`, `message`, `is_read`, `created_at`
- **Repository:** `NotificationRepository` — CRUD, mark read, mark all read, unread count
- **Service:** `NotificationService` — create notification, bulk create, evaluate goals and generate pace warnings
- **Endpoints:**
  - `GET /notifications` — list notifications (paginated, newest first)
  - `GET /notifications/unread-count` — badge count for sidebar
  - `PUT /notifications/{id}/read` — mark single as read
  - `PUT /notifications/read-all` — mark all as read
  - `DELETE /notifications/{id}` — delete single notification
- **Trigger logic:** On each login/dashboard load, check goals with `pace_status` = `behind` or `overdue` and generate notifications if none exist for that day. Check streak breaks.
- **Migration:** 1 new table

### Frontend

- **Page:** `InboxPage.tsx` — replace Coming Soon placeholder with notification list
- **Components:**
  - `NotificationCard` — single notification with icon by type, timestamp, mark-read button
  - `NotificationBadge` — unread count badge on Inbox sidebar icon
- **Hook:** `useNotifications()` — list query, unread count query, mark-read mutation, mark-all-read mutation
- **Sidebar update:** Remove "Coming Soon" from Inbox, add `NotificationBadge`
- **Route:** `/inbox` — already exists, just wire to `InboxPage`

### Tests

- Backend: ~6 tests (CRUD, mark read, unread count, auto-generation logic)
- Frontend: ~4 component tests + ~3 E2E tests
- **Estimated total:** ~13 new tests

---

## Feature 2: Bookmarks & Collections

**Goal:** Let learners bookmark lessons for quick reference and organize them into named collections.

### Backend

- **Model:** `Bookmark` — `id`, `user_id`, `lesson_id`, `collection` (string, default "Saved"), `created_at`
  - Unique constraint: `(user_id, lesson_id)`
- **Repository:** `BookmarkRepository` — toggle, list (filterable by collection), list collections, delete
- **Service:** `BookmarkService` — toggle bookmark, get bookmarks, get collections with counts
- **Endpoints:**
  - `POST /bookmarks` — toggle bookmark (body: `{ lesson_id, collection? }`)
  - `GET /bookmarks` — list bookmarks (query: `?collection=Saved`)
  - `GET /bookmarks/collections` — list collection names with counts
  - `DELETE /bookmarks/{id}` — remove bookmark
  - `PUT /bookmarks/{id}` — move to different collection
- **Migration:** 1 new table

### Frontend

- **Page:** `BookmarksPage.tsx` — replace Coming Soon placeholder with bookmark grid
- **Components:**
  - `BookmarkButton` — toggle icon on lesson pages (filled/outline state)
  - `BookmarkCard` — lesson info + course context + navigate link
  - `CollectionTabs` — tab bar to filter by collection
- **Hook:** `useBookmarks()` — list query, toggle mutation, collections query, move mutation
- **Sidebar update:** Remove "Coming Soon" from Bookmarks, wire to `/bookmarks`
- **Route:** `/bookmarks`
- **Integration:** Add `BookmarkButton` to lesson page header (next to completion button)

### Tests

- Backend: ~5 tests (toggle, list, filter by collection, unique constraint, move)
- Frontend: ~3 component tests + ~3 E2E tests
- **Estimated total:** ~11 new tests

---

## Feature 3: Quizzes & Knowledge Checks

**Goal:** Per-lesson multiple-choice quizzes that reinforce learning with immediate feedback.

### Backend

- **Models:**
  - `Quiz` — `id`, `lesson_id`, `title`, `description`, `pass_percentage` (default 70), `created_at`
  - `QuizQuestion` — `id`, `quiz_id`, `question_text`, `options` (JSONB array of strings), `correct_index` (int), `explanation`, `position`
  - `QuizAttempt` — `id`, `user_id`, `quiz_id`, `score`, `total`, `passed`, `answers` (JSONB), `created_at`
- **Repository:** `QuizRepository` — CRUD for quizzes and questions, record attempts
- **Service:** `QuizService` — create/update quiz, submit answers (auto-grade), get attempts
- **Endpoints:**
  - `POST /lessons/{lesson_id}/quiz` — create/update quiz (creator)
  - `GET /lessons/{lesson_id}/quiz` — get quiz with questions
  - `DELETE /quizzes/{quiz_id}` — delete quiz
  - `POST /quizzes/{quiz_id}/submit` — submit answers, returns score + explanations
  - `GET /quizzes/{quiz_id}/attempts` — list user's attempts
- **Migration:** 3 new tables

### Frontend

- **Creator components:**
  - `QuizEditor` — add/edit/reorder questions within course builder
  - `QuestionForm` — single question editor (text, options, correct answer, explanation)
- **Learner components:**
  - `QuizPlayer` — renders questions one-by-one or all-at-once, submit button
  - `QuizResults` — score display, per-question feedback (green/red), explanations
  - `QuizBadge` — icon on lesson cards indicating quiz available
- **Hook:** `useQuiz()` — get quiz query, submit mutation, attempts query
- **Integration:** Quiz tab/section on lesson page (below content). Quiz editor in course builder lesson panel.

### Tests

- Backend: ~10 tests (CRUD, submit, scoring, pass/fail, attempts history)
- Frontend: ~6 component tests + ~4 E2E tests
- **Estimated total:** ~20 new tests

---

## Feature 4: Course Ratings & Reviews

**Goal:** Let learners rate completed courses (1-5 stars) and write personal reflections.

### Backend

- **Model:** `CourseReview` — `id`, `user_id`, `course_id`, `rating` (1-5 int), `review_text` (optional), `created_at`, `updated_at`
  - Unique constraint: `(user_id, course_id)`
- **Repository:** `CourseReviewRepository` — upsert, get own review, get all for course, average rating
- **Service:** `CourseReviewService` — upsert review, get stats (avg rating, count)
- **Endpoints:**
  - `POST /courses/{course_id}/review` — upsert review (body: `{ rating, review_text? }`)
  - `GET /courses/{course_id}/review` — get user's own review
  - `GET /courses/{course_id}/reviews` — list all reviews (for future multi-user)
  - `GET /courses/{course_id}/review-stats` — `{ average_rating, review_count }`
- **Migration:** 1 new table
- **Course response update:** Add `avg_rating` and `review_count` computed fields

### Frontend

- **Components:**
  - `StarRating` — interactive 1-5 star picker (click to rate)
  - `ReviewForm` — star rating + text area + submit
  - `ReviewCard` — displays a single review (stars + text + date)
  - `CourseRatingBadge` — small star + number on course cards
- **Hook:** `useReviews()` — upsert mutation, own review query, stats query
- **Integration:**
  - Certificate celebration modal: prompt rating after earning certificate
  - Study page (after 100% completion): review section
  - Course cards (creator + learner): show average rating badge
  - Learner dashboard: "Your Reviews" section or filter

### Tests

- Backend: ~5 tests (upsert, get, average calculation, constraint enforcement)
- Frontend: ~4 component tests + ~3 E2E tests
- **Estimated total:** ~12 new tests

---

## Feature 5: Learning Paths

**Goal:** Group multiple courses into structured, ordered learning paths (curricula).

### Backend

- **Models:**
  - `LearningPath` — `id`, `user_id`, `title`, `description`, `thumbnail_url`, `status` (draft/published), `created_at`, `updated_at`
  - `LearningPathCourse` — `id`, `path_id`, `course_id`, `position`
    - Unique constraint: `(path_id, course_id)`
- **Repository:** `LearningPathRepository` — CRUD, reorder courses, get with progress
- **Service:** `LearningPathService` — CRUD, aggregate progress across courses, validate courses exist and are ready
- **Endpoints:**
  - `POST /paths` — create learning path
  - `GET /paths` — list paths (creator: own, learner: published)
  - `GET /paths/{path_id}` — get path with courses and aggregate progress
  - `PUT /paths/{path_id}` — update title/description
  - `DELETE /paths/{path_id}` — delete path
  - `POST /paths/{path_id}/courses` — add course to path
  - `DELETE /paths/{path_id}/courses/{course_id}` — remove course
  - `PUT /paths/{path_id}/courses` — reorder courses
  - `PUT /paths/{path_id}/status` — publish/unpublish
- **Migration:** 2 new tables

### Frontend

- **Creator components:**
  - `PathBuilder` — create/edit path, drag-drop courses into order
  - `PathCard` — path card for creator dashboard
- **Learner components:**
  - `PathOverview` — sequential course list with progress per course + overall %
  - `PathCard` — learner card showing aggregate completion
- **Pages:**
  - `PathsPage.tsx` — list all paths (creator view)
  - `PathBuilderPage.tsx` — create/edit single path
  - `PathStudyPage.tsx` — learner view of a path with sequential courses
- **Hook:** `usePaths()` — CRUD queries/mutations, progress query
- **Sidebar update:** Add "Learning Paths" to creator section, "Paths" to learner section
- **Routes:** `/paths`, `/paths/:id/edit`, `/paths/:id`

### Tests

- Backend: ~8 tests (CRUD, reorder, progress aggregation, validation)
- Frontend: ~5 component tests + ~4 E2E tests
- **Estimated total:** ~17 new tests

---

## Implementation Order

| # | Feature | Complexity | New Tables | Est. Tests | Why This Order |
|---|---------|------------|------------|------------|----------------|
| 1 | Notifications & Reminders | Low-Med | 1 | ~13 | Fills Inbox placeholder, immediate UX win |
| 2 | Bookmarks & Collections | Low | 1 | ~11 | Fills Bookmarks placeholder, low effort |
| 3 | Quizzes & Knowledge Checks | Medium | 3 | ~20 | Biggest learning impact, active recall |
| 4 | Course Ratings & Reviews | Low | 1 | ~12 | Enriches course cards, reflection tool |
| 5 | Learning Paths | Medium | 2 | ~17 | Curriculum structure, ties everything together |

**Total:** 8 new tables, ~73 new tests across all features.

---

## Implementation Checklist Per Feature

For each feature, follow this workflow:

1. [ ] Create Alembic migration for new table(s)
2. [ ] Create SQLAlchemy model(s)
3. [ ] Create Pydantic schemas (request/response)
4. [ ] Create repository class
5. [ ] Create service class
6. [ ] Create API endpoints
7. [ ] Write backend tests
8. [ ] Run backend tests — all green
9. [ ] Create frontend hook(s)
10. [ ] Create frontend components
11. [ ] Create/update page(s)
12. [ ] Update sidebar/routes
13. [ ] Write component tests
14. [ ] Write E2E tests
15. [ ] Run full regression — all green
