import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userSubscription } from "@typeoff/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const db = getDb();
  const [sub] = await db
    .select({ stripeCustomerId: userSubscription.stripeCustomerId, status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  // Lifetime users (one-time purchase) have no subscription to manage
  if (sub.status === "lifetime") {
    return NextResponse.json(
      { lifetime: true, message: "Your Pro access is permanent — no subscription to manage." },
    );
  }

  const stripe = new Stripe(stripeKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/pro`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[pro/portal] Stripe error:", err);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
