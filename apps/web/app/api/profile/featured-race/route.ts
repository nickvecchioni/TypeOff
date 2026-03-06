import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users, raceParticipants, userSubscription } from "@typeoff/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pro check
  const db = getDb();
  const [sub] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);

  if (sub?.status !== "active" && sub?.status !== "lifetime") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const { raceId } = await req.json();

  // Allow clearing featured race
  if (raceId === null) {
    await db
      .update(users)
      .set({ featuredRaceId: null })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ featuredRaceId: null });
  }

  if (typeof raceId !== "string") {
    return NextResponse.json({ error: "Invalid raceId" }, { status: 400 });
  }

  // Verify the user participated in this race
  const [participation] = await db
    .select({ id: raceParticipants.id })
    .from(raceParticipants)
    .where(
      and(
        eq(raceParticipants.raceId, raceId),
        eq(raceParticipants.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!participation) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  await db
    .update(users)
    .set({ featuredRaceId: raceId })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ featuredRaceId: raceId });
}
