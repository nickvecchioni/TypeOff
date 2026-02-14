"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { RankBadge } from "@/components/RankBadge";
import type { RankTier } from "@typeoff/shared";

export function UserMenu() {
  const { data: session, status } = useSession();

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
      <RankBadge
        tier={(session.user.rankTier as RankTier) ?? "bronze"}
        elo={session.user.eloRating}
      />
      <Link
        href={profileHref}
        className="text-sm text-text hover:text-accent transition-colors"
      >
        {session.user.name}
      </Link>
      {session.user.image && (
        <img
          src={session.user.image}
          alt=""
          className="w-8 h-8 rounded-full"
        />
      )}
      <button
        onClick={() => signOut()}
        className="text-sm text-muted hover:text-error transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
