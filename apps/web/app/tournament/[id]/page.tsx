"use client";

import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTournament } from "@/hooks/useTournament";
import { RaceTrack } from "@/components/race/RaceTrack";
import { RaceTypingArea } from "@/components/race/RaceTypingArea";
import { CountdownOverlay } from "@/components/race/CountdownOverlay";
import type { TournamentMatch } from "@typeoff/shared";

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const { data: session } = useSession();
  const t = useTournament();

  // Auto-join on mount
  useEffect(() => {
    if (t.connected && t.phase === "idle" && tournamentId) {
      t.joinTournament(tournamentId);
    }
  }, [t.connected, t.phase, tournamentId]);

  const myUserId = session?.user?.id ?? null;
  const isCreator = t.tournament?.createdBy === myUserId;

  // Find my current pending match
  const myMatch = useMemo(() => {
    if (!t.bracket || !myUserId) return null;
    for (const round of t.bracket.rounds) {
      for (const match of round) {
        if (
          match.status === "pending" &&
          (match.player1?.id === myUserId || match.player2?.id === myUserId) &&
          match.player1 &&
          match.player2
        ) {
          return match;
        }
      }
    }
    return null;
  }, [t.bracket, myUserId]);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl space-y-8">
        {t.error && <div className="text-error text-sm">{t.error}</div>}

        {/* Waiting Room */}
        {(t.phase === "joined" || t.phase === "idle") && t.tournament && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-text">{t.tournament.name}</h1>
            <div className="text-sm text-muted">
              {t.tournament.players.length}/{t.tournament.maxPlayers} players
            </div>

            <div className="w-full max-w-sm space-y-2">
              {t.tournament.players.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between bg-surface rounded-lg px-4 py-2"
                >
                  <span className="text-text">{p.name}</span>
                  {p.userId === t.tournament!.createdBy && (
                    <span className="text-xs text-accent font-bold">Host</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {isCreator && (
                <button
                  onClick={t.startTournament}
                  disabled={!t.tournament || t.tournament.players.length < 2}
                  className="rounded-lg bg-accent/20 text-accent px-8 py-3 font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Tournament
                </button>
              )}
              <button
                onClick={t.leaveTournament}
                className="rounded-lg bg-surface text-muted px-6 py-3 hover:text-error transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* Bracket View */}
        {t.phase === "bracket" && t.bracket && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-text text-center">
              {t.tournament?.name} — Bracket
            </h1>

            {myMatch && (
              <div className="flex justify-center">
                <button
                  onClick={() => t.readyForMatch(myMatch.id)}
                  className="rounded-lg bg-accent/20 text-accent px-8 py-3 font-bold hover:bg-accent/30 transition-colors animate-pulse"
                >
                  Ready for Match
                </button>
              </div>
            )}

            <BracketView rounds={t.bracket.rounds} myUserId={myUserId} />
          </div>
        )}

        {/* Match (Race) */}
        {t.phase === "match" && t.raceState && (
          <>
            {t.countdown > 0 && (
              <CountdownOverlay
                countdown={t.countdown}
                playerCount={t.raceState.players.length}
              />
            )}
            <RaceTrack
              players={t.raceState.players}
              progress={t.progress}
              myPlayerId={myUserId}
            />
            <RaceTypingArea
              seed={t.raceState.seed}
              wordCount={t.raceState.wordCount}
              wordPool={t.raceState.wordPool}
              finishTimeoutEnd={t.finishTimeoutEnd}
              onProgress={t.sendProgress}
              onFinish={t.sendFinish}
              disabled={false}
            />
          </>
        )}

        {/* Results */}
        {t.phase === "results" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-text">Tournament Complete!</h1>
            <div className="w-full max-w-sm space-y-2">
              {t.results.map((r) => (
                <div
                  key={r.userId}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    r.placement === 1 ? "bg-accent/20" : "bg-surface"
                  }`}
                >
                  <span className="text-text font-bold">
                    {r.placement === 1 ? "🏆" : `#${r.placement}`} {r.name}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={t.reset}
              className="rounded-lg bg-surface text-muted px-6 py-3 hover:text-text transition-colors"
            >
              Back to Tournaments
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function BracketView({
  rounds,
  myUserId,
}: {
  rounds: TournamentMatch[][];
  myUserId: string | null;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round, ri) => (
        <div key={ri} className="flex flex-col gap-4 min-w-[200px]">
          <div className="text-xs text-muted text-center font-bold uppercase tracking-wider">
            {ri === rounds.length - 1 ? "Final" : `Round ${ri + 1}`}
          </div>
          <div className="flex flex-col gap-4 justify-around flex-1">
            {round.map((match) => (
              <MatchCard key={match.id} match={match} myUserId={myUserId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  myUserId,
}: {
  match: TournamentMatch;
  myUserId: string | null;
}) {
  const isMyMatch =
    match.player1?.id === myUserId || match.player2?.id === myUserId;

  return (
    <div
      className={`rounded-lg border ${
        isMyMatch ? "border-accent/50" : "border-surface"
      } bg-surface/50 overflow-hidden`}
    >
      <PlayerSlot
        player={match.player1}
        isWinner={match.winnerId === match.player1?.id}
        isMe={match.player1?.id === myUserId}
      />
      <div className="border-t border-surface/50" />
      <PlayerSlot
        player={match.player2}
        isWinner={match.winnerId === match.player2?.id}
        isMe={match.player2?.id === myUserId}
      />
      {match.status === "racing" && (
        <div className="px-3 py-1 text-xs text-accent text-center bg-accent/10">
          Racing...
        </div>
      )}
    </div>
  );
}

function PlayerSlot({
  player,
  isWinner,
  isMe,
}: {
  player: { id: string; name: string } | null;
  isWinner: boolean;
  isMe: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 text-sm ${
        isWinner
          ? "bg-correct/10 text-correct font-bold"
          : isMe
          ? "text-accent"
          : "text-text"
      }`}
    >
      {player ? player.name : <span className="text-muted italic">BYE</span>}
    </div>
  );
}
