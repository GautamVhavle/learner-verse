/**
 * Preferences section of the settings page.
 *
 * Contains timezone selector, playback speed picker, and font
 * size options. Each control auto-saves on selection/change.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Gauge, Type, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import type { UserSettings } from "@/types/user";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const FONT_SIZE_OPTIONS: { value: UserSettings["font_size"]; label: string; description: string }[] = [
  { value: "normal", label: "Normal", description: "Default size (16px)" },
  { value: "large", label: "Large", description: "Comfortable reading (18px)" },
  { value: "xl", label: "Extra Large", description: "Maximum readability (20px)" },
];

/** Apply font-size class to <html> element for immediate visual feedback. */
function applyFontSize(size: string) {
  const html = document.documentElement;
  html.classList.remove("font-large", "font-xl");
  if (size === "large") html.classList.add("font-large");
  else if (size === "xl") html.classList.add("font-xl");
}

/** Max items shown in timezone dropdown before scrolling. */
const TIMEZONE_DISPLAY_LIMIT = 50;

interface PreferencesSectionProps {
  timezone: string;
  playbackSpeed: number;
  fontSize: UserSettings["font_size"];
  onSave: (data: Partial<UserSettings>, field: string) => void;
}

export function PreferencesSection({
  timezone: initialTimezone,
  playbackSpeed: initialSpeed,
  fontSize: initialFontSize,
  onSave,
}: PreferencesSectionProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [tzSearch, setTzSearch] = useState("");
  const [tzOpen, setTzOpen] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const tzDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with server data
  useEffect(() => {
    setTimezone(initialTimezone);
    setPlaybackSpeed(initialSpeed);
    setFontSize(initialFontSize);
    applyFontSize(initialFontSize);
  }, [initialTimezone, initialSpeed, initialFontSize]);

  // Close timezone dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setTzOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showSaved = useCallback((field: string) => {
    setSavedField(field);
    setTimeout(() => setSavedField(null), 1500);
  }, []);

  const save = useCallback(
    (data: Partial<UserSettings>, field: string) => {
      onSave(data, field);
      showSaved(field);
    },
    [onSave, showSaved],
  );

  const handleTimezoneSelect = useCallback(
    (tz: string) => {
      setTimezone(tz);
      setTzOpen(false);
      setTzSearch("");
      save({ timezone: tz }, "timezone");
    },
    [save],
  );

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
      save({ playback_speed: speed }, "speed");
    },
    [save],
  );

  const handleFontSizeChange = useCallback(
    (size: UserSettings["font_size"]) => {
      setFontSize(size);
      applyFontSize(size);
      save({ font_size: size }, "fontSize");
    },
    [save],
  );

  const filteredTimezones = tzSearch
    ? TIMEZONES.filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
    : TIMEZONES;

  return (
    <section className="space-y-5 rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-accent-purple" />
        <h2 className="text-sm font-semibold text-text-primary">Preferences</h2>
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Globe className="size-3" />
            Timezone
          </label>
          <SettingsSaveIndicator visible={savedField === "timezone"} />
        </div>
        <div className="relative max-w-sm" ref={tzDropdownRef}>
          <button
            type="button"
            onClick={() => setTzOpen(!tzOpen)}
            className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm text-text-primary transition-colors hover:border-border-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            data-testid="settings-timezone-trigger"
          >
            <span className="truncate">{timezone.replace(/_/g, " ")}</span>
            <svg className="size-3.5 text-text-tertiary" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {tzOpen && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border-default bg-bg-primary shadow-lg">
              <div className="p-1.5">
                <Input
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                  placeholder="Search timezone…"
                  autoFocus
                  className="h-7 text-xs"
                  data-testid="settings-timezone-search"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredTimezones.slice(0, TIMEZONE_DISPLAY_LIMIT).map((tz) => (
                  <button
                    key={tz}
                    onClick={() => handleTimezoneSelect(tz)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-tertiary ${
                      tz === timezone ? "text-accent-blue" : "text-text-secondary"
                    }`}
                  >
                    <span>{tz.replace(/_/g, " ")}</span>
                    {tz === timezone && <Check className="size-3" />}
                  </button>
                ))}
                {filteredTimezones.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-text-tertiary">
                    No timezones found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Speed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Gauge className="size-3" />
            Default Playback Speed
          </label>
          <SettingsSaveIndicator visible={savedField === "speed"} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PLAYBACK_SPEEDS.map((speed) => (
            <Button
              key={speed}
              variant={speed === playbackSpeed ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeedChange(speed)}
              className={`min-w-[3.5rem] text-xs ${
                speed === playbackSpeed
                  ? "bg-accent-blue text-white hover:bg-accent-blue/90"
                  : ""
              }`}
              data-testid={`speed-${speed}`}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Type className="size-3" />
            Font Size
          </label>
          <SettingsSaveIndicator visible={savedField === "fontSize"} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {FONT_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFontSizeChange(opt.value)}
              data-testid={`font-${opt.value}`}
              className={`group relative rounded-lg border p-3 text-left transition-all ${
                fontSize === opt.value
                  ? "border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue/30"
                  : "border-border-default bg-bg-tertiary hover:border-border-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    fontSize === opt.value ? "text-accent-blue" : "text-text-primary"
                  }`}
                >
                  {opt.label}
                </span>
                {fontSize === opt.value && (
                  <Check className="size-3.5 text-accent-blue" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
