/**
 * Login page with Auth0 authentication buttons.
 * Redirects to dashboard if the user is already authenticated.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "motion/react";
import { Loader2, BookOpen, Brain, Target, Sparkles, ArrowRight } from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { BorderBeam } from "@/components/ui/border-beam";
import { WordRotate } from "@/components/ui/word-rotate";
import { TextAnimate } from "@/components/ui/text-animate";

const FEATURES = [
  { icon: BookOpen, label: "AI-Powered Courses", color: "text-accent-blue" },
  { icon: Brain, label: "Smart Organization", color: "text-accent-purple" },
  { icon: Target, label: "Track Progress", color: "text-accent-green" },
  { icon: Sparkles, label: "Earn Certificates", color: "text-accent-amber" },
];

function BrandLogo({ size = "default" }: { size?: "default" | "large" }) {
  const imgClass = size === "large" ? "size-10" : "size-8";
  return (
    <div className="flex items-center gap-3">
      <motion.img
        src="/logo.svg"
        alt=""
        className={imgClass}
        initial={{ rotate: -10, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      />
      <span className="text-lg font-semibold text-white">Learner Verse</span>
    </div>
  );
}

export default function LoginPage() {
  const { loginWithRedirect, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/creator", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="bg-bg-root flex min-h-screen items-center justify-center">
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030712]">
      {/* Background particles */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={80}
        color="#6366f1"
        staticity={30}
        ease={50}
        size={0.5}
      />

      {/* Gradient orbs — match brand purple (#863bff) */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-[#863bff]/20 blur-[120px]" />
      <div className="bg-accent-blue/15 pointer-events-none absolute -right-40 -bottom-40 size-[400px] rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#863bff]/10 blur-[100px]" />

      {/* ── Left panel: Branding ── */}
      <div className="relative z-10 hidden flex-1 flex-col justify-between p-12 lg:flex">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BrandLogo size="large" />
        </motion.div>

        {/* Center content */}
        <div className="max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-white xl:text-5xl">
              Your learning
              <br />
              journey{" "}
              <WordRotate
                words={["starts here", "reimagined", "simplified", "amplified"]}
                duration={3000}
                className="via-accent-blue inline-block bg-gradient-to-r from-[#863bff] to-[#863bff] bg-clip-text text-transparent"
              />
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-lg leading-relaxed text-white/60"
          >
            Transform any playlist into a structured course. Let AI organize your content, track
            your progress, and earn certificates along the way.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
              >
                <f.icon className={`size-4 ${f.color}`} />
                <span className="text-sm text-white/80">{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Social proof + footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex -space-x-2">
              {["bg-accent-blue", "bg-accent-purple", "bg-accent-green", "bg-accent-amber"].map(
                (bg, i) => (
                  <div key={i} className={`size-7 rounded-full ${bg} ring-2 ring-[#030712]`} />
                ),
              )}
            </div>
            <p className="text-sm text-white/50">Join learners turning playlists into progress</p>
          </div>
          <p className="text-sm text-white/30">learnerverse.xyz</p>
        </motion.div>
      </div>

      {/* ── Right panel: Auth card ── */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10"
        >
          <BorderBeam size={200} duration={8} colorFrom="#863bff" colorTo="#3b82f6" />

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>

          <div className="mb-8">
            <TextAnimate
              as="h2"
              animation="blurInUp"
              by="word"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              Welcome back
            </TextAnimate>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-2 text-white/50"
            >
              Sign in to continue your learning journey
            </motion.p>
          </div>

          <div className="flex flex-col gap-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loginWithRedirect({ appState: { returnTo: "/creator" } })}
              className="group to-accent-blue flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#863bff] py-3.5 text-sm font-semibold text-white transition-shadow hover:shadow-lg hover:shadow-[#863bff]/25"
            >
              Continue with Log In
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                loginWithRedirect({
                  appState: { returnTo: "/creator" },
                  authorizationParams: { screen_hint: "signup" },
                })
              }
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-white/10"
            >
              Create an Account
              <Sparkles className="text-accent-amber size-4 transition-transform group-hover:rotate-12" />
            </motion.button>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-8 flex items-center gap-3 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10"
          >
            <span className="text-xs text-white/30">or explore first</span>
          </motion.div>

          {/* What you get */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            {[
              { icon: "⚡", label: "Instant Import", sub: "YouTube playlists" },
              { icon: "🧠", label: "AI Organize", sub: "Smart sections" },
              { icon: "🏆", label: "Certificates", sub: "Share progress" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center"
              >
                <div className="text-lg">{item.icon}</div>
                <div className="mt-1 text-xs font-medium text-white/70">{item.label}</div>
                <div className="text-[10px] text-white/30">{item.sub}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
