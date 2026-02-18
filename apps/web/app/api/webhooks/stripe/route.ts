import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userTypePass, userCosmetics } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { getCurrentSeason, getUnlockedRewards } from "@typeoff/shared";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const seasonId = session.metadata?.seasonId;

    if (!userId || !seasonId) {
      console.error("[stripe-webhook] missing metadata", session.metadata);
      return NextResponse.json({ received: true });
    }

    const db = getDb();
    const season = getCurrentSeason();

    // Mark user as premium
    const [existing] = await db
      .select()
      .from(userTypePass)
      .where(
        and(
          eq(userTypePass.userId, userId),
          eq(userTypePass.seasonId, seasonId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(userTypePass)
        .set({
          isPremium: true,
          stripePaymentId: session.payment_intent as string,
          purchasedAt: new Date(),
        })
        .where(
          and(
            eq(userTypePass.userId, userId),
            eq(userTypePass.seasonId, seasonId),
          ),
        );

      // Retroactively unlock premium rewards for already-earned tiers
      if (season) {
        const premiumRewards = getUnlockedRewards(
          season,
          existing.currentTier,
          true,
        ).filter((r) => r.premium);

        for (const reward of premiumRewards) {
          await db
            .insert(userCosmetics)
            .values({
              userId,
              cosmeticId: reward.id,
              seasonId,
            })
            .onConflictDoNothing();
        }
      }
    } else {
      // User hasn't played yet — create type pass row as premium
      await db.insert(userTypePass).values({
        userId,
        seasonId,
        seasonalXp: 0,
        currentTier: 0,
        isPremium: true,
        stripePaymentId: session.payment_intent as string,
        purchasedAt: new Date(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
