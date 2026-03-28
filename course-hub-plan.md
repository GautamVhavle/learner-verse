# Course Hub — Implementation Plan

## Overview
Transform the existing Browse Courses page into a full **Course Hub** — a public marketplace where creators publish courses and learners discover, enroll, and rate them.

---

## Phase 1: Backend — Public Visibility + Ratings Model

**Goal:** Add `is_public` flag to courses, create a `CourseRating` model, and expose new API endpoints.

### Database Changes
- **Course model**: Add `is_public: bool` (default `False`) column
- **New model: `CourseRating`** — `id`, `user_id`, `course_id`, `rating` (1-5), `review` (optional text), `created_at`, `updated_at`; unique constraint on `(user_id, course_id)`
- **Alembic migrations** for both changes

### Schema Changes
- `CourseUpdate` — add `is_public: bool | None`
- `CourseResponse` — add `is_public`, `enrollment_count`, `average_rating`, `rating_count`
- New `RatingCreate`, `RatingResponse`, `RatingListResponse` schemas

### Repository Changes
- `course_repo.list_public_courses(*, search, tags, sort_by, page, per_page)` — paginated public course listing
- New `rating_repo.py` — create/update/delete/list ratings, compute averages

### Service Changes
- `course_service._to_response()` — include enrollment_count, average_rating, rating_count
- New `rating_service.py` — rate, update, delete, list ratings for a course

### API Endpoints
- `GET /hub/courses` — paginated public courses with filters (search, tags, sort)
- `GET /hub/courses/{id}` — public course detail with stats
- `POST /courses/{id}/ratings` — submit rating (authenticated)
- `GET /courses/{id}/ratings` — list ratings for a course
- `PUT /courses/{id}/ratings` — update own rating
- `DELETE /courses/{id}/ratings` — delete own rating

---

## Phase 2: Course Hub Frontend UI

**Goal:** Build the Course Hub page with search, filters, and course cards showing ratings + enrollment counts.

### New Components
- `CourseHubPage.tsx` — main hub page with search bar, tag filters, sort dropdown, paginated grid
- `HubCourseCard.tsx` — card showing thumbnail, title, creator name, rating stars, enrollment count, tags
- `StarRating.tsx` — reusable star rating display component (read-only + interactive)
- `HubFilters.tsx` — search + tag filter + sort controls

### New Hooks
- `useHubCourses(params)` — fetches `GET /hub/courses` with pagination/filters
- `useHubCourseDetail(id)` — fetches `GET /hub/courses/{id}`
- `useRatings(courseId)` — fetches ratings list
- `useRateMutation(courseId)` — submit/update rating

### Navigation
- Add "Course Hub" to both Creator and Learner sidebar navigation
- Route: `/creator/hub` and `/learner/hub`

### Types
- Add `is_public`, `enrollment_count`, `average_rating`, `rating_count` to `Course` type
- New `Rating` and `RatingListResponse` types

---

## Phase 3: Course Detail + Enrollment + Rating Integration

**Goal:** Wire enrollment and rating into the Hub detail view; add "Make Public" toggle in Course Builder.

### Course Builder Updates
- Add "Public" toggle switch in course settings (only when status is `ready`)
- Show enrollment count badge on published courses

### Hub Course Detail
- Full course detail page: `HubCourseDetailPage.tsx`
- Sections/lessons preview (read-only outline)
- Creator info (name, avatar)
- Enroll / Unenroll button
- Rating submission form (1-5 stars + optional review)
- Ratings list with user names

### Enrollment Updates
- Enroll from hub detail page triggers existing enrollment flow
- Show "Already Enrolled — Go to Course" for enrolled users

---

## Phase 4: Polish, Cleanup + Remove Export/Import

**Goal:** Final polish, remove unused features, ensure consistency.

### Remove Export/Import
- Remove `GET /courses/{id}/export` endpoint
- Remove `POST /courses/import` endpoint
- Remove `useExportCourse()` and `useImportCourseMutation()` hooks
- Remove Export button from CourseBuilderPage
- Remove Import button from CreatorDashboard
- Remove "Export courses" section from SettingsPage Data section

### Polish
- Toast notifications for all hub actions
- Loading skeletons for hub page
- Empty states (no public courses, no ratings)
- Responsive design for mobile
- Rebuild Docker + deploy to Vercel
