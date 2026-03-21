/**
 * TypeScript types for study notes and per-course study state.
 */
export interface StudyNoteResponse {
  content: string | null;
  updated_at: string | null;
}

export interface StudyNoteUpdate {
  content: string | null;
}

export interface StudyStateResponse {
  course_id: string;
  last_lesson_id: string | null;
  last_accessed_at: string;
}

export interface StudyStateUpdate {
  last_lesson_id: string;
}
