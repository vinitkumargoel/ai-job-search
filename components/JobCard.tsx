"use client";

import { useState, useRef } from "react";
import { ScoreBadge } from "./ui/Badge";
import { useToast } from "./ui/Toast";
import { JobDetailModal } from "./JobDetailModal";

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

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
}

const STATUS_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  new:      { bg: "bg-[#EEF1FE]",  text: "text-[#4F6AF5]", dot: "bg-[#4F6AF5]" },
  saved:    { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400" },
  applied:  { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500" },
  rejected: { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-400" },
};

export function JobCard({ job, onStatusChange, onRematch }: JobCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStatus = async (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
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

  const pill = STATUS_PILL[job.status] ?? STATUS_PILL.new;

  return (
    <>
      {/* Card — entire surface is clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => e.key === "Enter" && setShowDetail(true)}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-[#4F6AF5]/30 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#4F6AF5]/40"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Status + source badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
              {job.experienceLevel && job.experienceLevel !== "Not specified" && (
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {job.experienceLevel}
                </span>
              )}
              {job.germanRequired && job.germanRequired !== "Not required" && (
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  🇩🇪 {job.germanRequired}
                </span>
              )}
              {job.germanRequired === "Not required" && (
                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  🇩🇪 Not required
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {job.siteName}
              </span>
            </div>

            <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2">{job.title}</h3>
            <p className="text-gray-500 text-xs mt-1 truncate">{job.company}</p>
          </div>

          {/* Score + unread dot */}
          <div className="flex items-center gap-1.5 shrink-0">
            {job.isNew && (
              <span className="w-2 h-2 rounded-full bg-[#4F6AF5] shrink-0" title="Unread" />
            )}
            <ScoreBadge score={job.matchScore} />
          </div>
        </div>

        {/* Summary/description snippet */}
        {(job.summary || job.description) && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
            {job.summary || job.description}
          </p>
        )}

        {/* Top skills */}
        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((s) => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{s}</span>
            ))}
            {job.skills.length > 5 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-400">+{job.skills.length - 5}</span>
            )}
          </div>
        )}

        {/* AI match reason */}
        {job.matchReason && (
          <p className="text-xs text-[#4F6AF5] bg-[#EEF1FE] rounded-lg px-3 py-2 leading-relaxed line-clamp-2">
            {job.matchReason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2 mt-auto">
          <p className="text-[11px] text-gray-400">
            {new Date(job.scrapedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors"
            >
              Open
            </a>
            {job.status !== "applied" && (
              <button
                onClick={(e) => handleStatus(e, "applied")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Applied
              </button>
            )}
            {job.status !== "saved" && job.status !== "applied" && (
              <button
                onClick={(e) => handleStatus(e, "saved")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            )}
            {job.status !== "rejected" && (
              <button
                onClick={(e) => handleStatus(e, "rejected")}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Pass
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <JobDetailModal
          job={job}
          onClose={() => setShowDetail(false)}
          onStatusChange={(id, status) => {
            onStatusChange(id, status);
            setShowDetail(false);
          }}
          onRematch={(id) => {
            onRematch(id);
            setShowDetail(false);
          }}
        />
      )}
    </>
  );
}
