import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userReports } from "@typeoff/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { raceId, reportedUserId, reason } = body;

  if (!reportedUserId || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (reportedUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
  }

  const db = getDb();
  await db.insert(userReports).values({
    reporterId: session.user.id,
    reportedId: reportedUserId,
    reason,
    details: raceId ? `Race: ${raceId}` : null,
  });

  return NextResponse.json({ ok: true });
}
