"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import type { RankTier } from "@typeoff/shared";
import { getXpLevel } from "@typeoff/shared";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-28 rounded-lg bg-surface/50 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/api/auth/signin"
        className="text-sm font-medium text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
      >
        Sign In
      </Link>
    );
  }

  const cosmetics = useActiveCosmetics();

  const profileHref = session.user.username
    ? `/profile/${session.user.username}`
    : "#";

  const streak = session.user.currentStreak ?? 0;
  const xpInfo = getXpLevel(session.user.totalXp ?? 0);

  return (
    <Link
      href={profileHref}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-white/[0.05] transition-colors group"
    >
      {/* Rank badge */}
      {session.user.placementsCompleted && (
        <RankBadge
          tier={session.user.rankTier as RankTier}
          elo={session.user.eloRating}
          size="xs"
        />
      )}

      {/* Badge + Username + meta row */}
      <CosmeticBadge badge={cosmetics.activeBadge} />
      <div className="hidden sm:flex items-center gap-2">
        <span className="text-sm font-bold text-text group-hover:text-accent transition-colors">
          <CosmeticName nameColor={cosmetics.activeNameColor} nameEffect={cosmetics.activeNameEffect}>
            {session.user.username ?? "set username"}
          </CosmeticName>
        </span>

        {/* Level + streak badges */}
        <div className="flex items-center gap-1.5">
          {session.user.totalXp > 0 && (
            <span
              className="text-[10px] font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-px rounded"
              title={`${session.user.totalXp} total XP`}
            >
              {xpInfo.level}
            </span>
          )}
          {streak >= 2 && (
            <span
              className="flex items-center gap-0.5 text-[10px] font-bold text-orange-400/80 bg-orange-400/[0.08] px-1.5 py-px rounded"
              title={`${streak} win streak`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.665.753-3.488 2.127-5.244.883-1.128 1.873-2.1 2.873-3.006V2l4.386 4.506c.953.979 1.893 2.09 2.614 3.25C18.36 11.715 19 13.578 19 15.5 19 19.642 16.09 23 12 23z" />
              </svg>
              {streak}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
