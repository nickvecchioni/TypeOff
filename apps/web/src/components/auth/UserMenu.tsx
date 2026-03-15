"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import type { RankTier } from "@typeoff/shared";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-28 rounded-lg bg-surface/50 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/signin"
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

  return (
    <Link
      href={profileHref}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-white/[0.05] transition-colors group"
    >
      <RankBadge
        tier={session.user.rankTier as RankTier}
        elo={session.user.eloRating}
        size="xs"
      />
      <CosmeticBadge badge={cosmetics.activeBadge} />
      <span className="hidden sm:block text-sm font-bold text-text group-hover:text-accent transition-colors">
        <CosmeticName nameColor={cosmetics.activeNameColor} nameEffect={cosmetics.activeNameEffect}>
          {session.user.username ?? "set username"}
        </CosmeticName>
      </span>
    </Link>
  );
}
