/**
 * Profile section of the settings page.
 *
 * Displays the user avatar, display name input with auto-save,
 * and email address. The display name is debounced (600ms) to
 * avoid excessive API calls while typing.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { User, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import type { UserProfile } from "@/types/user";

/** Auto-save debounce delay in milliseconds. */
const NAME_DEBOUNCE_MS = 600;

interface ProfileSectionProps {
  user: UserProfile;
  onSave: (data: { display_name: string }, field: string) => void;
}

export function ProfileSection({ user, onSave }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync when server data changes
  useEffect(() => {
    setDisplayName(user.display_name);
  }, [user.display_name]);

  const handleChange = useCallback(
    (value: string) => {
      setDisplayName(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          onSave({ display_name: value.trim() }, "name");
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }
      }, NAME_DEBOUNCE_MS);
    },
    [onSave],
  );

  return (
    <section className="space-y-5 rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2">
        <User className="size-4 text-accent-blue" />
        <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar size="lg" className="size-16">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.display_name} />
            ) : null}
            <AvatarFallback className="text-lg">
              {user.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border-default bg-bg-tertiary text-text-secondary transition-colors hover:bg-bg-quaternary hover:text-text-primary"
            title="Change avatar (coming soon)"
          >
            <Camera className="size-3" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{user.display_name}</p>
          <p className="text-xs text-text-tertiary">{user.email}</p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="display-name" className="text-xs font-medium text-text-secondary">
            Display Name
          </label>
          <SettingsSaveIndicator visible={saved} />
        </div>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Your name"
          className="max-w-sm"
          data-testid="settings-display-name"
        />
      </div>
    </section>
  );
}
