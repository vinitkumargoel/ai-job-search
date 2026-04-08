/**
 * SAP Job Scraper
 *
 * Career Page : https://jobs.sap.com/
 * ATS         : SAP SuccessFactors (self-hosted at jobs.sap.com)
 *               Powered by jobs2web / SuccessFactors Recruiting
 * RSS Feed    : https://jobs.sap.com/services/rss/job/?locale=en_US&keywords=<kw>&country=Germany
 *
 * Strategy
 * --------
 * SAP's career portal (jobs.sap.com) is built on SuccessFactors Recruiting
 * (jobs2web engine). The portal blocks API access but exposes a public RSS feed
 * that returns full job descriptions in XML. This is the most reliable
 * extraction path — no auth, no anti-bot, stable since 2018.
 *
 * RSS Feed params:
 *   - keywords   → keyword search (URL-encoded)
 *   - country    → filter by country name e.g. "Germany"
 *   - locale     → en_US (controls language of description)
 *   - start      → 0-based pagination offset (each page = 25 items)
 *
 * Each <item> in the RSS feed contains:
 *   - <title>       → "Job Title (City, Country, PostalCode)"
 *   - <description> → Full HTML job description (inside CDATA)
 *   - <link>        → Direct URL to job posting
 *   - <pubDate>     → Posting date
 *
 * The title field encodes location as a suffix in parentheses, e.g.:
 *   "Senior Engineer (Walldorf, DE, 69190)"
 * We parse this to extract the city/country.
 *
 * Pagination: loop by incrementing `start` until fewer than 25 items returned.
 */

import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const RSS_BASE = "https://jobs.sap.com/services/rss/job/";
const PAGE_SIZE = 25;
const DELAY_MS = 600;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse title like "Senior Engineer (f/m/d) (Walldorf, DE, 69190)"
 * Returns { cleanTitle, location }
 */
function parseTitle(raw: string): { cleanTitle: string; location: string } {
  // Match the LAST parenthesised group that looks like a location
  const match = raw.match(/^(.*?)\s*\(([^)]+,\s*[A-Z]{2}[^)]*)\)\s*$/);
  if (match) {
    return {
      cleanTitle: match[1].replace(/\s*\(f\/m\/d\)/i, "").trim(),
      location: match[2].trim(),
    };
  }
  return { cleanTitle: raw.trim(), location: "Germany" };
}

function parseCdata(text: string): string {
  // RSS feeds wrap content in CDATA — the XML parser handles this,
  // but we strip residual HTML
  return stripHtml(text);
}

async function fetchRssPage(keywords: string, start: number): Promise<ScrapedJob[]> {
  const params = new URLSearchParams({
    locale: "en_US",
    country: "Germany",
    start: String(start),
  });

  if (keywords) params.set("keywords", keywords);

  const res = await fetch(`${RSS_BASE}?${params}`, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; JobScraper/1.0)",
    },
  });

  if (!res.ok) throw new Error(`SAP RSS feed error: ${res.status}`);

  const xml = await res.text();
  const jobs: ScrapedJob[] = [];

  // Parse <item> blocks from RSS XML using regex
  // (avoid pulling in a full XML parser — keeps the dependency tree clean)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleRaw = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ?? item.match(/<title>([\s\S]*?)<\/title>/))?.[1] ?? "";
    const descRaw = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ?? item.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? "";
    const link = (item.match(/<link>([\s\S]*?)<\/link>/) )?.[1]?.trim() ?? "";
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() ?? "";

    if (!titleRaw || !link) continue;

    const { cleanTitle, location } = parseTitle(titleRaw.trim());
    const description = parseCdata(descRaw);

    // Extract a canonical job URL (strip tracking params)
    const canonicalUrl = link.split("?")[0];

    jobs.push({
      title: cleanTitle,
      url: canonicalUrl,
      description,
      company: "SAP",
      location,
      postedAt: pubDate,
    });
  }

  return jobs;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SapScraper: ScraperStrategy = {
  name: "sap",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "";
    const allJobs: ScrapedJob[] = [];

    let start = 0;

    while (true) {
      const page = await fetchRssPage(keywords, start);

      if (!page.length) break;

      allJobs.push(...page);

      // If fewer than PAGE_SIZE returned, we've hit the last page
      if (page.length < PAGE_SIZE) break;

      start += PAGE_SIZE;
      await sleep(DELAY_MS);
    }

    // Deduplicate by URL in case of RSS quirks
    const seen = new Set<string>();
    return allJobs.filter((j) => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });
  },
};
