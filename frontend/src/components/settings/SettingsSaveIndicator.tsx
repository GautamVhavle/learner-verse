/**
 * Tiny inline "Saved" indicator for settings fields.
 *
 * Fades in briefly to confirm a save, then the parent auto-hides it.
 */
import { Check } from "lucide-react";

interface SettingsSaveIndicatorProps {
  visible: boolean;
}

export function SettingsSaveIndicator({ visible }: SettingsSaveIndicatorProps) {
  if (!visible) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-accent-green animate-in fade-in duration-200">
      <Check className="size-3" />
      Saved
    </span>
  );
}
