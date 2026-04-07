"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl z-10`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EBF2]">
          <h2 className="text-lg font-semibold text-[#010D39]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#3F486B] hover:bg-[#F8F9FF] transition-colors"
          >
            &#x2715;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
