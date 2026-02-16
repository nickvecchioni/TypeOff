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
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-4 py-1 text-xs text-muted uppercase tracking-wider">
        <span className="w-6">#</span>
        <span className="w-[4.5rem]">Rank</span>
        <span className="flex-1">Player</span>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <span className="font-bold">Elo</span>
          <span className="w-12 text-right">Wpm</span>
          <span className="w-8 text-right">Races</span>
        </div>
      </div>
      {rows.map((row, i) => {
        const rank = i + 1;
        const isMe = session?.user?.id === row.id;
        const podiumColor = rank <= 3 ? PODIUM_COLORS[rank - 1] : "text-muted";

        return (
          <Link
            key={row.id}
            href={`/profile/${row.username}`}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              isMe
                ? "bg-accent/10 ring-1 ring-accent/20"
                : "bg-surface hover:bg-surface/80"
            }`}
          >
            <span className={`w-6 text-sm font-bold ${podiumColor} tabular-nums`}>
              {rank}
            </span>
            <RankBadge tier={row.rankTier as RankTier} elo={row.eloRating} />
            <span className={`flex-1 truncate text-sm font-medium ${isMe ? "text-accent" : "text-text"}`}>
              {row.username}
            </span>
            <div className="flex items-center gap-4 text-sm tabular-nums">
              <span className="text-text font-bold">{row.eloRating}</span>
              <span className="text-muted w-12 text-right">{row.avgWpm != null ? Math.round(row.avgWpm) : 0} wpm</span>
              <span className="text-muted/60 w-8 text-right">{row.racesPlayed ?? 0}</span>
            </div>
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
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-accent mb-6">Leaderboard</h1>
        <LeaderboardTabs raceContent={raceContent} />
      </div>
    </main>
  );
}
