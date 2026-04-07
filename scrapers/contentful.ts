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
 * Contentful Scraper
 *
 * Strategy: Uses the Greenhouse public job board API — no auth required.
 *
 * API: GET https://api.greenhouse.io/v1/boards/contentful/jobs?content=true
 *
 * The `content=true` param includes the full HTML job description in each job object.
 * Apply URL is provided directly as `absolute_url`.
 *
 * To use: set the site URL to https://api.greenhouse.io/v1/boards/contentful/jobs?content=true
 * Optionally set keywords to filter by title (e.g. "engineer").
 */
export const ContentfulScraper: ScraperStrategy = {
  name: "contentful",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      const res = await fetchWithRetry(config.url, 3, 30000);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

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

        // Filter by keyword against title if provided
        if (keywords && !job.title.toLowerCase().includes(keywords)) continue;

        // Only keep Germany-based roles
        const loc = (job.location?.name ?? "").toLowerCase();
        const isGermany =
          loc.includes("germany") ||
          loc.includes("berlin") ||
          loc.includes("munich") ||
          loc.includes("münchen") ||
          loc.includes("hamburg") ||
          loc.includes("frankfurt") ||
          loc.includes("cologne") ||
          loc.includes("köln") ||
          loc.includes("stuttgart") ||
          loc.includes("düsseldorf") ||
          loc.includes("dusseldorf") ||
          loc.includes("nuremberg") ||
          loc.includes("nürnberg");
        if (!isGermany) continue;

        jobs.push({
          title: job.title,
          url: job.absolute_url,
          description: "",            // Ollama generates from rawHtml
          rawHtml: job.content ?? "", // full HTML — 8000+ chars of rich content
          company: "Contentful",
          location: job.location?.name ?? "Unknown",
          postedAt: job.updated_at ?? "",
        });
      }
    } catch (err) {
      console.error("[ContentfulScraper] Error:", err);
    }

    return jobs;
  },
};
