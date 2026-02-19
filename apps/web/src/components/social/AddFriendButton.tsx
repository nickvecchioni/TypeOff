"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSocial } from "@/hooks/useSocial";
import { useParty } from "@/hooks/useParty";

interface AddFriendButtonProps {
  targetUserId: string;
}

export function AddFriendButton({ targetUserId }: AddFriendButtonProps) {
  const { sendRequest, friends, fetchFriends } = useSocial();
  const { party, createParty, inviteToParty } = useParty();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const friend = friends.find((f) => f.userId === targetUserId);
  const isFriend = !!friend;
  const isFriendOnline = isFriend && friend.online;

  const handleSend = useCallback(async () => {
    setError(null);
    const ok = await sendRequest(targetUserId);
    if (ok) {
      setSent(true);
    } else {
      setError("Already sent or friends");
    }
  }, [sendRequest, targetUserId]);

  const handleInvite = useCallback(async () => {
    setInviteState("sending");
    try {
      // Create party first if we don't have one
      if (!party) {
        await createParty();
        // Small delay for the party to be created before inviting
        await new Promise((r) => setTimeout(r, 300));
      }
      inviteToParty(targetUserId);
      setInviteState("sent");
    } catch {
      setInviteState("idle");
    }
  }, [party, createParty, inviteToParty, targetUserId]);

  if (isFriend) {
    return (
      <div className="flex items-center gap-2">
        {isFriendOnline && inviteState === "idle" && (
          <button
            onClick={handleInvite}
            className="rounded-lg bg-accent/10 text-accent px-3 py-1.5 text-xs font-semibold ring-1 ring-accent/20 hover:bg-accent hover:text-bg hover:ring-accent transition-all"
          >
            Invite to Party
          </button>
        )}
        {inviteState === "sending" && (
          <span className="text-xs text-muted/60">Sending...</span>
        )}
        {inviteState === "sent" && (
          <span className="text-xs text-accent/80">Invite Sent</span>
        )}
        <span className="text-xs text-muted">Friends</span>
      </div>
    );
  }

  if (sent) {
    return <span className="text-xs text-muted">Request Sent</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSend}
        className="rounded-lg bg-accent/20 text-accent px-4 py-2 text-sm font-bold hover:bg-accent/30 transition-colors"
      >
        Add Friend
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
