import { getOllamaSettings, OllamaSettings } from "@/models/Setting";

// Cache settings for 60 seconds to avoid repeated DB queries
let cachedSettings: OllamaSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function getSettings(): Promise<OllamaSettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }
  cachedSettings = await getOllamaSettings();
  cacheTime = now;
  return cachedSettings;
}

// Clear cache when settings are updated (called from API)
export function clearOllamaSettingsCache(): void {
  cachedSettings = null;
  cacheTime = 0;
}

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
  const settings = await getSettings();
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
    const settings = await getSettings();
    const res = await fetch(`${settings.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface EnrichedJob {
  description: string; // full markdown-formatted description
  summary: string;
  skills: string[];
  experienceLevel: string;
  employmentType: string;
  salary: string | null;
  benefits: string[];
  germanRequired: string; // "Not required" | "A1-A2 (Basic)" | "B1-B2 (Conversational)" | "C1-C2 (Fluent)" | "Native"
  yearsOfExperience: string | null; // e.g. "3-5 years", "5+ years", null if not mentioned
}

/**
 * Uses Ollama to parse ALL content from a job posting into structured fields.
 *
 * Strategy:
 * - Prefers rawHtml (full original content) over stripped plaintext.
 * - Sends up to 12,000 chars so nothing is truncated.
 * - Instructs the model to produce a full markdown description — every
 *   section, every bullet point, nothing omitted.
 */
export async function enrichJobDescription(
  title: string,
  company: string,
  plainDescription: string,
  rawHtml?: string
): Promise<EnrichedJob | null> {
  // Always prefer rawHtml — it has the full original content.
  // Only fall back to plainDescription if rawHtml is absent or empty.
  const source = rawHtml?.trim() || plainDescription?.trim();
  if (!source) return null;

  const settings = await getSettings();

  const prompt = `You are an expert job description parser. Extract ALL information from the job posting content below.

RULES:
- "description" must be the COMPLETE job description rewritten in clean Markdown. Do NOT summarise or skip anything. Include every section you find: role overview, what you will do, responsibilities, requirements, qualifications, nice-to-haves, tech stack, team info, company info, anything present.
- Use ## headings, bullet points (- item), **bold** for important terms.
- Extract every single skill, tool, language, framework mentioned.
- Extract every benefit or perk mentioned.
- salary: exact text if mentioned, otherwise null (not the string "null").
- germanRequired: look for any mention of German language requirements. Respond with one of: "Not required" | "A1-A2 (Basic)" | "B1-B2 (Conversational)" | "C1-C2 (Fluent)" | "Native". If no mention of German at all, use "Not required". If the job description is written entirely in German, that's a strong signal — use "C1-C2 (Fluent)" at minimum.
- yearsOfExperience: extract the required years of experience as a range string like "3-5 years" or "5+ years". If not mentioned, use null.
- The content may contain raw HTML tags — strip them and use only the text.

JOB TITLE: ${title}
COMPANY: ${company}
CONTENT:
${source.slice(0, 12000)}

Respond ONLY in valid JSON, no markdown fences:
{
  "description": "<COMPLETE markdown description — include everything, do not truncate>",
  "summary": "<2-3 sentence plain English summary>",
  "skills": ["every", "skill", "mentioned"],
  "experienceLevel": "<Internship | Entry Level | Mid Level | Senior | Lead | Manager | Director | VP | Not specified>",
  "employmentType": "<Full-time | Part-time | Contract | Internship | Not specified>",
  "salary": <string with salary info, or null>,
  "benefits": ["every", "benefit", "mentioned"],
  "germanRequired": "<Not required | A1-A2 (Basic) | B1-B2 (Conversational) | C1-C2 (Fluent) | Native>",
  "yearsOfExperience": <"3-5 years" or "5+ years" string, or null>
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
      signal: AbortSignal.timeout(300000), // 5 minutes
    });

    if (!res.ok) {
      console.error(`[enrichJobDescription] Ollama HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const raw = (data.response ?? "").replace(/```json|```/g, "").trim();

    let parsed: Partial<EnrichedJob>;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[enrichJobDescription] JSON parse failed:", String(parseErr), "\nRaw:", raw.slice(0, 300));
      return null;
    }

    return {
      description: typeof parsed.description === "string" && parsed.description.length > 20
        ? parsed.description
        : (plainDescription || ""),
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter((s): s is string => typeof s === "string")
        : [],
      experienceLevel: typeof parsed.experienceLevel === "string"
        ? parsed.experienceLevel
        : "Not specified",
      employmentType: typeof parsed.employmentType === "string"
        ? parsed.employmentType
        : "Not specified",
      salary: typeof parsed.salary === "string" && parsed.salary !== "null"
        ? parsed.salary
        : null,
      benefits: Array.isArray(parsed.benefits)
        ? parsed.benefits.filter((b): b is string => typeof b === "string")
        : [],
      germanRequired: typeof parsed.germanRequired === "string"
        ? parsed.germanRequired
        : "Not required",
      yearsOfExperience: typeof parsed.yearsOfExperience === "string" && parsed.yearsOfExperience !== "null"
        ? parsed.yearsOfExperience
        : null,
    };
  } catch (err) {
    console.error("[enrichJobDescription] Error:", err);
    return null;
  }
}

const GERMANY_KEYWORDS = [
  "germany", "deutschland", "german",
  "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln",
  "düsseldorf", "dusseldorf", "stuttgart", "leipzig", "dortmund", "essen",
  "bremen", "hannover", "nuremberg", "nürnberg", "bonn", "karlsruhe",
  "mannheim", "augsburg", "wiesbaden", "gelsenkirchen", "mönchengladbach",
  "aachen", "kiel", "chemnitz", "magdeburg", "freiburg", "rostock",
  "potsdam", "ulm", "ingolstadt", "heidelberg", "bielefeld", "bochum",
  "münster", "kassel", "halle", "oberhausen", "braunschweig", "krefeld",
  "lübeck", "erfurt", "mainz", "paderborn", "regensburg", "saarbrücken",
  " de,", ", de ", "(de)", "germany,", ", germany",
];

export async function isGermanyLocation(
  location: string,
  title: string,
  company: string
): Promise<boolean> {
  const locationLower = (location ?? "").toLowerCase();
  const combined = `${locationLower} ${title.toLowerCase()}`;

  if (GERMANY_KEYWORDS.some((kw) => combined.includes(kw))) return true;

  if (!location || location.toLowerCase() === "remote" || location.toLowerCase() === "worldwide") {
    return false;
  }

  const settings = await getSettings();
  const prompt = `Is this job located in Germany? Answer only "yes" or "no".
Job title: ${title}
Company: ${company}
Location: ${location}`;

  try {
    const res = await fetch(`${settings.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: settings.model, prompt, stream: true, think: false }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok || !res.body) return false;

    // Stream tokens and abort the moment we read "yes" or "no" — no need to wait for full response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (!line.trim()) continue;
        try { accumulated += (JSON.parse(line).response ?? "").toLowerCase(); } catch { /* partial chunk */ }
      }

      if (accumulated.includes("yes")) { reader.cancel().catch(() => {}); return true; }
      if (accumulated.includes("no"))  { reader.cancel().catch(() => {}); return false; }
      if (accumulated.length > 50)     { reader.cancel().catch(() => {}); return false; }
    }

    return accumulated.includes("yes");
  } catch {
    return false;
  }
}