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

  const invitableFriends = friends.filter(
    (f) => f.online && !party.members.some((m) => m.userId === f.userId),
  );
  const emptySlots = 4 - party.members.length;

  return (
    <div className="w-full animate-fade-in">
      {error && (
        <div className="text-xs text-error mb-2 text-center">{error}</div>
      )}

      {/* Member row */}
      <div className="flex items-center justify-center gap-2">
        {party.members.map((member) => (
          <div
            key={member.userId}
            className="group relative flex items-center gap-1.5 bg-surface/80 ring-1 ring-white/[0.06] rounded-lg px-3 py-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-correct" />
            <span className="text-sm text-text">
              {member.name}
            </span>
            {member.userId === party.leaderId && (
              <span className="text-[0.6rem] text-accent font-bold uppercase">
                Lead
              </span>
            )}
            {isLeader && member.userId !== myUserId && (
              <button
                onClick={() => onKick(member.userId)}
                className="text-muted/0 group-hover:text-muted hover:!text-error transition-colors text-sm ml-0.5"
                title="Kick"
              >
                &times;
              </button>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/[0.06] px-3 py-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted/20" />
            <span className="text-sm text-muted/20">---</span>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-center gap-3 mt-3">
        {isLeader && party.members.length < 4 && (
          <>
            {showInvite ? (
              <div className="flex items-center gap-2">
                {invitableFriends.length === 0 ? (
                  <span className="text-xs text-muted/50">No online friends</span>
                ) : (
                  invitableFriends.map((friend) => (
                    <button
                      key={friend.userId}
                      onClick={() => {
                        onInvite(friend.userId);
                        setShowInvite(false);
                      }}
                      className="text-xs bg-surface/80 ring-1 ring-white/[0.06] rounded px-2.5 py-1 text-text hover:ring-accent/30 transition-colors"
                    >
                      + {friend.username ?? friend.name ?? "Unknown"}
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInvite(true)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                + Invite
              </button>
            )}
          </>
        )}
        <button
          onClick={onLeave}
          className="text-xs text-muted/40 hover:text-error transition-colors"
        >
          Leave Party
        </button>
      </div>
    </div>
  );
}
