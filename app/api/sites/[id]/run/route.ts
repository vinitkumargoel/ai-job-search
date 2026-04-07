import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Site from "@/models/Site";
import { runScrapeForSite } from "@/lib/cronEngine";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const site = await Site.findById(id);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Run in background — don't await so the response returns immediately
  runScrapeForSite(id).catch(console.error);

  return NextResponse.json({ ok: true, message: `Scrape started for "${site.name}"` });
}
