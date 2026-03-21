# Learner Verse — Product Plan

> **GitHub for courses.** A personal LMS where you curate your own courses from YouTube videos, markdown notes, and web resources — then study them structurally, track your progress, and earn completion certificates.

---

## Core Concept

Learner Verse is a **personal LMS (Learning Management System)** — inspired by how GitHub handles code, but for learning. On GitHub, you create repositories, organize your code, manage your projects — and it's yours. Learner Verse works the same way for learning. You create courses (your "repos"), fill them with the best resources from across the internet, structure them into a proper curriculum, and then study through them.

No strict version history. No complicated branching. Just a **beautiful, powerful workspace** where your learning is organized, structured, and tracked.

Every user gets their own private space with two modes — one to build courses, one to study them. **In the MVP, everything is personal.** There is no shared knowledge hub or marketplace. Your courses are yours. You make them, you study them, you complete them, you get the certificate. The community/sharing layer comes later — just like GitHub started with personal repos before adding social features. Eventually, you'll be able to fork and share courses just like repos.

### What makes this different:
- **You are the creator AND the learner** — no dependency on anyone else
- **Full course curation setup** — not just bookmarking links, but building a real structured course with sections, lessons, notes, milestones, and embedded content
- **It feels like a real LMS** — structured study flow, progress tracking, completion certificates — except the content is curated by you
- **GitHub-like ownership** — your courses are your repos, your dashboard is your profile, your completions are your contribution graph
- **Better than bookmarks** — actual structure (sections, milestones), not just a flat list
- **More flexible than Udemy/Coursera** — curate from *any* source, learn at your own pace, no forced content
- **Simpler than Notion** — purpose-built for learning, not a general-purpose tool

**Default dark theme.** Always.

---

## Why Learner Verse? (Differentiation)

How Learner Verse compares to tools people currently use to organize learning:

| Tool | What it's for | Why Learner Verse wins |
|------|--------------|------------------------|
| **Notion** | General workspace / docs | Learner Verse is purpose-built for learning — structured courses, built-in progress tracking, embedded video player, certificates. No template hunting or manual setup |
| **YouTube Playlists** | Linear video lists | Adds structure (sections/milestones), personal notes per lesson, reference links, progress tracking, completion certificates. Not locked to YouTube-only content |
| **Pocket / Raindrop** | Read-later bookmarking | Organizes into real courses with hierarchy, not flat lists. Adds progress tracking, structured study flow, and certificates |
| **Udemy / Coursera** | Learning from course creators | *Your* curation, *your* control. Learn from any source on the internet, not just what's on their platform. No paywalls, no forced pacing, no subscriptions |
| **Browser bookmarks** | Saving URLs | Bookmarks are a graveyard. Learner Verse turns saved links into structured, trackable learning paths with accountability |

---

## Authentication

- Sign in with Google (OAuth) via **Clerk**
- Single sign-in gets you into both modes — no separate accounts
- Profile auto-populated from Google (name, avatar)
- Session persistence — stay signed in across visits

---

## The Two Modes

The platform has **two switchable modes** (names TBD — some ideas below):

| Mode | Purpose |
|------|---------|
| **Creator Mode** (or: Curator / Builder / Architect) | Build and organize courses |
| **Student Mode** (or: Learner / Explorer / Scholar) | Study through courses, track progress, earn certificates |

Users can toggle between modes freely via a **persistent toggle** in the sidebar/header. The entire dashboard, navigation, and available actions adapt based on which mode is active.

Both modes belong to the **same user** — this is not a two-sided platform. Every single user has both modes, just like every LMS has a course manager and a course player, except here both are you.

**In MVP, everything is personal.** No public feed, no course sharing, no browsing other people's courses. You curate → you study → you complete. Sharing is post-MVP.

**Name ideas for the toggle:**
- Creator ↔ Learner
- Build ↔ Study
- Architect ↔ Explorer
- Curate ↔ Learn

---

## What is a "Course"?

A course in Learner Verse is a **self-curated collection of learning resources**, organized into a proper hierarchical structure — like a real university course, but built by you.

```
Course
├── Title
├── Thumbnail (upload or auto-generate)
├── Description (what this course covers, goals)
├── Tags / Category
├── Status (Draft / Ready to Study)
│
├── Section 1 (Milestone)
│   ├── Section Title
│   ├── Section Description (optional)
│   │
│   ├── Lesson 1
│   │   ├── Lesson Title
│   │   ├── Content (one or more of the types below):
│   │   │   ├── YouTube Video (embedded player)
│   │   │   ├── Notes (written in Markdown)
│   │   │   └── Reference Links (with OpenGraph previews)
│   │   └── Completion Checkmark (manual)
│   │
│   ├── Lesson 2
│   │   └── ...
│   └── Section Complete = all lessons checked off
│
├── Section 2 (Milestone)
│   └── ...
│
└── Course Completion
    └── Certificate generated when ALL sections are complete
```

---

## Lesson Content Types (Detailed)

A lesson is the atomic unit of a course. It has a title and **one or more** of the following content types — in any combination:

### 1. YouTube Video
- User pastes a YouTube URL in the creator
- Platform auto-fetches: video title, thumbnail, duration, channel name
- In **Student Mode**: video is an **embedded player** — the learner watches it directly on the platform without leaving
- In **Creator Mode**: shows a preview card (thumbnail + title + duration)

### 2. Markdown Notes
- Rich markdown editor with **live preview** (side-by-side or toggle)
- Supports: headings, bold, italic, strikethrough, lists, numbered lists, blockquotes, code blocks (with syntax highlighting), inline code, images (via URL), horizontal rules, tables, task lists
- This is where the creator writes their own notes, summaries, key takeaways, or study guides
- Rendered beautifully in Student Mode with proper typography

### 3. Reference Links / Articles
- User pastes any URL (blog post, documentation page, article, Stack Overflow, etc.)
- Platform fetches **OpenGraph metadata**: title, description, image (og:image), favicon, site name
- Displayed as a **rich link card** — shows the OG image prominently, title, description, and source domain
- Clicking opens the link in a new tab
- Multiple links per lesson are supported — displayed as a vertical stack of cards

### Content combinations per lesson:
| Combination | Use Case |
|-------------|----------|
| YouTube video only | "Just watch this video" |
| YouTube video + MD notes | Video with your own written summary/notes |
| YouTube video + reference links | Video + supporting articles |
| YouTube video + MD notes + reference links | The full package |
| MD notes only | A text-based lesson (your own writeup) |
| MD notes + reference links | Written guide with supporting resources |
| Reference links only | "Read these articles" |

---

## The Dashboard

The dashboard is the **central hub** — everything happens here. It adapts based on the active mode. Think of it like GitHub's dashboard — your repos, your activity, your stats, all in one place.

### Creator Mode Dashboard
- **Course cards** — grid/list of all courses you've created (thumbnail, title, section count, lesson count, status)
- **"New Course" button** — prominent, always accessible
- **Course status indicators** — Draft (still building) / Ready (good to study)
- **Quick actions** — edit, duplicate, delete a course
- **Search & filter** — search your courses by title/tag, filter by status
- **Tags sidebar** — filter courses by tag/category
- **Quick Capture Inbox** — a place to quickly dump YouTube links and URLs to organize into courses later (more details below)

### Student Mode Dashboard
- **Course cards** — grid/list of courses you're studying (thumbnail, title, progress bar, last accessed)
- **Filters** — All / In Progress / Completed / Not Started
- **Continue Learning** — hero section showing the most recent course with a "Resume" button, exactly where you left off
- **Completed courses** — separate section with certificate access
- **Learning Stats** — overview cards: courses completed, total lessons done, current streak, study time
- **Learning Activity Graph** — a GitHub-style contribution/activity heatmap showing your study days (this is the "contribution graph" equivalent)

---

## Quick Capture Inbox

One of the biggest friction points in self-learning: you find a great video or article but you're not ready to organize it into a course yet. The **Quick Capture Inbox** solves this.

- Always accessible from the sidebar (in both modes)
- Paste a YouTube URL or any link → it captures the title, thumbnail/OG image, and stores it
- Items sit in the inbox until you organize them into a course or dismiss them
- Think of it like GitHub's "starred repos" or a read-later queue
- Keeps your learning pipeline flowing without breaking your study session

### Inbox UX Details:
- **Inbox list:** Shows all captured items — video thumbnail + title or link OG image + title, date added
- **Preview:** Click an item to see its full preview (video player or link card)
- **Organize into course:** Select an item → pick a destination course + section → creates a new lesson in that section (video item → lesson with video; link item → lesson with reference link)
- **Batch import:** Multi-select items and import all into the same section at once
- **Dismiss:** Swipe or click X to remove from inbox (with undo)
- **Sort:** By date added (default), alphabetical, or manual reorder
- **Auto-detect type:** Platform auto-detects if the URL is a YouTube video or a regular article/link

---

## Course Builder (Creator Mode) — The Full Curation Setup

The course builder is the heart of Creator Mode. This is where the magic happens — turning scattered internet resources into a structured, proper course.

### Step 1: Course Setup
- Title (required)
- Description (optional, supports markdown)
- Thumbnail — upload an image, or auto-generate a gradient/pattern with the course title
- Tags — add multiple tags for organization (e.g., "JavaScript", "Web Dev", "Beginner")
- Category — broad category selection

### Step 2: Section Builder
- Add sections (milestones) — each one is a chapter of your course
- Section title + optional description
- Reorder sections via drag-and-drop
- Collapse/expand sections for better overview
- Delete sections (with confirmation)

### Step 3: Lesson Builder
Within each section:
- Add lessons — each is a single unit of learning
- Lesson title (required)
- **YouTube URL field** — paste a link, auto-fetches metadata and shows preview
- **Markdown editor** — write notes with live preview
- **Links section** — paste URLs, auto-fetches OpenGraph data and shows rich previews
- Reorder lessons via drag-and-drop within a section
- Move lessons between sections
- **Duplicate lesson** — right-click or action menu → creates a copy within the same section
- **Duplicate section** — right-click or action menu → copies the entire section with all its lessons
- Delete lessons
- Every lesson must have at least one content type (video, notes, or link) before the course can be marked Ready

### Step 4: Preview
- See the entire course exactly as it will appear in Student Mode
- Play videos, read notes, see link cards — full interactive preview
- Catch layout issues or missing content before you start studying

### Step 5: Save & Status
- **Auto-save** — changes save automatically as you work (every 30 seconds), never lose progress
- **Draft status** — course is being built, not ready for study
- **Mark as Ready** — when you're happy, mark it as ready and it appears in Student Mode
- **Courses can be edited at any time** — even after marking as Ready. Changes are reflected immediately in Student Mode
- **Editing does not reset progress** — reordering sections/lessons, editing notes, or changing videos does NOT reset completion checkmarks. Your progress is preserved
- **Multi-tab safety** — if the same course is open in two browser tabs, the platform shows a warning: "This course is open in another tab. Changes may conflict. Return to the other tab or refresh to sync."

---

## Study View (Student Mode) — The Learning Experience

This is where you sit down and actually learn. Clean, focused, distraction-free.

### Course Overview Page
- Course title, description, thumbnail at the top
- Full structure visible: all sections and lessons in a sidebar/collapsible tree
- Overall progress bar (e.g., "42% complete — 12 of 28 lessons done")
- "Continue" button — takes you to the next incomplete lesson
- Section-level progress indicators (e.g., **Section 2** ● ● ● ○ ○)

### Lesson View
The main study screen. Clean, focused layout:

- **YouTube video** — embedded player at the top, plays inline on the platform. Full controls (play, pause, seek, fullscreen, speed, quality)
- **Markdown notes** — beautifully rendered below the video. Proper typography, syntax-highlighted code blocks, clickable links
- **Reference link cards** — below the notes. Each link shows its **OpenGraph image** prominently, title, description, and domain. Clean card design
- **"Mark as Complete" button** — manual checkmark. You decide when you're done
- **Navigation** — Previous / Next lesson buttons. Lesson title breadcrumb (Course > Section > Lesson)
- **Section context** — small indicator showing which section this lesson belongs to and your progress within it

### Focus Mode (Zen Mode)
- Toggle to hide the sidebar, header, and all navigation
- Just the content: video, notes, links. Nothing else
- Keyboard shortcut to toggle (e.g., `F` for focus)
- Perfect for deep study sessions

### Quick Edit (From Student Mode)
- While studying, if you spot an error (typo, wrong video, broken link), press `E` or click the **"Quick Edit"** button
- Opens a modal/inline editor for that lesson — edit notes, swap a video, fix a link — without fully switching to Creator Mode
- Save and continue studying immediately
- Reduces mode-switching friction for small corrections

### Personal Study Notes
- While studying a lesson, the learner can write **their own notes** (separate from the creator's notes in the course)
- Quick scratchpad per lesson — jot down insights, questions, key points
- Persisted and accessible whenever you return to that lesson
- These are private annotations — your thoughts on top of the course content

---

## Progress & Motivation System

### Manual Checkmarks
- Each lesson has a "Mark as Complete" button — you decide when you've learned it
- No auto-completion or time-based completion — learning is self-paced and honest
- Uncheck is possible — if you want to revisit, unmark and redo

### Progress Tracking
- **Per-lesson** — complete / not complete
- **Per-section** — X of Y lessons complete (visual indicator: dots, bar, or ring)
- **Per-course** — overall percentage + progress bar
- **Dashboard-level** — every course card shows its progress

### Learning Streak
- Track consecutive days with at least one lesson completed
- Streak counter visible on the dashboard
- **Streak rules:** Your streak counts consecutive days where you completed at least one lesson. If you miss **7 consecutive days**, your streak resets to zero. Missing 1–6 days does not break it — the system is forgiving. This encourages consistency without punishing life happening
- Think GitHub contribution streaks

### Learning Activity Heatmap
- GitHub-style green-square heatmap showing which days you studied
- Shows the last 12 months of activity
- Darker shade = more lessons completed that day
- Visible on Student Mode dashboard — motivating visual proof of consistency

### Study Analytics
- Total courses completed (all time)
- Total lessons completed (all time)
- Current streak (days)
- Longest streak (all time)
- Most active day of the week
- Courses in progress count

---

## Certificate

When all lessons in all sections of a course are marked complete, a certificate is unlocked.

### Certificate contents:
- User's name
- Course title
- Number of sections and lessons completed
- Completion date
- Unique certificate ID
- Learner Verse branding (minimal, tasteful)

### Certificate features:
- **Preview on screen** — see the certificate in a modal/page before downloading
- **Download as PDF** — clean, print-ready design
- **Printable** — designed to look good on A4/Letter paper
- **Dark design** — matches the platform's dark aesthetic
- **Unique ID** — each certificate has a unique identifier (for future verification)

---

## Keyboard Shortcuts

Power users should never need to leave the keyboard:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Global search (search courses, lessons, notes) |
| `F` | Toggle Focus/Zen Mode (in study view) |
| `E` | Quick Edit current lesson (in study view) |
| `→` or `N` | Next lesson |
| `←` or `P` | Previous lesson |
| `Space` | Play/pause video |
| `M` | Mark lesson as complete |
| `Ctrl/Cmd + S` | Force save (course builder) |
| `Ctrl/Cmd + Shift + C` | Toggle Creator ↔ Student mode |
| `Ctrl/Cmd + N` | New course (in Creator Mode) |
| `?` | Show keyboard shortcuts panel |
| `Esc` | Close modal / exit Focus Mode |

**Shortcut discovery:** pressing `?` anywhere opens a "Keyboard Shortcuts" panel listing all shortcuts. On first login, a subtle tooltip hints: "Press ? to see keyboard shortcuts."

---

## Global Search

Search across everything in your account:

- **Course titles** and descriptions
- **Lesson titles**
- **Markdown note contents** — full-text search within your notes
- **Tags**
- Results grouped by type (Courses, Lessons, Notes)
- Triggered by `Ctrl/Cmd + K` — command palette style, fast and always available
- Fuzzy matching — handles typos

---

## Onboarding (First-Time User Experience)

When a user signs in for the first time:

1. **Welcome screen** — "Welcome to Learner Verse" with a one-liner about the concept
2. **Quick tour** — 3-4 step tooltip walkthrough:
   - "This is your dashboard — the hub of everything"
   - "Switch between Creator and Student modes here"
   - "Start by creating your first course"
   - "When you're done building, switch to Student mode and start learning"
3. **Create your first course** — prompt to create or optionally use a starter template
4. **Done** — land on the dashboard, ready to go

---

## Empty States

Every screen should have a thoughtful empty state — no blank pages:

- **No courses yet (Creator):** "Your course library is empty. Start curating your first course!" + New Course button
- **No courses yet (Student):** "Nothing to study yet. Switch to Creator mode and build your first course!" + Toggle button
- **Empty section:** "This section has no lessons yet. Add one to get started."
- **Empty inbox:** "Nothing captured yet. Paste a YouTube link or URL to save it for later."
- **No completions:** "No certificates yet. Complete a course to earn your first one!"

---

## Course Duplication

- In Creator Mode, you can **duplicate any of your courses**
- Creates a full copy — all sections, lessons, notes, links
- The copy is independent — edit it without affecting the original
- Use case: create variations of a course (e.g., "React Basics v2" based on "React Basics")

---

## Course Deletion

- Deleted courses go to **Trash** for 30 days before permanent deletion
- During those 30 days, you can restore the course (recovers progress, notes, certificates — everything)
- After 30 days, it's permanently deleted and unrecoverable
- Trash is accessible from the sidebar in Creator Mode
- If a course is both created and being studied, deleting it removes it from both modes

---

## Course Limits (MVP)

Reasonable limits to keep the system performant:

| Resource | Limit |
|----------|-------|
| Courses per user | 50 |
| Sections per course | 50 |
| Lessons per section | 50 |
| Reference links per lesson | 10 |
| Thumbnail file size | 5 MB |
| Course title | 200 characters |
| Lesson title | 200 characters |
| Markdown notes per lesson | 50,000 characters |
| Quick Capture Inbox items | 100 |

These limits can be increased later. If a user hits a limit, show a clear message explaining the cap.

---

## Learning Goals

Optional per-course goal setting to increase motivation and accountability:

- **Target completion date** (optional) — set when starting a course: "I want to finish by April 15"
- **Pace indicator** — based on your target date and remaining lessons: "You need 2 lessons/week to finish on time" or "You're ahead of schedule!"
- **Behind-schedule nudge** — if you're falling behind: "You're 3 lessons behind. Pick up the pace or adjust your target date"
- **Goal completion celebration** — if you finish on or before your target: "Goal met! You finished 3 days early!"
- **No pressure** — goals are optional and adjustable. No penalty for missing a target; you can change or remove it anytime

---

## Responsive Design

- **Desktop-first** — the primary experience is on desktop/laptop
- **Tablet** — fully functional, study view adapts to smaller screens
- **Mobile** — study view works on mobile (video + notes stack vertically). Basic course editing (title, notes) works on mobile. Section/lesson drag-and-drop reordering is desktop-only
- **Quick Capture works on mobile** — paste a link from your phone, organize later on desktop
- Core layouts should be responsive from day one, not as an afterthought

---

## Error Handling & Edge Cases

Every failure state should be handled gracefully with clear messaging:

### URL & Content Errors
- **Invalid YouTube URL** — show inline error: "This doesn't look like a valid YouTube link. Check the URL and try again." Don't save the lesson until corrected
- **YouTube video deleted/unavailable** — show a warning banner on the lesson: "This video is no longer available on YouTube." Link to the original URL. Don't break the lesson — notes and links still work
- **YouTube age-restricted video** — show notice: "This video requires age verification on YouTube." Provide a direct link to watch on YouTube
- **OpenGraph fetch fails** — show a fallback card: URL as plain text + domain favicon (if available) + "Preview unavailable" label. The link still works
- **Broken reference link (404)** — show a muted card: "This link may be broken." User can click to check or remove it

### Lesson & Course Errors
- **Empty lesson (no content)** — allowed in Draft. When marking course as Ready, warn: "Section X has lessons with no content. Add content or remove them before marking Ready"
- **Empty section (no lessons)** — same as above: allowed in Draft, warned when marking Ready
- **Course with no sections** — can't be marked Ready: "Add at least one section with one lesson to start studying"

### Network & System Errors
- **Auto-save failure** — show a subtle warning bar: "Changes couldn't be saved. Retrying..." with a manual "Save Now" button
- **Offline state** — show a banner: "You're offline. Some features may not work. Changes will sync when you're back online"
- **Image upload failure** — show error on thumbnail: "Upload failed. Try again or use auto-generated thumbnail"

---

## Video Playback Behavior

Rules for the embedded YouTube player in Student Mode:

- **Auto-play:** OFF by default (respects user attention)
- **Playback speed:** User's preferred speed is saved and persisted across all videos (e.g., if you watch at 1.5x, next video starts at 1.5x)
- **Video quality:** YouTube iframe handles quality automatically; no custom UI needed
- **Fullscreen:** Works as expected via YouTube's built-in fullscreen button
- **Video controls:** Play, pause, seek, volume, speed, fullscreen — all via YouTube's embedded player
- **Keyboard in video:** `Space` to play/pause, `→/←` to seek (standard YouTube shortcuts work when player is focused)

---

## User Settings

Minimal settings available from day one:

### MVP Settings
- **Display name** — editable (defaults to Google name)
- **Avatar** — auto-pulled from Google, can upload custom
- **Timezone** — dropdown selection (important for streak reset consistency — streak resets at midnight in your timezone)
- **Default playback speed** — 1x, 1.25x, 1.5x, 1.75x, 2x

### Post-MVP Settings
- Study reminders (daily notification at a chosen time)
- Notification preferences (streak alerts, goal reminders)
- Data export (download all your courses and progress)

---

## Accessibility

Accessibility is not a "nice-to-have" — it's built in from the start:

- **Keyboard navigation** — every interactive element is reachable via Tab/Shift+Tab. Focus indicators are always visible
- **Screen reader support** — proper semantic HTML, ARIA labels on all interactive elements, meaningful alt text
- **Color contrast** — all text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text) even in dark theme
- **Font size** — user can adjust: Normal, Large, XL (persisted in settings)
- **Focus indicators** — clear, visible focus rings on all focusable elements (not just browser defaults)
- **Reduced motion** — respect `prefers-reduced-motion` OS setting; disable confetti, transitions, and animations
- **Alt text** — auto-generated for YouTube thumbnails (video title), OG images (link title). Custom alt text for uploaded thumbnails
- **No color-only indicators** — progress bars, status badges, and streaks use icons/text in addition to color

---

## Course Export & Import

Users should never feel locked into the platform:

- **Export a course** — download as a JSON file containing all metadata, sections, lessons, note content, video URLs, reference links, and progress data
- **Import a course** — upload a JSON file to create a new course (creates an independent copy)
- **Use cases:** backup your courses, transfer between accounts, share a course file with a friend (pre-community feature)
- **Export does NOT include:** video files (just URLs), OG images (re-fetched on import), certificates (re-generated on completion)

---

## Sustainability & Business Model

The MVP is completely free. The plan for long-term sustainability:

### MVP (Free Forever)
- Core personal LMS features — create, study, track, certify — always free
- This is the "free tier" that never goes away

### Future Revenue Options (Post-MVP)
- **Freemium model:** Free personal LMS. Paid plans unlock premium features:
  - AI-powered notes (auto-generate summaries from videos)
  - AI course outline generation
  - Verified certificates (employer-verifiable via unique link + API)
  - Advanced analytics (detailed study patterns, retention insights)
  - Increased course/lesson limits
  - Priority support
- **Certificate verification API:** Employers or platforms can verify a certificate's authenticity via API (paid service)
- **Team/Enterprise plan:** Organizations pay for team course management, shared courses within a team, admin dashboard
- **Premium templates:** Curated, high-quality course templates from experts (marketplace cut)

### Principles
- The core product (personal learning, curation, progress tracking) **remains free forever**
- Revenue comes from premium/professional features, not gating basic functionality
- No ads. Ever. The product stays clean

---

## Phased Rollout (MVP in 10 Phases)

> Phase 0 = All setup done (project scaffolding, auth, database, deployment pipeline, UI framework, dark theme). Phases 1–10 build features incrementally.

### Phase 1 — Authentication, User Profile & App Shell
- Google OAuth sign in via Clerk
- User profile creation (name, avatar auto-pulled from Google)
- Basic profile page (view/edit display name, timezone)
- Mode toggle component (Creator ↔ Student) — visible in UI, basic switch behavior
- App shell: sidebar, header, dark theme, layout skeleton
- Basic onboarding: welcome screen + 3-step tooltip walkthrough on first login
- Empty states for dashboard (both modes)

### Phase 2 — Course Creation (Basics)
- Create a new course: title, description (markdown), tags
- Upload or auto-generate thumbnail (gradient/pattern with course title)
- View list of your created courses on the Creator dashboard (card grid)
- Course cards: thumbnail, title, tag pills, status badge (Draft)
- Edit course metadata (title, description, tags, thumbnail)
- Delete a course (soft delete → Trash with 30-day recovery)
- Trash view in sidebar

### Phase 3 — Sections & Lessons Structure
- Add sections (milestones) to a course
- Section: title + optional description
- Add lessons within sections (title only for now)
- Reorder sections via drag-and-drop
- Reorder lessons within a section via drag-and-drop
- Move lessons between sections
- Collapse/expand sections in the builder
- **Duplicate lesson** and **duplicate section** (action menu)
- Delete sections and lessons (with confirmation)
- Validation: warn about empty sections/lessons when marking course Ready

### Phase 4 — Lesson Content: YouTube Videos
- YouTube URL input field in lesson builder
- Auto-fetch video metadata: title, thumbnail, duration, channel name (oEmbed)
- Preview card in Creator Mode: thumbnail + title + duration + channel
- Embedded YouTube player in Student/Preview mode — plays inline on the platform
- Handle invalid or broken YouTube URLs gracefully (inline error message)
- Detect deleted/unavailable videos and show warning banner
- Persist user's preferred playback speed across videos

### Phase 5 — Lesson Content: Markdown Notes & Reference Links
- Markdown editor for lesson notes with **live preview** (split-pane or toggle)
- Full markdown support: headings, bold, italic, code blocks (syntax highlighting), lists, images, tables, blockquotes, task lists
- Reference links section: paste any URL
- Auto-detect URL type: YouTube video vs. regular article/link
- Auto-fetch **OpenGraph metadata** for pasted links: og:title, og:description, og:image, favicon, domain
- Graceful fallback if OpenGraph fetch fails (plain URL + "preview unavailable")
- Rich link card rendering: OG image prominently displayed, title, description, source
- Support multiple reference links per lesson (vertical card stack, max 10)
- Link cards clickable → open in new tab

### Phase 6 — Student Mode: Study View & Personal Notes
- Switch to Student Mode and see your courses (only courses marked "Ready")
- Course overview page: title, description, full section/lesson tree, overall progress bar
- Lesson view: embedded YouTube player + rendered markdown notes + reference link cards
- Lesson navigation: Previous / Next buttons, breadcrumb (Course > Section > Lesson)
- Section context indicator in lesson view
- Sidebar with full course structure (collapsible sections, lesson list)
- **Personal Study Notes** — scratchpad per lesson while studying. Write your own annotations (separate from course notes). Persisted and accessible on return. Simple markdown editor
- **Quick Edit** — press `E` in study view to edit lesson content inline (notes, video, links) without switching to full Creator Mode

### Phase 7 — Progress Tracking, Checkmarks & Quick Capture
- "Mark as Complete" button on each lesson
- Ability to unmark (re-study)
- Section progress indicator (e.g., 3/5 lessons done — dots or mini progress bar)
- Overall course progress bar (percentage)
- Dashboard course cards show progress bar
- "Continue Learning" — hero section on Student dashboard with resume button
- Track and remember the last viewed lesson per course
- **Quick Capture Inbox** — paste a link from anywhere, auto-detect type, save to inbox. Organize into courses later. Batch import. Dismiss with undo. Accessible from sidebar in both modes

### Phase 8 — Course Completion, Certificates & Goals
- Detect when all lessons in a course are marked complete → trigger completion
- Completion celebration moment (confetti animation, congrats message — respects `prefers-reduced-motion`)
- Generate certificate: user name, course title, sections/lessons count, completion date, unique ID
- Certificate preview screen (dark design matching platform aesthetic)
- Download certificate as PDF (print-ready, A4/Letter)
- Completed courses section on Student dashboard with certificate access button
- **Learning Goals** — optional target completion date per course. Pace indicator, behind-schedule nudge, goal-met celebration

### Phase 9 — Activity, Stats, Search & Analytics
- Learning streak tracking (consecutive days with at least one completion; resets after 7 missed days)
- Learning Activity Heatmap (GitHub-style green squares, last 12 months, darker = more lessons)
- Stats cards on dashboard: courses completed, lessons done, current streak, longest streak, most active day
- **Global search** (`Ctrl/Cmd + K`): search across course titles, lesson titles, note contents, tags
- Search results grouped by type (Courses, Lessons, Notes)
- Fuzzy matching for typos
- **Course export** — download course as JSON for backup
- **Course import** — upload JSON to create a new course

### Phase 10 — Polish, Power Features & Hardening
- **Course duplication** — clone a course in Creator Mode
- **Focus/Zen Mode** — distraction-free study view toggle (`F`)
- **Keyboard shortcuts** — full set (see shortcuts section) + `?` panel to discover them
- **Course preview** — see your course as a student without switching modes
- **Onboarding polish** — refine walkthrough based on earlier phases, add "first course" prompt
- **Font size setting** — Normal / Large / XL (persisted)
- **Accessibility audit** — ensure WCAG AA compliance, screen reader testing, focus indicators, reduced motion
- **Responsive polish** — mobile/tablet layout adjustments, mobile Quick Capture
- **Edge cases** — empty sections, courses with no lessons, broken links, multi-tab conflict warnings, offline banner
- **Error handling polish** — all error states from the Error Handling section implemented and tested

---

## Future Features (Post-MVP)

These are **not** part of the 10-phase MVP but are planned for later.
The MVP is a **fully personal LMS** — the features below turn it into a **community/social learning platform** (the "GitHub social layer"):

### Community & Sharing (The Knowledge Hub)
- **Common Knowledge Hub** — a shared space where users can publish and discover courses
- **Public course sharing** — publish a course for others to discover and study
- **Course discovery** — search, browse by category/tags, trending courses
- **Clone/Fork a course** — fork someone else's course and customize it (like forking a repo)
- **Social profiles** — public profile showing completed courses, activity heatmap, bio
- **Ratings & reviews** on shared courses
- **Collaborative courses** — multiple creators can contribute to one course
- **Discussion per lesson** — comments/questions on each lesson (for shared courses)
- **Follow users** — follow creators whose courses you like
- **Achievement badges** — "Completed 5 courses", "30-day streak", "100 lessons learned" — shareable badges
- **Public activity visibility** — optionally make your heatmap and completions public

### Automation & AI
- **Import from YouTube playlist** — paste a playlist URL and auto-generate a section with all videos as lessons
- **Bulk URL import** — paste multiple YouTube links at once, create lessons in batch
- **AI-assisted notes** — auto-generate markdown summaries/notes from video content
- **AI course outline** — describe what you want to learn ("Learn React"), AI suggests a full course structure (sections + lesson titles + suggested resources)
- **Smart suggestions** — "People who studied X also studied Y"
- **AI "Summarize" button** — in Student Mode, summarize your notes or a lesson's content with one click

### Advanced Features
- **Shareable certificates** — unique link to verify completion
- **Course templates** — pre-built structures for common topics (e.g., "Learn a Programming Language" template)
- **Notifications** — reminders to continue studying, streak alerts, daily digest
- **Spaced repetition** — flag lessons as "hard" or "needs review". Get reminded to revisit at optimal intervals. Dedicated "Review Queue" page
- **PDF/file attachments** — attach PDFs, slides, or files to lessons
- **Offline mode** — download course notes for offline study
- **Light theme toggle** — optional, dark stays default
- **Browser extension** — "Save to Learner Verse" button on any webpage → sends to Quick Capture Inbox
- **Video timestamps/bookmarks** — mark specific timestamps within a YouTube video as important
- **Self-assessment per lesson** — rate your understanding (1-5 stars) after completing a lesson

---

## Design Principles

1. **Dark by default** — the entire UI is dark-themed. It's not a toggle, it's the identity
2. **Clean and focused** — no clutter, no ads, no distractions. GitHub-level cleanliness
3. **Fast** — every interaction should feel instant. No unnecessary loading states
4. **Delightful** — subtle animations, satisfying completion moments, polished micro-interactions
5. **Consistent** — same design patterns everywhere. Once you learn one screen, you know them all
6. **Keyboard-friendly** — power users should be able to do everything from the keyboard
7. **Accessible** — WCAG AA compliant, keyboard navigable, screen reader friendly, adjustable font sizes
8. **Forgiving** — undo on destructive actions, soft deletes, auto-save, no permanent mistakes

---

## Resolved Decisions

Decisions made during planning (for reference during implementation):

- [x] **Courses can be edited after marking Ready** — changes reflect immediately in Student Mode. Editing does not reset progress
- [x] **Streak resets after 7 consecutive missed days** — forgiving, not punishing
- [x] **Soft delete for courses** — 30-day Trash recovery period
- [x] **Auto-save in Course Builder** — every 30 seconds, with manual save option
- [x] **Auto-detect URL type** — platform auto-detects YouTube vs. regular link
- [x] **Study notes are simple markdown** — same editor as course notes, but per-lesson and private
- [x] **Course export/import is in MVP (Phase 9)** — JSON format for backup and portability
- [x] **Quick Capture Inbox in MVP (Phase 7)** — not a post-MVP feature
- [x] **Personal Study Notes in MVP (Phase 6)** — launches with Study View, not after
- [x] **Basic onboarding in Phase 1** — simple walkthrough, polished in Phase 10
- [x] **No AI features in MVP** — planned for post-MVP. Product must stand strong without AI
- [x] **MVP is free, monetization is post-MVP** — freemium model planned

---

## Open Questions

- [ ] What do we call the two modes? (Creator/Learner? Build/Study? Something unique to the brand?)
- [ ] Certificate design — minimal dark aesthetic? How much Learner Verse branding?
- [ ] Should there be a landing page explaining the product, or straight to sign-in?
- [ ] Quick Capture — sidebar widget, floating button, or both?
- [ ] Learning heatmap — GitHub-style calendar or a different visualization?
- [ ] Course categories — predefined list, fully user-defined tags, or both?
- [ ] Should the Quick Edit from Student Mode be a modal overlay or an inline editor?
