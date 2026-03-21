/**
 * TypeScript types for lesson/course progress tracking and goals.
 */
export interface ProgressToggle {
  completed: boolean;
}

export interface LessonProgressResponse {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface SectionProgressResponse {
  section_id: string;
  title: string;
  total_lessons: number;
  completed_lessons: number;
}

export interface GoalResponse {
  goal_date: string;
  pace_status: "on_track" | "ahead" | "behind" | "completed" | "overdue";
  lessons_per_week_needed: number;
  days_remaining: number;
  completed_early_by_days: number | null;
}

export interface CourseProgressResponse {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  percentage: number;
  sections: SectionProgressResponse[];
  lesson_progress: Record<string, boolean>;
  goal: GoalResponse | null;
}

export interface CourseGoalResponse {
  course_id: string;
  course_title: string;
  goal_date: string | null;
  total_lessons: number;
  completed_lessons: number;
  percentage: number;
  pace_status: string | null;
  lessons_per_week_needed: number | null;
  days_remaining: number | null;
  completed_early_by_days: number | null;
}
