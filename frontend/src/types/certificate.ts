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
