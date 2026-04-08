/**
 * Seed the 5 German company job sites into MongoDB.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx tsx scripts/seed-sites.ts
 *
 * Each site is upserted by scraperKey so re-running is idempotent.
 * Cron schedules are staggered to avoid hammering all sites at once.
 */

import mongoose from "mongoose";
import Site from "../models/Site";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ai-job-search";

const SITES = [
  {
    name:          "ZEISS Group",
    scraperKey:    "zeiss",
    url:           "https://www.zeiss.com/career/en/job-search.html",
    keywords:      "software engineer",
    cronSchedule:  "0 7 * * *",   // 07:00 daily
    isActive:      true,
  },
  {
    name:          "Siemens",
    scraperKey:    "siemens",
    url:           "https://jobs.siemens.com/en_US/externaljobs",
    keywords:      "software engineer",
    cronSchedule:  "0 8 * * *",   // 08:00 daily
    isActive:      true,
  },
  {
    name:          "SAP",
    scraperKey:    "sap",
    url:           "https://jobs.sap.com",
    keywords:      "software engineer",
    cronSchedule:  "0 9 * * *",   // 09:00 daily
    isActive:      true,
  },
  {
    name:          "Software AG",
    scraperKey:    "softwareag",
    url:           "https://jobs.dayforcehcm.com/en-US/sagann/sagportal",
    keywords:      "software engineer",
    cronSchedule:  "0 10 * * *",  // 10:00 daily
    isActive:      true,
  },
  {
    name:          "TeamViewer",
    scraperKey:    "teamviewer",
    url:           "https://careers.teamviewer.com",
    keywords:      "software engineer",
    cronSchedule:  "0 11 * * *",  // 11:00 daily
    isActive:      true,
  },
];

async function main() {
  console.log(`\nConnecting to MongoDB: ${MONGODB_URI.replace(/:\/\/[^@]+@/, "://<credentials>@")}`);
  await mongoose.connect(MONGODB_URI);

  let created = 0;
  let updated = 0;

  for (const site of SITES) {
    const existing = await Site.findOne({ scraperKey: site.scraperKey });

    if (existing) {
      await Site.updateOne({ scraperKey: site.scraperKey }, { $set: site });
      console.log(`  ↺  Updated  : ${site.name} (${site.scraperKey})`);
      updated++;
    } else {
      await Site.create(site);
      console.log(`  ✔  Created  : ${site.name} (${site.scraperKey}) — cron: ${site.cronSchedule}`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${updated} updated.\n`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
