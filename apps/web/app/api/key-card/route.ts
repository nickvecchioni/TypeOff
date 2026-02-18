import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userKeyCard, userCosmetics } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { getCurrentSeason, getUnlockedRewards } from "@typeoff/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const season = getCurrentSeason();
  if (!season) {
    return NextResponse.json({ season: null, userState: null, cosmetics: [] });
  }

  const session = await auth();

  let userState = null;
  let cosmetics: string[] = [];

  if (session?.user?.id) {
    const db = getDb();

    const [kpRow] = await db
      .select()
      .from(userKeyCard)
      .where(
        and(
          eq(userKeyCard.userId, session.user.id),
          eq(userKeyCard.seasonId, season.id),
        ),
      )
      .limit(1);

    if (kpRow) {
      userState = {
        seasonalXp: kpRow.seasonalXp,
        currentTier: kpRow.currentTier,
        isPremium: kpRow.isPremium,
      };
    }

    const cosmeticRows = await db
      .select({ cosmeticId: userCosmetics.cosmeticId })
      .from(userCosmetics)
      .where(eq(userCosmetics.userId, session.user.id));
    cosmetics = cosmeticRows.map((r) => r.cosmeticId);
  }

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      maxTier: season.maxTier,
      xpPerTier: season.xpPerTier,
      priceUsd: season.priceUsd,
      rewards: season.rewards,
    },
    userState,
    cosmetics,
  });
}
