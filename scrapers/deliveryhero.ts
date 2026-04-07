import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Delivery Hero Scraper
 *
 * Strategy: Delivery Hero uses SmartRecruiters as their ATS.
 *
 * List API:   GET https://api.smartrecruiters.com/v1/companies/DeliveryHero/postings?country=de&limit=100
 * Detail API: GET https://api.smartrecruiters.com/v1/companies/DeliveryHero/postings/{id}
 *
 * To use: set the site URL to:
 *   https://api.smartrecruiters.com/v1/companies/DeliveryHero/postings?country=de&limit=100
 */

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

export const DeliveryHeroScraper: ScraperStrategy = {
  name: "deliveryhero",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      let listUrl = config.url;
      if (config.keywords && !listUrl.includes("q=")) {
        listUrl += `&q=${encodeURIComponent(config.keywords)}`;
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

        const location = job.location?.fullLocation ?? job.location?.city ?? "Germany";
        let rawHtml = "";
        let applyUrl = `https://jobs.smartrecruiters.com/DeliveryHero/${job.id}`;

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

            if (detail.postingUrl) applyUrl = detail.postingUrl;
          }
        } catch { /* detail fetch failed */ }

        jobs.push({
          title: job.name,
          url: applyUrl,
          description: "",
          rawHtml: rawHtml || `Job Title: ${job.name}\nCompany: Delivery Hero\nLocation: ${location}`,
          company: "Delivery Hero",
          location,
          postedAt: job.releasedDate ?? "",
        });
      }
    } catch (err) {
      console.error("[DeliveryHeroScraper] Error:", err);
    }

    return jobs;
  },
};
