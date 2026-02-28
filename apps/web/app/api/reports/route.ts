export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userReports } from "@typeoff/db";
import { eq, and, gt } from "drizzle-orm";

const VALID_REASONS = ["cheating", "harassment", "inappropriate_username"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { reportedId, reason, details } = body;

    if (!reportedId || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (reportedId === session.user.id) {
      return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
    }

    const db = getDb();

    // Prevent duplicate reports (same reporter + reported within 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: userReports.id })
      .from(userReports)
      .where(
        and(
          eq(userReports.reporterId, session.user.id),
          eq(userReports.reportedId, reportedId),
          gt(userReports.createdAt, oneDayAgo),
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Already reported" }, { status: 429 });
    }

    await db.insert(userReports).values({
      reporterId: session.user.id,
      reportedId,
      reason,
      details: details?.slice(0, 500) ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reports] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
