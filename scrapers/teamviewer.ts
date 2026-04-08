/**
 * TeamViewer Job Scraper
 *
 * Career Page : https://careers.teamviewer.com/
 * ATS         : Teamtailor (custom domain)
 *
 * Strategy
 * --------
 * The Teamtailor jobs.json feed returns 406 from this environment.
 * Instead we use a two-step approach:
 *
 *  1. Fetch the public sitemap (https://careers.teamviewer.com/sitemap.xml)
 *     → extract all job page URLs (~150–200 entries)
 *
 *  2. For each job URL, fetch the HTML page and extract structured data
 *     from the embedded JSON-LD <script type="application/ld+json"> block.
 *     The JSON-LD follows schema.org/JobPosting and contains:
 *       - title, description, datePosted, jobLocation, hiringOrganization
 *
 *  3. Client-side keyword filter is applied after fetching all jobs.
 *
 * Rate-limit: Teamtailor pages are CDN-cached; fetching ~150 in parallel
 * is safe. We batch in groups of 20 with a small delay between batches.
 */

import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const SITEMAP_URL  = "https://careers.teamviewer.com/sitemap.xml";
const BATCH_SIZE   = 20;
const DELAY_MS     = 300;
const USER_AGENT   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface JobPosting {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  jobLocation?: {
    "@type"?: string;
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  hiringOrganization?: { name?: string };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildLocation(jl?: JobPosting["jobLocation"]): string {
  const addr = jl?.address;
  return [addr?.addressLocality, addr?.addressRegion, addr?.addressCountry]
    .filter(Boolean)
    .join(", ");
}

async function fetchSitemapJobUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/xml,application/xml,*/*" },
  });
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const urls = [
    ...xml.matchAll(/<loc>(https:\/\/careers\.teamviewer\.com\/jobs\/[^<]+)<\/loc>/g),
  ].map((m) => m[1]);
  return urls;
}

async function fetchJobFromPage(url: string): Promise<ScrapedJob | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Extract JSON-LD JobPosting block
  const ldMatch = html.match(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!ldMatch) return null;

  let posting: JobPosting;
  try {
    posting = JSON.parse(ldMatch[1]) as JobPosting;
  } catch {
    return null;
  }

  if (!posting.title) return null;

  return {
    title:       posting.title,
    url,
    description: posting.description ? stripHtml(posting.description) : "",
    company:     posting.hiringOrganization?.name ?? "TeamViewer",
    location:    buildLocation(posting.jobLocation) || "Göppingen, Germany",
    postedAt:    posting.datePosted ?? "",
  };
}

function matchesKeywords(job: ScrapedJob, keywords: string): boolean {
  if (!keywords) return true;
  const haystack = [job.title, job.description, job.location].join(" ").toLowerCase();
  return keywords.toLowerCase().split(/\s+/).every((kw) => haystack.includes(kw));
}

export const TeamViewerScraper: ScraperStrategy = {
  name: "teamviewer",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "";

    // Step 1: get all job URLs from sitemap
    const urls = await fetchSitemapJobUrls();
    if (!urls.length) return [];

    const jobs: ScrapedJob[] = [];

    // Step 2: fetch each job page in batches
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(fetchJobFromPage));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) jobs.push(r.value);
      }
      if (i + BATCH_SIZE < urls.length) await sleep(DELAY_MS);
    }

    // Step 3: client-side keyword filter
    return jobs.filter((j) => matchesKeywords(j, keywords));
  },
};
