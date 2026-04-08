/**
 * Seed script — inserts German IT company job sites into MongoDB.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx tsx scripts/seed-german-sites.ts
 *
 * Safe to re-run — uses upsert (match on scraperKey) so existing sites
 * are updated in-place without creating duplicates.
 */

import mongoose from "mongoose";
import Site from "../models/Site";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ai-job-search";

interface SiteSeed {
  name:         string;
  scraperKey:   string;
  url:          string;
  keywords:     string;
  cronSchedule: string;
  isActive:     boolean;
}

const GERMAN_SITES: SiteSeed[] = [
  {
    name:         "ZEISS Group",
    scraperKey:   "zeiss",
    url:          "https://www.zeiss.com/career/en/job-search.html",
    keywords:     "software engineer",
    cronSchedule: "0 7 * * 1",    // Every Monday 07:00
    isActive:     true,
  },
  {
    name:         "Siemens",
    scraperKey:   "siemens",
    url:          "https://jobs.siemens.com/en_US/externaljobs",
    keywords:     "software engineer",
    cronSchedule: "0 8 * * 2",    // Every Tuesday 08:00
    isActive:     true,
  },
  {
    name:         "SAP",
    scraperKey:   "sap",
    url:          "https://jobs.sap.com",
    keywords:     "software engineer",
    cronSchedule: "0 8 * * 3",    // Every Wednesday 08:00
    isActive:     true,
  },
  {
    name:         "Software AG",
    scraperKey:   "softwareag",
    url:          "https://jobs.dayforcehcm.com/en-US/sagann/sagportal",
    keywords:     "software engineer",
    cronSchedule: "0 8 * * 4",    // Every Thursday 08:00
    isActive:     true,
  },
  {
    name:         "TeamViewer",
    scraperKey:   "teamviewer",
    url:          "https://careers.teamviewer.com",
    keywords:     "software engineer",
    cronSchedule: "0 8 * * 5",    // Every Friday 08:00
    isActive:     true,
  },
];

const G = "\x1b[32m"; const R = "\x1b[31m"; const C = "\x1b[36m";
const B = "\x1b[1m";  const D = "\x1b[2m";  const X = "\x1b[0m";

async function main() {
  console.log(`\n${B}Seeding German IT company sites…${X}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log(`${D}Connected to MongoDB${X}\n`);

  let created = 0;
  let updated = 0;

  for (const seed of GERMAN_SITES) {
    const existing = await Site.findOne({ scraperKey: seed.scraperKey });

    if (existing) {
      await Site.updateOne({ scraperKey: seed.scraperKey }, { $set: seed });
      console.log(`  ${C}↻  Updated ${X} ${B}${seed.name}${X} ${D}(${seed.scraperKey})${X}`);
      updated++;
    } else {
      await Site.create({ ...seed, lastRunAt: null, nextRunAt: null, lastRunStatus: "never" });
      console.log(`  ${G}+  Created ${X} ${B}${seed.name}${X} ${D}(${seed.scraperKey} · ${seed.cronSchedule})${X}`);
      created++;
    }
  }

  console.log(`\n${B}Done.${X} ${G}${created} created${X}  ${C}${updated} updated${X}`);
  console.log(`${D}Total sites seeded: ${GERMAN_SITES.length}${X}\n`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(`${R}Error:${X}`, e.message); process.exit(1); });
