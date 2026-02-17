"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLobby } from "@/hooks/useLobby";
import { RaceTrack } from "@/components/race/RaceTrack";
import { RaceTypingArea } from "@/components/race/RaceTypingArea";
import { RaceResults } from "@/components/race/RaceResults";
import { CountdownOverlay } from "@/components/race/CountdownOverlay";
import { LobbyChat } from "@/components/race/LobbyChat";

export default function LobbyRoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const { data: session } = useSession();
  const lobby = useLobby();

  // Auto-join if not already in lobby
  useEffect(() => {
    if (lobby.phase === "idle" && code && lobby.connected) {
      lobby.joinLobby(code);
    }
  }, [code, lobby.phase, lobby.connected]);

  const myPlayerId = session?.user?.id ?? null;

  const isHost = lobby.lobby?.hostId === myPlayerId ||
    (lobby.lobby?.players.some((p) => p.id === session?.user?.id) && lobby.lobby?.hostId != null);

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
        {lobby.error && (
          <div className="text-error text-sm bg-error/10 rounded-lg px-4 py-2 ring-1 ring-error/20">
            {lobby.error}
          </div>
        )}

        {/* Waiting room */}
        {(lobby.phase === "waiting" || lobby.phase === "idle" || lobby.phase === "creating") && lobby.lobby && (
          <div className="w-full animate-fade-in space-y-8">

            {/* Lobby code hero */}
            <div className="relative rounded-xl bg-surface/60 ring-1 ring-white/[0.04] px-8 py-10 text-center overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-accent/30" />
              <p className="text-xs text-muted uppercase tracking-wider mb-3">
                Share this code to invite players
              </p>
              <div className="text-4xl font-black text-accent tracking-[0.3em] text-glow-accent">
                {lobby.lobby.code}
              </div>
            </div>

            {/* Players + Chat — side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Players panel */}
              <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                    Players
                    <span className="text-accent ml-2">{lobby.lobby.players.length}/4</span>
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {lobby.lobby.players.map((player) => {
                    const playerIsHost = player.id === lobby.lobby!.hostId ||
                      lobby.lobby!.players[0]?.id === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                          playerIsHost
                            ? "bg-accent/[0.06] ring-1 ring-accent/10"
                            : "bg-surface/60 ring-1 ring-white/[0.03]"
                        }`}
                      >
                        <span className="text-text font-medium">{player.name}</span>
                        {playerIsHost && (
                          <span className="text-[10px] text-accent font-bold uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full">
                            Host
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty player slots */}
                  {Array.from({ length: 4 - lobby.lobby.players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center rounded-lg px-4 py-3 ring-1 ring-white/[0.02] border border-dashed border-white/[0.04]"
                    >
                      <span className="text-muted/40 text-sm">Waiting for player...</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat panel */}
              <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden flex flex-col min-h-[280px]">
                <LobbyChat />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={lobby.startLobby}
                disabled={!lobby.lobby || lobby.lobby.players.length < 2}
                className="rounded-lg bg-accent/15 text-accent px-10 py-3 font-bold hover:bg-accent/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ring-1 ring-accent/20 disabled:ring-accent/5"
              >
                Start Race
              </button>
              <button
                onClick={lobby.leaveLobby}
                className="rounded-lg bg-surface/60 text-muted px-8 py-3 hover:text-error hover:bg-error/10 transition-colors ring-1 ring-white/[0.04] hover:ring-error/20"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {lobby.phase === "countdown" && lobby.raceState && (
          <CountdownOverlay
            countdown={lobby.countdown}
            playerCount={lobby.raceState.players.length}
          />
        )}

        {/* Racing */}
        {lobby.phase === "racing" && lobby.raceState && (
          <>
            <RaceTrack
              players={lobby.raceState.players}
              progress={lobby.progress}
              myPlayerId={myPlayerId}
            />
            <RaceTypingArea
              seed={lobby.raceState.seed}
              wordCount={lobby.raceState.wordCount}
              wordPool={lobby.raceState.wordPool}
              finishTimeoutEnd={lobby.finishTimeoutEnd}
              onProgress={lobby.sendProgress}
              onFinish={lobby.sendFinish}
              disabled={false}
            />
            <div className="w-full max-w-sm mt-4">
              <LobbyChat />
            </div>
          </>
        )}

        {/* Results */}
        {lobby.phase === "finished" && (
          <RaceResults
            results={lobby.results}
            myPlayerId={myPlayerId}
            onRaceAgain={() => {
              // The lobby update event will transition back to waiting
            }}
          />
        )}
      </div>
    </main>
  );
}
