/**
 * Classify and clean up Germany jobs.
 *
 * Strategy:
 *   - Non-Germany jobs are NOT deleted from MongoDB.
 *     They are kept with isGermany: false so that future scraper runs skip
 *     them via URL dedup (findOne({ url })) — no re-classification needed.
 *   - The UI already filters by isGermany: true, so they never appear.
 *
 * Steps:
 *   1. Classify all unclassified jobs (isGermany null/missing) using a fast
 *      keyword heuristic, with Ollama as fallback for ambiguous locations.
 *   2. Set isGermany: true or false on each job.
 *   3. Print summary.
 *
 * Usage:
 *   node scripts/classify-germany-jobs.mjs [--dry-run]
 *
 * --dry-run  : classify and print results without writing to the database.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
try {
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
  }
} catch { /* ignore */ }

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌  MONGODB_URI not set"); process.exit(1); }

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL ?? "llama3";
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Germany heuristic (mirrors lib/ollama.ts)
// ---------------------------------------------------------------------------
const GERMANY_KEYWORDS = [
  "germany", "deutschland", "german",
  "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln",
  "düsseldorf", "dusseldorf", "stuttgart", "leipzig", "dortmund", "essen",
  "bremen", "hannover", "nuremberg", "nürnberg", "bonn", "karlsruhe",
  "mannheim", "augsburg", "wiesbaden", "bielefeld", "bochum", "münster",
  "kassel", "halle", "braunschweig", "krefeld", "lübeck", "erfurt", "mainz",
  "paderborn", "regensburg", "saarbrücken", "aachen", "kiel",
  " de,", ", de ", "(de)", "germany,", ", germany",
];

async function isGermanyHeuristic(location, title, company) {
  const combined = `${(location ?? "").toLowerCase()} ${(title ?? "").toLowerCase()}`;

  if (GERMANY_KEYWORDS.some((kw) => combined.includes(kw))) return true;

  // Clearly not Germany
  if (!location || ["remote", "worldwide", "global", "anywhere"].includes(location.toLowerCase())) {
    return false;
  }

  // Fallback to Ollama
  const prompt = `Is this job located in Germany? Answer only "yes" or "no".
Job title: ${title}
Company: ${company}
Location: ${location}`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.response ?? "").toLowerCase().trim().startsWith("yes");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mongoose model (minimal)
// ---------------------------------------------------------------------------
const JobSchema = new mongoose.Schema({
  title: String, company: String, location: String,
  isGermany: { type: Boolean, default: null },
}, { strict: false });

const Job = mongoose.models?.Job ?? mongoose.model("Job", JobSchema);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  if (DRY_RUN) console.log("🔍  DRY RUN — no writes will be made\n");

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected\n");

  // 1. Find all jobs where isGermany is not yet set (null / undefined / missing)
  const unclassified = await Job.find({
    $or: [{ isGermany: null }, { isGermany: { $exists: false } }],
  }).lean();

  console.log(`📦  ${unclassified.length} unclassified jobs to process`);
  console.log(`📦  (already classified jobs will be left as-is)\n`);

  let germanyCount  = 0;
  let nonGermanyCount = 0;

  for (let i = 0; i < unclassified.length; i++) {
    const job = unclassified[i];
    const isGermany = await isGermanyHeuristic(job.location, job.title, job.company);

    if (i % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${unclassified.length}  (🇩🇪 ${germanyCount}  ✗ ${nonGermanyCount})`);
    }

    if (isGermany) {
      germanyCount++;
      if (!DRY_RUN) {
        await Job.findByIdAndUpdate(job._id, { isGermany: true });
      }
    } else {
      nonGermanyCount++;
      // Mark as false but KEEP in DB — URL dedup prevents re-scraping + re-classifying
      if (!DRY_RUN) {
        await Job.findByIdAndUpdate(job._id, { isGermany: false });
      }
    }
  }

  process.stdout.write("\n");

  console.log(`\n📊  Classification results:`);
  console.log(`    🇩🇪 Germany   : ${germanyCount}`);
  console.log(`    ✗  Non-Germany: ${nonGermanyCount} (kept in DB with isGermany=false to prevent re-scraping)`);

  if (DRY_RUN) {
    console.log(`\n🔍  Dry run — no writes made.`);
  } else {
    console.log(`\n✅  All jobs classified. Non-Germany jobs hidden from UI but retained for dedup.`);
  }

  await mongoose.disconnect();
  console.log("\n🔌  Disconnected. Done.");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
