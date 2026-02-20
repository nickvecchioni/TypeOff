"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import type { PartyState } from "@typeoff/shared";
import { useSocket } from "./useSocket";

export interface PartyInvite {
  partyId: string;
  fromUserId: string;
  fromName: string;
}

export interface PartyChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

type PartyHook = ReturnType<typeof usePartyInternal>;

const PartyContext = createContext<PartyHook | null>(null);

function usePartyInternal() {
  const { emit, on } = useSocket();
  const [party, setParty] = useState<PartyState | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PartyInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<PartyChatMessage[]>([]);

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
        setChatMessages([]);
      }),
      on("partyError", (data) => {
        setError(data.message);
      }),
      on("partyReadyReset", () => {
        setParty((prev) => prev ? { ...prev, readyState: {} } : prev);
      }),
      on("partyChatMessage", (data) => {
        setChatMessages((prev) => [...prev, data]);
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
    setChatMessages([]);
    setError(null);
  }, [emit]);

  const kickMember = useCallback(
    (userId: string) => {
      emit("kickFromParty", { userId });
    },
    [emit],
  );

  const setPrivateRace = useCallback(
    (privateRace: boolean) => {
      emit("partySetPrivateRace", { privateRace });
    },
    [emit],
  );

  const markReady = useCallback(() => {
    emit("partyMarkReady");
  }, [emit]);

  const sendChatMessage = useCallback(
    (message: string) => {
      emit("partyChatSend", { message });
    },
    [emit],
  );

  return {
    party,
    pendingInvite,
    error,
    chatMessages,
    createParty,
    inviteToParty,
    respondToInvite,
    leaveParty,
    kickMember,
    setPrivateRace,
    markReady,
    sendChatMessage,
  };
}

export function PartyProvider({ children }: { children: React.ReactNode }) {
  const party = usePartyInternal();
  return <PartyContext.Provider value={party}>{children}</PartyContext.Provider>;
}

export function useParty() {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error("useParty must be used within PartyProvider");
  return ctx;
}
