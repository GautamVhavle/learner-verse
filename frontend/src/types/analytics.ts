/**
 * TypeScript types for creator analytics - overview, per-course, ratings, learners.
 */

// ── Shared ──────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  count: number;
}

export interface RatingBucket {
  stars: number;
  count: number;
}

// ── Overview ────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  total_enrollments: number;
  total_completions: number;
  total_lessons: number;
  total_ratings: number;
  average_rating: number;
  enrollment_trend: TrendPoint[];
  completion_trend: TrendPoint[];
  rating_distribution: RatingBucket[];
}

// ── Per-Course ──────────────────────────────────────────────

export interface CourseAnalytics {
  course_id: string;
  title: string;
  thumbnail_url: string | null;
  status: "draft" | "ready";
  is_public: boolean;
  section_count: number;
  lesson_count: number;
  enrollment_count: number;
  completion_count: number;
  completion_rate: number;
  average_rating: number;
  rating_count: number;
  rating_distribution: RatingBucket[];
  enrollment_trend: TrendPoint[];
  completion_trend: TrendPoint[];
  created_at: string;
}

export interface CourseAnalyticsList {
  items: CourseAnalytics[];
  total: number;
}

// ── Ratings Detail ──────────────────────────────────────────

export interface RatingDetail {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface CourseRatingsDetail {
  course_id: string;
  course_title: string;
  average_rating: number;
  rating_count: number;
  distribution: RatingBucket[];
  recent_reviews: RatingDetail[];
}

// ── Learners ────────────────────────────────────────────────

export interface LearnerInfo {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  enrolled_at: string;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number;
  completed_course: boolean;
}

export interface CourseLearnersList {
  course_id: string;
  course_title: string;
  learners: LearnerInfo[];
  total: number;
}

// ── Top Courses ─────────────────────────────────────────────

export interface TopCourse {
  course_id: string;
  title: string;
  thumbnail_url: string | null;
  enrollment_count: number;
  completion_count: number;
  average_rating: number;
  rating_count: number;
}
