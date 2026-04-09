import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Wave 4 — German IT & Service Company Scrapers (Apr 2026)
 *
 * Companies:
 *  - Wolt            Greenhouse  (food-delivery tech  — Berlin)
 *  - IONOS           Greenhouse  (cloud / hosting     — Karlsruhe / Berlin)
 *  - Doctolib        Greenhouse  (healthtech          — Berlin)
 *  - MOIA            Greenhouse  (VW mobility tech    — Hamburg / Wolfsburg)
 *  - Wayve           Greenhouse  (autonomous driving  — Germany)
 *  - Wunderflats     Greenhouse  (proptech            — Berlin)
 *  - Adyen           Greenhouse  (payments tech       — Berlin)
 *  - Tulip           Greenhouse  (industrial IoT      — Munich)
 *
 * All eight use the shared Greenhouse factory below.
 * Deutsche Telekom IT Solutions and Hetzner are in their own files.
 */

// ─── Shared helpers ────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const GERMANY_KEYWORDS = [
  "germany",
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
  "karlsruhe",
  "wolfsburg",
  "hannover",
  "nuremberg",
  "nürnberg",
  "dortmund",
  "bonn",
  "heidelberg",
  "mannheim",
  "freiburg",
];

function isGermanyLocation(name: string): boolean {
  const loc = (name ?? "").toLowerCase();
  return GERMANY_KEYWORDS.some((kw) => loc.includes(kw));
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

// ─── Greenhouse factory ────────────────────────────────────────────────────────

function makeGreenhouseScraper(
  scraperName: string,
  companyName: string,
  boardToken: string
): ScraperStrategy {
  return {
    name: scraperName,

    async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
      const jobs: ScrapedJob[] = [];
      const url =
        config.url && config.url.startsWith("http")
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

// ─── Exported scrapers ─────────────────────────────────────────────────────────

/**
 * Wolt Scraper
 * ATS: Greenhouse (board slug: wolt)
 * Career page: https://careers.wolt.com/
 * Site URL: https://api.greenhouse.io/v1/boards/wolt/jobs?content=true
 * Germany jobs: ~49 (Berlin — delivery & engineering HQ for DACH)
 */
export const WoltScraper = makeGreenhouseScraper("wolt", "Wolt", "wolt");

/**
 * IONOS Scraper
 * ATS: Greenhouse (board slug: ionos)
 * Career page: https://jobs.ionos.com/
 * Site URL: https://api.greenhouse.io/v1/boards/ionos/jobs?content=true
 * Germany jobs: ~67 (Karlsruhe + Berlin — cloud, hosting, cyber-security engineering)
 */
export const IONOSScraper = makeGreenhouseScraper("ionos", "IONOS", "ionos");

/**
 * Doctolib Scraper
 * ATS: Greenhouse (board slug: doctolib)
 * Career page: https://careers.doctolib.com/
 * Site URL: https://api.greenhouse.io/v1/boards/doctolib/jobs?content=true
 * Germany jobs: ~56 (Berlin + Hamburg + Wuppertal — healthtech platform)
 */
export const DoctolibScraper = makeGreenhouseScraper(
  "doctolib",
  "Doctolib",
  "doctolib"
);

/**
 * MOIA Scraper
 * ATS: Greenhouse (board slug: moia)
 * Career page: https://www.moia.io/career
 * Site URL: https://api.greenhouse.io/v1/boards/moia/jobs?content=true
 * Germany jobs: 52 (Hamburg + Wolfsburg + Berlin — VW Group autonomous mobility)
 */
export const MOIAScraper = makeGreenhouseScraper("moia", "MOIA", "moia");

/**
 * Wayve Scraper
 * ATS: Greenhouse (board slug: wayve)
 * Career page: https://wayve.ai/careers/
 * Site URL: https://api.greenhouse.io/v1/boards/wayve/jobs?content=true
 * Germany jobs: ~8 (Germany — autonomous driving AI, testing in Berlin/Munich)
 */
export const WayveScraper = makeGreenhouseScraper("wayve", "Wayve", "wayve");

/**
 * Wunderflats Scraper
 * ATS: Greenhouse (board slug: wunderflats)
 * Career page: https://wunderflats.com/about/jobs
 * Site URL: https://api.greenhouse.io/v1/boards/wunderflats/jobs?content=true
 * Germany jobs: 17 (Berlin — furnished apartment rental platform)
 */
export const WunderflatsScraper = makeGreenhouseScraper(
  "wunderflats",
  "Wunderflats",
  "wunderflats"
);

/**
 * Adyen Scraper
 * ATS: Greenhouse (board slug: adyen)
 * Career page: https://careers.adyen.com/
 * Site URL: https://api.greenhouse.io/v1/boards/adyen/jobs?content=true
 * Germany jobs: ~13 (Berlin — global payments platform, DACH enterprise sales & tech)
 */
export const AdyenScraper = makeGreenhouseScraper("adyen", "Adyen", "adyen");

/**
 * Tulip Scraper
 * ATS: Greenhouse (board slug: tulip)
 * Career page: https://tulip.co/careers/
 * Site URL: https://api.greenhouse.io/v1/boards/tulip/jobs?content=true
 * Germany jobs: ~5 (Munich — industrial IoT / manufacturing operations platform)
 */
export const TulipScraper = makeGreenhouseScraper("tulip", "Tulip", "tulip");
