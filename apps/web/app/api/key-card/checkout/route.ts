import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userKeyCard } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { getCurrentSeason } from "@typeoff/shared";
import Stripe from "stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = getCurrentSeason();
  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 400 });
  }

  // Check if already premium
  const db = getDb();
  const [existing] = await db
    .select()
    .from(userKeyCard)
    .where(
      and(
        eq(userKeyCard.userId, session.user.id),
        eq(userKeyCard.seasonId, season.id),
      ),
    )
    .limit(1);

  if (existing?.isPremium) {
    return NextResponse.json(
      { error: "Already purchased" },
      { status: 409 },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const priceId = process.env.STRIPE_SEASON_1_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/key-card?purchased=true`,
    cancel_url: `${appUrl}/key-card`,
    metadata: {
      userId: session.user.id,
      seasonId: season.id,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
