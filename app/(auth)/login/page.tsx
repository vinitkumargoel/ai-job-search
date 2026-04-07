"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError("Invalid username or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F3F4F8]">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-[#1E2D5A] p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6AF5] to-[#7C3AED] flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <span className="text-white font-bold text-base tracking-tight">vinitk.dev</span>
        </div>

        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Your AI-powered<br />job search engine
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Automatically scrape job boards, match postings to your resume with AI, and track your entire application pipeline — all in one place.
          </p>
          <div className="mt-10 flex flex-col gap-3">
            {["Automated job scraping", "AI resume matching", "Application pipeline tracking"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#4F6AF5]/20 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#4F6AF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">© 2026 vinitk.dev</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F6AF5] to-[#7C3AED] flex items-center justify-center">
              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-[15px]">vinitk.dev</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-600 text-sm mb-8">Sign in to your dashboard</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#4F6AF5] focus:ring-2 focus:ring-[#4F6AF5]/20 transition-all shadow-sm"
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#4F6AF5] focus:ring-2 focus:ring-[#4F6AF5]/20 transition-all shadow-sm"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                <svg width="14" height="14" fill="none" stroke="#E84040" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                  <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-red-600">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#4F6AF5] text-white font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors disabled:opacity-50 text-sm mt-1 shadow-sm"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
