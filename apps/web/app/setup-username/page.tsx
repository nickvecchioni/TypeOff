"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SetupUsernamePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // If user already has a username, redirect away (handles back-button)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.username) {
      router.replace("/");
    }
  }, [status, session?.user?.username, router]);

  const isValid =
    /^[a-z0-9-]+$/.test(username) &&
    username.length >= 3 &&
    username.length <= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to set username");
        setSaving(false);
        return;
      }

      setDone(true);
      // Claim guest placement before refreshing the session so the user
      // lands on the dashboard with placementsCompleted already true
      try {
        const stored = localStorage.getItem("guest-placement");
        if (stored) {
          const { wpm } = JSON.parse(stored);
          if (typeof wpm === "number") {
            const claimRes = await fetch("/api/claim-placement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wpm }),
            });
            if (claimRes.ok) localStorage.removeItem("guest-placement");
          }
        }
      } catch {}
      // Refresh session so the new username + placementsCompleted are available
      // client-side, then replace (not push) so back-button can't return here
      await update();
      router.replace("/");
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  // Hide UI while redirecting or after successful save
  if (done || (status === "authenticated" && session?.user?.username)) {
    return <main className="flex-1" />;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="animate-fade-in flex flex-col items-center w-full">
      <h1 className="text-3xl font-bold text-accent mb-2">Choose your username</h1>
      <p className="text-muted mb-8 text-center">
        This is how other players will see you. You can change it later.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              );
              setError(null);
            }}
            placeholder="your-username"
            maxLength={20}
            autoFocus
            className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/65"
          />
          <p className="text-xs text-muted mt-2">
            3-20 characters. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || saving}
          className="rounded-lg bg-accent/20 text-accent px-6 py-3 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </form>
      </div>
    </main>
  );
}
