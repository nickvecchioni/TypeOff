import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults } from "@typeoff/db";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { mode, duration, wpm, rawWpm, accuracy, correctChars, incorrectChars, extraChars, totalChars, time } = body;

  // Validate required fields
  if (
    (mode !== "timed" && mode !== "wordcount") ||
    typeof duration !== "number" || duration < 1 ||
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

  // PB detection: best WPM for this (userId, mode, duration) triple
  const [bestResult] = await db
    .select({ wpm: soloResults.wpm })
    .from(soloResults)
    .where(
      and(
        eq(soloResults.userId, userId),
        eq(soloResults.mode, mode),
        eq(soloResults.duration, duration),
      )
    )
    .orderBy(desc(soloResults.wpm))
    .limit(1);

  const isPb = !bestResult || wpm > bestResult.wpm;

  await db.insert(soloResults).values({
    userId,
    mode,
    duration,
    wpm,
    rawWpm,
    accuracy,
    correctChars,
    incorrectChars,
    extraChars,
    totalChars,
    time,
    isPb,
  });

  return NextResponse.json({ isPb });
}
