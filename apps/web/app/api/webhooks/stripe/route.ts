import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userCosmetics, userSubscription, userActiveCosmetics } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { PRO_BADGE_ID } from "@typeoff/shared";
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

  const db = getDb();

  switch (event.type) {
    // ── Legacy TypePass one-time purchase ──────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle subscription checkout
      if (session.mode === "subscription") {
        const userId = session.metadata?.userId;
        if (!userId) {
          console.error("[stripe-webhook] subscription checkout missing userId metadata");
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!customerId) break;

        // Fetch subscription details for price info
        let stripePriceId: string | undefined;
        let currentPeriodEnd: Date | undefined;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          stripePriceId = sub.items.data[0]?.price.id;
          // In Stripe v20+, current_period_end moved to item level
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

        // Grant Pro badge cosmetic
        await db
          .insert(userCosmetics)
          .values({
            userId,
            cosmeticId: PRO_BADGE_ID,
            seasonId: "pro",
          })
          .onConflictDoNothing();

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
        .select({ userId: userSubscription.userId })
        .from(userSubscription)
        .where(eq(userSubscription.stripeCustomerId, customerId))
        .limit(1);

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
}
