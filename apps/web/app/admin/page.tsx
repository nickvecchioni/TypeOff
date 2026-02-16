"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";

interface TestAccount {
  id: string;
  username: string | null;
  eloRating: number;
  rankTier: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");

  const fetchAccounts = useCallback(async () => {
    const res = await fetch(
      `/api/admin/test-accounts?adminSecret=${encodeURIComponent(secret)}`
    );
    if (!res.ok) {
      setError("Failed to fetch accounts");
      return;
    }
    setAccounts(await res.json());
  }, [secret]);

  const handleAuth = async () => {
    setError("");
    const res = await fetch(
      `/api/admin/test-accounts?adminSecret=${encodeURIComponent(secret)}`
    );
    if (!res.ok) {
      setError("Invalid admin secret");
      return;
    }
    setAuthenticated(true);
    setAccounts(await res.json());
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/test-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminSecret: secret,
        username: newUsername || undefined,
      }),
    });
    if (!res.ok) {
      setError("Failed to create account");
      setLoading(false);
      return;
    }
    setNewUsername("");
    await fetchAccounts();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setError("");
    const res = await fetch("/api/admin/test-accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret: secret, id }),
    });
    if (!res.ok) {
      setError("Failed to delete account");
      return;
    }
    await fetchAccounts();
  };

  const handleDeleteByUsername = async () => {
    const username = deleteUsername.trim();
    if (!username) return;
    setError("");
    const res = await fetch("/api/admin/test-accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret: secret, username }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to delete account");
      return;
    }
    setDeleteUsername("");
    await fetchAccounts();
  };

  const handleSignIn = async (userId: string) => {
    const result = await signIn("credentials", {
      userId,
      adminSecret: secret,
      redirect: false,
    });
    if (result?.error) {
      setError("Sign-in failed: " + result.error);
      return;
    }
    window.location.href = "/";
  };

  if (!authenticated) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-accent mb-6">Admin</h1>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            className="rounded-lg bg-surface px-4 py-3 text-text outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleAuth}
            className="rounded-lg bg-accent/20 px-4 py-3 text-accent hover:bg-accent/30 transition-colors"
          >
            Authenticate
          </button>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 overflow-y-auto">
      <h1 className="text-2xl font-bold text-accent mb-8">
        Test Accounts
      </h1>

      {/* Create section */}
      <div className="flex gap-2 w-full max-w-lg mb-8">
        <input
          type="text"
          placeholder="Username (optional)"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="flex-1 rounded-lg bg-surface px-4 py-2.5 text-text outline-none focus:ring-1 focus:ring-accent text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-lg bg-accent/20 px-4 py-2.5 text-accent hover:bg-accent/30 transition-colors text-sm disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {/* Delete by username */}
      <div className="flex gap-2 w-full max-w-lg mb-8">
        <input
          type="text"
          placeholder="Delete by username"
          value={deleteUsername}
          onChange={(e) => setDeleteUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDeleteByUsername()}
          className="flex-1 rounded-lg bg-surface px-4 py-2.5 text-text outline-none focus:ring-1 focus:ring-error/50 text-sm"
        />
        <button
          onClick={handleDeleteByUsername}
          className="rounded-lg bg-error/20 px-4 py-2.5 text-error hover:bg-error/30 transition-colors text-sm"
        >
          Delete
        </button>
      </div>

      {error && <p className="text-error text-sm mb-4">{error}</p>}

      {/* Accounts table */}
      <div className="w-full max-w-lg">
        {accounts.length === 0 ? (
          <p className="text-muted text-sm text-center">
            No test accounts yet
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-surface">
                <th className="pb-2">Username</th>
                <th className="pb-2">ELO</th>
                <th className="pb-2">Rank</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className="border-b border-surface/50">
                  <td className="py-2.5 text-text">
                    {acc.username ?? "—"}
                  </td>
                  <td className="py-2.5 tabular-nums">{acc.eloRating}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-rank-${acc.rankTier} capitalize`}
                    >
                      {acc.rankTier}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleSignIn(acc.id)}
                      className="text-accent hover:text-accent/80 mr-3 transition-colors"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="text-error hover:text-error/80 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
