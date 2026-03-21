# Learner Verse — MVP Implementation Plan

> 20-phase technical implementation guide. Every phase references [plan.md](plan.md) for product specs. This document covers **how** to build it.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript + Vite | SPA, client-side routing |
| **Styling** | Tailwind CSS v4 | Dark theme, Vercel/Geist-inspired design tokens |
| **UI Components** | shadcn/ui + Magic UI | Copy-paste components, customized to dark theme |
| **State Management** | Zustand | Lightweight, no boilerplate |
| **Data Fetching** | TanStack Query (React Query) | Cache, refetch, optimistic updates |
| **Routing** | React Router v7 | Nested layouts, protected routes |
| **Markdown** | MDXEditor or react-markdown + remark/rehype | Live preview editor + rendered output |
| **Drag & Drop** | @dnd-kit/core | Accessible, performant DnD for sections/lessons |
| **PDF Generation** | @react-pdf/renderer | Certificate PDF generation |
| **Frontend Testing** | Vitest + React Testing Library | Unit + component tests |
| **E2E Testing** | Playwright | Full browser tests per feature |
| **Backend** | FastAPI (Python 3.12+) | Async, auto-generated Swagger UI |
| **ORM** | SQLAlchemy 2.0 (async) | Typed models, async sessions |
| **Migrations** | Alembic | Version-controlled DB schema |
| **Database** | PostgreSQL 16 (Docker) | Containerized, persistent volume |
| **Auth** | Clerk (Google OAuth) | Frontend SDK + backend JWT verification |
| **File Storage** | Local filesystem (MVP) | Thumbnail uploads, `/uploads` directory |
| **Validation** | Pydantic v2 | Request/response schemas, strict validation |
| **Backend Testing** | pytest + pytest-asyncio + httpx | Async test client |
| **API Docs** | Swagger UI (FastAPI built-in) | Auto-generated, detailed |
| **Containerization** | Docker + Docker Compose | Postgres + backend + (optional) frontend |
| **Linting** | ESLint + Ruff | Frontend + backend linting |
| **Formatting** | Prettier + Ruff | Consistent code style |

---

## Design System — Vercel/Geist-Inspired Dark Theme

Based on Vercel's Geist Design System. All values are concrete tokens used throughout the app.

### Color Palette

```
/* Backgrounds */
--bg-root:        #000000    /* Page background */
--bg-primary:     #0a0a0a    /* Main content background */
--bg-secondary:   #111111    /* Cards, elevated surfaces */
--bg-tertiary:    #1a1a1a    /* Hover states, subtle fills */
--bg-quaternary:  #252525    /* Active states, inputs */

/* Borders */
--border-default: #222222    /* Default borders */
--border-hover:   #333333    /* Hover borders */
--border-active:  #444444    /* Active/focus borders */

/* Text */
--text-primary:   #fafafa    /* Primary text — headings, body */
--text-secondary: #a1a1a1    /* Secondary text — descriptions, labels */
--text-tertiary:  #666666    /* Muted text — placeholders, disabled */

/* Brand / Accent */
--accent-blue:    #3b82f6    /* Links, primary actions, progress */
--accent-green:   #22c55e    /* Success, completion, streaks */
--accent-amber:   #f59e0b    /* Warnings, behind-schedule */
--accent-red:     #ef4444    /* Errors, destructive actions */
--accent-purple:  #a855f7    /* Badges, certificates */

/* Semantic */
--success:        #22c55e
--warning:        #f59e0b
--error:          #ef4444
--info:           #3b82f6
```

### Typography

```
Font Family:     "Inter", -apple-system, BlinkMacSystemFont, sans-serif
Mono Font:       "JetBrains Mono", "Fira Code", monospace

/* Scale */
text-xs:    0.75rem / 1rem      /* 12px — badges, captions */
text-sm:    0.875rem / 1.25rem  /* 14px — secondary text, labels */
text-base:  1rem / 1.5rem       /* 16px — body text */
text-lg:    1.125rem / 1.75rem  /* 18px — subheadings */
text-xl:    1.25rem / 1.75rem   /* 20px — section titles */
text-2xl:   1.5rem / 2rem       /* 24px — page titles */
text-3xl:   1.875rem / 2.25rem  /* 30px — hero text */

Font Weights:    400 (normal), 500 (medium), 600 (semibold), 700 (bold)
Letter Spacing:  -0.02em for headings, normal for body
```

### Spacing & Layout

```
Border Radius:   rounded-md (6px) for buttons/inputs, rounded-lg (8px) for cards, rounded-xl (12px) for modals
Sidebar Width:   256px (collapsed: 64px)
Header Height:   56px
Max Content:     1280px (centered)
Card Padding:    p-4 (16px) default, p-6 (24px) for large cards
Grid Gap:        gap-4 (16px) for card grids
```

### Component Patterns

```
Buttons:
  Primary   — bg-white text-black hover:bg-gray-200, rounded-md, h-9 px-4, font-medium text-sm
  Secondary — bg-transparent border border-[--border-default] text-[--text-primary] hover:bg-[--bg-tertiary], rounded-md
  Ghost     — bg-transparent text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary]
  Danger    — bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20

Cards:
  bg-[--bg-secondary] border border-[--border-default] rounded-lg
  hover:border-[--border-hover] transition-colors duration-150

Inputs:
  bg-[--bg-quaternary] border border-[--border-default] rounded-md text-[--text-primary]
  placeholder:text-[--text-tertiary]
  focus:border-[--border-active] focus:ring-1 focus:ring-[--border-active]

Tooltips/Badges:
  bg-[--bg-tertiary] text-[--text-secondary] text-xs rounded-md px-2 py-0.5

Transitions:
  All interactive elements: transition-colors duration-150
  Modals: fade + scale, 200ms
  Sidebar: width transition 200ms
```

---

## Project Structure

```
learner-verse/
├── .github/
│   └── agents/                    # Agent configs (existing)
├── .vscode/
│   └── mcp.json                   # MCP server configs (existing)
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── courses.py
│   │   │   │   │   ├── sections.py
│   │   │   │   │   ├── lessons.py
│   │   │   │   │   ├── progress.py
│   │   │   │   │   ├── certificates.py
│   │   │   │   │   ├── inbox.py
│   │   │   │   │   ├── search.py
│   │   │   │   │   ├── stats.py
│   │   │   │   │   ├── settings.py
│   │   │   │   │   ├── opengraph.py
│   │   │   │   │   └── uploads.py
│   │   │   │   └── router.py      # Aggregates all v1 routes
│   │   │   └── dependencies.py    # Auth, DB session, rate limiting
│   │   ├── core/
│   │   │   ├── config.py          # Settings (env vars, SINGLE_USER_MODE)
│   │   │   ├── security.py        # Clerk JWT verification
│   │   │   └── database.py        # Async engine, session factory
│   │   ├── models/                # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── section.py
│   │   │   ├── lesson.py
│   │   │   ├── progress.py
│   │   │   ├── certificate.py
│   │   │   ├── inbox.py
│   │   │   ├── study_note.py
│   │   │   └── base.py            # Declarative base, common mixins
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── section.py
│   │   │   ├── lesson.py
│   │   │   ├── progress.py
│   │   │   ├── certificate.py
│   │   │   ├── inbox.py
│   │   │   ├── search.py
│   │   │   ├── stats.py
│   │   │   └── common.py          # Pagination, error responses
│   │   ├── services/              # Business logic layer
│   │   │   ├── course_service.py
│   │   │   ├── section_service.py
│   │   │   ├── lesson_service.py
│   │   │   ├── progress_service.py
│   │   │   ├── certificate_service.py
│   │   │   ├── inbox_service.py
│   │   │   ├── search_service.py
│   │   │   ├── stats_service.py
│   │   │   ├── opengraph_service.py
│   │   │   └── youtube_service.py
│   │   ├── repositories/          # Data access layer
│   │   │   ├── course_repo.py
│   │   │   ├── section_repo.py
│   │   │   ├── lesson_repo.py
│   │   │   ├── progress_repo.py
│   │   │   ├── certificate_repo.py
│   │   │   ├── inbox_repo.py
│   │   │   └── base_repo.py       # Generic CRUD operations
│   │   └── main.py                # FastAPI app, CORS, lifespan
│   ├── alembic/
│   │   ├── versions/              # Migration files
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/
│   │   ├── conftest.py            # Fixtures: test DB, test client, test user
│   │   ├── api/
│   │   │   ├── test_auth.py
│   │   │   ├── test_courses.py
│   │   │   ├── test_sections.py
│   │   │   ├── test_lessons.py
│   │   │   ├── test_progress.py
│   │   │   ├── test_certificates.py
│   │   │   ├── test_inbox.py
│   │   │   ├── test_search.py
│   │   │   └── test_stats.py
│   │   └── services/
│   │       ├── test_opengraph.py
│   │       └── test_youtube.py
│   ├── alembic.ini
│   ├── pyproject.toml             # Dependencies, ruff config
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui base components
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── ModeToggle.tsx
│   │   │   ├── course/
│   │   │   │   ├── CourseCard.tsx
│   │   │   │   ├── CourseForm.tsx
│   │   │   │   ├── CourseGrid.tsx
│   │   │   │   └── CourseStatusBadge.tsx
│   │   │   ├── section/
│   │   │   │   ├── SectionBuilder.tsx
│   │   │   │   ├── SectionList.tsx
│   │   │   │   └── SectionProgress.tsx
│   │   │   ├── lesson/
│   │   │   │   ├── LessonBuilder.tsx
│   │   │   │   ├── LessonView.tsx
│   │   │   │   ├── YouTubeEmbed.tsx
│   │   │   │   ├── MarkdownEditor.tsx
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   ├── LinkCard.tsx
│   │   │   │   └── LinkInput.tsx
│   │   │   ├── study/
│   │   │   │   ├── StudySidebar.tsx
│   │   │   │   ├── StudyNotes.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── CompletionButton.tsx
│   │   │   │   └── FocusMode.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── CreatorDashboard.tsx
│   │   │   │   ├── StudentDashboard.tsx
│   │   │   │   ├── ContinueLearning.tsx
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   └── ActivityHeatmap.tsx
│   │   │   ├── certificate/
│   │   │   │   ├── CertificatePreview.tsx
│   │   │   │   └── CertificateDownload.tsx
│   │   │   ├── inbox/
│   │   │   │   ├── QuickCapture.tsx
│   │   │   │   └── InboxList.tsx
│   │   │   ├── search/
│   │   │   │   └── CommandPalette.tsx
│   │   │   └── shared/
│   │   │       ├── EmptyState.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── LoadingSkeleton.tsx
│   │   │       └── KeyboardShortcuts.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CourseBuilderPage.tsx
│   │   │   ├── StudyPage.tsx
│   │   │   ├── LessonPage.tsx
│   │   │   ├── CertificatesPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── TrashPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── OnboardingPage.tsx
│   │   ├── hooks/
│   │   │   ├── useCourses.ts
│   │   │   ├── useSections.ts
│   │   │   ├── useLessons.ts
│   │   │   ├── useProgress.ts
│   │   │   ├── useInbox.ts
│   │   │   ├── useSearch.ts
│   │   │   ├── useStats.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useMode.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useAutoSave.ts
│   │   │   └── useFocusMode.ts
│   │   ├── stores/
│   │   │   ├── modeStore.ts       # Creator / Student mode
│   │   │   ├── uiStore.ts         # Sidebar, focus mode, modals
│   │   │   └── settingsStore.ts   # User preferences
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios/fetch wrapper, base URL, interceptors
│   │   │   ├── auth.ts            # Clerk helpers
│   │   │   ├── utils.ts           # cn(), formatDate, etc.
│   │   │   ├── constants.ts       # Limits, routes, keys
│   │   │   └── youtube.ts         # YouTube URL parsing/validation
│   │   ├── styles/
│   │   │   └── globals.css        # Tailwind directives, CSS variables, custom scrollbar
│   │   ├── types/
│   │   │   ├── course.ts
│   │   │   ├── section.ts
│   │   │   ├── lesson.ts
│   │   │   ├── progress.ts
│   │   │   ├── certificate.ts
│   │   │   ├── inbox.ts
│   │   │   ├── stats.ts
│   │   │   └── user.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── router.tsx             # Route definitions
│   ├── tests/
│   │   ├── components/            # Vitest + RTL component tests
│   │   │   ├── layout/
│   │   │   ├── course/
│   │   │   ├── lesson/
│   │   │   ├── study/
│   │   │   ├── dashboard/
│   │   │   ├── certificate/
│   │   │   ├── inbox/
│   │   │   └── shared/
│   │   ├── hooks/                 # Hook tests
│   │   ├── pages/                 # Page-level tests
│   │   └── e2e/                   # Playwright E2E tests
│   │       ├── auth.spec.ts
│   │       ├── course-crud.spec.ts
│   │       ├── section-lesson.spec.ts
│   │       ├── youtube-embed.spec.ts
│   │       ├── markdown-editor.spec.ts
│   │       ├── link-cards.spec.ts
│   │       ├── study-view.spec.ts
│   │       ├── progress.spec.ts
│   │       ├── certificates.spec.ts
│   │       ├── inbox.spec.ts
│   │       ├── search.spec.ts
│   │       ├── stats.spec.ts
│   │       └── responsive.spec.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml             # Postgres + backend + frontend
├── .env.example                   # All env vars documented
├── .gitignore
├── plan.md                        # Product plan (existing)
├── mvp.md                         # This file
└── README.md
```

---

## Database Schema

```sql
-- Users (synced from Clerk or auto-created in single-user mode)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id        VARCHAR(255) UNIQUE,           -- NULL in single-user mode
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    timezone        VARCHAR(100) DEFAULT 'UTC',
    playback_speed  FLOAT DEFAULT 1.0,
    font_size       VARCHAR(10) DEFAULT 'normal',  -- normal, large, xl
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    thumbnail_url   TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, ready
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    goal_date       DATE,                          -- optional target completion date
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_deleted ON courses(is_deleted);

-- Course Tags (many-to-many)
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    UNIQUE(user_id, name)
);

CREATE TABLE course_tags (
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

-- Sections (milestones within a course)
CREATE TABLE sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    position        INTEGER NOT NULL DEFAULT 0,    -- ordering
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_course_id ON sections(course_id);

-- Lessons (within a section)
CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    youtube_url     TEXT,
    youtube_title   VARCHAR(500),
    youtube_thumbnail TEXT,
    youtube_duration  VARCHAR(20),
    youtube_channel VARCHAR(255),
    notes_markdown  TEXT,                          -- creator's markdown notes
    position        INTEGER NOT NULL DEFAULT 0,    -- ordering within section
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_section_id ON lessons(section_id);

-- Reference Links (per lesson, multiple allowed)
CREATE TABLE reference_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    title           VARCHAR(500),
    description     TEXT,
    og_image_url    TEXT,
    favicon_url     TEXT,
    site_name       VARCHAR(255),
    position        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reference_links_lesson_id ON reference_links(lesson_id);

-- Lesson Progress (per user per lesson)
CREATE TABLE lesson_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- Study Notes (personal annotations per lesson per user)
CREATE TABLE study_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    content         TEXT NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Course Study State (tracks last lesson, resume position)
CREATE TABLE course_study_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    last_lesson_id  UUID REFERENCES lessons(id) ON DELETE SET NULL,
    last_accessed   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Certificates
CREATE TABLE certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_uid VARCHAR(50) NOT NULL UNIQUE,   -- human-readable unique ID like "LV-2026-ABCD1234"
    user_name       VARCHAR(255) NOT NULL,
    course_title    VARCHAR(200) NOT NULL,
    sections_count  INTEGER NOT NULL,
    lessons_count   INTEGER NOT NULL,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Quick Capture Inbox
CREATE TABLE inbox_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    url_type        VARCHAR(20) NOT NULL DEFAULT 'link',  -- youtube, link
    title           VARCHAR(500),
    thumbnail_url   TEXT,
    og_image_url    TEXT,
    og_description  TEXT,
    favicon_url     TEXT,
    site_name       VARCHAR(255),
    position        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inbox_user ON inbox_items(user_id);

-- Activity Log (for streaks and heatmap)
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date   DATE NOT NULL,
    lessons_completed INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_activity_user_date ON activity_log(user_id, activity_date);
```

---

## API Endpoints (Swagger)

All endpoints prefixed with `/api/v1`. Detailed request/response schemas in Pydantic.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/me` | Update profile (display name, timezone, playback speed, font size) |
| POST | `/auth/webhook` | Clerk webhook to sync user creation |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List all courses (filter by status, is_deleted, search) |
| POST | `/courses` | Create a new course |
| GET | `/courses/{id}` | Get course with sections and lessons |
| PUT | `/courses/{id}` | Update course metadata |
| DELETE | `/courses/{id}` | Soft delete (move to trash) |
| POST | `/courses/{id}/restore` | Restore from trash |
| DELETE | `/courses/{id}/permanent` | Permanent delete (from trash) |
| POST | `/courses/{id}/duplicate` | Duplicate a course |
| PUT | `/courses/{id}/status` | Toggle draft ↔ ready (with validation) |
| GET | `/courses/{id}/export` | Export course as JSON |
| POST | `/courses/import` | Import course from JSON |
| GET | `/courses/trash` | List trashed courses |

### Sections
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/courses/{course_id}/sections` | Add section |
| PUT | `/sections/{id}` | Update section |
| DELETE | `/sections/{id}` | Delete section |
| POST | `/sections/{id}/duplicate` | Duplicate section with lessons |
| PUT | `/courses/{course_id}/sections/reorder` | Reorder sections (bulk position update) |

### Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sections/{section_id}/lessons` | Add lesson |
| PUT | `/lessons/{id}` | Update lesson (title, youtube_url, notes, etc.) |
| DELETE | `/lessons/{id}` | Delete lesson |
| POST | `/lessons/{id}/duplicate` | Duplicate lesson |
| PUT | `/sections/{section_id}/lessons/reorder` | Reorder lessons |
| PUT | `/lessons/{id}/move` | Move lesson to different section |

### Reference Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/lessons/{lesson_id}/links` | Add reference link |
| PUT | `/links/{id}` | Update link |
| DELETE | `/links/{id}` | Delete link |
| PUT | `/lessons/{lesson_id}/links/reorder` | Reorder links |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/lessons/{id}/progress` | Toggle lesson completion |
| GET | `/courses/{id}/progress` | Get full course progress (all sections/lessons) |
| PUT | `/courses/{id}/study-state` | Update last viewed lesson |
| GET | `/courses/{id}/study-state` | Get resume position |

### Study Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lessons/{id}/study-notes` | Get personal study notes for a lesson |
| PUT | `/lessons/{id}/study-notes` | Create or update study notes |

### Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/certificates` | List all certificates |
| GET | `/certificates/{id}` | Get certificate details |
| POST | `/courses/{id}/certificate` | Generate certificate (only if 100% complete) |

### Quick Capture Inbox
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inbox` | List inbox items |
| POST | `/inbox` | Add item (URL → auto-fetch metadata) |
| DELETE | `/inbox/{id}` | Remove item |
| POST | `/inbox/{id}/organize` | Move to a course/section as a new lesson |
| POST | `/inbox/batch-organize` | Batch move multiple items |
| PUT | `/inbox/reorder` | Reorder inbox items |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=...` | Full-text search across courses, lessons, notes, tags |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/overview` | Dashboard stats (courses, lessons, streak, etc.) |
| GET | `/stats/activity?months=12` | Activity heatmap data (date → lesson count) |
| GET | `/stats/streak` | Current streak, longest streak |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/opengraph/fetch` | Fetch OpenGraph metadata for a URL |
| POST | `/youtube/metadata` | Fetch YouTube video metadata |
| POST | `/uploads/thumbnail` | Upload thumbnail image |

---

## Environment Variables

```env
# === Backend ===
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/learnerverse
SECRET_KEY=<random-64-char-string>

# Auth
SINGLE_USER_MODE=false              # true = skip auth, auto-create default user
CLERK_SECRET_KEY=<your-clerk-secret>
CLERK_WEBHOOK_SECRET=<your-clerk-webhook-secret>
CLERK_ISSUER=https://<your-clerk-domain>

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:5173  # frontend dev server

# Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5

# === Frontend ===
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
VITE_SINGLE_USER_MODE=false         # matches backend setting
```

---

## Testing Strategy

### Test Pyramid

```
         ╱╲
        ╱ E2E ╲          Playwright — critical user journeys
       ╱────────╲
      ╱Integration╲      API tests with real DB (pytest + httpx)
     ╱──────────────╲
    ╱  Component Tests ╲  Vitest + RTL — isolated component behavior
   ╱────────────────────╲
  ╱     Unit Tests       ╲ Vitest (utils, hooks) + pytest (services)
 ╱────────────────────────╲
```

### Backend Tests (pytest)
- **Test DB:** Separate PostgreSQL database (test container or test schema)
- **Fixtures:** `conftest.py` with async test client, test user, test course factory
- **Per-endpoint files:** `test_courses.py`, `test_sections.py`, etc.
- **Service tests:** `test_opengraph.py`, `test_youtube.py` (mocked external calls)
- **Run:** `pytest backend/tests/ -v --asyncio-mode=auto`

### Frontend Component Tests (Vitest + RTL)
- **Organized by component folder:** `tests/components/course/CourseCard.test.tsx`
- **Mock API calls:** MSW (Mock Service Worker) for API mocking
- **Test in isolation:** Each component tested independently
- **Run:** `cd frontend && npx vitest run`

### E2E Tests (Playwright)
- **Per-feature files:** `auth.spec.ts`, `course-crud.spec.ts`, `study-view.spec.ts`
- **Test against running app:** Backend + frontend + DB running
- **Single-user mode:** E2E tests run with `SINGLE_USER_MODE=true` to skip auth complexity
- **Screenshot comparison:** For visual regression (optional)
- **Run:** `cd frontend && npx playwright test`

### Test Commands Summary
```bash
# Backend unit + integration
cd backend && pytest -v

# Frontend component tests
cd frontend && npx vitest run

# Frontend E2E
cd frontend && npx playwright test

# All tests
make test  # Makefile target runs all three
```

---

## Twenty Phases

---

### Phase 0 — Project Scaffolding & Infrastructure

**Goal:** Get the monorepo, Docker, database, CI tooling, and both apps running with a hello-world state.

**Backend:**
- Initialize `backend/` with `pyproject.toml`, FastAPI hello-world (`main.py`)
- Set up project structure: `app/api/`, `app/core/`, `app/models/`, `app/schemas/`, `app/services/`, `app/repositories/`
- Configure `app/core/config.py` with Pydantic Settings (reads `.env`)
- Configure `app/core/database.py` with async SQLAlchemy engine + session maker
- Set up Alembic for migrations (`alembic init`, configure `env.py` for async)
- Add `requirements.txt` / `pyproject.toml` with all dependencies
- Add Ruff config for linting + formatting
- `Dockerfile` for backend
- Backend health check endpoint: `GET /health` → `{"status": "ok"}`

**Frontend:**
- Initialize `frontend/` with Vite + React + TypeScript template
- Install and configure Tailwind CSS v4
- Install shadcn/ui (`npx shadcn@latest init`) — configure dark theme
- Add CSS variables for the design system (all color tokens from design system section above)
- Set up `Inter` and `JetBrains Mono` fonts
- Configure path aliases (`@/` → `src/`)
- Set up ESLint + Prettier
- Install Vitest + React Testing Library + Playwright
- Configure `vitest.config.ts` and `playwright.config.ts`
- Hello-world page: dark background, centered "Learner Verse" text

**Infrastructure:**
- `docker-compose.yml`: PostgreSQL 16 container (port 5432, named volume for data)
- `.env.example` with all variables documented
- `.gitignore` for Python, Node, IDE files, `.env`
- `Makefile` with targets: `dev-db`, `dev-backend`, `dev-frontend`, `test`, `lint`, `migrate`
- Verify: `docker compose up -d` starts Postgres, backend connects, frontend builds

**Tests:**
- Backend: `test_health.py` — verify health endpoint returns 200
- Frontend: Vitest smoke test — renders without crashing
- Playwright: smoke test — page loads, title visible

**Done when:** `make dev-db && make dev-backend` starts backend on :8000 with Swagger UI at `/docs`. `make dev-frontend` starts frontend on :5173 with dark homepage. Postgres running in Docker. All three smoke tests pass.

---

### Phase 1 — Authentication & Single-User Mode

**Goal:** Clerk Google OAuth + single-user bypass. User model and profile endpoint.

**Backend:**
- `models/user.py` — User SQLAlchemy model
- `schemas/user.py` — `UserResponse`, `UserUpdate` Pydantic schemas
- Alembic migration: create `users` table
- `core/security.py` — Clerk JWT verification middleware. Extracts `clerk_id` from Bearer token, looks up or creates User
- `api/dependencies.py` — `get_current_user` dependency. If `SINGLE_USER_MODE=true`, returns a default user (auto-created on startup). If false, verifies Clerk JWT
- `api/v1/endpoints/auth.py` — `GET /auth/me`, `PUT /auth/me`
- Webhook endpoint `POST /auth/webhook` for Clerk user sync (creates user on `user.created` event)

**Frontend:**
- Install `@clerk/clerk-react`
- `lib/auth.ts` — Clerk provider setup, sign-in redirect
- `pages/LoginPage.tsx` — Clerk `<SignIn>` component, Google OAuth button. Minimal dark page
- `hooks/useAuth.ts` — wraps Clerk's `useUser`, exposes `user`, `isLoaded`, `isSignedIn`
- Protected route wrapper — redirects to login if not authenticated
- If `VITE_SINGLE_USER_MODE=true`, skip Clerk entirely, treat user as always signed in
- `router.tsx` — base routes: `/login`, `/` (protected)

**Tests:**
- Backend: `test_auth.py` — test `GET /auth/me` in single-user mode returns user, test `PUT /auth/me` updates display name
- Frontend: `LoginPage.test.tsx` — renders sign-in, `useAuth.test.ts` — returns user in single-user mode
- E2E: `auth.spec.ts` — in single-user mode, page loads directly to dashboard (no login redirect)

**Done when:** In single-user mode, app loads straight to main page with a user context. With Clerk configured, Google sign-in works, redirects to dashboard. `/docs` shows auth endpoints.

---

### Phase 2 — App Shell & Layout

**Goal:** Sidebar, header, mode toggle, responsive shell. The skeleton of the entire app.

**Frontend:**
- `components/layout/AppShell.tsx` — main layout wrapper: sidebar + header + content area
- `components/layout/Sidebar.tsx` — collapsible sidebar (256px → 64px). Links adapt based on mode. Sections: Dashboard, Courses, Inbox (future), Trash, Settings. Dark bg, subtle border-right
- `components/layout/Header.tsx` — 56px height. Shows current page title, breadcrumbs, user avatar dropdown (profile, settings, sign out)
- `components/layout/ModeToggle.tsx` — Creator ↔ Student toggle. Pill-shaped switch in sidebar. Mode stored in Zustand (`stores/modeStore.ts`)
- `hooks/useMode.ts` — wraps Zustand store, exposes `mode`, `toggleMode`, `isCreator`, `isStudent`
- Responsive: sidebar collapses to icons on tablet, becomes hamburger menu on mobile
- All pages wrapped in `<AppShell>`. Content area has max-width 1280px, centered
- Keyboard shortcut: `Ctrl+Shift+C` toggles mode
- `hooks/useKeyboardShortcuts.ts` — global keyboard event listener, registers shortcuts

**Tests:**
- Component: `Sidebar.test.tsx` — renders nav items, collapses. `ModeToggle.test.tsx` — toggles mode. `Header.test.tsx` — shows user info
- E2E: `app-shell.spec.ts` — sidebar visible, mode toggle switches, responsive collapse works

**Done when:** Full app shell renders. Sidebar with navigation, header with user info, mode toggle works, responsive behavior on resize. Dark theme applied everywhere.

---

### Phase 3 — Course CRUD & Creator Dashboard

**Goal:** Create, read, update, soft-delete courses. Creator dashboard with course cards.

**Backend:**
- `models/course.py` — Course model + `models/tag.py` — Tag and CourseTag
- `schemas/course.py` — `CourseCreate`, `CourseUpdate`, `CourseResponse`, `CourseListResponse`
- Alembic migration: create `courses`, `tags`, `course_tags` tables
- `repositories/course_repo.py` — CRUD with filtering (status, is_deleted, search by title)
- `services/course_service.py` — business logic (validate limits, soft delete, restore, permanent delete)
- `api/v1/endpoints/courses.py` — all course endpoints from API spec above
- `api/v1/endpoints/uploads.py` — `POST /uploads/thumbnail` — accept image, save to `uploads/`, return URL
- Enforce limits: max 50 courses per user, title max 200 chars

**Frontend:**
- `types/course.ts` — TypeScript types matching API schemas
- `lib/api.ts` — configured Axios instance with auth header interceptor (Clerk token or single-user)
- `hooks/useCourses.ts` — TanStack Query hooks: `useCoursesQuery`, `useCreateCourseMutation`, `useUpdateCourseMutation`, `useDeleteCourseMutation`
- `components/course/CourseCard.tsx` — card component: thumbnail, title, tags, status badge, action menu (edit, duplicate, delete). Vercel card style: dark bg, subtle border, hover border change
- `components/course/CourseGrid.tsx` — responsive grid of CourseCards. Filters: All/Draft/Ready. Search input
- `components/course/CourseForm.tsx` — modal/page for creating/editing course metadata (title, description, tags, thumbnail upload)
- `components/course/CourseStatusBadge.tsx` — Draft (gray) / Ready (green) pill badge
- `pages/DashboardPage.tsx` — in Creator mode, renders `CreatorDashboard` with CourseGrid, "New Course" button
- `components/dashboard/CreatorDashboard.tsx` — course grid + new course button + filter bar
- `components/shared/EmptyState.tsx` — generic empty state component with icon, message, action button
- `components/shared/ConfirmDialog.tsx` — reusable confirmation modal (for deletes)
- `pages/TrashPage.tsx` — list of soft-deleted courses, restore/permanent-delete actions

**Tests:**
- Backend: `test_courses.py` — full CRUD: create, list, get, update, soft-delete, restore, permanent delete. Test 50-course limit. Test tag filtering
- Component: `CourseCard.test.tsx`, `CourseForm.test.tsx`, `CourseGrid.test.tsx`, `EmptyState.test.tsx`
- E2E: `course-crud.spec.ts` — create course, see it on dashboard, edit it, delete it, check trash, restore

**Done when:** Creator dashboard shows course cards. Can create/edit/delete courses. Trash works. Swagger shows all course endpoints. Tests pass.

---

### Phase 4 — Sections & Lessons Structure

**Goal:** Build the section/lesson hierarchy within a course. Drag-and-drop reordering.

**Backend:**
- `models/section.py`, `models/lesson.py` — SQLAlchemy models
- `schemas/section.py`, `schemas/lesson.py` — create, update, response, reorder schemas
- Alembic migration: create `sections`, `lessons` tables
- `repositories/section_repo.py`, `repositories/lesson_repo.py`
- `services/section_service.py`, `services/lesson_service.py` — CRUD + reorder + move + duplicate logic
- `api/v1/endpoints/sections.py`, `api/v1/endpoints/lessons.py`
- Course detail endpoint `GET /courses/{id}` now returns nested sections → lessons
- Reorder endpoints accept `[{id, position}]` arrays for bulk position updates
- Duplicate endpoints deep-copy section (with all lessons) or single lesson
- Validation: max 50 sections per course, max 50 lessons per section

**Frontend:**
- Install `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- `pages/CourseBuilderPage.tsx` — full course builder page. Route: `/courses/:id/edit`
- `components/section/SectionBuilder.tsx` — collapsible section panel. Title (inline editable), description, drag handle, action menu (duplicate, delete)
- `components/section/SectionList.tsx` — sortable list of SectionBuilder components. "Add Section" button at bottom
- `components/lesson/LessonBuilder.tsx` — lesson row within a section. Title (inline editable), drag handle, action menu (duplicate, move, delete). Content editing comes in next phases — just title for now
- Drag-and-drop: sections reorderable within course, lessons reorderable within section and movable between sections
- Confirm dialog on delete for both sections and lessons
- "Add Lesson" button at bottom of each section

**Tests:**
- Backend: `test_sections.py` — CRUD, reorder, duplicate. `test_lessons.py` — CRUD, reorder, move between sections, duplicate
- Component: `SectionBuilder.test.tsx`, `LessonBuilder.test.tsx` — renders, inline edit, action menu
- E2E: `section-lesson.spec.ts` — add section, add lessons, reorder via drag, duplicate, delete

**Done when:** Course builder shows sections and lessons. Can add, edit, reorder (drag-and-drop), duplicate, delete both. Backend validates limits. Tests pass.

---

### Phase 5 — YouTube Video Integration

**Goal:** Paste YouTube URL → auto-fetch metadata → embedded player in study view.

**Backend:**
- `services/youtube_service.py` — fetch video metadata via oEmbed API (`https://www.youtube.com/oembed?url=...&format=json`). Extract: title, thumbnail, channel (author_name). Parse duration from YouTube Data API or accept client-sent duration
- `api/v1/endpoints/opengraph.py` — add `POST /youtube/metadata` endpoint. Accepts URL, returns metadata
- URL validation: accept `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/` formats
- Return error for invalid URLs

**Frontend:**
- `lib/youtube.ts` — YouTube URL regex validation, extract video ID from various URL formats
- Lesson builder update: add YouTube URL input field. On paste/blur → call `/youtube/metadata` → show preview card
- Preview card in builder: thumbnail image, video title, channel name, duration
- `components/lesson/YouTubeEmbed.tsx` — YouTube iframe embed component. Props: `videoId`, `playbackSpeed`. Uses YouTube IFrame API for speed control. Renders `<iframe>` with proper allow attributes
- In study/preview mode: render embedded player, full controls, plays inline
- Persist playback speed preference (from user settings → applied to all videos)
- Handle errors: invalid URL (inline error text), deleted video (warning banner), age-restricted (notice + direct link)

**Tests:**
- Backend: `test_youtube.py` — test metadata fetch (mock oEmbed response), test URL validation (valid/invalid formats)
- Component: `YouTubeEmbed.test.tsx` — renders iframe with correct video ID
- E2E: `youtube-embed.spec.ts` — paste URL in builder, see preview card, switch to study view, video plays

**Done when:** Can paste YouTube URL in lesson builder, see metadata preview card. In study view, video embeds and plays. Invalid URLs show errors. Tests pass.

---

### Phase 6 — Markdown Editor & Reference Links

**Goal:** Rich markdown editor with live preview. Reference links with OpenGraph cards.

**Backend:**
- `services/opengraph_service.py` — fetch URL, parse `<meta>` tags for og:title, og:description, og:image, favicon. Use `httpx` with timeout. Return structured OpenGraph data. Handle failures gracefully (return partial data or null fields)
- `api/v1/endpoints/opengraph.py` — `POST /opengraph/fetch` endpoint. Accepts URL, returns OG metadata
- `models/reference_link.py` — already part of lesson schema, but ensure reference_links table migration is done
- `api/v1/endpoints/lessons.py` — ensure lesson endpoints handle `reference_links` as nested objects

**Frontend:**
- Choose markdown editor: `@uiw/react-md-editor` or `react-markdown` + `react-textarea-autosize` for editing, `react-markdown` + `remark-gfm` + `rehype-highlight` for rendering
- `components/lesson/MarkdownEditor.tsx` — split-pane editor (edit left, preview right) or toggle mode. Supports full markdown: headings, bold, italic, code blocks with syntax highlighting (via `highlight.js` or `shiki`), lists, images, tables, blockquotes, task lists. Dark theme styled
- `components/lesson/MarkdownRenderer.tsx` — read-only markdown renderer for study view. Beautiful typography, proper spacing, syntax highlighted code blocks, dark theme
- `components/lesson/LinkInput.tsx` — text input for pasting URLs. On paste/blur → call `/opengraph/fetch` → show rich card preview. "Add another link" button
- `components/lesson/LinkCard.tsx` — OpenGraph card: OG image (prominent), title, description, domain + favicon. Clickable → opens in new tab. Has remove button in builder mode. Fallback state if OG fetch failed: plain URL + "Preview unavailable"
- Lesson builder now has three content sections: YouTube video, markdown notes, reference links
- 50,000 character limit on markdown notes (show character count)
- Max 10 reference links per lesson

**Tests:**
- Backend: `test_opengraph.py` — test OG fetch (mock HTTP responses), test failure handling
- Component: `MarkdownEditor.test.tsx` — renders, types text, shows preview. `MarkdownRenderer.test.tsx` — renders markdown correctly. `LinkCard.test.tsx` — renders OG data, fallback state
- E2E: `markdown-editor.spec.ts` — type markdown, see preview, switch to study view, rendered correctly. `link-cards.spec.ts` — paste URL, see OG card, click opens new tab

**Done when:** Lesson builder has full markdown editor with live preview and reference link input with OG cards. Study view renders both beautifully. Tests pass.

---

### Phase 7 — Course Status & Validation

**Goal:** Draft → Ready workflow. Validate courses before marking Ready. Course preview mode.

**Backend:**
- `services/course_service.py` — add `validate_for_ready()`: check all sections have at least one lesson, all lessons have at least one content type (video, notes, or link). Return list of validation errors
- `PUT /courses/{id}/status` — calls validation, returns errors or updates status
- Course detail `GET /courses/{id}` now includes computed stats: section_count, lesson_count, has_issues (for validation)

**Frontend:**
- Course builder: "Mark as Ready" button. Clicking triggers validation. If errors, show modal/toast listing issues (e.g., "Section 3 has 2 lessons with no content"). If valid, status changes to Ready
- Course builder: "Back to Draft" button if course is Ready — no validation needed
- Course builder: "Preview" button — opens the course in study view layout (read-only, no progress tracking) so creator can see how it looks. Route: `/courses/:id/preview`
- CourseStatusBadge updated: Draft (gray pill), Ready (green pill)
- Creator dashboard: filter by status (All / Draft / Ready)
- Auto-save integration: `hooks/useAutoSave.ts` — debounced auto-save (2 second debounce, saves to API). Visual indicator: "Saving..." / "Saved" / "Save failed" in header

**Tests:**
- Backend: test validation (empty sections, empty lessons, valid course)
- Component: `CourseStatusBadge.test.tsx`, auto-save hook test
- E2E: create course with valid/invalid content, try to mark Ready, see validation errors, fix, mark Ready

**Done when:** Courses can be toggled Draft ↔ Ready with validation. Preview mode works. Auto-save with visual feedback. Tests pass.

---

### Phase 8 — Student Mode: Study View

**Goal:** The core learning experience. Course overview, lesson view, navigation, personal study notes.

**Backend:**
- `api/v1/endpoints/progress.py` — `PUT /courses/{id}/study-state`, `GET /courses/{id}/study-state`
- `models/study_note.py` — StudyNote model
- `schemas/study_note.py` — StudyNoteResponse, StudyNoteUpdate
- Alembic migration: create `study_notes`, `course_study_state` tables
- `api/v1/endpoints/lessons.py` — add `GET /lessons/{id}/study-notes`, `PUT /lessons/{id}/study-notes`

**Frontend:**
- `pages/StudyPage.tsx` — route: `/study/:courseId`. Course overview page. Shows course title, description, full section/lesson tree in sidebar, overall progress bar, "Continue" button
- `pages/LessonPage.tsx` — route: `/study/:courseId/lessons/:lessonId`. The main study screen
- `components/study/StudySidebar.tsx` — collapsible tree of sections → lessons. Shows completion status (checkmark/empty circle) per lesson. Highlights current lesson. Click to navigate
- Lesson page layout: YouTube embed (top) → Markdown notes (middle) → Reference link cards (bottom) → Personal notes (collapsible panel)
- `components/study/StudyNotes.tsx` — markdown editor for personal annotations per lesson. Auto-saves. Separate from course content
- Navigation: Previous / Next lesson buttons at bottom. Breadcrumb: Course > Section > Lesson
- `components/study/ProgressBar.tsx` — animated progress bar component
- `components/section/SectionProgress.tsx` — dots or mini bar showing X/Y lessons complete per section
- **Quick Edit:** `E` key or edit button → opens lesson content in a modal editor (reuses lesson builder components). Save & close returns to study view
- Track last viewed lesson (`course_study_state`) — updates on every lesson view
- "Continue Learning" button on course overview → navigates to last viewed or next incomplete lesson
- Student mode dashboard only shows courses with status "Ready"

**Tests:**
- Backend: `test_progress.py` — test study state CRUD, study notes CRUD
- Component: `StudySidebar.test.tsx`, `StudyNotes.test.tsx`, `ProgressBar.test.tsx`
- E2E: `study-view.spec.ts` — open course, navigate through lessons, see video/notes/links, write study notes, use Previous/Next, Quick Edit

**Done when:** Full study experience works. Can navigate courses, view all lesson content, write personal notes, Quick Edit. Study state tracks last position. Tests pass.

---

### Phase 9 — Progress Tracking & Checkmarks

**Goal:** Mark lessons complete, track progress at all levels, continue-where-you-left-off.

**Backend:**
- `models/progress.py` — LessonProgress model
- `schemas/progress.py` — ProgressToggle, CourseProgressResponse (nested sections with completion data)
- Alembic migration: create `lesson_progress` table
- `repositories/progress_repo.py` — toggle completion, batch query per course
- `services/progress_service.py` — toggle lesson, compute section/course progress percentages
- `api/v1/endpoints/progress.py` — `PUT /lessons/{id}/progress` (toggle), `GET /courses/{id}/progress` (full breakdown)

**Frontend:**
- `components/study/CompletionButton.tsx` — "Mark as Complete" / "Completed ✓" toggle button. Prominent design: uncomplete = outline, complete = filled green. Keyboard shortcut: `M`
- Update `StudySidebar` — show checkmark icon for completed lessons, filled dot for current, empty for incomplete
- Update `SectionProgress` — show "3/5 lessons" with visual indicator (dots or progress ring)
- Update `ProgressBar` — course-level progress bar on overview page and dashboard cards
- `components/dashboard/ContinueLearning.tsx` — hero card on Student dashboard showing most recent course, progress bar, "Resume" button that goes to last lesson
- `hooks/useProgress.ts` — TanStack Query hooks for progress data, optimistic updates on toggle
- Dashboard CourseCards in Student mode: show progress bar, last accessed date
- Course overview: section-level progress dots (● ● ● ○ ○)

**Tests:**
- Backend: `test_progress.py` — toggle on/off, get course progress, verify percentages
- Component: `CompletionButton.test.tsx` — toggles, shows correct state. `ContinueLearning.test.tsx`
- E2E: `progress.spec.ts` — mark lessons complete, see progress update in sidebar/overview/dashboard, unmark, resume from last position

**Done when:** Can mark lessons complete/incomplete. Progress tracked at lesson, section, course level. Dashboard shows progress bars. Continue Learning works. Tests pass.

---

### Phase 10 — Quick Capture Inbox

**Goal:** Capture URLs quickly, organize into courses later.

**Backend:**
- `models/inbox.py` — InboxItem model
- `schemas/inbox.py` — InboxItemCreate, InboxItemResponse, OrganizeRequest, BatchOrganizeRequest
- Alembic migration: create `inbox_items` table
- `repositories/inbox_repo.py` — CRUD + reorder
- `services/inbox_service.py` — add item (auto-fetch metadata), organize into course (creates lesson), batch organize
- `api/v1/endpoints/inbox.py` — all inbox endpoints from API spec

**Frontend:**
- `components/inbox/QuickCapture.tsx` — sidebar widget. Text input for pasting URLs. Always visible in sidebar footer (both modes). On paste → call API → item appears in inbox list
- `components/inbox/InboxList.tsx` — full inbox page/panel. Shows items: thumbnail + title + source domain + date. Click to preview. Action menu: organize (pick course + section), dismiss (with undo toast)
- Organize flow: click "Add to Course" → modal with course selector → section selector → creates lesson in that section
- Batch: multi-select items → "Add all to..." → same flow
- Dismiss with undo: remove item, show toast "Item removed" with "Undo" button (5 seconds)
- Sort: by date (default), manual reorder via drag
- Limit: 100 items, show count
- Route: `/inbox` — full page inbox view

**Tests:**
- Backend: `test_inbox.py` — add item, list, delete, organize into course, batch organize
- Component: `QuickCapture.test.tsx`, `InboxList.test.tsx`
- E2E: `inbox.spec.ts` — paste URL, see in inbox, organize into course, verify lesson created

**Done when:** Can paste URLs into inbox, see OG previews, organize into courses, batch import, dismiss with undo. Tests pass.

---

### Phase 11 — Course Completion & Certificates

**Goal:** Detect 100% completion, generate certificates, PDF download.

**Backend:**
- `models/certificate.py` — Certificate model
- `schemas/certificate.py` — CertificateResponse, CertificateGenerate
- Alembic migration: create `certificates` table
- `services/certificate_service.py` — check completion (all lessons in all sections done), generate unique certificate ID (format: `LV-YYYY-XXXXXXXX`), create certificate record
- `api/v1/endpoints/certificates.py` — `POST /courses/{id}/certificate` (generate), `GET /certificates`, `GET /certificates/{id}`
- Validation: only generate if 100% complete. Return error if not

**Frontend:**
- Completion detection: when last lesson is marked complete and course is 100% → show celebration modal
- Celebration: confetti animation (use `canvas-confetti` library), "Congratulations! Course Complete!" message, "View Certificate" button. Respect `prefers-reduced-motion`
- `components/certificate/CertificatePreview.tsx` — certificate card rendered on screen. User name, course title, sections/lessons count, completion date, unique ID. Dark design matching platform aesthetic
- `components/certificate/CertificateDownload.tsx` — "Download PDF" button. Uses `@react-pdf/renderer` to generate a styled PDF matching the on-screen design
- `pages/CertificatesPage.tsx` — route: `/certificates`. Grid of earned certificates. Click → preview + download
- Student dashboard: "Completed" section showing completed courses with "View Certificate" button

**Tests:**
- Backend: `test_certificates.py` — generate (100% vs not 100%), list, get by ID
- Component: `CertificatePreview.test.tsx`, `CertificateDownload.test.tsx`
- E2E: `certificates.spec.ts` — complete all lessons, see celebration, view certificate, download PDF

**Done when:** Course completion triggers celebration. Certificate generated with unique ID. Can preview and download as PDF. Tests pass.

---

### Phase 12 — Learning Goals

**Goal:** Optional per-course target date with pace tracking.

**Backend:**
- Add `goal_date` column to courses table (already in schema, ensure migration)
- `services/progress_service.py` — add `compute_pace()`: given goal_date, remaining lessons, current date → return pace status (on_track, ahead, behind) + required lessons_per_week
- `GET /courses/{id}/progress` now includes `goal` object: `{ goal_date, pace_status, lessons_per_week_needed, days_remaining }`

**Frontend:**
- Course overview page: if goal is set, show pace indicator card. "On track — 2 lessons/week" (green), "Behind — need 4 lessons/week" (amber), "Ahead of schedule!" (green with star)
- Goal setting: on course overview, "Set Goal" button → date picker modal. Can update or remove
- When course completed on/before goal: special celebration: "Goal met! You finished 3 days early!"
- Student dashboard: course cards show goal date and pace status if set

**Tests:**
- Backend: test pace computation (on track, behind, ahead, no goal)
- Component: pace indicator card test
- E2E: set goal on course, complete lessons, check pace indicator updates

**Done when:** Can set/update/remove goal per course. Pace indicator shows on course overview. Celebration on goal met. Tests pass.

---

### Phase 13 — Activity, Streaks & Heatmap

**Goal:** Learning streak system, activity heatmap, dashboard stats.

**Backend:**
- `models/activity.py` — uses existing `activity_log` table
- Alembic migration: create `activity_log` table
- `services/stats_service.py` — compute: current streak (with 7-day grace), longest streak, total courses completed, total lessons completed, most active day, activity heatmap data (date → count for last 12 months)
- Activity logging: on `PUT /lessons/{id}/progress` (completion=true) → upsert activity_log for today (increment `lessons_completed`)
- `api/v1/endpoints/stats.py` — `GET /stats/overview`, `GET /stats/activity`, `GET /stats/streak`

**Frontend:**
- `components/dashboard/StatsCards.tsx` — 4-5 stat cards at top of Student dashboard: Courses Completed, Lessons Done, Current Streak (🔥 icon), Longest Streak
- `components/dashboard/ActivityHeatmap.tsx` — GitHub-style contribution heatmap. 52 weeks × 7 days grid. Color scale: none → light green → dark green based on lesson count. Tooltip on hover: "X lessons on March 15, 2026". Uses SVG or canvas
- `components/dashboard/StudentDashboard.tsx` — full student dashboard: Continue Learning hero → Stats Cards → Activity Heatmap → In Progress courses → Completed courses
- Streak display: in header or sidebar, show current streak with fire emoji

**Tests:**
- Backend: `test_stats.py` — test streak computation (active days, gaps, 7-day grace), activity data, overview stats
- Component: `StatsCards.test.tsx`, `ActivityHeatmap.test.tsx`
- E2E: `stats.spec.ts` — complete lessons, verify stats update, check heatmap renders

**Done when:** Student dashboard shows stats, streak, and heatmap. Data updates in real-time as lessons are completed. 7-day grace period works. Tests pass.

---

### Phase 14 — Global Search

**Goal:** `Ctrl+K` command palette searching across all content.

**Backend:**
- `services/search_service.py` — full-text search across: course titles + descriptions, lesson titles, markdown notes, tags. Uses PostgreSQL `to_tsvector` + `to_tsquery` for full-text search. Results grouped by type, ranked by relevance
- `api/v1/endpoints/search.py` — `GET /search?q=...&limit=20`. Returns `{ courses: [...], lessons: [...], notes: [...] }` with snippet highlights

**Frontend:**
- `components/search/CommandPalette.tsx` — modal triggered by `Ctrl/Cmd+K`. Search input at top, results below grouped by type (Courses, Lessons, Notes). Keyboard navigation: ↑↓ to select, Enter to open, Esc to close. Fuzzy matching (frontend-side via `fuse.js` for instant results, plus API call for full-text). Vercel-style command palette: dark, clean, fast
- `hooks/useSearch.ts` — debounced API call (300ms), TanStack Query
- Clicking a result navigates to: course → course builder or study page, lesson → lesson in study view, note → lesson with notes panel open
- Empty state: "No results" + search tips
- Register `Ctrl/Cmd+K` in global keyboard shortcuts

**Tests:**
- Backend: `test_search.py` — search by title, by note content, by tag, no results, special characters
- Component: `CommandPalette.test.tsx` — renders, keyboard nav, shows results
- E2E: `search.spec.ts` — open with Ctrl+K, type query, see results, navigate to result

**Done when:** Command palette opens on Ctrl+K. Searches across all content types. Results are grouped and clickable. Keyboard navigable. Tests pass.

---

### Phase 15 — Course Export & Import

**Goal:** Export courses as JSON, import from JSON file.

**Backend:**
- `services/course_service.py` — `export_course()`: serialize course + sections + lessons + reference_links + progress as JSON. `import_course()`: deserialize JSON → create new course + all children. Validate JSON schema on import
- `api/v1/endpoints/courses.py` — `GET /courses/{id}/export` (returns JSON file), `POST /courses/import` (accepts JSON file upload)
- Export format: versioned (include `export_version: 1`), includes all metadata but not user-specific data (study notes, certificates)

**Frontend:**
- Course builder: "Export" button in course action menu → downloads `.json` file
- Creator dashboard: "Import Course" button → file picker → upload → shows new course in list
- Validation: show toast on success, show errors if JSON is malformed or incompatible

**Tests:**
- Backend: test export (verify JSON structure), test import (create from JSON), test invalid JSON
- E2E: export a course, import it back, verify it matches

**Done when:** Can export any course as JSON, import it to create a new copy. Handles errors. Tests pass.

---

### Phase 16 — Course Duplication

**Goal:** Clone an existing course in Creator Mode.

**Backend:**
- `services/course_service.py` — `duplicate_course()`: deep copy course + all sections + all lessons + all reference links. New course gets title "[Original Title] (Copy)", status = Draft. New UUIDs for everything
- `POST /courses/{id}/duplicate` endpoint (already spec'd)

**Frontend:**
- Course card action menu: "Duplicate" option → confirm dialog → creates copy → navigates to new course builder
- Toast: "Course duplicated successfully"
- Creator dashboard updates immediately (optimistic or refetch)

**Tests:**
- Backend: test duplication (verify all nested data copied, new IDs, correct title)
- E2E: duplicate a course, verify copy exists with all content

**Done when:** Can duplicate any course. Copy is independent. Tests pass.

---

### Phase 17 — Focus Mode & Keyboard Shortcuts

**Goal:** Distraction-free study mode + full keyboard shortcut system.

**Frontend:**
- `components/study/FocusMode.tsx` — toggle that hides sidebar, header, and all navigation. Just video + notes + links + completion button. Subtle "Exit Focus" button in corner. Keyboard: `F` to toggle
- `hooks/useFocusMode.ts` — Zustand-backed state for focus mode
- `components/shared/KeyboardShortcuts.tsx` — modal listing all shortcuts, triggered by `?`. Grouped by context (Global, Study View, Course Builder)
- `hooks/useKeyboardShortcuts.ts` — update to include all shortcuts from plan:
  - `Ctrl/Cmd+K` — search
  - `F` — focus mode
  - `E` — quick edit
  - `N` / `→` — next lesson
  - `P` / `←` — previous lesson
  - `M` — mark complete
  - `Ctrl/Cmd+S` — force save
  - `Ctrl/Cmd+Shift+C` — toggle mode
  - `Ctrl/Cmd+N` — new course
  - `?` — shortcuts panel
  - `Esc` — close modal / exit focus mode
- Shortcuts only fire when not typing in an input/textarea
- First login: subtle tooltip "Press ? to see keyboard shortcuts"

**Tests:**
- Component: `FocusMode.test.tsx`, `KeyboardShortcuts.test.tsx`
- E2E: test focus mode toggle, test keyboard shortcuts work in study view

**Done when:** Focus mode hides UI chrome. All keyboard shortcuts work. `?` shows shortcuts panel. Tests pass.

---

### Phase 18 — User Settings

**Goal:** Settings page for profile, timezone, playback speed, font size.

**Backend:**
- `PUT /auth/me` already handles updates — ensure it covers: display_name, timezone, playback_speed, font_size, avatar_url
- Avatar upload: reuse `/uploads/thumbnail` or add dedicated endpoint

**Frontend:**
- `pages/SettingsPage.tsx` — route: `/settings`. Sections:
  - **Profile:** Display name (input), Avatar (current + upload button)
  - **Preferences:** Timezone (searchable dropdown), Default playback speed (select), Font size (Normal/Large/XL radio)
- `stores/settingsStore.ts` — local Zustand store synced with backend. Font size → applies CSS class to `<html>` element
- Font size implementation: three CSS classes that adjust `--text-base` and all rem-based sizes
- All settings auto-save on change (debounced)
- Timezone used for streak calculations (sent with API requests)

**Tests:**
- Backend: test settings update (all fields)
- Component: SettingsPage render + interaction tests
- E2E: change settings, verify they persist across page reload

**Done when:** Settings page works. Changes persist. Font size visually changes the app. Tests pass.

---

### Phase 19 — Onboarding & Empty States

**Goal:** First-time user experience + thoughtful empty states everywhere.

**Frontend:**
- `pages/OnboardingPage.tsx` — shown on first login (flag stored in user profile or localStorage). Steps:
  1. Welcome splash: "Welcome to Learner Verse" + tagline + "Get Started" button
  2. Tooltip tour (3-4 steps): dashboard, mode toggle, "create your first course" prompt
  3. Option to create first course or dismiss
  4. Sets `onboarding_complete` flag
- `components/shared/EmptyState.tsx` — already built, but ensure all pages use it:
  - Creator dashboard (no courses) → "Start curating your first course!" + New Course button
  - Student dashboard (no Ready courses) → "Switch to Creator mode and build a course!"
  - Course builder (no sections) → "Add your first section to get started"
  - Section (no lessons) → "Add a lesson — a video, notes, or links"
  - Inbox (empty) → "Paste a YouTube link or URL to save for later"
  - Certificates (none) → "Complete a course to earn your first certificate!"
  - Search (no results) → "No results found. Try a different search term"
  - Trash (empty) → "Nothing in trash"
- Each empty state has: relevant illustration/icon, helpful message, primary action button

**Tests:**
- Component: OnboardingPage tests, EmptyState rendering with different props
- E2E: first-login flow (fresh user sees onboarding), verify empty states on all pages

**Done when:** Onboarding works for first-time users. Every page has a helpful empty state. Tests pass.

---

### Phase 20 — Responsive Polish, Accessibility & Hardening

**Goal:** Mobile/tablet layouts, WCAG compliance, error handling polish, final quality pass.

**Frontend — Responsive:**
- Sidebar: hamburger menu on mobile (< 768px), collapsed icons on tablet (768-1024px), full on desktop
- Study view: video + notes stack vertically on mobile
- Course builder: full-width on mobile, drag-and-drop disabled (use move buttons instead)
- Dashboard: single-column card grid on mobile, 2-col tablet, 3-col desktop
- Modals: full-screen on mobile, centered on desktop
- Quick Capture: full-width input on mobile
- Test all pages at 320px, 768px, 1024px, 1440px breakpoints

**Frontend — Accessibility:**
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<section>`, `<article>` where appropriate
- ARIA labels: all interactive elements, all icons, modal `role="dialog"`, live regions for toasts
- Focus management: trap focus in modals, return focus on close, visible focus rings everywhere
- Color contrast: audit all text/bg combinations with aXe or lighthouse
- `prefers-reduced-motion`: disable confetti, transitions, heatmap animations
- Skip-to-content link at top of page
- All images have alt text

**Frontend — Error Handling Polish:**
- `components/shared/ErrorBoundary.tsx` — catches React errors, shows friendly fallback
- Auto-save failure banner (retrying / retry button)
- Offline detection banner
- Multi-tab conflict warning (using BroadcastChannel API or localStorage events)
- All API error responses shown as toasts (non-blocking) or inline errors (forms)
- 404 page for invalid routes

**Backend — Hardening:**
- Rate limiting on write endpoints (basic, using slowapi or custom middleware)
- Input sanitization on all text fields (strip XSS attempts in markdown — sanitize HTML output on frontend)
- Request size limits (10MB max body)
- Proper CORS configuration (only allow frontend origin)
- Structured logging with timestamps
- Health check endpoint enhanced: DB connectivity check

**Final Tests:**
- E2E: `responsive.spec.ts` — test critical flows at mobile/tablet/desktop sizes
- Accessibility: run aXe-playwright on all pages, ensure 0 critical violations
- Run full test suite: all backend tests + all frontend component tests + all E2E tests
- Performance: lighthouse audit on key pages (target > 90 performance score)

**Done when:** App is responsive at all breakpoints. Accessibility audit passes WCAG AA. Error states handled gracefully. Multi-tab safety works. Full test suite green. MVP is complete.

---

## Test File Index

Quick reference for finding tests:

### Backend (`backend/tests/`)
| File | Covers |
|------|--------|
| `conftest.py` | Test DB, test client, user fixture, course factory |
| `api/test_auth.py` | Auth endpoints, single-user mode |
| `api/test_courses.py` | Course CRUD, trash, duplicate, status, export/import |
| `api/test_sections.py` | Section CRUD, reorder, duplicate |
| `api/test_lessons.py` | Lesson CRUD, reorder, move, duplicate |
| `api/test_progress.py` | Completion toggle, course progress, study state, study notes |
| `api/test_certificates.py` | Certificate generation, listing |
| `api/test_inbox.py` | Inbox CRUD, organize, batch |
| `api/test_search.py` | Full-text search |
| `api/test_stats.py` | Streak, heatmap, overview stats |
| `services/test_opengraph.py` | OG metadata fetching |
| `services/test_youtube.py` | YouTube metadata fetching |

### Frontend Components (`frontend/tests/components/`)
| Folder | Components Tested |
|--------|-------------------|
| `layout/` | AppShell, Sidebar, Header, ModeToggle |
| `course/` | CourseCard, CourseForm, CourseGrid, CourseStatusBadge |
| `section/` | SectionBuilder, SectionList, SectionProgress |
| `lesson/` | LessonBuilder, LessonView, YouTubeEmbed, MarkdownEditor, MarkdownRenderer, LinkCard, LinkInput |
| `study/` | StudySidebar, StudyNotes, ProgressBar, CompletionButton, FocusMode |
| `dashboard/` | CreatorDashboard, StudentDashboard, ContinueLearning, StatsCards, ActivityHeatmap |
| `certificate/` | CertificatePreview, CertificateDownload |
| `inbox/` | QuickCapture, InboxList |
| `search/` | CommandPalette |
| `shared/` | EmptyState, ConfirmDialog, ErrorBoundary, LoadingSkeleton, KeyboardShortcuts |

### E2E (`frontend/tests/e2e/`)
| File | User Journey |
|------|-------------|
| `auth.spec.ts` | Login flow, single-user mode bypass |
| `course-crud.spec.ts` | Create, edit, delete, trash, restore courses |
| `section-lesson.spec.ts` | Add/reorder/duplicate sections and lessons |
| `youtube-embed.spec.ts` | Paste URL, see preview, play in study view |
| `markdown-editor.spec.ts` | Write markdown, see preview, view in study |
| `link-cards.spec.ts` | Add reference links, see OG cards |
| `study-view.spec.ts` | Full study flow: navigate, read, watch, notes |
| `progress.spec.ts` | Mark complete, progress bars, continue learning |
| `certificates.spec.ts` | Complete course, celebrate, view/download cert |
| `inbox.spec.ts` | Quick capture, organize into course |
| `search.spec.ts` | Command palette, search, navigate to result |
| `stats.spec.ts` | Streak, heatmap, stats cards |
| `responsive.spec.ts` | Mobile/tablet/desktop layout checks |

---

## Run Commands

```bash
# === Development ===
make dev-db                  # Start PostgreSQL in Docker
make dev-backend             # Start FastAPI dev server (:8000)
make dev-frontend            # Start Vite dev server (:5173)
make dev                     # Start all (db + backend + frontend)

# === Database ===
make migrate                 # Run Alembic migrations
make migration MSG="..."     # Create new migration
make db-reset                # Drop and recreate database

# === Testing ===
make test                    # Run all tests
make test-backend            # pytest backend/tests/ -v
make test-frontend           # vitest run
make test-e2e                # playwright test
make test-coverage           # All tests with coverage reports

# === Linting ===
make lint                    # Run all linters
make lint-backend            # ruff check + ruff format --check
make lint-frontend           # eslint + prettier --check

# === Docker ===
make docker-build            # Build all containers
make docker-up               # Start all services
make docker-down             # Stop all services
```

---

## Phase Checklist

| # | Phase | Backend | Frontend | Tests |
|---|-------|---------|----------|-------|
| 0 | Scaffolding & Infrastructure | ◻ | ◻ | ◻ |
| 1 | Auth & Single-User Mode | ◻ | ◻ | ◻ |
| 2 | App Shell & Layout | ◻ | ◻ | ◻ |
| 3 | Course CRUD & Creator Dashboard | ◻ | ◻ | ◻ |
| 4 | Sections & Lessons Structure | ◻ | ◻ | ◻ |
| 5 | YouTube Video Integration | ◻ | ◻ | ◻ |
| 6 | Markdown Editor & Reference Links | ◻ | ◻ | ◻ |
| 7 | Course Status & Validation | ◻ | ◻ | ◻ |
| 8 | Student Mode: Study View | ◻ | ◻ | ◻ |
| 9 | Progress Tracking & Checkmarks | ◻ | ◻ | ◻ |
| 10 | Quick Capture Inbox | ◻ | ◻ | ◻ |
| 11 | Completion & Certificates | ◻ | ◻ | ◻ |
| 12 | Learning Goals | ◻ | ◻ | ◻ |
| 13 | Activity, Streaks & Heatmap | ◻ | ◻ | ◻ |
| 14 | Global Search | ◻ | ◻ | ◻ |
| 15 | Course Export & Import | ◻ | ◻ | ◻ |
| 16 | Course Duplication | ◻ | ◻ | ◻ |
| 17 | Focus Mode & Keyboard Shortcuts | ◻ | ◻ | ◻ |
| 18 | User Settings | ◻ | ◻ | ◻ |
| 19 | Onboarding & Empty States | ◻ | ◻ | ◻ |
| 20 | Responsive, Accessibility & Hardening | ◻ | ◻ | ◻ |
