"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "./ui/Toast";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/sites", label: "Sites", icon: "⊕" },
  { href: "/jobs", label: "Jobs", icon: "◉" },
  { href: "/resumes", label: "Resumes", icon: "◫" },
  { href: "/cron", label: "Cron", icon: "⏱" },
];

export function Sidebar({ newJobsCount }: { newJobsCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    toast("Logged out", "info");
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-[#202B52] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-lg tracking-tight">vinitk.dev</span>
        </div>
        <p className="text-white/50 text-xs mt-1 font-medium tracking-wider uppercase">
          Job Search
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/jobs" && (newJobsCount ?? 0) > 0 && (
                <span className="bg-[#EA1815] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {newJobsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <span className="text-base w-5 text-center">&#x2192;</span>
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}
