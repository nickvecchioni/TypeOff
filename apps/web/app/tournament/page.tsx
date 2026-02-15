"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTournament } from "@/hooks/useTournament";

export default function TournamentListPage() {
  const router = useRouter();
  const t = useTournament();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);

  useEffect(() => {
    if (t.connected) t.listTournaments();
  }, [t.connected]);

  // Navigate to tournament page when joined/created
  useEffect(() => {
    if (t.tournament && (t.phase === "joined" || t.phase === "bracket")) {
      router.push(`/tournament/${t.tournament.id}`);
    }
  }, [t.tournament, t.phase, router]);

  const handleCreate = () => {
    if (!name.trim()) return;
    t.createTournament(name.trim(), maxPlayers);
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-2xl font-bold text-text">Tournaments</h1>

        {t.error && <div className="text-error text-sm">{t.error}</div>}

        {/* Create Tournament */}
        <div className="bg-surface rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-text">Create Tournament</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tournament name..."
              className="flex-1 bg-bg border border-surface rounded-lg px-4 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
              maxLength={50}
            />
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="bg-bg border border-surface rounded-lg px-3 py-2 text-text"
            >
              <option value={4}>4 players</option>
              <option value={8}>8 players</option>
              <option value={16}>16 players</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="rounded-lg bg-accent/20 text-accent px-6 py-2 font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>

        {/* Open Tournaments */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text">Open Tournaments</h2>
          {t.tournaments.length === 0 ? (
            <p className="text-muted text-sm">No open tournaments. Create one!</p>
          ) : (
            t.tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="flex items-center justify-between bg-surface rounded-lg px-4 py-3"
              >
                <div>
                  <div className="text-text font-bold">{tournament.name}</div>
                  <div className="text-xs text-muted">
                    {tournament.players.length}/{tournament.maxPlayers} players
                    {" · "}
                    {tournament.status}
                  </div>
                </div>
                {tournament.status === "open" && (
                  <button
                    onClick={() => t.joinTournament(tournament.id)}
                    className="rounded-lg bg-accent/20 text-accent px-4 py-2 text-sm font-bold hover:bg-accent/30 transition-colors"
                  >
                    Join
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
