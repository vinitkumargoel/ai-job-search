import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Resume from "@/models/Resume";
import { matchJobToResume } from "@/lib/ollama";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const [job, resume] = await Promise.all([
    Job.findById(id),
    Resume.findOne({ isActive: true }),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!resume) return NextResponse.json({ error: "No active resume found" }, { status: 400 });

  const result = await matchJobToResume(
    resume.contentText,
    job.title,
    job.company,
    job.description
  );

  if (!result) {
    return NextResponse.json({ error: "Ollama matching failed" }, { status: 500 });
  }

  const updated = await Job.findByIdAndUpdate(
    id,
    { matchScore: result.score, matchReason: result.reason, matchedResumeId: resume._id },
    { new: true }
  );

  return NextResponse.json(updated);
}
