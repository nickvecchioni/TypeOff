export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { dailyChallengeResults, users } from "@typeoff/db";
import { getDailySeed } from "@typeoff/shared";
import { eq, and, desc } from "drizzle-orm";
import { DailyChallenge } from "./challenge";

const WORD_COUNT = 40;

function getTodayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = getTodayUTC();
  const yesterday = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00Z");
    const curr = new Date(dates[i] + "T00:00:00Z");
    const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default async function DailyPage() {
  const db = getDb();
  const challengeDate = getTodayUTC();
  const seed = getDailySeed();

  // Auth (optional)
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userId = session?.user?.id;

  // User's streak + best result
  let myStreak = 0;
  let maxStreak = 0;
  let myBestWpm: number | null = null;

  if (userId) {
    const allResults = await db
      .select({
        challengeDate: dailyChallengeResults.challengeDate,
        currentStreak: dailyChallengeResults.currentStreak,
        wpm: dailyChallengeResults.wpm,
      })
      .from(dailyChallengeResults)
      .where(eq(dailyChallengeResults.userId, userId))
      .orderBy(desc(dailyChallengeResults.challengeDate));

    myStreak = computeStreak(allResults.map((r) => r.challengeDate));
    maxStreak = allResults.reduce((max, r) => Math.max(max, r.currentStreak), 0);

    const todayResult = allResults.find((r) => r.challengeDate === challengeDate);
    myBestWpm = todayResult?.wpm ?? null;
  }

  // Daily leaderboard: top 50 today
  const leaderboard = await db
    .select({
      wpm: dailyChallengeResults.wpm,
      accuracy: dailyChallengeResults.accuracy,
      userId: dailyChallengeResults.userId,
      username: users.username,
    })
    .from(dailyChallengeResults)
    .innerJoin(users, eq(dailyChallengeResults.userId, users.id))
    .where(eq(dailyChallengeResults.challengeDate, challengeDate))
    .orderBy(desc(dailyChallengeResults.wpm))
    .limit(50);

  // Format the date for display
  const displayDate = new Date(challengeDate + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Daily Challenge
          </h1>
          <span className="text-sm text-muted">{displayDate}</span>
        </div>

        {/* Streak display */}
        {userId && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-bold text-accent tabular-nums">
                {myStreak}
              </div>
              <div className="text-xs text-muted/60 mt-0.5">Current Streak</div>
            </div>
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-bold text-text tabular-nums">
                {maxStreak}
              </div>
              <div className="text-xs text-muted/60 mt-0.5">Best Streak</div>
            </div>
          </div>
        )}

        {/* Challenge area */}
        <DailyChallenge
          seed={seed}
          wordCount={WORD_COUNT}
          myBestWpm={myBestWpm}
        />

        {/* Leaderboard */}
        <section>
          <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
            Today&apos;s Leaderboard
            <span className="flex-1 h-px bg-white/[0.03]" />
          </h2>

          {leaderboard.length === 0 ? (
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-10 text-center">
              <p className="text-muted text-sm">No completions yet. Be the first.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2rem_1fr_5rem_5rem] items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]">
                <span></span>
                <span>Player</span>
                <span className="text-right">WPM</span>
                <span className="text-right">Accuracy</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.03]">
                {leaderboard.map((row, i) => {
                  const rank = i + 1;
                  const isMe = userId === row.userId;
                  const rankColor =
                    rank === 1
                      ? "text-rank-gold"
                      : rank === 2
                      ? "text-rank-silver"
                      : rank === 3
                      ? "text-rank-bronze"
                      : "text-muted/40";
                  const rowBg = isMe
                    ? "bg-accent/[0.05] ring-1 ring-accent/10"
                    : "hover:bg-white/[0.02]";

                  return (
                    <Link
                      key={row.userId}
                      href={`/profile/${row.username}`}
                      className={`grid grid-cols-[2rem_1fr_5rem_5rem] items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
                    >
                      <span className={`text-sm font-bold tabular-nums ${rankColor}`}>
                        {rank}
                      </span>
                      <span className={`truncate text-sm ${isMe ? "text-accent font-bold" : "text-text"}`}>
                        {row.username}
                      </span>
                      <span className="text-sm text-text tabular-nums text-right">
                        {row.wpm.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted tabular-nums text-right">
                        {row.accuracy.toFixed(0)}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
