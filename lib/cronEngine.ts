import cron, { ScheduledTask } from "node-cron";
import { connectDB } from "./mongodb";
import { matchJobToResume, isGermanyLocation, enrichJobDescription } from "./ollama";

// Keep a map of running tasks so we can cancel/replace them
const activeTasks = new Map<string, ScheduledTask>();

const ENRICHMENT_BATCH_SIZE = 3; // Process enrichment in batches of 3

async function log(siteId: string | null, siteName: string, message: string, level: "info" | "error" | "success" = "info") {
  try {
    const { default: CronLog } = await import("../models/CronLog");
    await CronLog.create({ siteId, siteName, message, level });
  } catch {
    console.error(`[CronLog] Failed to write log: ${message}`);
  }
}

export async function runScrapeForSite(siteId: string): Promise<void> {
  await connectDB();

  const { default: Site } = await import("../models/Site");
  const { default: Job } = await import("../models/Job");
  const { default: Profile } = await import("../models/Profile");
  const { default: SkippedUrl } = await import("../models/SkippedUrl");
  const { scraperRegistry } = await import("../scrapers/index");

  const site = await Site.findById(siteId);
  if (!site) return;

  await log(siteId, site.name, `Started scrape`, "info");

  const scraper = scraperRegistry[site.scraperKey];
  if (!scraper) {
    await log(siteId, site.name, `No scraper found for key: ${site.scraperKey}`, "error");
    await Site.findByIdAndUpdate(siteId, { lastRunAt: new Date(), lastRunStatus: "failed" });
    return;
  }

  try {
    const scrapedJobs = await scraper.scrape({ url: site.url, keywords: site.keywords });
    await log(siteId, site.name, `Scraper returned ${scrapedJobs.length} jobs`, "info");

    // First pass: filter and create all new jobs
    const newJobsToCreate: { scraped: typeof scrapedJobs[0]; created: typeof Job.prototype }[] = [];

    for (const scraped of scrapedJobs) {
      // Skip if already in jobs DB (dedup) or previously classified as non-Germany
      const [existing, skipped] = await Promise.all([
        Job.findOne({ url: scraped.url }, "_id").lean(),
        SkippedUrl.findOne({ url: scraped.url }, "_id").lean(),
      ]);
      if (existing || skipped) continue;

      // Classify location before saving — skip non-Germany jobs entirely
      const germany = await isGermanyLocation(scraped.location ?? "", scraped.title, scraped.company);
      if (!germany) {
        // Persist to SkippedUrl so future runs skip Ollama for this URL
        await SkippedUrl.create({ url: scraped.url }).catch(() => {});
        await log(siteId, site.name, `Skipped (not Germany): ${scraped.title} @ ${scraped.location}`, "info");
        continue;
      }

      const created = await Job.create({
        siteId: site._id,
        siteName: site.name,
        title: scraped.title,
        url: scraped.url,
        description: scraped.description,
        company: scraped.company,
        location: scraped.location,
        postedAt: scraped.postedAt ?? "",
        status: "new",
        isNew: true,
      });

      newJobsToCreate.push({ scraped, created });
    }

    const newCount = newJobsToCreate.length;
    const newJobIds = newJobsToCreate.map(j => String(j.created._id));

    // Second pass: enrich in batches of ENRICHMENT_BATCH_SIZE
    await log(siteId, site.name, `Enriching ${newCount} new jobs in batches of ${ENRICHMENT_BATCH_SIZE}`, "info");

    for (let i = 0; i < newJobsToCreate.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = newJobsToCreate.slice(i, i + ENRICHMENT_BATCH_SIZE);
      const batchNum = Math.floor(i / ENRICHMENT_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newJobsToCreate.length / ENRICHMENT_BATCH_SIZE);

      await log(siteId, site.name, `Enrichment batch ${batchNum}/${totalBatches}: ${batch.length} jobs`, "info");

      // Process batch in parallel
      const enrichResults = await Promise.allSettled(
        batch.map(async ({ scraped, created }) => {
          const enriched = await enrichJobDescription(scraped.title, scraped.company, scraped.description, scraped.rawHtml);
          return { scraped, created, enriched };
        })
      );

      // Update each job with enrichment results
      for (let j = 0; j < batch.length; j++) {
        const { scraped, created } = batch[j];
        const result = enrichResults[j];

        if (result.status === "fulfilled" && result.value.enriched) {
          const enriched = result.value.enriched;
          await Job.findByIdAndUpdate(created._id, {
            summary: enriched.summary,
            skills: enriched.skills,
            experienceLevel: enriched.experienceLevel,
            employmentType: enriched.employmentType,
            salary: enriched.salary,
            benefits: enriched.benefits,
            germanRequired: enriched.germanRequired,
            yearsOfExperience: enriched.yearsOfExperience,
          }, { strict: false });
          await log(siteId, site.name, `Enriched: ${scraped.title} | German: ${enriched.germanRequired}`, "success");
        } else {
          const errMsg = result.status === "rejected" ? result.reason?.message : "no result";
          await log(siteId, site.name, `Enrichment failed: ${scraped.title} (${errMsg})`, "error");
        }
      }
    }

    await log(siteId, site.name, `Saved ${newCount} new jobs`, "success");

    // AI matching — run for each new job against the profile
    if (newJobIds.length > 0) {
      const profile = await Profile.findOne();
      if (profile && profile.prompt.trim()) {
        await log(siteId, site.name, `Starting AI matching for ${newJobIds.length} jobs`, "info");
        let matched = 0;

        for (const jobId of newJobIds) {
          const job = await Job.findById(jobId);
          if (!job) continue;

          const result = await matchJobToResume(
            profile.prompt,
            job.title,
            job.company,
            job.description
          );

          if (result) {
            await Job.findByIdAndUpdate(jobId, {
              matchScore: result.score,
              matchReason: result.reason,
            });
            matched++;
          }
        }

        await log(siteId, site.name, `AI matching complete — ${matched}/${newJobIds.length} jobs scored`, "success");
      } else {
        await log(siteId, site.name, `No profile configured — skipping AI matching`, "info");
      }
    }

    await Site.findByIdAndUpdate(siteId, {
      lastRunAt: new Date(),
      lastRunStatus: "success",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log(siteId, site.name, `Scrape failed: ${msg}`, "error");
    await Site.findByIdAndUpdate(siteId, {
      lastRunAt: new Date(),
      lastRunStatus: "failed",
    });
  }
}

export function scheduleSite(siteId: string, siteName: string, cronSchedule: string) {
  // Cancel existing task for this site if any
  const existing = activeTasks.get(siteId);
  if (existing) {
    existing.stop();
    activeTasks.delete(siteId);
  }

  if (!cron.validate(cronSchedule)) {
    console.error(`[CronEngine] Invalid cron expression for site ${siteName}: ${cronSchedule}`);
    return;
  }

  const task = cron.schedule(cronSchedule, async () => {
    console.log(`[CronEngine] Running scrape for: ${siteName}`);
    await runScrapeForSite(siteId);
  });

  activeTasks.set(siteId, task);
  console.log(`[CronEngine] Scheduled "${siteName}" → ${cronSchedule}`);
}

export function unscheduleSite(siteId: string) {
  const task = activeTasks.get(siteId);
  if (task) {
    task.stop();
    activeTasks.delete(siteId);
  }
}

export async function initCronEngine() {
  await connectDB();
  const { default: Site } = await import("../models/Site");

  const activeSites = await Site.find({ isActive: true });
  console.log(`[CronEngine] Initializing with ${activeSites.length} active sites`);

  for (const site of activeSites) {
    scheduleSite(String(site._id), site.name, site.cronSchedule);
  }
}
