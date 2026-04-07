"use client";

import { useState, useRef } from "react";
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
  url: string;
  scrapedAt: string;
  notes: string;
}

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
}

export function JobCard({ job, onStatusChange, onRematch }: JobCardProps) {
  const [showReason, setShowReason] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [generatingCL, setGeneratingCL] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onStatusChange(job._id, status);
        toast(`Marked as ${status}`, "success");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRematch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}/match`, { method: "POST" });
      if (res.ok) {
        onRematch(job._id);
        toast("Re-match started", "info");
      } else {
        toast("Re-match failed — check Ollama is running", "error");
      }
    } finally {
      setLoading(false);
    }
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

  const generateCoverLetter = async () => {
    setGeneratingCL(true);
    setCoverLetter("");
    setShowCoverLetter(true);
    const res = await fetch(`/api/jobs/${job._id}/cover-letter`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCoverLetter(data.coverLetter ?? "");
    } else {
      setCoverLetter("Failed to generate — ensure Ollama is running and a resume is active.");
    }
    setGeneratingCL(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-200 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {job.isNew && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#4F6AF5] px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {job.siteName}
              </span>
            </div>
            <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2">{job.title}</h3>
            <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {job.company}{job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <ScoreBadge score={job.matchScore} />
        </div>

        {/* Match reason */}
        {job.matchReason && (
          <div>
            <button
              className="text-[11px] font-medium text-[#4F6AF5] hover:text-[#3B56E0] flex items-center gap-1 transition-colors"
              onClick={() => setShowReason(!showReason)}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {showReason
                  ? <polyline points="18,15 12,9 6,15" />
                  : <polyline points="6,9 12,15 18,9" />
                }
              </svg>
              {showReason ? "Hide" : "Show"} AI match reason
            </button>
            {showReason && (
              <p className="text-xs text-gray-600 mt-2 bg-[#EEF1FE] rounded-lg px-3 py-2.5 leading-relaxed">
                {job.matchReason}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <button
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            onClick={() => {
              setShowNotes(!showNotes);
              if (!showNotes) setTimeout(() => notesRef.current?.focus(), 50);
            }}
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {notes ? "Edit note" : "Add note"}
            {notes && !showNotes && (
              <span className="text-gray-400 truncate max-w-[120px]"> — {notes}</span>
            )}
          </button>
          {showNotes && (
            <div className="mt-2">
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Recruiter name, salary info, interview feedback…"
                rows={3}
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5]/20 transition-all placeholder-gray-400"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">{savingNotes ? "Saving…" : "Auto-saves on blur"}</span>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="text-[10px] font-semibold text-[#4F6AF5] hover:text-[#3B56E0] disabled:opacity-50 transition-colors"
                >
                  Save now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
          <p className="text-[11px] text-gray-500">
            {new Date(job.scrapedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors"
            >
              View
            </a>
            <button
              onClick={generateCoverLetter}
              disabled={generatingCL}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              Cover Letter
            </button>
            {job.status !== "applied" && (
              <button
                onClick={() => handleStatus("applied")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Applied
              </button>
            )}
            {job.status !== "saved" && job.status !== "applied" && (
              <button
                onClick={() => handleStatus("saved")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            )}
            {job.status !== "rejected" && (
              <button
                onClick={() => handleStatus("rejected")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                Pass
              </button>
            )}
            {job.matchScore === null && (
              <button
                onClick={handleRematch}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#4F6AF5]/40 text-[#4F6AF5] hover:bg-[#EEF1FE] transition-colors disabled:opacity-50"
              >
                Match
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cover Letter Modal */}
      {showCoverLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">AI Cover Letter</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{job.title} · {job.company}</p>
              </div>
              <div className="flex items-center gap-2">
                {coverLetter && !generatingCL && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(coverLetter); toast("Copied to clipboard!", "success"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy
                  </button>
                )}
                <button
                  onClick={() => setShowCoverLetter(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              {generatingCL ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Generating with AI…</p>
                </div>
              ) : (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{coverLetter}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
