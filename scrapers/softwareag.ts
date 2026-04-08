/**
 * Software AG Job Scraper
 *
 * Career Page  : https://jobs.dayforcehcm.com/en-US/sagann/sagportal
 * ATS          : Dayforce HCM (Next.js + Ant Design SPA)
 *
 * Strategy
 * --------
 * Dayforce renders the job list client-side using React + Ant Design.
 * We use Puppeteer to navigate and interact with the portal.
 *
 * Confirmed DOM selectors (from live inspection):
 *   - Job list items  : LI.ant-list-item
 *   - Job title link  : .ant-list-item-meta-title a  or  h4 a
 *   - Location/meta   : .ant-list-item-meta-description
 *   - Detail URL      : /en-US/sagann/sagportal/jobs/<id>
 *   - Pagination      : .ant-pagination-next button (not disabled)
 *   - Detail desc     : .ant-card-body (job detail page) or JSON-LD
 *   - Search input    : input.ant-select-selection-search-input
 */

import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";
import { withPage } from "../lib/puppeteerBrowser";

const PORTAL_URL   = "https://jobs.dayforcehcm.com/en-US/sagann/sagportal";
const PAGE_TIMEOUT = 45_000;
const BATCH_SIZE   = 5;
const MAX_PAGES    = 20;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n• ").replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n").trim();
}

interface RawJob {
  title:    string;
  url:      string;
  location: string;
  postedAt: string;
}

/** Scrape all job stubs from Dayforce using Puppeteer */
async function scrapeJobList(keywords: string, firstPageOnly = false): Promise<RawJob[]> {
  return withPage(async (page) => {
    // domcontentloaded (fast) + poll — networkidle2 is too slow on Dayforce
    await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });

    // Poll until ant-list-item appears (hydration takes ~3-5s after DOM load)
    const LIST_ITEM = "li.ant-list-item";
    for (let waited = 0; waited < 10000; waited += 500) {
      const n = await page.evaluate((s) => document.querySelectorAll(s).length, LIST_ITEM);
      if (n > 0) break;
      await sleep(500);
    }

    // Type keywords into the Ant Design search input if present
    if (keywords) {
      const searchInput = await page.$(
        "input.ant-select-selection-search-input, input[placeholder*='Search'], input[placeholder*='job']"
      );
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(keywords, { delay: 40 });
        const searchBtn = await page.$("button[type='submit'], button.ant-btn-primary");
        if (searchBtn) {
          await searchBtn.click();
        } else {
          await page.keyboard.press("Enter");
        }
      // Wait for list to re-render after search
      let sw = 0;
      while (sw < 8000) {
        const n = await page.evaluate((sel) => document.querySelectorAll(sel).length, LIST_ITEM);
        if (n > 0) break;
        await sleep(500); sw += 500;
      }
      }
    }

    const allJobs: RawJob[] = [];
    let pageNum = 1;

    while (pageNum <= MAX_PAGES) {
      // Poll for items on this page
      let pw = 0;
      while (pw < 8000) {
        const n = await page.evaluate((sel) => document.querySelectorAll(sel).length, LIST_ITEM);
        if (n > 0) break;
        await sleep(500); pw += 500;
      }

      const pageJobs = await page.evaluate((): RawJob[] => {
        const results: RawJob[] = [];
        document.querySelectorAll<HTMLElement>("li.ant-list-item").forEach((item) => {
          const titleEl = item.querySelector<HTMLAnchorElement>(
            ".ant-list-item-meta-title a, h4 a, h3 a, a[href*='/jobs/']"
          );
          const title = titleEl?.textContent?.trim();
          const url   = titleEl?.href;
          if (!title || !url) return;

          const locEl = item.querySelector(
            ".ant-list-item-meta-description, .ant-card-meta-description"
          );
          const location = locEl?.textContent?.trim().split("\n")[0] ?? "Germany";

          const dateEl = item.querySelector("[class*='date'], [class*='Date']");
          const postedAt = dateEl?.textContent?.trim() ?? "";

          results.push({ title, url, location, postedAt });
        });
        return results;
      });

      allJobs.push(...pageJobs);

      if (firstPageOnly) break;

      // Click next pagination button
      const nextBtn = await page.$(".ant-pagination-next:not(.ant-pagination-disabled) button");
      if (!nextBtn) break;

      await nextBtn.click();
      await page.waitForNetworkIdle({ timeout: 8000 }).catch(() => sleep(1500));
      pageNum++;
    }

    return allJobs;
  });
}

/** Fetch full job description from Dayforce job detail page */
async function fetchJobDescription(url: string): Promise<string> {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT });

    // Try JSON-LD first
    const ldJson = await page.evaluate(() => {
      const el = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
      return el?.textContent ?? null;
    });
    if (ldJson) {
      try {
        const posting = JSON.parse(ldJson);
        if (posting.description) return posting.description.replace(/<[^>]+>/g, " ").trim();
      } catch { /* fall through */ }
    }

    // Fallback: rendered HTML
    return page.evaluate(() => {
      const selectors = [
        ".ant-card-body", ".job-description", "#job-description",
        "[class*='jobDescription']", "[class*='description']",
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return "";
    });
  });
}

export const SoftwareAgScraper: ScraperStrategy = {
  name: "softwareag",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const keywords = config.keywords ?? "";

    const rawJobs = await scrapeJobList(keywords, config.firstPageOnly);
    if (!rawJobs.length) return [];

    const jobs: ScrapedJob[] = [];
    for (let i = 0; i < rawJobs.length; i += BATCH_SIZE) {
      const batch = rawJobs.slice(i, i + BATCH_SIZE);
      const descriptions = await Promise.allSettled(
        batch.map((j) => fetchJobDescription(j.url))
      );
      batch.forEach((raw, idx) => {
        const desc =
          descriptions[idx].status === "fulfilled"
            ? stripHtml(descriptions[idx].value)
            : "";
        jobs.push({
          title:       raw.title,
          url:         raw.url,
          description: desc,
          company:     "Software AG",
          location:    raw.location,
          postedAt:    raw.postedAt,
        });
      });
      await sleep(400);
    }

    return jobs;
  },
};
