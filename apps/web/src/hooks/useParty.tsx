"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { PartyState } from "@typeoff/shared";
import { useSocket } from "./useSocket";

export interface PartyInvite {
  partyId: string;
  fromUserId: string;
  fromName: string;
}

interface PartyMessage {
  userId: string;
  name: string;
  message: string;
  timestamp: number;
}

interface PartyContextValue {
  party: PartyState | null;
  pendingInvite: PartyInvite | null;
  error: string | null;
  messages: PartyMessage[];
  createParty: () => Promise<void>;
  inviteToParty: (userId: string) => void;
  respondToInvite: (partyId: string, accept: boolean) => Promise<void>;
  leaveParty: () => void;
  kickMember: (userId: string) => void;
  setPrivateRace: (privateRace: boolean) => void;
  markReady: () => void;
  sendMessage: (message: string) => void;
}

const PartyContext = createContext<PartyContextValue | null>(null);

function usePartyInternal(): PartyContextValue {
  const { emit, on } = useSocket();
  const [party, setParty] = useState<PartyState | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PartyInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<PartyMessage[]>([]);

  const inviteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubs = [
      on("partyUpdate", (data) => {
        setParty(data);
        setError(null);
      }),
      on("partyInvite", (data) => {
        setPendingInvite(data);
        if (inviteTimerRef.current) clearTimeout(inviteTimerRef.current);
        inviteTimerRef.current = setTimeout(() => {
          setPendingInvite(null);
        }, 30_000);
      }),
      on("partyDisbanded", () => {
        setParty(null);
        setMessages([]);
      }),
      on("partyError", (data) => {
        setError(data.message);
      }),
      on("partyReadyReset", () => {
        setParty((prev) => prev ? { ...prev, readyState: {} } : prev);
      }),
      on("partyMessage", (data) => {
        setMessages((prev) => [...prev, data]);
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
    setMessages([]);
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

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      emit("sendPartyMessage", { message });
    },
    [emit],
  );

  return {
    party,
    pendingInvite,
    error,
    messages,
    createParty,
    inviteToParty,
    respondToInvite,
    leaveParty,
    kickMember,
    setPrivateRace,
    markReady,
    sendMessage,
  };
}

export function PartyProvider({ children }: { children: ReactNode }) {
  const value = usePartyInternal();
  return <PartyContext value={value}>{children}</PartyContext>;
}

export function useParty() {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error("useParty must be used within a PartyProvider");
  return ctx;
}
