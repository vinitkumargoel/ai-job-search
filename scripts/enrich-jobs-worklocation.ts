/**
 * Migration script to add workLocation and visaSponsorship fields to existing jobs.
 *
 * Usage: npx ts-node scripts/enrich-jobs-worklocation.ts
 *
 * This script will:
 * 1. Find all jobs that don't have workLocation or visaSponsorship set
 * 2. Re-enrich them using Ollama to extract the new fields
 * 3. Update the jobs with the new data
 */

import mongoose from "mongoose";
import Job from "../models/Job";
import { enrichJobDescription } from "../lib/ollama";
import { connectDB } from "../lib/mongodb";

async function main() {
  console.log("Connecting to database...");
  await connectDB();

  // Find jobs that are missing the new fields
  const jobs = await Job.find({
    $or: [
      { workLocation: { $in: [null, "Not specified", ""] } },
      { visaSponsorship: { $in: [null, "Not specified", ""] } }
    ]
  });

  console.log(`Found ${jobs.length} jobs to enrich with workLocation and visaSponsorship`);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    processed++;
    console.log(`\n[${processed}/${jobs.length}] Processing: ${job.title} at ${job.company || job.siteName}`);

    try {
      // Use existing description for enrichment
      const enriched = await enrichJobDescription(
        job.title,
        job.company || job.siteName,
        job.description || "",
        undefined
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
        console.log(`  - No new data extracted`);
      }

      // Small delay to avoid overwhelming Ollama
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total jobs found: ${jobs.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  await mongoose.disconnect();
  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});