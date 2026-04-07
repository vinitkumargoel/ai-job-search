"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Stats {
  totalSites: number;
  totalJobs: number;
  newJobs: number;
  appliedJobs: number;
  savedJobs: number;
  sites: {
    _id: string;
    name: string;
    lastRunAt: string | null;
    lastRunStatus: string;
    isActive: boolean;
    nextRunAt: string | null;
  }[];
}

const STAT_CARDS = [
  {
    key: "newJobs",
    label: "New Jobs",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    ),
    color: "text-[#4F6AF5]",
    bg: "bg-[#EEF1FE]",
    accent: "border-l-[#4F6AF5]",
  },
  {
    key: "totalJobs",
    label: "Total Jobs",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    color: "text-gray-600",
    bg: "bg-gray-100",
    accent: "border-l-gray-300",
  },
  {
    key: "appliedJobs",
    label: "Applied",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <polyline points="20,6 9,17 4,12" />
      </svg>
    ),
    color: "text-green-600",
    bg: "bg-green-50",
    accent: "border-l-green-500",
  },
  {
    key: "savedJobs",
    label: "Saved",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50",
    accent: "border-l-amber-400",
  },
  {
    key: "totalSites",
    label: "Active Sites",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
      </svg>
    ),
    color: "text-purple-600",
    bg: "bg-purple-50",
    accent: "border-l-purple-500",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const runAll = async () => {
    if (!stats) return;
    setRunningAll(true);
    let started = 0;
    for (const site of stats.sites) {
      if (site.isActive) {
        await fetch(`/api/sites/${site._id}/run`, { method: "POST" });
        started++;
      }
    }
    toast(`Started scrape for ${started} site(s)`, "success");
    setRunningAll(false);
    setTimeout(fetchStats, 2000);
  };

  const statusConfig = (s: string) => {
    if (s === "success") return { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Success" };
    if (s === "failed") return { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Failed" };
    return { dot: "bg-gray-300", text: "text-gray-500", bg: "bg-gray-50", label: "Never" };
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">Your AI Job Search overview</p>
        </div>
        <button
          onClick={runAll}
          disabled={runningAll || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors disabled:opacity-50 shadow-sm"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          {runningAll ? "Running..." : "Run All Now"}
        </button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {STAT_CARDS.map(({ key, label, icon, color, bg, accent }) => (
            <div key={key} className={`bg-white rounded-xl p-5 flex flex-col gap-3 shadow-sm border border-gray-100 border-l-4 ${accent}`}>
              <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                {icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-0.5">
                  {stats?.[key as keyof Stats] as number ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sites Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Site Status</h2>
          <span className="text-xs text-gray-400">{stats?.sites.length ?? 0} sites configured</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Site</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Run</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!loading && (stats?.sites.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">
                    No sites yet. Go to <span className="font-semibold text-[#4F6AF5]">Sites</span> to add one.
                  </td>
                </tr>
              )}
              {stats?.sites.map((site) => {
                const sc = statusConfig(site.lastRunStatus);
                return (
                  <tr key={site._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{site.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {site.lastRunAt ? new Date(site.lastRunAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${site.isActive ? "text-green-600" : "text-gray-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${site.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                        {site.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
