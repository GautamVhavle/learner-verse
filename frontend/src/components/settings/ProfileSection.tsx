/**
 * Profile editing section - cover image, avatar, display name, bio,
 * tags, social links, and public profile toggle.
 *
 * Details and Links use an explicit Edit → Save / Cancel flow to avoid
 * latency-related autosave issues.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
  Pencil,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SettingsSaveIndicator } from "./SettingsSaveIndicator";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { useUploadAvatarMutation, useUploadCoverMutation } from "@/hooks/useUser";
import { safeExternalUrl } from "@/lib/safeUrl";
import type { UserProfile, UserSettings, SocialLink } from "@/types/user";

const MAX_BIO_LENGTH = 500;
const MAX_TAGS = 10;
const MAX_LINKS = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ProfileSectionProps {
  user: UserProfile;
  onSave: (data: Partial<UserSettings>, field: string) => Promise<void> | void;
}

function getLinkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function ProfileSection({ user, onSave }: ProfileSectionProps) {
  // ── Shared state ───────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatarMutation();
  const uploadCover = useUploadCoverMutation();

  const flash = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  // ── Details editing ────────────────────────────────────────────────────────
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftTagInput, setDraftTagInput] = useState("");

  function startEditDetails() {
    setDraftName(user.display_name);
    setDraftBio(user.bio ?? "");
    setDraftTags(user.profile_tags ?? []);
    setDraftTagInput("");
    setIsEditingDetails(true);
  }

  function cancelEditDetails() {
    setIsEditingDetails(false);
  }

  async function handleSaveDetails() {
    if (!draftName.trim()) return;
    setIsSaving(true);
    try {
      await onSave(
        { display_name: draftName.trim(), bio: draftBio || null, profile_tags: draftTags },
        "details",
      );
      flash();
      setIsEditingDetails(false);
    } finally {
      setIsSaving(false);
    }
  }

  function addDraftTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || draftTags.length >= MAX_TAGS || draftTags.includes(tag)) return;
    setDraftTags((prev) => [...prev, tag]);
    setDraftTagInput("");
  }

  function removeDraftTag(tag: string) {
    setDraftTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraftTag(draftTagInput);
    }
    if (e.key === "Backspace" && !draftTagInput && draftTags.length > 0) {
      removeDraftTag(draftTags[draftTags.length - 1]);
    }
  }

  // ── Links editing ──────────────────────────────────────────────────────────
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [draftLinks, setDraftLinks] = useState<SocialLink[]>([]);

  function startEditLinks() {
    setDraftLinks(user.social_links ?? []);
    setIsEditingLinks(true);
  }

  function cancelEditLinks() {
    setIsEditingLinks(false);
  }

  async function handleSaveLinks() {
    const validLinks = draftLinks.filter((l) => l.label.trim() && l.url.trim());
    setIsSaving(true);
    try {
      await onSave({ social_links: validLinks }, "links");
      flash();
      setIsEditingLinks(false);
    } finally {
      setIsSaving(false);
    }
  }

  function updateDraftLink(idx: number, field: "label" | "url", value: string) {
    setDraftLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function removeDraftLink(idx: number) {
    setDraftLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  function addDraftLink() {
    if (draftLinks.length >= MAX_LINKS) return;
    setDraftLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  // ── Public toggle ──────────────────────────────────────────────────────────
  const [isPublic, setIsPublic] = useState(user.is_profile_public);

  useEffect(() => {
    setIsPublic(user.is_profile_public);
  }, [user.is_profile_public]);

  const togglePublic = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    onSave({ is_profile_public: next }, "public");
    flash();
  }, [isPublic, onSave, flash]);

  // ── File uploads ───────────────────────────────────────────────────────────
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
      {/* ── Cover + Avatar ─────────────────────────────────────────────────── */}
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

          {/* Avatar - overlaps cover bottom edge */}
          <div className="absolute -bottom-14 left-5">
            <div className="relative">
              <Avatar className="ring-bg-secondary size-28 shadow-lg ring-4">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.display_name} />
                ) : null}
                <AvatarFallback className="text-4xl font-semibold">
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

        {/* Name + email row */}
        <div className="px-5 pt-20 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary flex items-center gap-1.5 text-base font-semibold">
                {user.display_name}
                {user.is_verified_creator && <VerifiedBadge size={18} />}
              </p>
              <p className="text-text-tertiary text-xs">{user.email}</p>
            </div>
            <SettingsSaveIndicator visible={saved} />
          </div>
        </div>
      </section>

      {/* ── Details ────────────────────────────────────────────────────────── */}
      <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="text-accent-blue size-4" />
            <h2 className="text-text-primary text-sm font-semibold">Details</h2>
          </div>
          {isEditingDetails ? (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditDetails}
                disabled={isSaving}
                className="text-text-secondary hover:text-text-primary rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={isSaving || !draftName.trim()}
                className="bg-accent-blue hover:bg-accent-blue/90 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                Save changes
              </button>
            </div>
          ) : (
            <button
              onClick={startEditDetails}
              className="text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
          )}
        </div>

        {/* Edit mode */}
        {isEditingDetails ? (
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="display-name" className="text-text-secondary text-xs font-medium">
                Display Name
              </label>
              <Input
                id="display-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
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
                  {draftBio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <textarea
                id="bio"
                value={draftBio}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_BIO_LENGTH) setDraftBio(e.target.value);
                }}
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
                  {draftTags.length}/{MAX_TAGS}
                </span>
              </div>
              <div className="border-border-default bg-bg-tertiary focus-within:border-accent-blue focus-within:ring-accent-blue/30 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 focus-within:ring-1">
                {draftTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-accent-blue/10 text-accent-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {tag}
                    <button
                      onClick={() => removeDraftTag(tag)}
                      className="text-accent-blue/60 hover:text-accent-blue ml-0.5 rounded-sm"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {draftTags.length < MAX_TAGS && (
                  <input
                    id="profile-tags"
                    value={draftTagInput}
                    onChange={(e) => setDraftTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (draftTagInput.trim()) addDraftTag(draftTagInput);
                    }}
                    placeholder={draftTags.length === 0 ? "e.g. python, web dev, AI…" : "Add tag…"}
                    className="text-text-primary placeholder:text-text-tertiary min-w-[80px] flex-1 bg-transparent py-0.5 text-sm focus:outline-none"
                    data-testid="settings-tags-input"
                  />
                )}
              </div>
              <p className="text-text-tertiary text-[10px]">Press Enter or comma to add a tag.</p>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="space-y-3">
            <div>
              <p className="text-text-tertiary mb-0.5 text-[10px] font-semibold tracking-wider uppercase">
                Display Name
              </p>
              <p className="text-text-primary text-sm font-medium">{user.display_name}</p>
            </div>
            {user.bio ? (
              <div>
                <p className="text-text-tertiary mb-0.5 text-[10px] font-semibold tracking-wider uppercase">
                  Bio
                </p>
                <p className="text-text-secondary text-sm leading-relaxed">{user.bio}</p>
              </div>
            ) : (
              <p className="text-text-tertiary text-sm italic">No bio added yet.</p>
            )}
            {(user.profile_tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {user.profile_tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-accent-blue/10 text-accent-blue rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Links ──────────────────────────────────────────────────────────── */}
      <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="text-accent-purple size-4" />
            <h2 className="text-text-primary text-sm font-semibold">
              Links
              <span className="text-text-tertiary ml-1.5 text-[11px] font-normal">
                (max {MAX_LINKS})
              </span>
            </h2>
          </div>
          {isEditingLinks ? (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditLinks}
                disabled={isSaving}
                className="text-text-secondary hover:text-text-primary rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLinks}
                disabled={isSaving}
                className="bg-accent-blue hover:bg-accent-blue/90 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                Save changes
              </button>
            </div>
          ) : (
            <button
              onClick={startEditLinks}
              className="text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
          )}
        </div>

        {/* Edit mode */}
        {isEditingLinks ? (
          <div className="space-y-3">
            {draftLinks.length === 0 && (
              <p className="text-text-tertiary text-sm">
                Add links to your portfolio, GitHub, LinkedIn, Twitter, etc.
              </p>
            )}
            {draftLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updateDraftLink(idx, "label", e.target.value)}
                  placeholder="Label (e.g. GitHub)"
                  className="w-28 shrink-0 sm:w-32"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateDraftLink(idx, "url", e.target.value)}
                  placeholder="https://…"
                  className="flex-1"
                />
                <button
                  onClick={() => removeDraftLink(idx)}
                  className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary shrink-0 rounded-md p-1.5 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {draftLinks.length < MAX_LINKS && (
              <button
                onClick={addDraftLink}
                className="text-accent-blue hover:bg-accent-blue/10 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus className="size-3.5" /> Add link
              </button>
            )}
          </div>
        ) : (
          /* View mode */
          <div>
            {(user.social_links ?? []).length === 0 ? (
              <p className="text-text-tertiary text-sm italic">No links added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.social_links.map((link, i) => (
                  <a
                    key={i}
                    href={safeExternalUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border-default bg-bg-tertiary text-text-secondary hover:border-accent-blue/40 hover:text-text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    <Link2 className="size-3" />
                    {link.label || getLinkDomain(link.url)}
                    <ExternalLink className="size-2.5 opacity-60" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Public Toggle ───────────────────────────────────────────────────── */}
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
