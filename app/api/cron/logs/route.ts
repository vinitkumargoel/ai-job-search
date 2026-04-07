import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CronLog from "@/models/CronLog";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const siteId = searchParams.get("siteId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (siteId) filter.siteId = siteId;

  const logs = await CronLog.find(filter).sort({ createdAt: -1 }).limit(limit);
  return NextResponse.json(logs);
}
