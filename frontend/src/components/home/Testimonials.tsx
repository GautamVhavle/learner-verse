/**
 * Use-case showcase section: scrolling marquee of real
 * scenarios that show how learners and creators use the platform.
 *
 * Each card represents a genuine use-case rather than a
 * fabricated testimonial from a fictional person.
 */
import {
  Youtube,
  BookOpen,
  Brain,
  Award,
  TrendingUp,
  Users,
  Sparkles,
  Globe,
  MessageCircle,
  Timer,
} from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { BlurFade } from "@/components/ui/blur-fade";

interface UseCase {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  persona: "Learner" | "Creator";
  description: string;
}

const USE_CASES: UseCase[] = [
  {
    icon: Youtube,
    iconColor: "text-red-400",
    iconBg: "from-red-500/20 to-red-500/5",
    title: "Import any playlist",
    persona: "Learner",
    description:
      "Paste a YouTube playlist URL and get a fully structured course with sections and lessons in seconds.",
  },
  {
    icon: Brain,
    iconColor: "text-purple-400",
    iconBg: "from-purple-500/20 to-purple-500/5",
    title: "AI-generated quizzes",
    persona: "Learner",
    description:
      "After every lesson, generate a quiz with one click. LiVi reads the video content and writes questions that test real understanding.",
  },
  {
    icon: Globe,
    iconColor: "text-cyan-400",
    iconBg: "from-cyan-500/20 to-cyan-500/5",
    title: "Publish to Course Hub",
    persona: "Creator",
    description:
      "Share your curated course with the community. Learners can discover, enroll, and rate your content.",
  },
  {
    icon: TrendingUp,
    iconColor: "text-blue-400",
    iconBg: "from-blue-500/20 to-blue-500/5",
    title: "Track every lesson",
    persona: "Learner",
    description:
      "See your completion percentage, daily streaks, and study hours. Stay motivated with a visual progress dashboard.",
  },
  {
    icon: Award,
    iconColor: "text-amber-400",
    iconBg: "from-amber-500/20 to-amber-500/5",
    title: "Earn certificates",
    persona: "Learner",
    description:
      "Complete a course and get a verifiable certificate. Download the PDF or share it with a unique public link.",
  },
  {
    icon: Sparkles,
    iconColor: "text-emerald-400",
    iconBg: "from-emerald-500/20 to-emerald-500/5",
    title: "Ask LiVi anything",
    persona: "Learner",
    description:
      "LiVi reads your current lesson and answers questions with full context. Like a tutor that knows your course inside out.",
  },
  {
    icon: Users,
    iconColor: "text-orange-400",
    iconBg: "from-orange-500/20 to-orange-500/5",
    title: "Reach more learners",
    persona: "Creator",
    description:
      "Your learners get structure, quizzes, and certificates from your content. A new way to add value to your audience.",
  },
  {
    icon: BookOpen,
    iconColor: "text-indigo-400",
    iconBg: "from-indigo-500/20 to-indigo-500/5",
    title: "Organize with AI",
    persona: "Creator",
    description:
      "LiVi restructures messy playlists into logical sections. Import 50 videos and get a clean curriculum instantly.",
  },
  {
    icon: MessageCircle,
    iconColor: "text-pink-400",
    iconBg: "from-pink-500/20 to-pink-500/5",
    title: "Discussion rooms",
    persona: "Learner",
    description:
      "Ask questions in course discussions. Get help from fellow learners and the AI-powered MiVi assistant.",
  },
  {
    icon: Timer,
    iconColor: "text-teal-400",
    iconBg: "from-teal-500/20 to-teal-500/5",
    title: "Built-in focus tools",
    persona: "Learner",
    description:
      "Pomodoro timer, distraction-free study mode, and auto-play next lesson. Everything you need to stay focused.",
  },
];

const firstRow = USE_CASES.slice(0, 5);
const secondRow = USE_CASES.slice(5);

function UseCaseCard({ useCase }: { useCase: UseCase }) {
  return (
    <div className="mx-2 w-[280px] shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:w-[320px]">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${useCase.iconBg}`}
        >
          <useCase.icon className={`size-4 ${useCase.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{useCase.title}</p>
          <p className="text-[11px] text-white/40">{useCase.persona}</p>
        </div>
      </div>
      <p className="mt-3.5 text-[13px] leading-relaxed text-white/55">{useCase.description}</p>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <div className="mx-auto mb-14 max-w-6xl px-4 text-center sm:px-6">
        <BlurFade delay={0} inView>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            What you can do with{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              LearnerVerse
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/55 sm:text-lg">
            Real features for learners and creators. No gimmicks.
          </p>
        </BlurFade>
      </div>

      {/* Marquee rows */}
      <div className="flex flex-col gap-4">
        <Marquee pauseOnHover className="[--duration:50s]">
          {firstRow.map((uc) => (
            <UseCaseCard key={uc.title} useCase={uc} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:55s]">
          {secondRow.map((uc) => (
            <UseCaseCard key={uc.title} useCase={uc} />
          ))}
        </Marquee>
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030712] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030712] to-transparent" />
    </section>
  );
}
