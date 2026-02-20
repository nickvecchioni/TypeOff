export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races, userAchievements, userActiveCosmetics, soloResults, clans, clanMembers, clanInvites, userSubscription } from "@typeoff/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { getRankInfo, getRankProgress, getNextDivisionElo, ACHIEVEMENTS, getXpLevel, PROFILE_BORDERS } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { AchievementsGrid } from "./achievements-grid";
import { UsernameEditor } from "./username-editor";
import { SignOutButton } from "./sign-out-button";
import { AddFriendButton } from "@/components/social/AddFriendButton";
import { ReportBlockButton } from "@/components/social/ReportBlockButton";
import { WatchLiveButton } from "@/components/WatchLiveButton";
import { ActivityCalendar } from "@/components/profile/ActivityCalendar";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { CosmeticTitle } from "@/components/CosmeticTitle";
import { CosmeticName } from "@/components/CosmeticName";
import { LocalDateTime } from "./local-date-time";
import { PerformanceCharts } from "@/components/profile/PerformanceCharts";
import { ClanSection } from "./clan-section";
import { CosmeticsSection } from "./cosmetics-section";


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
      clanId: users.clanId,
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

  // Load recent races (last 50)
  const recentRaces = await db
    .select({
      raceId: raceParticipants.raceId,
      placement: raceParticipants.placement,
      wpm: raceParticipants.wpm,
      rawWpm: raceParticipants.rawWpm,
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
    .limit(50);

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

  // Load solo personal bests (best WPM per mode+duration)
  const soloPbs = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
      bestAccuracy: sql<number>`max(${soloResults.accuracy})`.as("best_accuracy"),
      totalTests: sql<number>`count(*)`.as("total_tests"),
    })
    .from(soloResults)
    .where(eq(soloResults.userId, user.id))
    .groupBy(soloResults.mode, soloResults.duration);

  // Overall solo best
  const soloBestWpm = soloPbs.length > 0
    ? Math.max(...soloPbs.map((r) => r.bestWpm))
    : null;

  // Load active cosmetics
  const [activeCosmetics] = await db
    .select()
    .from(userActiveCosmetics)
    .where(eq(userActiveCosmetics.userId, user.id))
    .limit(1);

  // Load clan info + members
  let userClan: { id: string; name: string; tag: string; description: string | null; eloRating: number; memberCount: number; createdAt: Date } | null = null;
  let clanMembersList: { userId: string; role: string; joinedAt: Date; username: string | null; eloRating: number; rankTier: string }[] = [];
  if (user.clanId) {
    const [clanRow] = await db
      .select()
      .from(clans)
      .where(eq(clans.id, user.clanId))
      .limit(1);
    if (clanRow) {
      userClan = clanRow;
      clanMembersList = await db
        .select({
          userId: clanMembers.userId,
          role: clanMembers.role,
          joinedAt: clanMembers.joinedAt,
          username: users.username,
          eloRating: users.eloRating,
          rankTier: users.rankTier,
        })
        .from(clanMembers)
        .innerJoin(users, eq(clanMembers.userId, users.id))
        .where(eq(clanMembers.clanId, user.clanId));
    }
  }

  // Check Pro status
  const [subRow] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, user.id))
    .limit(1);
  const isProUser = subRow?.status === "active";

  // Fetch activity data (tests per day for the last year)
  const activityRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${soloResults.createdAt})::date::text`.as("date"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(soloResults)
    .where(eq(soloResults.userId, user.id))
    .groupBy(sql`date_trunc('day', ${soloResults.createdAt})`);
  // Also include race participation
  const raceActivityRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${raceParticipants.finishedAt})::date::text`.as("date"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(raceParticipants)
    .where(eq(raceParticipants.userId, user.id))
    .groupBy(sql`date_trunc('day', ${raceParticipants.finishedAt})`);
  // Merge into a single map
  const activityMap: Record<string, number> = {};
  for (const row of activityRows) {
    activityMap[row.date] = (activityMap[row.date] ?? 0) + row.count;
  }
  for (const row of raceActivityRows) {
    activityMap[row.date] = (activityMap[row.date] ?? 0) + row.count;
  }
  const activityData = Object.entries(activityMap).map(([date, count]) => ({ date, count }));

  // Check if this is own profile
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isOwn = session?.user?.id === user.id;
  const viewerId = session?.user?.id ?? null;

  // Clan viewer context
  const viewerMember = clanMembersList.find((m) => m.userId === viewerId) ?? null;
  const isLeaderOrOfficer = viewerMember?.role === "leader" || viewerMember?.role === "officer";
  let pendingInviteId: string | null = null;
  if (viewerId && userClan && !viewerMember) {
    const [invite] = await db
      .select({ id: clanInvites.id })
      .from(clanInvites)
      .where(and(
        eq(clanInvites.clanId, userClan.id),
        eq(clanInvites.userId, viewerId),
        eq(clanInvites.status, "pending"),
      ))
      .limit(1);
    pendingInviteId = invite?.id ?? null;
  }

  // Build chart data from races with complete info
  const chartData = recentRaces
    .filter((r) => r.finishedAt && r.wpm != null && r.accuracy != null && r.eloAfter != null)
    .map((r) => ({
      date: r.finishedAt!.toISOString(),
      wpm: r.wpm!,
      accuracy: r.accuracy!,
      elo: r.eloAfter!,
    }));

  const rankInfo = user.placementsCompleted ? getRankInfo(user.eloRating) : null;
  const isOnline = user.lastSeen != null && (Date.now() - new Date(user.lastSeen).getTime()) < 3 * 60 * 1000;

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className={`relative rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-5 overflow-hidden ${
          activeCosmetics?.activeProfileBorder
            ? PROFILE_BORDERS[activeCosmetics.activeProfileBorder]?.className ?? ""
            : ""
        }`}>
          {/* Rank-colored top edge */}
          {rankInfo && (
            <div
              className={`absolute inset-x-0 top-0 h-px bg-rank-${rankInfo.tier}`}
              style={{ opacity: 0.4 }}
            />
          )}

          <div className="relative flex flex-col gap-4">
            {/* Username row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
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
                      <CosmeticBadge badge={activeCosmetics?.activeBadge} />
                      {isProUser && (
                        <span className="text-[10px] font-bold text-amber-400/70 bg-amber-400/[0.08] px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Pro
                        </span>
                      )}
                    </div>
                    <CosmeticTitle title={activeCosmetics?.activeTitle} />
                  </div>
                </div>
                {isOnline && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                )}
                {!isOwn && <WatchLiveButton userId={user.id} />}
              </div>
              {!isOwn && session?.user?.id && (
                <div className="flex items-center gap-2">
                  <AddFriendButton targetUserId={user.id} />
                  <ReportBlockButton targetUserId={user.id} targetUsername={user.username ?? ""} />
                </div>
              )}
            </div>

            {/* Rank + WPM row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Rank + ELO */}
              {user.placementsCompleted && rankInfo && (
                <div className="flex flex-col gap-2 flex-1 min-w-0">
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

              {/* WPM stats inline */}
              <div className="flex gap-4 sm:gap-6 shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-black text-accent tabular-nums text-glow-accent leading-none">
                    {stats ? Math.floor(stats.maxWpm) : 0}
                    <span className="text-[0.55em] opacity-60">
                      .{stats ? (stats.maxWpm % 1).toFixed(2).slice(2) : "00"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-1 uppercase tracking-wider">best wpm</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-text tabular-nums leading-none">
                    {stats ? Math.floor(stats.avgWpm) : 0}
                    <span className="text-[0.55em] opacity-60">
                      .{stats ? (stats.avgWpm % 1).toFixed(2).slice(2) : "00"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-1 uppercase tracking-wider">avg wpm</div>
                </div>
                {soloBestWpm != null && (
                  <div className="text-center">
                    <div className="text-2xl font-black text-text tabular-nums leading-none">
                      {Math.floor(soloBestWpm)}
                      <span className="text-[0.55em] opacity-60">
                        .{(soloBestWpm % 1).toFixed(2).slice(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted mt-1 uppercase tracking-wider">solo best</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats + Level (compact) ────────────────────────── */}
        <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4 space-y-3">
          {/* XP / Level bar */}
          {stats && stats.totalXp > 0 && (() => {
            const xpInfo = getXpLevel(stats.totalXp);
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-accent">
                    Level {xpInfo.level}
                  </span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {xpInfo.currentXp} / {xpInfo.nextLevelXp} XP
                  </span>
                </div>
                <div className="h-1 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.round((xpInfo.currentXp / xpInfo.nextLevelXp) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Stat grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
            <StatCard label="Races" value={stats?.racesPlayed ?? 0} />
            <StatCard label="Wins" value={stats?.racesWon ?? 0} />
            <StatCard label="Win Streak" value={stats?.currentStreak ?? 0} />
            <StatCard label="Best Streak" value={stats?.maxStreak ?? 0} />
            <StatCard label="Day Streak" value={stats?.rankedDayStreak ?? 0} />
            <StatCard label="Best Day" value={stats?.maxRankedDayStreak ?? 0} />
          </div>
        </div>

        {/* ── Clan ─────────────────────────────────────────── */}
        {userClan && (
          <ClanSection
            clan={userClan}
            members={clanMembersList}
            viewerMember={viewerMember}
            isLeaderOrOfficer={isLeaderOrOfficer}
            viewerHasClan={!!session?.user?.clanId}
            pendingInviteId={pendingInviteId}
          />
        )}

        {/* ── Cosmetics ────────────────────────────────────── */}
        {isOwn && (
          <CosmeticsSection totalXp={stats?.totalXp ?? 0} />
        )}

        {/* ── Solo Personal Bests ──────────────────────────── */}
        {soloPbs.length > 0 && (
          <section>
            <SectionHeader>Solo Personal Bests</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {soloPbs
                .sort((a, b) => {
                  if (a.mode !== b.mode) return a.mode === "timed" ? -1 : 1;
                  return a.duration - b.duration;
                })
                .map((pb) => {
                  const label = pb.mode === "timed" ? `${pb.duration}s` : `${pb.duration} words`;
                  return (
                    <div
                      key={`${pb.mode}:${pb.duration}`}
                      className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5"
                    >
                      <div className="text-base font-bold text-accent tabular-nums leading-tight">
                        {Math.floor(pb.bestWpm)}
                        <span className="text-[0.7em] opacity-50">
                          .{(pb.bestWpm % 1).toFixed(2).slice(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted/60 mt-0.5">{label}</div>
                      <div className="text-[10px] text-muted/40 tabular-nums">{pb.totalTests} tests</div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ── Activity Calendar ──────────────────────────── */}
        {activityData.length > 0 && (
          <section>
            <SectionHeader>Activity</SectionHeader>
            <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
              <ActivityCalendar activity={activityData} />
            </div>
          </section>
        )}

        {/* ── Performance Charts ─────────────────────────── */}
        {chartData.length >= 2 && (
          <section className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
            <SectionHeader>Performance</SectionHeader>
            <PerformanceCharts races={chartData} />
          </section>
        )}

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
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Date</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Place</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">WPM</th>
                    <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 font-medium text-right">Acc</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">ELO</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right w-8"></th>
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
                        <td className="px-3 sm:px-4 py-2.5 text-muted tabular-nums text-xs" suppressHydrationWarning>
                          {race.finishedAt
                            ? <LocalDateTime date={race.finishedAt.toISOString()} />
                            : "-"}
                        </td>
                        <td className="px-3 sm:px-4 py-2.5">
                          <span className={`text-xs font-bold ${placementColor}`}>
                            {ordinal}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums text-text text-xs">
                          {race.wpm != null ? (
                            <>
                              {Math.floor(race.wpm)}
                              <span className="text-[0.8em] opacity-50">
                                .{(race.wpm % 1).toFixed(2).slice(2)}
                              </span>
                            </>
                          ) : "-"}
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-right tabular-nums text-muted text-xs">
                          {race.accuracy != null ? (<>{Math.floor(race.accuracy)}<span className="text-[0.8em] opacity-50">.{((race.accuracy % 1) * 10).toFixed(0)}%</span></>) : "-"}
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
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
                        <td className="px-3 sm:px-4 py-2.5 text-right">
                          <Link
                            href={`/races/${race.raceId}`}
                            className="text-muted/30 hover:text-accent transition-colors"
                            title="Watch replay"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Pro Feature Links ──────────────────────────── */}
        {isOwn && (
          <div className="flex gap-2">
            <Link
              href="/history"
              className="flex items-center gap-2 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 hover:ring-accent/20 transition-all group flex-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50 group-hover:text-accent transition-colors">
                <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-xs font-medium text-muted group-hover:text-text transition-colors">Full History</span>
              {!session?.user?.isPro && (
                <span className="text-[9px] font-bold text-amber-400/60 bg-amber-400/[0.06] px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto">Pro</span>
              )}
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 hover:ring-accent/20 transition-all group flex-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50 group-hover:text-accent transition-colors">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-xs font-medium text-muted group-hover:text-text transition-colors">Analytics</span>
              {!session?.user?.isPro && (
                <span className="text-[9px] font-bold text-amber-400/60 bg-amber-400/[0.06] px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto">Pro</span>
              )}
            </Link>
          </div>
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
    <div className="bg-surface/40 px-3 py-2.5 text-center">
      <div className="text-base font-bold text-text tabular-nums leading-tight">{value}</div>
      <div className="text-[10px] text-muted/60 mt-0.5">{label}</div>
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
