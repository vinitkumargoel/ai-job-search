/**
 * Smoke test — Wave 4 scrapers (German IT & service companies)
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/test-wave4-scrapers.ts
 *
 * Tests each scraper with firstPageOnly=true and keywords="engineer".
 * Expected: at least 1 job returned from each.
 *
 * Phase 1 (fetch-based, parallel):  Wolt, IONOS, Doctolib, MOIA, Wayve,
 *                                   Wunderflats, Adyen, Tulip, Telekom IT
 * Phase 2 (custom scraper):         Hetzner (sitemap + JSON-LD, sequential)
 */

import { scraperRegistry } from "../scrapers/index";

const KEYWORDS = "engineer";
const WAVE4_KEYS = [
  "wolt", "ionos", "doctolib", "moia", "wayve",
  "wunderflats", "adyen", "tulip", "telekom-it",
  "hetzner",
];

interface TestResult {
  key:     string;
  pass:    boolean;
  count:   number;
  elapsed: number;
  error?:  string;
  sample?: string;
}

const G = "\x1b[32m"; const R = "\x1b[31m"; const D = "\x1b[2m";
const B = "\x1b[1m";  const Y = "\x1b[33m"; const X = "\x1b[0m";

async function runScraper(key: string): Promise<TestResult> {
  const scraper = scraperRegistry[key];
  if (!scraper) {
    return { key, pass: false, count: 0, elapsed: 0, error: "not in registry" };
  }

  const start = Date.now();
  try {
    const jobs = await scraper.scrape({
      url:           "",
      keywords:      KEYWORDS,
      // @ts-expect-error — firstPageOnly is a non-standard extension used in smoke tests
      firstPageOnly: true,
    });
    const elapsed = Date.now() - start;
    const sample  = jobs[0]?.title ?? "(no title)";
    return { key, pass: jobs.length > 0, count: jobs.length, elapsed, sample };
  } catch (err) {
    return {
      key,
      pass:    false,
      count:   0,
      elapsed: Date.now() - start,
      error:   err instanceof Error ? err.message : String(err),
    };
  }
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

async function main() {
  console.log(`\n${B}Wave 4 scraper smoke tests${X}\n`);

  // Phase 1 — fetch-based scrapers (run in parallel)
  const phase1Keys = WAVE4_KEYS.filter((k) => k !== "hetzner");
  const phase2Keys = ["hetzner"];

  console.log(`${D}Phase 1 — fetch-based (parallel):${X}`);
  const phase1Results = await Promise.all(phase1Keys.map(runScraper));

  for (const r of phase1Results) {
    const icon  = r.pass ? `${G}✔ PASS${X}` : `${R}✘ FAIL${X}`;
    const count = String(r.count).padStart(4) + " jobs";
    const time  = `~${Math.round(r.elapsed / 100) / 10}s`;
    const extra = r.error ? ` ${R}[${r.error}]${X}` : r.sample ? ` ${D}"${r.sample.slice(0, 60)}"${X}` : "";
    console.log(`  ${icon}  ${pad(r.key, 18)} ${Y}${count}${X}  ${D}${time}${X}${extra}`);
  }

  console.log(`\n${D}Phase 2 — custom scraper (Hetzner sitemap):${X}`);
  const phase2Results: TestResult[] = [];
  for (const key of phase2Keys) {
    const r = await runScraper(key);
    phase2Results.push(r);
    const icon  = r.pass ? `${G}✔ PASS${X}` : `${R}✘ FAIL${X}`;
    const count = String(r.count).padStart(4) + " jobs";
    const time  = `~${Math.round(r.elapsed / 100) / 10}s`;
    const extra = r.error ? ` ${R}[${r.error}]${X}` : r.sample ? ` ${D}"${r.sample.slice(0, 60)}"${X}` : "";
    console.log(`  ${icon}  ${pad(r.key, 18)} ${Y}${count}${X}  ${D}${time}${X}${extra}`);
  }

  const all    = [...phase1Results, ...phase2Results];
  const passed = all.filter((r) => r.pass).length;
  const failed = all.filter((r) => !r.pass).length;

  console.log(`\n${B}Results:${X}  ${G}${passed} passed${X}  ${failed > 0 ? R : D}${failed} failed${X}  of ${all.length} total\n`);

  if (failed > 0) {
    console.log(`${Y}Note:${X} Some scrapers may return 0 results on the ZI corporate network`);
    console.log(`      due to firewall blocks or SSL inspection. Run on the production server.`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(`${R}Error:${X}`, e.message); process.exit(1); });
