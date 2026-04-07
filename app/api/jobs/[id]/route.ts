import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import SkippedUrl from "@/models/SkippedUrl";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};

  if (body.status) {
    updates.status = body.status;
    if (body.status === "applied") updates.appliedAt = new Date();
  }
  if (typeof body.isNew === "boolean") updates.isNew = body.isNew;
  if (typeof body.notes === "string") updates.notes = body.notes;

  const job = await Job.findByIdAndUpdate(id, updates, { new: true });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const job = await Job.findById(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Add URL to skipped URLs to prevent re-scraping
  await SkippedUrl.findOneAndUpdate(
    { url: job.url },
    { url: job.url },
    { upsert: true, new: true }
  );

  // Delete the job
  await Job.findByIdAndDelete(id);

  return NextResponse.json({ success: true, deletedId: id });
}
