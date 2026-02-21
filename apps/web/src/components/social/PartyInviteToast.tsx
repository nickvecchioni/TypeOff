"use client";

import React from "react";
import { useParty } from "@/hooks/useParty";

export function PartyInviteToast() {
  const { pendingInvite, respondToInvite } = useParty();

  if (!pendingInvite) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-surface border border-white/[0.08] rounded-lg p-4 shadow-lg max-w-xs">
        <div className="text-sm text-text mb-1">Party Invite</div>
        <div className="text-xs text-muted mb-3">
          <span className="text-accent font-bold">{pendingInvite.fromName}</span> invited you to their party
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => respondToInvite(pendingInvite.partyId, true)}
            className="flex-1 rounded border border-accent/30 bg-accent/15 text-accent px-3 py-1.5 text-xs font-bold hover:bg-accent/25 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => respondToInvite(pendingInvite.partyId, false)}
            className="flex-1 rounded border border-white/[0.06] bg-surface/60 text-muted px-3 py-1.5 text-xs font-bold hover:text-text transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
