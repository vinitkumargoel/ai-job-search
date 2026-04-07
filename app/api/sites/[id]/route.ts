import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Site from "@/models/Site";
import { scheduleSite, unscheduleSite } from "@/lib/cronEngine";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const site = await Site.findByIdAndUpdate(id, body, { new: true });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Re-schedule if active, or remove if disabled
  if (site.isActive) {
    scheduleSite(String(site._id), site.name, site.cronSchedule);
  } else {
    unscheduleSite(String(site._id));
  }

  return NextResponse.json(site);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const site = await Site.findByIdAndDelete(id);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  unscheduleSite(String(site._id));

  return NextResponse.json({ ok: true });
}
