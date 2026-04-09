import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Shared Ashby HQ scraper factory.
 *
 * Used by: n8n, DeepL, Aleph Alpha, Sereact, Quantum Systems
 *
 * Ashby exposes a public GraphQL endpoint at:
 *   POST https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams
 *
 * The `jobPostings` array in the response contains all open roles for the org.
 * Each posting has: id, title, locationName, applicationLink, publishedDate,
 * descriptionSections[].descriptionHtml (full job HTML description).
 *
 * No auth required. Works without any API key.
 *
 * To use: set the site URL to:
 *   https://jobs.ashbyhq.com/<orgSlug>
 * e.g. https://jobs.ashbyhq.com/n8n
 */

const ASHBY_GRAPHQL_URL =
  "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams";

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const GRAPHQL_QUERY = `
query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
    jobPostings {
      id
      title
      locationName
      applicationLink
      publishedDate
      descriptionSections {
        descriptionHtml
      }
    }
  }
}
`.trim();

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
  "nuremberg",
  "nürnberg",
  "hannover",
  "dortmund",
  "leipzig",
  "bremen",
  "bonn",
  "mannheim",
  "karlsruhe",
  "augsburg",
  "schockenried", // Sereact's full street address in Stuttgart
  "schockenriedstr", // alternate spelling
  "remote",       // many German-remote roles
];

function isGermanyLocation(locationName: string): boolean {
  const loc = (locationName ?? "").toLowerCase();
  return GERMANY_KEYWORDS.some((kw) => loc.includes(kw));
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
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
  body: string,
  retries = 3,
  timeoutMs = 30000
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body,
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

function makeAshbyScraper(
  scraperName: string,
  companyName: string,
  orgSlug: string
): ScraperStrategy {
  return {
    name: scraperName,

    async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
      const jobs: ScrapedJob[] = [];
      const keywords = config.keywords?.toLowerCase();

      try {
        const body = JSON.stringify({
          operationName: "ApiJobBoardWithTeams",
          variables: { organizationHostedJobsPageName: orgSlug },
          query: GRAPHQL_QUERY,
        });

        const res = await fetchWithRetry(ASHBY_GRAPHQL_URL, body, 3, 30000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const postings: {
          id: string;
          title: string;
          locationName?: string;
          applicationLink?: string;
          publishedDate?: string;
          descriptionSections?: Array<{ descriptionHtml?: string }>;
        }[] = data?.data?.jobBoard?.jobPostings ?? [];

        for (const posting of postings) {
          if (!posting.id || !posting.title) continue;

          // Keyword filter on title
          if (keywords && !posting.title.toLowerCase().includes(keywords)) continue;

          // Germany location filter
          if (!isGermanyLocation(posting.locationName ?? "")) continue;

          // Build description from sections
          const rawHtml = (posting.descriptionSections ?? [])
            .map((s) => s.descriptionHtml ?? "")
            .filter(Boolean)
            .join("\n\n");

          const description = rawHtml ? stripHtml(rawHtml) : "";

          const jobUrl =
            posting.applicationLink ??
            `https://jobs.ashbyhq.com/${orgSlug}/${posting.id}`;

          jobs.push({
            title: posting.title,
            url: jobUrl,
            description,
            rawHtml: rawHtml || undefined,
            company: companyName,
            location: posting.locationName ?? "Germany",
            postedAt: posting.publishedDate ?? "",
          });
        }
      } catch (err) {
        console.error(`[${scraperName}Scraper] Error:`, err);
      }

      return jobs;
    },
  };
}

// ─── Registered Ashby scrapers ────────────────────────────────────────────────

/**
 * n8n Scraper
 * ATS: Ashby (slug: n8n)
 * Career page: https://n8n.io/careers
 * Site URL to use: https://jobs.ashbyhq.com/n8n
 */
export const N8nScraper = makeAshbyScraper("n8n", "n8n", "n8n");

/**
 * DeepL Scraper
 * ATS: Ashby (slug: DeepL)
 * Career page: https://www.deepl.com/en/careers
 * Site URL to use: https://jobs.ashbyhq.com/DeepL
 */
export const DeepLScraper = makeAshbyScraper("deepl", "DeepL", "DeepL");

/**
 * Aleph Alpha Scraper
 * ATS: Ashby (slug: AlephAlpha)
 * Career page: https://www.aleph-alpha.com/careers
 * Site URL to use: https://jobs.ashbyhq.com/AlephAlpha
 */
export const AlephAlphaScraper = makeAshbyScraper(
  "alephalpha",
  "Aleph Alpha",
  "AlephAlpha"
);

/**
 * Sereact Scraper
 * ATS: Ashby (slug: sereact)
 * Career page: https://sereact.ai/careers
 * Site URL to use: https://jobs.ashbyhq.com/sereact
 * Note: All jobs are in Stuttgart — all pass the Germany filter.
 */
export const SereactScraper = makeAshbyScraper("sereact", "Sereact", "sereact");

/**
 * Personio Scraper
 * ATS: Ashby (slug: personio)
 * Career page: https://www.personio.com/about-personio/careers/
 * Site URL to use: https://jobs.ashbyhq.com/personio
 * Germany jobs: ~79 of 95 total (Munich, Berlin)
 */
export const PersonioScraper = makeAshbyScraper("personio", "Personio", "personio");

/**
 * Enpal Scraper
 * ATS: Ashby (slug: enpal)
 * Career page: https://www.enpal.de/en/jobs
 * Site URL to use: https://jobs.ashbyhq.com/enpal
 * Germany jobs: ~153 of 204 total (Berlin, remote Germany)
 * Note: jobs.ashbyhq.com is blocked by ZI corporate TLS proxy — works on production server.
 */
export const EnpalScraper = makeAshbyScraper("enpal", "Enpal", "enpal");

/**
 * Forto Scraper
 * ATS: Ashby (slug: forto)
 * Career page: https://forto.com/en/careers/
 * Site URL to use: https://jobs.ashbyhq.com/forto
 * Germany jobs: ~6 of 10 total (Berlin, Hamburg, Remote Germany)
 * Note: jobs.ashbyhq.com is blocked by ZI corporate TLS proxy — works on production server.
 */
export const FortoScraper = makeAshbyScraper("forto", "Forto", "forto");

/**
 * Billie Scraper
 * ATS: Ashby (slug: billie)
 * Career page: https://www.billie.io/careers
 * Site URL to use: https://jobs.ashbyhq.com/billie
 * Germany jobs: 5 of 5 total (all Berlin)
 * Note: jobs.ashbyhq.com is blocked by ZI corporate TLS proxy — works on production server.
 */
export const BillieScraper = makeAshbyScraper("billie", "Billie", "billie");
