"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function SetupUsernamePage() {
  const { update } = useSession();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

      // Force JWT refresh so session picks up the new username
      await update();
      window.location.href = "/";
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
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
            className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/50"
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
    </main>
  );
}
