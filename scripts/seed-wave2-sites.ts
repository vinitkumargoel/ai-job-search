/**
 * Seed script — inserts 10 Wave 2 German unicorn/scale-up job sites into MongoDB.
 *
 * Usage:
 *   npx tsx scripts/seed-wave2-sites.ts
 *
 * Safe to re-run — skips any site whose scraperKey already exists in the DB.
 * Only creates sites that are genuinely new; never overwrites existing config.
 *
 * Sites added (April 2026 — Wave 2):
 *   SumUp          — Greenhouse  — Berlin (fintech / card payments)
 *   Trade Republic — Greenhouse  — Berlin (neobroker / $5B valuation)
 *   Grover         — Greenhouse  — Berlin (tech rental subscription)
 *   Staffbase      — Greenhouse  — Berlin/Chemnitz (employee comms SaaS)
 *   Isar Aerospace — Greenhouse  — Munich/Ottobrunn (orbital rockets)
 *   Personio       — Ashby       — Munich/Berlin (HR SaaS, $8.5B valuation)
 *   Enpal          — Ashby       — Berlin (solar energy unicorn)
 *   Forto          — Ashby       — Berlin/Hamburg (digital freight forwarding)
 *   Billie         — Ashby       — Berlin (B2B BNPL fintech)
 *   Sennder        — SmartRecruiters — Berlin (road freight logistics)
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

const WAVE2_SITES: SiteSeed[] = [
  // ── Greenhouse ──────────────────────────────────────────────────────────────
  {
    name:         "SumUp",
    scraperKey:   "sumup",
    url:          "https://api.greenhouse.io/v1/boards/sumup/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 1",   // Every Monday 06:00
    isActive:     true,
  },
  {
    name:         "Trade Republic",
    scraperKey:   "traderepublic",
    url:          "https://api.greenhouse.io/v1/boards/TradeRepublicBank/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 2",   // Every Tuesday 06:00
    isActive:     true,
  },
  {
    name:         "Grover",
    scraperKey:   "grover",
    url:          "https://api.greenhouse.io/v1/boards/Grover/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 3",   // Every Wednesday 06:00
    isActive:     true,
  },
  {
    name:         "Staffbase",
    scraperKey:   "staffbase",
    url:          "https://api.greenhouse.io/v1/boards/Staffbase/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 4",   // Every Thursday 06:00
    isActive:     true,
  },
  {
    name:         "Isar Aerospace",
    scraperKey:   "isaraerospace",
    url:          "https://api.greenhouse.io/v1/boards/IsarAerospace/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 5",   // Every Friday 06:00
    isActive:     true,
  },

  // ── Ashby ───────────────────────────────────────────────────────────────────
  {
    name:         "Personio",
    scraperKey:   "personio",
    url:          "https://jobs.ashbyhq.com/personio",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 6",   // Every Saturday 06:00
    isActive:     true,
  },
  {
    name:         "Enpal",
    scraperKey:   "enpal",
    url:          "https://jobs.ashbyhq.com/enpal",
    keywords:     "engineer",
    cronSchedule: "0 6 * * 0",   // Every Sunday 06:00
    isActive:     true,
  },
  {
    name:         "Forto",
    scraperKey:   "forto",
    url:          "https://jobs.ashbyhq.com/forto",
    keywords:     "engineer",
    cronSchedule: "0 9 * * 1",   // Every Monday 09:00 (staggered)
    isActive:     true,
  },
  {
    name:         "Billie",
    scraperKey:   "billie",
    url:          "https://jobs.ashbyhq.com/billie",
    keywords:     "engineer",
    cronSchedule: "0 9 * * 3",   // Every Wednesday 09:00 (staggered)
    isActive:     true,
  },

  // ── SmartRecruiters ──────────────────────────────────────────────────────────
  {
    name:         "Sennder",
    scraperKey:   "sennder",
    url:          "https://api.smartrecruiters.com/v1/companies/SennderGmbH/postings?country=de",
    keywords:     "engineer",
    cronSchedule: "0 9 * * 5",   // Every Friday 09:00 (staggered)
    isActive:     true,
  },
];

const G = "\x1b[32m"; const R = "\x1b[31m"; const D = "\x1b[2m";
const B = "\x1b[1m";  const X = "\x1b[0m";

async function main() {
  console.log(`\n${B}Seeding Wave 2 German unicorn/scale-up sites…${X}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log(`${D}Connected to MongoDB${X}\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of WAVE2_SITES) {
    const existing = await Site.findOne({ scraperKey: seed.scraperKey });

    if (existing) {
      console.log(
        `  ${D}–  Skipped${X}  ${B}${seed.name}${X} ${D}(${seed.scraperKey} already exists)${X}`
      );
      skipped++;
    } else {
      await Site.create({
        ...seed,
        lastRunAt:     null,
        nextRunAt:     null,
        lastRunStatus: "never",
      });
      console.log(
        `  ${G}+  Created${X}  ${B}${seed.name}${X} ${D}(${seed.scraperKey} · ${seed.cronSchedule})${X}`
      );
      created++;
    }
  }

  console.log(
    `\n${B}Done.${X}  ${G}${created} created${X}  ${D}${skipped} skipped (already existed)${X}`
  );
  console.log(`${D}Total Wave 2 sites checked: ${WAVE2_SITES.length}${X}\n`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(`${R}Error:${X}`, e.message);
  process.exit(1);
});
