export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats, raceParticipants, races, userAchievements, userActiveCosmetics, soloResults, userSubscription } from "@typeoff/db";
import { eq, desc, sql } from "drizzle-orm";
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
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div
          className={`relative rounded-xl overflow-hidden ring-1 ring-white/[0.06] animate-slide-up ${
            activeCosmetics?.activeProfileBorder
              ? PROFILE_BORDERS[activeCosmetics.activeProfileBorder]?.className ?? ""
              : ""
          }`}
          style={{ animationDelay: "0ms" }}
        >
          {/* Rank ambient glow — subtle radial emanating from right */}
          {rankInfo && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 55% 90% at 78% 50%, var(--color-rank-${rankInfo.tier}), transparent)`,
                opacity: 0.05,
              }}
            />
          )}
          {/* Rank-colored top edge */}
          {rankInfo && (
            <div
              className={`absolute inset-x-0 top-0 h-[2px] bg-rank-${rankInfo.tier}`}
              style={{ opacity: 0.45 }}
            />
          )}

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.012]"
            style={{
              backgroundImage: "linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative bg-surface/60 px-6 py-6">
            {/* Top row: identity + actions */}
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
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
                  {isOnline && (
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]" />
                      Online
                    </span>
                  )}
                </div>
                <CosmeticTitle title={activeCosmetics?.activeTitle} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isOwn && <WatchLiveButton userId={user.id} />}
                {!isOwn && session?.user?.id && (
                  <>
                    <AddFriendButton targetUserId={user.id} />
                    <ReportBlockButton targetUserId={user.id} targetUsername={user.username ?? ""} />
                  </>
                )}
              </div>
            </div>

            {/* Rank + WPM stats row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              {/* Rank block */}
              {user.placementsCompleted && rankInfo ? (
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <RankBadge tier={rankInfo.tier} elo={user.eloRating} />
                  <div className="space-y-1.5">
                    {user.peakEloRating > user.eloRating && (
                      <div className="text-[11px] text-muted/40 tabular-nums">
                        Peak {user.peakEloRating} ELO
                      </div>
                    )}
                    <RankProgressBar elo={user.eloRating} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-xs text-muted/30 italic">
                  Placement matches in progress
                </div>
              )}

              {/* WPM numbers — large, right-aligned */}
              <div className="flex gap-6 sm:gap-8 shrink-0">
                <WpmStat label="best wpm" value={stats?.maxWpm ?? 0} accent />
                <WpmStat label="avg wpm" value={stats?.avgWpm ?? 0} />
                {soloBestWpm != null && (
                  <WpmStat label="solo best" value={soloBestWpm} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── XP Level + Stats Grid ─────────────────────────── */}
        <div
          className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4 space-y-4 animate-slide-up"
          style={{ animationDelay: "60ms" }}
        >
          {stats && stats.totalXp > 0 && (() => {
            const xpInfo = getXpLevel(stats.totalXp);
            return (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-accent tabular-nums shrink-0 w-14">
                  Lv.{xpInfo.level}
                </span>
                <div className="flex-1 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.round((xpInfo.currentXp / xpInfo.nextLevelXp) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted/30 tabular-nums shrink-0">
                  {xpInfo.currentXp}/{xpInfo.nextLevelXp} xp
                </span>
              </div>
            );
          })()}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
            <StatCard label="Races" value={stats?.racesPlayed ?? 0} />
            <StatCard label="Wins" value={stats?.racesWon ?? 0} />
            <StatCard label="Streak" value={stats?.currentStreak ?? 0} />
            <StatCard label="Best Streak" value={stats?.maxStreak ?? 0} />
            <StatCard label="Day Streak" value={stats?.rankedDayStreak ?? 0} />
            <StatCard label="Best Day" value={stats?.maxRankedDayStreak ?? 0} />
          </div>
        </div>

        {/* ── Loadout link ───────────────────────────────────── */}
        {isOwn && (
          <Link
            href="/cosmetics"
            className="flex items-center justify-between rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-3.5 hover:ring-accent/20 hover:bg-surface/70 transition-all group animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/30 group-hover:text-accent transition-colors">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <div>
                <span className="text-xs font-semibold text-text/70 group-hover:text-text transition-colors">Items &amp; Loadout</span>
                <p className="text-[10px] text-muted/30 mt-0.5">Equip badges, titles, cursors, themes and more</p>
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted/20 group-hover:text-accent/50 transition-colors shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}

        {/* ── Solo Personal Bests ───────────────────────────── */}
        {soloPbs.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: "120ms" }}>
            <SectionHeader>Solo Personal Bests</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-3 hover:ring-accent/10 hover:bg-surface/60 transition-all"
                    >
                      <div className="text-[10px] text-muted/40 uppercase tracking-widest mb-1.5">{label}</div>
                      <div className="text-xl font-black text-accent tabular-nums leading-none">
                        {Math.floor(pb.bestWpm)}
                        <span className="text-[0.6em] opacity-40">
                          .{(pb.bestWpm % 1).toFixed(2).slice(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted/25 mt-1.5 tabular-nums">{pb.totalTests} tests</div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ── Activity Calendar ─────────────────────────────── */}
        {activityData.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: "140ms" }}>
            <SectionHeader>Activity</SectionHeader>
            <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
              <ActivityCalendar activity={activityData} />
            </div>
          </section>
        )}

        {/* ── Performance Charts ─────────────────────────────── */}
        {chartData.length >= 2 && (
          <section
            className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4 animate-slide-up"
            style={{ animationDelay: "160ms" }}
          >
            <SectionHeader>Performance</SectionHeader>
            <PerformanceCharts races={chartData} />
          </section>
        )}

        {/* ── Achievements ──────────────────────────────────── */}
        <section className="animate-slide-up" style={{ animationDelay: "180ms" }}>
          <SectionHeader>
            Achievements
            <span className="text-muted/25 normal-case tracking-normal font-medium ml-0.5">
              {unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </SectionHeader>
          <AchievementsGrid
            achievements={ACHIEVEMENTS}
            unlocked={unlockedAchievements}
          />
        </section>

        {/* ── Race History ──────────────────────────────────── */}
        {recentRaces.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SectionHeader>Race History</SectionHeader>
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] text-muted/35 uppercase tracking-widest border-b border-white/[0.03]">
                    <th className="w-1 py-3 pl-4"></th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Place</th>
                    <th className="px-3 py-3 font-medium text-right">WPM</th>
                    <th className="hidden sm:table-cell px-3 py-3 font-medium text-right">Acc</th>
                    <th className="px-3 py-3 font-medium text-right">ELO Δ</th>
                    <th className="px-3 py-3 font-medium text-right w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentRaces.map((race, i) => {
                    const eloChange =
                      race.eloBefore != null && race.eloAfter != null
                        ? race.eloAfter - race.eloBefore
                        : null;
                    const placement = race.placement ?? 4;
                    const placementMeta =
                      placement === 1
                        ? { textColor: "text-rank-gold", barColor: "bg-rank-gold", ordinal: "1st" }
                        : placement === 2
                        ? { textColor: "text-rank-silver", barColor: "bg-rank-silver", ordinal: "2nd" }
                        : placement === 3
                        ? { textColor: "text-rank-bronze", barColor: "bg-rank-bronze", ordinal: "3rd" }
                        : { textColor: "text-error", barColor: "bg-error", ordinal: placement === 4 ? "4th" : "-" };

                    return (
                      <tr
                        key={i}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.015] transition-colors group"
                      >
                        <td className="py-3 pl-4 pr-1">
                          <div className={`w-0.5 h-3.5 rounded-full ${placementMeta.barColor} opacity-50`} />
                        </td>
                        <td className="px-3 py-3 text-muted/40 tabular-nums text-xs" suppressHydrationWarning>
                          {race.finishedAt
                            ? <LocalDateTime date={race.finishedAt.toISOString()} />
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-bold ${placementMeta.textColor}`}>
                            {placementMeta.ordinal}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-text/70 text-xs">
                          {race.wpm != null ? (
                            <>
                              {Math.floor(race.wpm)}
                              <span className="text-[0.8em] opacity-35">
                                .{(race.wpm % 1).toFixed(2).slice(2)}
                              </span>
                            </>
                          ) : "—"}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 text-right tabular-nums text-muted/40 text-xs">
                          {race.accuracy != null ? (
                            <>
                              {Math.floor(race.accuracy)}
                              <span className="text-[0.8em] opacity-35">
                                .{((race.accuracy % 1) * 10).toFixed(0)}%
                              </span>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {eloChange != null ? (
                            <span
                              className={`text-xs font-semibold ${
                                eloChange > 0
                                  ? "text-correct"
                                  : eloChange < 0
                                  ? "text-error"
                                  : "text-muted/40"
                              }`}
                            >
                              {eloChange > 0 ? "+" : ""}
                              {eloChange}
                            </span>
                          ) : (
                            <span className="text-muted/20 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/races/${race.raceId}`}
                            className="inline-block text-muted/20 hover:text-accent transition-all opacity-0 group-hover:opacity-100"
                            title="Watch replay"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
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

        {/* ── Quick Links ───────────────────────────────────── */}
        {isOwn && (
          <div className="flex gap-2 animate-slide-up" style={{ animationDelay: "220ms" }}>
            <Link
              href="/history"
              className="flex items-center gap-2.5 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 hover:bg-surface/60 transition-all group flex-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/30 group-hover:text-accent transition-colors shrink-0">
                <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-xs font-medium text-muted/50 group-hover:text-text transition-colors">Full History</span>
              {!session?.user?.isPro && (
                <span className="text-[9px] font-bold text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto">Pro</span>
              )}
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2.5 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 hover:bg-surface/60 transition-all group flex-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/30 group-hover:text-accent transition-colors shrink-0">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-xs font-medium text-muted/50 group-hover:text-text transition-colors">Analytics</span>
              {!session?.user?.isPro && (
                <span className="text-[9px] font-bold text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto">Pro</span>
              )}
            </Link>
          </div>
        )}

        {isOwn && (
          <div className="pt-2 border-t border-white/[0.03] pb-8">
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
    <h2 className="text-[10px] font-bold text-muted/45 uppercase tracking-widest mb-3.5 flex items-center gap-2.5">
      <span className="text-accent/35 text-[8px]">◆</span>
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
    <div className="bg-surface/40 px-3 py-3 text-center">
      <div className="text-sm font-bold text-text tabular-nums leading-tight">{value}</div>
      <div className="text-[9px] text-muted/35 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function WpmStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="text-right">
      <div
        className={`text-3xl font-black tabular-nums leading-none ${
          accent ? "text-accent text-glow-accent" : "text-text/80"
        }`}
      >
        {Math.floor(value)}
        <span className="text-[0.48em] opacity-35">
          .{(value % 1).toFixed(2).slice(2)}
        </span>
      </div>
      <div className="text-[9px] text-muted/35 mt-1.5 uppercase tracking-widest">{label}</div>
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
        <div className="text-[11px] text-muted/35 text-right tabular-nums">
          {nextElo - elo} ELO to next division
        </div>
      )}
      <div className="h-0.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full rounded-full ${TIER_BAR_COLORS[info.tier]} transition-all`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
