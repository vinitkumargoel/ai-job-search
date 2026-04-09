"use client";

import { useEffect } from "react";

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  filterGerman: string;
  setFilterGerman: (v: string) => void;
  filterExp: string;
  setFilterExp: (v: string) => void;
  filterEmployment: string;
  setFilterEmployment: (v: string) => void;
  filterSalary: boolean;
  setFilterSalary: (v: boolean) => void;
  filterDate: string;
  setFilterDate: (v: string) => void;
  filterScore: string;
  setFilterScore: (v: string) => void;
  filterSite: string;
  setFilterSite: (v: string) => void;
  siteNames: string[];
  onClear: () => void;
  onApply: () => void;
}

export function FiltersModal({
  open,
  onClose,
  filterGerman,
  setFilterGerman,
  filterExp,
  setFilterExp,
  filterEmployment,
  setFilterEmployment,
  filterSalary,
  setFilterSalary,
  filterDate,
  setFilterDate,
  filterScore,
  setFilterScore,
  filterSite,
  setFilterSite,
  siteNames,
  onClear,
  onApply,
}: FiltersModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const activeCount = [filterGerman, filterExp, filterEmployment, filterSalary ? "1" : "", filterDate, filterScore, filterSite].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F6AF5]/10 flex items-center justify-center">
              <svg width="16" height="16" fill="none" stroke="#4F6AF5" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Filters</h2>
              <p className="text-xs text-gray-400">{activeCount > 0 ? `${activeCount} filter${activeCount > 1 ? "s" : ""} active` : "No filters applied"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Date Posted */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>📅</span> Date Scraped
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "", label: "All Time" },
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 Days" },
                { value: "30d", label: "Last 30 Days" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterDate(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterDate === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Match Score */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>🎯</span> Match Score
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "", label: "Any Score" },
                { value: "high", label: "High (80-100)" },
                { value: "medium", label: "Medium (50-79)" },
                { value: "low", label: "Low (0-49)" },
                { value: "none", label: "No Score" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterScore(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterScore === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source / Site */}
          {siteNames.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span>🌐</span> Source Site
              </label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#4F6AF5] text-gray-700"
              >
                <option value="">All Sites</option>
                {siteNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* German Requirement */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>🇩🇪</span> German Requirement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "", label: "Any" },
                { value: "not-required", label: "Not Required" },
                { value: "any-required", label: "Required" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterGerman(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterGerman === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>📈</span> Experience Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "", label: "Any Level" },
                { value: "Internship", label: "Internship" },
                { value: "Entry Level", label: "Entry Level" },
                { value: "Mid Level", label: "Mid Level" },
                { value: "Senior", label: "Senior" },
                { value: "Lead", label: "Lead" },
                { value: "Manager", label: "Manager" },
                { value: "Director", label: "Director" },
                { value: "VP", label: "VP / Executive" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterExp(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterExp === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Employment Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>💼</span> Employment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "", label: "Any Type" },
                { value: "Full-time", label: "Full-time" },
                { value: "Part-time", label: "Part-time" },
                { value: "Contract", label: "Contract" },
                { value: "Internship", label: "Internship" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterEmployment(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterEmployment === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>💰</span> Salary Disclosed
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: "All Jobs" },
                { value: true, label: "Salary Disclosed Only" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setFilterSalary(opt.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterSalary === opt.value
                      ? "bg-[#4F6AF5] text-white border-[#4F6AF5]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {activeCount > 0 && (
            <button
              onClick={onClear}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onApply}
            className="px-5 py-2.5 text-sm font-semibold bg-[#4F6AF5] text-white rounded-xl hover:bg-[#3B56E0] transition-colors"
          >
            Apply Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}