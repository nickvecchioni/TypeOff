"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function CheckoutReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session ID");
      return;
    }

    fetch(`/api/type-pass/checkout/status?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStatus(data.status);
          setCustomerEmail(data.customerEmail);
        }
      })
      .catch(() => setError("Failed to check payment status"));
  }, [sessionId]);

  // Redirect to TypePass after successful payment
  useEffect(() => {
    if (status === "complete") {
      const t = setTimeout(() => router.push("/type-pass"), 3000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4 animate-fade-in">
        {!status && !error && (
          <div className="space-y-3">
            <div className="w-8 h-8 mx-auto rounded-full bg-surface/40 animate-pulse" />
            <p className="text-sm text-muted/50">Confirming payment...</p>
          </div>
        )}

        {status === "complete" && (
          <>
            <div className="w-10 h-10 mx-auto rounded-full bg-correct/10 flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-correct"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-text">
                TypePass Premium activated!
              </p>
              {customerEmail && (
                <p className="text-xs text-muted/50 mt-1">
                  Confirmation sent to {customerEmail}
                </p>
              )}
            </div>
            <p className="text-[11px] text-muted/40">
              Redirecting to TypePass...
            </p>
          </>
        )}

        {status === "open" && (
          <div className="space-y-3">
            <p className="text-sm text-muted/70">
              Payment was not completed.
            </p>
            <a
              href="/type-pass/checkout"
              className="inline-block text-xs text-accent hover:underline"
            >
              Try again
            </a>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-error">{error}</p>
            <a
              href="/type-pass"
              className="inline-block text-xs text-accent hover:underline"
            >
              Back to TypePass
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
