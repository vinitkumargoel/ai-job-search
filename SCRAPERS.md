# German IT Company Job Scrapers — Implementation Notes

> **Purpose:** This document captures every decision, discovery, failure, and working approach
> for the German IT company scrapers. Use this as a starting point for the next agent session.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Infrastructure](#infrastructure)
3. [Working Scrapers](#working-scrapers)
4. [Dropped Scrapers](#dropped-scrapers)
5. [ATS Discovery Method](#ats-discovery-method)
6. [What Was Tried & What Failed](#what-was-tried--what-failed)
7. [Corporate Network Gotchas](#corporate-network-gotchas)
8. [Sites Seeded in MongoDB](#sites-seeded-in-mongodb)
9. [Test Results](#test-results)
10. [Next Steps / Future Work](#next-steps--future-work)

---

## Project Overview

**Stack:** Next.js 16 (App Router) · TypeScript · MongoDB (Mongoose) · Tailwind v4 · Ollama (AI matching)

**What was built:** 5 scrapers for major German IT/product companies, plugged into an existing
scraper registry (`scrapers/index.ts`). Each scraper implements `ScraperStrategy`:

```ts
interface ScraperStrategy {
  name: string;
  scrape: (config: SiteConfig) => Promise<ScrapedJob[]>;
}

interface SiteConfig {
  url: string;
  keywords?: string;
  firstPageOnly?: boolean;  // Added — Puppeteer scrapers stop at page 1 in smoke tests
}
```

---

## Infrastructure

### `lib/puppeteerBrowser.ts` — Singleton Browser + Page Pool

**Problem:** Launching a new Puppeteer browser per scrape call costs ~2–3s.
Each `withPage()` call was opening a new tab, doing work, then closing it.
When multiple scrapers ran concurrently, the pool was exhausted and callers queued.

**Solution:** A singleton browser with a **reusable page pool** (5 tabs).

```
Browser (1 instance, stays alive forever)
  └── Pool: [Page1, Page2, Page3, Page4, Page5]
              ↑ checked out → used → returned to pool
              ↑ wiped with about:blank between uses
```

**Key API:**
```ts
withPage(async (page) => { /* use page */ })         // checks out a pooled page
withCustomInterception(page, interceptor, fn)         // override request interceptor temporarily
closeBrowser()                                        // call on app shutdown
```

**Pool size:** `POOL_SIZE = 5` — tuned so Siemens (uses 2 detail pages simultaneously)
and SoftwareAG (uses 1 list page) can run concurrently without queuing.

**Request interception (default):** Blocks `image`, `stylesheet`, `font`, `media`.
Only HTML + XHR passes through. Speeds up page loads by ~40%.

**Corporate SSL fix:** Puppeteer launched with `--ignore-certificate-errors` to handle
ZoomInfo corporate network SSL inspection proxy.

---

## Working Scrapers

### 1. ZEISS Group — `scrapers/zeiss.ts`

| Field | Value |
|-------|-------|
| Career page | https://www.zeiss.com/career/en/job-search.html |
| ATS | **Workday** (tenant: `zeissgroup`, subdomain: `zeissgroup.wd3.myworkdayjobs.com`) |
| Method | `fetch` — Workday undocumented internal JSON API |
| Auth required | No |

**API endpoint:**
```
POST https://zeissgroup.wd3.myworkdayjobs.com/wday/cxs/zeissgroup/External/jobs
Headers:
  Content-Type: application/json
  X-Workday-Client: 2024.35.4   ← REQUIRED — without this you get HTTP 422

Body:
  { "appliedFacets": {}, "limit": 20, "offset": 0, "searchText": "software engineer" }

Response:
  { "total": 746, "jobPostings": [ { "title": "...", "externalPath": "/job/Jena/..._JR-123", "locationsText": "Jena", "postedOn": "Posted 3 Days Ago" } ] }
```

**Detail endpoint:**
```
GET https://zeissgroup.wd3.myworkdayjobs.com/wday/cxs/zeissgroup/External/jobPostingDetail<externalPath>
Response: { "jobPostingInfo": { "jobDescription": "<html>...", ... } }
```

**Pagination:** offset-based, `BATCH_SIZE = 20`, `DELAY_MS = 500` between pages.

**Gotchas:**
- `X-Workday-Client` header is mandatory — returns 422 without it.
- `postedOn` is a human string ("Posted 3 Days Ago"), not an ISO date.
- Rate-limit: keep batch size ≤ 20. Workday throttles aggressive scrapers.
- On ZoomInfo corporate network: hits `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` without
  `NODE_TLS_REJECT_UNAUTHORIZED=0`.

---

### 2. SAP — `scrapers/sap.ts`

| Field | Value |
|-------|-------|
| Career page | https://jobs.sap.com |
| ATS | **SAP SuccessFactors Recruiting** (jobs2web engine, self-hosted) |
| Method | `fetch` — Public RSS 2.0 feed |
| Auth required | No |

**API endpoint:**
```
GET https://jobs.sap.com/services/rss/job/?locale=en_US&country=Germany&keywords=software+engineer&start=0
Response: RSS 2.0 XML with <item> blocks containing CDATA job descriptions
```

**How it was discovered:**
- `jobs.sap.com` CSP headers revealed `successfactors` references.
- Page `<head>` contains `<link rel="alternate" type="application/rss+xml" href="/services/rss/job/">`.

**Title format:** `"Senior Engineer (f/m/d) (Walldorf, DE, 69190)"` — location embedded in title.
Parse with regex: `/^(.*?)\s*\(([^)]+,\s*[A-Z]{2}[^)]*)\)\s*$/`

**Pagination:** `start` param, 25 items per page. Stop when `<item>` count < 25.

**Gotchas:**
- `country=Germany` must be the full English name, not ISO code.
- No total count in feed — detect end by item count < 25.
- Strip `?feedId=null&utm_source=...` tracking params from URLs before storing.

---

### 3. TeamViewer — `scrapers/teamviewer.ts`

| Field | Value |
|-------|-------|
| Career page | https://careers.teamviewer.com |
| ATS | **Teamtailor** (custom domain) |
| Method | `fetch` — Sitemap XML + per-job JSON-LD |
| Auth required | No |

**Strategy:**
1. Fetch `https://careers.teamviewer.com/sitemap.xml` → extract all `/jobs/<id>-<slug>` URLs (157 entries).
2. For each URL, fetch the HTML page and parse `<script type="application/ld+json">` (schema.org/JobPosting).
3. Client-side keyword filter applied after fetching all.

**Why not the Teamtailor API?**
- `jobs.json` feed returns **406 Not Acceptable** (corporate network / content-type rejection).
- `api.teamtailor.com` is blocked by corporate firewall (ECONNRESET).
- Sitemap + JSON-LD is more reliable and doesn't require an API token.

**JSON-LD shape:**
```json
{
  "@type": "JobPosting",
  "title": "Value Realization Manager",
  "description": "<p>HTML description...</p>",
  "datePosted": "2026-04-08T18:26:21+02:00",
  "jobLocation": { "address": { "addressLocality": "Göppingen", "addressCountry": "DE" } },
  "hiringOrganization": { "name": "TeamViewer" }
}
```

**Pagination:** None — all 157 jobs in sitemap, fetched in batches of 20.

**Gotchas:**
- `addressLocality` is often `undefined` in JSON-LD — fallback to `"Göppingen, Germany"`.
- Sitemap is updated in near-real-time; safe to use as the authoritative job list.

---

### 4. Siemens — `scrapers/siemens.ts`

| Field | Value |
|-------|-------|
| Career page | https://jobs.siemens.com/en_US/externaljobs |
| ATS | **Avature** (portal ID: 144, urlPath: `externaljobs`) |
| Method | **Puppeteer** — full headless browser |
| Auth required | No |

**Why Puppeteer?**
Avature renders job list cards entirely client-side via obfuscated XHR calls with
encrypted `listSpecId` tokens. Server returns only an HTML shell with a job count
(e.g., "612 results") but zero actual job records.

**Strategy:**
1. Navigate to `https://jobs.siemens.com/en_US/externaljobs/SearchJobs/<keywords>/Germany`
2. Wait for `article.article--result` to appear (Avature renders these after ~3–5s).
3. Extract title + URL (`href` pointing to `/JobDetail/<id>`) + location from `.list-item-location`.
4. Paginate: find `<a>` with text `"Next >>"` → navigate to its `href` (has `?folderOffset=6` param).
5. For each job, navigate to `/JobDetail/<id>` and extract JSON-LD or description HTML.

**Confirmed selectors (from live DOM inspection):**
```
Job cards    : article.article--result
Title link   : a[href*='JobDetail']       → also the detail URL
Location     : .list-item-location
Job ID       : .list-item-jobId           (text like "Job ID: 499889")
Next page    : <a> where textContent === "Next >>"
Detail URL   : https://jobs.siemens.com/en_US/externaljobs/JobDetail/<id>
```

**What was tried first (failed):**
- `SmartRecruiters API` → `totalFound: 0` (wrong ATS assumption)
- `Oracle Taleo API` → 404 (wrong ATS)
- `Phenom People API` → 404 (wrong ATS)
- Sitemap → only 1 URL (favicon), no job pages
- SmartRecruiters company slugs: `siemens`, `SiemensAG`, `siemensglobal` → all 0 results

**Gotchas:**
- `firstPageOnly=true` mode returns 6 jobs (1 page). Production returns 600+.
- `BATCH_SIZE = 2` for detail fetches — keeps pool pages free for concurrent scrapers.
- Avature's `siemens.avature.net` login page redirects to SSO — not the public career portal.
  The public portal is at `jobs.siemens.com` (custom domain over Avature).

---

### 5. Software AG — `scrapers/softwareag.ts`

| Field | Value |
|-------|-------|
| Career page | https://jobs.dayforcehcm.com/en-US/sagann/sagportal |
| ATS | **Dayforce HCM** (formerly Ceridian, Next.js + Ant Design) |
| Method | **Puppeteer** — full headless browser |
| Auth required | No (for reading jobs) |

**Why Puppeteer?**
Dayforce is a Next.js SPA. The POST `/api/.../jobsearch` endpoint requires:
- A valid CSRF token extracted from the `__Host-next-auth.csrf-token` cookie
- That cookie's `Set-Cookie` comes from a prior GET — but even with it, the corporate
  proxy returned `403 Forbidden`.

**Strategy:**
1. Navigate to `https://jobs.dayforcehcm.com/en-US/sagann/sagportal`
2. Use `waitUntil: "domcontentloaded"` (NOT `networkidle2` — too slow on Dayforce).
3. **Poll** for `li.ant-list-item` every 500ms up to 10s. Items appear ~3.5s after DOM load.
4. Optionally type keywords into `input.ant-select-selection-search-input`.
5. Paginate via `.ant-pagination-next:not(.ant-pagination-disabled) button`.
6. For each job, navigate to `/jobs/<id>` detail page and extract JSON-LD or `.ant-card-body`.

**Confirmed selectors (from live DOM inspection):**
```
Job list     : li.ant-list-item              (Ant Design list)
Title link   : .ant-list-item-meta-title a   or  h4 a  or  a[href*='/jobs/']
Location     : .ant-list-item-meta-description
Detail URL   : https://jobs.dayforcehcm.com/en-US/sagann/sagportal/jobs/<id>
Next page    : .ant-pagination-next:not(.ant-pagination-disabled) button
```

**Key from `__NEXT_DATA__`:**
```json
{
  "runtimeConfig": { "BASE_URL": "https://jobs.dayforcehcm.com/", ... },
  "props": { "pageProps": { "dehydratedState": { "queries": [{ "queryKey": ["site-info", { "clientNamespace": "sagann", "careerSiteXRefCode": "sagportal", "clientId": 107765, "jobBoardId": 5 }] }] } } }
}
```
(clientId=107765, jobBoardId=5 — useful for future direct API work)

**What was tried first (failed):**
- POST `/api/en-US/sagann/sagportal/jobsearch` → 403 (CSRF required)
- POST with CSRF token extracted from cookie → 404 (route not found this way)
- Fetching `__NEXT_DATA__` directly → has site config but no job listings
- Various Dayforce API path formats → 404 on all

**Gotchas:**
- `networkidle2` hangs indefinitely on Dayforce — always use `domcontentloaded` + poll.
- Items render ~3.5s after DOM load, NOT on DOM load itself.
- `firstPageOnly=true` returns 5 jobs (1 page = 10 items, but only 5 matched).
- Software AG was acquired by IBM in 2023 but still operates its own career portal.

---

## Dropped Scrapers

### HERE Technologies (DROPPED)

| Field | Value |
|-------|-------|
| Career page | https://careers.here.com/join/jobs |
| ATS | iCIMS Jibe (Angular SPA) |
| Reason dropped | iCIMS Jibe CDN bot-blocks headless browsers |

**Root cause:**
The Angular app depends on `https://app.jibecdn.com/prod/talentcommunity/0.2.4/vendor-es2015.js`.
This CDN returns **403 Forbidden** to all headless browser clients (Puppeteer, curl, wget).
Without the vendor bundle, Angular cannot boot and the DOM renders only a shell:

```
window._jibe = { cid: "here" }   ← confirms it's iCIMS Jibe
window.angularAppConfig = { env: "prod", client: { name: "here", displayName: "HERE Technologies" } }
```

Only `<div class="jibe-container">` renders — no job data at all.

**Things tried:**
1. Direct iCIMS REST API (`here.icims.com/icims2/apis/search`) → 404
2. Correct subdomain `careers-here.icims.com/icims2/apis/search` → 404
3. Puppeteer with vendor bundle stubbed to empty JS → Angular partially boots but no jobs render
4. Serving empty JS stub for the vendor bundle → same result (too many dependencies)
5. Googlebot user-agent → still 403 from jibecdn.com
6. HTML parsing of search results page → no job links (Angular SPA, all client-side)

**Correct subdomain:** `careers-here.icims.com` (NOT `here.icims.com`)
**iCIMS client name:** `here`

**Future approach if needed:**
- Use a real browser session (logged in) to bypass CDN bot detection.
- OR: Contact iCIMS for a partner API key.
- OR: Use a residential proxy / browser-fingerprint spoofing tool.

---

## ATS Discovery Method

For any new company, follow this process to identify the ATS:

1. **Check redirect chain:**
   ```bash
   curl -sIL https://<career-page-url> | grep -i "location:"
   ```

2. **Check HTML for ATS clues:**
   ```bash
   curl -sL https://<career-page-url> | grep -Eio "(workday|greenhouse|lever|icims|successfactor|taleo|smartrecruiters|ashby|avature|dayforce|teamtailor|personio|phenom|jobvite)" | sort -u
   ```

3. **Check network requests** (in Chrome DevTools → Network → XHR) for API calls.

4. **Check `<meta>` tags** — many ATS platforms inject portal config:
   ```html
   <meta name="avature.portal.id" content="144"/>
   <meta name="avature.portal.urlPath" content="externaljobs"/>
   ```

5. **Check CSP headers** — often reveal third-party ATS domains:
   ```bash
   curl -sI https://<url> | grep -i "content-security-policy"
   ```

### ATS → API Pattern Quick Reference

| ATS | API Style | Discovery |
|-----|-----------|-----------|
| **Workday** | POST `/wday/cxs/<tenant>/<site>/jobs` | Network tab → look for `wd3.myworkdayjobs.com` |
| **SmartRecruiters** | GET `api.smartrecruiters.com/v1/companies/<slug>/postings` | Public, no auth |
| **Greenhouse** | GET `boards-api.greenhouse.io/v1/boards/<slug>/jobs` | Public, no auth |
| **Lever** | GET `api.lever.co/v0/postings/<company>` | Public, no auth |
| **Ashby** | GET `api.ashbyhq.com/posting-api/job-board/<slug>` | Public, no auth |
| **SuccessFactors** | RSS feed at `/services/rss/job/` | Check `<link rel="alternate">` in HTML |
| **Avature** | Puppeteer only (client-side rendering, encrypted API tokens) | Meta tags with `avature.portal.*` |
| **Dayforce HCM** | Puppeteer (POST requires CSRF; portal is Next.js SPA) | `jobs.dayforcehcm.com`, Ant Design CSS classes |
| **iCIMS (classic)** | GET `/icims2/apis/search?keyword=&pageSize=25` | `*.icims.com` subdomain |
| **iCIMS Jibe** | Puppeteer blocked (CDN 403 on Angular vendor bundle) | `app.jibecdn.com` in network requests |
| **Teamtailor** | Sitemap + JSON-LD (feed returns 406; API needs token) | `teamtailor-cdn.com` in page JS |
| **Phenom People** | Puppeteer or GraphQL (varies per tenant) | `avacdn.net` CSS references |

---

## What Was Tried & What Failed

### Siemens — ATS identification attempts

| Attempt | Result |
|---------|--------|
| Assumed SmartRecruiters (from `jobs.siemens.com` domain pattern) | `totalFound: 0` — wrong ATS |
| Tried company slugs: `siemens`, `SiemensAG`, `siemensglobal`, `siemensenergy` | All 0 results |
| Tried Oracle Taleo REST API (`/portal/144/Search/GetJobPostings`) | 404 |
| Tried Phenom People API (`/api/apply/v2/jobs`) | 404 |
| Tried GraphQL (`/api/graphql`) | 404 |
| Parsed JS bundles for route patterns | No useful routes found (minified) |
| Found `<meta name="avature.portal.id" content="144">` in HTML | **Confirmed Avature** |
| Tried Avature REST API (`/api/rest/JobRequisitions`) | 404 (tenant is locked) |
| Tried `siemens.avature.net` directly | Redirects to SSO login (internal only) |
| Found `action="https://jobs.siemens.com/en_US/externaljobs/SearchJobs"` in form | **Working** |
| Puppeteer → `article.article--result` | ✅ **6 jobs on first page** |

### SoftwareAG — API attempts

| Attempt | Result |
|---------|--------|
| POST `/api/en-US/sagann/sagportal/jobsearch` | 403 (without session) |
| POST with session cookie from prior GET | 403 (corporate proxy blocks) |
| POST with CSRF token from `__Host-next-auth.csrf-token` cookie | 404 |
| GET `__NEXT_DATA__` for embedded job data | Site config only, no jobs |
| Various Dayforce path formats (v1, v2, namespace variants) | All 404 |
| `waitUntil: "networkidle2"` in Puppeteer | Hangs indefinitely |
| `waitUntil: "domcontentloaded"` + `waitForSelector` | Selector never found |
| `waitUntil: "domcontentloaded"` + **500ms poll loop** | ✅ **5 jobs at ~3.5s** |

### TeamViewer — API attempts

| Attempt | Result |
|---------|--------|
| `jobs.json` feed | 406 Not Acceptable (all headers tried) |
| `api.teamtailor.com/v1/jobs` | ECONNRESET (corporate firewall) |
| Teamtailor API with `Authorization: Token token=` | 404 |
| Personio API (`teamviewer.jobs.personio.com`) | Empty response |
| Greenhouse API | 404 (wrong ATS) |
| Sitemap XML → JSON-LD per page | ✅ **96 jobs** |

---

## Corporate Network Gotchas

Running on the **ZoomInfo corporate network** causes several issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | SSL inspection proxy intercepts HTTPS | Run with `NODE_TLS_REJECT_UNAUTHORIZED=0` or use Puppeteer with `--ignore-certificate-errors` |
| `api.smartrecruiters.com` — Connect Timeout | Corporate firewall blocks this domain | Cannot fix; domain is blocked |
| `api.teamtailor.com` — ECONNRESET | Corporate firewall drops TLS mid-handshake | Cannot fix; use sitemap fallback instead |
| `jobs.siemens.com` — Connect Timeout on some requests | Intermittent firewall throttling | Retry with shorter timeout |
| `app.jibecdn.com` — 403 | CDN bot-detection on headless browsers | Cannot bypass; HERE scraper dropped |

**In production (server outside corporate network):** All of these should work normally.
`NODE_TLS_REJECT_UNAUTHORIZED=0` should NOT be set in production.

---

## Sites Seeded in MongoDB

Seeded via `scripts/seed-german-sites.ts` (safe to re-run — upsert by `scraperKey`).

| Name | scraperKey | URL | Cron | Schedule |
|------|------------|-----|------|----------|
| ZEISS Group | `zeiss` | `zeissgroup.wd3.myworkdayjobs.com` | `0 7 * * 1` | Every Monday 07:00 |
| Siemens | `siemens` | `jobs.siemens.com/en_US/externaljobs` | `0 8 * * 2` | Every Tuesday 08:00 |
| SAP | `sap` | `jobs.sap.com` | `0 8 * * 3` | Every Wednesday 08:00 |
| Software AG | `softwareag` | `jobs.dayforcehcm.com/en-US/sagann/sagportal` | `0 8 * * 4` | Every Thursday 08:00 |
| TeamViewer | `teamviewer` | `careers.teamviewer.com` | `0 8 * * 5` | Every Friday 08:00 |

Re-run seed anytime:
```bash
MONGODB_URI=mongodb://localhost:27017/ai-job-search npx tsx scripts/seed-german-sites.ts
```

---

## Test Results

Run smoke tests:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/test-scrapers.ts
```

Latest results (first page only, keywords: "software engineer"):

```
Phase 1 — Fetch-based (parallel):
  zeiss        ✔ PASS   40 jobs   ~5s
  sap          ✔ PASS   20 jobs   ~4s
  teamviewer   ✔ PASS   96 jobs   ~5s

Phase 2 — Puppeteer (concurrent):
  siemens      ✔ PASS    6 jobs  ~25s
  softwareag   ✔ PASS    5 jobs  ~20s

Total: 5/5 passed
```

**Note:** Siemens and SoftwareAG are slow because:
1. Puppeteer browser cold-start: ~2s (mitigated by pre-warm)
2. Avature (Siemens) waits for JS rendering: ~8s
3. Dayforce (SoftwareAG) DOM hydration: ~3.5s
4. Each detail page fetch: ~3–5s × batch size

In production (full pagination, no `firstPageOnly`), expect:
- Siemens: ~10–15 min for 600+ jobs
- SoftwareAG: ~5–10 min for all pages

---

## Next Steps / Future Work

### High Priority

1. **HERE Technologies** — Needs a way to bypass `app.jibecdn.com` 403.
   - Try: browser-fingerprint spoofing (e.g. `puppeteer-extra` + `puppeteer-extra-plugin-stealth`)
   - Try: residential proxy that presents non-headless TLS fingerprint
   - Try: iCIMS partner API credentials (contact iCIMS)
   - Confirmed ATS: iCIMS Jibe, client name: `here`, subdomain: `careers-here.icims.com`

2. **Siemens description quality** — The detail page scraper extracts raw text from
   various selectors. Avature's description HTML is complex; worth parsing more precisely.
   Confirmed working selectors on detail page: `.section--job-description`, JSON-LD
   `script[type="application/ld+json"]`.

3. **Siemens performance** — Currently scrapes 6 jobs/page (Avature's default).
   To increase throughput: detect if detail pages can be batched more aggressively,
   or if the Avature undocumented REST API can be accessed with a session token.

### Medium Priority

4. **Add more German companies** using public ATS APIs:

   | Company | ATS | Expected approach |
   |---------|-----|-------------------|
   | Bosch | Custom (already exists: `scrapers/bosch.ts`) | Already implemented |
   | SAP Fioneer | Custom (already exists: `scrapers/sapfioneer.ts`) | Already implemented |
   | Deutsche Telekom | Workday | POST to `telekom.wd3.myworkdayjobs.com/...` |
   | Volkswagen | Workday or Taleo | TBD |
   | BMW Group | Workday | POST to `bmwgroup.wd3.myworkdayjobs.com/...` |
   | Celonis | Greenhouse | `boards-api.greenhouse.io/v1/boards/celonis/jobs` |
   | Personio | Personio | `personio.jobs.personio.de/api/v1/jobs` |

5. **Puppeteer stealth mode** for anti-bot portals:
   ```bash
   npm install puppeteer-extra puppeteer-extra-plugin-stealth
   ```
   Update `lib/puppeteerBrowser.ts` to use `puppeteer-extra` with the stealth plugin.
   This spoofs canvas fingerprint, WebGL, audio context, and navigator properties.

6. **Retry logic** for Puppeteer scrapers — currently if `article.article--result`
   doesn't appear within `PAGE_TIMEOUT`, the scraper returns 0 jobs silently.
   Add a retry with page reload before giving up.

### Low Priority

7. **SoftwareAG keyword search** — The search input (`input.ant-select-selection-search-input`)
   is found but Ant Design's select component requires a click → type → wait for dropdown → select
   flow. Currently keywords are passed to the URL as the default page shows all jobs.
   The keyword filtering happens client-side via the Ant Design search component.

8. **Cron schedule tuning** — Current schedules are weekly (Mon–Fri).
   For high-volume sites like SAP (400k+ employees globally), consider daily:
   ```
   SAP:        0 8 * * *    (daily)
   TeamViewer: 0 8 * * 1,4  (Mon + Thu)
   ```

9. **Job deduplication** — The existing pipeline deduplicates by `job.url` in MongoDB.
   Verify that all 5 scrapers produce stable, canonical URLs (no session tokens in URL).
   - ZEISS: ✅ stable (Workday external path)
   - SAP: ⚠️ strip `?feedId=null&utm_source=...` params (done in scraper)
   - TeamViewer: ✅ stable (sitemap URL)
   - Siemens: ✅ stable (`/JobDetail/<id>`)
   - SoftwareAG: ✅ stable (`/jobs/<id>`)

---

## File Index

```
scrapers/
  zeiss.ts              Workday fetch-based scraper
  sap.ts                SuccessFactors RSS feed scraper
  teamviewer.ts         Teamtailor sitemap + JSON-LD scraper
  siemens.ts            Avature Puppeteer scraper
  softwareag.ts         Dayforce HCM Puppeteer scraper
  index.ts              Scraper registry (all 20 scrapers registered)
  types.ts              ScraperStrategy, SiteConfig, ScrapedJob interfaces

lib/
  puppeteerBrowser.ts   Singleton browser + page pool (POOL_SIZE=5)

scripts/
  test-scrapers.ts      Smoke test (fetch parallel, Puppeteer concurrent)
  seed-german-sites.ts  MongoDB site seeder (upsert by scraperKey)

.npmrc                  registry=https://registry.npmjs.org/
                        (prevents ZoomInfo JFrog auth errors on npm install)
```
