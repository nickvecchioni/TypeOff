import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { challenges, challengeProgress } from "@typeoff/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { DAILY_TEMPLATES, WEEKLY_TEMPLATES } from "@typeoff/shared";
import { auth } from "@/lib/auth";

function getDayBoundaries() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function getWeekBoundaries() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function deterministicIndex(seed: number, length: number): number {
  // Simple hash for deterministic selection
  let h = seed;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h) % length;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const db = getDb();
  const now = new Date();

  const day = getDayBoundaries();
  const week = getWeekBoundaries();

  // Check if daily challenges exist for today
  let dailyChallenges = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.type, "daily"),
        lte(challenges.startedAt, now),
        gte(challenges.endedAt, now)
      )
    );

  // Auto-create daily challenge if none exists
  if (dailyChallenges.length === 0) {
    const daySeed = Math.floor(day.start.getTime() / 86400000);
    const templateIdx = deterministicIndex(daySeed, DAILY_TEMPLATES.length);
    const template = DAILY_TEMPLATES[templateIdx];

    const inserted = await db
      .insert(challenges)
      .values({
        type: "daily",
        title: template.title,
        description: template.description,
        metric: template.metric,
        target: template.target,
        startedAt: day.start,
        endedAt: day.end,
      })
      .returning();
    dailyChallenges = inserted;
  }

  // Check if weekly challenges exist
  let weeklyChallenges = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.type, "weekly"),
        lte(challenges.startedAt, now),
        gte(challenges.endedAt, now)
      )
    );

  // Auto-create weekly challenge if none exists
  if (weeklyChallenges.length === 0) {
    const weekSeed = Math.floor(week.start.getTime() / 604800000);
    const templateIdx = deterministicIndex(weekSeed, WEEKLY_TEMPLATES.length);
    const template = WEEKLY_TEMPLATES[templateIdx];

    const inserted = await db
      .insert(challenges)
      .values({
        type: "weekly",
        title: template.title,
        description: template.description,
        metric: template.metric,
        target: template.target,
        startedAt: week.start,
        endedAt: week.end,
      })
      .returning();
    weeklyChallenges = inserted;
  }

  const allChallenges = [...dailyChallenges, ...weeklyChallenges];

  // Load user progress if authenticated
  let progressMap = new Map<string, { currentValue: number; completed: boolean }>();
  if (userId) {
    const challengeIds = allChallenges.map((c) => c.id);
    if (challengeIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const progressRows = await db
        .select()
        .from(challengeProgress)
        .where(
          and(
            eq(challengeProgress.userId, userId),
            inArray(challengeProgress.challengeId, challengeIds)
          )
        );
      for (const row of progressRows) {
        progressMap.set(row.challengeId, {
          currentValue: row.currentValue,
          completed: row.completed,
        });
      }
    }
  }

  const result = allChallenges.map((c) => {
    const progress = progressMap.get(c.id);
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      description: c.description,
      metric: c.metric,
      target: c.target,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      currentValue: progress?.currentValue ?? 0,
      completed: progress?.completed ?? false,
    };
  });

  return NextResponse.json(result);
}
