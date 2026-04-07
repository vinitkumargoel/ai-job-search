"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";
import { useToast } from "./ui/Toast";

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  availableScrapers: string[];
  initial?: {
    _id?: string;
    name?: string;
    scraperKey?: string;
    url?: string;
    keywords?: string;
    cronSchedule?: string;
    isActive?: boolean;
  };
}

// ─── Schedule Builder ────────────────────────────────────────────────────────

type FrequencyType = "hourly" | "every_n_hours" | "daily" | "weekly";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const DAYS_OF_WEEK = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];
const EVERY_N_OPTIONS = [2, 3, 4, 6, 8, 12];

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function buildCron(freq: FrequencyType, hour: number, minute: number, day: number, every: number): string {
  switch (freq) {
    case "hourly":       return `${minute} * * * *`;
    case "every_n_hours": return `${minute} */${every} * * *`;
    case "daily":        return `${minute} ${hour} * * *`;
    case "weekly":       return `${minute} ${hour} * * ${day}`;
  }
}

function describeCron(freq: FrequencyType, hour: number, minute: number, day: number, every: number): string {
  const time = `${formatHour(hour).replace(":00", "")}${minute > 0 ? `:${pad(minute)}` : ""}`;
  switch (freq) {
    case "hourly":        return minute === 0 ? "Every hour" : `Every hour at :${pad(minute)}`;
    case "every_n_hours": return `Every ${every} hours`;
    case "daily":         return `Every day at ${time}`;
    case "weekly":        return `Every ${DAYS_OF_WEEK[day].label} at ${time}`;
  }
}

function parseCronToState(cron: string): {
  freq: FrequencyType; hour: number; minute: number; day: number; every: number;
} {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { freq: "daily", hour: 9, minute: 0, day: 1, every: 6 };
  const [min, hr, , , dow] = parts;

  if (hr === "*" && !min.startsWith("*/")) return { freq: "hourly", hour: 9, minute: parseInt(min) || 0, day: 1, every: 6 };
  if (hr.startsWith("*/")) return { freq: "every_n_hours", hour: 9, minute: parseInt(min) || 0, day: 1, every: parseInt(hr.slice(2)) || 6 };
  if (dow !== "*") return { freq: "weekly", hour: parseInt(hr) || 9, minute: parseInt(min) || 0, day: parseInt(dow) || 1, every: 6 };
  return { freq: "daily", hour: parseInt(hr) || 9, minute: parseInt(min) || 0, day: 1, every: 6 };
}

interface SchedulePickerProps {
  value: string;
  onChange: (cron: string) => void;
}

function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const init = parseCronToState(value);
  const [freq, setFreq] = useState<FrequencyType>(init.freq);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [day, setDay] = useState(init.day);
  const [every, setEvery] = useState(init.every);

  const emit = (f: FrequencyType, h: number, m: number, d: number, e: number) => {
    onChange(buildCron(f, h, m, d, e));
  };

  const setF = (f: FrequencyType) => { setFreq(f); emit(f, hour, minute, day, every); };
  const setH = (h: number)         => { setHour(h);  emit(freq, h, minute, day, every); };
  const setM = (m: number)         => { setMinute(m); emit(freq, hour, m, day, every); };
  const setD = (d: number)         => { setDay(d);   emit(freq, hour, minute, d, every); };
  const setE = (e: number)         => { setEvery(e); emit(freq, hour, minute, day, e); };

  const selectCls = "px-3 py-2 border border-[#C8C8D8] rounded-lg text-sm text-[#010D39] bg-white focus:outline-none focus:border-[#0961FB] focus:ring-1 focus:ring-[#0961FB]";

  const freqOptions: { key: FrequencyType; label: string; icon: string }[] = [
    { key: "hourly",        label: "Hourly",       icon: "⏱" },
    { key: "every_n_hours", label: "Every N hours", icon: "🔁" },
    { key: "daily",         label: "Daily",        icon: "📅" },
    { key: "weekly",        label: "Weekly",       icon: "🗓" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Frequency selector */}
      <div className="grid grid-cols-4 gap-2">
        {freqOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setF(opt.key)}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
              freq === opt.key
                ? "border-[#202B52] bg-[#202B52] text-white"
                : "border-[#E6EBF2] bg-white text-[#3F486B] hover:border-[#C8C8D8] hover:bg-[#F8F9FF]"
            }`}
          >
            <span className="text-base">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Context controls */}
      <div className="bg-[#F8F9FF] rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm text-[#3F486B]">

        {freq === "hourly" && (
          <>
            <span>At minute</span>
            <select className={selectCls} value={minute} onChange={(e) => setM(Number(e.target.value))}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>:{pad(m)}</option>
              ))}
            </select>
            <span>of every hour</span>
          </>
        )}

        {freq === "every_n_hours" && (
          <>
            <span>Every</span>
            <select className={selectCls} value={every} onChange={(e) => setE(Number(e.target.value))}>
              {EVERY_N_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} hours</option>
              ))}
            </select>
          </>
        )}

        {freq === "daily" && (
          <>
            <span>Every day at</span>
            <select className={selectCls} value={hour} onChange={(e) => setH(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </>
        )}

        {freq === "weekly" && (
          <>
            <span>Every</span>
            <select className={selectCls} value={day} onChange={(e) => setD(Number(e.target.value))}>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <span>at</span>
            <select className={selectCls} value={hour} onChange={(e) => setH(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Summary + cron preview */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#E6EBF2] rounded-lg">
        <span className="text-sm font-medium text-[#010D39]">
          {describeCron(freq, hour, minute, day, every)}
        </span>
        <span className="font-mono text-xs text-[#C8C8D8] bg-[#F8F9FF] px-2 py-1 rounded">
          {buildCron(freq, hour, minute, day, every)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export function SiteForm({ open, onClose, onSaved, availableScrapers, initial }: SiteFormProps) {
  const { toast } = useToast();
  const isEdit = !!initial?._id;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    scraperKey: initial?.scraperKey ?? availableScrapers[0] ?? "",
    url: initial?.url ?? "",
    keywords: initial?.keywords ?? "",
    cronSchedule: initial?.cronSchedule ?? "0 9 * * *",
    isActive: initial?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/sites/${initial!._id}` : "/api/sites",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast(err.error ?? "Failed to save site", "error");
        return;
      }
      toast(isEdit ? "Site updated" : "Site added", "success");
      onSaved();
      onClose();
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-[#C8C8D8] rounded-lg text-sm text-[#010D39] bg-white focus:outline-none focus:border-[#0961FB] focus:ring-1 focus:ring-[#0961FB]";
  const labelCls = "block text-sm font-medium text-[#3F486B] mb-1";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Site" : "Add New Site"} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Site Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Amazon Jobs"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Scraper *</label>
            <select
              className={inputCls}
              value={form.scraperKey}
              onChange={(e) => set("scraperKey", e.target.value)}
              required
            >
              {availableScrapers.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Target URL *</label>
          <input
            className={inputCls}
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://..."
            required
          />
        </div>

        <div>
          <label className={labelCls}>Keywords</label>
          <input
            className={inputCls}
            value={form.keywords}
            onChange={(e) => set("keywords", e.target.value)}
            placeholder="e.g. software engineer, react, remote"
          />
        </div>

        <div>
          <label className={labelCls}>Run Schedule</label>
          <SchedulePicker
            value={form.cronSchedule}
            onChange={(cron) => set("cronSchedule", cron)}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8F9FF] rounded-xl border border-[#E6EBF2]">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="w-4 h-4 accent-[#EA1815]"
          />
          <label htmlFor="isActive" className="text-sm text-[#3F486B]">
            Active — scrape will run automatically on schedule
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#EA1815] text-white text-sm font-semibold hover:bg-[#B2100B] transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Site"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#E6EBF2] text-[#3F486B] text-sm font-medium hover:bg-[#F8F9FF] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
