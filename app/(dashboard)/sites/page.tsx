"use client";

import { useEffect, useState } from "react";
import { SiteForm } from "@/components/SiteForm";
import { Badge } from "@/components/ui/Badge";
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

  const statusVariant = (s: string) => {
    if (s === "success") return "green";
    if (s === "failed") return "red";
    return "gray";
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[#010D39]">Sites</h1>
          <p className="text-[#3F486B] text-sm mt-1">Manage your job scraping sources</p>
        </div>
        <button
          onClick={() => { setEditSite(null); setShowForm(true); }}
          className="px-5 py-2.5 bg-[#EA1815] text-white text-sm font-semibold rounded-xl hover:bg-[#B2100B] transition-colors"
        >
          + Add Site
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#E6EBF2] animate-pulse" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-16 text-center">
          <p className="text-[#C8C8D8] text-lg">No sites yet</p>
          <p className="text-[#3F486B] text-sm mt-2">Add a site to start scraping jobs</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-[#EA1815] text-white text-sm font-semibold rounded-xl hover:bg-[#B2100B] transition-colors"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6EBF2] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6EBF2] bg-[#F8F9FF]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Scraper</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Schedule</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Last Run</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#3F486B] uppercase tracking-wider">Active</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site._id} className="border-b border-[#E6EBF2] last:border-0 hover:bg-[#F8F9FF] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#010D39]">{site.name}</p>
                    <p className="text-xs text-[#C8C8D8] truncate max-w-xs">{site.url}</p>
                  </td>
                  <td className="px-6 py-4"><Badge variant="navy">{site.scraperKey}</Badge></td>
                  <td className="px-6 py-4 font-mono text-xs text-[#3F486B]">{site.cronSchedule}</td>
                  <td className="px-6 py-4 text-[#3F486B] text-xs">
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
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => runNow(site)}
                        disabled={runningId === site._id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#202B52] text-white hover:bg-[#010D39] transition-colors disabled:opacity-50"
                      >
                        {runningId === site._id ? "Running..." : "Run Now"}
                      </button>
                      <button
                        onClick={() => { setEditSite(site); setShowForm(true); }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E6EBF2] text-[#3F486B] hover:bg-[#F8F9FF] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSite(site._id, site.name)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#EA1815]/30 text-[#EA1815] hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
