export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races, soloResults, userRatings } from "@typeoff/db";
import { eq, desc, and } from "drizzle-orm";
import type { RankTier, RaceType } from "@typeoff/shared";
import { getRankInfo, getRankProgress, getNextDivisionElo, getRankTier, RACE_TYPE_LABELS } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { UsernameEditor } from "./username-editor";
import { SignOutButton } from "./sign-out-button";
import { AddFriendButton } from "@/components/social/AddFriendButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const db = getDb();

  // Load user
  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      peakEloRating: users.peakEloRating,
      peakRankTier: users.peakRankTier,
      placementsCompleted: users.placementsCompleted,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (userRows.length === 0) return notFound();
  const user = userRows[0];

  // Load stats
  const statsRows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, user.id))
    .limit(1);
  const stats = statsRows[0] ?? null;

  // Load recent races (last 20)
  const recentRaces = await db
    .select({
      placement: raceParticipants.placement,
      wpm: raceParticipants.wpm,
      eloBefore: raceParticipants.eloBefore,
      eloAfter: raceParticipants.eloAfter,
      finishedAt: raceParticipants.finishedAt,
      playerCount: races.playerCount,
      wordPool: races.wordPool,
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .where(eq(raceParticipants.userId, user.id))
    .orderBy(desc(raceParticipants.finishedAt))
    .limit(20);

  // Load solo PBs — for each (mode, duration, wordPool), find the best WPM
  const allSoloResults = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      wordPool: soloResults.wordPool,
      wpm: soloResults.wpm,
      createdAt: soloResults.createdAt,
    })
    .from(soloResults)
    .where(eq(soloResults.userId, user.id))
    .orderBy(desc(soloResults.wpm));

  const soloPbMap = new Map<string, typeof allSoloResults[0]>();
  for (const row of allSoloResults) {
    const key = `${row.mode}:${row.duration}:${row.wordPool ?? "common"}`;
    if (!soloPbMap.has(key)) {
      soloPbMap.set(key, row);
    }
  }
  const soloPbs = Array.from(soloPbMap.values());

  // Load per-type ratings
  const ratings = await db
    .select({
      raceType: userRatings.raceType,
      eloRating: userRatings.eloRating,
      rankTier: userRatings.rankTier,
      peakEloRating: userRatings.peakEloRating,
      placementsCompleted: userRatings.placementsCompleted,
      racesPlayed: userRatings.racesPlayed,
    })
    .from(userRatings)
    .where(eq(userRatings.userId, user.id));

  const ratingsMap = new Map(ratings.map((r) => [r.raceType as RaceType, r]));

  // Check if this is own profile
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isOwn = session?.user?.id === user.id;

  const winRate =
    stats && stats.racesPlayed > 0
      ? Math.round((stats.racesWon / stats.racesPlayed) * 100)
      : 0;

  const rankInfo = user.placementsCompleted ? getRankInfo(user.eloRating) : null;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative rounded-xl bg-surface/60 ring-1 ring-white/[0.04] px-8 py-8 overflow-hidden">
          {/* Rank-colored top edge */}
          {rankInfo && (
            <div
              className={`absolute inset-x-0 top-0 h-px bg-rank-${rankInfo.tier}`}
              style={{ opacity: 0.5 }}
            />
          )}

          <div className="relative flex flex-col gap-4">
            {/* Username row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isOwn ? (
                  <UsernameEditor currentUsername={user.username ?? ""} />
                ) : (
                  <h1 className="text-2xl font-bold text-text tracking-tight">
                    {user.username}
                  </h1>
                )}
                <RankBadge
                  tier={user.rankTier as RankTier}
                  elo={user.eloRating}
                  size="md"
                  placementsCompleted={user.placementsCompleted}
                />
              </div>
              {!isOwn && session?.user?.id && (
                <AddFriendButton targetUserId={user.id} />
              )}
            </div>

            {/* Rank progress */}
            {user.placementsCompleted && (
              <div className="flex items-center gap-4">
                <RankProgressBar elo={user.eloRating} />
                {user.peakEloRating > user.eloRating && (
                  <div className="flex items-center gap-2 text-xs text-muted shrink-0">
                    <span>Peak</span>
                    <RankBadge
                      tier={user.peakRankTier as RankTier}
                      elo={user.peakEloRating}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── WPM Hero Stats ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-surface/60 ring-1 ring-white/[0.04] px-6 py-6 text-center">
            <div className="text-4xl font-black text-accent tabular-nums text-glow-accent">
              {stats ? Math.round(stats.avgWpm) : 0}
            </div>
            <div className="text-xs text-muted mt-2 uppercase tracking-wider">avg wpm</div>
          </div>
          <div className="rounded-xl bg-surface/60 ring-1 ring-white/[0.04] px-6 py-6 text-center">
            <div className="text-4xl font-black text-accent tabular-nums text-glow-accent">
              {stats ? Math.round(stats.maxWpm) : 0}
            </div>
            <div className="text-xs text-muted mt-2 uppercase tracking-wider">best wpm</div>
          </div>
        </div>

        {/* ── Detail Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Races" value={stats?.racesPlayed ?? 0} />
          <StatCard label="Win Rate" value={`${winRate}%`} />
          <StatCard label="Streak" value={stats?.currentStreak ?? 0} />
          <StatCard label="Best Streak" value={stats?.maxStreak ?? 0} />
        </div>

        {/* ── Ranked Ratings ──────────────────────────────── */}
        {ratings.length > 0 && (
          <section>
            <SectionHeader>Ranked Ratings</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["common", "medium", "hard"] as RaceType[]).map((rt) => {
                const r = ratingsMap.get(rt);
                const label = RACE_TYPE_LABELS[rt];
                if (!r || !r.placementsCompleted) {
                  return (
                    <div
                      key={rt}
                      className="rounded-lg bg-surface/60 ring-1 ring-white/[0.04] px-5 py-4 text-center"
                    >
                      <div className="text-sm font-bold text-muted mb-2">{label}</div>
                      <div className="text-xs text-muted/60">Unranked</div>
                    </div>
                  );
                }
                const tier = getRankTier(r.eloRating);
                return (
                  <div
                    key={rt}
                    className="rounded-lg bg-surface/60 ring-1 ring-white/[0.04] px-5 py-4 flex flex-col items-center gap-2"
                  >
                    <div className="text-sm font-bold text-text">{label}</div>
                    <RankBadge
                      tier={tier as RankTier}
                      elo={r.eloRating}
                      size="md"
                    />
                    <div className="text-xs text-muted tabular-nums">
                      {r.racesPlayed} races
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Solo Personal Bests ──────────────────────────── */}
        {soloPbs.length > 0 && (
          <section>
            <SectionHeader>Solo Personal Bests</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {soloPbs.map((pb) => (
                <div
                  key={`${pb.mode}:${pb.duration}:${pb.wordPool ?? "common"}`}
                  className="rounded-lg bg-surface/60 ring-1 ring-white/[0.04] px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm text-text">
                      {pb.mode === "timed" ? `${pb.duration}s` : `${pb.duration} words`}
                    </div>
                    <div className="text-xs text-muted capitalize">
                      {pb.wordPool ?? "common"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-accent tabular-nums">
                      {Math.round(pb.wpm)}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(pb.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Race History ─────────────────────────────────── */}
        {recentRaces.length > 0 && (
          <section>
            <SectionHeader>Race History</SectionHeader>
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted uppercase tracking-wider border-b border-white/[0.04]">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Result</th>
                    <th className="px-5 py-3 font-medium text-right">WPM</th>
                    <th className="px-5 py-3 font-medium text-right">ELO</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRaces.map((race, i) => {
                    const eloChange =
                      race.eloBefore != null && race.eloAfter != null
                        ? race.eloAfter - race.eloBefore
                        : null;
                    const isWin = race.placement === 1;
                    return (
                      <tr
                        key={i}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 text-muted tabular-nums">
                          {race.finishedAt
                            ? new Date(race.finishedAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-5 py-3 text-muted text-xs">
                          {race.wordPool && (race.wordPool as string) in RACE_TYPE_LABELS
                            ? RACE_TYPE_LABELS[race.wordPool as RaceType]
                            : "-"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${isWin ? "bg-correct" : "bg-error"}`} />
                            <span className={`font-bold ${isWin ? "text-correct" : "text-error"}`}>
                              {race.placement ? (isWin ? "Win" : "Loss") : "-"}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-text">
                          {race.wpm != null ? Math.round(race.wpm) : "-"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {eloChange != null ? (
                            <span
                              className={`font-medium ${
                                eloChange > 0
                                  ? "text-correct"
                                  : eloChange < 0
                                  ? "text-error"
                                  : "text-muted"
                              }`}
                            >
                              {eloChange > 0 ? "+" : ""}
                              {eloChange}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isOwn && (
          <div className="pt-4 border-t border-white/[0.04]">
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Helper Components ──────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-3">
      {children}
      <span className="flex-1 h-px bg-white/[0.04]" />
    </h2>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-surface/60 ring-1 ring-white/[0.04] px-4 py-3 text-center">
      <div className="text-xl font-bold text-text tabular-nums">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

const TIER_BAR_COLORS: Record<string, string> = {
  bronze: "bg-rank-bronze",
  silver: "bg-rank-silver",
  gold: "bg-rank-gold",
  platinum: "bg-rank-platinum",
  diamond: "bg-rank-diamond",
  master: "bg-rank-master",
  grandmaster: "bg-rank-grandmaster",
};

function RankProgressBar({ elo }: { elo: number }) {
  const info = getRankInfo(elo);
  const progress = getRankProgress(elo);
  const nextElo = getNextDivisionElo(elo);

  if (info.tier === "grandmaster") {
    return null;
  }

  return (
    <div className="flex-1 min-w-0 space-y-1">
      {nextElo != null && (
        <div className="text-xs text-muted text-right tabular-nums">
          {nextElo - elo} ELO to next division
        </div>
      )}
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full ${TIER_BAR_COLORS[info.tier]} transition-all`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
