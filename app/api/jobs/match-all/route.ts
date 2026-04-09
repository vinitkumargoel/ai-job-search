import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Profile from "@/models/Profile";
import { matchJobToResume } from "@/lib/ollama";

export async function POST() {
  await connectDB();

  const profile = await Profile.findOne();
  if (!profile || !profile.prompt.trim()) {
    return NextResponse.json({ error: "No profile configured. Go to Profile page and add your details." }, { status: 400 });
  }

  const unmatched = await Job.find({ matchScore: null }).limit(50);

  // Run in background
  (async () => {
    for (const job of unmatched) {
      const result = await matchJobToResume(
        profile.prompt,
        job.title,
        job.company,
        job.description
      );
      if (result) {
        await Job.findByIdAndUpdate(job._id, {
          matchScore: result.score,
          matchReason: result.reason,
        });
      }
    }
  })().catch(console.error);

  return NextResponse.json({ ok: true, queued: unmatched.length });
}
