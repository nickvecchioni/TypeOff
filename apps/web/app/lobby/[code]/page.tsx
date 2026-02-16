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
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
      <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
        {lobby.error && (
          <div className="text-error text-sm">{lobby.error}</div>
        )}

        {/* Waiting room */}
        {(lobby.phase === "waiting" || lobby.phase === "idle" || lobby.phase === "creating") && lobby.lobby && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold text-text">Lobby</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted uppercase tracking-wider">Code:</span>
                <span className="text-2xl font-bold text-accent tracking-widest">
                  {lobby.lobby.code}
                </span>
              </div>
              <p className="text-xs text-muted">
                Share this code with friends to join
              </p>
            </div>

            <div className="w-full max-w-sm">
              <h3 className="text-sm text-muted mb-2">
                Players ({lobby.lobby.players.length}/4)
              </h3>
              <div className="flex flex-col gap-2">
                {lobby.lobby.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-surface rounded-lg px-4 py-2"
                  >
                    <span className="text-text">{player.name}</span>
                    {player.id === lobby.lobby!.hostId ||
                    (lobby.lobby!.players[0]?.id === player.id) ? (
                      <span className="text-xs text-accent font-bold">Host</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full max-w-sm">
              <LobbyChat />
            </div>

            <div className="flex gap-3">
              <button
                onClick={lobby.startLobby}
                disabled={!lobby.lobby || lobby.lobby.players.length < 2}
                className="rounded-lg bg-accent/20 text-accent px-8 py-3 font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Race
              </button>
              <button
                onClick={lobby.leaveLobby}
                className="rounded-lg bg-surface text-muted px-6 py-3 hover:text-error transition-colors"
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
