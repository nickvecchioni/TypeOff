export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { UsernameEditor } from "./username-editor";
import { SignOutButton } from "./sign-out-button";

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
      accuracy: raceParticipants.accuracy,
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
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {isOwn ? (
              <UsernameEditor currentUsername={user.username ?? ""} />
            ) : (
              <h1 className="text-xl font-bold text-text">
                {user.username}
              </h1>
            )}
          </div>
          <RankBadge
            tier={user.rankTier as RankTier}
            elo={user.eloRating}
            size="md"
          />
          {user.peakEloRating > user.eloRating && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Peak:</span>
              <RankBadge
                tier={user.peakRankTier as RankTier}
                elo={user.peakEloRating}
              />
            </div>
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

        {/* Race History */}
        {recentRaces.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-4">Race History</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted border-b border-surface">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Place</th>
                  <th className="pb-2 text-right">WPM</th>
                  <th className="pb-2 text-right">Accuracy</th>
                  <th className="pb-2 text-right">ELO</th>
                </tr>
              </thead>
              <tbody>
                {recentRaces.map((race, i) => {
                  const eloChange =
                    race.eloBefore != null && race.eloAfter != null
                      ? race.eloAfter - race.eloBefore
                      : null;
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
                      <td className="py-2">
                        {race.placement
                          ? `${ordinal(race.placement)} of ${race.playerCount}`
                          : "-"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {race.wpm != null ? Math.round(race.wpm) : "-"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {race.accuracy != null
                          ? `${Math.round(race.accuracy)}%`
                          : "-"}
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
