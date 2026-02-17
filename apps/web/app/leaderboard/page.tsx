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

const TIER_BG: Record<RankTier, string> = {
  bronze: "bg-rank-bronze",
  silver: "bg-rank-silver",
  gold: "bg-rank-gold",
  platinum: "bg-rank-platinum",
  diamond: "bg-rank-diamond",
  master: "bg-rank-master",
  grandmaster: "bg-rank-grandmaster",
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
      racesWon: userStats.racesWon,
      avgWpm: userStats.avgWpm,
      maxWpm: userStats.maxWpm,
      avgAccuracy: userStats.avgAccuracy,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(and(isNotNull(users.username), eq(users.placementsCompleted, true)))
    .orderBy(desc(users.eloRating))
    .limit(100);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
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
          <div>
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_4.5rem_4rem_3.5rem_3.5rem_3rem] items-center gap-3 px-4 py-2 text-[0.65rem] text-muted/40 uppercase tracking-widest border-b border-white/[0.04]">
              <span></span>
              <span>Player</span>
              <span className="text-right">ELO</span>
              <span className="text-right">Avg</span>
              <span className="text-right">Best</span>
              <span className="text-right">Acc</span>
              <span className="text-right">W/L</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.03]">
              {rows.map((row, i) => {
                const rank = i + 1;
                const isMe = session?.user?.id === row.id;
                const info = getRankInfo(row.eloRating);
                const tierColor = TIER_TEXT[info.tier];
                const tierBg = TIER_BG[info.tier];

                const racesPlayed = row.racesPlayed ?? 0;
                const racesWon = row.racesWon ?? 0;

                const rankDisplay = rank === 1
                  ? "text-rank-gold"
                  : rank === 2
                  ? "text-rank-silver"
                  : rank === 3
                  ? "text-rank-bronze"
                  : "text-muted/30";

                const rowBg = isMe
                  ? "bg-accent/[0.05] ring-1 ring-accent/10"
                  : rank <= 3
                  ? "bg-surface/30"
                  : "hover:bg-white/[0.02]";

                return (
                  <Link
                    key={row.id}
                    href={`/profile/${row.username}`}
                    className={`grid grid-cols-[2rem_1fr_4.5rem_4rem_3.5rem_3.5rem_3rem] items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                  >
                    <span className={`text-xs font-bold tabular-nums ${rankDisplay}`}>
                      {rank}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank tier dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tierBg}`} />
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate text-sm leading-tight ${isMe ? "text-accent font-bold" : "text-text"}`}>
                          {row.username}
                        </span>
                        <span className={`text-[0.65rem] leading-tight ${tierColor}`}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm tabular-nums text-right font-semibold ${tierColor}`}>
                      {row.eloRating}
                    </span>
                    <span className="text-sm text-muted tabular-nums text-right">
                      {row.avgWpm != null ? Math.round(row.avgWpm) : 0}
                    </span>
                    <span className="text-sm text-muted/60 tabular-nums text-right">
                      {row.maxWpm != null ? Math.round(row.maxWpm) : 0}
                    </span>
                    <span className="text-sm text-muted/60 tabular-nums text-right">
                      {row.avgAccuracy != null ? `${Math.round(row.avgAccuracy)}%` : "-"}
                    </span>
                    <span className="text-xs text-muted/30 tabular-nums text-right">
                      {racesWon}/{racesPlayed}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
