"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { TypePassWidget } from "@/components/race/TypePassWidget";
import { GuestPlacement } from "@/components/race/GuestPlacement";
import type { PartyState } from "@typeoff/shared";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  queueElapsed: number;
  maxWaitSeconds: number;
  connected: boolean;
  onJoin: (opts?: { privateRace?: boolean }) => void;
  onLeave: () => void;
  party: PartyState | null;
  partyError: string | null;
  onCreateParty: () => void;
  onInviteToParty: (userId: string) => void;
  onKickFromParty: (userId: string) => void;
  onLeaveParty: () => void;
  privateRace?: boolean;
  onSetPrivateRace?: (v: boolean) => void;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  queueElapsed,
  maxWaitSeconds,
  connected,
  onJoin,
  onLeave,
  party,
  partyError,
  onCreateParty,
  onInviteToParty,
  onKickFromParty,
  onLeaveParty,
  privateRace,
  onSetPrivateRace,
}: QueueScreenProps) {
  const { data: session } = useSession();

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;

  // Enter key shortcut to join queue
  React.useEffect(() => {
    if (isQueuing || !session?.user || !connected || inPartyNotLeader) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        onJoin({ privateRace });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQueuing, session?.user, connected, inPartyNotLeader, onJoin, privateRace]);

  /* ── Queuing state ──────────────────────────────────────── */
  if (isQueuing) {
    return (
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl font-black text-accent tabular-nums text-glow-accent">
            {queueCount}
          </div>
          <p className="text-muted text-sm">
            {queueCount === 1 ? "player" : "players"} in queue
          </p>
        </div>

        {party && (
          <div className="text-xs text-muted">
            Queuing with {party.members.length} party{" "}
            {party.members.length === 1 ? "member" : "members"}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-muted text-sm">
            {queueElapsed < maxWaitSeconds
              ? `Match starts in ${maxWaitSeconds - queueElapsed}s...`
              : "Starting match..."}
          </span>
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-muted hover:text-error transition-colors"
        >
          Leave queue
        </button>
      </div>
    );
  }

  /* ── Idle state ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center w-full max-w-3xl">
      {session?.user ? (
        <>
          {/* Action area */}
          {inPartyNotLeader ? (
            <div
              className="flex flex-col items-center gap-2 py-3 opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              <span className="text-sm text-muted">
                Waiting for party leader to start...
              </span>
              {privateRace && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent/70 bg-accent/[0.08] ring-1 ring-accent/20 rounded px-2 py-0.5">
                  Private
                </span>
              )}
            </div>
          ) : (
            <div
              className="relative flex flex-col items-center w-full max-w-lg opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              {/* Ambient glow */}
              <div
                className="absolute -inset-24 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(77, 158, 255, 0.06) 0%, transparent 70%)",
                }}
              />
              <button
                onClick={() => onJoin({ privateRace })}
                disabled={!connected}
                className="relative w-full rounded-xl bg-accent/[0.08] ring-1 ring-accent/25 text-accent py-5 text-base font-bold tracking-wide glow-accent hover:bg-accent hover:text-bg hover:ring-accent hover:glow-accent-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {session.user.placementsCompleted
                  ? privateRace ? "Start Private Race" : "Find Race"
                  : "Start Placement"}
                <span className="inline-block w-[2px] h-[1.1em] bg-current animate-blink ml-0.5 translate-y-[2px]" />
              </button>
              <div className="relative flex items-center gap-4 mt-3">
                <span className="text-[11px] text-muted/25">
                  press{" "}
                  <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.03] ring-1 ring-white/[0.06] text-muted/40 text-[10px] font-medium">
                    Enter ↵
                  </kbd>
                </span>
                {session.user.placementsCompleted && !party && (
                  <>
                    <span className="text-muted/15">·</span>
                    <button
                      onClick={onCreateParty}
                      className="text-[11px] text-muted/25 hover:text-muted transition-colors"
                    >
                      create party
                    </button>
                  </>
                )}
              </div>
              {/* Private race toggle — visible to party leaders with 2+ members */}
              {party && isPartyLeader && party.members.length >= 2 && session.user.placementsCompleted && (
                <label className="relative flex items-center gap-2 mt-3 cursor-pointer select-none group">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!privateRace}
                    onClick={() => onSetPrivateRace?.(!privateRace)}
                    className={`relative w-8 h-[18px] rounded-full transition-colors ${
                      privateRace ? "bg-accent" : "bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        privateRace ? "translate-x-3.5" : ""
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-muted/50 group-hover:text-muted transition-colors">
                    Private race
                  </span>
                </label>
              )}
              {!session.user.placementsCompleted && (
                <p className="relative text-[11px] text-muted/30 mt-1">
                  complete a placement race to unlock ranked
                </p>
              )}
            </div>
          )}

          {/* Party panel */}
          {session.user.placementsCompleted && party && (
            <div
              className="w-full max-w-lg mt-5 opacity-0 animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              <PartyPanel
                party={party}
                error={partyError}
                onCreateParty={onCreateParty}
                onInvite={onInviteToParty}
                onKick={onKickFromParty}
                onLeave={onLeaveParty}
              />
            </div>
          )}

          {/* Dashboard */}
          {session.user.placementsCompleted && (
            <div
              className="w-full mt-10 grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-3 items-start opacity-0 animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              <ChallengesWidget />
              <TypePassWidget />
            </div>
          )}
        </>
      ) : (
        /* ── Signed-out: Guest Placement ─────────────────── */
        <div className="w-full max-w-xl">
          <GuestPlacement />
        </div>
      )}
    </div>
  );
}
