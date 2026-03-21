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
  created_at: string;
  updated_at: string;
}
