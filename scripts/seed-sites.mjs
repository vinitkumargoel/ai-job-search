/**
 * Seed script — creates Site documents for all 4 scrapers.
 * Safe to re-run: uses upsert on name so it won't create duplicates.
 *
 * Usage: node scripts/seed-sites.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of env.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] ??= t.slice(eq + 1).trim();
  }
} catch { /* ignore */ }

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌  MONGODB_URI not set"); process.exit(1); }

const SiteSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  scraperKey:     { type: String, required: true },
  url:            { type: String, required: true },
  keywords:       { type: String, default: "" },
  cronSchedule:   { type: String, default: "0 9 * * *" },
  isActive:       { type: Boolean, default: true },
  lastRunAt:      { type: Date, default: null },
  nextRunAt:      { type: Date, default: null },
  lastRunStatus:  { type: String, default: "never" },
}, { timestamps: true });

const Site = mongoose.models?.Site ?? mongoose.model("Site", SiteSchema);

const SITES = [
  {
    name:         "Celonis",
    scraperKey:   "celonis",
    url:          "https://api.greenhouse.io/v1/boards/celonis/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Contentful",
    scraperKey:   "contentful",
    url:          "https://api.greenhouse.io/v1/boards/contentful/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "SAP Fioneer",
    scraperKey:   "sapfioneer",
    url:          "https://apply.workable.com/api/v3/accounts/fioneer/jobs",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Bosch",
    scraperKey:   "bosch",
    url:          "https://api.smartrecruiters.com/v1/companies/BoschGroup/postings?country=de&limit=50",
    keywords:     "software engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Check24",
    scraperKey:   "check24",
    url:          "https://api.smartrecruiters.com/v1/companies/Check24/postings?country=de&limit=100",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Delivery Hero",
    scraperKey:   "deliveryhero",
    url:          "https://api.smartrecruiters.com/v1/companies/DeliveryHero/postings?country=de&limit=100",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Zalando",
    scraperKey:   "zalando",
    url:          "https://jobs.zalando.com/en/jobs?location=Germany",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "N26",
    scraperKey:   "n26",
    url:          "https://api.greenhouse.io/v1/boards/n26/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Raisin",
    scraperKey:   "raisin",
    url:          "https://api.greenhouse.io/v1/boards/raisin/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "commercetools",
    scraperKey:   "commercetools",
    url:          "https://api.greenhouse.io/v1/boards/commercetools/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "HelloFresh",
    scraperKey:   "hellofresh",
    url:          "https://api.greenhouse.io/v1/boards/hellofresh/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "GetYourGuide",
    scraperKey:   "getyourguide",
    url:          "https://api.greenhouse.io/v1/boards/getyourguide/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Flix",
    scraperKey:   "flix",
    url:          "https://api.greenhouse.io/v1/boards/flix/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
  {
    name:         "Scout24",
    scraperKey:   "scout24",
    url:          "https://api.greenhouse.io/v1/boards/scout24/jobs?content=true",
    keywords:     "engineer",
    cronSchedule: "0 8 * * *",
    isActive:     true,
  },
];

async function run() {
  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected\n");

  for (const site of SITES) {
    const result = await Site.findOneAndUpdate(
      { name: site.name },
      { $set: site },
      { upsert: true, new: true }
    );
    console.log(`  ✅  ${site.name.padEnd(15)} scraperKey=${site.scraperKey}  id=${result._id}`);
  }

  const total = await Site.countDocuments();
  console.log(`\n📦  Total sites in DB: ${total}`);
  await mongoose.disconnect();
  console.log("🔌  Done.");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
