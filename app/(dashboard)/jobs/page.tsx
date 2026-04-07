"use client";

import { useEffect, useState, useCallback } from "react";
import { JobCard } from "@/components/JobCard";
import { useToast } from "@/components/ui/Toast";

type TabStatus = "new" | "all" | "applied" | "saved" | "rejected";

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

const TABS: { key: TabStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "all", label: "All" },
  { key: "applied", label: "Applied" },
  { key: "saved", label: "Saved" },
  { key: "rejected", label: "Rejected" },
];

export default function JobsPage() {
  const [tab, setTab] = useState<TabStatus>("new");
  const [jobs, setJobs] = useState<Job[]>([]);
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

    // Mark new jobs as seen when visiting the new tab
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

  useEffect(() => {
    fetchJobs(tab, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  const handleTabChange = (t: TabStatus) => {
    setTab(t);
    setPage(1);
  };

  const handleStatusChange = (id: string, status: string) => {
    setJobs((prev) => prev.map((j) => j._id === id ? { ...j, status } : j));
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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light text-[#010D39]">Jobs</h1>
          <p className="text-[#3F486B] text-sm mt-1">{total} job{total !== 1 ? "s" : ""} found</p>
        </div>
        <button
          onClick={matchAll}
          disabled={matchingAll}
          className="px-5 py-2.5 border border-[#0961FB] text-[#0961FB] text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          {matchingAll ? "Queueing..." : "Match All Unmatched"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#E6EBF2] rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-[#202B52] text-white shadow-sm"
                : "text-[#3F486B] hover:text-[#010D39] hover:bg-[#F8F9FF]"
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
            <div key={i} className="h-52 rounded-2xl bg-[#E6EBF2] animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-16 text-center">
          <p className="text-[#C8C8D8] text-lg">No {tab === "all" ? "" : tab} jobs yet</p>
          <p className="text-[#3F486B] text-sm mt-2">
            {tab === "new" ? "Run a scrape on the Sites page to find new jobs" : "Jobs you mark will appear here"}
          </p>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-[#E6EBF2] text-sm text-[#3F486B] hover:bg-[#F8F9FF] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-[#3F486B]">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-[#E6EBF2] text-sm text-[#3F486B] hover:bg-[#F8F9FF] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
