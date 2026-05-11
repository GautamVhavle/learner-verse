/**
 * About LearnerVerse - a rich, heartfelt dialog showcasing the
 * platform's story, tech stack, and a personal note from its creator.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heart,
  Youtube,
  Code2,
  Sparkles,
  Github,
  Globe,
  Brain,
  Award,
  BookOpen,
  Users,
  Server,
  ExternalLink,
} from "lucide-react";

const TECH_STACK = [
  { label: "React 19", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { label: "TypeScript", color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Tailwind CSS", color: "text-sky-400", bg: "bg-sky-500/10" },
  { label: "FastAPI", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "PostgreSQL", color: "text-blue-300", bg: "bg-blue-400/10" },
  { label: "LangChain", color: "text-purple-400", bg: "bg-purple-500/10" },
] as const;

const PLATFORM_HIGHLIGHTS = [
  { icon: BookOpen, label: "Self-paced learning", color: "text-blue-400" },
  { icon: Users, label: "Creator courses", color: "text-purple-400" },
  { icon: Brain, label: "AI-powered quizzes", color: "text-pink-400" },
  { icon: Sparkles, label: "LiVi AI companion", color: "text-amber-400" },
  { icon: Award, label: "Certificates", color: "text-emerald-400" },
  { icon: Server, label: "Self-hostable", color: "text-cyan-400" },
] as const;

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,_rgba(168,85,247,0.1)_0%,_transparent_70%)]" />
          <DialogHeader className="relative">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-lg">
                <img src="/logo.svg" alt="LearnerVerse" className="size-7" />
              </div>
              <div>
                <DialogTitle className="text-text-primary text-lg font-bold">
                  LearnerVerse
                </DialogTitle>
                <DialogDescription className="text-text-tertiary text-xs">
                  Personal Learning Management System
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                v1.0.0 (MVP)
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
                Open Source
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-purple-400">
                Free Forever
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* What is LearnerVerse */}
        <div className="space-y-4 px-6 py-5">
          <div>
            <h3 className="text-text-primary mb-2 text-sm font-semibold">What is LearnerVerse?</h3>
            <p className="text-text-secondary text-xs leading-relaxed">
              LearnerVerse turns YouTube into a real learning platform. Import any video or playlist
              and get a structured course with sections, AI-generated quizzes, progress tracking,
              study notes, and certificates. Or browse the Course Hub to enroll in curated courses
              published by educators and creators.
            </p>
          </div>

          {/* Platform highlights */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORM_HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="bg-bg-tertiary border-border-default flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <item.icon className={`size-3.5 shrink-0 ${item.color}`} />
                <span className="text-text-secondary text-[11px]">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <div>
            <h4 className="text-text-tertiary mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Built with
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech.label}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${tech.bg} ${tech.color}`}
                >
                  {tech.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* From the Creator */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="size-4 text-pink-400" />
            <h3 className="text-text-primary text-sm font-semibold">From the Creator</h3>
          </div>

          <div className="border-border-default bg-bg-tertiary rounded-xl border p-4">
            {/* Creator identity */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Code2 className="size-5 text-purple-400" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">Gautam Vhavle</p>
                <p className="text-text-tertiary text-[11px]">Creator & Developer</p>
              </div>
            </div>

            {/* The story */}
            <div className="text-text-secondary space-y-3 text-xs leading-relaxed">
              <p>
                Hey! I built LearnerVerse because I was frustrated with my own learning experience
                on YouTube. I would find incredible tutorials and playlists from amazing creators,
                but I had no way to track what I had watched, test my understanding, or feel any
                sense of completion. Dozens of browser tabs, no structure, no progress. The content
                was world-class, but the learning experience was broken.
              </p>
              <p>
                So I built this for myself first. A simple way to paste a YouTube link and turn it
                into a real course with sections, quizzes, progress tracking, and a certificate at
                the end. Then I added LiVi, an AI study companion that actually knows the content
                you are learning, not just generic responses.
              </p>
              <p>
                But this was never just about me. I love YouTube and the incredible community of
                creators who share their knowledge for free. I wanted to build something that gives
                back to that community. LearnerVerse lets educators structure their content as
                proper courses, see analytics, and give their students certificates. It is my way of
                saying thank you to every creator who has ever taught me something.
              </p>
              <p className="flex items-start gap-2">
                <Youtube className="mt-0.5 size-3.5 shrink-0 text-red-400" />
                <span>
                  This platform exists because YouTube creators changed my life. I hope LearnerVerse
                  helps them reach even more people and helps learners everywhere get more out of
                  the best educational content on the internet.
                </span>
              </p>
            </div>

            {/* Closing */}
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-text-tertiary flex items-center gap-1.5 text-[11px] italic">
                <Heart className="size-3 text-pink-400" />
                Built with love for the learning community
              </p>
            </div>
          </div>
        </div>

        {/* Links footer */}
        <div className="bg-bg-tertiary border-border-default flex items-center justify-between rounded-b-xl border-t px-6 py-3.5">
          <span className="text-text-tertiary text-[10px]">LearnerVerse v1.0.0</span>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/GautamVhavle/learner-verse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-text-primary flex items-center gap-1.5 text-[11px] transition-colors"
            >
              <Github className="size-3.5" />
              GitHub
              <ExternalLink className="size-2.5" />
            </a>
            <a
              href="https://learnerverse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-text-primary flex items-center gap-1.5 text-[11px] transition-colors"
            >
              <Globe className="size-3.5" />
              Website
              <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
