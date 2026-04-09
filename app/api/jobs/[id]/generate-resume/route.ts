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

  const prompt = `You are a professional resume writer. Create a highly tailored, ATS-optimized resume for the candidate based on their profile and the target job.

CANDIDATE PROFILE:
${profile.prompt.slice(0, 5000)}
${profile.name ? `Name: ${profile.name}` : ""}
${profile.email ? `Email: ${profile.email}` : ""}
${profile.phone ? `Phone: ${profile.phone}` : ""}
${profile.location ? `Location: ${profile.location}` : ""}
${profile.linkedIn ? `LinkedIn: ${profile.linkedIn}` : ""}
${profile.website ? `Website: ${profile.website}` : ""}

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description.slice(0, 4000)}

INSTRUCTIONS:
- Tailor the resume specifically for this job posting
- Emphasize relevant skills, experience, and achievements that match the job requirements
- Use action verbs and quantify achievements where possible
- Include relevant keywords from the job description for ATS optimization
- Keep it professional, concise, and impactful

Respond ONLY in valid JSON with this exact structure (no markdown fences):
{
  "name": "<full name>",
  "email": "<email>",
  "phone": "<phone or empty string>",
  "location": "<location or empty string>",
  "linkedIn": "<linkedin url or empty string>",
  "website": "<website or empty string>",
  "summary": "<2-3 sentence professional summary tailored to the target job>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company name>",
      "duration": "<start - end, e.g. Jan 2022 - Present>",
      "location": "<location or empty string>",
      "bullets": ["<achievement 1>", "<achievement 2>", "..."]
    }
  ],
  "education": [
    {
      "degree": "<degree name>",
      "school": "<school name>",
      "year": "<graduation year or duration>",
      "details": "<honors, GPA, relevant coursework — or empty string>"
    }
  ],
  "skills": ["<skill 1>", "<skill 2>", "..."],
  "certifications": ["<cert 1>", "..."],
  "languages": ["<language (proficiency)>", "..."],
  "projects": [
    {
      "name": "<project name>",
      "description": "<one-line description>",
      "tech": "<technologies used>"
    }
  ]
}`;

  try {
    const res = await fetch(`${settings.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        prompt,
        stream: false,
        format: "json",
        think: false,
      }),
      signal: AbortSignal.timeout(180000), // 3 minutes
    });

    if (!res.ok) return NextResponse.json({ error: "Ollama error" }, { status: 502 });

    const data = await res.json();
    const raw = (data.response ?? "").replace(/```json|```/g, "").trim();

    let resumeData;
    try {
      resumeData = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({
      resume: resumeData,
      jobTitle: job.title,
      company: job.company,
    });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
