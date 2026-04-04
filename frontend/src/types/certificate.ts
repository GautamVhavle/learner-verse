/**
 * TypeScript types for course completion certificates.
 */
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
export interface LessonBrief {
  title: string;
  lesson_type: string;
}

/** Section with nested lessons for the detailed share view. */
export interface SectionBrief {
  title: string;
  lessons: LessonBrief[];
}

/** Extended certificate response with full course structure metadata. */
export interface CertificateDetailResponse extends CertificateResponse {
  course_description: string | null;
  sections: SectionBrief[];
}
