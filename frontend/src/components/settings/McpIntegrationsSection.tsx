import { useState } from "react";
import { Copy, Plug } from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL, api } from "@/lib/api";

const availableScopes = [
  "mcp:read",
  "course:write",
  "asset:read",
  "asset:write",
  "render:submit",
  "render:read",
  "render:cancel",
  "course:publish",
];

const ideScopes = ["mcp:read", "course:write", "render:submit", "render:read"];

function codexConfig(): string {
  const mcpUrl = `${new URL(API_BASE_URL).origin}/mcp/`;
  return [
    "[mcp_servers.learnerverse]",
    `url = "${mcpUrl}"`,
    'bearer_token_env_var = "LEARNERVERSE_MCP_TOKEN"',
  ].join("\n");
}

export function McpIntegrationsSection() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createToken = async () => {
    setLoading(true);
    try {
      const response = await api.post<{ token: string }>("/mcp-settings/tokens", {
        name: "IDE",
        scopes: ideScopes,
      });
      setToken(response.token);
    } catch {
      toast.error("Could not create token");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <section className="border-border-default bg-bg-secondary space-y-4 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <Plug className="text-accent-blue size-4" />
        <h2 className="text-text-primary text-sm font-semibold">MCP & Integrations</h2>
      </div>
      <p className="text-text-tertiary text-xs">
        Connect Codex safely. Personal access tokens are copy-once credentials; use OAuth for remote
        production servers.
      </p>
      <div className="flex gap-2">
        <button
          onClick={createToken}
          disabled={loading}
          className="bg-accent-blue rounded px-3 py-2 text-xs text-white"
        >
          {loading ? "Creating…" : "Create personal MCP token"}
        </button>
        <button
          onClick={() => copy(codexConfig())}
          className="border-border-default rounded border px-3 py-2 text-xs"
        >
          <Copy className="mr-1 inline size-3" />
          Copy Codex config
        </button>
      </div>
      {token && (
        <div className="border-accent-yellow/50 bg-accent-yellow/10 rounded p-3 text-xs">
          <strong>Copy now:</strong> this token will not be shown again.
          <pre className="mt-2 overflow-auto">{token}</pre>
          <button onClick={() => copy(token)} className="mt-2 underline">
            Copy token
          </button>
          <p className="mt-2">
            Set it as <code>LEARNERVERSE_MCP_TOKEN</code> in the environment that launches Codex,
            add the copied TOML to <code>~/.codex/config.toml</code>, then restart Codex.
          </p>
        </div>
      )}
      <p className="text-text-tertiary text-[11px]">
        Available scopes: {availableScopes.join(", ")}. Provider API keys are managed separately and
        never belong in MCP config.
      </p>
    </section>
  );
}
