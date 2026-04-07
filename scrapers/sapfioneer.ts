import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

/**
 * SAP Fioneer Scraper
 *
 * Strategy: Uses the Workable public jobs API to list open roles.
 * Workable does NOT expose full descriptions via their public API —
 * the job pages are client-rendered SPAs.
 *
 * To get description content we fetch each job's page and extract:
 *   1. The og:description meta tag (truncated intro)
 *   2. Any readable text from the page HTML
 * This is then passed to Ollama as rawHtml for enrichment.
 *
 * API: POST https://apply.workable.com/api/v3/accounts/fioneer/jobs
 * Apply URL: https://apply.workable.com/fioneer/j/{shortcode}/
 *
 * To use: set the site URL to https://apply.workable.com/api/v3/accounts/fioneer/jobs
 */
export const SapFioneerScraper: ScraperStrategy = {
  name: "sapfioneer",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const res = await fetchWithRetry(config.url, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: config.keywords ?? "",
          location: [],
          department: [],
          worktype: [],
          remote: [],
        }),
      }, 3, 30000);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rawJobs: {
        id: number;
        shortcode?: string;
        title: string;
        department?: string | string[];
        location?: { city?: string; country?: string; countryCode?: string };
        published?: string;
        url?: string;
        workplace?: string;
      }[] = data?.results ?? [];

      for (const job of rawJobs) {
        const shortcode = job.shortcode ?? String(job.id);
        if (!shortcode || !job.title) continue;

        // Only Germany
        const country = (job.location?.country ?? job.location?.countryCode ?? "").toLowerCase();
        const city = (job.location?.city ?? "").toLowerCase();
        const isGermany = country.includes("germany") || country.includes("deutschland") || country === "de"
          || city.includes("munich") || city.includes("münchen") || city.includes("berlin")
          || city.includes("frankfurt") || city.includes("hamburg");
        if (!isGermany) continue;

        const dept = Array.isArray(job.department)
          ? job.department.join(", ")
          : (job.department ?? "");

        const applyUrl = `https://apply.workable.com/fioneer/j/${shortcode}/`;
        const location = [job.location?.city, job.location?.country].filter(Boolean).join(", ");

        // Fetch the job page to extract og:description + any visible text
        let rawHtml = "";
        try {
          const pageRes = await fetchWithRetry(applyUrl, { headers: { "User-Agent": UA } }, 2, 20000);
          if (pageRes.ok) {
            const html = await pageRes.text();
            // Extract og:description (best available content from Workable SPA)
            const ogMatch = html.match(/<meta property="og:description" content="([^"]*)"/);
            const titleMatch = html.match(/<title>([^<]*)<\/title>/);
            if (ogMatch?.[1]) {
              rawHtml = `Job Title: ${job.title}\nCompany: SAP Fioneer\nDepartment: ${dept}\nLocation: ${location}\nWorkplace: ${job.workplace ?? ""}\n\n${ogMatch[1]}`;
            }
          }
        } catch {
          // Page fetch failed — use department as minimal context
        }

        jobs.push({
          title: job.title,
          url: applyUrl,
          description: dept,
          rawHtml: rawHtml || `Job Title: ${job.title}\nCompany: SAP Fioneer\nDepartment: ${dept}\nLocation: ${location}`,
          company: "SAP Fioneer",
          location: location || "Germany",
          postedAt: job.published ?? "",
        });
      }
    } catch (err) {
      console.error("[SapFioneerScraper] Error:", err);
    }

    return jobs;
  },
};
