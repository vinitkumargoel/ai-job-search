/**
 * End-to-end scraper test script
 *
 * Tests: Celonis, Contentful, SAP Fioneer, Bosch
 *
 * For each scraper:
 *   1. Runs the scraper (Germany-filtered at API level)
 *   2. Prints first 3 jobs with FULL details (title, company, location, description, URL, postedAt)
 *   3. Checks Job + SkippedUrl collections for dedup
 *   4. Classifies location with heuristic (Ollama fallback)
 *   5. Inserts Germany jobs into jobs collection
 *   6. Stores non-Germany URLs in skippedurls collection
 *   7. Re-runs to confirm full dedup (0 Ollama calls, 0 inserts)
 *
 * Usage:  node scripts/test-scrapers.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] ??= t.slice(eq + 1).trim();
  }
} catch { /* ignore */ }

const MONGODB_URI     = process.env.MONGODB_URI;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    ?? "llama3";

if (!MONGODB_URI) { console.error("❌  MONGODB_URI not set"); process.exit(1); }

// ---------------------------------------------------------------------------
// Mongoose models
// ---------------------------------------------------------------------------
const JobSchema = new mongoose.Schema({
  siteId:       { type: mongoose.Schema.Types.ObjectId },
  siteName:     { type: String, required: true },
  title:        { type: String, required: true },
  url:          { type: String, required: true, unique: true },
  description:  { type: String, default: "" },
  summary:      { type: String, default: null },
  skills:       { type: [String], default: [] },
  experienceLevel: { type: String, default: null },
  employmentType:  { type: String, default: null },
  salary:       { type: String, default: null },
  benefits:     { type: [String], default: [] },
  germanRequired: { type: String, default: null },
  yearsOfExperience: { type: String, default: null },
  company:      { type: String, default: "" },
  location:     { type: String, default: "" },
  postedAt:     { type: String, default: "" },
  status:       { type: String, default: "new" },
  isNew:        { type: Boolean, default: true },
  matchScore:   { type: Number, default: null },
  matchReason:  { type: String, default: null },
  scrapedAt:    { type: Date, default: Date.now },
  notes:        { type: String, default: "" },
}, { timestamps: true, suppressReservedKeysWarning: true });

const SkippedUrlSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
}, { timestamps: true });

const Job        = mongoose.models?.Job        ?? mongoose.model("Job",        JobSchema);
const SkippedUrl = mongoose.models?.SkippedUrl ?? mongoose.model("SkippedUrl", SkippedUrlSchema);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

function stripHtml(html = "") {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Ollama enrichment (mirrors lib/ollama.ts enrichJobDescription)
// ---------------------------------------------------------------------------
async function enrichJobDescription(title, company, plainDescription, rawHtml) {
  // Prefer rawHtml — never send plainDescription alongside it (confuses the model).
  const source = rawHtml?.trim() || plainDescription?.trim();
  if (!source) return null;

  const prompt = `You are an expert job description parser. Extract ALL information from the job posting content below.

RULES:
- "description" must be the COMPLETE job description rewritten in clean Markdown. Do NOT summarise or skip anything. Include every section you find: role overview, what you will do, responsibilities, requirements, qualifications, nice-to-haves, tech stack, team info, company info, anything present.
- Use ## headings, bullet points (- item), **bold** for important terms.
- Extract every single skill, tool, language, framework mentioned.
- Extract every benefit or perk mentioned.
- salary: exact text if mentioned, otherwise null (not the string "null").
- germanRequired: look for any mention of German language requirements. Respond with one of: "Not required" | "A1-A2 (Basic)" | "B1-B2 (Conversational)" | "C1-C2 (Fluent)" | "Native". If no mention of German at all, use "Not required". If the job description is written entirely in German, use "C1-C2 (Fluent)" at minimum.
- yearsOfExperience: extract the required years of experience as a range string like "3-5 years" or "5+ years". If not mentioned, use null.
- The content may contain raw HTML tags — strip them and use only the text.

JOB TITLE: ${title}
COMPANY: ${company}
CONTENT:
${source.slice(0, 12000)}

Respond ONLY in valid JSON, no markdown fences:
{
  "description": "<COMPLETE markdown description — include everything, do not truncate>",
  "summary": "<2-3 sentence plain English summary>",
  "skills": ["every", "skill", "mentioned"],
  "experienceLevel": "<Internship | Entry Level | Mid Level | Senior | Lead | Manager | Director | VP | Not specified>",
  "employmentType": "<Full-time | Part-time | Contract | Internship | Not specified>",
  "salary": <string with salary info, or null>,
  "benefits": ["every", "benefit", "mentioned"],
  "germanRequired": "<Not required | A1-A2 (Basic) | B1-B2 (Conversational) | C1-C2 (Fluent) | Native>",
  "yearsOfExperience": <"3-5 years" string or null>
}`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: "json" }),
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) { console.warn(`  ⚠️  Ollama HTTP ${res.status}`); return null; }
    const data = await res.json();
    const raw = (data.response ?? "").replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`  ⚠️  JSON parse failed: ${e.message}\n  Raw: ${raw.slice(0,200)}`);
      return null;
    }
  } catch (e) {
    console.warn(`  ⚠️  Enrichment failed: ${e.message}`);
    return null;
  }
}


const GERMANY_KEYWORDS = [
  "germany","deutschland","german",
  "berlin","munich","münchen","hamburg","frankfurt","cologne","köln",
  "düsseldorf","dusseldorf","stuttgart","leipzig","dortmund","essen",
  "bremen","hannover","nuremberg","nürnberg","bonn","karlsruhe",
  "mannheim","augsburg","wiesbaden","bielefeld","bochum","münster",
  "kassel","halle","braunschweig","krefeld","lübeck","erfurt","mainz",
  "regensburg","saarbrücken","aachen","kiel","paderborn",
  " de,",", de ","(de)","germany,",", germany",
];

let ollamaCalls = 0;

async function isGermanyLocation(location, title, company) {
  const combined = `${(location ?? "").toLowerCase()} ${(title ?? "").toLowerCase()}`;
  if (GERMANY_KEYWORDS.some((kw) => combined.includes(kw))) return true;
  if (!location || ["remote","worldwide","global","anywhere"].includes(location.toLowerCase())) return false;

  // Inconclusive → ask Ollama
  ollamaCalls++;
  const prompt = `Is this job located in Germany? Answer only "yes" or "no".\nJob title: ${title}\nCompany: ${company}\nLocation: ${location}`;
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
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Scrapers
// ---------------------------------------------------------------------------

// Celonis — uses Greenhouse API (same as Contentful), full HTML descriptions
async function scrapeCelonis(keywords) {
  const data = await fetchJson("https://api.greenhouse.io/v1/boards/celonis/jobs?content=true");
  const kw = keywords?.toLowerCase();
  return (data?.jobs ?? []).filter((j) => {
    if (!j.id || !j.title || !j.absolute_url) return false;
    if (kw && !j.title.toLowerCase().includes(kw)) return false;
    const loc = (j.location?.name ?? "").toLowerCase();
    return GERMANY_KEYWORDS.some((k) => loc.includes(k));
  }).map((j) => ({
    title: j.title,
    url: j.absolute_url,
    description: "",            // Ollama generates from rawHtml
    rawHtml: j.content ?? "",   // full HTML — 8000+ chars
    company: "Celonis",
    location: j.location?.name ?? "Unknown",
    postedAt: j.updated_at ?? "",
  }));
}

// Contentful (Greenhouse) — filters Germany in-loop
async function scrapeContentful(keywords) {
  const data = await fetchJson("https://api.greenhouse.io/v1/boards/contentful/jobs?content=true");
  const kw = keywords?.toLowerCase();
  return (data?.jobs ?? []).filter((j) => {
    if (!j.id || !j.title || !j.absolute_url) return false;
    if (kw && !j.title.toLowerCase().includes(kw)) return false;
    const loc = (j.location?.name ?? "").toLowerCase();
    return GERMANY_KEYWORDS.some((k) => loc.includes(k));
  }).map((j) => ({
    title: j.title,
    url: j.absolute_url,
    description: stripHtml(j.content ?? ""),
    company: "Contentful",
    location: j.location?.name ?? "Unknown",
    postedAt: j.updated_at ?? "",
  }));
}

// SAP Fioneer (Workable) — fetches each job page for og:description (SPA, no public description API)
async function scrapeSapFioneer(keywords) {
  const data = await fetchJson("https://apply.workable.com/api/v3/accounts/fioneer/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: keywords ?? "", location: [], department: [], worktype: [], remote: [] }),
  });

  const germanyJobs = (data?.results ?? []).filter((j) => {
    const sc = j.shortcode ?? j.id;
    if (!sc || !j.title) return false;
    const country = (j.location?.country ?? j.location?.countryCode ?? "").toLowerCase();
    const city = (j.location?.city ?? "").toLowerCase();
    return country.includes("germany") || country.includes("deutschland") || country === "de"
      || GERMANY_KEYWORDS.some((k) => city.includes(k));
  });

  const jobs = [];
  for (const j of germanyJobs) {
    const sc = j.shortcode ?? String(j.id);
    const dept = Array.isArray(j.department) ? j.department.join(", ") : (j.department ?? "");
    const loc = [j.location?.city, j.location?.country].filter(Boolean).join(", ");
    const applyUrl = `https://apply.workable.com/fioneer/j/${sc}/`;

    // Fetch og:description from job page (best available content for Workable SPA)
    let rawHtml = `Job Title: ${j.title}\nCompany: SAP Fioneer\nDepartment: ${dept}\nLocation: ${loc}`;
    try {
      const pageRes = await fetch(applyUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogMatch = html.match(/<meta property="og:description" content="([^"]*)"/);
        if (ogMatch?.[1]) rawHtml += `\n\n${ogMatch[1]}`;
      }
    } catch { /* use minimal context */ }

    jobs.push({
      title: j.title,
      url: applyUrl,
      description: dept,
      rawHtml,
      company: "SAP Fioneer",
      location: loc || "Germany",
      postedAt: j.published ?? "",
    });
  }
  return jobs;
}

// Bosch (SmartRecruiters) — country=de at API level, fetches detail for full description
async function scrapeBosch(keywords) {
  let listUrl = "https://api.smartrecruiters.com/v1/companies/BoschGroup/postings?country=de&limit=10";
  if (keywords) listUrl += `&q=${encodeURIComponent(keywords)}`;
  const listData = await fetchJson(listUrl);
  const jobs = [];

  for (const job of (listData?.content ?? []).slice(0, 5)) {
    if (!job.id || !job.name) continue;
    const location = job.location?.fullLocation ?? job.location?.city ?? "Unknown";
    let description = "";
    let applyUrl = `https://jobs.smartrecruiters.com/BoschGroup/${job.id}`;

    try {
      const detail = await fetchJson(
        `https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/${job.id}`
      );
      const s = detail?.jobAd?.sections ?? {};
      description = stripHtml(
        [s.companyDescription?.text, s.jobDescription?.text, s.qualifications?.text]
          .filter(Boolean).join("\n\n")
      );
      if (detail.postingUrl) applyUrl = detail.postingUrl;
    } catch (e) {
      console.warn(`  ⚠️  Bosch detail fetch failed: ${e.message}`);
    }

    jobs.push({ title: job.name, url: applyUrl, description, company: "Bosch", location, postedAt: job.releasedDate ?? "" });
  }
  return jobs;
}

// ---------------------------------------------------------------------------
// Insert with full dedup (Job + SkippedUrl) + Germany classification
// ---------------------------------------------------------------------------
async function insertJobs(scraperName, scrapedJobs) {
  const FAKE_SITE_ID = new mongoose.Types.ObjectId();
  let inserted = 0, skippedExisting = 0, skippedNonGermany = 0, ollamaUsed = 0;

  for (const j of scrapedJobs) {
    // Check both collections
    const [inJobs, inSkipped] = await Promise.all([
      Job.findOne({ url: j.url }, "_id").lean(),
      SkippedUrl.findOne({ url: j.url }, "_id").lean(),
    ]);

    if (inJobs)    { skippedExisting++;    continue; }
    if (inSkipped) { skippedExisting++;    continue; }

    const callsBefore = ollamaCalls;
    const germany = await isGermanyLocation(j.location, j.title, j.company);
    if (ollamaCalls > callsBefore) ollamaUsed++;

    if (!germany) {
      await SkippedUrl.create({ url: j.url }).catch(() => {});
      skippedNonGermany++;
      continue;
    }

    // Enrich with Ollama
    process.stdout.write(`    🤖  Enriching: ${j.title.slice(0, 50)}…\r`);
    const enriched = await enrichJobDescription(j.title, j.company, j.description, j.rawHtml);

    await Job.create({
      siteId: FAKE_SITE_ID, siteName: scraperName, ...j,
      description: enriched?.description ?? j.description,
      summary: enriched?.summary ?? null,
      skills: enriched?.skills ?? [],
      experienceLevel: enriched?.experienceLevel ?? null,
      employmentType: enriched?.employmentType ?? null,
      salary: enriched?.salary ?? null,
      benefits: enriched?.benefits ?? [],
      germanRequired: enriched?.germanRequired ?? null,
      yearsOfExperience: enriched?.yearsOfExperience ?? null,
    });
    inserted++;
  }

  return { inserted, skippedExisting, skippedNonGermany, ollamaUsed };
}

// ---------------------------------------------------------------------------
// Print a job's full details
// ---------------------------------------------------------------------------
function printJob(j, index) {
  console.log(`\n  [${index + 1}] ${j.title}`);
  console.log(`      Company        : ${j.company}`);
  console.log(`      Location       : ${j.location}`);
  console.log(`      Posted         : ${j.postedAt || "(not provided)"}`);
  console.log(`      URL            : ${j.url}`);
  if (j.summary)         console.log(`      Summary        : ${j.summary}`);
  if (j.experienceLevel && j.experienceLevel !== "Not specified") console.log(`      Experience     : ${j.experienceLevel}`);
  if (j.employmentType && j.employmentType !== "Not specified")  console.log(`      Employment     : ${j.employmentType}`);
  if (j.salary)          console.log(`      Salary         : ${j.salary}`);
  if (j.skills?.length)  console.log(`      Skills         : ${j.skills.join(", ")}`);
  if (j.benefits?.length)console.log(`      Benefits       : ${j.benefits.slice(0,4).join(", ")}${j.benefits.length > 4 ? ` +${j.benefits.length - 4} more` : ""}`);
  if (j.germanRequired)     console.log(`      German req.    : ${j.germanRequired}`);
  if (j.yearsOfExperience)  console.log(`      Experience     : ${j.yearsOfExperience}`);
  if (j.description) {
    // Show first 400 chars of markdown description
    const preview = j.description.replace(/#+\s/g, "").replace(/\*\*/g, "").slice(0, 400);
    console.log(`      Description    : ${preview}${j.description.length > 400 ? "…" : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
const SCRAPERS = [
  { name: "Celonis",     fn: scrapeCelonis,    keywords: "engineer" },
  { name: "Contentful",  fn: scrapeContentful, keywords: "engineer" },
  { name: "SAP Fioneer", fn: scrapeSapFioneer, keywords: "engineer" },
  { name: "Bosch",       fn: scrapeBosch,      keywords: "software" },
];

async function runPass(passLabel) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`PASS: ${passLabel}`);
  console.log(`${"═".repeat(60)}`);

  const summary = [];

  for (const scraper of SCRAPERS) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔍  ${scraper.name}  (keywords="${scraper.keywords}")`);

    let jobs = [], error = null;
    try { jobs = await scraper.fn(scraper.keywords); }
    catch (e) { error = e.message; }

    if (error) {
      console.log(`  ❌  Scraper error: ${error}`);
      summary.push({ name: scraper.name, total: 0, error });
      continue;
    }

    console.log(`  📦  Fetched: ${jobs.length} jobs (Germany-filtered at scraper level)`);

    if (jobs.length === 0) {
      console.log("  ⚠️  No jobs returned");
      summary.push({ name: scraper.name, total: 0 });
      continue;
    }

    // Print first 3 jobs — enrich inline so we can show structured data
    console.log(`\n  First ${Math.min(3, jobs.length)} jobs (AI-enriched details):`);
    for (let i = 0; i < Math.min(3, jobs.length); i++) {
      const j = jobs[i];
      process.stdout.write(`    🤖  Enriching preview ${i + 1}/3…\r`);
      const enriched = await enrichJobDescription(j.title, j.company, j.description, j.rawHtml);
      if (enriched) Object.assign(j, enriched);
      printJob(j, i);
    }

    // Insert into DB
    console.log(`\n  💾  Inserting into MongoDB...`);
    const r = await insertJobs(scraper.name, jobs);
    console.log(`  ✅  Inserted: ${r.inserted}  |  Skipped (existing/non-DE): ${r.skippedExisting + r.skippedNonGermany}  |  Non-Germany (skipped+stored): ${r.skippedNonGermany}  |  Ollama calls: ${r.ollamaUsed}`);

    summary.push({ name: scraper.name, total: jobs.length, ...r });
  }

  // Summary table
  console.log(`\n${"─".repeat(60)}`);
  console.log(`SUMMARY — ${passLabel}`);
  console.log(`${"─".repeat(60)}`);
  for (const r of summary) {
    if (r.error) {
      console.log(`  ❌  ${r.name.padEnd(14)} ERROR: ${r.error}`);
    } else {
      console.log(
        `  ✅  ${r.name.padEnd(14)} fetched: ${String(r.total ?? 0).padStart(3)}` +
        `  inserted: ${String(r.inserted ?? 0).padStart(3)}` +
        `  skipped: ${String((r.skippedExisting ?? 0) + (r.skippedNonGermany ?? 0)).padStart(3)}` +
        `  ollama: ${r.ollamaUsed ?? 0}`
      );
    }
  }
}

async function run() {
  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected");

  // ── Pass 1: fresh insert ──
  await runPass("Pass 1 — Fresh insert");

  const jobCount      = await Job.countDocuments();
  const skippedCount  = await SkippedUrl.countDocuments();
  console.log(`\n📊  DB state after Pass 1: ${jobCount} Germany jobs, ${skippedCount} non-Germany URLs stored`);

  // ── Pass 2: full dedup — nothing should be inserted, no Ollama calls ──
  ollamaCalls = 0;
  await runPass("Pass 2 — Dedup check (should be all skipped, 0 Ollama calls)");
  console.log(`\n📊  Total Ollama calls in Pass 2: ${ollamaCalls} (should be 0 — all URLs already classified)`);

  await mongoose.disconnect();
  console.log("\n🔌  Disconnected. Done.");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
