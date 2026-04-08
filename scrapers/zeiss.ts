/**
 * ZEISS Group Job Scraper
 *
 * Career Page : https://www.zeiss.com/career/en/job-search.html
 * ATS         : Workday  (zeissgroup.wd3.myworkdayjobs.com)
 * API Base    : https://zeissgroup.wd3.myworkdayjobs.com/wday/cxs/zeissgroup/External/jobs
 *
 * Strategy
 * --------
 * Workday exposes an undocumented but stable JSON API used by its own SPA.
 * We POST to the /jobs endpoint with a JSON body that supports:
 *   - limit / offset  → pagination
 *   - searchText      → keyword search (maps to SiteConfig.keywords)
 *   - locations[]     → optional location filter
 *
 * Each response contains `jobPostings[]` with enough data to build a ScrapedJob.
 * Full description requires a second GET to /jobPostingDetail/<externalId>.
 * We fetch descriptions in parallel (Promise.allSettled) to keep things fast.
 *
 * Rate-limit note: Workday throttles aggressive scrapers.
 * Keep BATCH_SIZE ≤ 20 and add a small delay between batches.
 */

import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

const WORKDAY_BASE =
  "https://zeissgroup.wd3.myworkdayjobs.com/wday/cxs/zeissgroup/External";

const BATCH_SIZE = 20;
const DELAY_MS = 500;

interface WorkdayJobPosting {
  title: string;
  externalPath: string; // e.g. "/job/Jena/Software-Engineer_JR-12345"
  locationsText: string;
  postedOn: string; // e.g. "Posted 3 Days Ago"
  bulletFields?: Array<{ label: string; value: string }>;
}

interface WorkdayListResponse {
  jobPostings: WorkdayJobPosting[];
  total: number;
}

interface WorkdayDetailResponse {
  jobPostingInfo: {
    title: string;
    jobDescription: string;
    company: string;
    location: string;
    externalUrl: string;
    postedOn: string;
  };
}

async function fetchJobList(
  keywords: string,
  offset: number
): Promise<WorkdayListResponse> {
  const res = await fetch(`${WORKDAY_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Workday-Client": "2024.35.4",
    },
    body: JSON.stringify({
      appliedFacets: {},
      limit: BATCH_SIZE,
      offset,
      searchText: keywords || "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Workday list API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<WorkdayListResponse>;
}

async function fetchJobDetail(externalPath: string): Promise<string> {
  // externalPath looks like "/job/Jena/Software-Engineer_JR-12345"
  const res = await fetch(`${WORKDAY_BASE}/jobPostingDetail${externalPath}`, {
    headers: {
      Accept: "application/json",
      "X-Workday-Client": "2024.35.4",
    },
  });

  if (!res.ok) return "";

  const data = (await res.json()) as WorkdayDetailResponse;
  return data?.jobPostingInfo?.jobDescription ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ZeissScraper: ScraperStrategy = {
  name: "zeiss",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "";
    const jobs: ScrapedJob[] = [];

    // --- Step 1: Paginate through all job listings ---
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const data = await fetchJobList(keywords, offset);
      total = data.total;

      if (!data.jobPostings?.length) break;

      // --- Step 2: Fetch descriptions in parallel per batch ---
      const details = await Promise.allSettled(
        data.jobPostings.map((p) => fetchJobDetail(p.externalPath))
      );

      data.jobPostings.forEach((posting, i) => {
        const description =
          details[i].status === "fulfilled" ? details[i].value : "";

        const jobUrl = `https://zeissgroup.wd3.myworkdayjobs.com/en-US/External${posting.externalPath}`;

        jobs.push({
          title: posting.title,
          url: jobUrl,
          description,
          company: "ZEISS Group",
          location: posting.locationsText ?? "Germany",
          postedAt: posting.postedOn ?? "",
        });
      });

      offset += BATCH_SIZE;

      // Respect rate limits between pages
      if (offset < total) await sleep(DELAY_MS);
    }

    return jobs;
  },
};
