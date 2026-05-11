/** TypeScript types for the course enrollment feature. */

export interface EnrollmentResponse {
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
}
