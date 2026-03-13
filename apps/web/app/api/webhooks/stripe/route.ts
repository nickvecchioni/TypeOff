import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userCosmetics, userSubscription, userActiveCosmetics, userStats } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
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
    // ── Checkout completed (one-time payment or legacy subscription) ──
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

      // Handle legacy subscription checkout (for existing subscribers)
      if (session.mode === "subscription") {
        const userId = session.metadata?.userId;
        if (!userId) break;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!customerId) break;

        let stripePriceId: string | undefined;
        let currentPeriodEnd: Date | undefined;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          stripePriceId = sub.items.data[0]?.price.id;
          const itemPeriodEnd = (sub.items.data[0] as any)?.current_period_end;
          if (itemPeriodEnd) {
            currentPeriodEnd = new Date(itemPeriodEnd * 1000);
          }
        }

        await db
          .insert(userSubscription)
          .values({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? null,
            stripePriceId: stripePriceId ?? null,
            status: "active",
            currentPeriodEnd: currentPeriodEnd ?? null,
            cancelAtPeriodEnd: false,
          })
          .onConflictDoUpdate({
            target: userSubscription.userId,
            set: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId ?? null,
              stripePriceId: stripePriceId ?? null,
              status: "active",
              currentPeriodEnd: currentPeriodEnd ?? null,
              cancelAtPeriodEnd: false,
              updatedAt: new Date(),
            },
          });

        // Grant Pro badge + retroactive cosmetics (same as payment flow)
        await db.insert(userCosmetics).values({ userId, cosmeticId: PRO_BADGE_ID, seasonId: "pro" }).onConflictDoNothing();
        await db.insert(userActiveCosmetics).values({ userId, activeBadge: PRO_BADGE_ID }).onConflictDoUpdate({ target: userActiveCosmetics.userId, set: { activeBadge: PRO_BADGE_ID } });

        const [[statsRow2], existingCosmetics2] = await Promise.all([
          db.select({ totalXp: userStats.totalXp }).from(userStats).where(eq(userStats.userId, userId)).limit(1),
          db.select({ cosmeticId: userCosmetics.cosmeticId }).from(userCosmetics).where(eq(userCosmetics.userId, userId)),
        ]);
        const missed2 = getMissedProRewards(statsRow2?.totalXp ?? 0, new Set(existingCosmetics2.map((c) => c.cosmeticId)));
        for (const reward of missed2) {
          await db.insert(userCosmetics).values({ userId, cosmeticId: reward.id, seasonId: "xp" }).onConflictDoNothing();
        }

        break;
      }

      break;
    }

    // ── Subscription updated (plan change, cancel schedule, renewal) ──
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const itemPeriodEnd = (subscription.items.data[0] as any)?.current_period_end;

      await db
        .update(userSubscription)
        .set({
          status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
          currentPeriodEnd: itemPeriodEnd ? new Date(itemPeriodEnd * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          stripePriceId: subscription.items.data[0]?.price.id ?? null,
          stripeSubscriptionId: subscription.id,
          updatedAt: new Date(),
        })
        .where(eq(userSubscription.stripeCustomerId, customerId));
      break;
    }

    // ── Subscription deleted (final cancellation) ──
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      // Find user by customer ID
      const [sub] = await db
        .select({ userId: userSubscription.userId, status: userSubscription.status })
        .from(userSubscription)
        .where(eq(userSubscription.stripeCustomerId, customerId))
        .limit(1);

      // Never downgrade a lifetime subscriber
      if (sub?.status === "lifetime") break;

      if (sub) {
        await db
          .update(userSubscription)
          .set({
            status: "inactive",
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(userSubscription.userId, sub.userId));

        // Revoke Pro badge
        await db
          .delete(userCosmetics)
          .where(
            and(
              eq(userCosmetics.userId, sub.userId),
              eq(userCosmetics.cosmeticId, PRO_BADGE_ID),
            ),
          );

        // Unequip Pro badge if active
        await db
          .update(userActiveCosmetics)
          .set({ activeBadge: null })
          .where(
            and(
              eq(userActiveCosmetics.userId, sub.userId),
              eq(userActiveCosmetics.activeBadge, PRO_BADGE_ID),
            ),
          );
      }
      break;
    }

    // ── Invoice paid (successful renewal) ──
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      if (customerId) {
        // Look up the subscription from our DB
        const [sub] = await db
          .select({ stripeSubscriptionId: userSubscription.stripeSubscriptionId })
          .from(userSubscription)
          .where(eq(userSubscription.stripeCustomerId, customerId as string))
          .limit(1);

        let periodEnd: Date | null = null;
        if (sub?.stripeSubscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
          const itemPeriodEnd = (stripeSub.items.data[0] as any)?.current_period_end;
          if (itemPeriodEnd) periodEnd = new Date(itemPeriodEnd * 1000);
        }

        await db
          .update(userSubscription)
          .set({
            status: "active",
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            updatedAt: new Date(),
          })
          .where(eq(userSubscription.stripeCustomerId, customerId as string));
      }
      break;
    }

    // ── Invoice payment failed ──
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      if (customerId) {
        await db
          .update(userSubscription)
          .set({
            status: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(userSubscription.stripeCustomerId, customerId as string));
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
