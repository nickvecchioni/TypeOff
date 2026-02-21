"use client";

import React, { useState, useRef, useEffect } from "react";

interface ReportBlockButtonProps {
  targetUserId: string;
  targetUsername: string;
  isBlocked?: boolean;
  onBlockChange?: (blocked: boolean) => void;
}

const REPORT_REASONS = [
  { value: "cheating", label: "Cheating / Hacking" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_username", label: "Inappropriate Username" },
] as const;

export function ReportBlockButton({ targetUserId, targetUsername, isBlocked, onBlockChange }: ReportBlockButtonProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setReportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleBlock = async () => {
    setBlocking(true);
    try {
      const method = isBlocked ? "DELETE" : "POST";
      await fetch("/api/blocks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetUserId }),
      });
      onBlockChange?.(!isBlocked);
      setOpen(false);
    } catch { /* ignore */ }
    setBlocking(false);
  };

  const handleReport = async () => {
    if (!selectedReason) return;
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedId: targetUserId, reason: selectedReason }),
      });
      setReportDone(true);
      setTimeout(() => { setReportOpen(false); setOpen(false); setReportDone(false); }, 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted/65 hover:text-muted rounded px-2 py-1 hover:bg-white/[0.04] transition-all"
        aria-label="More options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && !reportOpen && (
        <div className="absolute right-0 top-6 z-50 min-w-[140px] rounded-lg bg-surface ring-1 ring-white/[0.08] shadow-xl overflow-hidden">
          <button
            onClick={() => setReportOpen(true)}
            className="w-full text-left px-3 py-2 text-xs text-muted hover:text-text hover:bg-white/[0.04] transition-colors"
          >
            Report {targetUsername}
          </button>
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="w-full text-left px-3 py-2 text-xs text-error/70 hover:text-error hover:bg-error/5 transition-colors border-t border-white/[0.04] disabled:opacity-50"
          >
            {isBlocked ? "Unblock" : "Block"} {targetUsername}
          </button>
        </div>
      )}

      {reportOpen && (
        <div className="absolute right-0 top-6 z-50 min-w-[220px] rounded-lg bg-surface ring-1 ring-white/[0.08] shadow-xl p-3">
          {reportDone ? (
            <p className="text-xs text-correct text-center py-1">Report submitted. Thank you.</p>
          ) : (
            <>
              <p className="text-xs font-bold text-text mb-2">Report reason</p>
              <div className="flex flex-col gap-1 mb-3">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-text">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={selectedReason === r.value}
                      onChange={() => setSelectedReason(r.value)}
                      className="accent-accent"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReport}
                  disabled={!selectedReason}
                  className="flex-1 rounded bg-error/[0.08] ring-1 ring-error/20 text-error text-xs py-1.5 hover:bg-error/[0.15] transition-all disabled:opacity-40"
                >
                  Report
                </button>
                <button
                  onClick={() => setReportOpen(false)}
                  className="text-xs text-muted/65 hover:text-muted px-2"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
