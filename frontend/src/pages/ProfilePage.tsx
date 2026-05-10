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
    async (data: Partial<UserSettings>) => {
      await update.mutateAsync(data);
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-text-primary text-2xl font-semibold">Profile</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your public profile and identity.</p>
      </div>

      <ProfileSection user={user} onSave={(data) => save(data)} />
    </div>
  );
}
