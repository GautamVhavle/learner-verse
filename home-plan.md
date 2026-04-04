# Learner Verse (YouTube Edition) — Homepage Plan

> A world-class landing page that markets LearnerVerse as the ultimate AI-powered course platform built around YouTube content. Inspired by Apple's clean design philosophy — generous whitespace, bold typography, smooth scroll-driven animations, and a dark-first aesthetic.

---

## Brand Identity

| Attribute       | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| **Product Name** | Learner Verse (YouTube Edition)                                      |
| **Tagline**      | _Turn any YouTube playlist into a complete learning experience._      |
| **AI Mascot**    | LiVi — your AI study companion                                       |
| **Primary Color** | `#3b82f6` (Accent Blue)                                             |
| **Accent Pair**  | Purple `#a855f7` + Blue `#3b82f6` gradient                           |
| **Mood**         | Premium, intelligent, focused, approachable                           |
| **Typography**   | Inter (sans) — clean geometric, Apple-esque                           |

---

## Page Sections Overview (Top → Bottom)

| # | Section              | Purpose                                              |
|---|----------------------|------------------------------------------------------|
| 1 | **Navbar**           | Sticky glass nav with logo, links, CTA               |
| 2 | **Hero**             | Headline, subtext, CTA buttons, product mockup        |
| 3 | **Social Proof Bar** | Scrolling stats ticker — courses, learners, lessons   |
| 4 | **Problem → Solution** | Why existing learning is broken, how LV fixes it    |
| 5 | **Features Bento**   | Bento grid showcasing 6 core features                 |
| 6 | **AI Showcase**      | LiVi AI assistant deep-dive with animated demo        |
| 7 | **How It Works**     | 3-step animated flow with browser mockup              |
| 8 | **Testimonials**     | Marquee of learner/creator testimonial cards           |
| 9 | **Stats / Impact**   | Animated number tickers with impact metrics            |
| 10 | **CTA Section**     | Final conversion section with gradient background      |
| 11 | **Footer**          | Links, socials, branding                               |

---

## Section Blueprints

### 1. Navbar

**Design:** Sticky, glassmorphic (`backdrop-blur-xl`), transparent until scroll then gets a subtle border + bg.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔵 LearnerVerse    Features  How It Works  About    [Dashboard →]  │
└─────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Left: Logo (SVG from `/public/logo.svg`) + "LearnerVerse" wordmark
- Center: Anchor links — Features, How It Works, About (smooth scroll)
- Right: "Go to Dashboard" button (links to `/login` if unauthenticated, `/` if authenticated)
- On scroll: `background: rgba(0,0,0,0.6)` + `backdrop-blur: 20px` + thin bottom border
- Mobile: Hamburger menu with `Sheet` component slide-in

**Components:**
- shadcn `Button`, `Sheet` (mobile menu)
- GSAP `ScrollTrigger` for glass transition on scroll

**Animations:**
- Nav items fade-in staggered on page load (GSAP `fromTo` with `opacity: 0 → 1`, `y: -10 → 0`)
- Glass effect transitions smoothly on scroll threshold (GSAP `ScrollTrigger`)

---

### 2. Hero Section

**Design:** Full-viewport height, dark gradient background with subtle animated grid pattern. Bold headline, supporting text, two CTA buttons, and a floating browser mockup showing the app.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│          ✨ AI-Powered Learning Platform                        │
│                                                                 │
│     Turn Any YouTube Playlist                                   │
│     Into a Complete Learning                                    │
│     Experience.                                                 │
│                                                                 │
│     Build courses, generate quizzes, track progress,            │
│     and learn with LiVi — your AI study companion.              │
│                                                                 │
│     [✦ Get Started Free]   [▶ See How It Works]                 │
│                                                                 │
│         ┌──────────────────────────────────────┐                │
│         │    ╔═══ Safari Browser Mockup ═══╗   │                │
│         │    ║  Dashboard screenshot / demo ║   │                │
│         │    ╚══════════════════════════════╝   │                │
│         └──────────────────────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: `animated-grid-pattern` (Magic UI) with low opacity + radial gradient overlay (blue→purple center glow)
- Badge above headline: `animated-shiny-text` — "✨ AI-Powered Learning Platform"
- Headline: 56–72px bold, white, with `word-rotate` cycling through: "YouTube Playlist", "Video Collection", "Knowledge Library"
- Subtext: 18–20px, muted gray (`text-text-secondary`)
- CTA Primary: `shimmer-button` (Magic UI) — "Get Started Free"
- CTA Secondary: Outline button — "See How It Works" (smooth scrolls to How It Works section)
- Below CTAs: `safari` browser mockup (Magic UI) showing a screenshot of the Course Builder or Dashboard with `border-beam` glow effect
- The mockup floats up on scroll with parallax

**Animations:**
- Staggered GSAP timeline on load:
  1. Badge fades in (0.0s)
  2. Headline words slide up one by one (0.2s stagger)
  3. Subtext fades in (0.6s)
  4. Buttons scale in with spring (0.8s)
  5. Browser mockup slides up from below with `ease: "power3.out"` (1.0s)
- Grid pattern animates continuously (built-in Magic UI animation)
- Subtle parallax on browser mockup on mouse move (GSAP `quickTo`)

---

### 3. Social Proof / Stats Bar

**Design:** Horizontal divider section with animated number tickers.

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│   500+ Courses Created  •  10K+ Lessons  •  2K+ Learners  │
└────────────────────────────────────────────────────────────┘
```

**Specs:**
- Full-width, subtle top + bottom border
- 3–4 stats with `number-ticker` (Magic UI) counting up on scroll into view
- Dividers between stats (• or |)
- Stats: "500+ Courses Created", "10,000+ Lessons Built", "2,000+ Active Learners", "50,000+ Quizzes Generated"
- Numbers are dummy/aspirational for now

**Components:**
- Magic UI: `number-ticker`
- GSAP `ScrollTrigger` to trigger count animation

**Animations:**
- Numbers count up from 0 when section enters viewport
- `blur-fade` (Magic UI) on each stat block

---

### 4. Problem → Solution Section

**Design:** Two-column layout. Left = the "old way" (painful). Right = the "LearnerVerse way" (delightful). Apple-style comparison with clean iconography.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         Learning from YouTube is broken.                    │
│                                                             │
│  ╔═══════════════════╗     ╔═══════════════════╗            │
│  ║   Without LV  ✕   ║     ║   With LV  ✓      ║           │
│  ║                   ║     ║                    ║           │
│  ║ • Scattered tabs  ║     ║ • Organized courses║           │
│  ║ • No structure    ║     ║ • Sections & flow  ║           │
│  ║ • No quizzes      ║     ║ • AI-gen quizzes   ║           │
│  ║ • No tracking     ║     ║ • Full progress    ║           │
│  ║ • Alone            ║     ║ • LiVi AI assist  ║           │
│  ╚═══════════════════╝     ╚═══════════════════╝            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Section headline: "Learning from YouTube is broken." + subtext explaining the gap
- Two `magic-card` (Magic UI) side by side — cursor spotlight effect on hover
- "Without" card: Red-tinted border, ✕ icons, pain points
- "With" card: Green/blue-tinted border, ✓ icons, solutions
- Pain points: scattered videos, no structure, no quizzes, no progress tracking, learning alone
- Solutions: organized curriculum, sections & lessons, AI-generated quizzes, progress tracking, LiVi AI companion
- Mobile: Stack vertically

**Animations:**
- Cards slide in from left and right respectively (GSAP `ScrollTrigger` + `fromTo x: -50/+50`)
- Each list item staggers in with `blur-fade`

---

### 5. Features Bento Grid

**Design:** Apple-style bento grid layout — 6 feature cards in a visually interesting asymmetric grid. Each card has an icon, title, description, and a mini visual/animation.

**Layout:**
```
┌──────────────────────┬───────────────┐
│                      │               │
│   Course Builder     │  AI Quizzes   │
│   (large, 2 cols)    │  (1 col)      │
│                      │               │
├────────────┬─────────┴───────────────┤
│            │                         │
│  LiVi AI   │   Progress Tracking     │
│  (1 col)   │   (2 cols, wide)        │
│            │                         │
├────────────┴─────────┬───────────────┤
│                      │               │
│   Course Hub         │  Certificates │
│   (2 cols)           │  (1 col)      │
│                      │               │
└──────────────────────┴───────────────┘
```

**Feature Cards:**

| Card                | Size   | Icon              | Mini Visual                                        |
| ------------------- | ------ | ----------------- | -------------------------------------------------- |
| Course Builder      | 2×1    | `Layers`          | Animated section/lesson tree (CSS mockup)           |
| AI Quiz Generation  | 1×1    | `Sparkles`        | Quiz card preview with shimmer effect               |
| LiVi AI Companion   | 1×1    | `MessageCircle`   | Chat bubble animation (typing dots)                 |
| Progress Tracking   | 2×1    | `TrendingUp`      | Mini progress bar filling up animation              |
| Course Hub          | 2×1    | `Globe`           | Scrolling mini course cards (marquee)               |
| Certificates        | 1×1    | `Award`           | Certificate mockup with `border-beam`               |

**Specs:**
- Use `bento-grid` layout (Magic UI) as base structure
- Each card: dark card bg, rounded-2xl, subtle border, overflow-hidden
- Large cards get mini interactive demos inside them
- Hover: card lifts slightly (`translateY(-4px)`), border brightens

**Components:**
- Magic UI: `bento-grid`, `border-beam`, `marquee` (inside Course Hub card)
- Lucide icons

**Animations:**
- Cards stagger in on scroll (GSAP `ScrollTrigger` with `stagger: 0.1`)
- Each card's mini visual plays when card enters viewport
- `blur-fade` entrance per card

---

### 6. AI Showcase — Meet LiVi

**Design:** Full-width dedicated section for the AI assistant. Dark gradient background, large heading, description, and a live-looking chat mockup.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🤖 Meet LiVi — Your AI Study Companion                   │
│                                                             │
│   LiVi helps you learn smarter. Ask questions about         │
│   any lesson, get quiz hints, generate study notes,         │
│   and organize your course — all powered by AI.             │
│                                                             │
│        ┌───────────────────────────────────────┐            │
│        │  ┌──────────────────────────────────┐ │            │
│        │  │ 👤 "Explain this concept simply" │ │            │
│        │  │ 🤖 "Sure! Think of it as..."     │ │            │
│        │  │ 👤 "Generate a quiz on this"     │ │            │
│        │  │ 🤖 "Here are 5 questions..."     │ │            │
│        │  └──────────────────────────────────┘ │            │
│        └───────────────────────────────────────┘            │
│                                                             │
│   Context-aware • Video lessons • Reading notes • Quizzes   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: Subtle purple-to-blue gradient with `particles` (Magic UI) floating
- Headline: `sparkles-text` (Magic UI) — "Meet LiVi"
- Description: What LiVi can do (quiz hints, lesson QA, course organization, study notes)
- Chat mockup: Fake chat window with animated messages appearing one by one (typing animation)
- Below chat: 4 capability pills — "Context-aware", "Video lessons", "Reading notes", "Quizzes"
- Chat mockup wrapped in `shine-border` (Magic UI)

**Animations:**
- Chat messages appear sequentially with `typing-animation` (Magic UI) effect
- Each message slides in from bottom with GSAP stagger
- Particles drift slowly in background
- Capability pills fade in staggered

---

### 7. How It Works — 3 Steps

**Design:** Clean 3-step flow. Each step has a number, title, description, and a visual. Connected by animated beams.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              How It Works                                   │
│              From YouTube to mastery in 3 steps.            │
│                                                             │
│    ①──────────────②──────────────③                          │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │  Import     │ │  Learn     │ │  Achieve   │              │
│  │  Paste any  │ │  Study with│ │  Earn certs│              │
│  │  YouTube URL│ │  AI quizzes│ │  & track   │              │
│  │             │ │  & LiVi    │ │  mastery   │              │
│  │  [mockup]   │ │  [mockup]  │ │  [mockup]  │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Steps:**
1. **Import** — "Paste any YouTube video or playlist URL. LearnerVerse automatically creates a structured course with sections and lessons."
2. **Learn** — "Study at your own pace with AI-generated quizzes, inline LiVi chat, progress tracking, and a Pomodoro timer."
3. **Achieve** — "Earn certificates, build streaks, share your profile, and discover community courses in the Hub."

**Specs:**
- Numbered circles (①②③) connected with `animated-beam` (Magic UI)
- Each step card: icon + title + description + small visual
- Visuals: Tiny `safari` mockup screenshots or illustrative icons
- Mobile: Vertical stack with connecting line

**Animations:**
- Beam animates from step 1→2→3 as user scrolls (GSAP `ScrollTrigger` + Magic UI `animated-beam`)
- Each step card fades in staggered
- Step numbers pulse with `ripple` (Magic UI) effect

---

### 8. Testimonials

**Design:** Infinite horizontal marquee of testimonial cards. Dual rows moving in opposite directions.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│          What Learners & Creators Say                       │
│                                                             │
│  ←←← [Card] [Card] [Card] [Card] [Card] [Card] ←←←        │
│  →→→ [Card] [Card] [Card] [Card] [Card] [Card] →→→        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Section headline + subtext
- Two rows of `marquee` (Magic UI) moving in opposite directions
- Each card: avatar placeholder, name, role (Learner/Creator), quote, star rating
- Cards: rounded-xl, subtle border, dark bg, max-w-[320px]
- 8–10 dummy testimonials for now
- Pause on hover

**Components:**
- Magic UI: `marquee` (with `pauseOnHover`, reverse for second row)

**Animations:**
- Continuous smooth scroll (built-in marquee)
- Section title `blur-fade` on scroll entry

---

### 9. Stats / Impact Section

**Design:** Centered section with large animated number tickers. Impactful, minimal.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│               Built for Serious Learners                    │
│                                                             │
│      500+          50K+          98%           4.9★         │
│    Courses       Quizzes    Completion      Avg Rating      │
│    Created      Generated      Rate                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- 4 stats in a row (responsive: 2×2 on mobile)
- Each: `number-ticker` (Magic UI) for the number + label text below
- Background: subtle grid pattern or clean
- Numbers trigger on scroll into view

**Components:**
- Magic UI: `number-ticker`, `blur-fade`

---

### 10. Final CTA Section

**Design:** Full-width gradient section. Bold headline, compelling subtext, single large CTA button.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░ gradient bg ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                             │
│         Ready to Transform How You Learn?                   │
│                                                             │
│     Start building AI-powered courses from YouTube          │
│     videos — completely free.                               │
│                                                             │
│              [✦ Get Started Now]                             │
│                                                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: Blue→Purple gradient with `animated-grid-pattern` overlay
- Headline: Large, white, bold
- Subtext: muted description
- CTA: `shimmer-button` (Magic UI) — oversized, prominent
- Optional: `ripple` effect behind CTA button

**Animations:**
- Headline + subtext `blur-fade` in
- Button pulses gently with shimmer
- Grid pattern animates

---

### 11. Footer

**Design:** Clean, minimal, dark. Logo, links, social icons, copyright.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔵 LearnerVerse        Product      Resources    Connect   │
│                          Features     Docs         GitHub    │
│  Turn YouTube into       Pricing      Blog         Twitter   │
│  learning.               Hub          Support      Discord   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  © 2026 LearnerVerse. All rights reserved.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- 4-column grid: Brand, Product, Resources, Connect
- Brand column: logo + tagline
- Links are dummy/placeholder for now (no actual pages behind them)
- Bottom: copyright + optional "Made with ♥"
- Mobile: stack columns vertically

---

## Dependencies to Install

| Package               | Purpose                            | Install Command                                    |
| --------------------- | ---------------------------------- | -------------------------------------------------- |
| `gsap`                | Scroll animations, timeline, parallax | `npm i gsap`                                    |
| `@gsap/react`         | React integration for GSAP          | `npm i @gsap/react`                               |
| Magic UI components   | Pre-built animated UI Components    | `npx shadcn@latest add "<magicui registry url>"`   |

### Magic UI Components to Install

```bash
# Text & Typography
npx shadcn@latest add "https://magicui.design/r/animated-shiny-text"
npx shadcn@latest add "https://magicui.design/r/word-rotate"
npx shadcn@latest add "https://magicui.design/r/sparkles-text"
npx shadcn@latest add "https://magicui.design/r/typing-animation"
npx shadcn@latest add "https://magicui.design/r/number-ticker"
npx shadcn@latest add "https://magicui.design/r/text-animate"

# Layout & Cards
npx shadcn@latest add "https://magicui.design/r/bento-grid"
npx shadcn@latest add "https://magicui.design/r/magic-card"
npx shadcn@latest add "https://magicui.design/r/safari"
npx shadcn@latest add "https://magicui.design/r/marquee"

# Effects & Backgrounds
npx shadcn@latest add "https://magicui.design/r/animated-grid-pattern"
npx shadcn@latest add "https://magicui.design/r/particles"
npx shadcn@latest add "https://magicui.design/r/shimmer-button"
npx shadcn@latest add "https://magicui.design/r/border-beam"
npx shadcn@latest add "https://magicui.design/r/shine-border"
npx shadcn@latest add "https://magicui.design/r/animated-beam"
npx shadcn@latest add "https://magicui.design/r/ripple"
npx shadcn@latest add "https://magicui.design/r/blur-fade"
```

---

## 10-Phase Implementation Plan

### Phase 1 — Foundation & Routing
**Goal:** Set up the homepage route, layout shell, and install dependencies.

- [ ] Install `gsap` + `@gsap/react` in frontend
- [ ] Install all Magic UI components listed above
- [ ] Create `/home` route in `router.tsx` (public, no auth required)
- [ ] Update root `/` to render `HomePage` for unauthenticated users (keep redirect for authenticated)
- [ ] Create `src/pages/HomePage.tsx` — empty shell with section placeholders
- [ ] Create `src/components/home/` directory for all landing page components

### Phase 2 — Navbar
**Goal:** Sticky glassmorphic navbar with responsive mobile menu.

- [ ] Create `src/components/home/HomeNavbar.tsx`
- [ ] Logo + wordmark (left), nav links (center), Dashboard CTA (right)
- [ ] Glassmorphic transition on scroll using GSAP `ScrollTrigger`
- [ ] Mobile hamburger → `Sheet` slide-in menu
- [ ] Smooth scroll to section anchors (`#features`, `#how-it-works`, etc.)
- [ ] Auth-aware: "Dashboard" vs "Sign Up / Log In" based on auth state

### Phase 3 — Hero Section
**Goal:** The first impression — headline, CTAs, browser mockup.

- [ ] Create `src/components/home/HeroSection.tsx`
- [ ] `animated-grid-pattern` background + radial gradient overlay
- [ ] `animated-shiny-text` badge — "✨ AI-Powered Learning Platform"
- [ ] Large headline with `word-rotate` — cycling key phrases
- [ ] Subtext + two CTA buttons (`shimmer-button` primary, outline secondary)
- [ ] `safari` browser mockup with dashboard screenshot + `border-beam`
- [ ] GSAP staggered entrance timeline (badge → headline → subtext → buttons → mockup)
- [ ] Mouse-move parallax on browser mockup (GSAP `quickTo`)
- [ ] Take a screenshot of the app dashboard for the mockup image

### Phase 4 — Social Proof Bar
**Goal:** Animated stats ticker section.

- [ ] Create `src/components/home/SocialProofBar.tsx`
- [ ] 4 stat items with `number-ticker` (Magic UI)
- [ ] GSAP `ScrollTrigger` — trigger count-up when section enters viewport
- [ ] `blur-fade` entrance animation
- [ ] Responsive: horizontal on desktop, 2×2 grid on mobile

### Phase 5 — Problem → Solution
**Goal:** Contrast section showing pain points vs LearnerVerse.

- [ ] Create `src/components/home/ProblemSolution.tsx`
- [ ] Section headline + description
- [ ] Two `magic-card` side by side
- [ ] "Without LV" card (red accent, ✕ icons, pain points list)
- [ ] "With LV" card (blue/green accent, ✓ icons, solutions list)
- [ ] GSAP slide-in from opposite sides on scroll
- [ ] Staggered list item animation with `blur-fade`
- [ ] Responsive: stack on mobile

### Phase 6 — Features Bento Grid
**Goal:** Showcase 6 core features in a visual bento layout.

- [ ] Create `src/components/home/FeaturesBento.tsx`
- [ ] `bento-grid` layout (Magic UI) — 6 cards, asymmetric sizes
- [ ] Each card: Lucide icon, title, description, mini visual
- [ ] Card 1 (Course Builder): CSS mockup of section/lesson tree
- [ ] Card 2 (AI Quizzes): Quiz card with shimmer
- [ ] Card 3 (LiVi AI): Chat bubble with typing dots animation
- [ ] Card 4 (Progress): Animated progress bar filling
- [ ] Card 5 (Course Hub): `marquee` of mini course cards
- [ ] Card 6 (Certificates): Certificate mockup with `border-beam`
- [ ] GSAP stagger on scroll, hover lift effect

### Phase 7 — AI Showcase (LiVi)
**Goal:** Dedicated AI assistant feature section.

- [ ] Create `src/components/home/AIShowcase.tsx`
- [ ] Purple-blue gradient background with `particles` (Magic UI)
- [ ] `sparkles-text` headline — "Meet LiVi"
- [ ] Description of LiVi capabilities
- [ ] Fake chat window mockup with sequential message reveal
- [ ] Messages appear with `typing-animation` + GSAP stagger
- [ ] Chat window wrapped in `shine-border`
- [ ] 4 capability pills below (context-aware, video, reading, quizzes)
- [ ] `blur-fade` on all elements

### Phase 8 — How It Works + Testimonials
**Goal:** 3-step flow and social proof marquee.

- [ ] Create `src/components/home/HowItWorks.tsx`
  - 3 step cards connected by `animated-beam`
  - Each: number circle + icon + title + description
  - `ripple` on step numbers
  - GSAP stagger + beam animation on scroll
  - Responsive: vertical flow on mobile
- [ ] Create `src/components/home/Testimonials.tsx`
  - Two-row `marquee` (opposite directions, pauseOnHover)
  - 10 dummy testimonial cards (avatar, name, role, quote, stars)
  - `blur-fade` section entrance

### Phase 9 — Stats + CTA + Footer
**Goal:** Impact numbers, final conversion, and footer.

- [ ] Create `src/components/home/StatsSection.tsx`
  - 4 large `number-ticker` stats in a row
  - Triggered on scroll
  - Responsive: 2×2 on mobile
- [ ] Create `src/components/home/CTASection.tsx`
  - Full-width gradient bg + `animated-grid-pattern`
  - Bold headline + subtext
  - Large `shimmer-button` CTA
  - `ripple` behind button
- [ ] Create `src/components/home/Footer.tsx`
  - 4-column grid: Brand, Product, Resources, Connect
  - Logo + tagline in brand column
  - Placeholder links
  - Copyright line
  - Responsive: stacked on mobile

### Phase 10 — Polish & Responsiveness
**Goal:** Final QA, performance optimization, edge cases.

- [ ] Test all breakpoints: 320px, 375px, 768px, 1024px, 1280px, 1440px
- [ ] Ensure all animations respect `prefers-reduced-motion`
- [ ] Add `scroll-progress` indicator (Magic UI) at page top
- [ ] Test light & dark mode — ensure consistent theming
- [ ] Performance: lazy-load below-fold sections, optimize images
- [ ] Verify auth flow: unauthenticated → home, authenticated → dashboard
- [ ] Tab focus / keyboard navigation for accessibility
- [ ] Test mobile hamburger menu
- [ ] Smooth scroll behavior for all anchor links
- [ ] Final GSAP cleanup — kill ScrollTriggers on unmount

---

## File Structure (Final)

```
src/
├── pages/
│   ├── HomePage.tsx              ← main landing page (assembles all sections)
│
├── components/
│   ├── home/
│   │   ├── HomeNavbar.tsx        ← sticky glass nav
│   │   ├── HeroSection.tsx       ← hero with mockup
│   │   ├── SocialProofBar.tsx    ← stats ticker
│   │   ├── ProblemSolution.tsx   ← before/after comparison
│   │   ├── FeaturesBento.tsx     ← bento grid features
│   │   ├── AIShowcase.tsx        ← LiVi AI section
│   │   ├── HowItWorks.tsx        ← 3-step flow
│   │   ├── Testimonials.tsx      ← marquee testimonials
│   │   ├── StatsSection.tsx      ← impact numbers
│   │   ├── CTASection.tsx        ← final conversion
│   │   └── Footer.tsx            ← page footer
```

---

## Design Tokens (Landing Page Specific)

```css
/* Landing page extends the existing design system */
--home-bg: #000000;                    /* Pure black hero bg */
--home-card-bg: rgba(255,255,255,0.03); /* Ultra-subtle card bg */
--home-card-border: rgba(255,255,255,0.08);
--home-gradient-start: #3b82f6;        /* Blue */
--home-gradient-end: #a855f7;          /* Purple */
--home-text-hero: #ffffff;
--home-text-muted: #94a3b8;
--home-glass-bg: rgba(0,0,0,0.6);
--home-glass-border: rgba(255,255,255,0.1);
```

> **Note:** The landing page uses a dark-first design regardless of the app's theme setting. The user's theme preference only kicks in AFTER they enter the dashboard.

---

## Responsive Breakpoints Strategy

| Breakpoint | Layout Changes                                    |
| ---------- | ------------------------------------------------- |
| `< 640px`  | Single column, stacked sections, hamburger menu    |
| `640–768px`| 2-col grids, smaller headings                      |
| `768–1024px`| Bento 2-col, side-by-side cards                   |
| `1024px+`  | Full layout, 3-col bento, all animations active    |
| `1440px+`  | Max-width container (1280px), centered              |

---

## Key Interactions

| Interaction              | Behavior                                              |
| ------------------------ | ----------------------------------------------------- |
| Nav link click           | Smooth scroll to section with offset for sticky nav    |
| "Get Started" click      | Navigate to `/login` (or `/` if authenticated)         |
| "See How It Works" click | Smooth scroll to How It Works section                  |
| Browser mockup hover     | Subtle scale + glow                                    |
| Feature card hover       | Lift + border brighten                                 |
| Testimonial card hover   | Marquee pauses                                         |
| Mobile hamburger         | Sheet slides in from right                             |
| Scroll progress          | Thin gradient bar at very top of page                  |

---

## Screenshot / Mockup Assets Needed

| Asset                  | Source                            | Location                  |
| ---------------------- | --------------------------------- | ------------------------- |
| Dashboard screenshot   | Screenshot of creator dashboard   | `public/home/dashboard.png` |
| App logo               | Already exists                    | `public/logo.svg`           |
| Testimonial avatars    | Placeholder / generated           | Inline SVG or initials      |

---

**Ready to implement. Each phase is self-contained and can be built + verified independently. Start with Phase 1 when ready.**
