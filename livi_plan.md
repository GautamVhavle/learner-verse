# LiVi Chatbot — Implementation Plan

> **LiVi** is an AI-powered learning assistant embedded in the Learner Verse sidebar.
> Built with Vercel AI SDK (`@ai-sdk/react`), FastAPI streaming endpoint, OpenRouter (Qwen model), and Supabase PostgreSQL for persistence.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  Sidebar                    LiviChatPanel (Sheet overlay)       │
│  ┌──────────┐              ┌──────────────────────────────────┐ │
│  │ ...      │   click →    │  ThreadList │ ChatArea           │ │
│  │ ✨ LiVi  │──────────────│  (drawer)   │  ┌──────────────┐ │ │
│  │ Settings │              │             │  │ Messages      │ │ │
│  │ Help     │              │  thread-1   │  │ (streaming)   │ │ │
│  └──────────┘              │  thread-2   │  │               │ │ │
│                            │  thread-3   │  ├──────────────┤ │ │
│                            │             │  │ ChatInput     │ │ │
│                            └─────────────┴──┴──────────────┘ │ │
│                                                                 │
│  useChat (@ai-sdk/react)  ←→  TextStreamChatTransport           │
│                                  ↓ POST                         │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND (FastAPI)                        │
│                                                                 │
│  POST /api/v1/chat/{thread_id}/stream                           │
│    → Load history from Supabase                                 │
│    → Call OpenRouter (SSE streaming)                            │
│    → Stream text chunks back to client                          │
│    → Save user + assistant messages to Supabase                 │
│                                                                 │
│  CRUD: /api/v1/chat/threads                                     │
│    → Create / List / Rename / Delete threads                    │
│    → List messages for a thread                                 │
├─────────────────────────────────────────────────────────────────┤
│                     SUPABASE (PostgreSQL)                        │
│                                                                 │
│  chat_threads:  id, user_id, title, created_at, updated_at     │
│  chat_messages: id, thread_id, role, content, created_at       │
└─────────────────────────────────────────────────────────────────┘
```

**Key Decisions:**
- **AI SDK `useChat`** on frontend with `TextStreamChatTransport` — gives us streaming, status management, message state, stop/regenerate for free
- **FastAPI streams SSE** — uses `httpx` async streaming to proxy OpenRouter's OpenAI-compatible API; returns `text/plain` stream that `TextStreamChatTransport` consumes
- **No Node.js backend needed** — AI SDK Core (`streamText`) is Node.js-only, but AI SDK UI (`useChat`) works with any HTTP endpoint via transports
- **Supabase via raw SQL** (same as existing storage pattern) — no extra SDK, just `asyncpg` through SQLAlchemy
- **OpenRouter** at `https://openrouter.ai/api/v1/chat/completions` with model `qwen/qwen3-235b-a22b:free`

---

## Phase 1: Database Schema & Backend Models
**Goal:** Create the Supabase tables and SQLAlchemy models for chat persistence.

### Tasks
- [ ] **1.1** Create SQLAlchemy models: `ChatThread` and `ChatMessage` in `backend/app/models/`
  - `ChatThread`: id (UUID PK), user_id (FK → users), title (varchar 200), created_at, updated_at
  - `ChatMessage`: id (UUID PK), thread_id (FK → chat_threads, CASCADE), role (varchar 20: "user"/"assistant"/"system"), content (text), created_at
  - Indexes on `user_id`, `thread_id`
- [ ] **1.2** Create Alembic migration for the two new tables
- [ ] **1.3** Create Pydantic schemas in `backend/app/schemas/chat.py`
  - `ThreadCreate(title: str)`, `ThreadResponse(id, title, created_at, updated_at, message_preview)`
  - `ThreadListResponse(items: list[ThreadResponse])`, `MessageResponse(id, role, content, created_at)`
  - `ChatRequest(message: str)` — for the streaming endpoint
- [ ] **1.4** Create repository `backend/app/repositories/chat_repo.py`
  - `create_thread()`, `list_threads(user_id)`, `get_thread(thread_id, user_id)`, `rename_thread()`, `delete_thread()`
  - `add_message()`, `list_messages(thread_id)`, `get_recent_messages(thread_id, limit=50)`
- [ ] **1.5** Run migration against Supabase, verify tables created

### Checklist
- [ ] Models use `UUID(as_uuid=True)` matching existing patterns
- [ ] Foreign keys with `ondelete="CASCADE"` so deleting a thread removes messages
- [ ] `updated_at` auto-updates on new message via trigger or app-level
- [ ] Migration is reversible (down migration drops tables)

---

## Phase 2: Backend Chat Streaming Endpoint
**Goal:** Create a FastAPI endpoint that receives a message, loads conversation history, streams a response from OpenRouter, and persists both messages.

### Tasks
- [ ] **2.1** Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to `backend/app/core/config.py` Settings
- [ ] **2.2** Create `backend/app/services/chat_service.py`
  - `stream_chat(thread_id, user_id, user_message, db)` → AsyncGenerator[str]
  - Loads recent messages (last 50) from DB for context
  - Prepends system prompt: "You are LiVi, a friendly and knowledgeable learning assistant for Learner Verse..."
  - Saves user message to DB
  - Calls OpenRouter via `httpx.AsyncClient` with `stream=True`:
    ```
    POST https://openrouter.ai/api/v1/chat/completions
    Authorization: Bearer {OPENROUTER_API_KEY}
    Body: { model, messages, stream: true }
    ```
  - Parses SSE `data: {...}` lines, extracts `choices[0].delta.content`
  - Yields text chunks
  - On completion, saves full assistant message to DB
  - Auto-generates thread title from first user message (truncated to ~60 chars)
- [ ] **2.3** Create `backend/app/api/v1/endpoints/chat.py`
  - `POST /chat/threads` — create new thread
  - `GET /chat/threads` — list user's threads (sorted by updated_at desc)
  - `GET /chat/threads/{thread_id}` — get thread with messages
  - `PUT /chat/threads/{thread_id}` — rename thread
  - `DELETE /chat/threads/{thread_id}` — delete thread + messages
  - `POST /chat/threads/{thread_id}/stream` — streaming chat endpoint
    - Returns `StreamingResponse(media_type="text/plain")` with chunked text
    - Uses `stream_chat()` service
- [ ] **2.4** Register chat router in `backend/app/api/v1/router.py`
- [ ] **2.5** Test with `curl` — verify streaming works end-to-end

### Checklist
- [ ] API key never exposed to frontend (only used server-side)
- [ ] Rate limiting: max 20 messages per minute per user (soft limit via in-memory counter)
- [ ] Input validation: message max 4000 chars, thread title max 200 chars
- [ ] Error handling: OpenRouter 429/500 → meaningful error to client
- [ ] Thread ownership verified on all endpoints (user can only access own threads)
- [ ] System prompt is not exposed to the client
- [ ] Content-Type: `text/plain; charset=utf-8` for streaming response
- [ ] Messages sanitized (strip dangerous HTML before storing)

---

## Phase 3: Frontend Dependencies & Chat Hook
**Goal:** Install AI SDK, create the streaming transport and custom chat hooks.

### Tasks
- [ ] **3.1** Install frontend deps:
  ```bash
  cd frontend && npm install @ai-sdk/react ai
  ```
- [ ] **3.2** Create `frontend/src/hooks/useChat.ts` — wrapper around AI SDK's `useChat`
  - Configure `TextStreamChatTransport` pointing to `/chat/threads/{threadId}/stream`
  - Pass auth token via transport headers (reuse `api.ts` token getter)
  - Handle thread creation on first message (if no active thread)
  - Expose: `messages`, `sendMessage`, `status`, `stop`, `error`, `setMessages`
- [ ] **3.3** Create `frontend/src/hooks/useChatThreads.ts` — React Query hooks
  - `useChatThreadsQuery()` — list threads
  - `useChatMessagesQuery(threadId)` — load messages for a thread
  - `useCreateThreadMutation()` — create new thread
  - `useRenameThreadMutation()` — rename thread
  - `useDeleteThreadMutation()` — delete thread
- [ ] **3.4** Create `frontend/src/stores/chatStore.ts` — Zustand store for UI state
  - `isOpen: boolean` — chat panel open/closed
  - `activeThreadId: string | null` — currently selected thread
  - `isThreadListOpen: boolean` — thread list drawer toggle
  - Actions: `openChat()`, `closeChat()`, `toggleChat()`, `setActiveThread()`, `startNewChat()`

### Checklist
- [ ] Auth token dynamically injected into transport headers (not hardcoded)
- [ ] Thread auto-creation: first message creates thread, then streams
- [ ] `initialMessages` loaded from React Query cache when switching threads
- [ ] Proper cleanup on thread switch (reset `useChat` state via `setMessages`)
- [ ] `experimental_throttle: 50` on `useChat` to avoid excessive re-renders during streaming

---

## Phase 4: Chat UI Components
**Goal:** Build the full chat interface — panel, messages, input, empty state.

### Tasks
- [ ] **4.1** Create `frontend/src/components/chat/LiviChatPanel.tsx`
  - Uses shadcn `<Sheet>` component (slides in from right)
  - Header: "LiVi" brand + thread title + thread list toggle + close button
  - Body: `<ChatMessageList />` or `<ChatEmptyState />`
  - Footer: `<ChatInput />`
  - Controlled by `chatStore.isOpen`
- [ ] **4.2** Create `frontend/src/components/chat/ChatMessageList.tsx`
  - Scrollable container with auto-scroll to bottom on new messages
  - Renders user & assistant message bubbles
  - User messages: right-aligned, accent-blue background
  - Assistant messages: left-aligned, bg-secondary, with LiVi avatar
  - Streaming indicator: animated dots when `status === 'streaming'`
  - Markdown rendering for assistant messages (`react-markdown` + `remark-gfm` + `rehype-highlight`)
  - Scroll-to-bottom button when user scrolls up
- [ ] **4.3** Create `frontend/src/components/chat/ChatInput.tsx`
  - Auto-resizing textarea (`react-textarea-autosize`, already installed)
  - Send button (disabled when empty or status !== 'ready')
  - Stop button when streaming
  - Enter to send, Shift+Enter for newline
  - Max 4000 character limit with counter
- [ ] **4.4** Create `frontend/src/components/chat/ChatEmptyState.tsx`
  - LiVi avatar/logo
  - Welcome message: "Hi! I'm LiVi, your learning assistant. Ask me anything!"
  - 3-4 suggestion chips: "Explain a concept", "Help me study", "Quiz me", "Summarize a topic"
  - Clicking a chip populates the input
- [ ] **4.5** Create `frontend/src/components/chat/ChatMessageBubble.tsx`
  - Role-aware styling (user vs assistant)
  - Timestamp (relative, e.g. "2m ago")
  - Copy button on hover for assistant messages
  - Markdown content with syntax highlighting for code blocks

### Checklist
- [ ] Dark mode compatible (uses design token variables, not hardcoded colors)
- [ ] Responsive: full-width on mobile, fixed-width sheet on desktop
- [ ] Keyboard accessible: focus management, Escape to close
- [ ] Auto-scroll only when user is at bottom (don't hijack scroll position)
- [ ] Message transitions: smooth fade-in for new messages
- [ ] Sheet width: ~420px on desktop, 100vw on mobile
- [ ] Loading skeleton while messages are loading from DB

---

## Phase 5: Sidebar Integration & Thread Management
**Goal:** Add LiVi button to sidebar, build thread list drawer, and wire up thread CRUD.

### Tasks
- [ ] **5.1** Add LiVi trigger to sidebar
  - Add `Sparkles` icon button in sidebar between nav content and footer
  - Styled distinctly: subtle gradient or accent highlight to stand out
  - Badge with unread/new indicator (optional, phase 6)
  - Click toggles `chatStore.isOpen`
  - Tooltip: "Ask LiVi"
- [ ] **5.2** Create `frontend/src/components/chat/ChatThreadList.tsx`
  - Collapsible panel inside the chat sheet (left side or top drawer)
  - "New Chat" button at top
  - List of threads sorted by updated_at desc
  - Each thread: title, relative date, delete button on hover
  - Active thread highlighted
  - Click switches thread (loads messages, updates `useChat` state)
  - Inline rename on double-click
- [ ] **5.3** Wire up `LiviChatPanel` in `AppShell.tsx`
  - Render `<LiviChatPanel />` at the same level as `<CommandPalette />`
  - Outside `SidebarProvider` so it overlays everything
- [ ] **5.4** Thread auto-title generation
  - After first AI response, auto-rename thread to a summary (first ~60 chars of user message or AI-generated title)
  - Update thread title via backend PUT endpoint
- [ ] **5.5** Keyboard shortcut: `Cmd+L` / `Ctrl+L` to toggle LiVi panel

### Checklist
- [ ] Thread list lazy-loads (only fetches when opened)
- [ ] Deleting active thread switches to next thread or empty state
- [ ] Thread switch preserves scroll position of previous thread
- [ ] Empty thread list shows "Start a conversation with LiVi"
- [ ] Maximum 100 threads per user (soft limit, oldest auto-archived)
- [ ] Sidebar button visible in both Creator and Learner modes

---

## Phase 6: Polish, Security & Production Readiness
**Goal:** Add finishing touches — markdown rendering, error states, security hardening, and deploy.

### Tasks
- [ ] **6.1** Markdown rendering in assistant messages
  - Code blocks with syntax highlighting (rehype-highlight, already installed)
  - Tables, lists, links (open in new tab), bold/italic
  - LaTeX math rendering (if needed, via KaTeX)
  - Sanitize HTML output (rehype-sanitize)
- [ ] **6.2** Error handling & edge cases
  - Network error → "Something went wrong. Try again." with retry button
  - OpenRouter rate limit → "LiVi is thinking too hard. Please wait a moment."
  - Empty response → "I couldn't generate a response. Please try rephrasing."
  - Token limit exceeded → truncate oldest messages from context window
- [ ] **6.3** Security hardening
  - Backend: Rate limit (20 req/min per user, tracked in-memory with TTL)
  - Backend: Input sanitization (strip script tags, limit message length)
  - Backend: Thread ownership check on every endpoint
  - Frontend: XSS prevention via react-markdown (no dangerouslySetInnerHTML)
  - API key only on server (never in frontend bundle)
  - CORS already configured for allowed origins
- [ ] **6.4** Loading & transition states
  - Skeleton loader while thread messages load
  - Typing indicator animation for LiVi (3 bouncing dots)
  - Smooth sheet open/close transitions
  - Optimistic UI for thread creation
- [ ] **6.5** System prompt tuning
  - Context-aware: "You are LiVi, a helpful learning assistant for the Learner Verse platform..."
  - Personality: friendly, encouraging, concise
  - Instructed to use markdown for formatting
  - Instructed to ask clarifying questions when needed
  - Instructed to keep responses focused on learning topics
- [ ] **6.6** Deploy
  - Add `OPENROUTER_API_KEY` to FastAPI Cloud env vars
  - Add `OPENROUTER_MODEL=qwen/qwen3-235b-a22b:free` to env vars
  - Run Alembic migration on production Supabase
  - Redeploy backend to FastAPI Cloud
  - Redeploy frontend to Vercel
  - Test full flow on production

### Checklist
- [ ] No secrets in frontend bundle (verify with build output inspection)
- [ ] Streaming works on production (no proxy buffering issues)
- [ ] Chat panel doesn't interfere with existing UI (z-index, focus traps)
- [ ] Performance: messages virtualized if thread has 100+ messages (stretch goal)
- [ ] Accessibility: ARIA labels on chat panel, focus management
- [ ] Mobile: chat panel is full-screen overlay on screens < 768px

---

## File Map (New Files)

```
backend/
  app/
    models/
      chat_thread.py          ← Phase 1
      chat_message.py         ← Phase 1
    schemas/
      chat.py                 ← Phase 1
    repositories/
      chat_repo.py            ← Phase 1
    services/
      chat_service.py         ← Phase 2
    api/v1/endpoints/
      chat.py                 ← Phase 2

frontend/
  src/
    hooks/
      useLiviChat.ts          ← Phase 3
      useChatThreads.ts       ← Phase 3
    stores/
      chatStore.ts            ← Phase 3
    components/chat/
      LiviChatPanel.tsx       ← Phase 4
      ChatMessageList.tsx     ← Phase 4
      ChatInput.tsx           ← Phase 4
      ChatEmptyState.tsx      ← Phase 4
      ChatMessageBubble.tsx   ← Phase 4
      ChatThreadList.tsx      ← Phase 5
```

## Modified Files

```
backend/
  app/core/config.py          ← Phase 2 (add OPENROUTER_* settings)
  app/api/v1/router.py        ← Phase 2 (register chat router)
  alembic/versions/xxx.py     ← Phase 1 (migration)

frontend/
  src/components/layout/
    Sidebar.tsx               ← Phase 5 (add LiVi button)
    AppShell.tsx              ← Phase 5 (render LiviChatPanel)
  package.json                ← Phase 3 (add ai, @ai-sdk/react)
```

---

## Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `@ai-sdk/react` | frontend | `useChat` hook for streaming chat UI |
| `ai` | frontend | `TextStreamChatTransport`, types |
| `httpx` | backend | Already installed — used for OpenRouter API calls |
| `asyncpg` | backend | Already installed — Supabase PostgreSQL |

**No new backend dependencies required.** `httpx` is already in pyproject.toml.

---

## Environment Variables (New)

| Variable | Where | Value |
|----------|-------|-------|
| `OPENROUTER_API_KEY` | backend `.env` + FastAPI Cloud | `sk-or-v1-...` (already in .env) |
| `OPENROUTER_MODEL` | backend `.env` + FastAPI Cloud | `qwen/qwen3-235b-a22b:free` |

---

## Security Summary

1. **API Key Protection**: `OPENROUTER_API_KEY` only used server-side; never in frontend
2. **Authentication**: All chat endpoints require `get_current_user` (Auth0 JWT)
3. **Authorization**: Thread ownership checked on every operation
4. **Input Validation**: Message max 4000 chars, title max 200 chars, Pydantic schemas
5. **Output Sanitization**: Markdown rendered via `react-markdown` (safe by default)
6. **Rate Limiting**: 20 messages/minute per user (server-side)
7. **CORS**: Already configured for allowed origins only
8. **SQL Injection**: Prevented by SQLAlchemy parameterized queries (existing pattern)
