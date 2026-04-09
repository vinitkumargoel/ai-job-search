/**
 * Seed script — inserts 8 new German IT startup job sites into MongoDB.
 *
 * Usage:
 *   npx tsx scripts/seed-startup-sites.ts
 *
 * Safe to re-run — skips any site whose scraperKey already exists in the DB.
 * Only creates sites that are genuinely new; never overwrites existing config.
 *
 * Sites added (April 2026):
 *   Parloa       — Greenhouse  — Berlin/Munich (conversational AI)
 *   Helsing      — Greenhouse  — Berlin/Munich (defence AI)
 *   Black Forest Labs — Greenhouse — Freiburg (visual AI / FLUX)
 *   n8n          — Ashby       — Berlin (workflow automation)
 *   DeepL        — Ashby       — Cologne/Berlin (AI translation)
 *   Aleph Alpha  — Ashby       — Heidelberg (sovereign LLMs)
 *   Sereact      — Ashby       — Stuttgart (robotics AI)
 *   Quantum Systems — Personio — Munich (autonomous drones)
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
  notes?:       string;
}

// Stagger across days Mon–Sun so scrapers don't all fire at once.
const STARTUP_SITES: SiteSeed[] = [
  // ── Greenhouse ──────────────────────────────────────────────────────────────
  {
    name:         "Parloa",
    scraperKey:   "parloa",
    url:          "https://api.greenhouse.io/v1/boards/parloa/jobs?content=true",
    keywords:     "software engineer",
    cronSchedule: "0 7 * * 1",   // Every Monday 07:00
    isActive:     true,
  },
  {
    name:         "Helsing",
    scraperKey:   "helsing",
    url:          "https://api.greenhouse.io/v1/boards/helsing/jobs?content=true",
    keywords:     "software engineer",
    cronSchedule: "0 7 * * 2",   // Every Tuesday 07:00
    isActive:     true,
  },
  {
    name:         "Black Forest Labs",
    scraperKey:   "blackforestlabs",
    url:          "https://api.greenhouse.io/v1/boards/blackforestlabs/jobs?content=true",
    keywords:     "software engineer",
    cronSchedule: "0 7 * * 3",   // Every Wednesday 07:00
    isActive:     true,
  },

  // ── Ashby ───────────────────────────────────────────────────────────────────
  {
    name:         "n8n",
    scraperKey:   "n8n",
    url:          "https://jobs.ashbyhq.com/n8n",
    keywords:     "engineer",
    cronSchedule: "0 7 * * 4",   // Every Thursday 07:00
    isActive:     true,
  },
  {
    name:         "DeepL",
    scraperKey:   "deepl",
    url:          "https://jobs.ashbyhq.com/DeepL",
    keywords:     "engineer",
    cronSchedule: "0 7 * * 5",   // Every Friday 07:00
    isActive:     true,
  },
  {
    name:         "Aleph Alpha",
    scraperKey:   "alephalpha",
    url:          "https://jobs.ashbyhq.com/AlephAlpha",
    keywords:     "engineer",
    cronSchedule: "0 7 * * 6",   // Every Saturday 07:00
    isActive:     true,
  },
  {
    name:         "Sereact",
    scraperKey:   "sereact",
    url:          "https://jobs.ashbyhq.com/sereact",
    keywords:     "engineer",
    cronSchedule: "0 7 * * 0",   // Every Sunday 07:00
    isActive:     true,
  },

  // ── Personio ─────────────────────────────────────────────────────────────────
  {
    name:         "Quantum Systems",
    scraperKey:   "quantumsystems",
    url:          "https://quantum-systems.jobs.personio.de/",
    keywords:     "engineer",
    cronSchedule: "0 8 * * 1",   // Every Monday 08:00 (staggered after Parloa)
    isActive:     true,
  },
];

const G = "\x1b[32m"; const R = "\x1b[31m"; const C = "\x1b[36m";
const B = "\x1b[1m";  const D = "\x1b[2m";  const X = "\x1b[0m";

async function main() {
  console.log(`\n${B}Seeding German IT startup sites…${X}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log(`${D}Connected to MongoDB${X}\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of STARTUP_SITES) {
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
  console.log(
    `${D}Total startup sites checked: ${STARTUP_SITES.length}${X}\n`
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(`${R}Error:${X}`, e.message);
  process.exit(1);
});
