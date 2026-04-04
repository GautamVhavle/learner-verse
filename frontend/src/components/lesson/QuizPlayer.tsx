/**
 * Quiz player for learners — take a quiz, submit answers, view results.
 */
import { useState, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiviInlineChat } from "@/components/chat/LiviInlineChat";
import {
  useLearnerQuestionsQuery,
  useSubmitQuizMutation,
  useQuizBestScoreQuery,
} from "@/hooks/useQuiz";
import type { QuizAttempt, QuizAttemptResult } from "@/types/quiz";

interface QuizPlayerProps {
  lessonId: string;
  lessonTitle?: string;
  onQuizCompleted?: () => void;
}

type QuizState = "intro" | "taking" | "results";

export function QuizPlayer({ lessonId, lessonTitle, onQuizCompleted }: QuizPlayerProps) {
  const { data: questions = [], isLoading } = useLearnerQuestionsQuery(lessonId);
  const { data: bestScore } = useQuizBestScoreQuery(lessonId);
  const submitMutation = useSubmitQuizMutation(lessonId);

  const [state, setState] = useState<QuizState>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);

  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    submitMutation.mutate(
      { answers },
      {
        onSuccess: (data) => {
          setResult(data);
          setState("results");
          if (data.passed) {
            onQuizCompleted?.();
          }
        },
      },
    );
  }, [answers, submitMutation, onQuizCompleted]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setState("taking");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default py-12">
        <ClipboardCheck className="size-8 text-text-tertiary" />
        <p className="mt-3 text-sm text-text-tertiary">
          This quiz has no questions yet.
        </p>
      </div>
    );
  }

  // ── Intro Screen ─────────────────────────────────────────
  if (state === "intro") {
    return (
      <div className="rounded-xl border border-border-default bg-bg-secondary p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-blue/10">
            <ClipboardCheck className="size-7 text-accent-blue" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-text-primary">
            Ready to take the quiz?
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {questions.length} question{questions.length !== 1 ? "s" : ""} — Multiple choice
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Score 60% or more to pass. You can retake as many times as you'd like.
          </p>

          {bestScore && (
            <div className="mt-4 rounded-lg border border-border-default bg-bg-primary px-4 py-3">
              <p className="text-xs text-text-tertiary">Your best score</p>
              <p className={`text-lg font-bold ${bestScore.passed ? "text-accent-green" : "text-amber-500"}`}>
                {bestScore.best_score}/{bestScore.total} ({bestScore.best_percentage}%)
              </p>
              <p className="text-xs text-text-tertiary">
                {bestScore.attempts_count} attempt{bestScore.attempts_count !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          <Button className="mt-6" onClick={() => setState("taking")}>
            {bestScore ? "Retake Quiz" : "Start Quiz"}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Taking Quiz ──────────────────────────────────────────
  if (state === "taking") {
    const current = questions[currentIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount === totalQuestions;

    return (
      <div className="rounded-xl border border-border-default bg-bg-secondary p-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>
              {answeredCount}/{totalQuestions} answered
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-bg-tertiary">
            <div
              className="h-1.5 rounded-full bg-accent-blue transition-all"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h3 className="text-base font-medium text-text-primary">
          {current.question}
        </h3>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {current.options.map((option, i) => {
            const isSelected = answers[current.id] === i;
            return (
              <button
                key={i}
                onClick={() => handleSelectOption(current.id, i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-accent-blue bg-accent-blue/10 text-text-primary"
                    : "border-border-default bg-bg-primary text-text-secondary hover:border-border-hover hover:bg-bg-tertiary"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                    isSelected
                      ? "border-accent-blue bg-accent-blue text-white"
                      : "border-border-default text-text-tertiary"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Inline LiVi chat for current question */}
        <div className="mt-4">
          <LiviInlineChat
            key={current.id}
            contextType="quiz"
            contextData={{
              lesson_title: lessonTitle ?? "",
              question: current.question,
              options: current.options,
            }}
          />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!allAnswered || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>Submit Quiz</>
              )}
            </Button>
          )}
        </div>

        {/* Question dots for quick navigation */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {questions.map((q, i) => {
            const isAnswered = q.id in answers;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`size-7 rounded-full text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-accent-blue text-white"
                    : isAnswered
                      ? "bg-accent-blue/20 text-accent-blue"
                      : "bg-bg-tertiary text-text-tertiary hover:bg-bg-primary"
                }`}
                title={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────
  if (state === "results" && result) {
    const passed = result.passed;

    return (
      <div className="space-y-6">
        {/* Score summary */}
        <div className="rounded-xl border border-border-default bg-bg-secondary p-6 text-center">
          <div
            className={`mx-auto flex size-16 items-center justify-center rounded-full ${
              passed ? "bg-accent-green/10" : "bg-amber-100 dark:bg-amber-900/20"
            }`}
          >
            {passed ? (
              <Trophy className="size-8 text-accent-green" />
            ) : (
              <RotateCcw className="size-8 text-amber-500" />
            )}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-text-primary">
            {passed ? "Great job!" : "Keep practicing!"}
          </h3>
          <p
            className={`mt-1 text-3xl font-bold ${
              passed ? "text-accent-green" : "text-amber-500"
            }`}
          >
            {result.score}/{result.total}
          </p>
          <p className="text-sm text-text-secondary">
            {result.percentage}% —{" "}
            {passed ? "Passed" : "60% needed to pass"}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRetake}>
              <RotateCcw className="size-4" />
              Retake Quiz
            </Button>
          </div>
        </div>

        {/* Detailed results */}
        {result.results && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">
              Answer Review
            </h4>
            {result.results.map((r: QuizAttemptResult, idx: number) => (
              <div
                key={r.question_id}
                className="space-y-2"
              >
                <div
                  className={`rounded-lg border p-4 ${
                    r.is_correct
                      ? "border-accent-green/30 bg-accent-green/5"
                      : "border-red-300/30 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {r.is_correct ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-green" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        Q{idx + 1}. {r.question}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {r.options.map((opt, i) => {
                          const isCorrect = i === r.correct_option;
                          const isSelected = i === r.selected_option;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                                isCorrect
                                  ? "bg-accent-green/15 font-medium text-accent-green"
                                  : isSelected && !isCorrect
                                    ? "bg-red-100 text-red-600 line-through dark:bg-red-900/20 dark:text-red-400"
                                    : "text-text-tertiary"
                              }`}
                            >
                              <span className="shrink-0 font-medium">
                                {String.fromCharCode(65 + i)}.
                              </span>
                              {opt}
                              {isCorrect && (
                                <CheckCircle2 className="ml-auto size-3.5 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {!r.is_correct && (
                  <LiviInlineChat
                    contextType="quiz"
                    contextData={{
                      lesson_title: lessonTitle ?? "",
                      question: r.question,
                      options: r.options,
                    }}
                    label="Ask LiVi to explain this question"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
