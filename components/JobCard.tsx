"use client";

import { useState } from "react";
import { ScoreBadge, Badge } from "./ui/Badge";
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
}

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
}

export function JobCard({ job, onStatusChange, onRematch }: JobCardProps) {
  const [showReason, setShowReason] = useState(false);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="bg-white rounded-2xl border border-[#E6EBF2] shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {job.isNew && <Badge variant="red">New</Badge>}
            <Badge variant="navy">{job.siteName}</Badge>
          </div>
          <h3 className="text-[#010D39] font-semibold text-base leading-tight truncate">{job.title}</h3>
          <p className="text-[#3F486B] text-sm mt-0.5">
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <ScoreBadge score={job.matchScore} />
      </div>

      {/* Match reason */}
      {job.matchReason && (
        <div>
          <button
            className="text-xs text-[#0961FB] hover:underline"
            onClick={() => setShowReason(!showReason)}
          >
            {showReason ? "Hide" : "Show"} match reason
          </button>
          {showReason && (
            <p className="text-xs text-[#3F486B] mt-1 bg-[#F8F9FF] rounded-lg px-3 py-2 border border-[#E6EBF2]">
              {job.matchReason}
            </p>
          )}
        </div>
      )}

      {/* Scraped date */}
      <p className="text-xs text-[#C8C8D8]">
        Found {new Date(job.scrapedAt).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#E6EBF2]">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#202B52] text-white hover:bg-[#010D39] transition-colors"
        >
          View Job
        </a>
        {job.status !== "applied" && (
          <button
            onClick={() => handleStatus("applied")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#128986] text-white hover:bg-[#01816A] transition-colors disabled:opacity-50"
          >
            Mark Applied
          </button>
        )}
        {job.status !== "saved" && job.status !== "applied" && (
          <button
            onClick={() => handleStatus("saved")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E6EBF2] text-[#3F486B] hover:bg-[#F8F9FF] transition-colors disabled:opacity-50"
          >
            Save
          </button>
        )}
        {job.status !== "rejected" && (
          <button
            onClick={() => handleStatus("rejected")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E6EBF2] text-[#3F486B] hover:bg-[#F8F9FF] transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
        {job.matchScore === null && (
          <button
            onClick={handleRematch}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#0961FB] text-[#0961FB] hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            Match
          </button>
        )}
      </div>
    </div>
  );
}
