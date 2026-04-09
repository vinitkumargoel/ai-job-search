# AI Job Search — Agent & Coding Rules

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js **16.2.2** (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS **v4** (inline theme via `@theme` in `globals.css` — no `tailwind.config.ts`) |
| Database | MongoDB via Mongoose 9 |
| Auth | JWT with `jose` — HTTP-only cookie named `auth-token` |
| AI / LLM | Ollama (local) — configured via `OLLAMA_BASE_URL` + `OLLAMA_MODEL` |
| Scheduling | `node-cron` 4 via `lib/cronEngine.ts` |
| PDF parsing | `pdf-parse` 2 |
| Drag & drop | `@hello-pangea/dnd` |
| Charts | Recharts 3 |

---

## Next.js — Critical Rules

This is **Next.js 16** with the App Router. Many conventions differ from older versions:

- Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.
- `params` in route handlers and page props is a **Promise** — always `await params` before destructuring.
- Server Components are the default. Add `"use client"` only when you need browser APIs, hooks, or event handlers.
- Route handlers live in `app/api/**/route.ts` and export named functions (`GET`, `POST`, `PUT`, `DELETE`).
- `serverExternalPackages` in `next.config.ts` marks `pdf-parse`, `mongoose`, `node-cron` as server-only — never import these in client components.
- Use `next/link` for internal navigation. Never use `<a>` for internal links.
- No `getServerSideProps`, `getStaticProps`, or `pages/` directory — this is App Router only.

---

## Project Structure

```
app/
├── (auth)/login/          # Login page — no sidebar
├── (dashboard)/           # Protected pages — sidebar + toast layout
│   ├── layout.tsx         # Sidebar + ToastProvider wrapper
│   ├── dashboard/         # Stats overview
│   ├── jobs/              # Job browser + Kanban board
│   ├── sites/             # Scraper site management
│   ├── resumes/           # Resume upload + activation
│   ├── cron/              # Scheduler monitor + logs
│   └── analytics/         # Charts and pipeline stats
├── api/                   # REST API routes
│   ├── auth/              # login / logout
│   ├── jobs/              # CRUD + match + cover-letter
│   ├── sites/             # CRUD + run
│   ├── resumes/           # CRUD + activate
│   ├── dashboard/stats    # Aggregate stats
│   ├── analytics/         # Chart data aggregations
│   └── cron/logs          # Cron log reader
├── globals.css            # Tailwind v4 theme + CSS variables
├── layout.tsx             # Root HTML shell
└── page.tsx               # Redirects to /dashboard

components/
├── ui/
│   ├── Toast.tsx          # Toast context + provider
│   ├── Modal.tsx          # Generic modal overlay
│   └── Badge.tsx          # Pill badges + ScoreBadge
├── Sidebar.tsx            # Responsive sidebar (drawer on mobile)
├── JobCard.tsx            # Job card with notes + cover letter
├── KanbanBoard.tsx        # Drag-and-drop board view
├── SiteForm.tsx           # Add/edit site modal

└── CronLogPanel.tsx       # Terminal-style log viewer

models/                    # Mongoose schemas: Job, Site, Profile, CronLog, Setting, SkippedUrl
lib/
├── mongodb.ts             # Connection caching
├── auth.ts                # JWT sign/verify
├── ollama.ts              # matchJobToResume(), isOllamaAvailable()
├── cronEngine.ts          # node-cron scheduler
└── pdfParser.ts           # PDF text extraction

scrapers/
├── types.ts               # ScraperStrategy, ScrapedJob, SiteConfig interfaces
├── index.ts               # scraperRegistry — maps scraperKey → implementation
└── amazon.ts              # Amazon Jobs JSON API scraper
```

---

## Scraper Architecture

Every job source is a separate file implementing `ScraperStrategy`:

```ts
// scrapers/yoursite.ts
import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

export const YourSiteScraper: ScraperStrategy = {
  name: "yoursite",
  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    // fetch and parse jobs from config.url / config.keywords
    return jobs;
  },
};
```

Then register it in `scrapers/index.ts`:

```ts
import { YourSiteScraper } from "./yoursite";

export const scraperRegistry: Record<string, ScraperStrategy> = {
  amazon: AmazonScraper,
  yoursite: YourSiteScraper,
};
```

The `scraperKey` on a `Site` document determines which scraper runs. The UI dropdown auto-populates from `availableScrapers`. No other changes needed.

---

## Design System

- **Font:** Plus Jakarta Sans (loaded from Google Fonts in `globals.css`)
- **Accent:** Indigo `#4F6AF5` — buttons, active nav, badges, focus rings
- **Background:** `#F3F4F8` page, `#FFFFFF` cards/surfaces
- **Text:** `#0D1117` primary, `#4B5563` secondary, `#6B7280` muted
- **Border:** `#E5E7EB`
- **Status colors:** green `#16A34A` (success/applied), amber `#F59E0B` (saved/warning), red `#E84040` (error/failed), gray `#9CA3AF` (inactive)
- All CSS variables are defined in `globals.css` under `:root` — use them or use Tailwind utility classes that map to them.
- Tailwind v4 uses `@theme inline` in `globals.css` — **no separate config file**.

---

## Responsive Design

- Sidebar is hidden on mobile (`md:hidden` / `hidden md:flex`). Mobile gets a fixed top bar + hamburger drawer.
- Dashboard layout adds `pt-14 md:pt-0` to offset the mobile top bar.
- Page padding: `p-4 md:p-8` — always use both breakpoints.
- Tables must be wrapped in `overflow-x-auto`.
- Kanban board scrolls horizontally on mobile with `min-w-[260px]` per column.

---

## Data Models

**Job** — `status`: `new | applied | saved | rejected` · `matchScore`: 0–100 or null · `notes`: free text · `isNew`: unread flag

**Site** — `scraperKey` maps to registry · `cronSchedule`: cron expression · `isActive`: enables scheduling

**Profile** — single document · `prompt`: free-text system prompt (skills, experience, education, preferences) · `name`, `email`, `phone`, `location`, `linkedIn`, `website`: contact fields used in generated resumes/cover letters

**CronLog** — TTL index auto-expires after 7 days · `level`: `info | error | success`

---

## Environment Variables

```bash
AUTH_USERNAME      # Login username (default: admin)
AUTH_PASSWORD      # Login password (default: changeme123)
JWT_SECRET         # Token signing secret
MONGODB_URI        # MongoDB connection string
OLLAMA_BASE_URL    # Ollama endpoint (default: http://localhost:11434)
OLLAMA_MODEL       # Model name (default: llama3)
```

---

## Key Conventions

- All dashboard pages are `"use client"` — data is fetched client-side via `fetch()` to API routes.
- Toast notifications: `const { toast } = useToast()` → `toast("message", "success" | "error" | "info")`.
- Loading skeletons: `animate-pulse bg-gray-100 rounded-xl` divs with fixed heights.
- Empty states: centered card with an SVG icon, bold title, muted subtitle, optional CTA button.
- Status/badge pills: inline-flex with a colored dot + colored text on a tinted background (e.g. `bg-green-50 text-green-700`).
- Destructive actions (delete, deactivate) use `confirm()` before proceeding.
- API errors return `{ error: string }` with an appropriate HTTP status code.
