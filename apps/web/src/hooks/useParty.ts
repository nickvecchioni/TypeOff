"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PartyState } from "@typeoff/shared";
import { useSocket } from "./useSocket";

export interface PartyInvite {
  partyId: string;
  fromUserId: string;
  fromName: string;
}

export function useParty() {
  const { emit, on } = useSocket();
  const [party, setParty] = useState<PartyState | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PartyInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubs = [
      on("partyUpdate", (data) => {
        setParty(data);
        setError(null);
      }),
      on("partyInvite", (data) => {
        setPendingInvite(data);
        // Auto-dismiss after 30s
        if (inviteTimerRef.current) clearTimeout(inviteTimerRef.current);
        inviteTimerRef.current = setTimeout(() => {
          setPendingInvite(null);
        }, 30_000);
      }),
      on("partyDisbanded", () => {
        setParty(null);
      }),
      on("partyError", (data) => {
        setError(data.message);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      if (inviteTimerRef.current) clearTimeout(inviteTimerRef.current);
    };
  }, [on]);

  const createParty = useCallback(async () => {
    setError(null);
    let token: string | undefined;
    try {
      const res = await fetch("/api/ws-token");
      if (res.ok) {
        const data = await res.json();
        token = data.token;
      }
    } catch {
      // handled below
    }

    if (token) {
      emit("createParty", { token });
    } else {
      setError("Sign in required");
    }
  }, [emit]);

  const inviteToParty = useCallback(
    (userId: string) => {
      setError(null);
      emit("inviteToParty", { userId });
    },
    [emit],
  );

  const respondToInvite = useCallback(
    async (partyId: string, accept: boolean) => {
      setPendingInvite(null);
      if (inviteTimerRef.current) {
        clearTimeout(inviteTimerRef.current);
        inviteTimerRef.current = null;
      }

      let token: string | undefined;
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const data = await res.json();
          token = data.token;
        }
      } catch {
        // handled below
      }

      emit("respondToPartyInvite", { partyId, accept, token });
    },
    [emit],
  );

  const leaveParty = useCallback(() => {
    emit("leaveParty");
    setParty(null);
    setError(null);
  }, [emit]);

  const kickMember = useCallback(
    (userId: string) => {
      emit("kickFromParty", { userId });
    },
    [emit],
  );

  return {
    party,
    pendingInvite,
    error,
    createParty,
    inviteToParty,
    respondToInvite,
    leaveParty,
    kickMember,
  };
}
