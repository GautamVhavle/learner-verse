/**
 * React Query hooks for quiz question CRUD (creator) and quiz attempts (learner).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AIQuizGenerateRequest,
  QuizAttempt,
  QuizBestScore,
  QuizQuestion,
  QuizQuestionCreate,
  QuizQuestionLearner,
  QuizQuestionUpdate,
  QuizSubmitRequest,
} from "@/types/quiz";

const quizKeys = {
  questions: (lessonId: string) => ["quiz-questions", lessonId] as const,
  learnerQuestions: (lessonId: string) => ["quiz-learner-questions", lessonId] as const,
  attempts: (lessonId: string) => ["quiz-attempts", lessonId] as const,
  best: (lessonId: string) => ["quiz-best", lessonId] as const,
};

/** Shared section query key - must match useSections.ts */
const sectionKeys = {
  all: (courseId: string) => ["sections", courseId] as const,
};

// ── Creator: Question CRUD ───────────────────────────────────

export function useQuizQuestionsQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.questions(lessonId ?? ""),
    queryFn: () => api.get<QuizQuestion[]>(`/quiz/lessons/${lessonId}/questions`),
    enabled: !!lessonId,
  });
}

export function useCreateQuizQuestionMutation(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuizQuestionCreate) =>
      api.post<QuizQuestion>(`/quiz/lessons/${lessonId}/questions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.questions(lessonId) });
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useUpdateQuizQuestionMutation(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: QuizQuestionUpdate }) =>
      api.put<QuizQuestion>(`/quiz/questions/${questionId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.questions(lessonId) });
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useDeleteQuizQuestionMutation(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => api.delete<void>(`/quiz/questions/${questionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.questions(lessonId) });
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useReorderQuizQuestionsMutation(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      api.put<QuizQuestion[]>(`/quiz/lessons/${lessonId}/questions/reorder`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.questions(lessonId) });
    },
  });
}

export function useGenerateQuizMutation(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AIQuizGenerateRequest) =>
      api.post<QuizQuestion[]>(`/quiz/lessons/${lessonId}/generate`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.questions(lessonId) });
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

// ── Learner: Quiz Taking ─────────────────────────────────────

export function useLearnerQuestionsQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.learnerQuestions(lessonId ?? ""),
    queryFn: () => api.get<QuizQuestionLearner[]>(`/quiz/lessons/${lessonId}/questions/learner`),
    enabled: !!lessonId,
  });
}

export function useSubmitQuizMutation(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuizSubmitRequest) =>
      api.post<QuizAttempt>(`/quiz/lessons/${lessonId}/submit`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.attempts(lessonId) });
      qc.invalidateQueries({ queryKey: quizKeys.best(lessonId) });
    },
  });
}

export function useQuizAttemptsQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.attempts(lessonId ?? ""),
    queryFn: () => api.get<QuizAttempt[]>(`/quiz/lessons/${lessonId}/attempts`),
    enabled: !!lessonId,
  });
}

export function useQuizBestScoreQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.best(lessonId ?? ""),
    queryFn: () => api.get<QuizBestScore | null>(`/quiz/lessons/${lessonId}/best`),
    enabled: !!lessonId,
  });
}
