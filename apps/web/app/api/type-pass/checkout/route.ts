import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userTypePass } from "@typeoff/db";
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
    .from(userTypePass)
    .where(
      and(
        eq(userTypePass.userId, session.user.id),
        eq(userTypePass.seasonId, season.id),
      ),
    )
    .limit(1);

  if (existing?.isPremium) {
    return NextResponse.json(
      { error: "Already purchased" },
      { status: 409 },
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_SEASON_1_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!stripeKey || !priceId) {
    const missing = [
      !stripeKey && "STRIPE_SECRET_KEY",
      !priceId && "STRIPE_SEASON_1_PRICE_ID",
    ].filter(Boolean).join(", ");
    console.error(`[checkout] Missing env vars: ${missing}`);
    return NextResponse.json(
      { error: `Server misconfigured — missing: ${missing}` },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeKey);
  const baseUrl = appUrl ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${baseUrl}/type-pass/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: session.user.id,
        seasonId: season.id,
      },
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
