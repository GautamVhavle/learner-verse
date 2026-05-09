/**
 * Profile editing section — cover image, avatar, display name, bio,
 * tags, social links, and public profile toggle.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import {
  User,
  Camera,
  Loader2,
  X,
  Globe,
  GlobeLock,
  ExternalLink,
  ImagePlus,
  Plus,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import { useUploadAvatarMutation, useUploadCoverMutation } from "@/hooks/useUser";
import type { UserProfile, UserSettings, SocialLink } from "@/types/user";

const NAME_DEBOUNCE_MS = 600;
const BIO_DEBOUNCE_MS = 800;
const MAX_BIO_LENGTH = 500;
const MAX_TAGS = 10;
const MAX_LINKS = 10;
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
  const [links, setLinks] = useState<SocialLink[]>(user.social_links ?? []);
  const [isPublic, setIsPublic] = useState(user.is_profile_public);
  const [saved, setSaved] = useState(false);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bioDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatarMutation();
  const uploadCover = useUploadCoverMutation();

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
    setLinks(user.social_links ?? []);
  }, [user.social_links]);
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
    if (e.key === "Backspace" && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1]);
  };

  // Social links
  const addLink = useCallback(() => {
    if (links.length >= MAX_LINKS) return;
    const next = [...links, { label: "", url: "" }];
    setLinks(next);
  }, [links]);

  const updateLink = useCallback((idx: number, field: "label" | "url", value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }, []);

  const saveLinks = useCallback(() => {
    setLinks((prev) => {
      const validLinks = prev.filter((l) => l.label.trim() && l.url.trim());
      onSave({ social_links: validLinks }, "links");
      flash();
      return prev;
    });
  }, [onSave, flash]);

  const removeLink = useCallback(
    (idx: number) => {
      setLinks((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        onSave({ social_links: next.filter((l) => l.label.trim() && l.url.trim()) }, "links");
        flash();
        return next;
      });
    },
    [onSave, flash],
  );

  const togglePublic = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    onSave({ is_profile_public: next }, "public");
    flash();
  }, [isPublic, onSave, flash]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    if (type === "avatar") uploadAvatar.mutate(file);
    else uploadCover.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <section className="border-border-default bg-bg-secondary overflow-hidden rounded-xl border">
        <div className="relative">
          <div className="from-accent-blue/20 via-accent-purple/10 to-accent-green/20 h-36 w-full bg-gradient-to-br sm:h-44">
            {user.cover_image_url && (
              <img src={user.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFileChange(e, "cover")}
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadCover.isPending}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 disabled:opacity-50"
          >
            {uploadCover.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ImagePlus className="size-3" />
            )}
            {user.cover_image_url ? "Change cover" : "Add cover"}
          </button>
          {/* Avatar overlapping cover */}
          <div className="absolute -bottom-10 left-5">
            <div className="relative">
              <Avatar size="lg" className="ring-bg-secondary size-20 shadow-lg ring-4">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.display_name} />
                ) : null}
                <AvatarFallback className="text-2xl font-semibold">
                  {user.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileChange(e, "avatar")}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="border-bg-secondary bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary hover:text-text-primary absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Name + email below cover */}
        <div className="px-5 pt-14 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary text-base font-semibold">{user.display_name}</p>
              <p className="text-text-tertiary text-xs">{user.email}</p>
            </div>
            <SettingsSaveIndicator visible={saved} />
          </div>
        </div>
      </section>

      {/* Fields */}
      <section className="border-border-default bg-bg-secondary space-y-5 rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <User className="text-accent-blue size-4" />
          <h2 className="text-text-primary text-sm font-semibold">Details</h2>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label htmlFor="display-name" className="text-text-secondary text-xs font-medium">
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
            <label htmlFor="bio" className="text-text-secondary text-xs font-medium">
              Bio
            </label>
            <span className="text-text-tertiary text-[10px]">
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => handleBioChange(e.target.value)}
            placeholder="Tell others about yourself, your learning goals, interests…"
            rows={3}
            className="border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:ring-accent-blue/30 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            data-testid="settings-bio"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="profile-tags" className="text-text-secondary text-xs font-medium">
              Tags
            </label>
            <span className="text-text-tertiary text-[10px]">
              {tags.length}/{MAX_TAGS}
            </span>
          </div>
          <div className="border-border-default bg-bg-tertiary focus-within:border-accent-blue focus-within:ring-accent-blue/30 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 focus-within:ring-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-accent-blue/10 text-accent-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-accent-blue/60 hover:text-accent-blue ml-0.5 rounded-sm"
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
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput);
                }}
                placeholder={tags.length === 0 ? "e.g. python, web dev, AI…" : "Add tag…"}
                className="text-text-primary placeholder:text-text-tertiary min-w-[80px] flex-1 bg-transparent py-0.5 text-sm focus:outline-none"
                data-testid="settings-tags-input"
              />
            )}
          </div>
          <p className="text-text-tertiary text-[10px]">Press Enter or comma to add.</p>
        </div>
      </section>

      {/* Social Links */}
      <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="text-accent-purple size-4" />
            <h2 className="text-text-primary text-sm font-semibold">Links</h2>
          </div>
          {links.length < MAX_LINKS && (
            <button
              onClick={addLink}
              className="text-accent-blue hover:bg-accent-blue/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            >
              <Plus className="size-3" /> Add link
            </button>
          )}
        </div>
        {links.length === 0 && (
          <p className="text-text-tertiary text-xs">
            Add links to your portfolio, GitHub, LinkedIn, Twitter, etc.
          </p>
        )}
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(idx, "label", e.target.value)}
                onBlur={saveLinks}
                placeholder="Label (e.g. GitHub)"
                className="w-28 shrink-0 sm:w-32"
              />
              <Input
                value={link.url}
                onChange={(e) => updateLink(idx, "url", e.target.value)}
                onBlur={saveLinks}
                placeholder="https://…"
                className="flex-1"
              />
              <button
                onClick={() => removeLink(idx)}
                className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary shrink-0 rounded-md p-1.5 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Public Toggle */}
      <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="text-accent-green size-4" />
            ) : (
              <GlobeLock className="text-text-tertiary size-4" />
            )}
            <div>
              <p className="text-text-primary text-sm font-medium">Public Profile</p>
              <p className="text-text-tertiary text-[11px]">
                {isPublic
                  ? "Anyone with your link can see your profile"
                  : "Your profile is private"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPublic && (
              <a
                href={`/profile/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:bg-accent-blue/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
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
    </div>
  );
}
