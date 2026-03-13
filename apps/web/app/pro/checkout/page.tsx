"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { SignInPrompt } from "@/components/auth/SignInPrompt";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function ProCheckoutPage() {
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stripePromise) {
      setError("Payment system is not configured");
      setLoading(false);
      return;
    }
    stripePromise
      .then((stripe) => {
        if (!stripe) {
          setError("Failed to initialize payment system");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Failed to load payment system. Please try again");
        setLoading(false);
      });
  }, []);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/pro/checkout", { method: "POST" });
    const body = await res.json();
    if (!res.ok || !body.clientSecret) {
      const msg = body.error ?? "Failed to start checkout";
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }
    setLoading(false);
    return body.clientSecret as string;
  }, []);

  const options = useMemo(
    () => ({ fetchClientSecret }),
    [fetchClientSecret],
  );

  if (status === "unauthenticated") {
    return (
      <SignInPrompt
        title="Sign in to checkout"
        message="Sign in to your TypeOff account before upgrading to Pro."
      />
    );
  }

  if (status === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="h-8 w-32 rounded bg-surface/40 animate-pulse" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-error">{error}</p>
          <a href="/pro" className="text-xs text-accent hover:underline">
            Back to Pro
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center overflow-y-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="w-full max-w-[480px]">
        <div className="mb-6">
          <a
            href="/pro"
            className="text-xs text-muted/65 hover:text-text transition-colors"
          >
            &larr; Back to Pro
          </a>
        </div>
        <div id="checkout" className="rounded-xl overflow-hidden">
          {loading && (
            <div className="animate-pulse space-y-4 p-6 bg-surface rounded-xl">
              <div className="h-5 bg-muted/10 rounded w-1/4" />
              <div className="h-8 bg-muted/10 rounded w-1/3" />
              <div className="h-px bg-muted/10" />
              <div className="h-10 bg-muted/10 rounded" />
              <div className="h-10 bg-muted/10 rounded" />
              <div className="flex gap-3">
                <div className="h-10 bg-muted/10 rounded flex-1" />
                <div className="h-10 bg-muted/10 rounded flex-1" />
              </div>
              <div className="h-12 bg-accent/20 rounded" />
            </div>
          )}
          {stripePromise && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={options}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </main>
  );
}
