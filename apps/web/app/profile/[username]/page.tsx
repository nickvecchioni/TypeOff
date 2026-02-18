export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races, userAchievements, userActiveCosmetics } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";
import { getRankInfo, getRankProgress, getNextDivisionElo, ACHIEVEMENTS, getXpLevel } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { AchievementsGrid } from "./achievements-grid";
import { UsernameEditor } from "./username-editor";
import { SignOutButton } from "./sign-out-button";
import { AddFriendButton } from "@/components/social/AddFriendButton";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { CosmeticTitle } from "@/components/CosmeticTitle";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticSelector } from "./cosmetic-selector";

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
      lastSeen: users.lastSeen,
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

  // Load achievements
  const achievementRows = await db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, user.id));
  const unlockedAchievements = achievementRows.map((r) => ({
    id: r.achievementId,
    unlockedAt: r.unlockedAt.toISOString(),
  }));

  // Load active cosmetics
  const [activeCosmetics] = await db
    .select()
    .from(userActiveCosmetics)
    .where(eq(userActiveCosmetics.userId, user.id))
    .limit(1);

  // Check if this is own profile
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isOwn = session?.user?.id === user.id;

  const rankInfo = user.placementsCompleted ? getRankInfo(user.eloRating) : null;
  const isOnline = user.lastSeen != null && (Date.now() - new Date(user.lastSeen).getTime()) < 3 * 60 * 1000;

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-6 py-6 overflow-hidden">
          {/* Rank-colored top edge */}
          {rankInfo && (
            <div
              className={`absolute inset-x-0 top-0 h-px bg-rank-${rankInfo.tier}`}
              style={{ opacity: 0.4 }}
            />
          )}

          <div className="relative flex flex-col gap-3">
            {/* Username row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CosmeticBadge badge={activeCosmetics?.activeBadge} />
                  <div className="flex flex-col">
                    {isOwn ? (
                      <UsernameEditor currentUsername={user.username ?? ""} />
                    ) : (
                      <h1 className="text-xl font-bold text-text tracking-tight">
                        <CosmeticName
                          nameColor={activeCosmetics?.activeNameColor}
                          nameEffect={activeCosmetics?.activeNameEffect}
                        >
                          {user.username}
                        </CosmeticName>
                      </h1>
                    )}
                    <CosmeticTitle title={activeCosmetics?.activeTitle} />
                  </div>
                </div>
                {isOnline && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                )}
              </div>
              {!isOwn && session?.user?.id && (
                <AddFriendButton targetUserId={user.id} />
              )}
            </div>

            {/* Rank + ELO */}
            {user.placementsCompleted && rankInfo && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <RankBadge tier={rankInfo.tier} elo={user.eloRating} />
                  {user.peakEloRating > user.eloRating && (
                    <span className="text-xs text-muted/60 tabular-nums">
                      Peak {user.peakEloRating}
                    </span>
                  )}
                </div>
                <RankProgressBar elo={user.eloRating} />
              </div>
            )}
          </div>
        </div>

        {/* ── WPM Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-5 text-center">
            <div className="text-3xl font-black text-accent tabular-nums text-glow-accent">
              {stats ? Math.floor(stats.maxWpm) : 0}
              <span className="text-[0.6em] opacity-60">
                .{stats ? (stats.maxWpm % 1).toFixed(2).slice(2) : "00"}
              </span>
            </div>
            <div className="text-xs text-muted mt-1.5 uppercase tracking-wider">best wpm</div>
          </div>
          <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-5 text-center">
            <div className="text-3xl font-black text-accent tabular-nums text-glow-accent">
              {stats ? Math.floor(stats.avgWpm) : 0}
              <span className="text-[0.6em] opacity-60">
                .{stats ? (stats.avgWpm % 1).toFixed(2).slice(2) : "00"}
              </span>
            </div>
            <div className="text-xs text-muted mt-1.5 uppercase tracking-wider">avg wpm</div>
          </div>
        </div>

        {/* ── XP / Level ──────────────────────────────────── */}
        {stats && stats.totalXp > 0 && (() => {
          const xpInfo = getXpLevel(stats.totalXp);
          return (
            <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-accent">
                  Level {xpInfo.level}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {xpInfo.currentXp} / {xpInfo.nextLevelXp} XP
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.round((xpInfo.currentXp / xpInfo.nextLevelXp) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted/60 mt-1.5 text-right tabular-nums">
                {stats.totalXp} total XP
              </div>
            </div>
          );
        })()}

        {/* ── Detail Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatCard label="Races" value={stats?.racesPlayed ?? 0} />
          <StatCard label="Wins" value={stats?.racesWon ?? 0} />
          <StatCard label="Win Streak" value={stats?.currentStreak ?? 0} />
          <StatCard label="Best Win Streak" value={stats?.maxStreak ?? 0} />
          <StatCard label="Day Streak" value={stats?.rankedDayStreak ?? 0} />
          <StatCard label="Best Day Streak" value={stats?.maxRankedDayStreak ?? 0} />
        </div>

        {/* ── Achievements ────────────────────────────────── */}
        <section>
          <SectionHeader>
            Achievements
            <span className="text-muted/40 ml-1 normal-case tracking-normal font-medium">
              {unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </SectionHeader>
          <AchievementsGrid
            achievements={ACHIEVEMENTS}
            unlocked={unlockedAchievements}
          />
        </section>

        {/* ── Race History ─────────────────────────────────── */}
        {recentRaces.length > 0 && (
          <section>
            <SectionHeader>Race History</SectionHeader>
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Place</th>
                    <th className="px-4 py-2.5 font-medium text-right">WPM</th>
                    <th className="px-4 py-2.5 font-medium text-right">Acc</th>
                    <th className="px-4 py-2.5 font-medium text-right">ELO</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRaces.map((race, i) => {
                    const eloChange =
                      race.eloBefore != null && race.eloAfter != null
                        ? race.eloAfter - race.eloBefore
                        : null;
                    const placementColor =
                      race.placement === 1
                        ? "text-rank-gold"
                        : race.placement === 2
                        ? "text-rank-silver"
                        : race.placement === 3
                        ? "text-rank-bronze"
                        : "text-error";
                    const ordinal =
                      race.placement === 1
                        ? "1st"
                        : race.placement === 2
                        ? "2nd"
                        : race.placement === 3
                        ? "3rd"
                        : race.placement === 4
                        ? "4th"
                        : "-";
                    return (
                      <tr
                        key={i}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.015] transition-colors"
                      >
                        <td className="px-4 py-2.5 text-muted tabular-nums text-xs">
                          {race.finishedAt
                            ? new Date(race.finishedAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold ${placementColor}`}>
                            {ordinal}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text text-xs">
                          {race.wpm != null ? (
                            <>
                              {Math.floor(race.wpm)}
                              <span className="text-[0.8em] opacity-50">
                                .{(race.wpm % 1).toFixed(2).slice(2)}
                              </span>
                            </>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted text-xs">
                          {race.accuracy != null ? (<>{Math.floor(race.accuracy)}<span className="text-[0.8em] opacity-50">.{((race.accuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {eloChange != null ? (
                            <span
                              className={`text-xs font-medium ${
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
                            <span className="text-muted text-xs">-</span>
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
          <section>
            <SectionHeader>Customize</SectionHeader>
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] p-5">
              <CosmeticSelector />
            </div>
          </section>
        )}

        {isOwn && (
          <div className="pt-2 border-t border-white/[0.04] pb-8">
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
    <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
      {children}
      <span className="flex-1 h-px bg-white/[0.03]" />
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
    <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5 text-center">
      <div className="text-lg font-bold text-text tabular-nums">{value}</div>
      <div className="text-xs text-muted/60 mt-0.5">{label}</div>
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
        <div className="text-xs text-muted/60 text-right tabular-nums">
          {nextElo - elo} ELO to next division
        </div>
      )}
      <div className="h-1 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full ${TIER_BAR_COLORS[info.tier]} transition-all`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
