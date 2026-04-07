import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

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

/**
 * Celonis Scraper
 *
 * Strategy: Celonis uses Greenhouse as their ATS.
 * We fetch the public Greenhouse job board API which returns full HTML descriptions.
 *
 * API: GET https://api.greenhouse.io/v1/boards/celonis/jobs?content=true
 *
 * Apply URL is provided directly as `absolute_url`.
 * `content` field contains full HTML job description — passed as rawHtml to Ollama enricher.
 *
 * To use: set the site URL to https://api.greenhouse.io/v1/boards/celonis/jobs?content=true
 * Optionally set keywords to filter by title (e.g. "engineer").
 */

const GERMANY_LOCATIONS = [
  "germany", "deutschland", "berlin", "munich", "münchen", "hamburg",
  "frankfurt", "cologne", "köln", "düsseldorf", "dusseldorf", "stuttgart",
  "leipzig", "dortmund", "essen", "bremen", "hannover", "nuremberg",
  "nürnberg", "bonn", "karlsruhe", "mannheim", "augsburg",
];

export const CelonisScraper: ScraperStrategy = {
  name: "celonis",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const res = await fetchWithRetry(config.url, 3, 30000);

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

      const keywords = config.keywords?.toLowerCase();

      for (const job of rawJobs) {
        if (!job.id || !job.title || !job.absolute_url) continue;
        if (keywords && !job.title.toLowerCase().includes(keywords)) continue;

        // Only Germany
        const loc = (job.location?.name ?? "").toLowerCase();
        if (!GERMANY_LOCATIONS.some((kw) => loc.includes(kw))) continue;

        jobs.push({
          title: job.title,
          url: job.absolute_url,
          description: "",          // Ollama will generate this from rawHtml
          rawHtml: job.content ?? "", // full HTML — up to 8000+ chars
          company: "Celonis",
          location: job.location?.name ?? "Unknown",
          postedAt: job.updated_at ?? "",
        });
      }
    } catch (err) {
      console.error("[CelonisScraper] Error:", err);
    }

    return jobs;
  },
};
