import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const status           = searchParams.get("status");
  const siteId           = searchParams.get("siteId");
  const siteName         = searchParams.get("siteName");
  const minScore         = searchParams.get("minScore");
  const maxScore         = searchParams.get("maxScore");
  const germanRequired   = searchParams.get("germanRequired");   // "Not required" | "any-required"
  const experienceLevel  = searchParams.get("experienceLevel");  // exact value
  const employmentType   = searchParams.get("employmentType");   // exact value
  const hasSalary        = searchParams.get("hasSalary");        // "true"
  const dateRange        = searchParams.get("dateRange");        // "today" | "7d" | "30d" | "month"
  const workLocation     = searchParams.get("workLocation");      // "Remote" | "Hybrid" | "On-site"
  const visaSponsorship  = searchParams.get("visaSponsorship");   // "Yes" | "No"
  const page  = parseInt(searchParams.get("page")  ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (status && status !== "all") filter.status = status;
  if (siteId) filter.siteId = siteId;
  if (siteName) filter.siteName = siteName;

  if (minScore === "none") {
    filter.matchScore = null;
  } else if (minScore || maxScore) {
    filter.matchScore = {};
    if (minScore) filter.matchScore.$gte = parseInt(minScore);
    if (maxScore) filter.matchScore.$lte = parseInt(maxScore);
  }

  if (germanRequired === "not-required") filter.germanRequired = "Not required";
  if (germanRequired === "any-required") filter.germanRequired = { $ne: "Not required" };

  if (experienceLevel) filter.experienceLevel = experienceLevel;
  if (employmentType)  filter.employmentType  = employmentType;
  if (hasSalary === "true") filter.salary = { $ne: null, $exists: true };

  // Work location filter
  if (workLocation) filter.workLocation = workLocation;

  // Visa sponsorship filter
  if (visaSponsorship === "Yes") filter.visaSponsorship = "Yes";
  if (visaSponsorship === "No") filter.visaSponsorship = { $ne: "Yes" };

  // Date range filter
  if (dateRange) {
    const now = new Date();
    let startDate: Date;
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }
    filter.scrapedAt = { $gte: startDate };
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ scrapedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  return NextResponse.json({ jobs, total, page, limit });
}
