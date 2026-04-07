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
  url: string;
  postedAt: string;
  scrapedAt: string;
  notes: string;
}

interface Props {
  job: Job;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
  onDelete: (id: string) => void;
}

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
  const [rightTab, setRightTab]         = useState<"details" | "cover-letter">("details");
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
      else toast("Re-match failed — check Ollama is running", "error");
    } finally { setLoading(false); }
  };

  const generateCoverLetter = async () => {
    setGeneratingCL(true);
    setCoverLetter("");
    setRightTab("cover-letter");
    const res = await fetch(`/api/jobs/${job._id}/cover-letter`, { method: "POST" });
    if (res.ok) { const d = await res.json(); setCoverLetter(d.coverLetter ?? ""); }
    else setCoverLetter("Failed to generate — ensure Ollama is running and a resume is active.");
    setGeneratingCL(false);
  };

  const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.new;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Wide dialog — almost full screen */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {job.siteName}
              </span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                🇩🇪 {job.location}
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
                  💰 {job.salary}
                </span>
              )}
              {job.yearsOfExperience && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  ⏱️ {job.yearsOfExperience}
                </span>
              )}
              {job.germanRequired && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  job.germanRequired === "Not required"
                    ? "bg-green-50 text-green-700"
                    : "bg-orange-50 text-orange-700"
                }`}>
                  🇩🇪 German: {job.germanRequired}
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

        {/* ── Two-column body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ════ LEFT — full description ════ */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
            <div className="px-6 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{job.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* AI Summary banner */}
              {job.summary && (
                <div className="bg-[#EEF1FE] rounded-xl px-4 py-3 mb-5">
                  <p className="text-[11px] font-semibold text-[#4F6AF5] uppercase tracking-wider mb-1">AI Summary</p>
                  <p className="text-sm text-[#3B4DA8] leading-relaxed">{job.summary}</p>
                </div>
              )}

              {/* Full markdown description */}
              <div className="prose prose-sm prose-gray max-w-none
                prose-headings:font-semibold prose-headings:text-gray-800
                prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2
                prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1
                prose-p:text-sm prose-p:text-gray-600 prose-p:leading-relaxed prose-p:my-1.5
                prose-li:text-sm prose-li:text-gray-600 prose-li:my-0.5
                prose-ul:my-2 prose-ol:my-2 prose-ul:pl-5 prose-ol:pl-5
                prose-strong:text-gray-800 prose-strong:font-semibold
                prose-a:text-[#4F6AF5] prose-a:no-underline hover:prose-a:underline">
                {job.description
                  ? <ReactMarkdown>{job.description}</ReactMarkdown>
                  : <p className="text-sm italic text-gray-400">No description available for this job.</p>
                }
              </div>
            </div>
          </div>

          {/* ════ RIGHT — job details panel ════ */}
          <div className="w-[360px] shrink-0 flex flex-col overflow-hidden bg-gray-50/40">

            {/* Right tab bar */}
            <div className="flex border-b border-gray-100 shrink-0 bg-white">
              {(["details", "cover-letter"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  className={`flex-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                    rightTab === t
                      ? "border-[#4F6AF5] text-[#4F6AF5] bg-white"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "details" ? "Job Details" : "Cover Letter"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightTab === "details" && (
                <div className="px-5 py-5 space-y-5">

                  {/* Match score */}
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

                  {/* Skills */}
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

                  {/* Benefits */}
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

                  {/* Meta info */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Info</p>
                    <div className="space-y-2">
                      {[
                        { icon: "🏢", label: "Company",    value: job.company },
                        { icon: "📍", label: "Location",   value: job.location },
                        { icon: "🇩🇪", label: "German",     value: job.germanRequired ?? "Not required" },
                        { icon: "⏱️",  label: "Experience", value: job.yearsOfExperience },
                        { icon: "💰", label: "Salary",     value: job.salary },
                        { icon: "📅", label: "Posted",     value: job.postedAt ? new Date(job.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null },
                        { icon: "🔍", label: "Source",     value: job.siteName },
                      ].filter(r => r.value).map(({ icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <span className="text-sm shrink-0">{icon}</span>
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                            <p className="text-xs text-gray-700 font-medium">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                    <textarea
                      ref={notesRef}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={saveNotes}
                      placeholder="Recruiter name, salary info, interview notes…"
                      rows={3}
                      className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5]/20 transition-all placeholder-gray-400"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{savingNotes ? "Saving…" : "Auto-saves on blur"}</p>
                  </div>
                </div>
              )}

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
                        <p className="text-xs text-gray-400 mt-1">Uses your active resume + job description</p>
                      </div>
                      <button onClick={generateCoverLetter} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                        Generate with AI
                      </button>
                    </div>
                  )}
                  {generatingCL && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Generating with Ollama…</p>
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
            </div>

            {/* Action buttons pinned to bottom of right panel */}
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

              {/* Delete button */}
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
                    ✓ Applied
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
                    ✕ Reject
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={generateCoverLetter} disabled={generatingCL}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50">
                  Cover Letter
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
