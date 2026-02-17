export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats } from "@typeoff/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo } from "@typeoff/shared";

const TIER_TEXT: Record<RankTier, string> = {
  bronze: "text-rank-bronze",
  silver: "text-rank-silver",
  gold: "text-rank-gold",
  platinum: "text-rank-platinum",
  diamond: "text-rank-diamond",
  master: "text-rank-master",
  grandmaster: "text-rank-grandmaster",
};

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
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_3rem] items-center gap-2 px-4 py-2 text-xs text-muted/50 uppercase tracking-wider">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">ELO</span>
              <span className="text-right">WPM</span>
              <span className="text-right">Races</span>
            </div>

            {/* Rows */}
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = session?.user?.id === row.id;
              const info = getRankInfo(row.eloRating);
              const tierColor = TIER_TEXT[info.tier];

              const rankDisplay = rank === 1
                ? "text-rank-gold text-lg"
                : rank === 2
                ? "text-rank-silver text-lg"
                : rank === 3
                ? "text-rank-bronze text-lg"
                : "text-muted/40 text-sm";

              const rowBg = isMe
                ? "bg-accent/[0.06] ring-1 ring-accent/10"
                : rank <= 3
                ? "bg-surface/50 ring-1 ring-white/[0.04]"
                : "hover:bg-white/[0.02]";

              return (
                <Link
                  key={row.id}
                  href={`/profile/${row.username}`}
                  className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_3rem] items-center gap-2 px-4 py-3 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`font-black tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold ${tierColor} shrink-0`}>
                      {info.label}
                    </span>
                    <span className={`truncate text-sm ${isMe ? "text-accent font-bold" : "text-text/80"}`}>
                      {row.username}
                    </span>
                  </div>
                  <span className={`text-sm tabular-nums text-right font-medium ${tierColor}`}>
                    {row.eloRating}
                  </span>
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
                  <span className="text-xs text-muted/30 tabular-nums text-right">
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
