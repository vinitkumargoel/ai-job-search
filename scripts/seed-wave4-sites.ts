/**
 * Seed script — inserts 10 Wave 4 German IT & service company job sites.
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/ai-job-search npx tsx scripts/seed-wave4-sites.ts
 *
 * Safe to re-run — skips any scraperKey already in the DB.
 *
 * Sites (April 2026 — Wave 4: German IT & Service Companies):
 *   Wolt                — Greenhouse  — Berlin       (food-delivery tech platform)
 *   IONOS               — Greenhouse  — Karlsruhe    (cloud hosting & web services)
 *   Doctolib            — Greenhouse  — Berlin       (healthtech, digital healthcare)
 *   MOIA                — Greenhouse  — Hamburg      (VW Group autonomous mobility)
 *   Wayve               — Greenhouse  — Germany      (autonomous driving AI startup)
 *   Wunderflats         — Greenhouse  — Berlin       (furnished apartment proptech)
 *   Adyen               — Greenhouse  — Berlin       (global payments platform)
 *   Tulip               — Greenhouse  — Munich       (industrial IoT / manufacturing)
 *   Hetzner             — Custom      — Nuremberg    (cloud infrastructure / hosting)
 *   Deutsche Telekom IT — SR          — Darmstadt    (Telekom Group IT backbone)
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

const WAVE4_SITES: SiteSeed[] = [
  // ── Greenhouse ──────────────────────────────────────────────────────────────
  {
    name:         "Wolt",
    scraperKey:   "wolt",
    url:          "https://api.greenhouse.io/v1/boards/wolt/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 1",   // Every Monday 06:00
    isActive:     true,
  },
  {
    name:         "IONOS",
    scraperKey:   "ionos",
    url:          "https://api.greenhouse.io/v1/boards/ionos/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 2",   // Every Tuesday 06:00
    isActive:     true,
  },
  {
    name:         "Doctolib",
    scraperKey:   "doctolib",
    url:          "https://api.greenhouse.io/v1/boards/doctolib/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 3",   // Every Wednesday 06:00
    isActive:     true,
  },
  {
    name:         "MOIA",
    scraperKey:   "moia",
    url:          "https://api.greenhouse.io/v1/boards/moia/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 4",   // Every Thursday 06:00
    isActive:     true,
  },
  {
    name:         "Wayve",
    scraperKey:   "wayve",
    url:          "https://api.greenhouse.io/v1/boards/wayve/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 5",   // Every Friday 06:00
    isActive:     true,
  },
  {
    name:         "Wunderflats",
    scraperKey:   "wunderflats",
    url:          "https://api.greenhouse.io/v1/boards/wunderflats/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 6",   // Every Saturday 06:00
    isActive:     true,
  },
  {
    name:         "Adyen",
    scraperKey:   "adyen",
    url:          "https://api.greenhouse.io/v1/boards/adyen/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 0",   // Every Sunday 06:00
    isActive:     true,
  },
  {
    name:         "Tulip",
    scraperKey:   "tulip",
    url:          "https://api.greenhouse.io/v1/boards/tulip/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 11 * * 1",  // Every Monday 11:00 (staggered)
    isActive:     true,
  },

  // ── Custom (sitemap + JSON-LD) ────────────────────────────────────────────
  {
    name:         "Hetzner Online",
    scraperKey:   "hetzner",
    url:          "https://career.hetzner.com/en/jobs",
    keywords:     "engineer",
    cronSchedule: "0 11 * * 3",  // Every Wednesday 11:00
    isActive:     true,
  },

  // ── SmartRecruiters ──────────────────────────────────────────────────────────
  {
    name:         "Deutsche Telekom IT Solutions",
    scraperKey:   "telekom-it",
    url:          "https://api.smartrecruiters.com/v1/companies/DeutscheTelekomITSolutions/postings",
    keywords:     "engineer",
    cronSchedule: "0 11 * * 5",  // Every Friday 11:00
    isActive:     true,
  },
];

const G = "\x1b[32m"; const R = "\x1b[31m"; const D = "\x1b[2m";
const B = "\x1b[1m";  const X = "\x1b[0m";

async function main() {
  console.log(`\n${B}Seeding Wave 4 German IT & service company sites…${X}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log(`${D}Connected to MongoDB${X}\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of WAVE4_SITES) {
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
  console.log(`${D}Total Wave 4 sites checked: ${WAVE4_SITES.length}${X}\n`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(`${R}Error:${X}`, e.message); process.exit(1); });
