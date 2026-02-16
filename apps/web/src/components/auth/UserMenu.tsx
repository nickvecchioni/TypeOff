"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import type { RankTier } from "@typeoff/shared";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [eloChange, setEloChange] = useState<number | null>(null);
  const eloTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { change } = (e as CustomEvent<{ change: number }>).detail;
      if (change === 0) return;
      setEloChange(change);
      if (eloTimeout.current) clearTimeout(eloTimeout.current);
      eloTimeout.current = setTimeout(() => setEloChange(null), 2600);
    };
    window.addEventListener("elo-change", handler);
    return () => {
      window.removeEventListener("elo-change", handler);
      if (eloTimeout.current) clearTimeout(eloTimeout.current);
    };
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-sm text-muted hover:text-accent transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const profileHref = session.user.username
    ? `/profile/${session.user.username}`
    : "#";

  return (
    <div className="flex items-center gap-3">
      <Link href={profileHref} className="relative">
        <RankBadge
          tier={(session.user.rankTier as RankTier) ?? "bronze"}
          elo={session.user.eloRating}
          placementsCompleted={session.user.placementsCompleted}
        />
        {session.user.placementsCompleted && eloChange != null && (
          <span
            className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap animate-elo-pop ${
              eloChange > 0 ? "text-correct" : "text-error"
            }`}
          >
            {eloChange > 0 ? "+" : ""}
            {eloChange}
          </span>
        )}
      </Link>
      <Link
        href={profileHref}
        className="text-sm text-text hover:text-accent transition-colors"
      >
        {session.user.username ?? "set username"}
      </Link>
    </div>
  );
}
