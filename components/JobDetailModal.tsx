"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ScoreBadge } from "./ui/Badge";
import { useToast } from "./ui/Toast";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  siteName: string;
  status: string;
  isNew: boolean;
  matchScore: number | null;
  matchReason: string | null;
  description: string;
  summary: string | null;
  skills: string[];
  experienceLevel: string | null;
  employmentType: string | null;
  salary: string | null;
  benefits: string[];
  germanRequired: string | null;
  yearsOfExperience: string | null;
  workLocation: string | null;
  visaSponsorship: string | null;
  url: string;
  postedAt: string;
  scrapedAt: string;
  notes: string;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  website: string;
  summary: string;
  experience: { title: string; company: string; duration: string; location: string; bullets: string[] }[];
  education: { degree: string; school: string; year: string; details: string }[];
  skills: string[];
  certifications: string[];
  languages: string[];
  projects: { name: string; description: string; tech: string }[];
}

interface Props {
  job: Job;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
  onDelete: (id: string) => void;
}

type RightTab = "details" | "cover-letter" | "resume";

// Domain mapping for favicon lookup
const SITE_DOMAINS: Record<string, string> = {
  amazon: "amazon.com", bosch: "bosch.com", celonis: "celonis.com", check24: "check24.de",
  commercetools: "commercetools.com", contentful: "contentful.com", deliveryhero: "deliveryhero.com",
  flix: "flixbus.com", getyourguide: "getyourguide.com", hellofresh: "hellofresh.com",
  n26: "n26.com", raisin: "raisin.com", sap: "sap.com", sapfioneer: "sapfioneer.com",
  scout24: "scout24.com", siemens: "siemens.com", softwareag: "softwareag.com",
  teamviewer: "teamviewer.com", zalando: "zalando.com", zeiss: "zeiss.com",
  parloa: "parloa.com", helsing: "helsing.ai", blackforestlabs: "blackforestlabs.ai",
  n8n: "n8n.io", deepl: "deepl.com", alephalpha: "aleph-alpha.de", sereact: "sereact.ai",
  quantumsystems: "quantum-systems.com", sumup: "sumup.com", traderepublic: "traderepublic.com",
  grover: "grover.com", staffbase: "staffbase.com", isaraerospace: "isaraerospace.com",
  personio: "personio.com", enpal: "enpal.de", forto: "forto.com", billie: "billie.io",
  sennder: "sennder.com", wolt: "wolt.com", ionos: "ionos.com", doctolib: "doctolib.de",
  moia: "moia.io", wayve: "wayve.ai", wunderflats: "wunderflats.com", adyen: "adyen.com",
  tulip: "tulip.com", hetzner: "hetzner.com", "telekom-it": "telekom.com",
  trivago: "trivago.com", flaconi: "flaconi.com", freenow: "free-now.com",
  auto1: "auto1.com", aboutyou: "aboutyou.com", scalablecapital: "scalable.capital",
  sixt: "sixt.com", babbel: "babbel.com", idealo: "idealo.de", mambu: "mambu.com",
};

const getFaviconUrl = (siteName: string, size = 32) => {
  const scraperKey = siteName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const domain = SITE_DOMAINS[scraperKey] || SITE_DOMAINS[Object.keys(SITE_DOMAINS).find(k => scraperKey.includes(k)) || ""] || siteName.toLowerCase().replace(/\s+/g, "") + ".com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  new:      { label: "New",      dot: "bg-[#4F6AF5]", bg: "bg-[#EEF1FE]", text: "text-[#4F6AF5]" },
  saved:    { label: "Saved",    dot: "bg-amber-400",  bg: "bg-amber-50",  text: "text-amber-700" },
  applied:  { label: "Applied",  dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700" },
  rejected: { label: "Rejected", dot: "bg-red-400",    bg: "bg-red-50",    text: "text-red-700"  },
};

export function JobDetailModal({ job, onClose, onStatusChange, onRematch, onDelete }: Props) {
  const [notes, setNotes]               = useState(job.notes ?? "");
  const [savingNotes, setSavingNotes]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [coverLetter, setCoverLetter]   = useState("");
  const [generatingCL, setGeneratingCL] = useState(false);
  const [resumeData, setResumeData]     = useState<ResumeData | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [rightTab, setRightTab]         = useState<RightTab>("details");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { onStatusChange(job._id, status); toast(`Marked as ${status}`, "success"); }
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this job and add to skip list?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(job._id);
        toast("Job deleted and added to skip list", "success");
      } else {
        toast("Failed to delete job", "error");
      }
    } finally { setLoading(false); }
  };

  const saveNotes = async () => {
    if (notes === (job.notes ?? "")) return;
    setSavingNotes(true);
    await fetch(`/api/jobs/${job._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    toast("Note saved", "success");
  };

  const handleRematch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}/match`, { method: "POST" });
      if (res.ok) { onRematch(job._id); toast("Re-match started", "info"); }
      else {
        const data = await res.json();
        toast(data.error || "Re-match failed", "error");
      }
    } finally { setLoading(false); }
  };

  const generateCoverLetter = async () => {
    setGeneratingCL(true);
    setCoverLetter("");
    setRightTab("cover-letter");
    const res = await fetch(`/api/jobs/${job._id}/cover-letter`, { method: "POST" });
    if (res.ok) { const d = await res.json(); setCoverLetter(d.coverLetter ?? ""); }
    else {
      const d = await res.json().catch(() => ({}));
      setCoverLetter(d.error || "Failed to generate — ensure Ollama is running and your Profile is configured.");
    }
    setGeneratingCL(false);
  };

  const generateResume = async () => {
    setGeneratingResume(true);
    setResumeData(null);
    setRightTab("resume");
    const res = await fetch(`/api/jobs/${job._id}/generate-resume`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setResumeData(d.resume ?? null);
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Failed to generate resume", "error");
    }
    setGeneratingResume(false);
  };

  const downloadResumePDF = () => {
    if (!resumeData) return;
    // Build a print-optimized HTML document
    const html = buildResumePrintHTML(resumeData, job.title, job.company);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => { win.print(); }, 500);
      };
    }
    toast("Resume opened — use Print > Save as PDF", "info");
  };

  const copyResumeText = () => {
    if (!resumeData) return;
    const text = buildResumeText(resumeData);
    navigator.clipboard.writeText(text);
    toast("Resume text copied!", "success");
  };

  const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.new;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <img
                  src={getFaviconUrl(job.siteName, 16)}
                  alt={job.siteName}
                  className="w-3.5 h-3.5 rounded-sm"
                  loading="lazy"
                />
                {job.siteName}
              </span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {job.location}
              </span>
              {job.experienceLevel && job.experienceLevel !== "Not specified" && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                  {job.experienceLevel}
                </span>
              )}
              {job.employmentType && job.employmentType !== "Not specified" && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  {job.employmentType}
                </span>
              )}
              {job.salary && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  {job.salary}
                </span>
              )}
              {job.yearsOfExperience && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  {job.yearsOfExperience}
                </span>
              )}
              {job.germanRequired && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  job.germanRequired === "Not required"
                    ? "bg-green-50 text-green-700"
                    : "bg-orange-50 text-orange-700"
                }`}>
                  German: {job.germanRequired}
                </span>
              )}
              {job.workLocation && job.workLocation !== "Not specified" && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  job.workLocation === "Remote" ? "bg-green-50 text-green-700" :
                  job.workLocation === "Hybrid" ? "bg-blue-50 text-blue-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {job.workLocation === "Remote" && "🏠 "}
                  {job.workLocation === "Hybrid" && "🔀 "}
                  {job.workLocation === "On-site" && "🏢 "}
                  {job.workLocation}
                </span>
              )}
              {job.visaSponsorship === "Yes" && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  ✈️ Visa Sponsorship
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — full description */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-white to-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{job.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{job.company}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {job.summary && (
                <div className="bg-gradient-to-br from-[#EEF1FE] to-[#E8EBFA] rounded-xl px-5 py-4 mb-6 border border-[#4F6AF5]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" fill="none" stroke="#4F6AF5" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <p className="text-[11px] font-semibold text-[#4F6AF5] uppercase tracking-wider">AI Summary</p>
                  </div>
                  <p className="text-sm text-[#3B4DA8] leading-relaxed">{job.summary}</p>
                </div>
              )}

              <div className="prose prose-sm prose-slate max-w-none
                prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:tracking-tight
                prose-h1:text-xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-gray-200
                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-gray-800
                prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-gray-700
                prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-gray-600
                prose-p:text-sm prose-p:text-gray-600 prose-p:leading-7 prose-p:my-3
                prose-li:text-sm prose-li:text-gray-600 prose-li:leading-7 prose-li:my-1
                prose-ul:my-4 prose-ol:my-4 prose-ul:pl-6 prose-ol:pl-6
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:marker:text-gray-400
                prose-strong:text-gray-800 prose-strong:font-semibold
                prose-a:text-[#4F6AF5] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                prose-blockquote:border-l-[#4F6AF5] prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-600
                prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-gray-700 prose-code:before:content-none prose-code:after:content-none
                prose-hr:border-gray-200 prose-hr:my-6
                prose-img:rounded-lg prose-img:my-4">
                {job.description
                  ? <ReactMarkdown>{job.description}</ReactMarkdown>
                  : <p className="text-sm italic text-gray-400">No description available for this job.</p>
                }
              </div>
            </div>
          </div>

          {/* RIGHT — tabs panel */}
          <div className="w-[380px] shrink-0 flex flex-col overflow-hidden bg-gray-50/40">

            {/* Tab bar */}
            <div className="flex border-b border-gray-100 shrink-0 bg-white">
              {(["details", "cover-letter", "resume"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  className={`flex-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                    rightTab === t
                      ? "border-[#4F6AF5] text-[#4F6AF5] bg-white"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "details" ? "Details" : t === "cover-letter" ? "Cover Letter" : "Resume"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Details Tab */}
              {rightTab === "details" && (
                <div className="px-5 py-5 space-y-5">
                  {job.matchScore !== null && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Match Score</p>
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={job.matchScore} />
                        {job.matchReason && (
                          <p className="text-xs text-gray-500 leading-relaxed flex-1">{job.matchReason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {job.skills?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((s) => (
                          <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.benefits?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Benefits & Perks</p>
                      <div className="space-y-1.5">
                        {job.benefits.map((b) => (
                          <div key={b} className="flex items-start gap-2">
                            <svg className="shrink-0 mt-0.5 text-green-500" width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-xs text-gray-600">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Info</p>
                    <div className="space-y-2">
                      {[
                        { label: "Company",    value: job.company },
                        { label: "Location",   value: job.location },
                        { label: "German",     value: job.germanRequired ?? "Not required" },
                        { label: "Experience", value: job.yearsOfExperience },
                        { label: "Salary",     value: job.salary },
                        { label: "Posted",     value: job.postedAt ? new Date(job.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null },
                        { label: "Source",     value: job.siteName },
                      ].filter(r => r.value).map(({ label, value }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                            <p className="text-xs text-gray-700 font-medium">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                    <textarea
                      ref={notesRef}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={saveNotes}
                      placeholder="Recruiter name, salary info, interview notes..."
                      rows={3}
                      className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5]/20 transition-all placeholder-gray-400"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{savingNotes ? "Saving..." : "Auto-saves on blur"}</p>
                  </div>
                </div>
              )}

              {/* Cover Letter Tab */}
              {rightTab === "cover-letter" && (
                <div className="px-5 py-5">
                  {!coverLetter && !generatingCL && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <svg width="22" height="22" fill="none" stroke="#9333EA" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">Generate a cover letter</p>
                        <p className="text-xs text-gray-400 mt-1">Uses your profile + job description</p>
                      </div>
                      <button onClick={generateCoverLetter} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                        Generate with AI
                      </button>
                    </div>
                  )}
                  {generatingCL && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Generating cover letter...</p>
                    </div>
                  )}
                  {coverLetter && !generatingCL && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Cover Letter</p>
                        <div className="flex gap-2">
                          <button onClick={() => { navigator.clipboard.writeText(coverLetter); toast("Copied!", "success"); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Copy
                          </button>
                          <button onClick={generateCoverLetter}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                            Regenerate
                          </button>
                        </div>
                      </div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-white border border-gray-200 rounded-xl p-4">{coverLetter}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Resume Tab */}
              {rightTab === "resume" && (
                <div className="px-5 py-5">
                  {!resumeData && !generatingResume && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <svg width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">Generate a tailored resume</p>
                        <p className="text-xs text-gray-400 mt-1">ATS-optimized for this specific job</p>
                      </div>
                      <button onClick={generateResume} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        Generate Resume
                      </button>
                    </div>
                  )}
                  {generatingResume && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Generating tailored resume...</p>
                      <p className="text-xs text-gray-400">This may take a minute</p>
                    </div>
                  )}
                  {resumeData && !generatingResume && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Generated Resume</p>
                        <div className="flex gap-2">
                          <button onClick={copyResumeText}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Copy Text
                          </button>
                          <button onClick={downloadResumePDF}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Download PDF
                          </button>
                          <button onClick={generateResume}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                            Redo
                          </button>
                        </div>
                      </div>

                      {/* Resume preview */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                        {/* Header */}
                        <div className="text-center pb-3 border-b border-gray-200">
                          <h3 className="text-lg font-bold text-gray-900">{resumeData.name}</h3>
                          <div className="flex items-center justify-center flex-wrap gap-2 mt-1.5">
                            {[resumeData.email, resumeData.phone, resumeData.location].filter(Boolean).map((item, i) => (
                              <span key={i} className="text-xs text-gray-500">{item}{i < [resumeData.email, resumeData.phone, resumeData.location].filter(Boolean).length - 1 ? " |" : ""}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-center flex-wrap gap-2 mt-1">
                            {resumeData.linkedIn && <a href={resumeData.linkedIn} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F6AF5] hover:underline">{resumeData.linkedIn}</a>}
                            {resumeData.website && <a href={resumeData.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4F6AF5] hover:underline">{resumeData.website}</a>}
                          </div>
                        </div>

                        {/* Summary */}
                        {resumeData.summary && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Professional Summary</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{resumeData.summary}</p>
                          </div>
                        )}

                        {/* Experience */}
                        {resumeData.experience?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Experience</p>
                            {resumeData.experience.map((exp, i) => (
                              <div key={i} className="mb-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900">{exp.title}</p>
                                    <p className="text-xs text-gray-500">{exp.company}{exp.location ? ` | ${exp.location}` : ""}</p>
                                  </div>
                                  <p className="text-[10px] text-gray-400 shrink-0 ml-2">{exp.duration}</p>
                                </div>
                                {exp.bullets?.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {exp.bullets.map((b, j) => (
                                      <li key={j} className="text-xs text-gray-600 leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:bg-gray-300 before:rounded-full">{b}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Education */}
                        {resumeData.education?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Education</p>
                            {resumeData.education.map((edu, i) => (
                              <div key={i} className="mb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900">{edu.degree}</p>
                                    <p className="text-xs text-gray-500">{edu.school}</p>
                                  </div>
                                  <p className="text-[10px] text-gray-400 shrink-0 ml-2">{edu.year}</p>
                                </div>
                                {edu.details && <p className="text-[10px] text-gray-500 mt-0.5">{edu.details}</p>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Skills */}
                        {resumeData.skills?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {resumeData.skills.map((s, i) => (
                                <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certifications */}
                        {resumeData.certifications?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Certifications</p>
                            {resumeData.certifications.map((c, i) => (
                              <p key={i} className="text-xs text-gray-700">{c}</p>
                            ))}
                          </div>
                        )}

                        {/* Languages */}
                        {resumeData.languages?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Languages</p>
                            <p className="text-xs text-gray-700">{resumeData.languages.join(" | ")}</p>
                          </div>
                        )}

                        {/* Projects */}
                        {resumeData.projects?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Projects</p>
                            {resumeData.projects.map((p, i) => (
                              <div key={i} className="mb-2">
                                <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-600">{p.description}</p>
                                {p.tech && <p className="text-[10px] text-gray-400">{p.tech}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons pinned to bottom */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 space-y-2">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open Job Posting
              </a>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full py-2 text-xs font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Delete (Skip)
              </button>

              <div className="flex gap-2">
                {job.status !== "applied" && (
                  <button onClick={() => handleStatus("applied")} disabled={loading}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                    Applied
                  </button>
                )}
                {job.status !== "saved" && job.status !== "applied" && (
                  <button onClick={() => handleStatus("saved")} disabled={loading}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Save
                  </button>
                )}
                {job.status !== "rejected" && (
                  <button onClick={() => handleStatus("rejected")} disabled={loading}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={generateCoverLetter} disabled={generatingCL}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50">
                  Cover Letter
                </button>
                <button onClick={generateResume} disabled={generatingResume}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50">
                  Resume
                </button>
                {job.matchScore === null && (
                  <button onClick={handleRematch} disabled={loading}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-[#4F6AF5]/40 text-[#4F6AF5] hover:bg-[#EEF1FE] transition-colors disabled:opacity-50">
                    AI Match
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper functions for resume export ─── */

function buildResumeText(r: ResumeData): string {
  const lines: string[] = [];
  lines.push(r.name);
  lines.push([r.email, r.phone, r.location].filter(Boolean).join(" | "));
  if (r.linkedIn) lines.push(r.linkedIn);
  if (r.website) lines.push(r.website);
  lines.push("");

  if (r.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(r.summary);
    lines.push("");
  }

  if (r.experience?.length > 0) {
    lines.push("EXPERIENCE");
    for (const exp of r.experience) {
      lines.push(`${exp.title} | ${exp.company}${exp.location ? ` | ${exp.location}` : ""} | ${exp.duration}`);
      for (const b of exp.bullets ?? []) lines.push(`  - ${b}`);
      lines.push("");
    }
  }

  if (r.education?.length > 0) {
    lines.push("EDUCATION");
    for (const edu of r.education) {
      lines.push(`${edu.degree} | ${edu.school} | ${edu.year}`);
      if (edu.details) lines.push(`  ${edu.details}`);
    }
    lines.push("");
  }

  if (r.skills?.length > 0) {
    lines.push("SKILLS");
    lines.push(r.skills.join(", "));
    lines.push("");
  }

  if (r.certifications?.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push(r.certifications.join(", "));
    lines.push("");
  }

  if (r.languages?.length > 0) {
    lines.push("LANGUAGES");
    lines.push(r.languages.join(" | "));
    lines.push("");
  }

  if (r.projects?.length > 0) {
    lines.push("PROJECTS");
    for (const p of r.projects) {
      lines.push(`${p.name}: ${p.description}${p.tech ? ` (${p.tech})` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildResumePrintHTML(r: ResumeData, jobTitle: string, company: string): string {
  const escape = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const contactLine = [r.email, r.phone, r.location].filter(Boolean).map(escape).join(" &bull; ");
  const links = [r.linkedIn, r.website].filter(Boolean);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escape(r.name)} - Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1a1a1a; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 40px 50px; }
  @media print {
    body { padding: 20px 30px; }
    @page { margin: 0.5in; size: A4; }
  }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .contact { font-size: 12px; color: #555; margin-top: 4px; }
  .contact a { color: #4F6AF5; text-decoration: none; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #4F6AF5; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; }
  .summary { font-size: 13px; color: #333; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
  .exp-title { font-size: 13px; font-weight: 600; }
  .exp-company { font-size: 12px; color: #555; }
  .exp-date { font-size: 11px; color: #888; white-space: nowrap; }
  .exp-bullets { list-style: disc; padding-left: 18px; margin-top: 4px; }
  .exp-bullets li { font-size: 12px; color: #444; margin-bottom: 2px; line-height: 1.6; }
  .exp-block { margin-bottom: 12px; }
  .skills-list { font-size: 12px; color: #333; }
  .edu-block { margin-bottom: 6px; }
  .edu-degree { font-size: 13px; font-weight: 600; }
  .edu-school { font-size: 12px; color: #555; }
  .edu-date { font-size: 11px; color: #888; }
  .edu-details { font-size: 11px; color: #666; }
  .cert-item, .lang-item { font-size: 12px; color: #333; }
  .proj-name { font-size: 13px; font-weight: 600; }
  .proj-desc { font-size: 12px; color: #444; }
  .proj-tech { font-size: 11px; color: #888; }
</style>
</head>
<body>
<div style="text-align:center; margin-bottom: 4px;">
  <h1>${escape(r.name)}</h1>
  <div class="contact">${contactLine}</div>
  ${links.length > 0 ? `<div class="contact">${links.map(l => `<a href="${escape(l)}">${escape(l)}</a>`).join(" &bull; ")}</div>` : ""}
</div>`;

  if (r.summary) {
    html += `<div class="section-title">Professional Summary</div>
<p class="summary">${escape(r.summary)}</p>`;
  }

  if (r.experience?.length > 0) {
    html += `<div class="section-title">Experience</div>`;
    for (const exp of r.experience) {
      html += `<div class="exp-block">
  <div class="exp-header">
    <div><span class="exp-title">${escape(exp.title)}</span><br/><span class="exp-company">${escape(exp.company)}${exp.location ? ` | ${escape(exp.location)}` : ""}</span></div>
    <span class="exp-date">${escape(exp.duration)}</span>
  </div>`;
      if (exp.bullets?.length > 0) {
        html += `<ul class="exp-bullets">${exp.bullets.map(b => `<li>${escape(b)}</li>`).join("")}</ul>`;
      }
      html += `</div>`;
    }
  }

  if (r.education?.length > 0) {
    html += `<div class="section-title">Education</div>`;
    for (const edu of r.education) {
      html += `<div class="edu-block">
  <div class="exp-header"><div><span class="edu-degree">${escape(edu.degree)}</span><br/><span class="edu-school">${escape(edu.school)}</span></div><span class="edu-date">${escape(edu.year)}</span></div>
  ${edu.details ? `<p class="edu-details">${escape(edu.details)}</p>` : ""}
</div>`;
    }
  }

  if (r.skills?.length > 0) {
    html += `<div class="section-title">Skills</div>
<p class="skills-list">${r.skills.map(escape).join(", ")}</p>`;
  }

  if (r.certifications?.length > 0) {
    html += `<div class="section-title">Certifications</div>
${r.certifications.map(c => `<p class="cert-item">${escape(c)}</p>`).join("")}`;
  }

  if (r.languages?.length > 0) {
    html += `<div class="section-title">Languages</div>
<p class="lang-item">${r.languages.map(escape).join(" | ")}</p>`;
  }

  if (r.projects?.length > 0) {
    html += `<div class="section-title">Projects</div>`;
    for (const p of r.projects) {
      html += `<div style="margin-bottom:6px;">
  <span class="proj-name">${escape(p.name)}</span>
  <p class="proj-desc">${escape(p.description)}</p>
  ${p.tech ? `<p class="proj-tech">${escape(p.tech)}</p>` : ""}
</div>`;
    }
  }

  html += `</body></html>`;
  return html;
}
