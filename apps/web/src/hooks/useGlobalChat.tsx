"use client";

import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./useSocket";
import type { GlobalChatMessage } from "@typeoff/shared";

interface GlobalChatContextValue {
  messages: GlobalChatMessage[];
  connected: boolean;
  sendMessage: (content: string) => void;
  isJoined: boolean;
}

const GlobalChatContext = createContext<GlobalChatContextValue | null>(null);

export function GlobalChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { on, emit, connected } = useSocket();
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const joinedRef = useRef(false);

  // Join global chat on socket connect
  useEffect(() => {
    if (!connected || joinedRef.current) return;
    joinedRef.current = true;

    (async () => {
      const tokenData = session?.user?.id
        ? await fetch("/api/ws-token").then(r => r.json()).catch(() => ({}))
        : {};
      emit("joinGlobalChat", { token: tokenData.token });
      setIsJoined(true);
    })();
  }, [connected, emit, session?.user?.id]);

  useEffect(() => {
    if (!connected) { joinedRef.current = false; setIsJoined(false); }
  }, [connected]);

  useEffect(() => {
    return on("globalChatHistory", (data) => {
      setMessages(data.messages);
    });
  }, [on]);

  useEffect(() => {
    return on("globalChatMessage", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-49), msg];
      });
    });
  }, [on]);

  const sendMessage = useCallback((content: string) => {
    if (!session?.user?.id || !content.trim()) return;
    (async () => {
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const { token } = await res.json();
          emit("sendGlobalMessage", { token, content: content.trim() });
        }
      } catch { /* ignore */ }
    })();
  }, [emit, session?.user?.id]);

  return (
    <GlobalChatContext value={{ messages, connected, sendMessage, isJoined }}>
      {children}
    </GlobalChatContext>
  );
}

export function useGlobalChat() {
  const ctx = useContext(GlobalChatContext);
  if (!ctx) throw new Error("useGlobalChat must be used within GlobalChatProvider");
  return ctx;
}
