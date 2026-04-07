import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Zalando Scraper
 *
 * Strategy: Zalando's jobs portal (jobs.zalando.com) is a Next.js RSC app.
 * By sending `RSC: 1` header we get a JSON-like server component payload that
 * contains structured job list data without running JavaScript.
 *
 * List:   GET https://jobs.zalando.com/en/jobs?location=Germany&page={n}
 *         (with RSC: 1 header)
 *         → payload line matching /^\d+:{"data":\[/ contains array of job objects
 *
 * Detail: GET https://jobs.zalando.com/en/jobs/{id}-{slug}
 *         (with RSC: 1 header)
 *         → payload line matching /^[0-9a-f]+:T[0-9a-f]+,/ is the raw HTML description
 *
 * Apply URL: https://jobs.zalando.com/en/jobs/{id}-{slug}
 *
 * To use: set site URL to https://jobs.zalando.com/en/jobs?location=Germany
 */

const RSC_HEADERS = {
  "User-Agent": UA,
  "RSC": "1",
  "Accept": "text/x-component",
};

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, timeoutMs = 30000): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status >= 500 && attempt < retries) { await new Promise((r) => setTimeout(r, attempt * 2000)); continue; }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  throw lastErr;
}

/** Parse the RSC payload line that contains the job list. */
function parseJobList(rscText: string): { data: { id: string; title: string; offices: string[]; entity: string; experience_level?: string; updated_at?: string }[]; total: number } | null {
  for (const line of rscText.split("\n")) {
    if (!line.includes('"data":[') || !line.includes('"title"')) continue;
    const m = line.match(/^\w+:(.*)/);
    if (!m) continue;
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed?.data)) return parsed;
    } catch { /* try next line */ }
  }
  return null;
}

/** Extract the HTML description block from an RSC job detail payload. */
function parseJobDescription(rscText: string): string {
  for (const line of rscText.split("\n")) {
    // RSC text nodes look like: `2f:T16d4,<html content here>`
    const m = line.match(/^[0-9a-f]+:T[0-9a-f]+,([\s\S]*)/);
    if (m && m[1].includes("<p>")) return m[1];
  }
  return "";
}

export const ZalandoScraper: ScraperStrategy = {
  name: "zalando",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const baseListUrl = config.url; // e.g. https://jobs.zalando.com/en/jobs?location=Germany
    const keywords = config.keywords?.toLowerCase();

    try {
      // Paginate through all pages (15 jobs per page)
      let page = 1;
      let totalSeen = 0;
      let total = Infinity;

      while (totalSeen < total) {
        const url = `${baseListUrl}&page=${page}`;
        const res = await fetchWithRetry(url, { headers: RSC_HEADERS }, 3, 30000);
        if (!res.ok) throw new Error(`HTTP ${res.status} on list page ${page}`);

        const rscText = await res.text();
        const listData = parseJobList(rscText);
        if (!listData || listData.data.length === 0) break;

        total = listData.total ?? total;

        for (const job of listData.data) {
          if (!job.id || !job.title) continue;
          if (keywords && !job.title.toLowerCase().includes(keywords)) continue;

          // All jobs from ?location=Germany are Germany-based
          const location = job.offices?.join(", ") || "Germany";
          const slug = job.title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
          const applyUrl = `https://jobs.zalando.com/en/jobs/${job.id}-${slug}`;

          // Fetch job detail to get HTML description
          let rawHtml = "";
          try {
            const detailRes = await fetchWithRetry(applyUrl, { headers: RSC_HEADERS }, 2, 20000);
            if (detailRes.ok) {
              rawHtml = parseJobDescription(await detailRes.text());
            }
          } catch { /* detail fetch failed */ }

          jobs.push({
            title: job.title,
            url: applyUrl,
            description: "",
            rawHtml: rawHtml || `Job Title: ${job.title}\nCompany: Zalando\nEntity: ${job.entity}\nLocation: ${location}\nExperience: ${job.experience_level ?? ""}`,
            company: "Zalando",
            location,
            postedAt: job.updated_at ?? "",
          });
        }

        totalSeen += listData.data.length;
        page++;

        // Safety: cap at 10 pages (150 jobs max)
        if (page > 10) break;
      }
    } catch (err) {
      console.error("[ZalandoScraper] Error:", err);
    }

    return jobs;
  },
};
