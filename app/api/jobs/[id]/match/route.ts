import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Profile from "@/models/Profile";
import { matchJobToResume } from "@/lib/ollama";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const [job, profile] = await Promise.all([
    Job.findById(id),
    Profile.findOne(),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!profile || !profile.prompt.trim()) {
    return NextResponse.json({ error: "No profile configured. Go to Profile page and add your details." }, { status: 400 });
  }

  const result = await matchJobToResume(
    profile.prompt,
    job.title,
    job.company,
    job.description
  );

  if (!result) {
    return NextResponse.json({ error: "Ollama matching failed" }, { status: 500 });
  }

  const updated = await Job.findByIdAndUpdate(
    id,
    { matchScore: result.score, matchReason: result.reason },
    { new: true }
  );

  return NextResponse.json(updated);
}
