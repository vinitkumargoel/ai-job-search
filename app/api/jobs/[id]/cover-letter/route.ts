import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";
import Resume from "@/models/Resume";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const [job, resume] = await Promise.all([
    Job.findById(id),
    Resume.findOne({ isActive: true }),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!resume) return NextResponse.json({ error: "No active resume" }, { status: 400 });

  const prompt = `You are a professional career coach. Write a compelling, concise cover letter for the following job application.

CANDIDATE RESUME:
${resume.contentText.slice(0, 4000)}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 3000)}

Write a professional cover letter in 3-4 paragraphs. Be specific, enthusiastic, and tailor the letter to the job description. Address it to "Hiring Manager". Sign off with the candidate's name from the resume if available, otherwise use "Sincerely, [Your Name]". Output only the cover letter text, no extra commentary.`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
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
