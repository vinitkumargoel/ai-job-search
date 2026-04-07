/**
 * MongoDB Restore Script
 *
 * Restores all collections from JSON files in scripts/db-backup/
 * Use this on a new machine after cloning the repo.
 *
 * Usage:
 *   node scripts/restore-db.mjs
 *
 * This is safe to run multiple times — uses upsert by _id so it won't
 * create duplicates if you run it again.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
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

if (!existsSync(BACKUP_DIR)) {
  console.error(`❌  Backup directory not found: ${BACKUP_DIR}`);
  console.error("    Run: node scripts/backup-db.mjs first");
  process.exit(1);
}

async function run() {
  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected\n");

  const db = mongoose.connection.db;
  const files = readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error("❌  No backup files found in scripts/db-backup/");
    process.exit(1);
  }

  for (const file of files) {
    const collectionName = file.replace(".json", "");
    const filePath = resolve(BACKUP_DIR, file);
    const docs = JSON.parse(readFileSync(filePath, "utf8"));

    if (docs.length === 0) {
      console.log(`  ⏭️   ${collectionName.padEnd(15)} (empty, skipping)`);
      continue;
    }

    const collection = db.collection(collectionName);
    let upserted = 0;
    let skipped = 0;

    for (const doc of docs) {
      const { _id, ...rest } = doc;
      // Convert string _id back to ObjectId if needed
      let id;
      try {
        id = new mongoose.Types.ObjectId(String(_id));
      } catch {
        id = _id;
      }

      const result = await collection.updateOne(
        { _id: id },
        { $setOnInsert: { _id: id, ...rest } },
        { upsert: true }
      );
      if (result.upsertedCount > 0) upserted++;
      else skipped++;
    }

    console.log(`  ✅  ${collectionName.padEnd(15)} ${upserted} inserted, ${skipped} already existed`);
  }

  console.log(`\n🎉  Restore complete!`);
  console.log("    Next steps:");
  console.log("    1. cp .env.example .env.local  (then fill in your values)");
  console.log("    2. npm run dev");
  await mongoose.disconnect();
  console.log("🔌  Done.");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
