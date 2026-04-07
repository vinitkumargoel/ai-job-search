"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";

interface AnalyticsData {
  funnel: { label: string; value: number; color: string }[];
  scoreDistribution: { range: string; count: number }[];
  timeline: { date: string; jobs: number }[];
  topSites: { name: string; count: number }[];
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const SCORE_COLORS = ["#EF4444","#F97316","#F59E0B","#EAB308","#84CC16","#22C55E","#16A34A","#0EA5E9","#6366F1","#8B5CF6"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  const totalJobs = data?.funnel.reduce((s, f) => s + f.value, 0) ?? 0;
  const appliedCount = data?.funnel.find((f) => f.label === "Applied")?.value ?? 0;
  const matchedJobs = data?.scoreDistribution.reduce((s, b) => s + b.count, 0) ?? 0;
  const avgScore = data?.scoreDistribution.length
    ? Math.round(
        data.scoreDistribution.reduce((s, b) => {
          const mid = parseInt(b.range.split("-")[0]) + 5;
          return s + mid * b.count;
        }, 0) / (matchedJobs || 1)
      )
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 text-sm mt-1">Your job search performance at a glance</p>
      </div>

      {/* Top KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Jobs" value={totalJobs} sub="scraped" color="#111827" />
          <StatCard label="Applied" value={appliedCount} sub={totalJobs ? `${Math.round(appliedCount / totalJobs * 100)}% conversion` : "—"} color="#16A34A" />
          <StatCard label="AI Matched" value={matchedJobs} sub="with score" color="#4F6AF5" />
          <StatCard label="Avg Match Score" value={avgScore} sub="out of 100" color="#7C3AED" />
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Jobs Scraped — Last 30 Days</h2>
          {loading ? (
            <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.timeline ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F6AF5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F6AF5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v, i) => i % 7 === 0 ? formatDate(v) : ""}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, "Jobs"]}
                  labelFormatter={(l) => formatDate(l as string)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Area type="monotone" dataKey="jobs" stroke="#4F6AF5" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Application Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Application Funnel</h2>
          {loading ? (
            <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {data?.funnel.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{f.label}</span>
                    <span className="text-xs font-bold text-gray-900">{f.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: totalJobs ? `${Math.max(4, (f.value / totalJobs) * 100)}%` : "4%",
                        backgroundColor: f.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">AI Match Score Distribution</h2>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (data?.scoreDistribution.length ?? 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No matched jobs yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.scoreDistribution ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, "Jobs"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(data?.scoreDistribution ?? []).map((_, i) => (
                    <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Sites */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Jobs by Source</h2>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (data?.topSites.length ?? 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {data?.topSites.map((s, i) => {
                const max = data.topSites[0].count;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{s.name}</span>
                      <span className="text-xs font-bold text-gray-900 ml-2">{s.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(s.count / max) * 100}%`,
                          backgroundColor: SCORE_COLORS[i % SCORE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
