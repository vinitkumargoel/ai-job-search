import cron, { ScheduledTask } from "node-cron";
import { connectDB } from "./mongodb";
import { matchJobToResume } from "./ollama";

// Keep a map of running tasks so we can cancel/replace them
const activeTasks = new Map<string, ScheduledTask>();

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
  const { default: Resume } = await import("../models/Resume");
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

    let newCount = 0;
    const newJobIds: string[] = [];

    for (const scraped of scrapedJobs) {
      const existing = await Job.findOne({ url: scraped.url });
      if (existing) continue;

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

      newJobIds.push(String(created._id));
      newCount++;
    }

    await log(siteId, site.name, `Saved ${newCount} new jobs`, "success");

    // AI matching — run for each new job against active resume
    if (newJobIds.length > 0) {
      const activeResume = await Resume.findOne({ isActive: true });
      if (activeResume) {
        await log(siteId, site.name, `Starting AI matching for ${newJobIds.length} jobs`, "info");
        let matched = 0;

        for (const jobId of newJobIds) {
          const job = await Job.findById(jobId);
          if (!job) continue;

          const result = await matchJobToResume(
            activeResume.contentText,
            job.title,
            job.company,
            job.description
          );

          if (result) {
            await Job.findByIdAndUpdate(jobId, {
              matchScore: result.score,
              matchReason: result.reason,
              matchedResumeId: activeResume._id,
            });
            matched++;
          }
        }

        await log(siteId, site.name, `AI matching complete — ${matched}/${newJobIds.length} jobs scored`, "success");
      } else {
        await log(siteId, site.name, `No active resume found — skipping AI matching`, "info");
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
