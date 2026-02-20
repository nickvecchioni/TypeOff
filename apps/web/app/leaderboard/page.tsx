export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats, userActiveCosmetics, soloResults, raceParticipants, races } from "@typeoff/db";
import { and, desc, eq, gt, isNotNull, sql, inArray } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, getXpLevel, TITLE_TEXTS } from "@typeoff/shared";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { SoloModeSelector } from "@/components/leaderboard/SoloModeSelector";
import { PPLeaderboard } from "@/components/leaderboard/PPLeaderboard";
import { UniverseSelector } from "@/components/leaderboard/UniverseSelector";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { LiveBadge } from "@/components/WatchLiveButton";

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

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "solo" ? "solo" : params.tab === "pp" ? "pp" : "ranked";

  const db = getDb();
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userId = session?.user?.id;

  if (tab === "pp") {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <PPLeaderboardPage userId={userId} />
        </div>
      </main>
    );
  }

  if (tab === "solo") {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <SoloLeaderboard params={params} userId={userId} db={db} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <RankedLeaderboard userId={userId} db={db} universe={typeof params.universe === "string" ? params.universe : undefined} />
      </div>
    </main>
  );
}

/* ── Ranked leaderboard ─────────────────────────────────────── */

async function RankedLeaderboard({ userId, db, universe }: { userId?: string; db: ReturnType<typeof getDb>; universe?: string }) {
  // When a universe filter is active, query best WPM per user from races of that mode
  if (universe && universe !== "all") {
    return <UniverseLeaderboard userId={userId} db={db} universe={universe} />;
  }

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
      totalXp: userStats.totalXp,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(and(isNotNull(users.username), eq(users.placementsCompleted, true)))
    .orderBy(desc(users.eloRating))
    .limit(100);

  // "Your rank" anchor
  let myRank: { rank: number; row: (typeof rows)[number] } | null = null;
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
        totalXp: userStats.totalXp,
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

  // Active cosmetics
  const allPlayerIds = [...rows.map((r) => r.id), ...(myRank ? [myRank.row.id] : [])];
  const cosmeticRows = allPlayerIds.length > 0
    ? await db
        .select({
          userId: userActiveCosmetics.userId,
          activeBadge: userActiveCosmetics.activeBadge,
          activeNameColor: userActiveCosmetics.activeNameColor,
          activeNameEffect: userActiveCosmetics.activeNameEffect,
          activeTitle: userActiveCosmetics.activeTitle,
        })
        .from(userActiveCosmetics)
        .where(inArray(userActiveCosmetics.userId, allPlayerIds))
    : [];
  const cosmeticMap = new Map(cosmeticRows.map((r) => [r.userId, r]));

  const gridCols = "grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_3.5rem_3.5rem_3.5rem]";

  return (
    <>
      <div
        className="flex items-baseline justify-between mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <Suspense>
            <LeaderboardTabs />
          </Suspense>
        </div>
        <span className="text-sm text-muted tabular-nums">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div
        className="mb-4 opacity-0 animate-fade-in"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <Suspense>
          <UniverseSelector />
        </Suspense>
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
            className={`grid ${gridCols} items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] opacity-0 animate-fade-in`}
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">ELO</span>
            <span className="text-right hidden sm:block">Best WPM</span>
            <span className="text-right hidden sm:block">Avg WPM</span>
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
              const isMe = userId === row.id;
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
                  className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-sm font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-white/10"}`} />
                    <LiveBadge userId={row.id} />
                    {(() => {
                      const cosmetic = cosmeticMap.get(row.id);
                      const lvl = getXpLevel(row.totalXp ?? 0).level;
                      return (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CosmeticBadge badge={cosmetic?.activeBadge} />
                          <div className="flex flex-col min-w-0">
                            <span className={`truncate text-sm leading-tight ${isMe ? "font-bold" : ""}`}>
                              {isMe ? (
                                <CosmeticName nameColor={null} nameEffect={cosmetic?.activeNameEffect}>
                                  <span className="text-accent">{row.username}</span>
                                </CosmeticName>
                              ) : (
                                <CosmeticName nameColor={cosmetic?.activeNameColor} nameEffect={cosmetic?.activeNameEffect}>
                                  {row.username}
                                </CosmeticName>
                              )}
                              <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums">Lv.{lvl}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className={`text-xs leading-tight ${tierColor}`}>
                                {info.label}
                              </span>
                              {cosmetic?.activeTitle && (
                                <span className="text-[10px] text-muted/40 leading-tight">{TITLE_TEXTS[cosmetic.activeTitle] ?? cosmetic.activeTitle}</span>
                              )}
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
            const myCosmetic = cosmeticMap.get(row.id);
            const myLvl = getXpLevel(row.totalXp ?? 0).level;

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
                  className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors bg-accent/[0.05] ring-1 ring-accent/10`}
                >
                  <span className="text-sm font-bold tabular-nums text-muted/40">
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                    <CosmeticBadge badge={myCosmetic?.activeBadge} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm leading-tight text-accent font-bold">
                        {row.username}
                        <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums font-normal">Lv.{myLvl}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`text-xs leading-tight ${tierColor}`}>
                          {info.label}
                        </span>
                        {myCosmetic?.activeTitle && (
                          <span className="text-[10px] text-muted/40 leading-tight">{TITLE_TEXTS[myCosmetic.activeTitle] ?? myCosmetic.activeTitle}</span>
                        )}
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
    </>
  );
}

/* ── Solo leaderboard ────────────────────────────────────────── */

async function SoloLeaderboard({
  params,
  userId,
  db,
}: {
  params: { [key: string]: string | string[] | undefined };
  userId?: string;
  db: ReturnType<typeof getDb>;
}) {
  const mode = params.mode === "wordcount" ? "wordcount" : "timed";
  const duration = Number(params.duration) || (mode === "timed" ? 60 : 25);

  const rows = await db
    .select({
      usrId: soloResults.userId,
      username: users.username,
      bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
      bestAccuracy: sql<number>`max(${soloResults.accuracy})`.as("best_accuracy"),
      testCount: sql<number>`count(*)`.as("test_count"),
      totalXp: userStats.totalXp,
    })
    .from(soloResults)
    .innerJoin(users, eq(soloResults.userId, users.id))
    .leftJoin(userStats, eq(soloResults.userId, userStats.userId))
    .where(
      and(
        eq(soloResults.mode, mode),
        eq(soloResults.duration, duration),
        isNotNull(users.username),
      ),
    )
    .groupBy(soloResults.userId, users.username, userStats.totalXp)
    .orderBy(sql`best_wpm desc`)
    .limit(100);

  // "Your rank" anchor for solo
  let myRank: { rank: number; row: (typeof rows)[number] } | null = null;
  if (userId && !rows.some((r) => r.usrId === userId)) {
    const [myRow] = await db
      .select({
        usrId: soloResults.userId,
        username: users.username,
        bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
        bestAccuracy: sql<number>`max(${soloResults.accuracy})`.as("best_accuracy"),
        testCount: sql<number>`count(*)`.as("test_count"),
        totalXp: userStats.totalXp,
      })
      .from(soloResults)
      .innerJoin(users, eq(soloResults.userId, users.id))
      .leftJoin(userStats, eq(soloResults.userId, userStats.userId))
      .where(
        and(
          eq(soloResults.userId, userId),
          eq(soloResults.mode, mode),
          eq(soloResults.duration, duration),
        ),
      )
      .groupBy(soloResults.userId, users.username, userStats.totalXp)
      .limit(1);

    if (myRow) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)`.as("cnt") })
        .from(
          db
            .select({
              usrId: soloResults.userId,
              bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
            })
            .from(soloResults)
            .where(
              and(
                eq(soloResults.mode, mode),
                eq(soloResults.duration, duration),
              ),
            )
            .groupBy(soloResults.userId)
            .as("sub"),
        )
        .where(gt(sql`sub.best_wpm`, myRow.bestWpm));

      myRank = { rank: Number(count) + 1, row: myRow };
    }
  }

  // Active cosmetics for solo leaderboard
  const soloPlayerIds = [...rows.map((r) => r.usrId), ...(myRank ? [myRank.row.usrId] : [])];
  const soloCosmeticRows = soloPlayerIds.length > 0
    ? await db
        .select({
          userId: userActiveCosmetics.userId,
          activeBadge: userActiveCosmetics.activeBadge,
          activeNameColor: userActiveCosmetics.activeNameColor,
          activeNameEffect: userActiveCosmetics.activeNameEffect,
          activeTitle: userActiveCosmetics.activeTitle,
        })
        .from(userActiveCosmetics)
        .where(inArray(userActiveCosmetics.userId, soloPlayerIds))
    : [];
  const soloCosmeticMap = new Map(soloCosmeticRows.map((r) => [r.userId, r]));

  const modeLabel = mode === "timed" ? `${duration}s` : `${duration} words`;
  const soloGridCols = "grid-cols-[2rem_1fr_4rem] sm:grid-cols-[2rem_1fr_5rem_4rem_3.5rem]";

  return (
    <>
      <div
        className="flex items-baseline justify-between mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <Suspense>
            <LeaderboardTabs />
          </Suspense>
        </div>
        <span className="text-sm text-muted tabular-nums">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div
        className="mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <Suspense>
          <SoloModeSelector />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <p className="text-muted text-sm">
            No solo results for {modeLabel} yet. Be the first.
          </p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div
            className={`grid ${soloGridCols} items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] opacity-0 animate-fade-in`}
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">WPM</span>
            <span className="text-right hidden sm:block">Acc</span>
            <span className="text-right hidden sm:block">Tests</span>
          </div>

          {/* Rows */}
          <div
            className="divide-y divide-white/[0.03] opacity-0 animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = userId === row.usrId;
              const soloCosmetic = soloCosmeticMap.get(row.usrId);

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
                  key={row.usrId}
                  href={`/profile/${row.username}`}
                  className={`grid ${soloGridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-sm font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CosmeticBadge badge={soloCosmetic?.activeBadge} />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`truncate text-sm leading-tight ${isMe ? "font-bold" : ""}`}
                      >
                        {isMe ? (
                          <CosmeticName nameColor={null} nameEffect={soloCosmetic?.activeNameEffect}>
                            <span className="text-accent">{row.username}</span>
                          </CosmeticName>
                        ) : (
                          <CosmeticName nameColor={soloCosmetic?.activeNameColor} nameEffect={soloCosmetic?.activeNameEffect}>
                            {row.username}
                          </CosmeticName>
                        )}
                        <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums">Lv.{getXpLevel(row.totalXp ?? 0).level}</span>
                      </span>
                      {soloCosmetic?.activeTitle && (
                        <span className="text-[10px] text-muted/40 leading-tight">{TITLE_TEXTS[soloCosmetic.activeTitle] ?? soloCosmetic.activeTitle}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.bestAccuracy != null ? (<>{Math.floor(row.bestAccuracy)}<span className="text-[0.8em] opacity-50">.{((row.bestAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.testCount}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Your rank anchor */}
          {myRank && (() => {
            const { rank, row } = myRank;
            const mySoloCosmetic = soloCosmeticMap.get(row.usrId);

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
                  className={`grid ${soloGridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors bg-accent/[0.05] ring-1 ring-accent/10`}
                >
                  <span className="text-sm font-bold tabular-nums text-muted/40">
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CosmeticBadge badge={mySoloCosmetic?.activeBadge} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm leading-tight text-accent font-bold">
                        {row.username}
                        <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums font-normal">Lv.{getXpLevel(row.totalXp ?? 0).level}</span>
                      </span>
                      {mySoloCosmetic?.activeTitle && (
                        <span className="text-[10px] text-muted/40 leading-tight">{TITLE_TEXTS[mySoloCosmetic.activeTitle] ?? mySoloCosmetic.activeTitle}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.bestAccuracy != null ? (<>{Math.floor(row.bestAccuracy)}<span className="text-[0.8em] opacity-50">.{((row.bestAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.testCount}
                  </span>
                </Link>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}

/* ── PP leaderboard ──────────────────────────────────────────── */

function PPLeaderboardPage({ userId }: { userId?: string }) {
  return (
    <>
      <div
        className="flex items-baseline justify-between mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <Suspense>
            <LeaderboardTabs />
          </Suspense>
        </div>
      </div>
      <div
        className="opacity-0 animate-fade-in"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <PPLeaderboard userId={userId} />
      </div>
    </>
  );
}

/* ── Universe (mode-filtered) leaderboard ────────────────────── */

async function UniverseLeaderboard({
  userId,
  db,
  universe,
}: {
  userId?: string;
  db: ReturnType<typeof getDb>;
  universe: string;
}) {
  // Best WPM per user for races of this mode
  const rows = await db
    .select({
      usrId: raceParticipants.userId,
      username: users.username,
      bestWpm: sql<number>`max(${raceParticipants.wpm})`.as("best_wpm"),
      bestAccuracy: sql<number>`max(${raceParticipants.accuracy})`.as("best_accuracy"),
      raceCount: sql<number>`count(*)`.as("race_count"),
      totalXp: userStats.totalXp,
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .innerJoin(users, eq(raceParticipants.userId, users.id))
    .leftJoin(userStats, eq(raceParticipants.userId, userStats.userId))
    .where(
      and(
        eq(races.wordPool, universe),
        isNotNull(raceParticipants.userId),
        isNotNull(users.username),
        eq(raceParticipants.flagged, false),
      ),
    )
    .groupBy(raceParticipants.userId, users.username, userStats.totalXp)
    .orderBy(sql`best_wpm desc`)
    .limit(100);

  // Cosmetics
  const playerIds = rows.map((r) => r.usrId).filter(Boolean) as string[];
  const cosmeticRows = playerIds.length > 0
    ? await db
        .select({
          userId: userActiveCosmetics.userId,
          activeBadge: userActiveCosmetics.activeBadge,
          activeNameColor: userActiveCosmetics.activeNameColor,
          activeNameEffect: userActiveCosmetics.activeNameEffect,
          activeTitle: userActiveCosmetics.activeTitle,
        })
        .from(userActiveCosmetics)
        .where(inArray(userActiveCosmetics.userId, playerIds))
    : [];
  const cosmeticMap = new Map(cosmeticRows.map((r) => [r.userId, r]));

  const gridCols = "grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2rem_1fr_5rem_4rem_3.5rem]";

  return (
    <>
      <div
        className="flex items-baseline justify-between mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Leaderboard
          </h1>
          <Suspense>
            <LeaderboardTabs />
          </Suspense>
        </div>
        <span className="text-sm text-muted tabular-nums">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div
        className="mb-4 opacity-0 animate-fade-in"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <Suspense>
          <UniverseSelector />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <p className="text-muted text-sm">
            No results for this mode yet. Be the first.
          </p>
        </div>
      ) : (
        <div>
          <div
            className={`grid ${gridCols} items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] opacity-0 animate-fade-in`}
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">Best WPM</span>
            <span className="text-right hidden sm:block">Acc</span>
            <span className="text-right hidden sm:block">Races</span>
          </div>

          <div
            className="divide-y divide-white/[0.03] opacity-0 animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = userId === row.usrId;
              const cosmetic = cosmeticMap.get(row.usrId ?? "");

              const rankDisplay =
                rank === 1 ? "text-rank-gold" :
                rank === 2 ? "text-rank-silver" :
                rank === 3 ? "text-rank-bronze" :
                "text-muted/40";

              const rowBg = isMe
                ? "bg-accent/[0.05] ring-1 ring-accent/10"
                : rank <= 3
                ? "bg-surface/30"
                : "hover:bg-white/[0.02]";

              return (
                <Link
                  key={row.usrId}
                  href={`/profile/${row.username}`}
                  className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-sm font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CosmeticBadge badge={cosmetic?.activeBadge} />
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate text-sm leading-tight ${isMe ? "font-bold" : ""}`}>
                        {isMe ? (
                          <CosmeticName nameColor={null} nameEffect={cosmetic?.activeNameEffect}>
                            <span className="text-accent">{row.username}</span>
                          </CosmeticName>
                        ) : (
                          <CosmeticName nameColor={cosmetic?.activeNameColor} nameEffect={cosmetic?.activeNameEffect}>
                            {row.username}
                          </CosmeticName>
                        )}
                        <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums">Lv.{getXpLevel(row.totalXp ?? 0).level}</span>
                      </span>
                      {cosmetic?.activeTitle && (
                        <span className="text-[10px] text-muted/40 leading-tight">{TITLE_TEXTS[cosmetic.activeTitle] ?? cosmetic.activeTitle}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.bestAccuracy != null ? `${Math.floor(row.bestAccuracy)}%` : "-"}
                  </span>
                  <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                    {row.raceCount}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
