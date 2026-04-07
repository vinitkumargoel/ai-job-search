"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";

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

const statCards = [
  { key: "totalSites", label: "Sites", color: "bg-[#202B52]", textColor: "text-white" },
  { key: "newJobs", label: "New Jobs", color: "bg-[#EA1815]", textColor: "text-white" },
  { key: "appliedJobs", label: "Applied", color: "bg-[#128986]", textColor: "text-white" },
  { key: "savedJobs", label: "Saved", color: "bg-[#0961FB]", textColor: "text-white" },
  { key: "totalJobs", label: "Total Jobs", color: "bg-white border border-[#E6EBF2]", textColor: "text-[#010D39]" },
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

  const statusVariant = (s: string) => {
    if (s === "success") return "green";
    if (s === "failed") return "red";
    return "gray";
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[#010D39]">Dashboard</h1>
          <p className="text-[#3F486B] text-sm mt-1">Your AI Job Search overview</p>
        </div>
        <button
          onClick={runAll}
          disabled={runningAll || loading}
          className="px-5 py-2.5 bg-[#EA1815] text-white text-sm font-semibold rounded-xl hover:bg-[#B2100B] transition-colors disabled:opacity-50"
        >
          {runningAll ? "Running..." : "Run All Now"}
        </button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#E6EBF2] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map(({ key, label, color, textColor }) => (
            <div key={key} className={`${color} rounded-2xl p-5 flex flex-col justify-between shadow-sm`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${textColor} opacity-70`}>{label}</p>
              <p className={`text-4xl font-light ${textColor} mt-2`}>
                {stats?.[key as keyof Stats] as number ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Sites Table */}
      <div className="bg-white rounded-2xl border border-[#E6EBF2] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6EBF2]">
          <h2 className="text-base font-semibold text-[#010D39]">Site Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EBF2] bg-[#F8F9FF]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Site</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Last Run</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody>
              {stats?.sites.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#C8C8D8] text-sm">
                    No sites yet. Go to Sites to add one.
                  </td>
                </tr>
              )}
              {stats?.sites.map((site) => (
                <tr key={site._id} className="border-b border-[#E6EBF2] last:border-0 hover:bg-[#F8F9FF] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#010D39]">{site.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(site.lastRunStatus) as "green" | "red" | "gray"}>
                      {site.lastRunStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[#3F486B]">
                    {site.lastRunAt ? new Date(site.lastRunAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2 h-2 rounded-full ${site.isActive ? "bg-[#128986]" : "bg-[#C8C8D8]"}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
