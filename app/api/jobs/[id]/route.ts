import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

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
