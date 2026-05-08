/**
 * Settings page — preferences, appearance, shortcuts, data, danger zone, and about.
 *
 * Profile editing is on a separate dedicated page (/profile).
 */
import { useCallback, useState } from "react";
import {
  Keyboard,
  Database,
  Info,
  Calendar,
  Loader2,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Settings,
  Mail,
  Shield,
  Sparkles,
  Crown,
} from "lucide-react";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { useUserQuery, useUpdateUserMutation } from "@/hooks/useUser";
import { PAYMENT_GATEWAY_ENABLED } from "@/lib/payment";
import { useCancelSubscriptionMutation } from "@/hooks/useSubscription";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { useThemeStore, type Theme } from "@/stores/themeStore";
import { usePlatform } from "@/hooks/usePlatform";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { UserSettings } from "@/types/user";

/** Reusable tooltip icon for inline help. */
function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <HelpCircle className="size-3.5" />
          </button>
        }
      />
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function SettingsPage() {
  const { data: user, isLoading } = useUserQuery();
  const update = useUpdateUserMutation();
  const cancelSub = useCancelSubscriptionMutation();
  const navigate = useModeAwareNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const { isMobile, mod, shift } = usePlatform();

  const save = useCallback(
    (data: Partial<UserSettings>) => {
      update.mutate(data);
    },
    [update],
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-2xl space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary">
            <Settings className="size-5 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Settings
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Manage your preferences, appearance, and account.
            </p>
          </div>
        </div>

        {/* ── Learning Preferences ──────────────────────────────── */}
        <PreferencesSection
          timezone={user.timezone}
          playbackSpeed={user.playback_speed}
          fontSize={user.font_size}
          autoPlayNext={user.auto_play_next ?? true}
          onSave={(data) => save(data)}
        />

        {/* ── Appearance ────────────────────────────────────────── */}
        <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">
              Appearance
            </h2>
            <HelpTip text="Changes apply instantly across the entire app." />
          </div>
          <p className="text-[11px] leading-relaxed text-text-tertiary">
            Choose a visual theme that suits your environment. Light mode works best during the day, while dark mode reduces eye strain at night.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: "light" as Theme,
                  label: "Light",
                  icon: Sun,
                  description: "Bright and clean for daytime",
                },
                {
                  value: "dark" as Theme,
                  label: "Dark",
                  icon: Moon,
                  description: "Easy on the eyes at night",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                data-testid={`theme-${opt.value}`}
                className={`group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  theme === opt.value
                    ? "border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue/30"
                    : "border-border-default bg-bg-tertiary hover:border-border-hover"
                }`}
              >
                <div
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    theme === opt.value
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "bg-bg-quaternary text-text-tertiary"
                  }`}
                >
                  <opt.icon className="size-4" />
                </div>
                <div>
                  <span
                    className={`text-sm font-medium ${
                      theme === opt.value
                        ? "text-accent-blue"
                        : "text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <p className="text-[11px] text-text-tertiary">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Keyboard Shortcuts ────────────────────────────────── */}
        {!isMobile && (
          <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
            <div className="flex items-center gap-2">
              <Keyboard className="size-4 text-accent-green" />
              <h2 className="text-sm font-semibold text-text-primary">
                Keyboard Shortcuts
              </h2>
              <HelpTip text="These work on any page — no need to click into a text field first." />
            </div>
            <p className="text-[11px] leading-relaxed text-text-tertiary">
              Speed up your workflow with these keyboard shortcuts. They work globally while studying lessons or browsing courses.
            </p>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              {[
                [`${mod} K`, "Search"],
                [`${mod} ${shift} C`, "Toggle Creator / Learner"],
                ["F", "Focus mode (study view)"],
                ["N / →", "Next lesson"],
                ["P / ←", "Previous lesson"],
                ["M", "Mark lesson complete"],
                ["?", "Show all shortcuts"],
                ["Esc", "Exit focus / close modal"],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md bg-bg-tertiary px-3 py-2"
                >
                  <span className="text-text-secondary">{desc}</span>
                  <kbd className="rounded border border-border-default bg-bg-quaternary px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Account Info ──────────────────────────────────────── */}
        <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-accent-amber" />
            <h2 className="text-sm font-semibold text-text-primary">
              Account
            </h2>
          </div>
          <p className="text-[11px] leading-relaxed text-text-tertiary">
            Your account details and login information. Email and sign-in method are managed through your identity provider.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-text-tertiary" />
                <span className="text-xs text-text-secondary">Email</span>
              </div>
              <span className="text-xs font-medium text-text-primary">
                {user.email}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-text-tertiary" />
                <span className="text-xs text-text-secondary">
                  Member since
                </span>
              </div>
              <span className="text-xs font-medium text-text-primary">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Database className="size-3.5 text-text-tertiary" />
                <span className="text-xs text-text-secondary">Storage</span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="text-xs font-medium text-accent-green">
                      Cloud (Supabase)
                    </span>
                  }
                />
                <TooltipContent side="left">
                  Your data is stored securely in the cloud and synced across devices.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* ── Subscription (only when payment gateway is enabled) ── */}
        {PAYMENT_GATEWAY_ENABLED && (
        <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            {user.is_pro ? (
              <Crown className="size-4 text-accent-purple" />
            ) : (
              <Sparkles className="size-4 text-accent-purple" />
            )}
            <h2 className="text-sm font-semibold text-text-primary">
              Subscription
            </h2>
          </div>
          {user.is_pro ? (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                <span className="font-medium text-accent-purple">LearnerVerse Pro</span>
                {user.pro_plan && (
                  <span className="capitalize"> ({user.pro_plan})</span>
                )}
                {user.pro_expires_at && (
                  <> · Expires{" "}
                    {new Date(user.pro_expires_at).toLocaleDateString("en-IN", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => navigate("/renew")}
                  className="rounded-lg bg-accent-purple/10 px-3 py-1.5 text-xs font-medium text-accent-purple transition-colors hover:bg-accent-purple/20"
                >
                  Manage / Renew
                </button>
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                You're on the <span className="font-medium">Free</span> plan.
                Upgrade to unlock AI features.
              </p>
              <a
                href="/pricing"
                className="inline-block rounded-lg bg-accent-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-purple/90"
              >
                Upgrade to Pro
              </a>
            </div>
          )}
        </section>
        )}

        {/* ── Danger Zone ───────────────────────────────────────── */}
        <DangerZoneSection />

        {/* ── About ─────────────────────────────────────────────── */}
        <section className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">About</h2>
          </div>
          <div className="space-y-1.5 text-xs text-text-secondary">
            <p>
              <span className="font-medium text-text-primary">
                Learner Verse
              </span>{" "}
              — Personal Learning Management System
            </p>
            <p>Version 1.0.0 (MVP)</p>
            <p className="text-text-tertiary">
              Built with ❤️ by Gautam Vhavle for all the learning community
            </p>
          </div>
        </section>

        <p className="text-center text-xs text-text-tertiary">
          Changes are saved automatically.
        </p>

        {/* Cancel Subscription Confirmation (only when payment gateway is enabled) */}
        {PAYMENT_GATEWAY_ENABLED && (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-lg">
            <AlertDialogHeader className="gap-3 border-b border-border-default bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent px-6 py-5 text-left sm:place-items-start">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                  <Crown className="size-4 text-red-400" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg text-text-primary">
                    Cancel Subscription?
                  </AlertDialogTitle>
                  <p className="mt-1 text-xs text-text-secondary">
                    Before you go, we want you to know how much your support means to us.
                  </p>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="space-y-4 px-6 py-5">
              <AlertDialogDescription className="text-sm leading-relaxed text-text-secondary">
                If you cancel now, your Pro access will end immediately. Your courses,
                progress, and certificates will stay safe in your account.
              </AlertDialogDescription>

              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                  What changes right away
                </p>
                <ul className="space-y-1.5 pl-4 text-sm text-text-secondary">
                  <li className="list-disc">LiVi Chat will be locked</li>
                  <li className="list-disc">AI Quiz Generation will be locked</li>
                  <li className="list-disc">Smart Organize will be locked</li>
                  <li className="list-disc">Discussion AI features will be locked</li>
                </ul>
              </div>

              <div className="rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-4">
                <p className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
                  LearnerVerse is built with care for learners like you. If there is anything
                  we can improve to make Pro more valuable for you, we would truly love to hear it.
                </p>
              </div>
            </div>

            <AlertDialogFooter className="mx-0 mb-0 rounded-none bg-bg-secondary px-6 py-4">
              <AlertDialogCancel>Keep Pro</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  cancelSub.mutate(undefined, {
                    onSuccess: () => {
                      toast.success("Subscription cancelled");
                      setShowCancelDialog(false);
                    },
                    onError: () => toast.error("Failed to cancel. Please try again."),
                  });
                }}
              >
                {cancelSub.isPending ? "Cancelling..." : "Yes, Cancel Subscription"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}
      </div>
    </TooltipProvider>
  );
}
