/**
 * Siemens Job Scraper
 *
 * Career Page : https://jobs.siemens.com/en_US/externaljobs
 * ATS         : Avature (portal ID 144, urlPath: externaljobs)
 *
 * Strategy
 * --------
 * Siemens uses Avature, which renders all job list items client-side via
 * obfuscated XHR calls. We use Puppeteer to:
 *
 *  1. Navigate to the Avature SearchJobs page with keyword + Germany filter.
 *  2. Wait for job result items to appear in the DOM.
 *  3. Extract title, URL, location, and posted date from each card.
 *  4. Click "Next page" to paginate through all results.
 *  5. For each job, navigate to the ViewJob detail page and extract the
 *     full job description (Avature renders description server-side on
 *     individual ViewJob pages, with JSON-LD included for SEO).
 *
 * Avature DOM selectors:
 *   - Job list items  : article.article--result
 *   - Job title link  : article.article--result > a  (first anchor = title + detail URL)
 *   - Location        : .list-item-location
 *   - Job ID          : .list-item-jobId  (e.g. "Job ID: 499889")
 *   - Detail URL      : /en_US/externaljobs/JobDetail/<id>
 *   - Next page btn   : a with innerText "Next >>" (href has folderOffset param)
 *   - Detail desc     : .section--job-description, .jobDescription, JSON-LD
 */

import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";
import { withPage } from "../lib/puppeteerBrowser";

const SEARCH_BASE  = "https://jobs.siemens.com/en_US/externaljobs/SearchJobs";
const PAGE_TIMEOUT = 30_000;
const BATCH_SIZE   = 10;      // parallel fetch of detail pages (reduced to avoid rate limiting)
const MAX_JOBS     = 200;      // limit total jobs to scrape

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n• ").replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n").trim();
}

interface RawJob {
  title:    string;
  url:      string;
  location: string;
  postedAt: string;
}

/** Build the Avature SearchJobs URL */
function buildSearchUrl(keywords: string): string {
  const kw = encodeURIComponent(keywords || "engineer");
  return `${SEARCH_BASE}/${kw}/Germany`;
}

/** Scrape job stubs from Avature using Puppeteer */
async function scrapeJobList(keywords: string, firstPageOnly = false): Promise<RawJob[]> {
  return withPage(async (page) => {
    const jobs: RawJob[] = [];
    const startUrl = buildSearchUrl(keywords);

    console.log(`[Siemens] Fetching job list from: ${startUrl}`);

    await page.goto(startUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT,
    });

    let pageNum = 1;
    while (true) {
      // Stop if we've reached the max
      if (jobs.length >= MAX_JOBS) {
        console.log(`[Siemens] Reached max limit of ${MAX_JOBS} jobs, stopping pagination`);
        break;
      }

      // Wait for Avature to render job article cards
      await page.waitForSelector("article.article--result", { timeout: PAGE_TIMEOUT })
        .catch(() => {});

      // Extract jobs from current page
      const pageJobs = await page.evaluate((): RawJob[] => {
        const results: RawJob[] = [];

        document.querySelectorAll<HTMLElement>("article.article--result").forEach((article) => {
          // First anchor is the title link → detail URL
          const titleEl = article.querySelector<HTMLAnchorElement>("a[href*='JobDetail']");
          const title   = titleEl?.textContent?.trim();
          const url     = titleEl?.href;
          if (!title || !url) return;

          const location = article.querySelector(".list-item-location")?.textContent?.trim() ?? "Germany";
          // jobId text is like "Job ID: 499889" — strip prefix
          const jobIdRaw = article.querySelector(".list-item-jobId")?.textContent?.trim() ?? "";
          const postedAt = "";

          results.push({ title, url, location, postedAt });
        });

        return results;
      });

      console.log(`[Siemens] Page ${pageNum}: found ${pageJobs.length} jobs (total: ${jobs.length + pageJobs.length})`);
      jobs.push(...pageJobs);

      if (firstPageOnly) break;

      // Find "Next >>" pagination anchor
      const nextHref = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a")];
        const next = anchors.find((a) => a.textContent?.trim() === "Next >>");
        return next?.href ?? null;
      });

      if (!nextHref) {
        console.log(`[Siemens] No more pages after ${pageNum}`);
        break;
      }

      pageNum++;
      await page.goto(nextHref, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
      await sleep(200); // reduced from 500ms
    }

    // Trim to max jobs
    const trimmed = jobs.slice(0, MAX_JOBS);
    console.log(`[Siemens] Total jobs found: ${jobs.length}, returning: ${trimmed.length}`);
    return trimmed;
  });
}

/** Fetch full job description from Avature ViewJob detail page */
async function fetchJobDescription(url: string): Promise<{ description: string; rawHtml: string }> {
  return withPage(async (page) => {
    try {
      // Use networkidle2 for detail pages - content is rendered dynamically
      await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT });

      // Wait for main content to appear - critical for JS-rendered content
      try {
        await page.waitForSelector("#section1__content, .main__content, main, .section__content--view", { timeout: 10000 });
      } catch {
        console.log(`[Siemens] Timeout waiting for selector on: ${url}`);
      }

      // Small delay to ensure content is fully rendered
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`[Siemens] Page load failed for ${url}: ${e instanceof Error ? e.message : String(e)}`);
      return { description: "", rawHtml: "" };
    }

    // Try JSON-LD first (most reliable on Avature detail pages)
    const ldJson = await page.evaluate(() => {
      const el = document.querySelector<HTMLScriptElement>(
        'script[type="application/ld+json"]'
      );
      return el?.textContent ?? null;
    });

    if (ldJson) {
      try {
        const posting = JSON.parse(ldJson);
        if (posting.description && posting.description.length > 50) {
          console.log(`[Siemens] Found JSON-LD description (${posting.description.length} chars)`);
          return { description: posting.description.replace(/<[^>]+>/g, " ").trim(), rawHtml: posting.description };
        }
      } catch { /* fall through */ }
    }

    // Try main content area (Siemens uses main for job content)
    const mainContent = await page.evaluate(() => {
      // Try specific selectors first
      const selectors = [
        "#section1__content", ".main__content", ".section__content--view", "main",
        ".section--job-description", ".jobdescription", ".jobDescription",
        "article.article--details", ".article__content"
      ];

      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(sel);
        const text = el?.innerText?.trim();
        if (text && text.length > 100) {
          return { description: text, rawHtml: el!.innerHTML, found: sel };
        }
      }

      // Fallback: get full body text (let LLM parse it)
      const bodyText = (document.body as HTMLElement)?.innerText?.trim() || "";
      const bodyHtml = document.body?.innerHTML || "";

      if (bodyText.length > 200) {
        return { description: bodyText.slice(0, 15000), rawHtml: bodyHtml.slice(0, 50000), found: "body" };
      }

      return { description: "", rawHtml: "", found: "none" };
    });

    if (mainContent.description) {
      console.log(`[Siemens] Extracted ${mainContent.description.length} chars from ${mainContent.found}`);
    } else {
      // Debug: log what's on the page
      const debug = await page.evaluate(() => ({
        title: document.title,
        bodyLen: document.body?.innerText?.length || 0,
        mainLen: (document.querySelector('.main__content') as HTMLElement)?.innerText?.length || 0,
      }));
      console.log(`[Siemens] No content for ${url} | title: ${debug.title} | body: ${debug.bodyLen} | main: ${debug.mainLen}`);
    }

    return mainContent;
  });
}

export const SiemensScraper: ScraperStrategy = {
  name: "siemens",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "software engineer";
    console.log(`[Siemens] Starting scrape with keywords: "${keywords}"`);

    // Step 1: scrape paginated job list
    const rawJobs = await scrapeJobList(keywords, config.firstPageOnly);
    if (!rawJobs.length) {
      console.log(`[Siemens] No jobs found, returning empty array`);
      return [];
    }

    console.log(`[Siemens] Fetching descriptions for ${rawJobs.length} jobs in batches of ${BATCH_SIZE}...`);

    // Step 2: fetch full descriptions in batches
    const jobs: ScrapedJob[] = [];
    const total = rawJobs.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = rawJobs.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(total / BATCH_SIZE);

      console.log(`[Siemens] Batch ${batchNum}/${totalBatches}: fetching ${batch.length} descriptions...`);

      const descriptions = await Promise.allSettled(
        batch.map((j) => fetchJobDescription(j.url))
      );

      batch.forEach((raw, idx) => {
        const result =
          descriptions[idx].status === "fulfilled"
            ? descriptions[idx].value
            : { description: "", rawHtml: "" };

        const desc = result.description || stripHtml(result.rawHtml) || "";

        jobs.push({
          title:       raw.title,
          url:         raw.url,
          description: desc,
          rawHtml:     result.rawHtml || undefined,
          company:     "Siemens",
          location:    raw.location,
          postedAt:    raw.postedAt,
        });
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < total) {
        await sleep(500);
      }
    }

    console.log(`[Siemens] Scrape complete: ${jobs.length} jobs with descriptions`);
    return jobs;
  },
};
