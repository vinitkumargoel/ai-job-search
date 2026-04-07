import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Amazon Jobs Scraper
 *
 * Strategy: Fetch the Amazon jobs search page and parse job listings.
 * Amazon Jobs uses a public API endpoint that returns JSON.
 *
 * Example URL: https://www.amazon.jobs/en/search.json?base_query=software+engineer&loc_query=remote
 *
 * To use: set the site URL to the Amazon Jobs search JSON endpoint,
 * e.g. https://www.amazon.jobs/en/search.json?base_query=software+engineer
 */
export const AmazonScraper: ScraperStrategy = {
  name: "amazon",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      // Build the request URL — append keywords if provided
      let fetchUrl = config.url;
      if (config.keywords && !fetchUrl.includes("base_query")) {
        const encoded = encodeURIComponent(config.keywords);
        fetchUrl += fetchUrl.includes("?")
          ? `&base_query=${encoded}`
          : `?base_query=${encoded}`;
      }

      const res = await fetch(fetchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Amazon jobs search API returns { jobs: [...] }
      const rawJobs = data?.jobs ?? [];

      for (const job of rawJobs) {
        if (!job?.id_icims || !job?.title) continue;

        jobs.push({
          title: job.title ?? "",
          url: `https://www.amazon.jobs/en/jobs/${job.id_icims}`,
          description: job.description ?? job.description_short ?? "",
          company: "Amazon",
          location:
            job.normalized_location ??
            job.city ??
            job.location ??
            "Unknown",
          postedAt: job.posted_date ?? "",
        });
      }
    } catch (err) {
      console.error("[AmazonScraper] Error:", err);
    }

    return jobs;
  },
};
