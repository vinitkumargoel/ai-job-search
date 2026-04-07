import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Bosch Scraper
 *
 * Strategy: Uses the SmartRecruiters public postings API — no auth required.
 *
 * List API:   GET https://api.smartrecruiters.com/v1/companies/BoschGroup/postings?country=de&limit=50
 * Detail API: GET https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/{id}
 *
 * To use: set the site URL to:
 *   https://api.smartrecruiters.com/v1/companies/BoschGroup/postings?country=de&limit=50
 */

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

/** Fetch with automatic retry on connect timeout / 5xx errors. */
async function fetchWithRetry(url: string, retries = 3, timeoutMs = 30000): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Retry on server errors
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const wait = attempt * 3000; // 3s, 6s, …
        console.warn(`[BoschScraper] Attempt ${attempt} failed, retrying in ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

export const BoschScraper: ScraperStrategy = {
  name: "bosch",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      let listUrl = config.url;
      if (config.keywords && !listUrl.includes("q=")) {
        const encoded = encodeURIComponent(config.keywords);
        listUrl += listUrl.includes("?") ? `&q=${encoded}` : `?q=${encoded}`;
      }

      const listRes = await fetchWithRetry(listUrl);
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

      const listData = await listRes.json();
      const rawJobs: {
        id: string;
        name: string;
        location?: { city?: string; fullLocation?: string };
        releasedDate?: string;
      }[] = listData?.content ?? [];

      const baseDetailUrl = config.url.split("?")[0];

      for (const job of rawJobs) {
        if (!job.id || !job.name) continue;

        const location = job.location?.fullLocation ?? job.location?.city ?? "Unknown";
        let description = "";
        let rawHtml = "";
        let applyUrl = `https://jobs.smartrecruiters.com/BoschGroup/${job.id}`;

        try {
          const detailRes = await fetchWithRetry(`${baseDetailUrl}/${job.id}`, 3, 30000);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const sections = detail?.jobAd?.sections ?? {};
            rawHtml = [
              sections.companyDescription?.text,
              sections.jobDescription?.text,
              sections.qualifications?.text,
              sections.additionalInformation?.text,
            ].filter(Boolean).join("\n\n");

            description = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (detail.postingUrl) applyUrl = detail.postingUrl;
          }
        } catch {
          // Detail fetch failed after retries — proceed with stub, Ollama will work with what we have
        }

        jobs.push({
          title: job.name,
          url: applyUrl,
          description,
          rawHtml,
          company: "Bosch",
          location,
          postedAt: job.releasedDate ?? "",
        });
      }
    } catch (err) {
      console.error("[BoschScraper] Error:", err);
    }

    return jobs;
  },
};
