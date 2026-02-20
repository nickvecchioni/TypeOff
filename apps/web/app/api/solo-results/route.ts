import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults, userKeyAccuracy, userBigramAccuracy } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { KeyStatsMap } from "@typeoff/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ pbs: {} });
  }

  const db = getDb();

  // Get best WPM for each (mode, duration, wordPool) combo
  const rows = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      wordPool: soloResults.wordPool,
      bestWpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
    })
    .from(soloResults)
    .where(eq(soloResults.userId, session.user.id))
    .groupBy(soloResults.mode, soloResults.duration, soloResults.wordPool);

  // Shape as { "timed:15:words:easy:false": 120.5, ... }
  const pbs: Record<string, number> = {};
  for (const row of rows) {
    // Old records with wordPool = null map to "words:easy:false"
    const pool = row.wordPool ?? "words:easy:false";
    pbs[`${row.mode}:${row.duration}:${pool}`] = row.bestWpm;
  }

  return NextResponse.json({ pbs });
}

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    typeof rawWpm !== "number" || rawWpm < 0 ||
    typeof accuracy !== "number" || accuracy < 0 || accuracy > 100 ||
    typeof correctChars !== "number" ||
    typeof incorrectChars !== "number" ||
    typeof extraChars !== "number" ||
    typeof totalChars !== "number" ||
    typeof time !== "number" || time < 1
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const db = getDb();
  const userId = session.user.id;

  // Build wordPool key from content config
  const wordPool = `${contentType ?? "words"}:${difficulty ?? "easy"}:${punctuation ?? false}`;

  // PB detection: best WPM for this (userId, mode, duration, wordPool) tuple
  const [bestResult] = await db
    .select({ wpm: soloResults.wpm })
    .from(soloResults)
    .where(
      and(
        eq(soloResults.userId, userId),
        eq(soloResults.mode, mode),
        eq(soloResults.duration, duration),
        eq(soloResults.wordPool, wordPool),
      )
    )
    .orderBy(desc(soloResults.wpm))
    .limit(1);

  // Block PBs for custom and practice content types
  const isPbEligible = contentType !== "custom" && contentType !== "practice";
  const isPb = isPbEligible ? (!bestResult || wpm > bestResult.wpm) : false;

  await db.insert(soloResults).values({
    userId,
    mode,
    duration,
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

  return NextResponse.json({ isPb });
}
