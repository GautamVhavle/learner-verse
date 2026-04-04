/**
 * Pomodoro focus timer — header widget.
 *
 * Idle  → subtle icon button
 * Active → animated countdown pill with progress ring
 * Popover → clean preset grid / running-state controls
 * Persists to localStorage so it survives refreshes.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

/* ── Storage ───────────────────────────────────────── */

const LS_KEY = "pomodoro_timer";

interface StoredTimer {
  startedAt: number;
  durationMs: number;
  pausedRemaining?: number;
}

function load(): StoredTimer | null {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? (JSON.parse(r) as StoredTimer) : null;
  } catch {
    return null;
  }
}
function save(t: StoredTimer) {
  localStorage.setItem(LS_KEY, JSON.stringify(t));
}
function clear() {
  localStorage.removeItem(LS_KEY);
}
function remaining(t: StoredTimer) {
  return t.pausedRemaining != null
    ? t.pausedRemaining
    : Math.max(0, t.durationMs - (Date.now() - t.startedAt));
}

/* ── Format ────────────────────────────────────────── */

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function fmtDur(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min}m`;
}

/* ── Presets ────────────────────────────────────────── */

const PRESETS = [
  { label: "15", sub: "min", minutes: 15 },
  { label: "25", sub: "min", minutes: 25 },
  { label: "30", sub: "min", minutes: 30 },
  { label: "45", sub: "min", minutes: 45 },
  { label: "60", sub: "min", minutes: 60 },
  { label: "90", sub: "min", minutes: 90 },
];

/* ── Animated Icons (pure SVG, no extra deps) ──────── */

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="13" r="8" className="origin-center animate-[spin_20s_linear_infinite]" opacity="0.15" strokeDasharray="4 4" />
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 1h6" />
      <path d="M12 1v2" />
    </svg>
  );
}

function PulseRing({ size, progress, paused }: { size: number; progress: number; paused: boolean }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-border-default"
        strokeWidth="3"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-accent-purple"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      {/* Glow dot at tip */}
      {!paused && progress > 0.01 && progress < 0.99 && (
        <circle
          cx={size / 2 + r * Math.cos(2 * Math.PI * progress - Math.PI / 2)}
          cy={size / 2 + r * Math.sin(2 * Math.PI * progress - Math.PI / 2)}
          r="4"
          className="fill-accent-purple animate-pulse"
          opacity="0.5"
        />
      )}
    </svg>
  );
}

/* ── Component ─────────────────────────────────────── */

export function PomodoroTimer() {
  const [timer, setTimer] = useState<StoredTimer | null>(load);
  const [secLeft, setSecLeft] = useState(0);
  const [customMin, setCustomMin] = useState("");
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);

  const active = timer !== null;
  const paused = timer?.pausedRemaining != null;
  const progress = timer ? 1 - secLeft / (timer.durationMs / 1000) : 0;

  /* ── Tick ── */
  useEffect(() => {
    if (!timer) return void setSecLeft(0);
    const tick = () => {
      const ms = remaining(timer);
      setSecLeft(Math.ceil(ms / 1000));
      if (ms <= 0 && !doneRef.current) {
        doneRef.current = true;
        toast.success("Focus session complete!", {
          description: `You focused for ${fmtDur(timer.durationMs)}. Great work!`,
          duration: 8000,
        });
        clear();
        setTimer(null);
      }
    };
    tick();
    if (paused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer, paused]);

  /* ── Actions ── */
  const start = useCallback((min: number) => {
    const t: StoredTimer = { startedAt: Date.now(), durationMs: min * 60_000 };
    save(t);
    setTimer(t);
    doneRef.current = false;
    setOpen(false);
    setCustomMin("");
    toast("Focus timer started", { description: `${min} min · Stay focused!` });
  }, []);

  const pause = useCallback(() => {
    if (!timer) return;
    const t = { ...timer, pausedRemaining: remaining(timer) };
    save(t);
    setTimer(t);
  }, [timer]);

  const resume = useCallback(() => {
    if (!timer?.pausedRemaining) return;
    const t: StoredTimer = { startedAt: Date.now(), durationMs: timer.pausedRemaining };
    save(t);
    setTimer(t);
    doneRef.current = false;
  }, [timer]);

  const cancel = useCallback(() => {
    if (!timer) return;
    const elapsed = timer.durationMs - remaining(timer);
    clear();
    setTimer(null);
    toast("Timer cancelled", {
      description: elapsed > 30_000 ? `You focused for ${fmtDur(elapsed)}.` : undefined,
    });
  }, [timer]);

  const startCustom = () => {
    const v = parseInt(customMin, 10);
    if (v > 0 && v <= 480) start(v);
  };

  /* ── Mini ring for header badge ── */
  const miniR = 7;
  const miniC = 2 * Math.PI * miniR;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {active ? (
          <button
            className="group relative flex h-8 items-center gap-2 rounded-full border border-accent-purple/30 bg-accent-purple/[0.06] px-1 pr-2.5 text-xs font-semibold tabular-nums text-accent-purple transition-all duration-300 hover:border-accent-purple/50 hover:bg-accent-purple/10"
            aria-label="Focus timer"
          >
            {/* Breathing glow behind pill */}
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                boxShadow: "0 0 12px color-mix(in srgb, var(--color-accent-purple) 25%, transparent)",
              }}
            />

            {/* Mini ring */}
            <span className="flex size-6 items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
                <circle cx="9" cy="9" r={miniR} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
                <circle
                  cx="9" cy="9" r={miniR}
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray={miniC}
                  strokeDashoffset={miniC * (1 - progress)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
            </span>

            <span>{fmt(secLeft)}</span>

            {paused && (
              <span className="rounded bg-accent-purple/15 px-1 py-px text-[9px] font-bold uppercase tracking-widest">
                paused
              </span>
            )}
          </button>
        ) : (
          <button
            className="group flex size-8 items-center justify-center rounded-lg border border-border-default bg-bg-secondary text-text-tertiary transition-all duration-200 hover:border-border-hover hover:text-text-secondary"
            aria-label="Focus timer"
          >
            <TimerIcon className="size-4 transition-transform duration-200 group-hover:scale-110" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[280px] overflow-hidden rounded-xl p-0">
        {active ? (
          /* ═══ Running / Paused ═══ */
          <div className="flex flex-col items-center px-5 pb-5 pt-6">
            {/* Ring */}
            <div className="relative mb-4 flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <PulseRing size={120} progress={progress} paused={paused} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-text-primary">
                  {fmt(secLeft)}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-text-tertiary">
                  {paused ? "paused" : "remaining"}
                </span>
              </div>
            </div>

            {/* Session info */}
            <p className="mb-5 text-[11px] font-medium text-text-secondary">
              {fmtDur(timer.durationMs)} focus session
            </p>

            {/* Controls */}
            <div className="flex w-full gap-2">
              <button
                onClick={paused ? resume : pause}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default text-xs font-medium text-text-primary transition-all duration-200 hover:bg-bg-tertiary active:scale-[0.97]"
              >
                {paused ? (
                  <>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3">
                      <path d="M4 2.5l9 5.5-9 5.5z" />
                    </svg>
                    Resume
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="size-3">
                      <rect x="3" y="2" width="3.5" height="12" rx="1" />
                      <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                    </svg>
                    Pause
                  </>
                )}
              </button>
              <button
                onClick={() => { cancel(); setOpen(false); }}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent-red/20 text-xs font-medium text-accent-red transition-all duration-200 hover:bg-accent-red/[0.06] active:scale-[0.97]"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ═══ Picker ═══ */
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-border-default px-4 py-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent-purple/10">
                <TimerIcon className="size-3.5 text-accent-purple" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">Focus Timer</p>
                <p className="text-[11px] text-text-tertiary">Pick a duration to start</p>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => start(p.minutes)}
                  className="group/p flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border border-border-default transition-all duration-200 hover:border-accent-purple/40 hover:bg-accent-purple/[0.04] hover:shadow-sm active:scale-[0.96]"
                >
                  <span className="text-sm font-bold text-text-primary transition-colors group-hover/p:text-accent-purple">
                    {p.label}
                  </span>
                  <span className="text-[10px] font-medium text-text-tertiary">{p.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom */}
            <div className="flex gap-1.5 border-t border-border-default p-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={480}
                  placeholder="Custom"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startCustom()}
                  className="h-9 w-full rounded-lg border border-border-default bg-transparent px-3 pr-10 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/20 transition-all duration-200"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-tertiary">
                  min
                </span>
              </div>
              <button
                onClick={startCustom}
                disabled={!customMin || parseInt(customMin, 10) <= 0}
                className="flex h-9 items-center justify-center rounded-lg bg-accent-purple px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-accent-purple/90 active:scale-[0.96] disabled:opacity-30 disabled:pointer-events-none"
              >
                Start
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
