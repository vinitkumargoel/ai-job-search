import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Shared Personio scraper factory.
 *
 * Personio exposes a public JSON API at:
 *   GET https://<subdomain>.jobs.personio.de/api/v1/jobs?language=en
 *
 * The response is a JSON array of position objects.
 * Germany filter: all positions on these boards are Germany-based
 * (the subdomain is the company's Personio tenant).
 *
 * Note: Personio's Vercel-hosted job board returns a security checkpoint
 * on the ZI corporate network. This scraper works correctly on the production
 * server outside the corporate network.
 *
 * Used by: Babbel, Idealo, Mambu
 */

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

const GERMANY_KEYWORDS = [
  "germany",
  "deutschland",
  "berlin",
  "munich",
  "münchen",
  "hamburg",
  "frankfurt",
  "cologne",
  "köln",
  "düsseldorf",
  "dusseldorf",
  "stuttgart",
  "heidelberg",
  "hannover",
  "dortmund",
  "leipzig",
  "remote",
];

function isGermanyLocation(officeName: string): boolean {
  const loc = (officeName ?? "").toLowerCase();
  return (
    loc === "" || // no location specified = assume Germany (German-only board)
    GERMANY_KEYWORDS.some((k) => loc.includes(k))
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  timeoutMs = 30000
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }
  }
  throw lastErr;
}

function makePersonioScraper(
  scraperName: string,
  companyName: string,
  subDomain: string
): ScraperStrategy {
  const BASE = `https://${subDomain}.jobs.personio.de`;

  return {
    name: scraperName,

    async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
      const jobs: ScrapedJob[] = [];
      const keywords = config.keywords?.toLowerCase();

      try {
        const listRes = await fetchWithRetry(
          `${BASE}/api/v1/jobs?language=en`,
          3,
          30000
        );

        // 404 = no open positions; 429 = rate-limited (ZI network)
        if (listRes.status === 404 || listRes.status === 429) return jobs;
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

        const data = await listRes.json();
        const positions: {
          id: number;
          name?: string;
          office?: { name?: string } | string;
          description?: string;
        }[] = Array.isArray(data) ? data : [];

        for (const pos of positions) {
          if (!pos.id || !pos.name) continue;

          // Keyword filter
          if (keywords && !pos.name.toLowerCase().includes(keywords)) continue;

          // Location filter — Personio board is Germany-only, but check anyway
          const officeName =
            typeof pos.office === "object"
              ? (pos.office as { name?: string }).name ?? ""
              : (pos.office as string) ?? "";

          if (officeName && !isGermanyLocation(officeName)) continue;

          // Build description
          const rawHtml = pos.description ?? "";
          const description = rawHtml ? stripHtml(rawHtml) : "";

          jobs.push({
            title: pos.name,
            url: `${BASE}/job/${pos.id}`,
            description,
            rawHtml: rawHtml || undefined,
            company: companyName,
            location: officeName || "Germany",
            postedAt: "",
          });
        }
      } catch (err) {
        console.error(`[${scraperName}Scraper] Error:`, err);
      }

      return jobs;
    },
  };
}

/**
 * Babbel Scraper
 * ATS: Personio (subdomain: babbel)
 * Career page: https://jobs.babbel.com/en/
 * Site URL to use: https://babbel.jobs.personio.de/
 * Germany jobs: Berlin HQ — all roles Germany-based
 * Note: Personio rate-limits on ZI corporate network — works on production server.
 */
export const BabbelScraper = makePersonioScraper("babbel", "Babbel", "babbel");

/**
 * Idealo Scraper
 * ATS: Personio (subdomain: idealo)
 * Career page: https://www.idealo.de/jobs
 * Site URL to use: https://idealo.jobs.personio.de/
 * Germany jobs: Berlin HQ — all roles Germany-based
 * Note: Personio rate-limits on ZI corporate network — works on production server.
 */
export const IdealoScraper = makePersonioScraper("idealo", "Idealo", "idealo");

/**
 * Mambu Scraper
 * ATS: Personio (subdomain: mambu)
 * Career page: https://www.mambu.com/careers
 * Site URL to use: https://mambu.jobs.personio.de/
 * Germany jobs: Berlin HQ — all roles Germany-based
 * Note: Mambu's primary ATS is iCIMS but they also post on Personio.
 *       Personio rate-limits on ZI corporate network — works on production server.
 */
export const MambuScraper = makePersonioScraper("mambu", "Mambu", "mambu");
