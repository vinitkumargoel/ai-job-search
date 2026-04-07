"use client";

import { useEffect, useState, useCallback } from "react";
import { JobCard } from "@/components/JobCard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useToast } from "@/components/ui/Toast";

type TabStatus = "new" | "all" | "applied" | "saved" | "rejected";
type ViewMode = "grid" | "board";

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

const TABS: { key: TabStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "all", label: "All" },
  { key: "applied", label: "Applied" },
  { key: "saved", label: "Saved" },
  { key: "rejected", label: "Rejected" },
];

export default function JobsPage() {
  const [tab, setTab] = useState<TabStatus>("new");
  const [view, setView] = useState<ViewMode>("grid");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [boardJobs, setBoardJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [matchingAll, setMatchingAll] = useState(false);
  const { toast } = useToast();

  const fetchJobs = useCallback(async (activeTab: TabStatus, activePage: number) => {
    setLoading(true);
    const status = activeTab === "all" ? "" : `&status=${activeTab}`;
    const res = await fetch(`/api/jobs?limit=20&page=${activePage}${status}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
    }
    setLoading(false);

    if (activeTab === "new") {
      const newOnes = jobs.filter((j) => j.isNew);
      for (const j of newOnes) {
        fetch(`/api/jobs/${j._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isNew: false }),
        }).catch(() => {});
      }
    }
  }, [jobs]);

  // Fetch all jobs (no status filter) for the board view
  const fetchBoardJobs = useCallback(async () => {
    const res = await fetch("/api/jobs?limit=200");
    if (res.ok) {
      const data = await res.json();
      setBoardJobs(data.jobs);
    }
  }, []);

  useEffect(() => {
    fetchJobs(tab, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  useEffect(() => {
    if (view === "board") fetchBoardJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleTabChange = (t: TabStatus) => {
    setTab(t);
    setPage(1);
  };

  const handleStatusChange = (id: string, status: string) => {
    setJobs((prev) => prev.map((j) => j._id === id ? { ...j, status } : j));
    setBoardJobs((prev) => prev.map((j) => j._id === id ? { ...j, status } : j));
  };

  const handleRematch = (id: string) => {
    setTimeout(() => fetchJobs(tab, page), 3000);
    toast("Matching job against active resume...", "info");
  };

  const matchAll = async () => {
    setMatchingAll(true);
    const res = await fetch("/api/jobs/match-all", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      toast(`Queued ${data.queued} job(s) for AI matching`, "success");
    } else {
      toast("Match-all failed — is a resume active?", "error");
    }
    setMatchingAll(false);
  };

  const totalPages = Math.ceil(total / 20);

  const emptyMessages: Record<TabStatus, { title: string; sub: string }> = {
    new: { title: "No new jobs", sub: "Run a scrape on the Sites page to discover new listings" },
    all: { title: "No jobs found", sub: "Add a site and run a scrape to get started" },
    applied: { title: "No applications yet", sub: "Mark jobs as applied to track them here" },
    saved: { title: "Nothing saved", sub: "Save interesting jobs to revisit them later" },
    rejected: { title: "No rejected jobs", sub: "Jobs you pass on will appear here" },
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 text-sm mt-1">
            {total} job{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-white border border-gray-100 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-all ${view === "grid" ? "bg-[#4F6AF5] text-white" : "text-gray-400 hover:text-gray-600"}`}
              title="Grid view"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setView("board")}
              className={`p-1.5 rounded-md transition-all ${view === "board" ? "bg-[#4F6AF5] text-white" : "text-gray-400 hover:text-gray-600"}`}
              title="Board view"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="12" rx="1"/>
                <rect x="17" y="3" width="4" height="15" rx="1"/>
              </svg>
            </button>
          </div>

          <button
            onClick={matchAll}
            disabled={matchingAll}
            className="flex items-center gap-2 px-4 py-2 border border-[#4F6AF5]/40 text-[#4F6AF5] text-sm font-semibold rounded-lg hover:bg-[#EEF1FE] transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {matchingAll ? "Queueing..." : "Match All Unmatched"}
          </button>
        </div>
      </div>

      {/* Board view */}
      {view === "board" ? (
        <KanbanBoard jobs={boardJobs} onStatusChange={handleStatusChange} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-0 bg-white border border-gray-100 rounded-xl p-1 mb-6 overflow-x-auto shadow-sm w-full max-w-full">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-[#4F6AF5] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <p className="text-gray-900 font-semibold">{emptyMessages[tab].title}</p>
              <p className="text-gray-400 text-sm mt-1">{emptyMessages[tab].sub}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onStatusChange={handleStatusChange}
                    onRematch={handleRematch}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="15,18 9,12 15,6" />
                    </svg>
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-2">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
