"use client";

import { useState, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";

interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  timestamp: number;
}

const MAX_MESSAGES = 50;

export function useLobbyChat() {
  const { emit, on } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsub = on("lobbyChatMessage", (data) => {
      setMessages((prev) => {
        const next = [...prev, data];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    });
    return unsub;
  }, [on]);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      emit("lobbyChat", { message: trimmed });
    },
    [emit],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, sendMessage, clearMessages };
}
