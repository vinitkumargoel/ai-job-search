"use client";

import { useEffect, useState, useMemo } from "react";
import { CronLogPanel } from "@/components/CronLogPanel";
import { useToast } from "@/components/ui/Toast";

interface Site {
  _id: string;
  name: string;
  scraperKey: string;
  cronSchedule: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastRunStatus: string;
}

// ── Shared metadata (same as Sites page) ──────────────────────────────────────
const SCRAPER_META: Record<string, { ats: string; city?: string }> = {
  amazon:          { ats: "Custom",          city: "Global" },
  bosch:           { ats: "SmartRecruiters", city: "Stuttgart" },
  celonis:         { ats: "Greenhouse",      city: "Munich" },
  check24:         { ats: "Custom",          city: "Munich" },
  commercetools:   { ats: "Greenhouse",      city: "Munich" },
  contentful:      { ats: "Greenhouse",      city: "Berlin" },
  deliveryhero:    { ats: "Custom",          city: "Berlin" },
  flix:            { ats: "Greenhouse",      city: "Munich" },
  getyourguide:    { ats: "Greenhouse",      city: "Berlin" },
  hellofresh:      { ats: "Greenhouse",      city: "Berlin" },
  n26:             { ats: "Greenhouse",      city: "Berlin" },
  raisin:          { ats: "Greenhouse",      city: "Berlin" },
  sap:             { ats: "SuccessFactors",  city: "Walldorf" },
  sapfioneer:      { ats: "Custom",          city: "Walldorf" },
  scout24:         { ats: "Greenhouse",      city: "Munich" },
  siemens:         { ats: "Avature",         city: "Munich" },
  softwareag:      { ats: "Dayforce",        city: "Darmstadt" },
  teamviewer:      { ats: "Teamtailor",      city: "Göppingen" },
  zalando:         { ats: "Custom",          city: "Berlin" },
  zeiss:           { ats: "Workday",         city: "Jena" },
  parloa:          { ats: "Greenhouse",      city: "Berlin" },
  helsing:         { ats: "Greenhouse",      city: "Munich" },
  blackforestlabs: { ats: "Greenhouse",      city: "Freiburg" },
  n8n:             { ats: "Ashby",           city: "Berlin" },
  deepl:           { ats: "Ashby",           city: "Cologne" },
  alephalpha:      { ats: "Ashby",           city: "Heidelberg" },
  sereact:         { ats: "Ashby",           city: "Stuttgart" },
  quantumsystems:  { ats: "Personio",        city: "Munich" },
  sumup:           { ats: "Greenhouse",      city: "Berlin" },
  traderepublic:   { ats: "Greenhouse",      city: "Berlin" },
  grover:          { ats: "Greenhouse",      city: "Berlin" },
  staffbase:       { ats: "Greenhouse",      city: "Chemnitz" },
  isaraerospace:   { ats: "Greenhouse",      city: "Munich" },
  personio:        { ats: "Ashby",           city: "Munich" },
  enpal:           { ats: "Ashby",           city: "Berlin" },
  forto:           { ats: "Ashby",           city: "Berlin" },
  billie:          { ats: "Ashby",           city: "Berlin" },
  sennder:         { ats: "SmartRecruiters", city: "Berlin" },
  // Wave 4
  wolt:            { ats: "Greenhouse",      city: "Berlin" },
  ionos:           { ats: "Greenhouse",      city: "Karlsruhe" },
  doctolib:        { ats: "Greenhouse",      city: "Berlin" },
  moia:            { ats: "Greenhouse",      city: "Hamburg" },
  wayve:           { ats: "Greenhouse",      city: "Germany" },
  wunderflats:     { ats: "Greenhouse",      city: "Berlin" },
  adyen:           { ats: "Greenhouse",      city: "Berlin" },
  tulip:           { ats: "Greenhouse",      city: "Munich" },
  hetzner:         { ats: "Custom",          city: "Nuremberg" },
  "telekom-it":    { ats: "SmartRecruiters", city: "Darmstadt" },
  // Wave 3
  trivago:         { ats: "Greenhouse",      city: "Düsseldorf" },
  flaconi:         { ats: "Greenhouse",      city: "Berlin" },
  freenow:         { ats: "Greenhouse",      city: "Hamburg" },
  auto1:           { ats: "SmartRecruiters", city: "Berlin" },
  aboutyou:        { ats: "SmartRecruiters", city: "Hamburg" },
  scalablecapital: { ats: "SmartRecruiters", city: "Munich" },
  sixt:            { ats: "SmartRecruiters", city: "Munich" },
  babbel:          { ats: "Personio",        city: "Berlin" },
  idealo:          { ats: "Personio",        city: "Berlin" },
  mambu:           { ats: "Personio",        city: "Berlin" },
};

const ATS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Greenhouse:      { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500" },
  Ashby:           { bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-500" },
  SmartRecruiters: { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  Workday:         { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500" },
  Avature:         { bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-500" },
  Dayforce:        { bg: "bg-pink-50",    text: "text-pink-700",   dot: "bg-pink-500" },
  Teamtailor:      { bg: "bg-teal-50",    text: "text-teal-700",   dot: "bg-teal-500" },
  SuccessFactors:  { bg: "bg-indigo-50",  text: "text-indigo-700", dot: "bg-indigo-400" },
  Personio:        { bg: "bg-rose-50",    text: "text-rose-700",   dot: "bg-rose-400" },
  Custom:          { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
};

const STATUS_CONFIG = {
  success: { dot: "bg-green-500",  text: "text-green-700", bg: "bg-green-50",  label: "Success" },
  failed:  { dot: "bg-red-500",    text: "text-red-600",   bg: "bg-red-50",    label: "Failed"  },
  never:   { dot: "bg-gray-300",   text: "text-gray-400",  bg: "bg-gray-100",  label: "Never"   },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Overdue";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

// ── Schedule Card ─────────────────────────────────────────────────────────────
function ScheduleCard({
  site,
  onRun,
  onToggle,
  running,
}: {
  site: Site;
  onRun: () => void;
  onToggle: () => void;
  running: boolean;
}) {
  const meta      = SCRAPER_META[site.scraperKey] ?? { ats: "Custom" };
  const atsColor  = ATS_COLORS[meta.ats] ?? ATS_COLORS.Custom;
  const sc        = STATUS_CONFIG[site.lastRunStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.never;

  return (
    <div className={`relative bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200
      ${site.isActive
        ? "border-gray-100 shadow-sm hover:shadow-md hover:border-[#202B52]/20"
        : "border-gray-100 shadow-sm opacity-55 hover:opacity-75"
      }`}
    >
      {/* Active stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl ${site.isActive ? "bg-[#128986]" : "bg-gray-200"}`} />

      {/* Body */}
      <div className="px-4 pt-4 pb-3 flex flex-col gap-2.5">
        {/* Name + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{site.name}</p>
            {meta.city && (
              <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 21s-8-6.686-8-12a8 8 0 0 1 16 0c0 5.314-8 12-8 12z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                {meta.city}
              </p>
            )}
          </div>
          <button
            onClick={onToggle}
            title={site.isActive ? "Pause" : "Activate"}
            className={`relative flex-shrink-0 inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none mt-0.5
              ${site.isActive ? "bg-[#128986]" : "bg-gray-200"}`}
          >
            <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mt-[3px]
              ${site.isActive ? "translate-x-[18px]" : "translate-x-[3px]"}`}
            />
          </button>
        </div>

        {/* ATS + status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${atsColor.bg} ${atsColor.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${atsColor.dot}`} />
            {meta.ats}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Cron expression */}
        <div className="flex items-center gap-1.5">
          <svg width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="font-mono text-[11px] text-gray-500">{site.cronSchedule}</span>
        </div>

        {/* Last run / next run */}
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div>
            <span className="text-gray-400">Last </span>
            <span className="text-gray-700 font-medium">{timeAgo(site.lastRunAt)}</span>
          </div>
          <div>
            <span className="text-gray-400">Next </span>
            <span className="text-gray-700 font-medium">{timeUntil(site.nextRunAt)}</span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-1.5">
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#202B52] text-white hover:bg-[#010D39] transition-colors disabled:opacity-50 flex-1 justify-center"
        >
          {running ? (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg width="9" height="9" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          )}
          {running ? "Running…" : "Run Now"}
        </button>
        <span className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg ${site.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
          {site.isActive ? "Active" : "Paused"}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CronPage() {
  const [sites, setSites]         = useState<Site[]>([]);
  const [loading, setLoading]     = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [groupByAts, setGroupByAts] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");
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
      setSites((prev) => prev.map((s) =>
        s._id === site._id ? { ...s, isActive: !s.isActive } : s
      ));
      toast(`${site.name} ${!site.isActive ? "activated" : "paused"}`, "info");
    }
  };

  const runAll = async () => {
    const activeSites = sites.filter((s) => s.isActive);
    if (activeSites.length === 0) {
      toast("No active sites to run", "error");
      return;
    }
    setRunningAll(true);
    let successCount = 0;
    for (const site of activeSites) {
      setRunningId(site._id);
      const res = await fetch(`/api/sites/${site._id}/run`, { method: "POST" });
      if (res.ok) successCount++;
      await new Promise((r) => setTimeout(r, 500)); // small delay between runs
    }
    setRunningId(null);
    setRunningAll(false);
    toast(`Started ${successCount}/${activeSites.length} scrapers`, successCount === activeSites.length ? "success" : "info");
  };

  // Filtered sites
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = sites.filter((s) => {
      if (statusFilter === "Active"   && !s.isActive) return false;
      if (statusFilter === "Paused"   && s.isActive)  return false;
      if (statusFilter === "Success"  && s.lastRunStatus !== "success") return false;
      if (statusFilter === "Failed"   && s.lastRunStatus !== "failed")  return false;
      if (!q) return true;
      const meta = SCRAPER_META[s.scraperKey];
      return (
        s.name.toLowerCase().includes(q) ||
        s.scraperKey.toLowerCase().includes(q) ||
        (meta?.ats ?? "").toLowerCase().includes(q) ||
        (meta?.city ?? "").toLowerCase().includes(q)
      );
    });
    if (sortOrder === "asc") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "desc") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    }
    return result;
  }, [sites, search, statusFilter, sortOrder]);

  // Group by ATS
  const grouped = useMemo(() => {
    const map = new Map<string, Site[]>();
    for (const site of filtered) {
      const ats = SCRAPER_META[site.scraperKey]?.ats ?? "Custom";
      if (!map.has(ats)) map.set(ats, []);
      map.get(ats)!.push(site);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  // Summary stats
  const active  = sites.filter((s) => s.isActive).length;
  const success = sites.filter((s) => s.lastRunStatus === "success").length;
  const failed  = sites.filter((s) => s.lastRunStatus === "failed").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#010D39]">Scheduler</h1>
        <p className="text-[#3F486B] text-sm mt-1">Manage cron schedules and monitor scraping runs</p>

        {/* Stats row */}
        {!loading && sites.length > 0 && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { label: "Total",   value: sites.length,  color: "text-[#010D39]" },
              { label: "Active",  value: active,         color: "text-[#128986]" },
              { label: "Success", value: success,        color: "text-green-600" },
              { label: "Failed",  value: failed,         color: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 bg-white border border-[#E6EBF2] rounded-xl px-3 py-1.5 shadow-sm">
                <span className={`text-base font-bold ${s.color}`}>{s.value}</span>
                <span className="text-xs text-[#3F486B]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Schedules Section ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E6EBF2] shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-[#E6EBF2] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-[#010D39]">
            Schedules
            {!loading && (
              <span className="ml-2 text-[11px] font-medium text-[#3F486B] bg-[#F8F9FF] px-2 py-0.5 rounded-full">
                {filtered.length} / {sites.length}
              </span>
            )}
          </h2>

          {/* Toolbar */}
          {!loading && sites.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-[#F8F9FF] border border-[#E6EBF2] rounded-lg focus:outline-none focus:border-[#202B52] text-gray-700 placeholder:text-gray-400 w-36"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8F9FF] border border-[#E6EBF2] rounded-lg focus:outline-none focus:border-[#202B52] text-gray-700"
              >
                {["All", "Active", "Paused", "Success", "Failed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              {/* Sort dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "default" | "asc" | "desc")}
                className="px-2.5 py-1.5 text-xs bg-[#F8F9FF] border border-[#E6EBF2] rounded-lg focus:outline-none focus:border-[#202B52] text-gray-700"
              >
                <option value="default">Default</option>
                <option value="asc">Name A-Z</option>
                <option value="desc">Name Z-A</option>
              </select>

              {/* Group by ATS toggle */}
              <button
                onClick={() => setGroupByAts((v) => !v)}
                title={groupByAts ? "Ungroup" : "Group by ATS platform"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  groupByAts
                    ? "bg-[#202B52] text-white border-[#202B52]"
                    : "bg-[#F8F9FF] text-[#3F486B] border-[#E6EBF2] hover:border-[#202B52] hover:text-[#202B52]"
                }`}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="4" rx="1"/>
                  <rect x="3" y="10" width="8" height="4" rx="1"/>
                  <rect x="3" y="17" width="8" height="4" rx="1"/>
                  <rect x="13" y="10" width="8" height="4" rx="1"/>
                  <rect x="13" y="17" width="8" height="4" rx="1"/>
                </svg>
                Group
              </button>

              {/* Run All button */}
              <button
                onClick={runAll}
                disabled={runningAll || sites.filter((s) => s.isActive).length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#128986] text-white hover:bg-[#0d6d6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningAll ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Running…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    Run All ({sites.filter((s) => s.isActive).length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-[#F8F9FF] animate-pulse" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#C8C8D8] font-medium">No sites configured yet</p>
              <p className="text-[#3F486B] text-xs mt-1">Add sites on the Sites page to schedule scraping.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-500 text-sm font-medium">No schedules match your filters</p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("All"); }}
                className="mt-2 text-xs text-[#202B52] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            /* Cards — flat or grouped */
            groupByAts ? (
              /* Grouped by ATS platform */
              <div className="flex flex-col gap-7">
                {grouped.map(([ats, atsSites]) => {
                  const atsColor = ATS_COLORS[ats] ?? ATS_COLORS.Custom;
                  return (
                    <section key={ats}>
                      {/* Group label */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${atsColor.bg} ${atsColor.text}`}>
                          <span className={`w-2 h-2 rounded-full ${atsColor.dot}`} />
                          {ats}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {atsSites.length} site{atsSites.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex-1 h-px bg-[#E6EBF2]" />
                      </div>

                      {/* Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                        {atsSites.map((site) => (
                          <ScheduleCard
                            key={site._id}
                            site={site}
                            running={runningId === site._id}
                            onRun={() => runNow(site)}
                            onToggle={() => toggleActive(site)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              /* Flat grid — all cards together */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filtered.map((site) => (
                  <ScheduleCard
                    key={site._id}
                    site={site}
                    running={runningId === site._id}
                    onRun={() => runNow(site)}
                    onToggle={() => toggleActive(site)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Log Panel ───────────────────────────────────────────────────── */}
      <CronLogPanel />
    </div>
  );
}
