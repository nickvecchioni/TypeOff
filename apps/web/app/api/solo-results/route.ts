import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults, userKeyAccuracy, userBigramAccuracy, userAccuracySnapshots, textLeaderboards, userStats } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { KeyStatsMap } from "@typeoff/shared";
import { scoreTextDifficulty, calculatePP, calculateTotalPP, getQuoteWords, getCodeSnippet, tokenizeCode } from "@typeoff/shared";
import { createRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const postLimit = createRateLimit({ windowMs: 5_000, max: 1 });

export async function GET() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ pbs: {} });
    }

    const db = getDb();

    // Get best WPM for each (mode, duration, wordPool, seed) combo
    // For quotes/code, seed distinguishes individual texts; for others seed is null
    const rows = await db
      .select({
        mode: soloResults.mode,
        duration: soloResults.duration,
        wordPool: soloResults.wordPool,
        seed: soloResults.seed,
        bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
      })
      .from(soloResults)
      .where(eq(soloResults.userId, session.user.id))
      .groupBy(soloResults.mode, soloResults.duration, soloResults.wordPool, soloResults.seed);

    // Shape as { "timed:15:words:easy:false": 120.5, "timed:60:quotes:easy:false:42": 95.3, ... }
    const pbs: Record<string, number> = {};
    for (const row of rows) {
      // Old records with wordPool = null map to "words:easy:false"
      const pool = row.wordPool ?? "words:easy:false";
      const base = `${row.mode}:${row.duration}:${pool}`;
      const isPerText = pool.startsWith("quotes:") || pool.startsWith("code:");
      const key = isPerText && row.seed != null ? `${base}:${row.seed}` : base;

      // Keep the highest WPM for each key (multiple seeds may map to same base key for non-text modes)
      const wpm = Number(row.bestWpm);
      if (!pbs[key] || wpm > pbs[key]) {
        pbs[key] = wpm;
      }
    }

    return NextResponse.json({ pbs });
  } catch (err) {
    console.error("[solo-results] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { limited, retryAfter } = postLimit.check(session.user.id);
    if (limited) {
      return NextResponse.json({ error: "Too many requests", retryAfter }, { status: 429 });
    }

    const body = await request.json();
  const {
    mode, duration, wpm, rawWpm, accuracy,
    correctChars, incorrectChars, extraChars, totalChars, time,
    contentType, difficulty, punctuation,
    consistency, keyStats, bigramStats, replayData, seed,
  } = body;

  // Validate required fields
  if (
    (mode !== "timed" && mode !== "wordcount") ||
    typeof duration !== "number" || duration < 0 ||
    typeof wpm !== "number" || wpm < 0 || wpm > 500 ||
    typeof rawWpm !== "number" || rawWpm < 0 || rawWpm > 500 ||
    typeof accuracy !== "number" || accuracy < 0 || accuracy > 100 ||
    typeof correctChars !== "number" ||
    typeof incorrectChars !== "number" ||
    typeof extraChars !== "number" ||
    typeof totalChars !== "number" ||
    typeof time !== "number" || time < 0.5
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Cross-validate WPM against correctChars and time
  const expectedWpm = (correctChars / 5) / (time / 60);
  if (Math.abs(wpm - expectedWpm) > expectedWpm * 0.15) {
    return NextResponse.json({ error: "WPM mismatch" }, { status: 400 });
  }

  const db = getDb();
  const userId = session.user.id;

  // Quotes and code ignore difficulty/punctuation/mode/duration — normalize to canonical values
  const isFixedText = contentType === "quotes" || contentType === "code";
  const normMode = isFixedText ? "wordcount" : mode;
  const normDuration = isFixedText ? 0 : duration;
  const normDifficulty = isFixedText ? "easy" : (difficulty ?? "easy");
  const normPunctuation = isFixedText ? false : (punctuation ?? false);

  // Build wordPool key from content config
  const wordPool = `${contentType ?? "words"}:${normDifficulty}:${normPunctuation}`;

  // For quotes and code, track PBs per individual text (by seed)
  const isPerText = isFixedText && typeof seed === "number";

  // PB detection: best WPM for this config tuple (per-text for quotes/code)
  const conditions = [
    eq(soloResults.userId, userId),
    eq(soloResults.mode, normMode),
    eq(soloResults.duration, normDuration),
    eq(soloResults.wordPool, wordPool),
  ];
  if (isPerText) {
    conditions.push(eq(soloResults.seed, seed));
  }

  const [bestResult] = await db
    .select({ wpm: soloResults.wpm })
    .from(soloResults)
    .where(and(...conditions))
    .orderBy(desc(soloResults.wpm))
    .limit(1);

  // Block PBs for custom and practice content types
  const isPbEligible = contentType !== "custom" && contentType !== "practice";
  const isPb = isPbEligible ? (!bestResult || wpm > bestResult.wpm) : false;

  // Clear old PB flags before inserting the new one
  if (isPb) {
    await db
      .update(soloResults)
      .set({ isPb: false })
      .where(and(...conditions, eq(soloResults.isPb, true)));
  }

  await db.insert(soloResults).values({
    userId,
    mode: normMode,
    duration: normDuration,
    wordPool,
    wpm,
    rawWpm,
    accuracy,
    correctChars,
    incorrectChars,
    extraChars,
    totalChars,
    time,
    isPb,
    consistency: typeof consistency === "number" ? consistency : null,
    keyStatsJson: keyStats ? JSON.stringify(keyStats) : null,
    replayData: replayData ? JSON.stringify(replayData) : null,
    seed: typeof seed === "number" ? seed : null,
  });

  // Upsert text leaderboard for quotes and code (per-text PBs with PP)
  if (isPerText && isPbEligible && wpm > 0) {
    const textHash = `${seed}:solo`;
    // Reconstruct the words to score difficulty
    const textWords = contentType === "quotes"
      ? getQuoteWords(seed)
      : tokenizeCode(getCodeSnippet(seed).code);
    const difficulty = scoreTextDifficulty(textWords);
    const pp = calculatePP(wpm, accuracy, difficulty.score);

    await db
      .insert(textLeaderboards)
      .values({
        textHash,
        seed,
        mode: "solo",
        userId,
        bestWpm: wpm,
        bestAccuracy: accuracy,
        pp,
        textDifficulty: difficulty.score,
      })
      .onConflictDoUpdate({
        target: [textLeaderboards.textHash, textLeaderboards.userId],
        set: {
          bestWpm: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_wpm ELSE ${textLeaderboards.bestWpm} END`,
          bestAccuracy: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_accuracy ELSE ${textLeaderboards.bestAccuracy} END`,
          pp: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.pp ELSE ${textLeaderboards.pp} END`,
          updatedAt: new Date(),
        },
      });

    // Recalculate user's total PP (weighted sum of top 50)
    const topScores = await db
      .select({ pp: textLeaderboards.pp })
      .from(textLeaderboards)
      .where(eq(textLeaderboards.userId, userId))
      .orderBy(desc(textLeaderboards.pp))
      .limit(50);

    const totalPp = calculateTotalPP(topScores.map((s) => s.pp));
    await db
      .update(userStats)
      .set({ totalPp })
      .where(eq(userStats.userId, userId));
  }

  // Upsert per-key accuracy (skip custom — arbitrary text)
  if (keyStats && contentType !== "custom" && typeof keyStats === "object") {
    const entries = Object.entries(keyStats as KeyStatsMap)
      .filter(([key]) => key.length === 1)
      .slice(0, 52); // cap at a-z + A-Z to prevent abuse

    if (entries.length > 0) {
      const now = new Date();
      const values = entries.map(([key, stat]) => ({
        userId,
        key,
        correctCount: stat.correct,
        totalCount: stat.total,
        updatedAt: now,
      }));
      for (const val of values) {
        await db
          .insert(userKeyAccuracy)
          .values(val)
          .onConflictDoUpdate({
            target: [userKeyAccuracy.userId, userKeyAccuracy.key],
            set: {
              correctCount: sql`${userKeyAccuracy.correctCount} + ${val.correctCount}`,
              totalCount: sql`${userKeyAccuracy.totalCount} + ${val.totalCount}`,
              updatedAt: now,
            },
          });
      }
    }
  }

  // Upsert per-bigram accuracy (skip custom — arbitrary text)
  if (bigramStats && contentType !== "custom" && typeof bigramStats === "object") {
    const bgEntries = Object.entries(bigramStats as Record<string, { correct: number; total: number }>)
      .filter(([bg]) => bg.length === 2)
      .slice(0, 200); // cap to prevent abuse

    if (bgEntries.length > 0) {
      const now = new Date();
      for (const [bigram, stat] of bgEntries) {
        await db
          .insert(userBigramAccuracy)
          .values({
            userId,
            bigram,
            correctCount: stat.correct,
            totalCount: stat.total,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [userBigramAccuracy.userId, userBigramAccuracy.bigram],
            set: {
              correctCount: sql`${userBigramAccuracy.correctCount} + ${stat.correct}`,
              totalCount: sql`${userBigramAccuracy.totalCount} + ${stat.total}`,
              updatedAt: now,
            },
          });
      }
    }
  }

  // Record accuracy snapshots for practice sessions (progress tracking)
  if (contentType === "practice") {
    const snapshots: Array<{ userId: string; snapshotType: string; target: string; accuracy: number; totalCount: number }> = [];

    // Read back updated cumulative accuracy for targeted keys
    if (keyStats && typeof keyStats === "object") {
      const keyEntries = Object.entries(keyStats as KeyStatsMap).filter(([k]) => k.length === 1).slice(0, 26);
      for (const [key] of keyEntries) {
        const [row] = await db
          .select({ correctCount: userKeyAccuracy.correctCount, totalCount: userKeyAccuracy.totalCount })
          .from(userKeyAccuracy)
          .where(and(eq(userKeyAccuracy.userId, userId), eq(userKeyAccuracy.key, key)))
          .limit(1);
        if (row && row.totalCount > 0) {
          snapshots.push({
            userId,
            snapshotType: "key",
            target: key,
            accuracy: row.correctCount / row.totalCount,
            totalCount: row.totalCount,
          });
        }
      }
    }

    // Read back updated cumulative accuracy for targeted bigrams
    if (bigramStats && typeof bigramStats === "object") {
      const bgEntries = Object.entries(bigramStats as Record<string, { correct: number; total: number }>)
        .filter(([bg]) => bg.length === 2)
        .slice(0, 50);
      for (const [bigram] of bgEntries) {
        const [row] = await db
          .select({ correctCount: userBigramAccuracy.correctCount, totalCount: userBigramAccuracy.totalCount })
          .from(userBigramAccuracy)
          .where(and(eq(userBigramAccuracy.userId, userId), eq(userBigramAccuracy.bigram, bigram)))
          .limit(1);
        if (row && row.totalCount > 0) {
          snapshots.push({
            userId,
            snapshotType: "bigram",
            target: bigram,
            accuracy: row.correctCount / row.totalCount,
            totalCount: row.totalCount,
          });
        }
      }
    }

    // Batch insert snapshots
    if (snapshots.length > 0) {
      await db.insert(userAccuracySnapshots).values(snapshots);
    }
  }

    return NextResponse.json({ isPb });
  } catch (err) {
    console.error("[solo-results] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
