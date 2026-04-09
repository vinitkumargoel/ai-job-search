"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

interface ProfileData {
  _id: string;
  prompt: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  website: string;
}

const PLACEHOLDER_PROMPT = `Write everything about yourself here. This is your master profile that AI will use for:
• Job matching — scoring how well you fit each job
• Cover letter generation — tailored for each application
• Resume generation — ATS-optimized for each job

Example:
---
I am a Senior Software Engineer with 6+ years of experience specializing in full-stack web development. 

SKILLS: TypeScript, React, Next.js, Node.js, Python, PostgreSQL, MongoDB, AWS, Docker, Kubernetes, CI/CD, Git

EXPERIENCE:
- Senior Software Engineer at TechCorp (2022-Present): Led migration of monolith to microservices, reducing deploy times by 70%. Built real-time analytics dashboard serving 10K+ daily users. Mentored 4 junior engineers.
- Software Engineer at StartupX (2019-2022): Built the core product from scratch using React/Node.js. Implemented payment system processing $2M+ monthly.

EDUCATION:
- M.S. Computer Science, TU Munich, 2019 (GPA 1.3)
- B.Tech Computer Science, IIT Delhi, 2017

CERTIFICATIONS: AWS Solutions Architect, Kubernetes CKAD

LANGUAGES: English (fluent), German (B1), Hindi (native)

PREFERENCES: Looking for Senior/Lead roles in Germany. Open to remote. Interested in AI/ML, distributed systems, and developer tools.
---`;

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (res.ok) setProfile(await res.json());
      setLoading(false);
    })();
  }, []);

  const saveProfile = async (data: Partial<ProfileData>) => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setLastSaved(new Date());
    } else {
      toast("Failed to save profile", "error");
    }
    setSaving(false);
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });

    // Auto-save after 1.5s of no typing
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveProfile({ [field]: value });
    }, 1500);
  };

  const handlePromptChange = (value: string) => {
    if (!profile) return;
    setProfile({ ...profile, prompt: value });

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveProfile({ prompt: value });
    }, 2000);
  };

  const handleManualSave = () => {
    if (!profile) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    saveProfile(profile);
    toast("Profile saved", "success");
  };

  const charCount = profile?.prompt?.length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your profile is used by AI for job matching, cover letters, and resume generation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleManualSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm disabled:opacity-50"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contact Details Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Contact Details
              <span className="text-[10px] text-gray-400 font-normal">(used in generated resumes & cover letters)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Full Name", placeholder: "John Doe", icon: "👤" },
                { key: "email", label: "Email", placeholder: "john@example.com", icon: "✉️" },
                { key: "phone", label: "Phone", placeholder: "+49 123 456 7890", icon: "📞" },
                { key: "location", label: "Location", placeholder: "Munich, Germany", icon: "📍" },
                { key: "linkedIn", label: "LinkedIn", placeholder: "https://linkedin.com/in/johndoe", icon: "🔗" },
                { key: "website", label: "Website / Portfolio", placeholder: "https://johndoe.dev", icon: "🌐" },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                    <span>{icon}</span> {label}
                  </label>
                  <input
                    type="text"
                    value={(profile as unknown as Record<string, string>)?.[key] ?? ""}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5]/20 transition-all placeholder-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt — the main profile text */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Profile Prompt
                <span className="text-[10px] text-gray-400 font-normal">(your skills, experience, education, preferences)</span>
              </h2>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${charCount > 0 ? "text-gray-400" : "text-red-400"}`}>
                  {charCount.toLocaleString()} chars
                </span>
                {saving && (
                  <span className="flex items-center gap-1 text-xs text-[#4F6AF5]">
                    <span className="w-2 h-2 rounded-full bg-[#4F6AF5] animate-pulse" />
                    Saving...
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={profile?.prompt ?? ""}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={PLACEHOLDER_PROMPT}
              rows={24}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed font-mono resize-y focus:outline-none focus:border-[#4F6AF5] focus:ring-1 focus:ring-[#4F6AF5]/20 transition-all placeholder-gray-300 min-h-[400px]"
            />
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Write everything about yourself: skills, tools, work experience with achievements, education, certifications, languages, and what kind of job you&apos;re looking for.
              The more detail you provide, the better the AI can match jobs, write cover letters, and generate tailored resumes.
              Auto-saves as you type.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-gradient-to-br from-[#EEF1FE] to-[#E8EBFA] rounded-xl border border-[#4F6AF5]/10 p-5">
            <h3 className="text-sm font-semibold text-[#3B4DA8] mb-3 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              How Your Profile is Used
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Job Matching",
                  desc: "AI scores each scraped job 0-100 based on how well it matches your profile",
                  color: "text-green-700",
                },
                {
                  title: "Cover Letters",
                  desc: "Generate tailored cover letters for any job with one click from the job detail page",
                  color: "text-purple-700",
                },
                {
                  title: "Resume Generation",
                  desc: "Create ATS-optimized resumes tailored to specific jobs, downloadable as PDF",
                  color: "text-blue-700",
                },
              ].map(({ title, desc, color }) => (
                <div key={title} className="bg-white/60 rounded-lg p-3">
                  <p className={`text-xs font-semibold ${color} mb-1`}>{title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
