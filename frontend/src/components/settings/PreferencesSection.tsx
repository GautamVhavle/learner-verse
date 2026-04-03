/**
 * Preferences section of the settings page.
 *
 * Contains timezone selector with auto-detection, playback speed picker,
 * and font size options. Each control auto-saves on selection/change.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Gauge, Type, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import {
  detectTimezone,
  getSortedTimezones,
  filterTimezones,
  formatTimezoneDisplay,
  getTimezoneInfo,
} from "@/lib/timezone";
import type { UserSettings } from "@/types/user";

const SORTED_TIMEZONES = getSortedTimezones();
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
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [showAutoDetectPrompt, setShowAutoDetectPrompt] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with server data
  useEffect(() => {
    setTimezone(initialTimezone);
    setPlaybackSpeed(initialSpeed);
    setFontSize(initialFontSize);
    applyFontSize(initialFontSize);
  }, [initialTimezone, initialSpeed, initialFontSize]);

  // Auto-detect timezone on mount (only if initialTimezone is UTC, likely default)
  useEffect(() => {
    if (initialTimezone === "UTC") {
      const detected = detectTimezone();
      if (detected && detected !== "UTC") {
        setShowAutoDetectPrompt(true);
      }
    }
  }, [initialTimezone]);

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
      setIsAutoDetected(false);
      setShowAutoDetectPrompt(false);
      save({ timezone: tz }, "timezone");
    },
    [save],
  );

  const handleAutoDetect = useCallback(() => {
    const detected = detectTimezone();
    if (detected) {
      setTimezone(detected);
      setIsAutoDetected(true);
      setShowAutoDetectPrompt(false);
      setTzSearch("");
      save({ timezone: detected }, "timezone");
    }
  }, [save]);

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

  const filteredTimezones = filterTimezones(tzSearch, SORTED_TIMEZONES);
  const displayedTimezones = tzSearch ? filteredTimezones : SORTED_TIMEZONES;

  return (
    <section className="space-y-5 rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-accent-purple" />
        <h2 className="text-sm font-semibold text-text-primary">Preferences</h2>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Globe className="size-3" />
            Timezone
          </label>
          <div className="flex items-center gap-2">
            {isAutoDetected && (
              <div className="flex items-center gap-1 rounded-full bg-accent-green/10 px-2 py-0.5">
                <Zap className="size-2.5 text-accent-green" />
                <span className="text-[11px] font-medium text-accent-green">Auto-detected</span>
              </div>
            )}
            <SettingsSaveIndicator visible={savedField === "timezone"} />
          </div>
        </div>

        {/* Auto-detect prompt */}
        {showAutoDetectPrompt && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-blue/5 border border-accent-blue/20 px-3 py-2">
            <Zap className="size-3.5 text-accent-blue flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-text-primary font-medium">
                Detected: {formatTimezoneDisplay(detectTimezone())}
              </p>
              <p className="text-xs text-text-tertiary">Use your device timezone?</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAutoDetectPrompt(false)}
                className="h-6 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAutoDetect}
                className="h-6 text-xs bg-accent-blue hover:bg-accent-blue/90"
              >
                Use
              </Button>
            </div>
          </div>
        )}

        <div className="relative max-w-sm" ref={tzDropdownRef}>
          <button
            type="button"
            onClick={() => setTzOpen(!tzOpen)}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm text-text-primary transition-colors hover:border-border-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            data-testid="settings-timezone-trigger"
          >
            <span className="truncate flex-1 text-left">{formatTimezoneDisplay(timezone)}</span>
            <svg className="size-4 text-text-tertiary flex-shrink-0 ml-2" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {tzOpen && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border-default bg-bg-primary shadow-lg">
              <div className="sticky top-0 bg-bg-primary border-b border-border-default p-2 z-10">
                <div className="relative">
                  <Input
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    placeholder="Search or type timezone..."
                    autoFocus
                    className="h-8 text-xs pl-3 pr-3"
                    data-testid="settings-timezone-search"
                  />
                  {tzSearch && (
                    <button
                      type="button"
                      onClick={() => setTzSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {showAutoDetectPrompt === false && !tzSearch && (
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    className="mt-2 w-full flex items-center gap-2 rounded-md bg-accent-blue/10 hover:bg-accent-blue/20 px-2.5 py-2 text-left text-xs font-medium text-accent-blue transition-colors"
                  >
                    <Zap className="size-3" />
                    Use My Device Timezone
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {displayedTimezones.length > 0 ? (
                  displayedTimezones.map((tz) => {
                    const info = getTimezoneInfo(tz);
                    return (
                      <button
                        key={tz}
                        onClick={() => handleTimezoneSelect(tz)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          tz === timezone
                            ? "bg-accent-blue/10 text-accent-blue"
                            : "text-text-secondary hover:bg-bg-tertiary"
                        }`}
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="font-medium">{info.name}</div>
                          {info.offset && (
                            <div className="text-[10px] text-text-tertiary">{info.offset}</div>
                          )}
                        </div>
                        {tz === timezone && <Check className="size-4 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-center text-xs text-text-tertiary">
                    No timezones found for "{tzSearch}"
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
