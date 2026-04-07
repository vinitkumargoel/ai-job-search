"use client";

import { useEffect, useState, useCallback } from "react";
import { JobCard } from "@/components/JobCard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { FiltersModal } from "@/components/FiltersModal";
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
  const [showFilters, setShowFilters] = useState(false);

  // Actual filters (applied)
  const [filterGerman, setFilterGerman] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterSalary, setFilterSalary] = useState(false);

  // Temporary filters (in modal, not yet applied)
  const [tempFilterGerman, setTempFilterGerman] = useState("");
  const [tempFilterExp, setTempFilterExp] = useState("");
  const [tempFilterEmployment, setTempFilterEmployment] = useState("");
  const [tempFilterSalary, setTempFilterSalary] = useState(false);

  const activeFilterCount = [filterGerman, filterExp, filterEmployment, filterSalary ? "1" : ""].filter(Boolean).length;

  const { toast } = useToast();

  const fetchJobs = useCallback(async (activeTab: TabStatus, activePage: number) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20", page: String(activePage) });
    if (activeTab !== "all") params.set("status", activeTab);
    if (filterGerman) params.set("germanRequired", filterGerman);
    if (filterExp) params.set("experienceLevel", filterExp);
    if (filterEmployment) params.set("employmentType", filterEmployment);
    if (filterSalary) params.set("hasSalary", "true");

    const res = await fetch(`/api/jobs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);

      if (activeTab === "new") {
        for (const j of (data.jobs as Job[]).filter((j) => j.isNew)) {
          fetch(`/api/jobs/${j._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isNew: false }),
          }).catch(() => {});
        }
      }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGerman, filterExp, filterEmployment, filterSalary]);

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
  }, [tab, page, filterGerman, filterExp, filterEmployment, filterSalary]);

  useEffect(() => {
    if (view === "board") fetchBoardJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleTabChange = (t: TabStatus) => { setTab(t); setPage(1); };

  const handleStatusChange = (id: string, status: string) => {
    setJobs((prev) => prev.map((j) => j._id === id ? { ...j, status } : j));
    setBoardJobs((prev) => prev.map((j) => j._id === id ? { ...j, status } : j));
  };

  const handleDelete = (id: string) => {
    setJobs((prev) => prev.filter((j) => j._id !== id));
    setBoardJobs((prev) => prev.filter((j) => j._id !== id));
    setTotal((t) => t - 1);
  };

  const handleRematch = () => {
    setTimeout(() => fetchJobs(tab, page), 3000);
    toast("Matching job against active resume...", "info");
  };

  const openFiltersModal = () => {
    setTempFilterGerman(filterGerman);
    setTempFilterExp(filterExp);
    setTempFilterEmployment(filterEmployment);
    setTempFilterSalary(filterSalary);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilterGerman(tempFilterGerman);
    setFilterExp(tempFilterExp);
    setFilterEmployment(tempFilterEmployment);
    setFilterSalary(tempFilterSalary);
    setPage(1);
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    setTempFilterGerman("");
    setTempFilterExp("");
    setTempFilterEmployment("");
    setTempFilterSalary(false);
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
    new:      { title: "No new jobs", sub: "Run a scrape on the Sites page to discover new listings" },
    all:      { title: "No jobs found", sub: "Add a site and run a scrape to get started" },
    applied:  { title: "No applications yet", sub: "Mark jobs as applied to track them here" },
    saved:    { title: "Nothing saved", sub: "Save interesting jobs to revisit them later" },
    rejected: { title: "No rejected jobs", sub: "Jobs you pass on will appear here" },
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} job{total !== 1 ? "s" : ""} · 🇩🇪 Germany only
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
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
            {matchingAll ? "Queueing..." : "Match All"}
          </button>

          <button
            onClick={openFiltersModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              activeFilterCount > 0
                ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>
      </div>

      {/* Board view */}
      {view === "board" ? (
        <KanbanBoard jobs={boardJobs} onStatusChange={handleStatusChange} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-0 bg-white border border-gray-100 rounded-xl p-1 mb-4 overflow-x-auto shadow-sm w-full max-w-full">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-[#4F6AF5] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Grid */}
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
                    onDelete={handleDelete}
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

      {/* Filters Modal */}
      <FiltersModal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filterGerman={tempFilterGerman}
        setFilterGerman={setTempFilterGerman}
        filterExp={tempFilterExp}
        setFilterExp={setTempFilterExp}
        filterEmployment={tempFilterEmployment}
        setFilterEmployment={setTempFilterEmployment}
        filterSalary={tempFilterSalary}
        setFilterSalary={setTempFilterSalary}
        onClear={clearAllFilters}
        onApply={applyFilters}
      />
    </div>
  );
}