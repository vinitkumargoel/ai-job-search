import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Site from "@/models/Site";
import { availableScrapers } from "@/scrapers/index";
import { scheduleSite } from "@/lib/cronEngine";

export async function GET() {
  await connectDB();
  const sites = await Site.find().sort({ createdAt: -1 });
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const { name, scraperKey, url, keywords, cronSchedule, isActive } = body;

  if (!name || !scraperKey || !url) {
    return NextResponse.json({ error: "name, scraperKey and url are required" }, { status: 400 });
  }

  if (!availableScrapers.includes(scraperKey)) {
    return NextResponse.json(
      { error: `Unknown scraperKey. Available: ${availableScrapers.join(", ")}` },
      { status: 400 }
    );
  }

  const site = await Site.create({
    name,
    scraperKey,
    url,
    keywords: keywords ?? "",
    cronSchedule: cronSchedule ?? "0 9 * * *",
    isActive: isActive ?? true,
  });

  if (site.isActive) {
    scheduleSite(String(site._id), site.name, site.cronSchedule);
  }

  return NextResponse.json(site, { status: 201 });
}
