import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Site from "@/models/Site";
import Job from "@/models/Job";

export async function GET() {
  await connectDB();

  const [totalSites, totalJobs, newJobs, appliedJobs, savedJobs, sites] =
    await Promise.all([
      Site.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ isNew: true }),
      Job.countDocuments({ status: "applied" }),
      Job.countDocuments({ status: "saved" }),
      Site.find({}, "name lastRunAt lastRunStatus isActive nextRunAt").sort({ name: 1 }),
    ]);

  return NextResponse.json({
    totalSites,
    totalJobs,
    newJobs,
    appliedJobs,
    savedJobs,
    sites,
  });
}
