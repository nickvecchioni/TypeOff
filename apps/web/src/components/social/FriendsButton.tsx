"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FriendsDrawer } from "./FriendsDrawer";

export function FriendsButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [hasRequests, setHasRequests] = useState(false);

  // Poll for pending requests to show notification dot (deferred to avoid mount stutter)
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/friends/requests");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setHasRequests(data.requests?.length > 0);
        }
      } catch {
        // ignore
      }
    };
    // Defer initial check to avoid blocking page load
    const initialDelay = setTimeout(check, 2000);
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [session?.user]);

  const handleClose = useCallback(() => setOpen(false), []);

  if (!session?.user) return null;

  return (
    <div className="relative flex items-center">
      <div className="relative group/tt flex items-center">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 text-muted hover:text-text transition-colors"
        aria-label="Friends"
      >
        {/* People icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {hasRequests && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
        )}
      </button>
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-surface ring-1 ring-white/[0.08] text-[11px] text-muted/70 whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
        Friends
      </span>
      </div>
      <FriendsDrawer open={open} onClose={handleClose} />
    </div>
  );
}
