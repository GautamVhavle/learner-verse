/**
 * Preferences section of the settings page.
 *
 * Contains timezone selector with auto-detection, playback speed picker,
 * and font size options. Each control auto-saves on selection/change.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Gauge, Type, Check, Zap, Play, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

const FONT_SIZE_OPTIONS: {
  value: UserSettings["font_size"];
  label: string;
  description: string;
}[] = [
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
  autoPlayNext: boolean;
  onSave: (data: Partial<UserSettings>, field: string) => void;
}

export function PreferencesSection({
  timezone: initialTimezone,
  playbackSpeed: initialSpeed,
  fontSize: initialFontSize,
  autoPlayNext: initialAutoPlay,
  onSave,
}: PreferencesSectionProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [autoPlayNext, setAutoPlayNext] = useState(initialAutoPlay);
  const [tzSearch, setTzSearch] = useState("");
  const [tzOpen, setTzOpen] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [showAutoDetectPrompt, setShowAutoDetectPrompt] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with server data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTimezone(initialTimezone);
    setPlaybackSpeed(initialSpeed);
    setFontSize(initialFontSize);
    applyFontSize(initialFontSize);
    setAutoPlayNext(initialAutoPlay);
  }, [initialTimezone, initialSpeed, initialFontSize, initialAutoPlay]);

  // Auto-detect timezone on mount (only if initialTimezone is UTC, likely default)
  useEffect(() => {
    if (initialTimezone === "UTC") {
      const detected = detectTimezone();
      if (detected && detected !== "UTC") {
        setShowAutoDetectPrompt(true);
      }
    }
  }, [initialTimezone]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handleAutoPlayToggle = useCallback(() => {
    const next = !autoPlayNext;
    setAutoPlayNext(next);
    save({ auto_play_next: next }, "autoPlay");
  }, [autoPlayNext, save]);

  const filteredTimezones = filterTimezones(tzSearch, SORTED_TIMEZONES);
  const displayedTimezones = tzSearch ? filteredTimezones : SORTED_TIMEZONES;

  return (
    <section className="border-border-default bg-bg-secondary space-y-5 rounded-xl border p-5">
      <div>
        <div className="flex items-center gap-2">
          <Gauge className="text-accent-purple size-4" />
          <h2 className="text-text-primary text-sm font-semibold">Learning Preferences</h2>
        </div>
        <p className="text-text-tertiary mt-1 text-[11px] leading-relaxed">
          Customize how you learn - set your timezone, video speed, text size, and auto-advance
          behavior.
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-text-secondary flex items-center gap-1.5 text-xs font-medium">
            <Globe className="size-3" />
            Timezone
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-text-tertiary hover:text-text-secondary inline-flex transition-colors"
                  >
                    <HelpCircle className="size-3" />
                  </button>
                }
              />
              <TooltipContent side="top">
                Used for streak calculations and activity timestamps.
              </TooltipContent>
            </Tooltip>
          </label>
          <div className="flex items-center gap-2">
            {isAutoDetected && (
              <div className="bg-accent-green/10 flex items-center gap-1 rounded-full px-2 py-0.5">
                <Zap className="text-accent-green size-2.5" />
                <span className="text-accent-green text-[11px] font-medium">Auto-detected</span>
              </div>
            )}
            <SettingsSaveIndicator visible={savedField === "timezone"} />
          </div>
        </div>

        {/* Auto-detect prompt */}
        {showAutoDetectPrompt && (
          <div className="bg-accent-blue/5 border-accent-blue/20 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Zap className="text-accent-blue size-3.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-text-primary text-xs font-medium">
                Detected: {formatTimezoneDisplay(detectTimezone())}
              </p>
              <p className="text-text-tertiary text-xs">Use your device timezone?</p>
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
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
                className="bg-accent-blue hover:bg-accent-blue/90 h-6 text-xs"
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
            className="border-input text-text-primary hover:border-border-hover focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between rounded-lg border bg-transparent px-3 text-sm transition-colors focus-visible:ring-3"
            data-testid="settings-timezone-trigger"
          >
            <span className="flex-1 truncate text-left">{formatTimezoneDisplay(timezone)}</span>
            <svg
              className="text-text-tertiary ml-2 size-4 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {tzOpen && (
            <div className="border-border-default bg-bg-primary absolute top-full z-50 mt-1 w-full rounded-lg border shadow-lg">
              <div className="bg-bg-primary border-border-default sticky top-0 z-10 border-b p-2">
                <div className="relative">
                  <Input
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    placeholder="Search or type timezone..."
                    autoFocus
                    className="h-8 pr-3 pl-3 text-xs"
                    data-testid="settings-timezone-search"
                  />
                  {tzSearch && (
                    <button
                      type="button"
                      onClick={() => setTzSearch("")}
                      className="text-text-tertiary hover:text-text-secondary absolute top-1/2 right-2 -translate-y-1/2"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {showAutoDetectPrompt === false && !tzSearch && (
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    className="bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors"
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
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          tz === timezone
                            ? "bg-accent-blue/10 text-accent-blue"
                            : "text-text-secondary hover:bg-bg-tertiary"
                        }`}
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="font-medium">{info.name}</div>
                          {info.offset && (
                            <div className="text-text-tertiary text-[10px]">{info.offset}</div>
                          )}
                        </div>
                        {tz === timezone && <Check className="ml-2 size-4 flex-shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-text-tertiary px-3 py-4 text-center text-xs">
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
          <label className="text-text-secondary flex items-center gap-1.5 text-xs font-medium">
            <Gauge className="size-3" />
            Default Playback Speed
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-text-tertiary hover:text-text-secondary inline-flex transition-colors"
                  >
                    <HelpCircle className="size-3" />
                  </button>
                }
              />
              <TooltipContent side="top">
                This speed will be applied to all video lessons by default.
              </TooltipContent>
            </Tooltip>
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
                speed === playbackSpeed ? "bg-accent-blue hover:bg-accent-blue/90 text-white" : ""
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
          <label className="text-text-secondary flex items-center gap-1.5 text-xs font-medium">
            <Type className="size-3" />
            Font Size
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-text-tertiary hover:text-text-secondary inline-flex transition-colors"
                  >
                    <HelpCircle className="size-3" />
                  </button>
                }
              />
              <TooltipContent side="top">
                Adjusts text size across the entire app for readability.
              </TooltipContent>
            </Tooltip>
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
                  ? "border-accent-blue bg-accent-blue/5 ring-accent-blue/30 ring-1"
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
                {fontSize === opt.value && <Check className="text-accent-blue size-3.5" />}
              </div>
              <p className="text-text-tertiary mt-0.5 text-[11px]">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Play Next */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-text-secondary flex items-center gap-1.5 text-xs font-medium">
            <Play className="size-3" />
            Auto-Play Next Lesson
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-text-tertiary hover:text-text-secondary inline-flex transition-colors"
                  >
                    <HelpCircle className="size-3" />
                  </button>
                }
              />
              <TooltipContent side="top">
                When a video ends, automatically mark it complete and move to the next lesson.
              </TooltipContent>
            </Tooltip>
          </label>
          <SettingsSaveIndicator visible={savedField === "autoPlay"} />
        </div>
        <button
          onClick={handleAutoPlayToggle}
          className={`flex w-full max-w-sm items-center justify-between rounded-lg border p-3 text-left transition-all ${
            autoPlayNext
              ? "border-accent-blue bg-accent-blue/5 ring-accent-blue/30 ring-1"
              : "border-border-default bg-bg-tertiary hover:border-border-hover"
          }`}
        >
          <div>
            <span
              className={`text-sm font-medium ${
                autoPlayNext ? "text-accent-blue" : "text-text-primary"
              }`}
            >
              {autoPlayNext ? "Enabled" : "Disabled"}
            </span>
            <p className="text-text-tertiary mt-0.5 text-[11px]">
              Auto-mark video lessons as complete and advance to the next lesson when the video ends
            </p>
          </div>
          <div
            className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
              autoPlayNext ? "bg-accent-blue" : "bg-bg-quaternary"
            }`}
          >
            <div
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                autoPlayNext ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>
      </div>
    </section>
  );
}
