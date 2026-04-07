"use client";

import { useEffect, useState } from "react";
import { ResumeUploader } from "@/components/ResumeUploader";
import { Badge } from "@/components/ui/Badge";
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[#010D39]">Resumes</h1>
          <p className="text-[#3F486B] text-sm mt-1">
            The <span className="font-semibold text-[#128986]">active</span> resume is used for AI job matching
          </p>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="px-5 py-2.5 bg-[#EA1815] text-white text-sm font-semibold rounded-xl hover:bg-[#B2100B] transition-colors"
        >
          + Upload Resume
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#E6EBF2] animate-pulse" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-16 text-center">
          <p className="text-[#C8C8D8] text-lg">No resumes uploaded</p>
          <p className="text-[#3F486B] text-sm mt-2">Upload a PDF resume to enable AI job matching</p>
          <button
            onClick={() => setShowUploader(true)}
            className="mt-4 px-5 py-2.5 bg-[#EA1815] text-white text-sm font-semibold rounded-xl hover:bg-[#B2100B] transition-colors"
          >
            Upload Your First Resume
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className={`bg-white rounded-2xl border-2 p-6 flex items-center gap-4 shadow-sm transition-all ${
                resume.isActive ? "border-[#128986]" : "border-[#E6EBF2]"
              }`}
            >
              {/* PDF icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${resume.isActive ? "bg-[#128986]/10 text-[#128986]" : "bg-[#F8F9FF] text-[#C8C8D8]"}`}>
                &#128196;
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#010D39]">{resume.name}</p>
                  {resume.isActive && <Badge variant="green">Active</Badge>}
                </div>
                <p className="text-xs text-[#3F486B] mt-0.5">{resume.filename}</p>
                <p className="text-xs text-[#C8C8D8] mt-0.5">
                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!resume.isActive && (
                  <button
                    onClick={() => activate(resume._id, resume.name)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#128986] text-white hover:bg-[#01816A] transition-colors"
                  >
                    Set Active
                  </button>
                )}
                {!resume.isActive && (
                  <button
                    onClick={() => deleteResume(resume._id, resume.name)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#EA1815]/30 text-[#EA1815] hover:bg-red-50 transition-colors"
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
