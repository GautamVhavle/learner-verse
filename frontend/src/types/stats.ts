/**
 * TypeScript types for learning statistics, streaks, and activity data.
 */
export interface StatsOverviewResponse {
  total_courses_completed: number;
  total_lessons_completed: number;
  current_streak: number;
  longest_streak: number;
  most_active_day: string | null;
  total_active_days: number;
}

export interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface ActivityDayResponse {
  date: string;
  count: number;
}

export interface ActivityResponse {
  days: ActivityDayResponse[];
  total_lessons: number;
}
