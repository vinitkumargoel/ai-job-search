import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Shared SmartRecruiters scraper factory.
 *
 * SmartRecruiters exposes a public REST API at:
 *   GET https://api.smartrecruiters.com/v1/companies/<slug>/postings?country=de&limit=100
 *
 * The `content` endpoint gives full job description:
 *   GET https://api.smartrecruiters.com/v1/companies/<slug>/postings/<id>
 *
 * No auth required for public postings. `country=de` filters to Germany only.
 *
 * Used by: Sennder
 */

const SR_BASE = "https://api.smartrecruiters.com/v1/companies";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
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

function isGermanyLocation(city = "", country = "", region = ""): boolean {
  const haystack = `${city} ${country} ${region}`.toLowerCase();
  return (
    country.toLowerCase() === "de" ||
    country.toLowerCase() === "germany" ||
    GERMANY_KEYWORDS.some((k) => haystack.includes(k))
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

function makeSmartRecruitersScraper(
  scraperName: string,
  companyName: string,
  srSlug: string
): ScraperStrategy {
  return {
    name: scraperName,

    async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
      const jobs: ScrapedJob[] = [];
      const keywords = config.keywords?.toLowerCase();

      try {
        // Fetch all Germany postings in one request (country=de)
        let offset = 0;
        const limit = 100;
        let total = Infinity;

        while (offset < total) {
          const listUrl = `${SR_BASE}/${srSlug}/postings?country=de&limit=${limit}&offset=${offset}`;
          const listRes = await fetchWithRetry(listUrl, 3, 30000);
          if (!listRes.ok) {
            if (listRes.status === 404) break; // company has no SR board
            throw new Error(`HTTP ${listRes.status}`);
          }

          const listData = await listRes.json();
          total = listData.totalFound ?? 0;
          const postings: {
            id: string;
            name: string;
            location?: { city?: string; country?: string; region?: string };
            releasedDate?: string;
          }[] = listData.content ?? [];

          if (!postings.length) break;

          for (const posting of postings) {
            if (!posting.id || !posting.name) continue;
            if (keywords && !posting.name.toLowerCase().includes(keywords)) continue;

            const { city = "", country = "", region = "" } = posting.location ?? {};
            if (!isGermanyLocation(city, country, region)) continue;

            const location = [city, country].filter(Boolean).join(", ");

            // Fetch description from detail endpoint
            let rawHtml = "";
            let description = "";
            const applyUrl = `https://jobs.smartrecruiters.com/${srSlug}/${posting.id}`;

            try {
              const detailRes = await fetchWithRetry(
                `${SR_BASE}/${srSlug}/postings/${posting.id}`,
                2,
                20000
              );
              if (detailRes.ok) {
                const detail = await detailRes.json();
                const sections = detail?.jobAd?.sections ?? {};
                rawHtml = [
                  sections.companyDescription?.text,
                  sections.jobDescription?.text,
                  sections.qualifications?.text,
                  sections.additionalInformation?.text,
                ]
                  .filter(Boolean)
                  .join("\n\n");
                description = rawHtml ? stripHtml(rawHtml) : "";
              }
            } catch {
              // proceed without description
            }

            jobs.push({
              title: posting.name,
              url: applyUrl,
              description,
              rawHtml: rawHtml || undefined,
              company: companyName,
              location: location || "Germany",
              postedAt: posting.releasedDate ?? "",
            });
          }

          offset += limit;
          if (offset < total) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      } catch (err) {
        console.error(`[${scraperName}Scraper] Error:`, err);
      }

      return jobs;
    },
  };
}

/**
 * Sennder Scraper
 * ATS: SmartRecruiters (slug: SennderGmbH)
 * Career page: https://www.sennder.com/jobs-at-sennder
 * Site URL to use: https://api.smartrecruiters.com/v1/companies/SennderGmbH/postings?country=de
 * Germany jobs: varies (digital freight forwarder, Berlin HQ)
 */
export const SennderScraper = makeSmartRecruitersScraper(
  "sennder",
  "Sennder",
  "SennderGmbH"
);

/**
 * Auto1 Group Scraper
 * ATS: SmartRecruiters (slug: Auto1)
 * Career page: https://www.auto1-group.com/jobs/
 * Site URL to use: https://api.smartrecruiters.com/v1/companies/Auto1/postings?country=de
 * Germany jobs: ~189 total (Berlin HQ + nationwide car centers)
 */
export const Auto1Scraper = makeSmartRecruitersScraper(
  "auto1",
  "AUTO1 Group",
  "Auto1"
);

/**
 * About You Scraper
 * ATS: SmartRecruiters (slug: AboutYouGmbH)
 * Career page: https://corporate.aboutyou.de/en/career
 * Site URL to use: https://api.smartrecruiters.com/v1/companies/AboutYouGmbH/postings?country=de
 * Germany jobs: ~91 total (Hamburg HQ)
 */
export const AboutYouScraper = makeSmartRecruitersScraper(
  "aboutyou",
  "About You",
  "AboutYouGmbH"
);

/**
 * Scalable Capital Scraper
 * ATS: SmartRecruiters (slug: ScalableGmbH)
 * Career page: https://de.scalable.capital/en/careers
 * Site URL to use: https://api.smartrecruiters.com/v1/companies/ScalableGmbH/postings?country=de
 * Germany jobs: ~108 total (Berlin + Munich)
 */
export const ScalableCapitalScraper = makeSmartRecruitersScraper(
  "scalablecapital",
  "Scalable Capital",
  "ScalableGmbH"
);

/**
 * SIXT Scraper
 * ATS: SmartRecruiters (slug: Sixt)
 * Career page: https://www.sixt.com/company/jobs/
 * Site URL to use: https://api.smartrecruiters.com/v1/companies/Sixt/postings?country=de
 * Germany jobs: ~241 total (Munich HQ + nationwide)
 */
export const SixtScraper = makeSmartRecruitersScraper(
  "sixt",
  "SIXT",
  "Sixt"
);
