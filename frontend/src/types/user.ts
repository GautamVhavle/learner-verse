/**
 * TypeScript types for user profiles and settings.
 */
export type ProPlan = "monthly" | "yearly" | "manual";

export type SubscriptionStatus =
  | "active"
  | "authenticated"
  | "cancelled"
  | "completed"
  | "halted"
  | "manual_active"
  | "manual_expired"
  | "manual_revoked"
  | "paused"
  | "pending"
  | null;

export interface UserSettings {
  display_name: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  timezone: string;
  playback_speed: number;
  font_size: "normal" | "large" | "xl";
  onboarding_complete: boolean;
  bio: string | null;
  profile_tags: string[];
  social_links: SocialLink[];
  is_profile_public: boolean;
  auto_play_next: boolean;
  is_pro: boolean;
  pro_since: string | null;
  pro_expires_at: string | null;
  pro_plan: ProPlan | null;
  subscription_status: SubscriptionStatus;
}

export interface UserProfile {
  id: string;
  clerk_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  timezone: string;
  playback_speed: number;
  font_size: "normal" | "large" | "xl";
  onboarding_complete: boolean;
  bio: string | null;
  profile_tags: string[];
  social_links: SocialLink[];
  is_profile_public: boolean;
  auto_play_next: boolean;
  is_pro: boolean;
  pro_since: string | null;
  pro_expires_at: string | null;
  pro_plan: ProPlan | null;
  subscription_status: SubscriptionStatus;
  is_verified_creator: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  profile_tags: string[];
  social_links: SocialLink[];
  member_since: string;
  total_courses_completed: number;
  total_lessons_completed: number;
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  is_verified_creator: boolean;
  is_pro: boolean;
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
