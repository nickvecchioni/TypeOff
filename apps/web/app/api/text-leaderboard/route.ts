import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { textLeaderboards, users } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateWordsForMode, scoreTextDifficulty, calculatePP } from "@typeoff/shared";
import type { RaceMode } from "@typeoff/shared";
import { createRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const postLimit = createRateLimit({ windowMs: 5_000, max: 1 });

// GET — returns top entries for a specific text (seed + mode)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed");
  const mode = searchParams.get("mode");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  if (!seed || !mode) {
    return NextResponse.json({ error: "seed and mode required" }, { status: 400 });
  }

  const textHash = `${seed}:${mode}`;
  const db = getDb();

  const rows = await db
    .select({
      userId: textLeaderboards.userId,
      username: users.username,
      bestWpm: textLeaderboards.bestWpm,
      bestAccuracy: textLeaderboards.bestAccuracy,
      pp: textLeaderboards.pp,
      updatedAt: textLeaderboards.updatedAt,
    })
    .from(textLeaderboards)
    .innerJoin(users, eq(textLeaderboards.userId, users.id))
    .where(eq(textLeaderboards.textHash, textHash))
    .orderBy(desc(textLeaderboards.bestWpm))
    .limit(limit);

  return NextResponse.json({ entries: rows });
}

// POST — upsert user's best for a specific text
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited, retryAfter } = postLimit.check(session.user.id);
  if (limited) {
    return NextResponse.json({ error: "Too many requests", retryAfter }, { status: 429 });
  }

  const body = await req.json();
  const { seed, mode, wpm, accuracy, raceId } = body;

  if (!seed || !mode || wpm == null || accuracy == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Compute PP server-side from the deterministic word list
  const words = generateWordsForMode(mode as RaceMode, Number(seed));
  const difficulty = scoreTextDifficulty(words);
  const computedPP = calculatePP(wpm, accuracy, difficulty.score);

  const textHash = `${seed}:${mode}`;
  const db = getDb();

  // Upsert — only update if new WPM is higher
  await db
    .insert(textLeaderboards)
    .values({
      textHash,
      seed,
      mode,
      userId: session.user.id,
      bestWpm: wpm,
      bestAccuracy: accuracy,
      bestRaceId: raceId ?? null,
      pp: computedPP,
      textDifficulty: difficulty.score,
    })
    .onConflictDoUpdate({
      target: [textLeaderboards.textHash, textLeaderboards.userId],
      set: {
        bestWpm: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_wpm ELSE ${textLeaderboards.bestWpm} END`,
        bestAccuracy: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_accuracy ELSE ${textLeaderboards.bestAccuracy} END`,
        bestRaceId: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_race_id ELSE ${textLeaderboards.bestRaceId} END`,
        pp: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.pp ELSE ${textLeaderboards.pp} END`,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
