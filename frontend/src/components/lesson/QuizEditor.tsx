/**
 * Quiz editor for course creators — add, edit, delete multiple-choice questions.
 * Includes AI-powered quiz generation via LiVi.
 */
import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Pencil,
  Save,
  Sparkles,
  Loader2,
  Zap,
  Brain,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useQuizQuestionsQuery,
  useCreateQuizQuestionMutation,
  useUpdateQuizQuestionMutation,
  useDeleteQuizQuestionMutation,
  useGenerateQuizMutation,
} from "@/hooks/useQuiz";
import type { QuizQuestion, QuizQuestionCreate } from "@/types/quiz";
import { useProGate } from "@/hooks/useProGate";

interface QuizEditorProps {
  lessonId: string;
  courseId: string;
}

const EMPTY_QUESTION: QuizQuestionCreate = {
  question: "",
  options: ["", "", "", ""],
  correct_option: 0,
};

export function QuizEditor({ lessonId, courseId }: QuizEditorProps) {
  const { data: questions = [], isLoading } = useQuizQuestionsQuery(lessonId);
  const createMutation = useCreateQuizQuestionMutation(lessonId, courseId);
  const updateMutation = useUpdateQuizQuestionMutation(lessonId, courseId);
  const deleteMutation = useDeleteQuizQuestionMutation(lessonId, courseId);
  const generateMutation = useGenerateQuizMutation(lessonId, courseId);

  const [newQuestion, setNewQuestion] = useState<QuizQuestionCreate>({ ...EMPTY_QUESTION });
  const [showNewForm, setShowNewForm] = useState(false);
  const { gatedAction, ProGate } = useProGate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<QuizQuestionCreate>({ ...EMPTY_QUESTION });

  // AI generator state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiCount, setAiCount] = useState(5);

  const handleCreate = () => {
    if (!newQuestion.question.trim()) return;
    if (newQuestion.options.some((o) => !o.trim())) return;
    createMutation.mutate(newQuestion, {
      onSuccess: () => {
        setNewQuestion({ ...EMPTY_QUESTION });
        setShowNewForm(false);
      },
    });
  };

  const handleStartEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setEditData({
      question: q.question,
      options: q.options as [string, string, string, string],
      correct_option: q.correct_option,
    });
  };

  const handleSaveEdit = (questionId: string) => {
    if (!editData.question.trim()) return;
    if (editData.options.some((o) => !o.trim())) return;
    updateMutation.mutate(
      { questionId, data: editData },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleDelete = (questionId: string) => {
    deleteMutation.mutate(questionId);
    if (editingId === questionId) setEditingId(null);
  };

  const handleAiGenerate = () => {
    if (!aiTopic.trim()) return;
    generateMutation.mutate(
      { topic: aiTopic.trim(), difficulty: aiDifficulty, num_questions: aiCount },
      {
        onSuccess: (generated) => {
          toast.success(`Generated ${generated.length} questions with LiVi`);
          setShowAiPanel(false);
          setAiTopic("");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to generate questions. Please try again.");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-text-tertiary">
        Loading questions…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Quiz Questions ({questions.length})
        </h3>
        <ProGate />
        {!showAiPanel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={gatedAction(() => setShowAiPanel(true))}
            className="gap-1.5 text-accent-purple hover:text-accent-purple"
          >
            <Sparkles className="size-3.5" />
            Generate with LiVi
          </Button>
        )}
      </div>

      {/* ── AI Generation Panel ── */}
      {showAiPanel && (
        <div className="relative overflow-hidden rounded-xl border border-accent-purple/20 bg-gradient-to-br from-accent-purple/[0.04] to-accent-purple/[0.02]">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-accent-purple/10 px-4 py-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent-purple/10">
              <Sparkles className="size-3.5 text-accent-purple" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Generate with LiVi</p>
              <p className="text-[11px] text-text-tertiary">AI-powered quiz generation</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Topic</label>
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g., JavaScript closures, React hooks, Python data structures…"
                className="text-sm"
                disabled={generateMutation.isPending}
              />
            </div>

            {/* Difficulty + Count row */}
            <div className="flex gap-3">
              {/* Difficulty */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Difficulty</label>
                <div className="flex gap-1.5">
                  {(["easy", "medium", "hard"] as const).map((d) => {
                    const active = aiDifficulty === d;
                    const icons = { easy: Zap, medium: Brain, hard: Target };
                    const Icon = icons[d];
                    return (
                      <button
                        key={d}
                        onClick={() => setAiDifficulty(d)}
                        disabled={generateMutation.isPending}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                          active
                            ? "border-accent-purple/40 bg-accent-purple/10 text-accent-purple"
                            : "border-border-default bg-bg-secondary text-text-secondary hover:border-accent-purple/20 hover:text-text-primary"
                        } disabled:opacity-50`}
                      >
                        <Icon className="size-3" />
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of questions */}
              <div className="w-28 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Questions</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={25}
                    value={aiCount}
                    onChange={(e) => setAiCount(Math.min(25, Math.max(1, +e.target.value || 1)))}
                    className="text-center text-sm"
                    disabled={generateMutation.isPending}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-text-tertiary">Max 25 questions per generation</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAiPanel(false)}
                  disabled={generateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={!aiTopic.trim() || generateMutation.isPending}
                  className="gap-1.5 bg-accent-purple text-white hover:bg-accent-purple/90"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Generation Skeleton ── */}
      {generateMutation.isPending && (
        <div className="space-y-3">
          {Array.from({ length: Math.min(aiCount, 5) }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-accent-purple/10 bg-accent-purple/[0.02] p-4"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded bg-accent-purple/10">
                  <Sparkles className="size-3 animate-pulse text-accent-purple/40" />
                </div>
                <div className="h-3.5 flex-1 rounded-full bg-accent-purple/10" />
                <div className="h-3.5 w-16 rounded-full bg-accent-purple/10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-9 rounded-md bg-accent-purple/[0.06]"
                    style={{ animationDelay: `${(i * 4 + j) * 80}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-center text-xs text-accent-purple/60">
            LiVi is generating your quiz questions…
          </p>
        </div>
      )}

      {/* Existing questions */}
      {questions.length === 0 && !showNewForm && !generateMutation.isPending && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-8 text-center">
          <p className="text-sm text-text-tertiary">No questions yet</p>
          <p className="mt-1 text-xs text-text-tertiary">Add your first question to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-lg border border-border-default bg-bg-secondary p-4"
          >
            {editingId === q.id ? (
              /* Edit mode */
              <QuestionForm
                data={editData}
                onChange={setEditData}
                onSave={() => handleSaveEdit(q.id)}
                onCancel={() => setEditingId(null)}
                saving={updateMutation.isPending}
                index={idx}
              />
            ) : (
              /* View mode */
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    <span className="mr-2 text-text-tertiary">Q{idx + 1}.</span>
                    {q.question}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleStartEdit(q)}
                      title="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(q.id)}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                        i === q.correct_option
                          ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                          : "border-border-default text-text-secondary"
                      }`}
                    >
                      {i === q.correct_option ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-text-tertiary" />
                      )}
                      <span className="truncate">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new question form */}
      {showNewForm ? (
        <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-4">
          <QuestionForm
            data={newQuestion}
            onChange={setNewQuestion}
            onSave={handleCreate}
            onCancel={() => {
              setShowNewForm(false);
              setNewQuestion({ ...EMPTY_QUESTION });
            }}
            saving={createMutation.isPending}
            index={questions.length}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-text-secondary hover:text-text-primary"
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="size-3.5" />
          Add Question
        </Button>
      )}
    </div>
  );
}

// ── Question Form (shared between create and edit) ───────────

interface QuestionFormProps {
  data: QuizQuestionCreate;
  onChange: (data: QuizQuestionCreate) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  index: number;
}

function QuestionForm({ data, onChange, onSave, onCancel, saving, index }: QuestionFormProps) {
  const updateOption = (i: number, value: string) => {
    const options = [...data.options] as [string, string, string, string];
    options[i] = value;
    onChange({ ...data, options });
  };

  const isValid =
    data.question.trim().length > 0 &&
    data.options.every((o) => o.trim().length > 0);

  return (
    <div className="space-y-4">
      {/* Question text */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary">
          Question {index + 1}
        </label>
        <Input
          value={data.question}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          placeholder="Enter your question…"
          className="text-sm"
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary">
          Options (click to mark correct answer)
        </label>
        {data.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...data, correct_option: i })}
              className={`shrink-0 rounded-full p-0.5 transition-colors ${
                i === data.correct_option
                  ? "text-accent-green"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title={i === data.correct_option ? "Correct answer" : "Set as correct answer"}
            >
              {i === data.correct_option ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <Circle className="size-5" />
              )}
            </button>
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1 text-sm"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!isValid || saving}
        >
          <Save className="size-3.5" />
          {saving ? "Saving…" : "Save Question"}
        </Button>
      </div>
    </div>
  );
}
