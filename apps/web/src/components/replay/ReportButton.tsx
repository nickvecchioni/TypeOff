"use client";

import React, { useState } from "react";

interface ReportButtonProps {
  raceId: string;
  reportedUserId: string;
}

export function ReportButton({ raceId, reportedUserId }: ReportButtonProps) {
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (reported || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/report-replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, reportedUserId, reason: "suspicious" }),
      });
      if (res.ok) setReported(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (reported) {
    return (
      <span className="text-xs text-muted/40">
        Reported
      </span>
    );
  }

  return (
    <button
      onClick={handleReport}
      disabled={loading}
      className="text-xs text-muted/40 hover:text-error/60 transition-colors"
    >
      {loading ? "Reporting..." : "Report suspicious"}
    </button>
  );
}
