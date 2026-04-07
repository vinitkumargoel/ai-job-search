"use client";

import { useEffect, useState } from "react";
import { CronLogPanel } from "@/components/CronLogPanel";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface Site {
  _id: string;
  name: string;
  cronSchedule: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string;
}

export default function CronPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSites = async () => {
    const res = await fetch("/api/sites");
    if (res.ok) setSites(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSites(); }, []);

  const runNow = async (site: Site) => {
    setRunningId(site._id);
    const res = await fetch(`/api/sites/${site._id}/run`, { method: "POST" });
    if (res.ok) toast(`Scrape started for "${site.name}"`, "success");
    else toast("Failed to trigger scrape", "error");
    setRunningId(null);
  };

  const toggleActive = async (site: Site) => {
    const res = await fetch(`/api/sites/${site._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !site.isActive }),
    });
    if (res.ok) {
      setSites((prev) => prev.map((s) => s._id === site._id ? { ...s, isActive: !s.isActive } : s));
      toast(`${site.name} ${!site.isActive ? "activated" : "paused"}`, "info");
    }
  };

  const statusVariant = (s: string) => {
    if (s === "success") return "green";
    if (s === "failed") return "red";
    return "gray";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-[#010D39]">Cron</h1>
        <p className="text-[#3F486B] text-sm mt-1">Manage schedules and view scraping activity</p>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl border border-[#E6EBF2] shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[#E6EBF2]">
          <h2 className="text-base font-semibold text-[#010D39]">Schedules</h2>
        </div>

        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-[#E6EBF2] animate-pulse" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#C8C8D8]">No sites configured yet.</p>
            <p className="text-[#3F486B] text-sm mt-1">Add sites on the Sites page to schedule scraping.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EBF2] bg-[#F8F9FF]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Site</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Cron</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Last Run</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Active</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site._id} className="border-b border-[#E6EBF2] last:border-0 hover:bg-[#F8F9FF] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#010D39]">{site.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-[#3F486B]">{site.cronSchedule}</td>
                  <td className="px-6 py-4 text-xs text-[#3F486B]">
                    {site.lastRunAt ? new Date(site.lastRunAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(site.lastRunStatus) as "green" | "red" | "gray"}>
                      {site.lastRunStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(site)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${site.isActive ? "bg-[#128986]" : "bg-[#C8C8D8]"}`}
                    >
                      <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform mt-1 ${site.isActive ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => runNow(site)}
                      disabled={runningId === site._id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#202B52] text-white hover:bg-[#010D39] transition-colors disabled:opacity-50"
                    >
                      {runningId === site._id ? "Running..." : "Run Now"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Panel */}
      <CronLogPanel />
    </div>
  );
}
