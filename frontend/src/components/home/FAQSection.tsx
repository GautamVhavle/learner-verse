/**
 * FAQ section - accordion-style frequently asked questions
 * with smooth expand/collapse animations.
 */
import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BlurFade } from "@/components/ui/blur-fade";

interface FAQ {
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    question: "Does watching on LearnerVerse count as YouTube views?",
    answer:
      "Yes! Videos are embedded using YouTube's official player, so every watch counts toward the creator's view count, watch time, and revenue. You're supporting the original creators while learning.",
  },
  {
    question: "Can I use it on my phone or tablet?",
    answer:
      "LearnerVerse is fully responsive and works on any screen size. It's also a Progressive Web App (PWA), so you can install it on your home screen for a native app-like experience without downloading anything from an app store.",
  },
  {
    question: "How does the Pomodoro focus timer work?",
    answer:
      "There's a built-in Pomodoro timer in the header. Set work intervals and breaks to stay focused while studying. It runs across pages so you can navigate freely without resetting it.",
  },
  {
    question: "What happens to my data if I delete my account?",
    answer:
      "You have full control. In Settings, you can either wipe all data (courses, progress, chats, stats) while keeping your account, or permanently delete your account and all associated data. Both actions are irreversible and require confirmation.",
  },
  {
    question: "Can I take notes while watching a lesson?",
    answer:
      "Yes, every lesson has a built-in study notes panel. Notes are timestamped and saved per lesson, so you can quickly reference what you wrote at a specific point in the video.",
  },
  {
    question: "Is there a discussion forum for courses?",
    answer:
      "Every course has a real-time discussion room where enrolled learners can ask questions, share insights, and help each other. There's also MiVi, an AI assistant that can jump into discussions to provide answers.",
  },
  {
    question: "Does it work with any YouTube video or only playlists?",
    answer:
      "Both! You can paste a single YouTube video URL or an entire playlist. Single videos become one-lesson courses, and playlists get organized into multi-section, multi-lesson courses automatically.",
  },
  {
    question: "Can I rearrange lessons after the AI organizes them?",
    answer:
      "Absolutely. The Visual Course Builder gives you full drag-and-drop control. You can rename sections, reorder lessons, move them between sections, add or remove videos, and customize the entire structure before or after publishing.",
  },
  {
    question: "How do goals and streaks work?",
    answer:
      "You can set daily or weekly learning goals. Every day you study counts toward your streak. The stats page shows detailed charts of your activity, streak history, and progress across all courses to keep you motivated.",
  },
  {
    question: "What tech stack does LearnerVerse use?",
    answer:
      "The frontend is built with React 19, TypeScript, Tailwind CSS v4, and Vite. The backend uses FastAPI with async SQLAlchemy and PostgreSQL. Auth is handled by Auth0, and AI features are powered by OpenRouter. The whole stack is containerized with Docker.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index,
}: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <BlurFade delay={0.05 * index} inView>
      <div
        className={`group rounded-2xl border transition-all duration-300 ${
          isOpen
            ? "border-blue-500/20 bg-blue-500/[0.04] shadow-[0_0_30px_rgba(59,130,246,0.04)]"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
        }`}
      >
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-7 sm:py-6"
          aria-expanded={isOpen}
        >
          <span
            className={`text-[15px] leading-snug font-medium transition-colors sm:text-base ${
              isOpen ? "text-white" : "text-white/80 group-hover:text-white"
            }`}
          >
            {faq.question}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex shrink-0 items-center justify-center"
          >
            <ChevronDown
              className={`size-4.5 transition-colors ${
                isOpen ? "text-blue-400" : "text-white/30 group-hover:text-white/50"
              }`}
            />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5 sm:px-7 sm:pb-6">
                <div className="h-px bg-gradient-to-r from-blue-500/10 via-white/[0.06] to-transparent" />
                <p className="mt-4 text-sm leading-relaxed text-white/50 sm:text-[15px]">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BlurFade>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const mid = Math.ceil(FAQS.length / 2);
  const leftFaqs = FAQS.slice(0, mid);
  const rightFaqs = FAQS.slice(mid);

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,_rgba(59,130,246,0.05)_0%,_transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <BlurFade delay={0} inView>
          <div className="mb-14 text-center sm:mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-4 py-1.5">
              <HelpCircle className="size-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">FAQ</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
              Everything you need to know about LearnerVerse. Can't find what you're looking for?
              Reach out on GitHub.
            </p>
          </div>
        </BlurFade>

        {/* Two-column layout on desktop, single column on mobile */}
        <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
          {/* Left column */}
          <div className="flex flex-col gap-3.5 md:gap-4">
            {leftFaqs.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
                index={i}
              />
            ))}
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-3.5 md:gap-4">
            {rightFaqs.map((faq, i) => {
              const globalIndex = mid + i;
              return (
                <FAQItem
                  key={globalIndex}
                  faq={faq}
                  isOpen={openIndex === globalIndex}
                  onToggle={() => toggle(globalIndex)}
                  index={globalIndex}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
