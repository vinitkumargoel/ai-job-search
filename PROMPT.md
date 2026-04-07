# AI Job Search Dashboard — Full Build Prompt

## Project Overview

Build a full-stack **AI-powered Job Search Dashboard** using the existing Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + MongoDB stack. The app is a personal productivity tool for a single user to manage job scraping across multiple websites, match jobs against uploaded resumes using Ollama, and track application status — all from one clean dashboard.

---

## Authentication

- Single-user login with **username and password stored in environment variables** (`AUTH_USERNAME`, `AUTH_PASSWORD`).
- On login, issue a **JWT token** stored in an `httpOnly` cookie (env var: `JWT_SECRET`).
- All pages and API routes (except `/login`) are protected — redirect unauthenticated users to `/login`.
- No registration page. No user management UI. Credentials come only from `.env`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | MongoDB (via Mongoose) |
| AI / LLM | Ollama (local, OpenAI-compatible API) |
| Scheduling | `node-cron` (running inside a Next.js API route or a lightweight background worker) |
| Resume Parsing | `pdf-parse` (extract raw text from uploaded PDFs) |
| Scraping | Custom per-site strategy files (see Scraper Architecture below) |

---

## Scraper Architecture (Strategy Pattern)

Each job site has its own dedicated scraper file located in `src/scrapers/`. The filename is the site's key (e.g. `amazon.ts`, `linkedin.ts`, `naukri.ts`).

### Scraper Interface

```typescript
// src/scrapers/types.ts

export interface ScrapedJob {
  title: string;
  url: string;               // unique job listing URL
  description: string;       // full job description text
  company: string;
  location: string;
  postedAt?: string;         // raw date string from site if available
}

export interface ScraperStrategy {
  name: string;              // must match the site key
  scrape: (siteConfig: SiteConfig) => Promise<ScrapedJob[]>;
}

export interface SiteConfig {
  url: string;               // base URL or search URL the user configured
  keywords?: string;         // optional job search keywords
}
```

### Scraper Registry

```typescript
// src/scrapers/index.ts
// Dynamically import and register all scrapers here.
// When a new scraper file is added, register it in this map.

import { AmazonScraper } from './amazon';

export const scraperRegistry: Record<string, ScraperStrategy> = {
  amazon: AmazonScraper,
  // add more as needed
};
```

### Example Scraper

```typescript
// src/scrapers/amazon.ts
export const AmazonScraper: ScraperStrategy = {
  name: 'amazon',
  scrape: async (config) => {
    // Implement Playwright or fetch-based scraping logic here.
    // Return an array of ScrapedJob objects.
    return [];
  },
};
```

> The user adds a "site" from the dashboard UI (e.g. name: "Amazon", scraperKey: "amazon", URL, cron schedule). The backend looks up `scraperRegistry["amazon"]` and runs it.

---

## MongoDB Data Models

### Site
```typescript
{
  _id: ObjectId,
  name: string,              // display name e.g. "Amazon Jobs"
  scraperKey: string,        // must match a key in scraperRegistry
  url: string,               // target URL for scraping
  keywords: string,          // optional search keywords
  cronSchedule: string,      // cron expression e.g. "0 9 * * *"
  isActive: boolean,
  lastRunAt: Date | null,
  nextRunAt: Date | null,
  lastRunStatus: "success" | "failed" | "never",
  createdAt: Date,
}
```

### Job
```typescript
{
  _id: ObjectId,
  siteId: ObjectId,          // ref to Site
  title: string,
  url: string,               // unique — used for deduplication
  description: string,
  company: string,
  location: string,
  postedAt: string,
  status: "new" | "applied" | "saved" | "rejected",
  isNew: boolean,            // true until user visits the Jobs tab after this job was found
  matchScore: number | null, // 0–100, set by Ollama after matching
  matchReason: string | null,// short explanation from Ollama
  matchedResumeId: ObjectId | null,
  scrapedAt: Date,
  appliedAt: Date | null,
}
```

### Resume
```typescript
{
  _id: ObjectId,
  name: string,              // user-given label e.g. "Frontend Resume"
  filename: string,
  contentText: string,       // extracted plain text from PDF
  isActive: boolean,         // only ONE resume is active at a time for AI matching
  uploadedAt: Date,
}
```

---

## Pages & UI

### 1. `/login`
- Simple centered card with username + password fields.
- On success, set JWT cookie and redirect to `/dashboard`.

---

### 2. `/dashboard`
Main overview page. Show:
- Total sites configured
- Total jobs found (all time)
- New jobs (unseen, `isNew: true`)
- Applied jobs count
- Last cron run time per site (summary table)
- A quick "Run All Now" button to manually trigger all active scrapers immediately

---

### 3. `/sites`
Manage job sites.

- **List view**: table of all sites with columns: Name, Scraper Key, URL, Schedule, Last Run, Status, Active toggle, Actions (Edit / Delete / Run Now).
- **Add Site modal/form**:
  - Site Name
  - Scraper Key (dropdown populated from `scraperRegistry` keys)
  - Target URL
  - Keywords (optional)
  - Cron Schedule (text input with a helper showing next 3 run times preview)
  - Active toggle
- **Run Now** button per site — triggers that site's scraper immediately and shows a loading state.
- After each run, show a toast: "Found X new jobs on [Site Name]".

---

### 4. `/jobs`
View all scraped jobs in one place.

- **Tabs at top**: `New` | `All` | `Applied` | `Saved` | `Rejected`
- **Filters**: by site, by match score range, by location keyword
- **Job Card** shows:
  - Job title, company, location
  - Site badge
  - Match score badge (color-coded: green ≥70, yellow 40–69, red <40, gray if not matched yet)
  - Match reason (expandable tooltip or collapsible section)
  - "New" badge if `isNew: true`
  - Status action buttons: **Mark Applied** / **Save** / **Reject**
  - **Visit Job** button (opens URL in new tab)
- When the user lands on the `New` tab, all visible jobs get `isNew: false` (mark as seen).
- Moving a job to Applied sets `appliedAt` timestamp.

---

### 5. `/resumes`
Manage uploaded resumes.

- **List** of uploaded resumes: name, upload date, active badge, extracted text preview (first 300 chars).
- **Upload Resume** button:
  - Accept PDF only.
  - Ask for a label name.
  - Extract text on upload using `pdf-parse`.
  - Save to MongoDB.
- **Set Active** button — only one resume can be active at a time. The active resume is used for all future AI matching runs.
- **Delete** resume (cannot delete the active one).

---

### 6. `/cron`
View and manage cron schedules.

- Table of all active sites with their cron expression, last run time, next run time, and last run status.
- Toggle a site's active state from here.
- "Run Now" per site.
- Show a live log panel (last 20 log entries) — stored in MongoDB or in-memory — showing entries like:
  ```
  [2026-04-07 09:00:01] amazon    → Started scrape
  [2026-04-07 09:00:04] amazon    → Found 12 jobs, 3 new
  [2026-04-07 09:00:05] amazon    → AI matching complete (3 jobs scored)
  ```

---

## Cron Job Engine

- Use `node-cron` to register a cron job for each active site when the server starts.
- When a site's cron fires:
  1. Look up the site config from MongoDB.
  2. Find the scraper from `scraperRegistry[site.scraperKey]`.
  3. Run `scraper.scrape(siteConfig)` — returns `ScrapedJob[]`.
  4. **Deduplicate**: for each job, check if `job.url` already exists in the `Job` collection. Skip if it does.
  5. **Save new jobs** to MongoDB with `status: "new"`, `isNew: true`.
  6. **AI Matching**: for each new job, call Ollama to match against the active resume (see AI Matching below).
  7. Update `site.lastRunAt`, `site.nextRunAt`, `site.lastRunStatus`.
  8. Log the run result.

- When a site is added or its schedule is changed, the cron engine must **re-register** cron jobs dynamically without restarting the server.

---

## AI Matching with Ollama

### Config
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### Prompt Template

For each new job, send to Ollama:

```
You are a career assistant. Given a resume and a job description, evaluate how well the candidate matches the job.

RESUME:
{resumeContentText}

JOB TITLE: {jobTitle}
COMPANY: {jobCompany}
JOB DESCRIPTION:
{jobDescription}

Respond ONLY in valid JSON with this exact structure:
{
  "score": <number 0 to 100>,
  "reason": "<one or two sentence explanation>"
}
```

### Behavior
- Run matching **asynchronously after scraping** — do not block the scrape from completing.
- If Ollama is unavailable, save the job with `matchScore: null` and retry later (or on demand).
- Store the result in `job.matchScore` and `job.matchReason`.
- Add a **"Re-match" button** on individual job cards (and a bulk "Re-match All Unmatched" button on `/jobs`) to trigger matching on demand.

---

## API Routes

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/sites
POST   /api/sites
PUT    /api/sites/[id]
DELETE /api/sites/[id]
POST   /api/sites/[id]/run       ← trigger scrape immediately

GET    /api/jobs
PUT    /api/jobs/[id]            ← update status (applied/saved/rejected)
POST   /api/jobs/[id]/match      ← trigger AI match for one job
POST   /api/jobs/match-all       ← trigger AI match for all unmatched jobs

GET    /api/resumes
POST   /api/resumes              ← upload + parse PDF
PUT    /api/resumes/[id]/activate
DELETE /api/resumes/[id]

GET    /api/cron/logs
GET    /api/dashboard/stats
```

---

## Environment Variables

```env
# Auth
AUTH_USERNAME=admin
AUTH_PASSWORD=yourpassword
JWT_SECRET=your_jwt_secret_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-job-search

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

---

## UI / Design Guidelines

- Use **ZoomInfo brand palette** where appropriate: navy (`#202B52`) for sidebar/header, red (`#EA1815`) for primary CTAs, white cards with subtle shadows.
- Font: **Figtree** (Google Fonts).
- Sidebar navigation with links to: Dashboard, Sites, Jobs, Resumes, Cron.
- Show a **badge with count** on the "Jobs" nav item indicating unseen new jobs.
- Dark mode support.
- Toast notifications for all async actions (run started, jobs found, match complete, errors).
- Responsive layout (mobile-friendly sidebar collapses to bottom nav or hamburger).

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar layout, auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── sites/page.tsx
│   │   ├── jobs/page.tsx
│   │   ├── resumes/page.tsx
│   │   └── cron/page.tsx
│   └── api/
│       ├── auth/
│       ├── sites/
│       ├── jobs/
│       ├── resumes/
│       ├── cron/
│       └── dashboard/
├── scrapers/
│   ├── types.ts
│   ├── index.ts                ← registry
│   └── amazon.ts               ← example scraper
├── lib/
│   ├── mongodb.ts              ← connection singleton
│   ├── auth.ts                 ← JWT helpers
│   ├── ollama.ts               ← Ollama API client
│   ├── cronEngine.ts           ← node-cron manager
│   └── pdfParser.ts            ← pdf-parse wrapper
├── models/
│   ├── Site.ts
│   ├── Job.ts
│   └── Resume.ts
└── components/
    ├── ui/                     ← reusable primitives
    ├── JobCard.tsx
    ├── SiteForm.tsx
    ├── ResumeUploader.tsx
    └── CronLogPanel.tsx
```

---

## Build Order (Suggested)

1. MongoDB connection + all 3 Mongoose models
2. Auth system (login page + JWT middleware)
3. Sidebar layout + route stubs
4. Scraper architecture (types + registry + one working example scraper)
5. Sites CRUD + cron engine with `node-cron`
6. Job deduplication + save pipeline
7. Resume upload + PDF text extraction
8. Ollama matching integration
9. Jobs page with tabs + status actions
10. Dashboard stats page
11. Cron logs page
12. Polish: toasts, badges, loading states, dark mode
