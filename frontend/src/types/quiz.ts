/**
 * TypeScript types for quiz questions, attempts, and results.
 */

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_option: number;
  position: number;
  created_at: string;
}

/** Question as seen by learners - no correct_option field. */
export interface QuizQuestionLearner {
  id: string;
  question: string;
  options: string[];
  position: number;
}

export interface QuizQuestionCreate {
  question: string;
  options: [string, string, string, string];
  correct_option: number;
}

export interface AIQuizGenerateRequest {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  num_questions: number;
}

export interface QuizQuestionUpdate {
  question?: string;
  options?: [string, string, string, string];
  correct_option?: number;
}

export interface QuizAttemptResult {
  question_id: string;
  question: string;
  options: string[];
  correct_option: number;
  selected_option: number | null;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, number>;
  results?: QuizAttemptResult[];
  completed_at: string;
}

export interface QuizBestScore {
  lesson_id: string;
  best_score: number;
  total: number;
  best_percentage: number;
  attempts_count: number;
  passed: boolean;
}

export interface QuizSubmitRequest {
  answers: Record<string, number>;
}
