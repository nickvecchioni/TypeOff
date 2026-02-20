import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userSubscription } from "@typeoff/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = req.nextUrl.searchParams.get("plan") ?? "monthly";
  const priceId =
    plan === "yearly"
      ? process.env.STRIPE_PRO_YEARLY_PRICE_ID
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!stripeKey || !priceId) {
    const missing = [
      !stripeKey && "STRIPE_SECRET_KEY",
      !priceId && (plan === "yearly" ? "STRIPE_PRO_YEARLY_PRICE_ID" : "STRIPE_PRO_MONTHLY_PRICE_ID"),
    ].filter(Boolean).join(", ");
    console.error(`[pro/checkout] Missing env vars: ${missing}`);
    return NextResponse.json(
      { error: `Server misconfigured — missing: ${missing}` },
      { status: 500 },
    );
  }

  const db = getDb();
  const stripe = new Stripe(stripeKey);

  // Check existing subscription
  const [existing] = await db
    .select()
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);

  if (existing?.status === "active") {
    return NextResponse.json(
      { error: "Already subscribed" },
      { status: 409 },
    );
  }

  // Get or create Stripe Customer
  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;

    // Upsert the subscription row with the customer ID
    await db
      .insert(userSubscription)
      .values({
        userId: session.user.id,
        stripeCustomerId: customerId,
        status: "inactive",
      })
      .onConflictDoUpdate({
        target: userSubscription.userId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${appUrl}/pro/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId: session.user.id },
      branding_settings: {
        background_color: "#16161e",
        button_color: "#4d9eff",
        font_family: "inconsolata",
        border_style: "rounded",
        display_name: "TypeOff",
      },
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[pro/checkout] Stripe error:", err);
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
