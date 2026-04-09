import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Shared Greenhouse scraper factory.
 *
 * Used by: N26, Raisin, Commercetools, HelloFresh, GetYourGuide, Flix, Scout24
 *
 * API: GET https://api.greenhouse.io/v1/boards/{boardToken}/jobs?content=true
 *
 * The `content=true` param includes full HTML job description.
 * `absolute_url` is the direct apply link.
 * No auth required.
 */

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const GERMANY_KEYWORDS = [
  "germany", "berlin", "munich", "münchen", "hamburg", "frankfurt",
  "cologne", "köln", "düsseldorf", "dusseldorf", "stuttgart", "leipzig",
  "dortmund", "hannover", "nuremberg", "nürnberg", "bonn",
];

async function fetchWithRetry(url: string, retries = 3, timeoutMs = 30000): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status >= 500 && attempt < retries) { await new Promise((r) => setTimeout(r, attempt * 2000)); continue; }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  throw lastErr;
}

function isGermanyLocation(locationName: string): boolean {
  const loc = (locationName ?? "").toLowerCase();
  return GERMANY_KEYWORDS.some((kw) => loc.includes(kw));
}

function makeGreenhouseScraper(scraperName: string, companyName: string, boardToken: string): ScraperStrategy {
  return {
    name: scraperName,

    async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
      const jobs: ScrapedJob[] = [];
      // Always derive URL from the registry board token — never rely on config.url
      // (config.url may be empty in test mode or stale in DB)
      const url = config.url && config.url.startsWith("http")
        ? config.url
        : `https://api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
      const keywords = config.keywords?.toLowerCase();

      try {
        const res = await fetchWithRetry(url, 3, 30000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const rawJobs: {
          id: number;
          title: string;
          absolute_url: string;
          location: { name: string };
          content?: string;
          updated_at?: string;
        }[] = data?.jobs ?? [];

        for (const job of rawJobs) {
          if (!job.id || !job.title || !job.absolute_url) continue;
          if (keywords && !job.title.toLowerCase().includes(keywords)) continue;
          if (!isGermanyLocation(job.location?.name ?? "")) continue;

          jobs.push({
            title: job.title,
            url: job.absolute_url,
            description: "",
            rawHtml: job.content ?? "",
            company: companyName,
            location: job.location?.name ?? "Germany",
            postedAt: job.updated_at ?? "",
          });
        }
      } catch (err) {
        console.error(`[${scraperName}Scraper] Error:`, err);
      }

      return jobs;
    },
  };
}

export const N26Scraper = makeGreenhouseScraper("n26", "N26", "n26");
export const RaisinScraper = makeGreenhouseScraper("raisin", "Raisin", "raisin");
export const CommercetoolsScraper = makeGreenhouseScraper("commercetools", "commercetools", "commercetools");
export const HelloFreshScraper = makeGreenhouseScraper("hellofresh", "HelloFresh", "hellofresh");
export const GetYourGuideScraper = makeGreenhouseScraper("getyourguide", "GetYourGuide", "getyourguide");
export const FlixScraper = makeGreenhouseScraper("flix", "Flix", "flix");
export const Scout24Scraper = makeGreenhouseScraper("scout24", "Scout24", "scout24");

/**
 * Parloa Technologies Scraper
 * ATS: Greenhouse (board slug: parloa)
 * Career page: https://www.parloa.com/careers
 * Site URL to use: https://api.greenhouse.io/v1/boards/parloa/jobs?content=true
 * Germany jobs: ~27 of 57 total (Berlin & Munich offices)
 */
export const ParloaScraper = makeGreenhouseScraper("parloa", "Parloa", "parloa");

/**
 * Helsing Scraper
 * ATS: Greenhouse (board slug: helsing)
 * Career page: https://helsing.ai/careers
 * Site URL to use: https://api.greenhouse.io/v1/boards/helsing/jobs?content=true
 * Germany jobs: ~80 of 105 total (Berlin, Munich)
 */
export const HelsingScraper = makeGreenhouseScraper("helsing", "Helsing", "helsing");

/**
 * Black Forest Labs Scraper
 * ATS: Greenhouse (board slug: blackforestlabs)
 * Career page: https://blackforestlabs.ai/careers
 * Site URL to use: https://api.greenhouse.io/v1/boards/blackforestlabs/jobs?content=true
 * Germany jobs: ~6 of 10 total (Freiburg, Germany)
 */
export const BlackForestLabsScraper = makeGreenhouseScraper(
  "blackforestlabs",
  "Black Forest Labs",
  "blackforestlabs"
);
