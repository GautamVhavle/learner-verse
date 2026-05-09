/**
 * TypeScript types for courses, tags, and course CRUD payloads.
 */
export interface Tag {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: "draft" | "ready";
  is_public: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  goal_date: string | null;
  tags: Tag[];
  section_count: number;
  lesson_count: number;
  has_issues: boolean;
  enrollment_count: number;
  average_rating: number;
  rating_count: number;
  creator_name: string;
  is_creator_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseListResponse {
  items: Course[];
  total: number;
}

export interface CourseCreate {
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  goal_date?: string | null;
  tags?: string[];
}

export interface CourseUpdate {
  title?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status?: "draft" | "ready";
  is_public?: boolean;
  goal_date?: string | null;
  tags?: string[];
}

export interface ValidationError {
  section: string;
  lesson: string | null;
  message: string;
}

export interface StatusUpdateResponse {
  status: "draft" | "ready";
  valid: boolean;
  errors: ValidationError[];
}
