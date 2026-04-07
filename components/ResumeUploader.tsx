"use client";

import { useState, useRef } from "react";
import { Modal } from "./ui/Modal";
import { useToast } from "./ui/Toast";

interface ResumeUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function ResumeUploader({ open, onClose, onUploaded }: ResumeUploaderProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast("Only PDF files are accepted", "error");
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.pdf$/i, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);

      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error ?? "Upload failed", "error");
        return;
      }

      toast("Resume uploaded", "success");
      onUploaded();
      onClose();
      setFile(null);
      setName("");
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Resume">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-[#0961FB] bg-blue-50" : "border-[#C8C8D8] hover:border-[#0961FB] hover:bg-[#F8F9FF]"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <div>
              <p className="text-[#128986] font-semibold text-sm">{file.name}</p>
              <p className="text-xs text-[#3F486B] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-[#3F486B] text-sm font-medium">Drop your PDF here or click to browse</p>
              <p className="text-xs text-[#C8C8D8] mt-1">PDF files only</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3F486B] mb-1">Label *</label>
          <input
            className="w-full px-3 py-2 border border-[#C8C8D8] rounded-lg text-sm focus:outline-none focus:border-[#0961FB]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Frontend Resume, Senior Engineer Resume"
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !file || !name}
            className="flex-1 py-2 rounded-lg bg-[#EA1815] text-white text-sm font-semibold hover:bg-[#B2100B] transition-colors disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Resume"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E6EBF2] text-[#3F486B] text-sm hover:bg-[#F8F9FF] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
