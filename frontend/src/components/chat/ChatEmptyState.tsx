/**
 * ChatEmptyState — welcome screen with contextual suggestions.
 */
import { Sparkles, BookOpen, Brain, MessageSquare, HelpCircle } from "lucide-react";

const SUGGESTIONS = [
  { icon: BookOpen, text: "Explain a concept to me", color: "text-accent-blue" },
  { icon: Brain, text: "Help me study for a test", color: "text-accent-purple" },
  { icon: MessageSquare, text: "Quiz me on a topic", color: "text-accent-green" },
  { icon: HelpCircle, text: "Summarize what I'm learning", color: "text-accent-amber" },
];

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
      {/* Logo */}
      <div className="relative">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20">
          <Sparkles className="size-6 text-accent-purple" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-bg-primary bg-accent-green" />
      </div>

      {/* Greeting */}
      <div className="space-y-1.5 text-center">
        <h3 className="text-sm font-semibold text-text-primary">
          Hi! I'm LiVi
        </h3>
        <p className="text-xs leading-relaxed text-text-secondary">
          Your learning assistant. I can see what page you're on
          and help with anything related to your courses.
        </p>
      </div>

      {/* Suggestion grid */}
      <div className="grid w-full max-w-[280px] gap-1.5">
        {SUGGESTIONS.map(({ icon: Icon, text, color }) => (
          <button
            key={text}
            onClick={() => onSuggestionClick(text)}
            className="flex items-center gap-2.5 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-left transition-all hover:border-border-hover hover:bg-bg-tertiary"
          >
            <Icon className={`size-3.5 shrink-0 ${color}`} />
            <span className="text-xs text-text-secondary">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
