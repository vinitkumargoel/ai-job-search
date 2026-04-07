import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Resume from "@/models/Resume";
import { matchJobToResume } from "@/lib/ollama";

export async function POST() {
  await connectDB();

  const resume = await Resume.findOne({ isActive: true });
  if (!resume) {
    return NextResponse.json({ error: "No active resume found" }, { status: 400 });
  }

  const unmatched = await Job.find({ matchScore: null }).limit(50);

  // Run in background
  (async () => {
    for (const job of unmatched) {
      const result = await matchJobToResume(
        resume.contentText,
        job.title,
        job.company,
        job.description
      );
      if (result) {
        await Job.findByIdAndUpdate(job._id, {
          matchScore: result.score,
          matchReason: result.reason,
          matchedResumeId: resume._id,
        });
      }
    }
  })().catch(console.error);

  return NextResponse.json({ ok: true, queued: unmatched.length });
}
