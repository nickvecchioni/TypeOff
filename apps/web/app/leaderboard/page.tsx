export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats } from "@typeoff/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

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

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <span className="text-xs text-muted tabular-nums">
            {rows.length} {rows.length === 1 ? "player" : "players"}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center">
            <p className="text-muted text-sm">No ranked players yet. Be the first.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem] items-center gap-3 px-4 py-2.5 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">WPM</span>
              <span className="text-right">Races</span>
            </div>

            {/* Rows */}
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = session?.user?.id === row.id;
              const isTop3 = rank <= 3;
              const podiumClasses = rank === 1
                ? "text-rank-gold text-glow-gold"
                : rank === 2
                ? "text-rank-silver"
                : rank === 3
                ? "text-rank-bronze"
                : "text-muted/50";

              return (
                <Link
                  key={row.id}
                  href={`/profile/${row.username}`}
                  className={`grid grid-cols-[2rem_1fr_3.5rem_3.5rem] items-center gap-3 px-4 py-2.5 transition-colors border-b border-white/[0.02] last:border-0 ${
                    isMe
                      ? "bg-accent/[0.06] hover:bg-accent/[0.1]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <span className={`text-sm font-bold tabular-nums ${podiumClasses}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RankBadge tier={row.rankTier as RankTier} elo={row.eloRating} />
                    <span className={`truncate text-sm ${isMe ? "text-accent font-bold" : isTop3 ? "text-text font-medium" : "text-text/80"}`}>
                      {row.username}
                    </span>
                  </div>
                  <span className="text-sm text-muted tabular-nums text-right">
                    {row.avgWpm != null ? (
                      <>
                        {Math.floor(row.avgWpm)}
                        <span className="text-[0.8em] opacity-50">
                          .{(row.avgWpm % 1).toFixed(2).slice(2)}
                        </span>
                      </>
                    ) : 0}
                  </span>
                  <span className="text-sm text-muted/40 tabular-nums text-right">
                    {row.racesPlayed ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
