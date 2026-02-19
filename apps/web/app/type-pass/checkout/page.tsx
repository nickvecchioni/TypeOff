"use client";

import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export default function CheckoutPage() {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/type-pass/checkout", { method: "POST" });
    const body = await res.json();
    if (!res.ok || !body.clientSecret) {
      const msg = body.error ?? "Failed to start checkout";
      setError(msg);
      throw new Error(msg);
    }
    return body.clientSecret as string;
  }, []);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-error">{error}</p>
          <a
            href="/type-pass"
            className="text-xs text-accent hover:underline"
          >
            Back to TypePass
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <a
            href="/type-pass"
            className="text-xs text-muted/50 hover:text-text transition-colors"
          >
            &larr; Back to TypePass
          </a>
        </div>
        <div id="checkout" className="rounded-xl overflow-hidden">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </main>
  );
}
