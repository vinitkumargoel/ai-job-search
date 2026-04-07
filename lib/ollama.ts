const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

export interface MatchResult {
  score: number;
  reason: string;
}

export async function matchJobToResume(
  resumeText: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string
): Promise<MatchResult | null> {
  const prompt = `You are a career assistant. Given a resume and a job description, evaluate how well the candidate matches the job.

RESUME:
${resumeText.slice(0, 4000)}

JOB TITLE: ${jobTitle}
COMPANY: ${jobCompany}
JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

Respond ONLY in valid JSON with this exact structure:
{
  "score": <number 0 to 100>,
  "reason": "<one or two sentence explanation>"
}`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const parsed = JSON.parse(data.response ?? "{}") as Partial<MatchResult>;

    if (typeof parsed.score !== "number" || typeof parsed.reason !== "string") {
      return null;
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(parsed.score))),
      reason: parsed.reason,
    };
  } catch {
    return null;
  }
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
