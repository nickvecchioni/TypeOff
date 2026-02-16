export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats } from "@typeoff/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";

export default async function LeaderboardPage() {
  const db = getDb();
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      racesPlayed: userStats.racesPlayed,
      avgWpm: userStats.avgWpm,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(and(isNotNull(users.username), eq(users.placementsCompleted, true)))
    .orderBy(desc(users.eloRating))
    .limit(100);

  const PODIUM_COLORS = ["text-rank-gold", "text-rank-silver", "text-rank-bronze"];

  const raceContent = (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-4 px-5 py-2 text-xs text-muted uppercase tracking-wider">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Wpm</span>
        <span className="text-right">Races</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const rank = i + 1;
        const isMe = session?.user?.id === row.id;
        const podiumColor = rank <= 3 ? PODIUM_COLORS[rank - 1] : "text-muted";

        return (
          <Link
            key={row.id}
            href={`/profile/${row.username}`}
            className={`grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-4 rounded-lg px-5 py-3.5 transition-all duration-200 ${
              isMe
                ? "bg-accent/10 border border-accent/20"
                : "bg-surface border border-transparent hover:border-surface-bright"
            }`}
          >
            <span className={`text-sm font-bold ${podiumColor} tabular-nums`}>
              {rank}
            </span>
            <div className="flex items-center gap-3 min-w-0">
              <RankBadge tier={row.rankTier as RankTier} elo={row.eloRating} />
              <span className={`truncate text-sm font-medium ${isMe ? "text-accent" : "text-text"}`}>
                {row.username}
              </span>
            </div>
            <span className="text-sm text-muted tabular-nums text-right">
              {row.avgWpm != null ? Math.round(row.avgWpm) : 0}
            </span>
            <span className="text-sm text-muted/60 tabular-nums text-right">
              {row.racesPlayed ?? 0}
            </span>
          </Link>
        );
      })}

      {rows.length === 0 && (
        <div className="py-12 text-center text-muted">
          No players yet. Be the first!
        </div>
      )}
    </div>
  );

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-accent mb-6">Leaderboard</h1>
        <LeaderboardTabs raceContent={raceContent} />
      </div>
    </main>
  );
}
