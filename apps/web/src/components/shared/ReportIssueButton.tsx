"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function ReportIssueButton() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <Link
      href="/report-issue"
      className="p-1.5 text-muted hover:text-text transition-colors"
      aria-label="Report an Issue"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </Link>
  );
}
