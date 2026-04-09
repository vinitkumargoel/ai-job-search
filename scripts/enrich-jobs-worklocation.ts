/**
 * Migration script to add workLocation and visaSponsorship fields to existing jobs.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx tsx scripts/enrich-jobs-worklocation.ts
 *
 * This script will:
 * 1. Find all jobs (excluding rejected) missing workLocation or visaSponsorship
 * 2. Fetch fresh HTML from each job's URL using Puppeteer
 * 3. Re-enrich using Ollama (settings from DB) to extract the new fields
 * 4. Update the jobs with the new data
 */

import mongoose from "mongoose";
import Job from "../models/Job";
import { enrichJobDescription } from "../lib/ollama";
import { withPage } from "../lib/puppeteerBrowser";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ai-job-search";

/**
 * Fetch the HTML content from a job posting URL using Puppeteer.
 */
async function fetchJobHtml(url: string): Promise<string | null> {
  try {
    return await withPage(async (page) => {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      // Wait for the main content to load
      await page.waitForSelector("body", { timeout: 5000 }).catch(() => {});
      // Extract the full HTML content
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      return html;
    });
  } catch (err) {
    console.error(`  ✗ Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function main() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI);

  // Find jobs that are missing the new fields, excluding rejected jobs
  const jobs = await Job.find({
    status: { $ne: "rejected" },
    $or: [
      { workLocation: { $in: [null, "Not specified", ""] } },
      { visaSponsorship: { $in: [null, "Not specified", ""] } }
    ]
  });

  console.log(`Found ${jobs.length} jobs to enrich (excluding rejected)`);

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of jobs) {
    processed++;
    console.log(`\n[${processed}/${jobs.length}] Processing: ${job.title} at ${job.company || job.siteName}`);
    console.log(`  URL: ${job.url}`);

    try {
      // Fetch fresh HTML from the job URL
      const rawHtml = await fetchJobHtml(job.url);

      if (!rawHtml) {
        console.log(`  ⚠️  Could not fetch HTML, skipping`);
        failed++;
        continue;
      }

      console.log(`  ✓ Fetched ${rawHtml.length} characters of HTML`);

      // Use fetched HTML for enrichment
      const enriched = await enrichJobDescription(
        job.title,
        job.company || job.siteName,
        job.description || "",
        rawHtml
      );

      if (!enriched) {
        console.log(`  ⚠️  Enrichment returned null, skipping`);
        failed++;
        continue;
      }

      // Update only the new fields
      const updateData: Record<string, string | null> = {};

      if (enriched.workLocation && enriched.workLocation !== "Not specified") {
        updateData.workLocation = enriched.workLocation;
      }
      if (enriched.visaSponsorship && enriched.visaSponsorship !== "Not specified") {
        updateData.visaSponsorship = enriched.visaSponsorship;
      }

      if (Object.keys(updateData).length > 0) {
        await Job.updateOne({ _id: job._id }, { $set: updateData });
        console.log(`  ✓ Updated: ${JSON.stringify(updateData)}`);
        updated++;
      } else {
        console.log(`  - No new data extracted (values were "Not specified")`);
        skipped++;
      }

      // Delay to avoid overwhelming Ollama and rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total jobs found: ${jobs.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no data): ${skipped}`);
  console.log(`Failed: ${failed}`);

  await mongoose.disconnect();
  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});