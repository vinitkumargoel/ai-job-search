import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const siteId = searchParams.get("siteId");
  const minScore = searchParams.get("minScore");
  const maxScore = searchParams.get("maxScore");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (status && status !== "all") filter.status = status;
  if (siteId) filter.siteId = siteId;
  if (minScore || maxScore) {
    filter.matchScore = {};
    if (minScore) filter.matchScore.$gte = parseInt(minScore);
    if (maxScore) filter.matchScore.$lte = parseInt(maxScore);
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
