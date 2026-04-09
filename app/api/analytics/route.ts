import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

export async function GET() {
  await connectDB();

  const [
    statusCounts,
    scoreBuckets,
    scrapedOverTime,
    topSites,
    allSites,
  ] = await Promise.all([
    // Application funnel: count by status
    Job.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Match score distribution in 10-point buckets
    Job.aggregate([
      { $match: { matchScore: { $ne: null } } },
      {
        $bucket: {
          groupBy: "$matchScore",
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
          default: "unscored",
          output: { count: { $sum: 1 } },
        },
      },
    ]),

    // Jobs scraped per day over last 30 days
    Job.aggregate([
      {
        $match: {
          scrapedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scrapedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top sites by job count (limited for display)
    Job.aggregate([
      { $group: { _id: "$siteName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),

    // All sites for modal breakdown
    Job.aggregate([
      { $group: { _id: "$siteName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // Normalize status counts into a map
  const statusMap: Record<string, number> = { new: 0, applied: 0, saved: 0, rejected: 0 };
  for (const s of statusCounts) statusMap[s._id] = s.count;

  // Score buckets with labels
  const scoreLabels: Record<string, string> = {
    "0": "0-9", "10": "10-19", "20": "20-29", "30": "30-39", "40": "40-49",
    "50": "50-59", "60": "60-69", "70": "70-79", "80": "80-89", "90": "90-100",
  };
  const scoreData = scoreBuckets
    .filter((b) => b._id !== "unscored")
    .map((b) => ({ range: scoreLabels[String(b._id)] ?? String(b._id), count: b.count }));

  // Fill any missing days in the last 30 days
  const dayMap: Record<string, number> = {};
  for (const d of scrapedOverTime) dayMap[d._id] = d.count;
  const timelineData: { date: string; jobs: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    timelineData.push({ date: key, jobs: dayMap[key] ?? 0 });
  }

  return NextResponse.json({
    funnel: [
      { label: "New", value: statusMap.new, color: "#4F6AF5" },
      { label: "Saved", value: statusMap.saved, color: "#F59E0B" },
      { label: "Applied", value: statusMap.applied, color: "#16A34A" },
      { label: "Rejected", value: statusMap.rejected, color: "#9CA3AF" },
    ],
    scoreDistribution: scoreData,
    timeline: timelineData,
    topSites: topSites.map((s) => ({ name: s._id || "Unknown", count: s.count })),
    allSources: allSites.map((s) => ({ name: s._id || "Unknown", count: s.count })),
  });
}
