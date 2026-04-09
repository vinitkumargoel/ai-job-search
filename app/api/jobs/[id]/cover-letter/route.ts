import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Profile from "@/models/Profile";
import { getOllamaSettings } from "@/models/Setting";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const [job, profile, settings] = await Promise.all([
    Job.findById(id),
    Profile.findOne(),
    getOllamaSettings(),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!profile || !profile.prompt.trim()) {
    return NextResponse.json({ error: "No profile configured. Go to Profile page and add your details." }, { status: 400 });
  }

  const prompt = `You are a professional career coach. Write a compelling, concise cover letter for the following job application.

CANDIDATE PROFILE:
${profile.prompt.slice(0, 5000)}
${profile.name ? `\nCandidate Name: ${profile.name}` : ""}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 4000)}

Write a professional cover letter in 3-4 paragraphs. Be specific, enthusiastic, and tailor the letter to the job description. Address it to "Hiring Manager".${profile.name ? ` Sign off with "${profile.name}".` : ' Sign off with the candidate\'s name if available, otherwise "Sincerely, [Your Name]".'} Output only the cover letter text, no extra commentary.`;

  try {
    const res = await fetch(`${settings.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        prompt,
        stream: false,
        think: false,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) return NextResponse.json({ error: "Ollama error" }, { status: 502 });

    const data = await res.json();
    return NextResponse.json({ coverLetter: data.response ?? "" });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
