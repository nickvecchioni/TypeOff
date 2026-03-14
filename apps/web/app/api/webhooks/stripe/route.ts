import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userCosmetics, userSubscription, userActiveCosmetics, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { PRO_BADGE_ID, getMissedProRewards } from "@typeoff/shared";
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

  try {
  const db = getDb();

  switch (event.type) {
    // ── Checkout completed (one-time payment) ──
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle one-time payment checkout (new model)
      if (session.mode === "payment") {
        const userId = session.metadata?.userId;
        if (!userId) {
          console.error("[stripe-webhook] payment checkout missing userId metadata");
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!customerId) break;

        await db
          .insert(userSubscription)
          .values({
            userId,
            stripeCustomerId: customerId,
            status: "lifetime",
          })
          .onConflictDoUpdate({
            target: userSubscription.userId,
            set: {
              stripeCustomerId: customerId,
              status: "lifetime",
              updatedAt: new Date(),
            },
          });

        // Grant Pro badge cosmetic
        await db
          .insert(userCosmetics)
          .values({
            userId,
            cosmeticId: PRO_BADGE_ID,
            seasonId: "pro",
          })
          .onConflictDoNothing();

        // Auto-equip Pro badge
        await db
          .insert(userActiveCosmetics)
          .values({ userId, activeBadge: PRO_BADGE_ID })
          .onConflictDoUpdate({
            target: userActiveCosmetics.userId,
            set: { activeBadge: PRO_BADGE_ID },
          });

        // Retroactively unlock Pro XP cosmetics the user already passed
        const [[statsRow], existingCosmetics] = await Promise.all([
          db
            .select({ totalXp: userStats.totalXp })
            .from(userStats)
            .where(eq(userStats.userId, userId))
            .limit(1),
          db
            .select({ cosmeticId: userCosmetics.cosmeticId })
            .from(userCosmetics)
            .where(eq(userCosmetics.userId, userId)),
        ]);
        const totalXp = statsRow?.totalXp ?? 0;
        const ownedSet = new Set(existingCosmetics.map((c) => c.cosmeticId));
        const missed = getMissedProRewards(totalXp, ownedSet);
        for (const reward of missed) {
          await db
            .insert(userCosmetics)
            .values({ userId, cosmeticId: reward.id, seasonId: "xp" })
            .onConflictDoNothing();
        }

        break;
      }

      break;
    }
  }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
