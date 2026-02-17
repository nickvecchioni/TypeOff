"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import type { RankTier } from "@typeoff/shared";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const profileHref = session.user.username
    ? `/profile/${session.user.username}`
    : "#";

  const streak = session.user.currentStreak ?? 0;

  return (
    <div className="flex items-center gap-3">
      {session.user.placementsCompleted && (
        <RankBadge
          tier={session.user.rankTier as RankTier}
          elo={session.user.eloRating}
        />
      )}
      {streak >= 2 && (
        <span className="flex items-center gap-1 text-orange-400" title={`${streak} win streak`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.665.753-3.488 2.127-5.244.883-1.128 1.873-2.1 2.873-3.006V2l4.386 4.506c.953.979 1.893 2.09 2.614 3.25C18.36 11.715 19 13.578 19 15.5 19 19.642 16.09 23 12 23z" />
          </svg>
          <span className="text-xs font-bold tabular-nums">{streak}</span>
        </span>
      )}
      <Link
        href={profileHref}
        className="text-sm text-text hover:text-accent transition-colors"
      >
        {session.user.username ?? "set username"}
      </Link>
    </div>
  );
}
