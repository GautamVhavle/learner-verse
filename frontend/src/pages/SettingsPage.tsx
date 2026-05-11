/**
 * Settings page - preferences, appearance, shortcuts, data, and danger zone.
 *
 * Profile editing is on a separate dedicated page (/profile).
 */
import { useCallback, useState } from "react";
import {
  Keyboard,
  Database,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
            className="text-text-tertiary hover:text-text-secondary inline-flex transition-colors"
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
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-2xl space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex items-start gap-3">
          <div className="bg-bg-tertiary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Settings className="text-text-secondary size-5" />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-semibold">Settings</h1>
            <p className="text-text-secondary mt-0.5 text-sm">
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
        <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <Monitor className="text-accent-blue size-4" />
            <h2 className="text-text-primary text-sm font-semibold">Appearance</h2>
            <HelpTip text="Changes apply instantly across the entire app." />
          </div>
          <p className="text-text-tertiary text-[11px] leading-relaxed">
            Choose a visual theme that suits your environment. Light mode works best during the day,
            while dark mode reduces eye strain at night.
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
                    ? "border-accent-blue bg-accent-blue/5 ring-accent-blue/30 ring-1"
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
                      theme === opt.value ? "text-accent-blue" : "text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <p className="text-text-tertiary text-[11px]">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Keyboard Shortcuts ────────────────────────────────── */}
        {!isMobile && (
          <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <Keyboard className="text-accent-green size-4" />
              <h2 className="text-text-primary text-sm font-semibold">Keyboard Shortcuts</h2>
              <HelpTip text="These work on any page - no need to click into a text field first." />
            </div>
            <p className="text-text-tertiary text-[11px] leading-relaxed">
              Speed up your workflow with these keyboard shortcuts. They work globally while
              studying lessons or browsing courses.
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
                  className="bg-bg-tertiary flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="text-text-secondary">{desc}</span>
                  <kbd className="border-border-default bg-bg-quaternary text-text-tertiary rounded border px-1.5 py-0.5 font-mono text-[10px]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Account Info ──────────────────────────────────────── */}
        <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <Shield className="text-accent-amber size-4" />
            <h2 className="text-text-primary text-sm font-semibold">Account</h2>
          </div>
          <p className="text-text-tertiary text-[11px] leading-relaxed">
            Your account details and login information. Email and sign-in method are managed through
            your identity provider.
          </p>
          <div className="space-y-3">
            <div className="bg-bg-tertiary flex items-center justify-between rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Mail className="text-text-tertiary size-3.5" />
                <span className="text-text-secondary text-xs">Email</span>
              </div>
              <span className="text-text-primary text-xs font-medium">{user.email}</span>
            </div>
            <div className="bg-bg-tertiary flex items-center justify-between rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="text-text-tertiary size-3.5" />
                <span className="text-text-secondary text-xs">Member since</span>
              </div>
              <span className="text-text-primary text-xs font-medium">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </span>
            </div>
            <div className="bg-bg-tertiary flex items-center justify-between rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Database className="text-text-tertiary size-3.5" />
                <span className="text-text-secondary text-xs">Storage</span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="text-accent-green text-xs font-medium">Cloud (Supabase)</span>
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
          <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
            <div className="flex items-center gap-2">
              {user.is_pro ? (
                <Crown className="text-accent-purple size-4" />
              ) : (
                <Sparkles className="text-accent-purple size-4" />
              )}
              <h2 className="text-text-primary text-sm font-semibold">Subscription</h2>
            </div>
            {user.is_pro ? (
              <div className="space-y-2">
                <p className="text-text-secondary text-xs">
                  <span className="text-accent-purple font-medium">LearnerVerse Pro</span>
                  {user.pro_plan && <span className="capitalize"> ({user.pro_plan})</span>}
                  {user.pro_expires_at && (
                    <>
                      {" "}
                      · Expires{" "}
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
                    className="bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
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
                <p className="text-text-secondary text-xs">
                  You're on the <span className="font-medium">Free</span> plan. Upgrade to unlock AI
                  features.
                </p>
                <a
                  href="/pricing"
                  className="bg-accent-purple hover:bg-accent-purple/90 inline-block rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  Upgrade to Pro
                </a>
              </div>
            )}
          </section>
        )}

        {/* ── Danger Zone ───────────────────────────────────────── */}
        <DangerZoneSection />

        <p className="text-text-tertiary text-center text-xs">Changes are saved automatically.</p>

        {/* Cancel Subscription Confirmation (only when payment gateway is enabled) */}
        {PAYMENT_GATEWAY_ENABLED && (
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-lg">
              <AlertDialogHeader className="border-border-default gap-3 border-b bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent px-6 py-5 text-left sm:place-items-start">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                    <Crown className="size-4 text-red-400" />
                  </div>
                  <div>
                    <AlertDialogTitle className="text-text-primary text-lg">
                      Cancel Subscription?
                    </AlertDialogTitle>
                    <p className="text-text-secondary mt-1 text-xs">
                      Before you go, we want you to know how much your support means to us.
                    </p>
                  </div>
                </div>
              </AlertDialogHeader>

              <div className="space-y-4 px-6 py-5">
                <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
                  If you cancel now, your Pro access will end immediately. Your courses, progress,
                  and certificates will stay safe in your account.
                </AlertDialogDescription>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="mb-2 text-xs font-semibold tracking-wider text-red-400 uppercase">
                    What changes right away
                  </p>
                  <ul className="text-text-secondary space-y-1.5 pl-4 text-sm">
                    <li className="list-disc">LiVi Chat will be locked</li>
                    <li className="list-disc">AI Quiz Generation will be locked</li>
                    <li className="list-disc">Smart Organize will be locked</li>
                    <li className="list-disc">Discussion AI features will be locked</li>
                  </ul>
                </div>

                <div className="border-accent-purple/20 bg-accent-purple/5 rounded-xl border p-4">
                  <p className="text-text-secondary flex items-start gap-2 text-sm leading-relaxed">
                    <Sparkles className="text-accent-purple mt-0.5 size-3.5 shrink-0" />
                    LearnerVerse is built with care for learners like you. If there is anything we
                    can improve to make Pro more valuable for you, we would truly love to hear it.
                  </p>
                </div>
              </div>

              <AlertDialogFooter className="bg-bg-secondary mx-0 mb-0 rounded-none px-6 py-4">
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
