export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats, userActiveCosmetics, soloResults } from "@typeoff/db";
import { and, desc, eq, gt, isNotNull, sql, inArray } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, SEASON_1 } from "@typeoff/shared";

const BADGE_EMOJI = new Map(
  SEASON_1.rewards
    .filter((r) => r.type === "badge")
    .map((r) => [r.id, r.value]),
);

const TIER_TEXT: Record<RankTier, string> = {
  bronze: "text-rank-bronze",
  silver: "text-rank-silver",
  gold: "text-rank-gold",
  platinum: "text-rank-platinum",
  diamond: "text-rank-diamond",
  master: "text-rank-master",
  grandmaster: "text-rank-grandmaster",
};

function fmtWpm(value: number | null): string {
  if (value == null) return "0.00";
  return value.toFixed(2);
}

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
      lastSeen: users.lastSeen,
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

  // "Your rank" anchor — only if logged in and not already in top 100
  let myRank: { rank: number; row: (typeof rows)[number] } | null = null;
  const userId = session?.user?.id;
  if (userId && !rows.some((r) => r.id === userId)) {
    const [myRow] = await db
      .select({
        id: users.id,
        username: users.username,
        eloRating: users.eloRating,
        rankTier: users.rankTier,
        lastSeen: users.lastSeen,
        placementsCompleted: users.placementsCompleted,
        racesPlayed: userStats.racesPlayed,
        racesWon: userStats.racesWon,
        avgWpm: userStats.avgWpm,
        maxWpm: userStats.maxWpm,
        avgAccuracy: userStats.avgAccuracy,
      })
      .from(users)
      .leftJoin(userStats, eq(users.id, userStats.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (myRow?.placementsCompleted && myRow.username) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*) + 1` })
        .from(users)
        .where(
          and(
            gt(users.eloRating, myRow.eloRating),
            eq(users.placementsCompleted, true),
            isNotNull(users.username),
          ),
        );

      myRank = { rank: Number(count), row: myRow };
    }
  }

  // Load solo best WPM for leaderboard players
  const allPlayerIds = [...rows.map((r) => r.id), ...(myRank ? [myRank.row.id] : [])];
  const soloBestRows = allPlayerIds.length > 0
    ? await db
        .select({
          userId: soloResults.userId,
          bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
        })
        .from(soloResults)
        .where(inArray(soloResults.userId, allPlayerIds))
        .groupBy(soloResults.userId)
    : [];
  const soloBestMap = new Map(soloBestRows.map((r) => [r.userId, r.bestWpm]));

  // Load active cosmetics (badges) for leaderboard players
  const cosmeticRows = allPlayerIds.length > 0
    ? await db
        .select({
          userId: userActiveCosmetics.userId,
          activeBadge: userActiveCosmetics.activeBadge,
          activeNameColor: userActiveCosmetics.activeNameColor,
        })
        .from(userActiveCosmetics)
        .where(inArray(userActiveCosmetics.userId, allPlayerIds))
    : [];
  const cosmeticMap = new Map(cosmeticRows.map((r) => [r.userId, r]));

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div
          className="flex items-baseline justify-between mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <span className="text-sm text-muted tabular-nums">
            {rows.length} {rows.length === 1 ? "player" : "players"}
          </span>
        </div>

        {rows.length === 0 ? (
          <div
            className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center opacity-0 animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <p className="text-muted text-sm">No ranked players yet. Be the first.</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div
              className="grid grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_5rem_3.5rem_3.5rem_3.5rem] items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] opacity-0 animate-fade-in"
              style={{ animationDelay: "60ms", animationFillMode: "both" }}
            >
              <span></span>
              <span>Player</span>
              <span className="text-right">ELO</span>
              <span className="text-right hidden sm:block">Best WPM</span>
              <span className="text-right hidden sm:block">Avg WPM</span>
              <span className="text-right hidden sm:block">Solo</span>
              <span className="text-right hidden sm:block">Acc</span>
              <span className="text-right hidden sm:block">Races</span>
              <span className="text-right">Wins</span>
            </div>

            {/* Rows */}
            <div
              className="divide-y divide-white/[0.03] opacity-0 animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              {rows.map((row, i) => {
                const rank = i + 1;
                const isMe = session?.user?.id === row.id;
                const info = getRankInfo(row.eloRating);
                const tierColor = TIER_TEXT[info.tier];
                const isOnline = row.lastSeen != null && (Date.now() - new Date(row.lastSeen).getTime()) < 3 * 60 * 1000;

                const racesPlayed = row.racesPlayed ?? 0;
                const racesWon = row.racesWon ?? 0;

                const rankDisplay = rank === 1
                  ? "text-rank-gold"
                  : rank === 2
                  ? "text-rank-silver"
                  : rank === 3
                  ? "text-rank-bronze"
                  : "text-muted/40";

                const rowBg = isMe
                  ? "bg-accent/[0.05] ring-1 ring-accent/10"
                  : rank <= 3
                  ? "bg-surface/30"
                  : "hover:bg-white/[0.02]";

                return (
                  <Link
                    key={row.id}
                    href={`/profile/${row.username}`}
                    className={`grid grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_5rem_3.5rem_3.5rem_3.5rem] items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                  >
                    <span className={`text-sm font-bold tabular-nums ${rankDisplay}`}>
                      {rank}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-white/10"}`} />
                      {(() => {
                        const cosmetic = cosmeticMap.get(row.id);
                        const badge = cosmetic?.activeBadge ? BADGE_EMOJI.get(cosmetic.activeBadge) : null;
                        const nameColor = cosmetic?.activeNameColor;
                        // Name color values are stored as cosmetic IDs, look up actual hex
                        const colorReward = nameColor ? SEASON_1.rewards.find((r) => r.id === nameColor) : null;
                        return (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <span className="flex items-center gap-1 min-w-0">
                                <span
                                  className={`truncate text-sm leading-tight ${isMe ? "font-bold" : ""}`}
                                  style={colorReward && !isMe ? { color: colorReward.value } : undefined}
                                >
                                  {isMe ? <span className="text-accent">{row.username}</span> : row.username}
                                </span>
                                {badge && <span className="text-sm shrink-0">{badge}</span>}
                              </span>
                              <span className={`text-xs leading-tight ${tierColor}`}>
                                {info.label}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <span className={`text-sm tabular-nums text-right font-semibold ${tierColor}`}>
                      {row.eloRating}
                    </span>
                    <span className="text-sm text-muted tabular-nums text-right hidden sm:block">
                      {fmtWpm(row.maxWpm)}
                    </span>
                    <span className="text-sm text-muted/70 tabular-nums text-right hidden sm:block">
                      {fmtWpm(row.avgWpm)}
                    </span>
                    <span className="text-sm text-muted/70 tabular-nums text-right hidden sm:block">
                      {soloBestMap.has(row.id) ? fmtWpm(soloBestMap.get(row.id)!) : <span className="text-muted/30">-</span>}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                      {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-50">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                      {racesPlayed}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right">
                      {racesWon}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Your rank anchor */}
            {myRank && (() => {
              const { rank, row } = myRank;
              const info = getRankInfo(row.eloRating);
              const tierColor = TIER_TEXT[info.tier];
              const racesPlayed = row.racesPlayed ?? 0;
              const racesWon = row.racesWon ?? 0;

              return (
                <div
                  className="mt-3 border-t border-white/[0.04] pt-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: "200ms", animationFillMode: "both" }}
                >
                  <p className="text-center text-muted/30 text-sm select-none leading-none mb-3">
                    &middot;&middot;&middot;
                  </p>
                  <Link
                    href={`/profile/${row.username}`}
                    className="grid grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_5rem_3.5rem_3.5rem_3.5rem] items-center gap-3 px-4 py-2.5 rounded-lg transition-colors bg-accent/[0.05] ring-1 ring-accent/10"
                  >
                    <span className="text-sm font-bold tabular-nums text-muted/40">
                      {rank}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm leading-tight text-accent font-bold">
                          {row.username}
                        </span>
                        <span className={`text-xs leading-tight ${tierColor}`}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm tabular-nums text-right font-semibold ${tierColor}`}>
                      {row.eloRating}
                    </span>
                    <span className="text-sm text-muted tabular-nums text-right hidden sm:block">
                      {fmtWpm(row.maxWpm)}
                    </span>
                    <span className="text-sm text-muted/70 tabular-nums text-right hidden sm:block">
                      {fmtWpm(row.avgWpm)}
                    </span>
                    <span className="text-sm text-muted/70 tabular-nums text-right hidden sm:block">
                      {soloBestMap.has(row.id) ? fmtWpm(soloBestMap.get(row.id)!) : <span className="text-muted/30">-</span>}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                      {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-50">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                      {racesPlayed}
                    </span>
                    <span className="text-sm text-muted/50 tabular-nums text-right">
                      {racesWon}
                    </span>
                  </Link>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
