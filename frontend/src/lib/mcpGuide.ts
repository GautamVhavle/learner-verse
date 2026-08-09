export const MCP_SCOPES = [
  {
    value: "mcp:read",
    label: "Discover MCP",
    description: "Connect, inspect capabilities, and read workflow/schema resources.",
  },
  {
    value: "course:write",
    label: "Build courses",
    description: "Persist a validated course specification and create a build project.",
  },
  {
    value: "render:submit",
    label: "Submit renders",
    description: "Queue a course build after validation or a dry run.",
  },
  {
    value: "render:read",
    label: "Read job status",
    description: "Poll owned jobs and inspect progress, results, and next actions.",
  },
  {
    value: "render:cancel",
    label: "Cancel jobs",
    description: "Request cancellation of an active owned build.",
  },
  {
    value: "asset:read",
    label: "Read assets",
    description: "Reserved for browsing reusable assets as asset tools are introduced.",
  },
  {
    value: "asset:write",
    label: "Write assets",
    description: "Reserved for uploading or generating assets through future asset tools.",
  },
  {
    value: "course:publish",
    label: "Publish courses",
    description:
      "Reserved for an explicit MCP review/publish action; UI approval is required today.",
  },
] as const;

export const DEFAULT_MCP_SCOPES = [
  "mcp:read",
  "course:write",
  "render:submit",
  "render:read",
  "render:cancel",
];

export type McpClientId = "codex" | "vscode" | "claude" | "cursor" | "opencode";

export interface McpClientGuide {
  id: McpClientId;
  name: string;
  configLocation: string;
  description: string;
  docsUrl: string;
  steps: string[];
  config: (url: string) => string;
  verify: string;
}

export const MCP_CLIENTS: McpClientGuide[] = [
  {
    id: "codex",
    name: "Codex",
    configLocation: "~/.codex/config.toml",
    description: "Works in the Codex app, CLI, and IDE extension from the same configuration.",
    docsUrl: "https://developers.openai.com/codex/mcp",
    steps: [
      "Set LEARNERVERSE_MCP_TOKEN in the environment that launches Codex.",
      "Add the TOML block to your user or trusted project config.",
      "Restart Codex, then use /mcp to confirm LearnerVerse is connected.",
    ],
    config: (url) =>
      [
        "[mcp_servers.learnerverse]",
        `url = "${url}"`,
        'bearer_token_env_var = "LEARNERVERSE_MCP_TOKEN"',
        'default_tools_approval_mode = "writes"',
        "tool_timeout_sec = 600",
      ].join("\n"),
    verify: "codex mcp list",
  },
  {
    id: "vscode",
    name: "VS Code",
    configLocation: ".vscode/mcp.json or user mcp.json",
    description: "Uses a password input so the token is prompted for instead of committed.",
    docsUrl: "https://code.visualstudio.com/docs/agent-customization/mcp-servers",
    steps: [
      "Run “MCP: Open User Configuration” from the Command Palette.",
      "Merge the inputs and servers entries below into mcp.json.",
      "Start the server from the MCP editor and enter the token when prompted.",
    ],
    config: (url) =>
      JSON.stringify(
        {
          inputs: [
            {
              type: "promptString",
              id: "learnerverse-token",
              description: "LearnerVerse personal MCP token",
              password: true,
            },
          ],
          servers: {
            learnerverse: {
              type: "http",
              url,
              headers: { Authorization: "Bearer ${input:learnerverse-token}" },
            },
          },
        },
        null,
        2,
      ),
    verify: "Command Palette → MCP: List Servers",
  },
  {
    id: "claude",
    name: "Claude Code",
    configLocation: "~/.claude.json or .mcp.json",
    description: "Uses Claude Code environment expansion to keep the token out of source control.",
    docsUrl: "https://code.claude.com/docs/en/mcp",
    steps: [
      "Export LEARNERVERSE_MCP_TOKEN before launching Claude Code.",
      "Add the server to .mcp.json (project) or ~/.claude.json (user).",
      "Run /mcp in Claude Code and confirm the server reports connected.",
    ],
    config: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            learnerverse: {
              type: "http",
              url,
              headers: { Authorization: "Bearer ${LEARNERVERSE_MCP_TOKEN}" },
            },
          },
        },
        null,
        2,
      ),
    verify: "claude mcp get learnerverse",
  },
  {
    id: "cursor",
    name: "Cursor",
    configLocation: "~/.cursor/mcp.json or .cursor/mcp.json",
    description: "Connects to the Streamable HTTP endpoint from Cursor Agent tools.",
    docsUrl: "https://docs.cursor.com/context/model-context-protocol",
    steps: [
      "Set LEARNERVERSE_MCP_TOKEN before launching Cursor from that environment.",
      "Add the server block to the global or project mcp.json.",
      "Open Cursor Settings → MCP and enable LearnerVerse.",
    ],
    config: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            learnerverse: {
              type: "http",
              url,
              headers: { Authorization: "Bearer ${env:LEARNERVERSE_MCP_TOKEN}" },
            },
          },
        },
        null,
        2,
      ),
    verify: "cursor-agent mcp list-tools learnerverse",
  },
  {
    id: "opencode",
    name: "OpenCode",
    configLocation: "~/.config/opencode/opencode.json or opencode.json",
    description: "Uses an environment substitution and disables OAuth for personal-token auth.",
    docsUrl: "https://opencode.ai/v2/docs/mcp-servers",
    steps: [
      "Export LEARNERVERSE_MCP_TOKEN before starting OpenCode.",
      "Merge the mcp configuration into your global or project opencode.json.",
      "Restart OpenCode and list MCP servers to verify the connection.",
    ],
    config: (url) =>
      JSON.stringify(
        {
          $schema: "https://opencode.ai/config.json",
          mcp: {
            servers: {
              learnerverse: {
                type: "remote",
                url,
                oauth: false,
                headers: { Authorization: "Bearer {env:LEARNERVERSE_MCP_TOKEN}" },
              },
            },
          },
        },
        null,
        2,
      ),
    verify: "opencode2 mcp list",
  },
];

export const COURSE_SPEC_EXAMPLE = JSON.stringify(
  {
    $schema: "https://learnerverse.xyz/schemas/course-build-spec-v1.json",
    schema_version: "1.0",
    request_id: "intro-fastapi-2026-001",
    course: {
      title: "FastAPI Foundations",
      description: "Build and test a production-ready FastAPI service.",
      category: "development",
      tags: ["python", "fastapi", "api"],
      publish_when_complete: false,
    },
    defaults: {
      locale: "en-US",
      resolution: "1920x1080",
      fps: 30,
      voice_profile: "default",
      caption_style: "learnerverse-default",
      template: "educational-v1",
      music: { enabled: false },
    },
    sections: [
      {
        id: "getting-started",
        title: "Getting started",
        lessons: [
          {
            id: "first-api",
            title: "Your first FastAPI endpoint",
            learning_objectives: ["Create a FastAPI application", "Run it locally with Uvicorn"],
            script: {
              narration:
                "FastAPI turns typed Python functions into validated HTTP endpoints. In this lesson, we create an app, define a route, and inspect its generated API documentation.",
              scenes: [
                {
                  id: "title",
                  type: "title",
                  on_screen_text: ["Your first FastAPI endpoint"],
                },
                {
                  id: "code",
                  type: "code",
                  on_screen_text: [
                    "from fastapi import FastAPI",
                    "app = FastAPI()",
                    '@app.get("/health")',
                    'def health(): return {"status": "ok"}',
                  ],
                },
              ],
            },
            quiz: {
              questions: [
                {
                  question: "What creates a GET endpoint in FastAPI?",
                  options: ["@app.get", "app.route_get", "FastAPI.get_route"],
                  correct_option: 0,
                },
              ],
            },
          },
        ],
      },
    ],
    assets: {},
    policies: {
      max_estimated_cost: 5,
      allow_generated_assets: true,
      require_human_review_before_publish: true,
    },
  },
  null,
  2,
);
