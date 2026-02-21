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
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-muted hover:text-text transition-colors"
        title="Friends"
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
      <FriendsDrawer open={open} onClose={handleClose} />
    </>
  );
}
