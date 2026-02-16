export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races, seasonSnapshots, seasons, userAchievements, soloResults } from "@typeoff/db";
import { eq, desc, and } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, getRankProgress, getNextDivisionElo, ACHIEVEMENTS, ACHIEVEMENT_MAP } from "@typeoff/shared";
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
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .where(eq(raceParticipants.userId, user.id))
    .orderBy(desc(raceParticipants.finishedAt))
    .limit(20);

  // Load season history
  const seasonHistory = await db
    .select({
      seasonNumber: seasons.number,
      seasonName: seasons.name,
      finalElo: seasonSnapshots.finalElo,
      finalRankTier: seasonSnapshots.finalRankTier,
      peakElo: seasonSnapshots.peakElo,
      peakRankTier: seasonSnapshots.peakRankTier,
      racesPlayed: seasonSnapshots.racesPlayed,
      racesWon: seasonSnapshots.racesWon,
    })
    .from(seasonSnapshots)
    .innerJoin(seasons, eq(seasonSnapshots.seasonId, seasons.id))
    .where(eq(seasonSnapshots.userId, user.id))
    .orderBy(desc(seasons.number));

  // Load achievements
  const unlockedAchievements = await db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, user.id));

  const unlockedSet = new Set(unlockedAchievements.map((a) => a.achievementId));

  // Load solo PBs — for each (mode, duration), find the best WPM
  const allSoloResults = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      wpm: soloResults.wpm,
      createdAt: soloResults.createdAt,
    })
    .from(soloResults)
    .where(eq(soloResults.userId, user.id))
    .orderBy(desc(soloResults.wpm));

  const soloPbMap = new Map<string, typeof allSoloResults[0]>();
  for (const row of allSoloResults) {
    const key = `${row.mode}:${row.duration}`;
    if (!soloPbMap.has(key)) {
      soloPbMap.set(key, row);
    }
  }
  const soloPbs = Array.from(soloPbMap.values());

  // Check if this is own profile
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isOwn = session?.user?.id === user.id;

  const winRate =
    stats && stats.racesPlayed > 0
      ? Math.round((stats.racesWon / stats.racesPlayed) * 100)
      : 0;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {isOwn ? (
              <UsernameEditor currentUsername={user.username ?? ""} />
            ) : (
              <>
                <h1 className="text-xl font-bold text-text">
                  {user.username}
                </h1>
                {session?.user?.id && (
                  <AddFriendButton targetUserId={user.id} />
                )}
              </>
            )}
          </div>
          <RankBadge
            tier={user.rankTier as RankTier}
            elo={user.eloRating}
            size="md"
            placementsCompleted={user.placementsCompleted}
          />
          {user.placementsCompleted && (
            <>
              <RankProgressBar elo={user.eloRating} />
              {user.peakEloRating > user.eloRating && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>Peak:</span>
                  <RankBadge
                    tier={user.peakRankTier as RankTier}
                    elo={user.peakEloRating}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Races" value={stats?.racesPlayed ?? 0} />
          <StatCard label="Win Rate" value={`${winRate}%`} />
          <StatCard
            label="Avg WPM"
            value={stats ? Math.round(stats.avgWpm) : 0}
          />
          <StatCard
            label="Best WPM"
            value={stats ? Math.round(stats.maxWpm) : 0}
          />
          <StatCard
            label="Streak"
            value={stats?.currentStreak ?? 0}
          />
          <StatCard
            label="Best Streak"
            value={stats?.maxStreak ?? 0}
          />
        </div>

        {/* Solo Personal Bests */}
        {soloPbs.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-4">Solo Personal Bests</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted border-b border-surface">
                  <th className="pb-2">Mode</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2 text-right">Best WPM</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {soloPbs.map((pb) => (
                  <tr
                    key={`${pb.mode}:${pb.duration}`}
                    className="border-b border-surface/50 text-text"
                  >
                    <td className="py-2 capitalize">{pb.mode === "wordcount" ? "Words" : "Time"}</td>
                    <td className="py-2 text-muted tabular-nums">
                      {pb.mode === "timed" ? `${pb.duration}s` : `${pb.duration} words`}
                    </td>
                    <td className="py-2 text-right font-bold text-accent tabular-nums">
                      {Math.round(pb.wpm)}
                    </td>
                    <td className="py-2 text-right text-muted">
                      {new Date(pb.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Race History */}
        {recentRaces.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-4">Race History</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted border-b border-surface">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Result</th>
                  <th className="pb-2 text-right">WPM</th>
                  <th className="pb-2 text-right">ELO</th>
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
                      className="border-b border-surface/50 text-text"
                    >
                      <td className="py-2 text-muted">
                        {race.finishedAt
                          ? new Date(race.finishedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className={`py-2 font-bold ${isWin ? "text-correct" : "text-error"}`}>
                        {race.placement ? (isWin ? "Win" : "Loss") : "-"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {race.wpm != null ? Math.round(race.wpm) : "-"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {eloChange != null ? (
                          <span
                            className={
                              eloChange > 0
                                ? "text-correct"
                                : eloChange < 0
                                ? "text-error"
                                : "text-muted"
                            }
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
        )}

        {/* Achievements */}
        {ACHIEVEMENTS.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-4">Achievements</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {ACHIEVEMENTS.map((achievement) => {
                const unlocked = unlockedSet.has(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`rounded-lg p-3 text-center transition-colors ${
                      unlocked
                        ? "bg-surface"
                        : "bg-surface/30 opacity-40"
                    }`}
                    title={`${achievement.title}: ${achievement.description}`}
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="text-xs text-muted mt-1 truncate">
                      {achievement.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Season History */}
        {seasonHistory.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-4">Season History</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted border-b border-surface">
                  <th className="pb-2">Season</th>
                  <th className="pb-2 text-right">ELO</th>
                  <th className="pb-2 text-right">Peak</th>
                  <th className="pb-2 text-right">Races</th>
                  <th className="pb-2 text-right">Wins</th>
                </tr>
              </thead>
              <tbody>
                {seasonHistory.map((s) => (
                  <tr
                    key={s.seasonNumber}
                    className="border-b border-surface/50 text-text"
                  >
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <RankBadge tier={s.finalRankTier as RankTier} />
                        {s.seasonName}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.finalElo}</td>
                    <td className="py-2 text-right tabular-nums">{s.peakElo}</td>
                    <td className="py-2 text-right tabular-nums">{s.racesPlayed}</td>
                    <td className="py-2 text-right tabular-nums">{s.racesWon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isOwn && (
          <div className="pt-4">
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
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
    <div className="rounded-lg bg-surface px-4 py-3 text-center">
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
    <div className="w-full max-w-xs space-y-1">
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
