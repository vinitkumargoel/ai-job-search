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
const BATCH_SIZE   = 2;       // detail pages fetched in parallel (keep small to free pool pages)

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

    await page.goto(buildSearchUrl(keywords), {
      waitUntil: "networkidle2",
      timeout: PAGE_TIMEOUT,
    });

    while (true) {
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

      jobs.push(...pageJobs);

      if (firstPageOnly) break;

      // Find "Next >>" pagination anchor
      const nextHref = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a")];
        const next = anchors.find((a) => a.textContent?.trim() === "Next >>");
        return next?.href ?? null;
      });

      if (!nextHref) break;

      await page.goto(nextHref, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT });
      await sleep(500);
    }

    return jobs;
  });
}

/** Fetch full job description from Avature ViewJob detail page */
async function fetchJobDescription(url: string): Promise<string> {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT });

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
        if (posting.description) return posting.description.replace(/<[^>]+>/g, " ").trim();
      } catch { /* fall through */ }
    }

    // Fallback: extract from rendered HTML
    return page.evaluate(() => {
      const selectors = [
        ".section--job-description", ".jobdescription", ".jobDescription",
        "#jobDescription", ".iContent .description", "#iContent",
        ".job-description", "[class*='description']",
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return "";
    });
  });
}

export const SiemensScraper: ScraperStrategy = {
  name: "siemens",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "software engineer";

    // Step 1: scrape paginated job list
    const rawJobs = await scrapeJobList(keywords, config.firstPageOnly);
    if (!rawJobs.length) return [];

    // Step 2: fetch full descriptions in batches
    const jobs: ScrapedJob[] = [];

    for (let i = 0; i < rawJobs.length; i += BATCH_SIZE) {
      const batch = rawJobs.slice(i, i + BATCH_SIZE);
      const descriptions = await Promise.allSettled(
        batch.map((j) => fetchJobDescription(j.url))
      );

      batch.forEach((raw, idx) => {
        const desc =
          descriptions[idx].status === "fulfilled"
            ? stripHtml(descriptions[idx].value)
            : "";

        jobs.push({
          title:       raw.title,
          url:         raw.url,
          description: desc,
          company:     "Siemens",
          location:    raw.location,
          postedAt:    raw.postedAt,
        });
      });

      await sleep(400);
    }

    return jobs;
  },
};
