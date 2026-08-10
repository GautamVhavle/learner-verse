import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  ClipboardCheck,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileJson,
  Gauge,
  KeyRound,
  Loader2,
  LockKeyhole,
  Network,
  Play,
  PlugZap,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, api } from "@/lib/api";
import {
  COURSE_SPEC_EXAMPLE,
  DEFAULT_MCP_SCOPES,
  MCP_CLIENTS,
  MCP_SCOPES,
  type McpClientId,
} from "@/lib/mcpGuide";

interface TokenResponse {
  id: string;
  token: string;
  token_prefix: string;
  scopes: string[];
}

interface TokenSummary {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
  expired: boolean;
}

interface McpStatus {
  mcp_url: string;
  oauth_configured: boolean;
  personal_tokens_enabled: boolean;
  user_id: string;
}

const TOOL_GROUPS = [
  {
    category: "Discover",
    color: "blue",
    tools: [
      {
        name: "get_capabilities",
        scope: "mcp:read",
        mutates: false,
        summary:
          "Inspect protocol target, enabled workflow tools, task support, and the next action.",
        input: "No arguments",
        example: "Connect to LearnerVerse, call get_capabilities, and summarize what is available.",
      },
    ],
  },
  {
    category: "Plan & validate",
    color: "purple",
    tools: [
      {
        name: "validate_course_spec",
        scope: "mcp:read",
        mutates: false,
        summary:
          "Validate CourseBuildSpec v1 and estimate cost and duration without changing data.",
        input: "spec: CourseBuildSpec object",
        example:
          "Validate this course-build.json with LearnerVerse. Explain every error and do not submit it.",
      },
    ],
  },
  {
    category: "Build",
    color: "green",
    tools: [
      {
        name: "build_course_from_spec",
        scope: "course:write + render:submit",
        mutates: true,
        summary: "Persist and queue one idempotent course build, or perform a safe dry run first.",
        input: "spec, idempotency_key, dry_run=false",
        example:
          "Dry-run this spec. If it is valid and under $5, submit it once using idempotency key fastapi-v1.",
      },
    ],
  },
  {
    category: "Monitor & control",
    color: "amber",
    tools: [
      {
        name: "get_job",
        scope: "render:read",
        mutates: false,
        summary:
          "Read durable status, stage, progress, result, retry delay, and suggested next actions.",
        input: "job_id: UUID",
        example:
          "Poll this LearnerVerse job using retry_after_ms. Stop when it completes, fails, or needs review.",
      },
      {
        name: "cancel_job",
        scope: "render:cancel",
        mutates: true,
        summary: "Request cancellation of an active build owned by the authenticated user.",
        input: "job_id: UUID",
        example: "Cancel job JOB_ID and tell me its final status. Do not cancel any other job.",
      },
    ],
  },
] as const;

const RESOURCES = [
  {
    uri: "learnerverse://workflow",
    title: "Workflow instructions",
    description: "Authoritative sequence and safety rules the agent should follow.",
  },
  {
    uri: "learnerverse://examples/golden-workflow",
    title: "Golden agent workflow",
    description: "A compact validate → dry-run → submit → poll → review sequence.",
  },
  {
    uri: "learnerverse://schema/course-build/v1",
    title: "CourseBuildSpec v1 schema",
    description:
      "Machine-readable JSON Schema for course metadata, sections, lessons, scripts, quizzes, and assets.",
  },
  {
    uri: "learnerverse://schema/render-manifest/v1",
    title: "RenderManifest v1 schema",
    description: "The compiled renderer contract produced from a validated build specification.",
  },
] as const;

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="border-border-default bg-bg-secondary text-text-secondary hover:border-border-hover hover:text-text-primary inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
      aria-label={label}
    >
      {copied ? <Check className="text-accent-green size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="border-border-default overflow-hidden rounded-lg border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {label ?? "Configuration"}
        </span>
        <CopyButton value={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-5 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-accent-blue text-[11px] font-semibold tracking-[0.16em] uppercase">
        {eyebrow}
      </p>
      <h2 className="text-text-primary mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      <p className="text-text-secondary mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border-default bg-bg-secondary rounded-xl border p-4">
      <div className="flex items-center gap-2.5">
        <span className="bg-accent-blue/10 text-accent-blue flex size-7 items-center justify-center rounded-lg font-mono text-xs font-semibold">
          {number}
        </span>
        <h3 className="text-text-primary text-sm font-semibold">{title}</h3>
      </div>
      <div className="text-text-secondary mt-3 text-xs leading-5">{children}</div>
    </div>
  );
}

function dateLabel(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export default function McpGuidePage() {
  const mcpUrl = useMemo(() => `${new URL(API_BASE_URL).origin}/mcp/`, []);
  const [selectedClient, setSelectedClient] = useState<McpClientId>("codex");
  const [tokenName, setTokenName] = useState("Course builder IDE");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_MCP_SCOPES);
  const [createdToken, setCreatedToken] = useState<TokenResponse | null>(null);
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [purgingRevoked, setPurgingRevoked] = useState(false);

  const client = MCP_CLIENTS.find((item) => item.id === selectedClient) ?? MCP_CLIENTS[0];
  const revokedCount = tokens.filter((item) => item.revoked).length;

  const loadTokens = async () => {
    setLoadingTokens(true);
    try {
      const [tokenRows, serverStatus] = await Promise.all([
        api.get<TokenSummary[]>("/mcp-settings/tokens"),
        api.get<McpStatus>("/mcp-settings/status"),
      ]);
      setTokens(tokenRows);
      setStatus(serverStatus);
    } catch {
      toast.error("Could not load MCP settings");
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    document.title = "Use MCP | LearnerVerse";
    void loadTokens();
  }, []);

  const toggleScope = (scope: string) => {
    if (scope === "mcp:read") return;
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  };

  const createToken = async () => {
    if (!tokenName.trim()) {
      toast.error("Give this token a recognizable name");
      return;
    }
    setCreating(true);
    try {
      const result = await api.post<TokenResponse>("/mcp-settings/tokens", {
        name: tokenName.trim(),
        scopes: selectedScopes,
      });
      setCreatedToken(result);
      await loadTokens();
      toast.success("Personal MCP token created");
    } catch {
      toast.error("Could not create MCP token");
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    setRevoking(tokenId);
    try {
      await api.delete<{ revoked: boolean }>(`/mcp-settings/tokens/${tokenId}`);
      setTokens((current) =>
        current.map((item) => (item.id === tokenId ? { ...item, revoked: true } : item)),
      );
      toast.success("Token revoked");
    } catch {
      toast.error("Could not revoke token");
    } finally {
      setRevoking(null);
    }
  };

  const permanentlyDeleteToken = async (token: TokenSummary) => {
    if (!window.confirm(`Permanently delete the revoked key “${token.name}”?`)) return;
    setDeleting(token.id);
    try {
      await api.delete<{ deleted: boolean }>(`/mcp-settings/tokens/${token.id}/permanent`);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      toast.success("Revoked key permanently deleted");
    } catch {
      toast.error("Could not delete the revoked key");
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllRevoked = async () => {
    if (
      !window.confirm(
        `Permanently delete ${revokedCount} revoked ${revokedCount === 1 ? "key" : "keys"}?`,
      )
    ) {
      return;
    }
    setPurgingRevoked(true);
    try {
      const result = await api.delete<{ deleted: number }>("/mcp-settings/tokens/revoked");
      setTokens((current) => current.filter((item) => !item.revoked));
      toast.success(`Deleted ${result.deleted} revoked ${result.deleted === 1 ? "key" : "keys"}`);
    } catch {
      toast.error("Could not delete revoked keys");
    } finally {
      setPurgingRevoked(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-16 pb-20">
      <section className="border-border-default bg-bg-secondary relative overflow-hidden rounded-2xl border px-5 py-8 sm:px-8 sm:py-10">
        <div className="bg-accent-purple/10 pointer-events-none absolute -top-20 -right-20 size-64 rounded-full blur-3xl" />
        <div className="bg-accent-blue/10 pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <div className="border-accent-purple/20 bg-accent-purple/10 text-accent-purple inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase">
              <PlugZap className="size-3" />
              Model Context Protocol
            </div>
            <h1 className="text-text-primary mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Build complete courses from your IDE
            </h1>
            <p className="text-text-secondary mt-4 max-w-2xl text-sm leading-6 sm:text-base">
              Connect any compatible coding agent to LearnerVerse, hand it a CourseBuildSpec, and
              let it validate, estimate, submit, and monitor the production workflow. You stay in
              control of cost, cancellation, review, and publication.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="#connect"
                className="bg-accent-blue hover:bg-accent-blue/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition-colors"
              >
                <KeyRound className="size-3.5" />
                Generate API key
              </a>
              <a
                href="#workflow"
                className="border-border-default bg-bg-tertiary text-text-primary hover:border-border-hover inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors"
              >
                See the workflow <ChevronRight className="size-3.5" />
              </a>
            </div>
          </div>
          <div className="border-border-default bg-bg-primary/80 space-y-3 rounded-xl border p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary text-[10px] font-semibold tracking-wide uppercase">
                Server
              </span>
              <span className="text-accent-green inline-flex items-center gap-1 text-[10px] font-medium">
                <span className="bg-accent-green size-1.5 rounded-full" /> Ready
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-accent-blue/10 flex size-9 items-center justify-center rounded-lg">
                <Server className="text-accent-blue size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-text-primary text-xs font-semibold">LearnerVerse MCP</p>
                <p className="text-text-tertiary truncate font-mono text-[10px]">{mcpUrl}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                ["2026-07-28", "Protocol"],
                ["HTTP", "Transport"],
                ["Bearer", "Auth"],
              ].map(([value, label]) => (
                <div key={label} className="bg-bg-tertiary rounded-lg p-2 text-center">
                  <p className="text-text-primary font-mono text-[10px] font-semibold">{value}</p>
                  <p className="text-text-tertiary mt-0.5 text-[9px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-20 space-y-6">
        <SectionHeading
          eyebrow="End-to-end workflow"
          title="From one JSON file to a reviewable course"
          description="The agent follows a deliberate production sequence. Validation and dry runs are non-mutating; a real submission is idempotent; publication remains an explicit human decision."
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StepCard number="01" title="Describe">
            Give the agent your script JSON, lesson plan, reusable asset IDs, and generation
            requests. It reads the schema resource before changing anything.
          </StepCard>
          <StepCard number="02" title="Validate & estimate">
            The agent calls <code className="text-text-primary">validate_course_spec</code>, fixes
            structural errors, then performs a dry run to confirm cost and duration.
          </StepCard>
          <StepCard number="03" title="Build & monitor">
            One idempotent submission creates the project and job. The agent polls at the server’s
            requested interval and can cancel an active job.
          </StepCard>
          <StepCard number="04" title="Review & publish">
            Preview the assembled course in Creator mode. Select Publish, then Make Public to place
            it in Course Hub; learners can enroll, study, quiz, and track progress.
          </StepCard>
        </div>
        <div className="border-accent-amber/30 bg-accent-amber/5 flex gap-3 rounded-xl border p-4">
          <ShieldCheck className="text-accent-amber mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-text-primary text-xs font-semibold">Current publication boundary</p>
            <p className="text-text-secondary mt-1 text-xs leading-5">
              LearnerVerse MCP currently stops at build completion or review. The final Publish and
              Make Public actions happen in the Creator UI so an agent cannot accidentally expose a
              course. The <code>course:publish</code> scope is reserved for a future explicit
              approval tool.
            </p>
          </div>
        </div>
      </section>

      <section id="connect" className="scroll-mt-20 space-y-6">
        <SectionHeading
          eyebrow="Connect your agent"
          title="Create a personal API key"
          description="Tokens are tied to your account, stored as a non-reversible verifier, and shown only once. Use a separate, narrowly scoped token for every machine or client."
        />
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-border-default bg-bg-secondary space-y-5 rounded-xl border p-5">
            <div className="space-y-1.5">
              <label htmlFor="mcp-token-name" className="text-text-primary text-xs font-medium">
                Token name
              </label>
              <Input
                id="mcp-token-name"
                value={tokenName}
                onChange={(event) => setTokenName(event.target.value)}
                maxLength={100}
                placeholder="e.g. Codex on MacBook"
                className="border-border-default bg-bg-tertiary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-text-primary text-xs font-medium">Permissions</p>
                <button
                  type="button"
                  onClick={() => setSelectedScopes([...DEFAULT_MCP_SCOPES])}
                  className="text-accent-blue text-[11px] hover:underline"
                >
                  Recommended preset
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {MCP_SCOPES.map((scope) => {
                  const selected = selectedScopes.includes(scope.value);
                  const locked = scope.value === "mcp:read";
                  return (
                    <button
                      type="button"
                      key={scope.value}
                      onClick={() => toggleScope(scope.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-accent-blue/40 bg-accent-blue/5"
                          : "border-border-default bg-bg-tertiary hover:border-border-hover"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? "border-accent-blue bg-accent-blue text-white"
                              : "border-border-hover"
                          }`}
                        >
                          {selected && <Check className="size-3" />}
                        </span>
                        <div>
                          <p className="text-text-primary text-[11px] font-semibold">
                            {scope.label}{" "}
                            {locked && <LockKeyhole className="ml-1 inline size-2.5" />}
                          </p>
                          <p className="text-text-tertiary mt-0.5 text-[10px] leading-4">
                            {scope.description}
                          </p>
                          <code className="text-accent-purple mt-1 block text-[9px]">
                            {scope.value}
                          </code>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              onClick={createToken}
              disabled={creating || selectedScopes.length === 0}
              className="bg-accent-blue hover:bg-accent-blue/90 w-full text-white"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {creating ? "Creating secure token…" : "Generate personal API key"}
            </Button>
          </div>

          <div className="space-y-4">
            {createdToken ? (
              <div className="border-accent-amber/40 bg-accent-amber/5 space-y-4 rounded-xl border p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-accent-amber/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <KeyRound className="text-accent-amber size-4" />
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-semibold">Copy this key now</p>
                    <p className="text-text-secondary mt-0.5 text-[11px] leading-4">
                      It will never be displayed again. Generate a replacement if you lose it.
                    </p>
                  </div>
                </div>
                <div className="border-accent-amber/30 bg-bg-primary rounded-lg border p-3">
                  <code className="text-text-primary block text-[11px] leading-5 break-all">
                    {createdToken.token}
                  </code>
                </div>
                <CopyButton value={createdToken.token} label="Copy API key" />
                <div className="border-accent-amber/20 border-t pt-3">
                  <p className="text-text-tertiary text-[10px] leading-4">
                    Never paste this key into a course spec, prompt, Git commit, screenshot, or
                    support request. Store it in an environment variable or password input.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-border-default bg-bg-secondary flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                <div className="bg-bg-tertiary flex size-11 items-center justify-center rounded-xl">
                  <KeyRound className="text-text-tertiary size-5" />
                </div>
                <p className="text-text-primary mt-3 text-sm font-medium">
                  Your key appears here once
                </p>
                <p className="text-text-tertiary mt-1 max-w-xs text-[11px] leading-4">
                  The recommended preset can build, monitor, and cancel, but it cannot publish or
                  manage provider credentials.
                </p>
              </div>
            )}
            <div className="border-border-default bg-bg-secondary rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-xs font-semibold">MCP endpoint</p>
                  <p className="text-text-tertiary mt-0.5 text-[10px]">
                    {status?.personal_tokens_enabled === false
                      ? "Personal tokens are disabled"
                      : "Streamable HTTP · bearer authentication"}
                  </p>
                </div>
                <CopyButton value={mcpUrl} label="Copy URL" />
              </div>
              <code className="bg-bg-tertiary text-text-secondary mt-3 block overflow-x-auto rounded-md p-2.5 text-[10px]">
                {mcpUrl}
              </code>
            </div>
          </div>
        </div>

        <div className="border-border-default bg-bg-secondary rounded-xl border">
          <div className="border-border-default flex items-center justify-between border-b p-4">
            <div>
              <h3 className="text-text-primary text-sm font-semibold">Your API keys</h3>
              <p className="text-text-tertiary mt-0.5 text-[11px]">
                Revoke any key you no longer use.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {revokedCount > 0 && (
                <button
                  type="button"
                  onClick={() => void deleteAllRevoked()}
                  disabled={purgingRevoked}
                  className="border-accent-red/20 text-accent-red hover:bg-accent-red/5 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors"
                >
                  {purgingRevoked ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  Delete all revoked ({revokedCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadTokens()}
                disabled={loadingTokens}
                className="text-text-tertiary hover:text-text-primary rounded-md p-2 transition-colors"
                aria-label="Refresh API keys"
              >
                <RefreshCw className={`size-3.5 ${loadingTokens ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          {loadingTokens ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="text-text-tertiary size-5 animate-spin" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-text-tertiary p-6 text-center text-xs">No API keys yet.</p>
          ) : (
            <div className="divide-border-default divide-y">
              {tokens.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary truncate text-xs font-semibold">
                        {item.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          item.revoked
                            ? "bg-accent-red/10 text-accent-red"
                            : item.expired
                              ? "bg-accent-amber/10 text-accent-amber"
                              : "bg-accent-green/10 text-accent-green"
                        }`}
                      >
                        {item.revoked ? "Revoked" : item.expired ? "Expired" : "Active"}
                      </span>
                    </div>
                    <div className="text-text-tertiary mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                      <code>{item.token_prefix}…</code>
                      <span>Last used: {dateLabel(item.last_used_at)}</span>
                      <span>{item.scopes.length} scopes</span>
                    </div>
                  </div>
                  {item.revoked ? (
                    <button
                      type="button"
                      onClick={() => void permanentlyDeleteToken(item)}
                      disabled={deleting === item.id}
                      className="border-border-default text-text-secondary hover:border-accent-red/30 hover:bg-accent-red/5 hover:text-accent-red inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void revokeToken(item.id)}
                      disabled={revoking === item.id}
                      className="border-accent-red/20 text-accent-red hover:bg-accent-red/5 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-medium"
                    >
                      {revoking === item.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Client setup"
          title="Connect from the tool you already use"
          description="Choose a client, copy its configuration, and keep the personal token outside source control. Local URLs only work when the client can reach this machine."
        />
        <div className="border-border-default bg-bg-secondary overflow-hidden rounded-xl border">
          <div className="border-border-default no-scrollbar flex overflow-x-auto border-b p-2">
            {MCP_CLIENTS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedClient(item.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  selectedClient === item.id
                    ? "bg-bg-quaternary text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <div className="bg-accent-purple/10 flex size-10 items-center justify-center rounded-xl">
                <Terminal className="text-accent-purple size-5" />
              </div>
              <h3 className="text-text-primary mt-3 text-lg font-semibold">{client.name}</h3>
              <p className="text-text-secondary mt-1 text-xs leading-5">{client.description}</p>
              <div className="mt-4 space-y-3">
                {client.steps.map((step, index) => (
                  <div key={step} className="flex gap-2.5">
                    <span className="border-border-default bg-bg-tertiary text-text-tertiary flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[9px]">
                      {index + 1}
                    </span>
                    <p className="text-text-secondary text-[11px] leading-5">{step}</p>
                  </div>
                ))}
              </div>
              <div className="border-border-default mt-5 border-t pt-4">
                <p className="text-text-tertiary text-[10px] font-medium uppercase">
                  Config location
                </p>
                <code className="text-text-primary mt-1 block text-[11px]">
                  {client.configLocation}
                </code>
                <p className="text-text-tertiary mt-3 text-[10px] font-medium uppercase">Verify</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-text-primary min-w-0 flex-1 truncate text-[11px]">
                    {client.verify}
                  </code>
                  <CopyButton value={client.verify} />
                </div>
                <a
                  href={client.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue mt-4 inline-flex items-center gap-1 text-[10px] font-medium hover:underline"
                >
                  Official {client.name} MCP documentation
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <CodeBlock code={client.config(mcpUrl)} label={`${client.name} configuration`} />
              <CodeBlock
                code={'export LEARNERVERSE_MCP_TOKEN="paste-your-copy-once-token-here"'}
                label="macOS / Linux shell"
              />
              <p className="text-text-tertiary text-[10px] leading-4">
                Desktop apps may not inherit variables from your shell. Launch the app from that
                shell, use the client’s secure password input, or set the variable in the desktop
                environment before restarting the client.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Tool reference"
          title="Every tool the agent can call"
          description="Tools are permissioned per token and ownership-scoped. Read-only operations can inspect and validate; mutating operations require the additional scope shown below."
        />
        <div className="space-y-5">
          {TOOL_GROUPS.map((group) => (
            <div key={group.category}>
              <div className="mb-2 flex items-center gap-2">
                <Wrench className="text-text-tertiary size-3.5" />
                <h3 className="text-text-secondary text-xs font-semibold">{group.category}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.tools.map((tool) => (
                  <article
                    key={tool.name}
                    className="border-border-default bg-bg-secondary rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-text-primary text-xs font-semibold">{tool.name}</code>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          tool.mutates
                            ? "bg-accent-amber/10 text-accent-amber"
                            : "bg-accent-green/10 text-accent-green"
                        }`}
                      >
                        {tool.mutates ? "Writes" : "Read only"}
                      </span>
                    </div>
                    <p className="text-text-secondary mt-2 text-xs leading-5">{tool.summary}</p>
                    <div className="bg-bg-tertiary mt-3 space-y-2 rounded-lg p-3">
                      <div>
                        <p className="text-text-tertiary text-[9px] font-semibold uppercase">
                          Input
                        </p>
                        <code className="text-text-primary mt-0.5 block text-[10px]">
                          {tool.input}
                        </code>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-[9px] font-semibold uppercase">
                          Scope
                        </p>
                        <code className="text-accent-purple mt-0.5 block text-[10px]">
                          {tool.scope}
                        </code>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <Sparkles className="text-accent-purple mt-0.5 size-3 shrink-0" />
                      <p className="text-text-secondary flex-1 text-[10px] leading-4">
                        “{tool.example}”
                      </p>
                      <CopyButton value={tool.example} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Resources"
          title="Context your agent should read first"
          description="Resources are read-only protocol content. Ask the agent to read them rather than copying large schemas into every prompt."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {RESOURCES.map((resource) => (
            <div
              key={resource.uri}
              className="border-border-default bg-bg-secondary rounded-xl border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="bg-accent-blue/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <BookOpen className="text-accent-blue size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-xs font-semibold">{resource.title}</p>
                  <p className="text-text-tertiary mt-1 text-[10px] leading-4">
                    {resource.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-accent-purple min-w-0 flex-1 truncate text-[9px]">
                      {resource.uri}
                    </code>
                    <CopyButton value={resource.uri} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Small complete example"
          title="Build a one-lesson FastAPI course"
          description="This valid CourseBuildSpec demonstrates metadata, defaults, one section, narration, visual scenes, and a quiz. Scale the same structure to hundreds of lessons."
        />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <CodeBlock code={COURSE_SPEC_EXAMPLE} label="course-build.json" />
          <div className="space-y-3">
            {[
              {
                icon: Eye,
                title: "1. Inspect",
                prompt:
                  "Read learnerverse://workflow and learnerverse://schema/course-build/v1. Then explain this spec without changing anything.",
              },
              {
                icon: ClipboardCheck,
                title: "2. Validate",
                prompt:
                  "Validate course-build.json with LearnerVerse. Fix local JSON only if needed and show me the cost estimate.",
              },
              {
                icon: Gauge,
                title: "3. Dry run",
                prompt:
                  "Dry-run the validated spec. Do not queue a real build. Stop if estimated cost exceeds $5.",
              },
              {
                icon: Rocket,
                title: "4. Submit once",
                prompt:
                  "Submit this exact spec once with idempotency key intro-fastapi-2026-001, then poll at retry_after_ms until terminal or review state.",
              },
              {
                icon: CheckCircle2,
                title: "5. Review and publish",
                prompt:
                  "Summarize the completed build and tell me what to review. Do not publish automatically.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="border-border-default bg-bg-secondary rounded-xl border p-4"
              >
                <div className="flex items-center gap-2">
                  <step.icon className="text-accent-blue size-3.5" />
                  <p className="text-text-primary text-xs font-semibold">{step.title}</p>
                </div>
                <p className="text-text-secondary mt-2 text-[10px] leading-4">“{step.prompt}”</p>
                <div className="mt-2">
                  <CopyButton value={step.prompt} label="Copy prompt" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="How results appear"
          title="Publication and learner interaction"
          description="A successful build becomes a normal LearnerVerse course, so it uses the same review, publishing, discovery, and learning experience as manually created content."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FileJson,
              title: "Review",
              body: "Open My Courses, inspect lesson order, scripts, quizzes, assets, and validation warnings.",
            },
            {
              icon: Play,
              title: "Publish",
              body: "Select Publish to lock a validated draft, then Make Public to expose its public course page.",
            },
            {
              icon: Network,
              title: "Discover",
              body: "The public course appears in Course Hub and can be shared by its stable public URL.",
            },
            {
              icon: Box,
              title: "Learn",
              body: "Learners enroll, watch or read lessons, complete quizzes, discuss, and track progress.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-border-default bg-bg-secondary rounded-xl border p-4"
            >
              <item.icon className="text-accent-purple size-4" />
              <p className="text-text-primary mt-3 text-xs font-semibold">{item.title}</p>
              <p className="text-text-tertiary mt-1 text-[10px] leading-4">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Reliability & security"
          title="Production rules that matter"
          description="These constraints keep retries safe, costs visible, credentials private, and publication intentional."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              icon: RefreshCw,
              title: "Always use idempotency keys",
              body: "Reuse the same key only when retrying the same logical build. A repeated request returns the existing submission instead of creating duplicates.",
            },
            {
              icon: Clock3,
              title: "Respect retry_after_ms",
              body: "Use the delay returned by get_job. Do not busy-loop, and stop polling on completed, failed, canceled, or review states.",
            },
            {
              icon: ShieldCheck,
              title: "Least privilege per client",
              body: "Keep mcp:read, add only the scopes that client needs, rotate tokens periodically, and revoke lost or unused credentials immediately.",
            },
            {
              icon: CircleStop,
              title: "Approval before exposure",
              body: "Keep require_human_review_before_publish enabled. Preview generated material and verify licenses before making a course public.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-border-default bg-bg-secondary flex gap-3 rounded-xl border p-4"
            >
              <div className="bg-bg-tertiary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <item.icon className="text-text-secondary size-4" />
              </div>
              <div>
                <p className="text-text-primary text-xs font-semibold">{item.title}</p>
                <p className="text-text-tertiary mt-1 text-[10px] leading-4">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-accent-amber size-4" />
          <h2 className="text-text-primary text-sm font-semibold">Troubleshooting</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            [
              "401 Unauthorized",
              "The token is missing, revoked, mistyped, or unavailable to the desktop app process. Generate a new key and restart the client with the environment variable set.",
            ],
            [
              "403 Missing required scopes",
              "The tool needs a permission not present on this token. Generate a new narrowly scoped token; existing token scopes cannot be expanded.",
            ],
            [
              "Connection refused",
              "The local backend is not running or the port differs. Start LearnerVerse and copy the endpoint shown on this page again.",
            ],
            [
              "Job remains queued",
              "Ask the agent for get_job output and inspect the worker logs. Do not resubmit with a new idempotency key while the original job exists.",
            ],
            [
              "Host or origin rejected",
              "The deployed MCP host must be included in backend MCP_ALLOWED_HOSTS and allowed origins must match the client deployment.",
            ],
            [
              "Spec validation fails",
              "Ask the agent to read the v1 schema resource, preserve request and lesson IDs, and correct each structured error before a dry run.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-text-primary font-mono text-[11px] font-semibold">{title}</p>
              <p className="text-text-tertiary mt-1 text-[10px] leading-4">{body}</p>
            </div>
          ))}
        </div>
        <div className="border-border-default mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-text-tertiary text-[10px]">
            MCP specification target: 2026-07-28 · CourseBuildSpec: 1.0
          </p>
          <a
            href="https://modelcontextprotocol.io/specification/2026-07-28"
            target="_blank"
            rel="noreferrer"
            className="text-accent-blue inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
          >
            Read the MCP specification <ExternalLink className="size-3" />
          </a>
        </div>
      </section>
    </div>
  );
}
