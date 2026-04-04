/**
 * TypeScript types for course completion certificates.
 */
import type { LessonType } from "./section";

export interface CertificateResponse {
  id: string;
  user_id: string;
  course_id: string;
  certificate_uid: string;
  user_name: string;
  course_title: string;
  sections_count: number;
  lessons_count: number;
  completed_at: string;
}

/** Minimal lesson info returned in the detailed share view. */
export interface CertificateLessonBrief {
  title: string;
  lesson_type: LessonType;
}

/** Section with nested lessons for the detailed share view. */
export interface CertificateSectionBrief {
  title: string;
  lessons: CertificateLessonBrief[];
}

/** Extended certificate response with full course structure metadata. */
export interface CertificateDetailResponse extends CertificateResponse {
  course_description: string | null;
  sections: CertificateSectionBrief[];
}
