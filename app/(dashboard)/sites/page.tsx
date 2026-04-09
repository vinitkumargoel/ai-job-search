"use client";

import { useEffect, useState, useMemo } from "react";
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

// ── Scraper metadata: ATS group + display label + icon (emoji or favicon) ───────────────────────────────
const SCRAPER_META: Record<string, { label: string; ats: string; city?: string; icon?: string }> = {
  // Original
  amazon:          { label: "Amazon Jobs",     ats: "Custom",          city: "Global",      icon: "📦" },
  bosch:           { label: "Bosch",            ats: "SmartRecruiters", city: "Stuttgart",   icon: "🔧" },
  celonis:         { label: "Celonis",          ats: "Greenhouse",      city: "Munich",      icon: "⚡" },
  check24:         { label: "Check24",          ats: "Custom",          city: "Munich",      icon: "✓" },
  commercetools:   { label: "commercetools",    ats: "Greenhouse",      city: "Munich",      icon: "🛒" },
  contentful:      { label: "Contentful",       ats: "Greenhouse",      city: "Berlin",      icon: "📝" },
  deliveryhero:    { label: "Delivery Hero",    ats: "Custom",          city: "Berlin",      icon: "🍔" },
  flix:            { label: "Flix",             ats: "Greenhouse",      city: "Munich",      icon: "🚌" },
  getyourguide:    { label: "GetYourGuide",     ats: "Greenhouse",      city: "Berlin",      icon: "🗺️" },
  hellofresh:      { label: "HelloFresh",       ats: "Greenhouse",      city: "Berlin",      icon: "🥗" },
  n26:             { label: "N26",               ats: "Greenhouse",      city: "Berlin",      icon: "💳" },
  raisin:          { label: "Raisin",           ats: "Greenhouse",      city: "Berlin",      icon: "🍇" },
  sap:             { label: "SAP",              ats: "SuccessFactors",  city: "Walldorf",    icon: "💼" },
  sapfioneer:      { label: "SAP Fioneer",      ats: "Custom",          city: "Walldorf",    icon: "🏦" },
  scout24:         { label: "Scout24",          ats: "Greenhouse",      city: "Munich",      icon: "🔍" },
  siemens:         { label: "Siemens",          ats: "Avature",         city: "Munich",      icon: "⚙️" },
  softwareag:      { label: "Software AG",      ats: "Dayforce",        city: "Darmstadt",   icon: "🖥️" },
  teamviewer:      { label: "TeamViewer",       ats: "Teamtailor",      city: "Göppingen",   icon: "🖥️" },
  zalando:         { label: "Zalando",          ats: "Custom",          city: "Berlin",      icon: "👗" },
  zeiss:           { label: "ZEISS",            ats: "Workday",         city: "Jena",        icon: "🔬" },
  // Wave 1
  parloa:          { label: "Parloa",           ats: "Greenhouse",      city: "Berlin",      icon: "🎙️" },
  helsing:         { label: "Helsing",          ats: "Greenhouse",      city: "Munich",      icon: "🛡️" },
  blackforestlabs: { label: "Black Forest Labs",ats: "Greenhouse",     city: "Freiburg",    icon: "🎨" },
  n8n:             { label: "n8n",              ats: "Ashby",           city: "Berlin",      icon: "🔗" },
  deepl:           { label: "DeepL",            ats: "Ashby",           city: "Cologne",     icon: "🌐" },
  alephalpha:      { label: "Aleph Alpha",      ats: "Ashby",           city: "Heidelberg",  icon: "🧠" },
  sereact:         { label: "Sereact",          ats: "Ashby",           city: "Stuttgart",   icon: "🤖" },
  quantumsystems:  { label: "Quantum Systems",  ats: "Personio",        city: "Munich",      icon: "🚁" },
  // Wave 2
  sumup:           { label: "SumUp",            ats: "Greenhouse",      city: "Berlin",      icon: "💳" },
  traderepublic:   { label: "Trade Republic",   ats: "Greenhouse",      city: "Berlin",      icon: "📈" },
  grover:          { label: "Grover",           ats: "Greenhouse",      city: "Berlin",      icon: "📱" },
  staffbase:       { label: "Staffbase",        ats: "Greenhouse",      city: "Chemnitz",    icon: "👥" },
  isaraerospace:   { label: "Isar Aerospace",   ats: "Greenhouse",      city: "Munich",      icon: "🚀" },
  personio:        { label: "Personio",         ats: "Ashby",           city: "Munich",      icon: "👥" },
  enpal:           { label: "Enpal",            ats: "Ashby",           city: "Berlin",      icon: "☀️" },
  forto:           { label: "Forto",            ats: "Ashby",           city: "Berlin",      icon: "📦" },
  billie:          { label: "Billie",           ats: "Ashby",           city: "Berlin",      icon: "💳" },
  sennder:         { label: "Sennder",          ats: "SmartRecruiters", city: "Berlin",      icon: "🚚" },
  // Wave 4
  wolt:            { label: "Wolt",             ats: "Greenhouse",      city: "Berlin",      icon: "🛵" },
  ionos:           { label: "IONOS",             ats: "Greenhouse",      city: "Karlsruhe",   icon: "🌐" },
  doctolib:        { label: "Doctolib",          ats: "Greenhouse",      city: "Berlin",      icon: "🏥" },
  moia:            { label: "MOIA",              ats: "Greenhouse",      city: "Hamburg",     icon: "🚐" },
  wayve:           { label: "Wayve",             ats: "Greenhouse",      city: "Germany",     icon: "🚗" },
  wunderflats:     { label: "Wunderflats",       ats: "Greenhouse",      city: "Berlin",      icon: "🏠" },
  adyen:           { label: "Adyen",             ats: "Greenhouse",      city: "Berlin",      icon: "💳" },
  tulip:           { label: "Tulip",             ats: "Greenhouse",      city: "Munich",      icon: "🌷" },
  hetzner:         { label: "Hetzner",           ats: "Custom",          city: "Nuremberg",    icon: "🖥️" },
  "telekom-it":    { label: "Deutsche Telekom IT",ats: "SmartRecruiters", city: "Darmstadt",  icon: "📡" },
  flaconi:         { label: "Flaconi",           ats: "Greenhouse",      city: "Berlin",      icon: "💄" },
  freenow:         { label: "FREE NOW",          ats: "Greenhouse",      city: "Hamburg",     icon: "🚕" },
  auto1:           { label: "AUTO1 Group",       ats: "SmartRecruiters", city: "Berlin",      icon: "🚗" },
  aboutyou:        { label: "About You",         ats: "SmartRecruiters", city: "Hamburg",     icon: "👕" },
  scalablecapital: { label: "Scalable Capital",  ats: "SmartRecruiters", city: "Munich",      icon: "💰" },
  sixt:            { label: "SIXT",              ats: "SmartRecruiters", city: "Munich",      icon: "🚙" },
  babbel:          { label: "Babbel",            ats: "Personio",        city: "Berlin",      icon: "🗣️" },
  idealo:          { label: "Idealo",            ats: "Personio",        city: "Berlin",      icon: "💰" },
  mambu:           { label: "Mambu",             ats: "Personio",        city: "Berlin",      icon: "🏦" },
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
  success: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Success" },
  failed:  { dot: "bg-red-500",   text: "text-red-600",   bg: "bg-red-50",   label: "Failed" },
  never:   { dot: "bg-gray-300",  text: "text-gray-400",  bg: "bg-gray-100", label: "Never" },
};

const AVAILABLE_SCRAPERS = Object.keys(SCRAPER_META);
const ALL_ATS = ["All", ...Array.from(new Set(Object.values(SCRAPER_META).map((m) => m.ats))).sort()];

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

// ── Site Card ─────────────────────────────────────────────────────────────────
function SiteCard({
  site,
  onRun,
  onEdit,
  onDelete,
  onToggle,
  running,
}: {
  site: Site;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  running: boolean;
}) {
  const meta = SCRAPER_META[site.scraperKey] ?? { label: site.scraperKey, ats: "Custom" };
  const atsColor = ATS_COLORS[meta.ats] ?? ATS_COLORS.Custom;
  const sc = STATUS_CONFIG[site.lastRunStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.never;

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-200 flex flex-col gap-0 overflow-hidden
        ${site.isActive
          ? "border-gray-100 shadow-sm hover:shadow-md hover:border-[#4F6AF5]/20"
          : "border-gray-100 shadow-sm opacity-60 hover:opacity-80"
        }`}
    >
      {/* Active stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl transition-colors ${site.isActive ? "bg-[#4F6AF5]" : "bg-gray-200"}`} />

      {/* Card body */}
      <div className="px-4 pt-4 pb-3 flex flex-col gap-2.5">
        {/* Top row: icon + name + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            {meta.icon && (
              <span className="text-lg shrink-0 mt-0.5" role="img" aria-label={meta.label}>
                {meta.icon}
              </span>
            )}
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
          </div>
          {/* Toggle */}
          <button
            onClick={onToggle}
            title={site.isActive ? "Deactivate" : "Activate"}
            className={`relative flex-shrink-0 inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none mt-0.5
              ${site.isActive ? "bg-[#4F6AF5]" : "bg-gray-200"}`}
          >
            <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mt-[3px]
              ${site.isActive ? "translate-x-[18px]" : "translate-x-[3px]"}`}
            />
          </button>
        </div>

        {/* ATS + status badges */}
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

        {/* Scraper key + schedule */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
          <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[50%]">{site.scraperKey}</span>
          <span className="font-mono">{site.cronSchedule}</span>
        </div>

        {/* Last run */}
        <p className="text-[11px] text-gray-400">
          Last run: <span className="text-gray-600 font-medium">{timeAgo(site.lastRunAt)}</span>
        </p>
      </div>

      {/* Actions footer */}
      <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-1.5">
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors disabled:opacity-50 flex-1 justify-center"
        >
          {running ? (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg width="9" height="9" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          )}
          {running ? "Running…" : "Run"}
        </button>
        <button
          onClick={onEdit}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ sites }: { sites: Site[] }) {
  const active  = sites.filter((s) => s.isActive).length;
  const success = sites.filter((s) => s.lastRunStatus === "success").length;
  const failed  = sites.filter((s) => s.lastRunStatus === "failed").length;

  const stats = [
    { label: "Total",   value: sites.length,    color: "text-gray-900" },
    { label: "Active",  value: active,           color: "text-[#4F6AF5]" },
    { label: "Success", value: success,          color: "text-green-600" },
    { label: "Failed",  value: failed,           color: "text-red-500" },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-200 text-sm">·</span>}
          <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
          <span className="text-sm text-gray-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SitesPage() {
  const [sites, setSites]       = useState<Site[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [atsFilter, setAtsFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByAts, setGroupByAts] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");
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

  // Filtered + searched sites
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = sites.filter((s) => {
      const meta = SCRAPER_META[s.scraperKey];
      const ats  = meta?.ats ?? "Custom";
      if (atsFilter !== "All" && ats !== atsFilter) return false;
      if (statusFilter === "Active" && !s.isActive) return false;
      if (statusFilter === "Inactive" && s.isActive) return false;
      if (statusFilter === "Success" && s.lastRunStatus !== "success") return false;
      if (statusFilter === "Failed" && s.lastRunStatus !== "failed") return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.scraperKey.toLowerCase().includes(q) ||
        ats.toLowerCase().includes(q) ||
        (meta?.city ?? "").toLowerCase().includes(q)
      );
    });
    if (sortOrder === "asc") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "desc") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    }
    return result;
  }, [sites, search, atsFilter, statusFilter, sortOrder]);

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

  const openAdd  = () => { setEditSite(null);  setShowForm(true); };
  const openEdit = (s: Site) => { setEditSite(s); setShowForm(true); };

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <div className="mt-1">
            <StatsBar sites={sites} />
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4F6AF5] text-white text-sm font-semibold rounded-xl hover:bg-[#3B56E0] transition-colors shadow-sm flex-shrink-0"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Site
        </button>
      </div>

      {/* ── Toolbar: search + filters + view toggle ───────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
          </svg>
          <input
            type="text"
            placeholder="Search sites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5] text-gray-900 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* ATS filter */}
        <select
          value={atsFilter}
          onChange={(e) => setAtsFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F6AF5] text-gray-700"
        >
          {ALL_ATS.map((a) => <option key={a}>{a}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F6AF5] text-gray-700"
        >
          {["All", "Active", "Inactive", "Success", "Failed"].map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Sort dropdown */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "default" | "asc" | "desc")}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#4F6AF5] text-gray-700"
        >
          <option value="default">Default</option>
          <option value="asc">Name A-Z</option>
          <option value="desc">Name Z-A</option>
        </select>

        {/* Result count */}
        <span className="text-sm text-gray-400 ml-1">
          {filtered.length} {filtered.length === 1 ? "site" : "sites"}
        </span>

        <div className="flex-1" />

        {/* Group by ATS toggle — only relevant in grid mode */}
        {viewMode === "grid" && (
          <button
            onClick={() => setGroupByAts((v) => !v)}
            title={groupByAts ? "Ungroup" : "Group by ATS platform"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              groupByAts
                ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#4F6AF5] hover:text-[#4F6AF5]"
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
        )}

        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          {(["grid", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === mode ? "bg-white shadow-sm text-[#4F6AF5]" : "text-gray-400 hover:text-gray-600"}`}
              title={mode === "grid" ? "Card view" : "List view"}
            >
              {mode === "grid" ? (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {sites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9"/>
            </svg>
          </div>
          <p className="text-gray-900 font-semibold">No sites yet</p>
          <p className="text-gray-400 text-sm mt-1">Add a site to start scraping jobs automatically</p>
          <button onClick={openAdd} className="mt-5 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-xl hover:bg-[#3B56E0] transition-colors shadow-sm">
            Add Your First Site
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-500 font-medium">No sites match your filters</p>
          <button onClick={() => { setSearch(""); setAtsFilter("All"); setStatusFilter("All"); }} className="mt-3 text-sm text-[#4F6AF5] hover:underline">
            Clear filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ─────────────────────────────────────────────────── */
        groupByAts ? (
          /* Grouped by ATS platform */
          <div className="flex flex-col gap-8">
            {grouped.map(([ats, atsSites]) => {
              const atsColor = ATS_COLORS[ats] ?? ATS_COLORS.Custom;
              return (
                <section key={ats}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${atsColor.bg} ${atsColor.text}`}>
                      <span className={`w-2 h-2 rounded-full ${atsColor.dot}`} />
                      {ats}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{atsSites.length} site{atsSites.length !== 1 ? "s" : ""}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {atsSites.map((site) => (
                      <SiteCard
                        key={site._id}
                        site={site}
                        running={runningId === site._id}
                        onRun={() => runNow(site)}
                        onEdit={() => openEdit(site)}
                        onDelete={() => deleteSite(site._id, site.name)}
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
              <SiteCard
                key={site._id}
                site={site}
                running={runningId === site._id}
                onRun={() => runNow(site)}
                onEdit={() => openEdit(site)}
                onDelete={() => deleteSite(site._id, site.name)}
                onToggle={() => toggleActive(site)}
              />
            ))}
          </div>
        )
      ) : (
        /* ── LIST VIEW: compact table ───────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Scraper", "ATS", "City", "Schedule", "Last Run", "Status", "Active", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((site) => {
                  const meta = SCRAPER_META[site.scraperKey] ?? { label: site.scraperKey, ats: "Custom" };
                  const atsColor = ATS_COLORS[meta.ats] ?? ATS_COLORS.Custom;
                  const sc = STATUS_CONFIG[site.lastRunStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.never;
                  return (
                    <tr key={site._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{site.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{site.scraperKey}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${atsColor.bg} ${atsColor.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${atsColor.dot}`} />
                          {meta.ats}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{meta.city ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">{site.cronSchedule}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{timeAgo(site.lastRunAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(site)}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${site.isActive ? "bg-[#4F6AF5]" : "bg-gray-200"}`}
                        >
                          <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mt-[3px] ${site.isActive ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => runNow(site)}
                            disabled={runningId === site._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#4F6AF5] text-white hover:bg-[#3B56E0] transition-colors disabled:opacity-50"
                          >
                            <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                            {runningId === site._id ? "…" : "Run"}
                          </button>
                          <button onClick={() => openEdit(site)} className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Edit</button>
                          <button onClick={() => deleteSite(site._id, site.name)} className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
