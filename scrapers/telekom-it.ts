import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Deutsche Telekom IT Solutions Scraper
 *
 * ATS: SmartRecruiters (slug: DeutscheTelekomITSolutions)
 * Career page: https://careers.smartrecruiters.com/deutschetelekomitsolutions
 * Site URL: https://api.smartrecruiters.com/v1/companies/DeutscheTelekomITSolutions/postings
 *
 * Deutsche Telekom IT Solutions (formerly T-Systems IT & Shared Services)
 * is the IT backbone of the Deutsche Telekom Group. They operate cloud
 * platforms, networks, and enterprise IT — one of Germany's largest IT
 * employers with offices in Darmstadt, Bonn, Berlin, Munich, and Hamburg.
 *
 * Note: Many postings list Hungary (Budapest) as location — the company
 * operates a large shared-service centre there. The Germany filter
 * (country=de) is applied; if that returns 0, we fall back to scanning all
 * postings whose city matches German cities.
 *
 * SmartRecruiters API:
 *   GET /v1/companies/DeutscheTelekomITSolutions/postings?country=de&limit=100&offset=0
 *   GET /v1/companies/DeutscheTelekomITSolutions/postings/<id>   ← description
 */

const SR_BASE   = "https://api.smartrecruiters.com/v1/companies/DeutscheTelekomITSolutions";
const SR_SLUG   = "DeutscheTelekomITSolutions";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const GERMANY_CITIES = [
  "darmstadt", "bonn", "berlin", "munich", "münchen", "hamburg",
  "frankfurt", "cologne", "köln", "düsseldorf", "dusseldorf",
  "stuttgart", "hannover", "nuremberg", "nürnberg", "leipzig",
  "germany", "deutschland",
];

function isGermanyLocation(city = "", country = "", region = ""): boolean {
  const h = `${city} ${country} ${region}`.toLowerCase();
  return (
    country.toLowerCase() === "de" ||
    country.toLowerCase() === "germany" ||
    GERMANY_CITIES.some((k) => h.includes(k))
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

export const TelekomITScraper: ScraperStrategy = {
  name: "telekom-it",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const keywords = config.keywords?.toLowerCase();

    try {
      let offset = 0;
      const limit = 100;
      let total = Infinity;

      // First try with country=de filter; if no results, fetch all and filter manually
      let useCountryFilter = true;

      while (offset < total) {
        const countryParam = useCountryFilter ? "&country=de" : "";
        const listUrl = `${SR_BASE}/postings?limit=${limit}&offset=${offset}${countryParam}`;
        const listRes = await fetchWithRetry(listUrl, 3, 30000);

        if (!listRes.ok) {
          if (listRes.status === 404) break;
          throw new Error(`HTTP ${listRes.status}`);
        }

        const listData = await listRes.json();
        total = listData.totalFound ?? 0;

        // If country filter gives 0, retry without filter and do manual location check
        if (total === 0 && useCountryFilter && offset === 0) {
          useCountryFilter = false;
          total = Infinity;
          continue;
        }

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

          // When not using country filter, apply manual Germany check
          if (!useCountryFilter && !isGermanyLocation(city, country, region)) continue;

          const location = [city, country === "de" ? "Germany" : country]
            .filter(Boolean)
            .join(", ") || "Germany";

          // Fetch description from detail endpoint
          let rawHtml = "";
          let description = "";
          const applyUrl = `https://jobs.smartrecruiters.com/${SR_SLUG}/${posting.id}`;

          try {
            const detailRes = await fetchWithRetry(
              `${SR_BASE}/postings/${posting.id}`,
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
            title:       posting.name,
            url:         applyUrl,
            description,
            rawHtml:     rawHtml || undefined,
            company:     "Deutsche Telekom IT Solutions",
            location,
            postedAt:    posting.releasedDate ?? "",
          });
        }

        offset += limit;
        if (offset < total) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (err) {
      console.error("[TelekomITScraper] Error:", err);
    }

    return jobs;
  },
};
