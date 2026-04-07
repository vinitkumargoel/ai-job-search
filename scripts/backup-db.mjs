/**
 * MongoDB Backup Script
 *
 * Dumps all collections to JSON files in scripts/db-backup/
 * Safe to commit — contains your sites config, jobs, and skipped URLs.
 *
 * Usage:
 *   node scripts/backup-db.mjs          # creates scripts/db-backup/*.json
 *
 * Restore on a new machine:
 *   node scripts/restore-db.mjs
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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

const BACKUP_DIR = resolve(__dirname, "db-backup");

const COLLECTIONS = ["sites", "jobs", "skippedurls", "resumes", "cronlogs"];

async function run() {
  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected\n");

  mkdirSync(BACKUP_DIR, { recursive: true });

  const db = mongoose.connection.db;
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

  for (const name of COLLECTIONS) {
    if (!existingCollections.includes(name)) {
      console.log(`  ⏭️   ${name.padEnd(15)} (not found, skipping)`);
      continue;
    }

    const docs = await db.collection(name).find({}).toArray();
    const filePath = resolve(BACKUP_DIR, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(docs, null, 2));
    console.log(`  ✅  ${name.padEnd(15)} ${docs.length} documents → db-backup/${name}.json`);
  }

  console.log(`\n📦  Backup complete → scripts/db-backup/`);
  await mongoose.disconnect();
  console.log("🔌  Done.");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
