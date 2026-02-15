"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLobby } from "@/hooks/useLobby";

export default function LobbyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const lobby = useLobby();
  const [joinCode, setJoinCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const isAuthenticated = !!session?.user;

  const handleCreate = async () => {
    await lobby.createLobby(isAuthenticated ? undefined : guestName || undefined);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await lobby.joinLobby(
      joinCode.trim(),
      isAuthenticated ? undefined : guestName || undefined
    );
  };

  // If lobby is created/joined, redirect to lobby room
  React.useEffect(() => {
    if (lobby.lobby?.code) {
      router.push(`/lobby/${lobby.lobby.code}`);
    }
  }, [lobby.lobby?.code, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-text">Private Lobby</h1>
          <p className="text-sm text-muted text-center">
            Create a lobby and share the code with friends
          </p>
        </div>

        {!isAuthenticated && (
          <div className="flex flex-col items-center gap-2 w-full">
            <label className="text-sm text-muted">Your name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest"
              maxLength={20}
              className="bg-surface rounded-lg px-4 py-2 text-text text-center outline-none focus:ring-2 focus:ring-accent/50 w-full"
            />
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!lobby.connected}
          className="w-full rounded-lg bg-accent/20 text-accent px-6 py-3 font-bold hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          Create Lobby
        </button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-surface" />
          <span className="text-xs text-muted">or join</span>
          <div className="flex-1 h-px bg-surface" />
        </div>

        <div className="flex gap-2 w-full">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            className="flex-1 bg-surface rounded-lg px-4 py-2 text-text text-center outline-none focus:ring-2 focus:ring-accent/50 uppercase tracking-widest font-bold"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
          />
          <button
            onClick={handleJoin}
            disabled={!lobby.connected || !joinCode.trim()}
            className="rounded-lg bg-surface text-text px-6 py-2 font-bold hover:bg-surface/80 transition-colors disabled:opacity-50"
          >
            Join
          </button>
        </div>

        {lobby.error && (
          <div className="text-error text-sm">{lobby.error}</div>
        )}
      </div>
    </main>
  );
}
