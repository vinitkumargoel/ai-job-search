import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Hetzner Online Scraper
 *
 * ATS: Custom Next.js career site (career.hetzner.com)
 * Career page: https://career.hetzner.com/en/jobs
 * Method: Sitemap XML → per-job JSON-LD (identical strategy to TeamViewer)
 *
 * How it works:
 *  1. Fetch https://career.hetzner.com/sitemap.xml
 *  2. Extract all /en/jobs/<slug>/ URLs (English job listings only)
 *  3. For each job URL, fetch the page and parse the
 *     <script type="application/ld+json"> block (schema.org/JobPosting)
 *  4. Client-side keyword filter applied after fetching
 *
 * All jobs are Germany-based (Gunzenhausen, Falkenstein, Nuremberg).
 * No location filter needed — the board is Germany-only.
 *
 * Note: The sitemap is updated in near-real-time;
 *       it is safe to treat as the authoritative job list.
 */

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const SITEMAP_URL = "https://career.hetzner.com/sitemap.xml";
const JOB_BASE    = "https://career.hetzner.com";
const BATCH_SIZE  = 10;   // concurrent detail fetches
const DELAY_MS    = 300;  // polite delay between batches

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
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

/** Extract all English job listing URLs from the sitemap. */
async function getJobUrls(): Promise<string[]> {
  const xml = await fetchText(SITEMAP_URL);
  // Match only /en/jobs/<slug>/ paths (skip /de/ duplicates)
  const matches = xml.match(/https:\/\/career\.hetzner\.com\/en\/jobs\/[^<\s]+\//g);
  return [...new Set(matches ?? [])];
}

interface JsonLdJobPosting {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressCountry?: string;
    };
  } | Array<{
    address?: {
      addressLocality?: string;
      addressCountry?: string;
    };
  }>;
}

/** Fetch a job detail page and extract JSON-LD. */
async function scrapeJobPage(
  url: string
): Promise<{ title: string; description: string; rawHtml: string; location: string; postedAt: string } | null> {
  try {
    const html = await fetchText(url, 15000);

    // Extract JSON-LD block(s)
    const ldMatches = html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );

    for (const match of ldMatches) {
      try {
        const data: JsonLdJobPosting | JsonLdJobPosting[] = JSON.parse(match[1]);
        const posting: JsonLdJobPosting | undefined = Array.isArray(data)
          ? data.find((d) => d["@type"] === "JobPosting")
          : data["@type"] === "JobPosting"
          ? data
          : undefined;

        if (!posting) continue;

        const title = posting.title ?? "";
        if (!title) continue;

        const rawHtml  = posting.description ?? "";
        const description = rawHtml ? stripHtml(rawHtml) : "";
        const postedAt = posting.datePosted ?? "";

        // Extract location
        const loc = Array.isArray(posting.jobLocation)
          ? posting.jobLocation[0]
          : posting.jobLocation;
        const city    = loc?.address?.addressLocality ?? "";
        const country = loc?.address?.addressCountry ?? "DE";
        const location = [city, country === "DE" ? "Germany" : country]
          .filter(Boolean)
          .join(", ") || "Germany";

        return { title, description, rawHtml, location, postedAt };
      } catch {
        // Malformed JSON-LD — try next block
      }
    }

    // Fallback: extract title from <h1> if JSON-LD missing
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (titleMatch) {
      return {
        title: titleMatch[1].trim(),
        description: "",
        rawHtml: "",
        location: "Germany",
        postedAt: "",
      };
    }

    return null;
  } catch {
    return null;
  }
}

export const HetznerScraper: ScraperStrategy = {
  name: "hetzner",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const keywords = config.keywords?.toLowerCase();
    const firstPageOnly = (config as SiteConfig & { firstPageOnly?: boolean }).firstPageOnly;

    try {
      const allUrls = await getJobUrls();
      const urls = firstPageOnly ? allUrls.slice(0, BATCH_SIZE) : allUrls;

      // Process in batches to respect the server
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
          batch.map(async (url) => {
            const detail = await scrapeJobPage(url);
            if (!detail) return null;
            if (keywords && !detail.title.toLowerCase().includes(keywords)) return null;

            return {
              title:       detail.title,
              url,
              description: detail.description,
              rawHtml:     detail.rawHtml || undefined,
              company:     "Hetzner Online",
              location:    detail.location,
              postedAt:    detail.postedAt,
            } as ScrapedJob;
          })
        );

        for (const job of results) {
          if (job) jobs.push(job);
        }

        if (i + BATCH_SIZE < urls.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    } catch (err) {
      console.error("[HetznerScraper] Error:", err);
    }

    return jobs;
  },
};
