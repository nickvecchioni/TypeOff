"use client";

import React, { useState } from "react";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  connected: boolean;
  onJoin: (guestName?: string) => void;
  onLeave: () => void;
  isAuthenticated: boolean;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  connected,
  onJoin,
  onLeave,
  isAuthenticated,
}: QueueScreenProps) {
  const [guestName, setGuestName] = useState("");

  const handleJoin = () => {
    onJoin(isAuthenticated ? undefined : guestName || undefined);
  };

  if (isQueuing) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="text-2xl text-accent tabular-nums">{queueCount}</div>
        <p className="text-muted text-sm">
          {queueCount === 1 ? "player" : "players"} in queue
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-muted text-sm">Waiting for opponents...</span>
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-muted hover:text-error transition-colors mt-4"
        >
          Leave queue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {!isAuthenticated && (
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm text-muted">Your name</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Guest"
            maxLength={20}
            className="bg-surface rounded-lg px-4 py-2 text-text text-center outline-none focus:ring-2 focus:ring-accent/50 w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
          />
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={!connected}
        className="rounded-lg bg-accent/20 text-accent px-8 py-3 text-lg font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connected ? "Find Race" : "Connecting..."}
      </button>
    </div>
  );
}
