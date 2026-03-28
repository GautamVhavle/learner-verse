/**
 * TypeScript types for user profiles and settings.
 */
export interface UserSettings {
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  playback_speed: number;
  font_size: "normal" | "large" | "xl";
  onboarding_complete: boolean;
  bio: string | null;
  profile_tags: string[];
  is_profile_public: boolean;
}

export interface UserProfile {
  id: string;
  clerk_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  playback_speed: number;
  font_size: "normal" | "large" | "xl";
  onboarding_complete: boolean;
  bio: string | null;
  profile_tags: string[];
  is_profile_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  profile_tags: string[];
  member_since: string;
  total_courses_completed: number;
  total_lessons_completed: number;
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  certificates: PublicCertificateItem[];
  activity_heatmap: PublicActivityDay[];
}

export interface PublicCertificateItem {
  certificate_uid: string;
  course_title: string;
  completed_at: string;
}

export interface PublicActivityDay {
  date: string;
  count: number;
}
