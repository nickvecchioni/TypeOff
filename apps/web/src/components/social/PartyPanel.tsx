"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocial } from "@/hooks/useSocial";
import type { PartyState } from "@typeoff/shared";

interface PartyPanelProps {
  party: PartyState | null;
  error: string | null;
  onCreateParty: () => void;
  onInvite: (userId: string) => void;
  onKick: (userId: string) => void;
  onLeave: () => void;
}

export function PartyPanel({
  party,
  error,
  onCreateParty,
  onInvite,
  onKick,
  onLeave,
}: PartyPanelProps) {
  const { data: session } = useSession();
  const { friends, fetchFriends } = useSocial();
  const [showInvite, setShowInvite] = useState(false);

  const myUserId = session?.user?.id;
  const isLeader = party?.leaderId === myUserId;

  useEffect(() => {
    if (showInvite) {
      fetchFriends();
    }
  }, [showInvite, fetchFriends]);

  if (!party) {
    return (
      <button
        onClick={onCreateParty}
        className="text-sm text-muted hover:text-accent transition-colors"
      >
        Create Party
      </button>
    );
  }

  // Online friends not already in the party
  const invitableFriends = friends.filter(
    (f) => f.online && !party.members.some((m) => m.userId === f.userId),
  );

  return (
    <div className="w-full max-w-xs bg-surface/60 border border-white/[0.06] rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted uppercase tracking-wider font-bold">
          Party
        </div>
        <button
          onClick={onLeave}
          className="text-xs text-muted hover:text-error transition-colors"
        >
          Leave
        </button>
      </div>

      {error && (
        <div className="text-xs text-error mb-2">{error}</div>
      )}

      <div className="space-y-1.5 mb-3">
        {party.members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-correct" />
              <span className="text-text text-sm">
                {member.name}
                {member.userId === party.leaderId && (
                  <span className="text-accent text-xs ml-1">Leader</span>
                )}
              </span>
            </div>
            {isLeader && member.userId !== myUserId && (
              <button
                onClick={() => onKick(member.userId)}
                className="text-xs text-muted hover:text-error transition-colors"
              >
                Kick
              </button>
            )}
          </div>
        ))}
      </div>

      {isLeader && (
        <>
          {showInvite ? (
            <div className="border-t border-white/[0.06] pt-3">
              <div className="text-xs text-muted mb-2">Invite a Friend</div>
              {invitableFriends.length === 0 ? (
                <div className="text-xs text-muted/60">
                  No online friends to invite
                </div>
              ) : (
                <div className="space-y-1">
                  {invitableFriends.map((friend) => (
                    <button
                      key={friend.userId}
                      onClick={() => {
                        onInvite(friend.userId);
                        setShowInvite(false);
                      }}
                      className="w-full flex items-center justify-between bg-surface rounded px-3 py-1.5 text-sm text-text hover:bg-white/[0.04] transition-colors"
                    >
                      <span>{friend.username ?? friend.name ?? "Unknown"}</span>
                      <span className="text-xs text-accent">Invite</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowInvite(false)}
                className="text-xs text-muted hover:text-text transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            party.members.length < 4 && (
              <button
                onClick={() => setShowInvite(true)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                + Invite Friend
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
