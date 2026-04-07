"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface SkippedUrl {
  _id: string;
  url: string;
  createdAt: string;
}

export default function SkipPage() {
  const [urls, setUrls] = useState<SkippedUrl[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchUrls = async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/skip?page=${p}&limit=50`);
    if (res.ok) {
      const data = await res.json();
      setUrls(data.urls);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUrls(page);
  }, [page]);

  const handleUnskip = async (id: string) => {
    if (!confirm("Remove this URL from the skip list? It may be scraped again.")) return;
    
    const res = await fetch(`/api/skip?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUrls((prev) => prev.filter((u) => u._id !== id));
      setTotal((t) => t - 1);
      toast("URL removed from skip list", "success");
    } else {
      toast("Failed to remove URL", "error");
    }
  };

  const filteredUrls = search
    ? urls.filter((u) => u.url.toLowerCase().includes(search.toLowerCase()))
    : urls;

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skipped URLs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} URL{total !== 1 ? "s" : ""} that were skipped during scraping
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-gray-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search URLs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#4F6AF5] focus:ring-2 focus:ring-[#4F6AF5]/20 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredUrls.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.17" y1="8" x2="19.83" y2="8" />
              <path d="M12 3c-1.5 2-2.5 4.5-2.5 9s1 7 2.5 9" />
              <path d="M12 3c1.5 2 2.5 4.5 2.5 9s-1 7-2.5 9" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold">No skipped URLs</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? "No URLs match your search" : "Deleted jobs will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUrls.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#4F6AF5] hover:underline truncate block"
                >
                  {item.url}
                </a>
                <p className="text-xs text-gray-400 mt-1">
                  Added {new Date(item.createdAt).toLocaleDateString("en-GB", { 
                    day: "numeric", 
                    month: "short", 
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
              <button
                onClick={() => handleUnskip(item._id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                Unskip
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Previous
          </button>
          <span className="text-sm text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}