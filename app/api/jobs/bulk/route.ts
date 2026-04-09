import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import SkippedUrl from "@/models/SkippedUrl";

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No job IDs provided" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "applied") updates.appliedAt = new Date();

  const result = await Job.updateMany(
    { _id: { $in: ids } },
    { $set: updates }
  );

  return NextResponse.json({ success: true, modified: result.modifiedCount });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No job IDs provided" }, { status: 400 });
  }

  // Get URLs of jobs to be deleted
  const jobs = await Job.find({ _id: { $in: ids } }).select("url");
  const urls = jobs.map((j) => j.url);

  // Add URLs to skipped list
  if (urls.length > 0) {
    await SkippedUrl.insertMany(
      urls.map((url) => ({ url })),
      { ordered: false }
    ).catch(() => {}); // Ignore duplicate key errors
  }

  // Delete the jobs
  const result = await Job.deleteMany({ _id: { $in: ids } });

  return NextResponse.json({ success: true, deleted: result.deletedCount });
}