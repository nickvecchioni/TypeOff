import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { dailyChallengeResults } from "@typeoff/db";
import { getDailySeed } from "@typeoff/shared";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const WORD_COUNT = 40;

function getTodayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Walk backwards through sorted dates to compute streak from today or yesterday */
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

  // Streak must start from today or yesterday
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

export async function GET() {
  const challengeDate = getTodayUTC();
  const seed = getDailySeed();

  // Check auth (optional — works logged out)
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const userId = session?.user?.id;

  let myResult = null;
  let myStreak = 0;

  if (userId) {
    const db = getDb();

    // Today's result
    const rows = await db
      .select()
      .from(dailyChallengeResults)
      .where(
        and(
          eq(dailyChallengeResults.userId, userId),
          eq(dailyChallengeResults.challengeDate, challengeDate),
        ),
      )
      .limit(1);
    myResult = rows[0] ?? null;

    // Compute streak
    const allDates = await db
      .select({ challengeDate: dailyChallengeResults.challengeDate })
      .from(dailyChallengeResults)
      .where(eq(dailyChallengeResults.userId, userId))
      .orderBy(desc(dailyChallengeResults.challengeDate));

    myStreak = computeStreak(allDates.map((r) => r.challengeDate));
  }

  return NextResponse.json({
    challengeDate,
    seed,
    wordCount: WORD_COUNT,
    myResult,
    myStreak,
  });
}

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { wpm, rawWpm, accuracy } = body as {
    wpm: number;
    rawWpm: number;
    accuracy: number;
  };

  if (typeof wpm !== "number" || typeof rawWpm !== "number" || typeof accuracy !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session.user.id;
  const challengeDate = getTodayUTC();
  const db = getDb();

  // Check existing
  const existing = await db
    .select()
    .from(dailyChallengeResults)
    .where(
      and(
        eq(dailyChallengeResults.userId, userId),
        eq(dailyChallengeResults.challengeDate, challengeDate),
      ),
    )
    .limit(1);

  let isNewBest = false;

  if (existing.length > 0 && wpm <= existing[0].wpm) {
    // Not a new best — return existing
    const allDates = await db
      .select({ challengeDate: dailyChallengeResults.challengeDate })
      .from(dailyChallengeResults)
      .where(eq(dailyChallengeResults.userId, userId))
      .orderBy(desc(dailyChallengeResults.challengeDate));
    const streak = computeStreak(allDates.map((r) => r.challengeDate));

    return NextResponse.json({
      result: existing[0],
      streak,
      isNewBest: false,
    });
  }

  // Compute streak (including today since we're about to upsert)
  const allDates = await db
    .select({ challengeDate: dailyChallengeResults.challengeDate })
    .from(dailyChallengeResults)
    .where(eq(dailyChallengeResults.userId, userId))
    .orderBy(desc(dailyChallengeResults.challengeDate));

  const dateList = allDates.map((r) => r.challengeDate);
  // If no existing row for today, add today to the front for streak calc
  if (!dateList.includes(challengeDate)) {
    dateList.unshift(challengeDate);
  }
  const streak = computeStreak(dateList);

  if (existing.length > 0) {
    // Update with better score
    isNewBest = true;
    await db
      .update(dailyChallengeResults)
      .set({
        wpm,
        rawWpm,
        accuracy,
        currentStreak: streak,
        completedAt: new Date(),
      })
      .where(eq(dailyChallengeResults.id, existing[0].id));
  } else {
    // Insert new
    isNewBest = true;
    await db.insert(dailyChallengeResults).values({
      userId,
      challengeDate,
      wpm,
      rawWpm,
      accuracy,
      currentStreak: streak,
    });
  }

  // Re-fetch the result
  const [result] = await db
    .select()
    .from(dailyChallengeResults)
    .where(
      and(
        eq(dailyChallengeResults.userId, userId),
        eq(dailyChallengeResults.challengeDate, challengeDate),
      ),
    )
    .limit(1);

  return NextResponse.json({ result, streak, isNewBest });
}
