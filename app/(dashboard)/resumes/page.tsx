"use client";

import { useEffect, useState } from "react";
import { ResumeUploader } from "@/components/ResumeUploader";
import { useToast } from "@/components/ui/Toast";

interface Resume {
  _id: string;
  name: string;
  filename: string;
  isActive: boolean;
  uploadedAt: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();

  const fetchResumes = async () => {
    const res = await fetch("/api/resumes");
    if (res.ok) setResumes(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchResumes(); }, []);

  const activate = async (id: string, name: string) => {
    const res = await fetch(`/api/resumes/${id}/activate`, { method: "POST" });
    if (res.ok) {
      setResumes((prev) => prev.map((r) => ({ ...r, isActive: r._id === id })));
      toast(`"${name}" is now the active resume`, "success");
    }
  };

  const deleteResume = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast(`"${name}" deleted`, "info");
    } else {
      const err = await res.json();
      toast(err.error ?? "Delete failed", "error");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumes</h1>
          <p className="text-gray-500 text-sm mt-1">
            The <span className="font-semibold text-green-600">active</span> resume is used for AI job matching
          </p>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload Resume
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-gray-900 font-semibold">No resumes uploaded</p>
          <p className="text-gray-400 text-sm mt-1">Upload a PDF resume to enable AI job matching</p>
          <button
            onClick={() => setShowUploader(true)}
            className="mt-5 px-4 py-2 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm"
          >
            Upload Your First Resume
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className={`bg-white rounded-xl border-2 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm transition-all ${
                resume.isActive ? "border-green-500" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                resume.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
              }`}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="12" y2="17"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{resume.name}</p>
                  {resume.isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-green-500 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{resume.filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                {!resume.isActive && (
                  <button
                    onClick={() => activate(resume._id, resume.name)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Set Active
                  </button>
                )}
                {!resume.isActive && (
                  <button
                    onClick={() => deleteResume(resume._id, resume.name)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ResumeUploader
        open={showUploader}
        onClose={() => setShowUploader(false)}
        onUploaded={fetchResumes}
      />
    </div>
  );
}
