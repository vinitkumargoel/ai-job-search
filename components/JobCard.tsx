"use client";

import { useState } from "react";
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
  workLocation: string | null;
  visaSponsorship: string | null;
  url: string;
  postedAt: string;
  scrapedAt: string;
  notes: string;
}

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
  onRematch: (id: string) => void;
  onDelete: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const STATUS_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  new:      { bg: "bg-[#EEF1FE]",  text: "text-[#4F6AF5]", dot: "bg-[#4F6AF5]" },
  saved:    { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400" },
  applied:  { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500" },
  rejected: { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-400" },
};

// Domain mapping for favicon lookup
const SITE_DOMAINS: Record<string, string> = {
  amazon: "amazon.com",
  bosch: "bosch.com",
  celonis: "celonis.com",
  check24: "check24.de",
  commercetools: "commercetools.com",
  contentful: "contentful.com",
  deliveryhero: "deliveryhero.com",
  flix: "flixbus.com",
  getyourguide: "getyourguide.com",
  hellofresh: "hellofresh.com",
  n26: "n26.com",
  raisin: "raisin.com",
  sap: "sap.com",
  sapfioneer: "sapfioneer.com",
  scout24: "scout24.com",
  siemens: "siemens.com",
  softwareag: "softwareag.com",
  teamviewer: "teamviewer.com",
  zalando: "zalando.com",
  zeiss: "zeiss.com",
  parloa: "parloa.com",
  helsing: "helsing.ai",
  blackforestlabs: "blackforestlabs.ai",
  n8n: "n8n.io",
  deepl: "deepl.com",
  alephalpha: "aleph-alpha.de",
  sereact: "sereact.ai",
  quantumsystems: "quantum-systems.com",
  sumup: "sumup.com",
  traderepublic: "traderepublic.com",
  grover: "grover.com",
  staffbase: "staffbase.com",
  isaraerospace: "isaraerospace.com",
  personio: "personio.com",
  enpal: "enpal.de",
  forto: "forto.com",
  billie: "billie.io",
  sennder: "sennder.com",
  wolt: "wolt.com",
  ionos: "ionos.com",
  doctolib: "doctolib.de",
  moia: "moia.io",
  wayve: "wayve.ai",
  wunderflats: "wunderflats.com",
  adyen: "adyen.com",
  tulip: "tulip.com",
  hetzner: "hetzner.com",
  "telekom-it": "telekom.com",
  trivago: "trivago.com",
  flaconi: "flaconi.com",
  freenow: "free-now.com",
  auto1: "auto1.com",
  aboutyou: "aboutyou.com",
  scalablecapital: "scalable.capital",
  sixt: "sixt.com",
  babbel: "babbel.com",
  idealo: "idealo.de",
  mambu: "mambu.com",
};

const getFaviconUrl = (siteName: string, size = 32) => {
  const scraperKey = siteName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const domain = SITE_DOMAINS[scraperKey] || SITE_DOMAINS[Object.keys(SITE_DOMAINS).find(k => scraperKey.includes(k)) || ""] || siteName.toLowerCase().replace(/\s+/g, "") + ".com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
};

export function JobCard({ job, onStatusChange, onRematch, onDelete, selectable, selected, onSelect }: JobCardProps) {
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
        onClick={(e) => {
          // Only open detail modal if not clicking checkbox
          if (selectable && (e.target as HTMLElement).closest('[data-checkbox]')) return;
          setShowDetail(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && setShowDetail(true)}
        className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#4F6AF5]/40 ${
          selected ? "border-[#4F6AF5] ring-2 ring-[#4F6AF5]/20" : "border-gray-100 hover:border-[#4F6AF5]/30"
        }`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Checkbox + Status badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {selectable && (
                <button
                  data-checkbox
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(job._id, !selected);
                  }}
                  className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? "bg-[#4F6AF5] border-[#4F6AF5]"
                      : "border-gray-300 hover:border-[#4F6AF5]"
                  }`}
                >
                  {selected && (
                    <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )}
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
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <img
                  src={getFaviconUrl(job.siteName, 16)}
                  alt={job.siteName}
                  className="w-3 h-3 rounded-sm"
                  loading="lazy"
                />
                {job.siteName}
              </span>
              {job.workLocation && job.workLocation !== "Not specified" && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  job.workLocation === "Remote" ? "text-green-600 bg-green-50" :
                  job.workLocation === "Hybrid" ? "text-blue-600 bg-blue-50" :
                  "text-gray-600 bg-gray-100"
                }`}>
                  {job.workLocation === "Remote" && "🏠 "}
                  {job.workLocation === "Hybrid" && "🔀 "}
                  {job.workLocation === "On-site" && "🏢 "}
                  {job.workLocation}
                </span>
              )}
              {job.visaSponsorship === "Yes" && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✈️ Visa
                </span>
              )}
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
          onDelete={(id) => {
            onDelete(id);
            setShowDetail(false);
          }}
        />
      )}
    </>
  );
}
