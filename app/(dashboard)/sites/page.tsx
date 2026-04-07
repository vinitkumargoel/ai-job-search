"use client";

import { useEffect, useState } from "react";
import { SiteForm } from "@/components/SiteForm";
import { useToast } from "@/components/ui/Toast";

interface Site {
  _id: string;
  name: string;
  scraperKey: string;
  url: string;
  keywords: string;
  cronSchedule: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string;
}

const AVAILABLE_SCRAPERS = ["amazon"];

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSites = async () => {
    const res = await fetch("/api/sites");
    if (res.ok) setSites(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSites(); }, []);

  const deleteSite = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This won't delete its scraped jobs.`)) return;
    const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s._id !== id));
      toast(`"${name}" deleted`, "info");
    }
  };

  const toggleActive = async (site: Site) => {
    const res = await fetch(`/api/sites/${site._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !site.isActive }),
    });
    if (res.ok) {
      setSites((prev) => prev.map((s) => s._id === site._id ? { ...s, isActive: !s.isActive } : s));
      toast(`${site.name} ${!site.isActive ? "activated" : "deactivated"}`, "info");
    }
  };

  const runNow = async (site: Site) => {
    setRunningId(site._id);
    const res = await fetch(`/api/sites/${site._id}/run`, { method: "POST" });
    if (res.ok) toast(`Scrape started for "${site.name}"`, "success");
    else toast("Failed to start scrape", "error");
    setRunningId(null);
  };

  const statusConfig = (s: string) => {
    if (s === "success") return { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Success" };
    if (s === "failed") return { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Failed" };
    return { dot: "bg-gray-300", text: "text-gray-500", bg: "bg-gray-100", label: "Never" };
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-600 text-sm mt-1">Manage your job scraping sources</p>
        </div>
        <button
          onClick={() => { setEditSite(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Site
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold">No sites yet</p>
          <p className="text-gray-400 text-sm mt-1">Add a site to start scraping jobs automatically</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scraper</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Run</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sites.map((site) => {
                const sc = statusConfig(site.lastRunStatus);
                return (
                  <tr key={site._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{site.name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{site.url}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F6AF5] bg-[#EEF1FE] px-2.5 py-1 rounded-full">
                        {site.scraperKey}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{site.cronSchedule}</td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {site.lastRunAt ? new Date(site.lastRunAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(site)}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${site.isActive ? "bg-[#4F6AF5]" : "bg-gray-200"}`}
                      >
                        <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mt-[3px] ${site.isActive ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => runNow(site)}
                          disabled={runningId === site._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors disabled:opacity-50"
                        >
                          <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="5,3 19,12 5,21"/>
                          </svg>
                          {runningId === site._id ? "Running..." : "Run"}
                        </button>
                        <button
                          onClick={() => { setEditSite(site); setShowForm(true); }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSite(site._id, site.name)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SiteForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditSite(null); }}
        onSaved={fetchSites}
        availableScrapers={AVAILABLE_SCRAPERS}
        initial={editSite ?? undefined}
      />
    </div>
  );
}
