/**
 * Login page with Auth0 authentication buttons.
 * Redirects to dashboard if the user is already authenticated.
 */
import { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "motion/react";
import {
  Loader2,
  BookOpen,
  Brain,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Youtube,
  Shield,
  Code2,
} from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { WordRotate } from "@/components/ui/word-rotate";

const FEATURES = [
  { icon: BookOpen, label: "AI-Powered Courses", color: "text-accent-blue" },
  { icon: Brain, label: "Smart Organization", color: "text-accent-purple" },
  { icon: Target, label: "Track Progress", color: "text-accent-green" },
  { icon: Sparkles, label: "Earn Certificates", color: "text-accent-amber" },
];

const TRUST_SIGNALS = [
  { icon: Code2, label: "Open Source", color: "text-blue-400" },
  { icon: Shield, label: "Privacy-First", color: "text-emerald-400" },
  { icon: Youtube, label: "YouTube-Native", color: "text-red-400" },
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
      navigate("/learner", { replace: true });
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

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-[#863bff]/20 blur-[120px]" />
      <div className="bg-accent-blue/15 pointer-events-none absolute -right-40 -bottom-40 size-[400px] rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#863bff]/10 blur-[100px]" />

      {/* ── Left panel: Branding ── */}
      <div className="relative z-10 hidden flex-1 flex-col justify-between p-12 lg:flex">
        {/* Logo + back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <BrandLogo size="large" />
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
          >
            <ArrowLeft className="size-3" />
            Home
          </Link>
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

        {/* Trust signals footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-4">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal.label} className="flex items-center gap-1.5">
                <signal.icon className={`size-3.5 ${signal.color}`} />
                <span className="text-xs text-white/40">{signal.label}</span>
              </div>
            ))}
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
          {/* Mobile header: logo + back */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandLogo />
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
            >
              <ArrowLeft className="size-3" />
              Home
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Get started</h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-2 text-white/50"
            >
              Sign in or create an account to start learning
            </motion.p>
          </div>

          <div className="flex flex-col gap-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loginWithRedirect({ appState: { returnTo: "/learner" } })}
              className="group to-accent-blue flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#863bff] py-3.5 text-sm font-semibold text-white transition-shadow hover:shadow-lg hover:shadow-[#863bff]/25"
            >
              Sign In
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
                  appState: { returnTo: "/learner" },
                  authorizationParams: { screen_hint: "signup" },
                })
              }
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-white/10"
            >
              Create an Account
              <Sparkles className="text-accent-amber size-4 transition-transform group-hover:rotate-12" />
            </motion.button>
          </div>

          {/* Free & open source note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-6 text-center text-[11px] text-white/25"
          >
            Free & open source. No credit card required.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
