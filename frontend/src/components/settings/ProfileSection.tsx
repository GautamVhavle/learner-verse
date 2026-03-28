/**
 * Profile section of the settings page.
 *
 * Displays the user avatar with upload support, display name input,
 * bio textarea, profile tags, and public profile toggle.
 * All changes are auto-saved via debounced callbacks.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { User, Camera, Loader2, X, Globe, GlobeLock, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import { useUploadAvatarMutation } from "@/hooks/useUser";
import type { UserProfile, UserSettings } from "@/types/user";

/** Auto-save debounce delay in milliseconds. */
const NAME_DEBOUNCE_MS = 600;
const BIO_DEBOUNCE_MS = 800;
const MAX_BIO_LENGTH = 500;
const MAX_TAGS = 10;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ProfileSectionProps {
  user: UserProfile;
  onSave: (data: Partial<UserSettings>, field: string) => Promise<void> | void;
}

export function ProfileSection({ user, onSave }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio ?? "");
  const [tags, setTags] = useState<string[]>(user.profile_tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(user.is_profile_public);
  const [saved, setSaved] = useState(false);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bioDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatarMutation();

  // Sync when server data changes
  useEffect(() => {
    setDisplayName(user.display_name);
  }, [user.display_name]);
  useEffect(() => {
    setBio(user.bio ?? "");
  }, [user.bio]);
  useEffect(() => {
    setTags(user.profile_tags ?? []);
  }, [user.profile_tags]);
  useEffect(() => {
    setIsPublic(user.is_profile_public);
  }, [user.is_profile_public]);

  const flash = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      setDisplayName(value);
      clearTimeout(nameDebounceRef.current);
      nameDebounceRef.current = setTimeout(() => {
        if (value.trim()) {
          onSave({ display_name: value.trim() }, "name");
          flash();
        }
      }, NAME_DEBOUNCE_MS);
    },
    [onSave, flash],
  );

  const handleBioChange = useCallback(
    (value: string) => {
      if (value.length > MAX_BIO_LENGTH) return;
      setBio(value);
      clearTimeout(bioDebounceRef.current);
      bioDebounceRef.current = setTimeout(() => {
        onSave({ bio: value || null }, "bio");
        flash();
      }, BIO_DEBOUNCE_MS);
    },
    [onSave, flash],
  );

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (!tag || tags.length >= MAX_TAGS || tags.includes(tag)) return;
      const next = [...tags, tag];
      setTags(next);
      setTagInput("");
      onSave({ profile_tags: next }, "tags");
      flash();
    },
    [tags, onSave, flash],
  );

  const removeTag = useCallback(
    (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      onSave({ profile_tags: next }, "tags");
      flash();
    },
    [tags, onSave, flash],
  );

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const togglePublic = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    onSave({ is_profile_public: next }, "public");
    flash();
  }, [isPublic, onSave, flash]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    uploadAvatar.mutate(file);
    e.target.value = "";
  };

  return (
    <section className="space-y-5 rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="size-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
        </div>
        <SettingsSaveIndicator visible={saved} />
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handleAvatarClick}
            disabled={uploadAvatar.isPending}
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border-default bg-bg-tertiary text-text-secondary transition-colors hover:bg-bg-quaternary hover:text-text-primary disabled:opacity-50"
            title="Change profile picture"
          >
            {uploadAvatar.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Camera className="size-3" />
            )}
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{user.display_name}</p>
          <p className="text-xs text-text-tertiary">{user.email}</p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <label htmlFor="display-name" className="text-xs font-medium text-text-secondary">
          Display Name
        </label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Your name"
          className="max-w-sm"
          data-testid="settings-display-name"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="bio" className="text-xs font-medium text-text-secondary">
            Bio
          </label>
          <span className="text-[10px] text-text-tertiary">
            {bio.length}/{MAX_BIO_LENGTH}
          </span>
        </div>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => handleBioChange(e.target.value)}
          placeholder="Tell others about yourself, your learning goals, interests…"
          rows={3}
          className="w-full rounded-lg border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-none"
          data-testid="settings-bio"
        />
      </div>

      {/* Profile Tags */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="profile-tags" className="text-xs font-medium text-text-secondary">
            Tags
          </label>
          <span className="text-[10px] text-text-tertiary">
            {tags.length}/{MAX_TAGS}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-default bg-bg-tertiary px-2 py-1.5 focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue/30">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-sm text-accent-blue/60 hover:text-accent-blue"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {tags.length < MAX_TAGS && (
            <input
              id="profile-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder={tags.length === 0 ? "e.g. python, web dev, AI…" : "Add tag…"}
              className="min-w-[80px] flex-1 bg-transparent py-0.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              data-testid="settings-tags-input"
            />
          )}
        </div>
        <p className="text-[10px] text-text-tertiary">
          Press Enter or comma to add. These appear on your public profile.
        </p>
      </div>

      {/* Public Profile Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary px-4 py-3">
        <div className="flex items-center gap-3">
          {isPublic ? (
            <Globe className="size-4 text-accent-green" />
          ) : (
            <GlobeLock className="size-4 text-text-tertiary" />
          )}
          <div>
            <p className="text-sm font-medium text-text-primary">Public Profile</p>
            <p className="text-[11px] text-text-tertiary">
              {isPublic ? "Anyone with your link can see your profile" : "Your profile is private"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPublic && (
            <a
              href={`/profile/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-blue hover:bg-accent-blue/10 transition-colors"
            >
              View <ExternalLink className="size-3" />
            </a>
          )}
          <button
            onClick={togglePublic}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
              isPublic ? "bg-accent-green" : "bg-bg-quaternary"
            }`}
            role="switch"
            aria-checked={isPublic}
            data-testid="settings-public-toggle"
          >
            <span
              className={`pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
