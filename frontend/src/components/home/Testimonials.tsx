/**
 * Testimonials section — dual-row infinite marquee of
 * learner and creator testimonial cards flowing in
 * opposite directions. Pauses on hover.
 */
import { Star } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { BlurFade } from "@/components/ui/blur-fade";

interface Testimonial {
  name: string;
  role: "Learner" | "Creator";
  avatar: string; // initials
  avatarColor: string;
  quote: string;
  stars: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Alex Chen",
    role: "Learner",
    avatar: "AC",
    avatarColor: "from-blue-500 to-cyan-500",
    quote:
      "LearnerVerse turned my chaotic YouTube habit into actual structured learning. The AI quizzes are a game changer.",
    stars: 5,
  },
  {
    name: "Sarah Kim",
    role: "Creator",
    avatar: "SK",
    avatarColor: "from-purple-500 to-pink-500",
    quote:
      "I built a full Python course from my playlist in 10 minutes. My students love the integrated quizzes and progress tracking.",
    stars: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Learner",
    avatar: "MJ",
    avatarColor: "from-orange-500 to-amber-500",
    quote:
      "The LiVi AI literally feels like having a tutor. I asked it to explain recursion and it used my lesson content perfectly.",
    stars: 5,
  },
  {
    name: "Priya Patel",
    role: "Creator",
    avatar: "PP",
    avatarColor: "from-emerald-500 to-teal-500",
    quote:
      "Course Hub let me share my curated ML curriculum with the world. Over 200 learners enrolled in the first week.",
    stars: 5,
  },
  {
    name: "Tom Wilson",
    role: "Learner",
    avatar: "TW",
    avatarColor: "from-red-500 to-rose-500",
    quote:
      "The streak system kept me accountable. 30 days in and I've actually finished an entire web dev curriculum for the first time.",
    stars: 4,
  },
  {
    name: "Lisa Zhang",
    role: "Creator",
    avatar: "LZ",
    avatarColor: "from-indigo-500 to-violet-500",
    quote:
      "Best course authoring tool I've used. The 'Organize with LiVi' feature magically restructured my messy playlist into logical sections.",
    stars: 5,
  },
  {
    name: "David Park",
    role: "Learner",
    avatar: "DP",
    avatarColor: "from-cyan-500 to-blue-500",
    quote:
      "Earned my first certificate and shared it on LinkedIn. The PDF generation is professional and the shareable link is brilliant.",
    stars: 5,
  },
  {
    name: "Emma Davis",
    role: "Learner",
    avatar: "ED",
    avatarColor: "from-pink-500 to-fuchsia-500",
    quote:
      "I love the Pomodoro timer built right into the study page. It's the small details that make this tool feel premium.",
    stars: 4,
  },
  {
    name: "Ryan O'Brien",
    role: "Creator",
    avatar: "RO",
    avatarColor: "from-amber-500 to-yellow-500",
    quote:
      "My analytics dashboard shows me exactly where learners drop off. I've improved my course completion rate by 40%.",
    stars: 5,
  },
  {
    name: "Nina Gupta",
    role: "Learner",
    avatar: "NG",
    avatarColor: "from-teal-500 to-green-500",
    quote:
      "Being able to switch between creator and learner mode is genius. I build courses for my students and take other courses myself.",
    stars: 5,
  },
];

const firstRow = TESTIMONIALS.slice(0, 5);
const secondRow = TESTIMONIALS.slice(5);

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="mx-2 w-[280px] shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:w-[320px] sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-9 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarColor} text-xs font-bold text-white`}
        >
          {t.avatar}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{t.name}</p>
          <p className="text-[11px] text-white/40">{t.role}</p>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-3 ${
                i < t.stars
                  ? "fill-amber-400 text-amber-400"
                  : "text-white/10"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-white/55">
        "{t.quote}"
      </p>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <div className="mx-auto mb-14 max-w-6xl px-4 text-center sm:px-6">
        <BlurFade delay={0} inView>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Loved by{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              learners & creators
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
            Join thousands of people transforming how they learn from YouTube.
          </p>
        </BlurFade>
      </div>

      {/* Marquee rows */}
      <div className="flex flex-col gap-4">
        <Marquee pauseOnHover className="[--duration:50s]">
          {firstRow.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:55s]">
          {secondRow.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </Marquee>
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030712] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030712] to-transparent" />
    </section>
  );
}
