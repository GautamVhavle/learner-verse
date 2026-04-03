/**
 * Settings page — preferences, appearance, shortcuts, data, and about.
 *
 * Profile editing is on a separate dedicated page (/profile).
 */
import { useCallback } from "react";
import {
  Keyboard,
  Database,
  Info,
  Calendar,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { useUserQuery, useUpdateUserMutation } from "@/hooks/useUser";
import { useThemeStore, type Theme } from "@/stores/themeStore";
import { usePlatform } from "@/hooks/usePlatform";
import type { UserSettings } from "@/types/user";

export default function SettingsPage() {
  const { data: user, isLoading } = useUserQuery();
  const update = useUpdateUserMutation();
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your preferences.
        </p>
      </div>

      {/* Preferences (timezone, playback speed, font size) */}
      <PreferencesSection
        timezone={user.timezone}
        playbackSpeed={user.playback_speed}
        fontSize={user.font_size}
        onSave={(data) => save(data)}
      />

      {/* Appearance (theme toggle) */}
      <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-center gap-2">
          <Monitor className="size-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">Appearance</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { value: "light" as Theme, label: "Light", icon: Sun, description: "Bright and clean" },
            { value: "dark" as Theme, label: "Dark", icon: Moon, description: "Easy on the eyes" },
          ]).map((opt) => (
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
              <div className={`flex size-9 items-center justify-center rounded-lg ${
                theme === opt.value
                  ? "bg-accent-blue/10 text-accent-blue"
                  : "bg-bg-quaternary text-text-tertiary"
              }`}>
                <opt.icon className="size-4" />
              </div>
              <div>
                <span className={`text-sm font-medium ${
                  theme === opt.value ? "text-accent-blue" : "text-text-primary"
                }`}>
                  {opt.label}
                </span>
                <p className="text-[11px] text-text-tertiary">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Keyboard Shortcuts reference — hidden on mobile */}
      {!isMobile && (
      <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-center gap-2">
          <Keyboard className="size-4 text-accent-green" />
          <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
        </div>
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
            <div key={key} className="flex items-center justify-between rounded-md bg-bg-tertiary px-3 py-2">
              <span className="text-text-secondary">{desc}</span>
              <kbd className="rounded border border-border-default bg-bg-quaternary px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Data section */}
      <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-accent-amber" />
          <h2 className="text-sm font-semibold text-text-primary">Data</h2>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Account created</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar className="size-3" />
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown"}
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">About</h2>
        </div>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <p>
            <span className="font-medium text-text-primary">Learner Verse</span>{" "}
            — Personal Learning Management System
          </p>
          <p>Version 1.0.0 (MVP)</p>
          <p className="text-text-tertiary">
            Built with React, FastAPI, and PostgreSQL.
          </p>
        </div>
      </section>

      <p className="text-center text-xs text-text-tertiary">
        Changes are saved automatically.
      </p>
    </div>
  );
}
