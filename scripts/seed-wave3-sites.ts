/**
 * Seed script — inserts 10 Wave 3 biggest German product company job sites.
 *
 * Usage:
 *   npx tsx scripts/seed-wave3-sites.ts
 *
 * Safe to re-run — skips any scraperKey already in the DB.
 *
 * Sites (April 2026 — Wave 3: Biggest German Product Companies):
 *   Trivago        — Greenhouse  — Düsseldorf (hotel metasearch)
 *   Flaconi        — Greenhouse  — Berlin (beauty e-commerce)
 *   FREE NOW       — Greenhouse  — Berlin/Hamburg (mobility platform)
 *   AUTO1 Group    — SR          — Berlin (used cars marketplace)
 *   About You      — SR          — Hamburg (fashion e-commerce)
 *   Scalable Cap.  — SR          — Berlin/Munich (digital investment)
 *   SIXT           — SR          — Munich (car rental tech)
 *   Babbel         — Personio    — Berlin (language learning app)
 *   Idealo         — Personio    — Berlin (price comparison platform)
 *   Mambu          — Personio    — Berlin (cloud banking SaaS)
 */

import mongoose from "mongoose";
import Site from "../models/Site";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/ai-job-search";

interface SiteSeed {
  name:         string;
  scraperKey:   string;
  url:          string;
  keywords:     string;
  cronSchedule: string;
  isActive:     boolean;
}

const WAVE3_SITES: SiteSeed[] = [
  // ── Greenhouse ──────────────────────────────────────────────────────────────
  {
    name:         "Trivago",
    scraperKey:   "trivago",
    url:          "https://api.greenhouse.io/v1/boards/Trivago/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 1",   // Every Monday 05:00
    isActive:     true,
  },
  {
    name:         "Flaconi",
    scraperKey:   "flaconi",
    url:          "https://api.greenhouse.io/v1/boards/Flaconi/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 2",   // Every Tuesday 05:00
    isActive:     true,
  },
  {
    name:         "FREE NOW",
    scraperKey:   "freenow",
    url:          "https://api.greenhouse.io/v1/boards/FreeNow/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 3",   // Every Wednesday 05:00
    isActive:     true,
  },

  // ── SmartRecruiters ──────────────────────────────────────────────────────────
  {
    name:         "AUTO1 Group",
    scraperKey:   "auto1",
    url:          "https://api.smartrecruiters.com/v1/companies/Auto1/postings?country=de",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 4",   // Every Thursday 05:00
    isActive:     true,
  },
  {
    name:         "About You",
    scraperKey:   "aboutyou",
    url:          "https://api.smartrecruiters.com/v1/companies/AboutYouGmbH/postings?country=de",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 5",   // Every Friday 05:00
    isActive:     true,
  },
  {
    name:         "Scalable Capital",
    scraperKey:   "scalablecapital",
    url:          "https://api.smartrecruiters.com/v1/companies/ScalableGmbH/postings?country=de",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 6",   // Every Saturday 05:00
    isActive:     true,
  },
  {
    name:         "SIXT",
    scraperKey:   "sixt",
    url:          "https://api.smartrecruiters.com/v1/companies/Sixt/postings?country=de",
    keywords:     "engineer",
    cronSchedule: "0 5 * * 0",   // Every Sunday 05:00
    isActive:     true,
  },

  // ── Personio ─────────────────────────────────────────────────────────────────
  {
    name:         "Babbel",
    scraperKey:   "babbel",
    url:          "https://babbel.jobs.personio.de/",
    keywords:     "engineer",
    cronSchedule: "0 10 * * 1",  // Every Monday 10:00 (staggered)
    isActive:     true,
  },
  {
    name:         "Idealo",
    scraperKey:   "idealo",
    url:          "https://idealo.jobs.personio.de/",
    keywords:     "engineer",
    cronSchedule: "0 10 * * 3",  // Every Wednesday 10:00 (staggered)
    isActive:     true,
  },
  {
    name:         "Mambu",
    scraperKey:   "mambu",
    url:          "https://mambu.jobs.personio.de/",
    keywords:     "engineer",
    cronSchedule: "0 10 * * 5",  // Every Friday 10:00 (staggered)
    isActive:     true,
  },
];

const G = "\x1b[32m"; const R = "\x1b[31m"; const D = "\x1b[2m";
const B = "\x1b[1m";  const X = "\x1b[0m";

async function main() {
  console.log(`\n${B}Seeding Wave 3 biggest German product company sites…${X}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log(`${D}Connected to MongoDB${X}\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of WAVE3_SITES) {
    const existing = await Site.findOne({ scraperKey: seed.scraperKey });
    if (existing) {
      console.log(`  ${D}–  Skipped${X}  ${B}${seed.name}${X} ${D}(${seed.scraperKey} already exists)${X}`);
      skipped++;
    } else {
      await Site.create({ ...seed, lastRunAt: null, nextRunAt: null, lastRunStatus: "never" });
      console.log(`  ${G}+  Created${X}  ${B}${seed.name}${X} ${D}(${seed.scraperKey} · ${seed.cronSchedule})${X}`);
      created++;
    }
  }

  console.log(`\n${B}Done.${X}  ${G}${created} created${X}  ${D}${skipped} skipped (already existed)${X}`);
  console.log(`${D}Total Wave 3 sites checked: ${WAVE3_SITES.length}${X}\n`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(`${R}Error:${X}`, e.message); process.exit(1); });
