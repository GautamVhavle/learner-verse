/**
 * Dedicated profile page — avatar, display name, bio, tags, public toggle.
 *
 * Separate from Settings (which handles preferences, appearance, etc.).
 * Accessed by clicking the user avatar in the sidebar footer.
 */
import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { useUserQuery, useUpdateUserMutation } from "@/hooks/useUser";
import type { UserSettings } from "@/types/user";

export default function ProfilePage() {
  const { data: user, isLoading } = useUserQuery();
  const update = useUpdateUserMutation();

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
        <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your public profile and identity.
        </p>
      </div>

      <ProfileSection user={user} onSave={(data) => save(data)} />

      <p className="text-center text-xs text-text-tertiary">
        Changes are saved automatically.
      </p>
    </div>
  );
}
