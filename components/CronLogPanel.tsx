"use client";

import { useEffect, useState, useCallback } from "react";

interface CronLog {
  _id: string;
  siteName: string;
  message: string;
  level: "info" | "error" | "success";
  createdAt: string;
}

const levelStyle: Record<string, string> = {
  info: "text-[#3F486B]",
  error: "text-[#EA1815]",
  success: "text-[#128986]",
};

const levelPrefix: Record<string, string> = {
  info: "INFO  ",
  error: "ERROR ",
  success: "OK    ",
};

export function CronLogPanel({ siteId }: { siteId?: string }) {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const url = siteId ? `/api/cron/logs?siteId=${siteId}&limit=50` : "/api/cron/logs?limit=50";
    const res = await fetch(url);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="bg-[#010D39] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white/70 text-xs font-mono uppercase tracking-wider">Cron Logs</span>
        <button
          onClick={fetchLogs}
          className="text-white/40 hover:text-white text-xs transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="h-72 overflow-y-auto p-4 font-mono text-xs flex flex-col gap-1">
        {loading && <span className="text-white/30">Loading...</span>}
        {!loading && logs.length === 0 && (
          <span className="text-white/30">No logs yet. Run a scrape to see activity here.</span>
        )}
        {logs.map((log) => (
          <div key={log._id} className="flex gap-3 items-start">
            <span className="text-white/30 shrink-0">
              {new Date(log.createdAt).toLocaleTimeString()}
            </span>
            <span className="text-white/50 shrink-0 w-20 truncate">{log.siteName}</span>
            <span className={`shrink-0 w-14 ${levelStyle[log.level]}`}>
              {levelPrefix[log.level]}
            </span>
            <span className="text-white/80">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
