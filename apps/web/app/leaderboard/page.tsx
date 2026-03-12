export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats, userActiveCosmetics, soloResults, raceParticipants, races } from "@typeoff/db";
import { and, desc, eq, gt, isNotNull, isNull, like, or, sql, inArray } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, getXpLevel, TITLE_TEXTS } from "@typeoff/shared";
import { AdBanner } from "@/components/AdBanner";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { SoloModeSelector } from "@/components/leaderboard/SoloModeSelector";
import { UniverseSelector } from "@/components/leaderboard/UniverseSelector";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { LiveBadge } from "@/components/WatchLiveButton";
import { RankBadge } from "@/components/RankBadge";

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
  const tab = params.tab === "solo" ? "solo" : "ranked";

  const db = getDb();
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userId = session?.user?.id;

  if (tab === "solo") {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <SoloLeaderboard params={params} userId={userId} db={db} />
          <AdBanner slot="leaderboard" format="horizontal" className="w-full mt-6" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <RankedLeaderboard userId={userId} db={db} universe={typeof params.universe === "string" ? params.universe : undefined} />
        <AdBanner slot="leaderboard" format="horizontal" className="w-full mt-6" />
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
      currentStreak: userStats.currentStreak,
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
        currentStreak: userStats.currentStreak,
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

  const gridCols = "grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_5rem_5.5rem_5.5rem_5rem_4rem_4rem_4rem]";

  return (
    <>
      <div className="flex items-baseline justify-between mb-6 animate-fade-in">
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

      <div className="mb-4 animate-fade-in">
        <Suspense>
          <UniverseSelector />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center animate-fade-in">
          <p className="text-muted text-sm">No ranked players yet. Be the first.</p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div
            className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] animate-fade-in`}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">ELO</span>
            <span className="text-right hidden sm:block">Best WPM</span>
            <span className="text-right hidden sm:block">Avg WPM</span>
            <span className="text-right hidden sm:block">Avg Acc</span>
            <span className="text-right hidden sm:block">Races</span>
            <span className="text-right">Wins</span>
          </div>

          {/* Rows */}
          <div className="animate-fade-in">
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
                : "text-muted/60";

              const rowBg = isMe
                ? "bg-accent/[0.05] ring-1 ring-accent/10"
                : rank <= 3
                ? "bg-surface/30"
                : "hover:bg-white/[0.02]";

              const cosmetic = cosmeticMap.get(row.id);
              const lvl = getXpLevel(row.totalXp ?? 0).level;

              return (
                <Link
                  key={row.id}
                  href={`/profile/${row.username}`}
                  className={`grid ${gridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-base font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-white/10"}`} />
                    <LiveBadge userId={row.id} />
                    <span className={`text-base truncate ${isMe ? "font-bold" : ""}`}>
                      <CosmeticName nameColor={cosmetic?.activeNameColor} nameEffect={cosmetic?.activeNameEffect}>
                        {row.username}
                      </CosmeticName>
                    </span>
                    <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{lvl}</span>
                    <span className={`text-xs shrink-0 ${tierColor}`}>{info.label}</span>
                    {cosmetic?.activeTitle && (
                      <span className="text-xs text-text/70 shrink-0 hidden sm:inline">{TITLE_TEXTS[cosmetic.activeTitle] ?? cosmetic.activeTitle}</span>
                    )}
                    <CosmeticBadge badge={cosmetic?.activeBadge} />
                  </div>
                  <span className={`text-base tabular-nums text-right font-semibold ${tierColor}`}>
                    {row.eloRating}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.maxWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.avgWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-70">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {racesPlayed}
                  </span>
                  <span className="text-base text-text tabular-nums text-right">
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
              <div className="mt-3 border-t border-white/[0.04] pt-3 animate-fade-in">
                <p className="text-center text-muted/65 text-sm select-none leading-none mb-3">
                  &middot;&middot;&middot;
                </p>
                <Link
                  href={`/profile/${row.username}`}
                  className={`grid ${gridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-accent/[0.05] ring-1 ring-accent/10`}
                >
                  <span className="text-base font-bold tabular-nums text-muted/60">
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                    <span className="text-base truncate font-bold">
                      <CosmeticName nameColor={myCosmetic?.activeNameColor} nameEffect={myCosmetic?.activeNameEffect}>
                        {row.username}
                      </CosmeticName>
                    </span>
                    <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{myLvl}</span>
                    <span className={`text-xs shrink-0 ${tierColor}`}>{info.label}</span>
                    {myCosmetic?.activeTitle && (
                      <span className="text-xs text-text/70 shrink-0 hidden sm:inline">{TITLE_TEXTS[myCosmetic.activeTitle] ?? myCosmetic.activeTitle}</span>
                    )}
                    <CosmeticBadge badge={myCosmetic?.activeBadge} />
                  </div>
                  <span className={`text-base tabular-nums text-right font-semibold ${tierColor}`}>
                    {row.eloRating}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.maxWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.avgWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-70">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {racesPlayed}
                  </span>
                  <span className="text-base text-text tabular-nums text-right">
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
  const category = ["words", "mixed", "quotes", "code"].includes(params.category as string) ? (params.category as string) : "words";
  const isFixedText = category === "quotes" || category === "code";
  // Quotes/code are always stored as mode=wordcount, duration=0, difficulty=easy
  const mode = isFixedText ? "wordcount" : (params.mode === "wordcount" ? "wordcount" : "timed");
  const duration = isFixedText ? 0 : (Number(params.duration) || (mode === "timed" ? 15 : 25));
  const difficulty = isFixedText ? "easy" : (["easy", "medium", "hard"].includes(params.difficulty as string) ? (params.difficulty as string) : "easy");

  // word_pool format is "contentType:difficulty:punctuation" (e.g. "words:easy:false")
  // "mixed" is words + punctuation=true; "words" is words + punctuation=false
  // Legacy rows (null) are treated as words:easy:false
  const resolvedContentType = category === "mixed" ? "words" : category;
  const wordPoolPattern = category === "words"
    ? `words:${difficulty}:false`
    : category === "mixed"
    ? `words:${difficulty}:true`
    : `${resolvedContentType}:${difficulty}:%`;
  const wordPoolFilter = category === "words" && difficulty === "easy"
    ? or(like(soloResults.wordPool, wordPoolPattern), isNull(soloResults.wordPool))
    : like(soloResults.wordPool, wordPoolPattern);

  // For quotes/code, skip mode/duration filters — wordPool already identifies the content type,
  // and legacy results may have been stored with the user's actual mode/duration before normalization.
  const mainFilters = isFixedText
    ? [wordPoolFilter, isNotNull(users.username)]
    : [eq(soloResults.mode, mode), eq(soloResults.duration, duration), wordPoolFilter, isNotNull(users.username)];

  const rows = await db
    .select({
      usrId: soloResults.userId,
      username: users.username,
      lastSeen: users.lastSeen,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
      bestRawWpm: sql<number>`(array_agg(${soloResults.rawWpm} ORDER BY ${soloResults.wpm} DESC))[1]`.as("best_raw_wpm"),
      avgAccuracy: sql<number>`avg(${soloResults.accuracy})`.as("avg_accuracy"),
      testCount: sql<number>`count(*)`.as("test_count"),
      totalXp: userStats.totalXp,
    })
    .from(soloResults)
    .innerJoin(users, eq(soloResults.userId, users.id))
    .leftJoin(userStats, eq(soloResults.userId, userStats.userId))
    .where(and(...mainFilters))
    .groupBy(soloResults.userId, users.username, users.lastSeen, users.eloRating, users.rankTier, userStats.totalXp)
    .orderBy(sql`best_wpm desc`)
    .limit(100);

  // "Your rank" anchor for solo
  let myRank: { rank: number; row: (typeof rows)[number] } | null = null;
  if (userId && !rows.some((r) => r.usrId === userId)) {
    const myFilters = isFixedText
      ? [eq(soloResults.userId, userId), wordPoolFilter]
      : [eq(soloResults.userId, userId), eq(soloResults.mode, mode), eq(soloResults.duration, duration), wordPoolFilter];

    const [myRow] = await db
      .select({
        usrId: soloResults.userId,
        username: users.username,
        lastSeen: users.lastSeen,
        eloRating: users.eloRating,
        rankTier: users.rankTier,
        bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
        bestRawWpm: sql<number>`(array_agg(${soloResults.rawWpm} ORDER BY ${soloResults.wpm} DESC))[1]`.as("best_raw_wpm"),
        avgAccuracy: sql<number>`avg(${soloResults.accuracy})`.as("avg_accuracy"),
        testCount: sql<number>`count(*)`.as("test_count"),
        totalXp: userStats.totalXp,
      })
      .from(soloResults)
      .innerJoin(users, eq(soloResults.userId, users.id))
      .leftJoin(userStats, eq(soloResults.userId, userStats.userId))
      .where(and(...myFilters))
      .groupBy(soloResults.userId, users.username, users.lastSeen, users.eloRating, users.rankTier, userStats.totalXp)
      .limit(1);

    if (myRow) {
      const rankFilters = isFixedText
        ? [wordPoolFilter]
        : [eq(soloResults.mode, mode), eq(soloResults.duration, duration), wordPoolFilter];

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)`.as("cnt") })
        .from(
          db
            .select({
              usrId: soloResults.userId,
              bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
            })
            .from(soloResults)
            .where(and(...rankFilters))
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

  const modeLabel = isFixedText ? category : mode === "timed" ? `${duration}s` : `${duration} words`;
  const soloGridCols = "grid-cols-[2rem_1fr_4rem] sm:grid-cols-[2.5rem_1fr_5.5rem_5rem_5rem_4rem]";

  return (
    <>
      <div className="flex items-baseline justify-between mb-6 animate-fade-in">
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

      <div className="mb-6 animate-fade-in">
        <Suspense>
          <SoloModeSelector />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center animate-fade-in">
          <p className="text-muted text-sm">
            No solo results for {modeLabel} yet. Be the first.
          </p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div
            className={`grid ${soloGridCols} items-center gap-3 px-4 py-2.5 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] animate-fade-in`}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">WPM</span>
            <span className="text-right hidden sm:block">Raw</span>
            <span className="text-right hidden sm:block">Avg Acc</span>
            <span className="text-right hidden sm:block">Tests</span>
          </div>

          {/* Rows */}
          <div className="animate-fade-in">
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = userId === row.usrId;
              const soloCosmetic = soloCosmeticMap.get(row.usrId);
              const isOnline = row.lastSeen != null && (Date.now() - new Date(row.lastSeen).getTime()) < 3 * 60 * 1000;
              const info = getRankInfo(row.eloRating ?? 1000);
              const tierColor = TIER_TEXT[info.tier];

              const rankDisplay = rank === 1
                ? "text-rank-gold"
                : rank === 2
                ? "text-rank-silver"
                : rank === 3
                ? "text-rank-bronze"
                : "text-muted/60";

              const rowBg = isMe
                ? "bg-accent/[0.05] ring-1 ring-accent/10"
                : rank <= 3
                ? "bg-surface/30"
                : "hover:bg-white/[0.02]";

              return (
                <Link
                  key={row.usrId}
                  href={`/profile/${row.username}`}
                  className={`grid ${soloGridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-base font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-white/10"}`} />
                    <LiveBadge userId={row.usrId} />
                    <span className={`text-base truncate ${isMe ? "font-bold" : ""}`}>
                      <CosmeticName nameColor={soloCosmetic?.activeNameColor} nameEffect={soloCosmetic?.activeNameEffect}>
                        {row.username}
                      </CosmeticName>
                    </span>
                    <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{getXpLevel(row.totalXp ?? 0).level}</span>
                    <span className={`text-xs shrink-0 ${tierColor}`}>{info.label}</span>
                    {soloCosmetic?.activeTitle && (
                      <span className="text-xs text-text/70 shrink-0 hidden sm:inline">{TITLE_TEXTS[soloCosmetic.activeTitle] ?? soloCosmetic.activeTitle}</span>
                    )}
                    <CosmeticBadge badge={soloCosmetic?.activeBadge} />
                  </div>
                  <span className="text-base tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.bestRawWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-70">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
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
            const myInfo = getRankInfo(row.eloRating ?? 1000);
            const myTierColor = TIER_TEXT[myInfo.tier];

            return (
              <div className="mt-3 border-t border-white/[0.04] pt-3 animate-fade-in">
                <p className="text-center text-muted/65 text-sm select-none leading-none mb-3">
                  &middot;&middot;&middot;
                </p>
                <Link
                  href={`/profile/${row.username}`}
                  className={`grid ${soloGridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-accent/[0.05] ring-1 ring-accent/10`}
                >
                  <span className="text-base font-bold tabular-nums text-muted/60">
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
                    <LiveBadge userId={row.usrId} />
                    <span className="text-base truncate font-bold">
                      <CosmeticName nameColor={mySoloCosmetic?.activeNameColor} nameEffect={mySoloCosmetic?.activeNameEffect}>
                        {row.username}
                      </CosmeticName>
                    </span>
                    <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{getXpLevel(row.totalXp ?? 0).level}</span>
                    <span className={`text-xs shrink-0 ${myTierColor}`}>{myInfo.label}</span>
                    {mySoloCosmetic?.activeTitle && (
                      <span className="text-xs text-text/70 shrink-0 hidden sm:inline">{TITLE_TEXTS[mySoloCosmetic.activeTitle] ?? mySoloCosmetic.activeTitle}</span>
                    )}
                    <CosmeticBadge badge={mySoloCosmetic?.activeBadge} />
                  </div>
                  <span className="text-base tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.bestRawWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-70">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
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
      lastSeen: users.lastSeen,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      bestWpm: sql<number>`max(${raceParticipants.wpm})`.as("best_wpm"),
      avgWpm: sql<number>`avg(${raceParticipants.wpm})`.as("avg_wpm"),
      avgAccuracy: sql<number>`avg(${raceParticipants.accuracy})`.as("avg_accuracy"),
      raceCount: sql<number>`count(*)`.as("race_count"),
      racesWon: sql<number>`count(case when ${raceParticipants.placement} = 1 then 1 end)`.as("races_won"),
      totalXp: userStats.totalXp,
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .innerJoin(users, eq(raceParticipants.userId, users.id))
    .leftJoin(userStats, eq(raceParticipants.userId, userStats.userId))
    .where(
      and(
        eq(races.modeCategory, universe),
        isNotNull(raceParticipants.userId),
        isNotNull(users.username),
        eq(raceParticipants.flagged, false),
      ),
    )
    .groupBy(raceParticipants.userId, users.username, users.lastSeen, users.eloRating, users.rankTier, userStats.totalXp)
    .orderBy(sql`avg_wpm desc`)
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

  const gridCols = "grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2.5rem_1fr_5.5rem_5.5rem_5rem_4rem_4rem]";

  return (
    <>
      <div className="flex items-baseline justify-between mb-6 animate-fade-in">
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

      <div className="mb-4 animate-fade-in">
        <Suspense>
          <UniverseSelector />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center animate-fade-in">
          <p className="text-muted text-sm">
            No results for this mode yet. Be the first.
          </p>
        </div>
      ) : (
        <div>
          <div
            className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04] animate-fade-in`}
          >
            <span></span>
            <span>Player</span>
            <span className="text-right">Avg WPM</span>
            <span className="text-right hidden sm:block">Best WPM</span>
            <span className="text-right hidden sm:block">Avg Acc</span>
            <span className="text-right hidden sm:block">Races</span>
            <span className="text-right hidden sm:block">Wins</span>
          </div>

          <div className="animate-fade-in">
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = userId === row.usrId;
              const cosmetic = cosmeticMap.get(row.usrId ?? "");
              const isOnline = row.lastSeen != null && (Date.now() - new Date(row.lastSeen).getTime()) < 3 * 60 * 1000;
              const info = getRankInfo(row.eloRating ?? 1000);
              const tierColor = TIER_TEXT[info.tier];

              const rankDisplay =
                rank === 1 ? "text-rank-gold" :
                rank === 2 ? "text-rank-silver" :
                rank === 3 ? "text-rank-bronze" :
                "text-muted/60";

              const rowBg = isMe
                ? "bg-accent/[0.05] ring-1 ring-accent/10"
                : rank <= 3
                ? "bg-surface/30"
                : "hover:bg-white/[0.02]";

              return (
                <Link
                  key={row.usrId}
                  href={`/profile/${row.username}`}
                  className={`grid ${gridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors ${rowBg}`}
                >
                  <span className={`text-base font-bold tabular-nums ${rankDisplay}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-white/10"}`} />
                    <LiveBadge userId={row.usrId ?? ""} />
                    <span className={`text-base truncate ${isMe ? "font-bold" : ""}`}>
                      <CosmeticName nameColor={cosmetic?.activeNameColor} nameEffect={cosmetic?.activeNameEffect}>
                        {row.username}
                      </CosmeticName>
                    </span>
                    <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{getXpLevel(row.totalXp ?? 0).level}</span>
                    <span className={`text-xs shrink-0 ${tierColor}`}>{info.label}</span>
                    {cosmetic?.activeTitle && (
                      <span className="text-xs text-text/70 shrink-0 hidden sm:inline">{TITLE_TEXTS[cosmetic.activeTitle] ?? cosmetic.activeTitle}</span>
                    )}
                    <CosmeticBadge badge={cosmetic?.activeBadge} />
                  </div>
                  <span className="text-base tabular-nums text-right font-semibold text-text">
                    {fmtWpm(row.avgWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {fmtWpm(row.bestWpm)}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.avgAccuracy != null ? (<>{Math.floor(row.avgAccuracy)}<span className="text-[0.8em] opacity-70">.{((row.avgAccuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.raceCount}
                  </span>
                  <span className="text-base text-text tabular-nums text-right hidden sm:block">
                    {row.racesWon}
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

