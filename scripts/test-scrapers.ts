/**
 * Smoke-test for all German IT company scrapers.
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/test-scrapers.ts
 *
 * Fetch-based scrapers (Zeiss, SAP, TeamViewer) run in parallel.
 * Puppeteer scrapers (Siemens, SoftwareAG) run sequentially to avoid pool contention.
 * Each scraper is capped at TIMEOUT_MS. Puppeteer scrapers use firstPageOnly=true.
 */

import { ZeissScraper }      from "../scrapers/zeiss";
import { SiemensScraper }    from "../scrapers/siemens";
import { SapScraper }        from "../scrapers/sap";
import { SoftwareAgScraper } from "../scrapers/softwareag";
import { TeamViewerScraper } from "../scrapers/teamviewer";
import { closeBrowser }      from "../lib/puppeteerBrowser";
import type { ScraperStrategy, ScrapedJob } from "../scrapers/types";

// Fetch-based — fast, safe to run in parallel
const FETCH_SCRAPERS: ScraperStrategy[] = [ZeissScraper, SapScraper, TeamViewerScraper];

// Puppeteer-based — run sequentially to share the page pool cleanly
const PUPPET_SCRAPERS: ScraperStrategy[] = [SiemensScraper, SoftwareAgScraper];

const FETCH_CONFIG  = { url: "", keywords: "software engineer" };
const PUPPET_CONFIG = { url: "", keywords: "software engineer", firstPageOnly: true };
const FETCH_TIMEOUT = 30_000;
const PUPPET_TIMEOUT = 45_000;

// Run Puppeteer scrapers concurrently — each gets its own pool page
const PUPPET_CONCURRENT = true;

const G = "\x1b[32m"; const R = "\x1b[31m"; const Y = "\x1b[33m";
const C = "\x1b[36m"; const B = "\x1b[1m";  const D = "\x1b[2m"; const X = "\x1b[0m";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Timed out after ${ms / 1000}s`)), ms)),
  ]);
}

type Result = { name: string; ok: boolean; count: number; ms: number; error?: string; sample?: ScrapedJob };

async function runOne(s: ScraperStrategy, config: typeof FETCH_CONFIG, timeoutMs: number): Promise<Result> {
  const t0 = Date.now();
  try {
    const jobs = await withTimeout(s.scrape(config), timeoutMs);
    return { name: s.name, ok: true, count: jobs.length, ms: Date.now() - t0, sample: jobs[0] };
  } catch (e: unknown) {
    return { name: s.name, ok: false, count: 0, ms: Date.now() - t0, error: String(e) };
  }
}

function printResult(r: Result) {
  if (r.ok && r.count > 0) {
    console.log(`${G}✔ PASS${X}  ${G}${r.count} jobs${X}  ${D}(${r.ms}ms)${X}`);
    if (r.sample) {
      console.log(`     ${C}Title   :${X} ${r.sample.title}`);
      console.log(`     ${C}Location:${X} ${r.sample.location}`);
      const desc = (r.sample.description || "").replace(/\s+/g, " ").slice(0, 100);
      if (desc) console.log(`     ${C}Desc    :${X} ${D}${desc}…${X}`);
    }
  } else if (r.ok) {
    console.log(`${Y}⚠ EMPTY${X}  ${D}(${r.ms}ms)${X}`);
  } else {
    console.log(`${R}✘ FAIL${X}  ${D}(${r.ms}ms)${X}`);
    const e = r.error ?? "";
    if (e.includes("Timed out"))          console.log(`     ${R}Timed out${X}`);
    else if (e.includes("UNABLE_TO_GET")) console.log(`     ${R}SSL cert error — run with NODE_TLS_REJECT_UNAUTHORIZED=0${X}`);
    else if (e.includes("fetch failed"))  console.log(`     ${R}Network blocked${X}`);
    else                                  console.log(`     ${R}${e.slice(0, 120)}${X}`);
  }
  console.log();
}

async function main() {
  console.log(`\n${B}╔══════════════════════════════════════════════════╗${X}`);
  console.log(`${B}║   Scraper Smoke Test — German IT Companies       ║${X}`);
  console.log(`${B}╚══════════════════════════════════════════════════╝${X}\n`);

  // Pre-warm Puppeteer browser
  process.stdout.write(`  ${D}Warming up Puppeteer...${X}`);
  const { withPage } = await import("../lib/puppeteerBrowser");
  await withPage(async () => {}).catch(() => {});
  console.log(` ${G}ready${X}\n`);

  const results: Result[] = [];

  // ── Phase 1: fetch-based scrapers in parallel ──────────────────────────
  console.log(`  ${D}[Phase 1] Fetch-based scrapers (parallel)${X}\n`);
  const fetchPromises = FETCH_SCRAPERS.map(s => runOne(s, FETCH_CONFIG, FETCH_TIMEOUT));
  const fetchResults  = await Promise.all(fetchPromises);

  for (let i = 0; i < FETCH_SCRAPERS.length; i++) {
    process.stdout.write(`  ${B}[${FETCH_SCRAPERS[i].name.padEnd(12)}]${X} `);
    printResult(fetchResults[i]);
    results.push(fetchResults[i]);
  }

  // ── Phase 2: Puppeteer scrapers (concurrent — each uses own pool page) ─
  console.log(`  ${D}[Phase 2] Puppeteer scrapers (concurrent, first page only)${X}\n`);

  const puppetResults = await Promise.all(
    PUPPET_SCRAPERS.map(s => runOne(s, PUPPET_CONFIG, PUPPET_TIMEOUT))
  );

  for (let i = 0; i < PUPPET_SCRAPERS.length; i++) {
    process.stdout.write(`  ${B}[${PUPPET_SCRAPERS[i].name.padEnd(12)}]${X} `);
    printResult(puppetResults[i]);
    results.push(puppetResults[i]);
  }

  await closeBrowser();

  // ── Summary ────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok && r.count > 0).length;
  const empty  = results.filter(r => r.ok && r.count === 0).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`);
  console.log(`  ${"Scraper".padEnd(14)} ${"Status".padEnd(12)} ${"Jobs".padEnd(8)} Time`);
  console.log(`  ${"─".repeat(44)}`);
  for (const r of results) {
    const status = r.ok && r.count > 0 ? `${G}PASS${X}` : r.ok ? `${Y}EMPTY${X}` : `${R}FAIL${X}`;
    const jobs   = r.ok && r.count > 0 ? `${G}${String(r.count).padEnd(8)}${X}` : r.ok ? `${Y}0       ${X}` : `${R}—       ${X}`;
    console.log(`  ${r.name.padEnd(14)} ${status.padEnd(16)} ${jobs} ${D}${r.ms}ms${X}`);
  }
  console.log(`\n  ${G}${passed} passed${X}  ${Y}${empty} empty${X}  ${failed > 0 ? R : ""}${failed} failed${X}`);
  console.log(`${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}\n`);

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
