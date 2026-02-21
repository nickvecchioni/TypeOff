"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "./useSocket";

export interface DmMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  message: string;
  timestamp: number;
}

export interface DmConversation {
  userId: string;
  name: string;
  messages: DmMessage[];
  hasMore: boolean;
  loading: boolean;
}

interface DmContextValue {
  openConversation: DmConversation | null;
  unreadFrom: Set<string>; // userIds with unread messages
  openDm: (userId: string, name: string) => void;
  closeDm: () => void;
  sendDm: (message: string) => void;
  loadMore: () => void;
}

const DmContext = createContext<DmContextValue | null>(null);

function useDmInternal(): DmContextValue {
  const { emit, on } = useSocket();
  const [openConversation, setOpenConversation] = useState<DmConversation | null>(null);
  const [unreadFrom, setUnreadFrom] = useState<Set<string>>(new Set());
  const openConvRef = useRef<DmConversation | null>(null);
  openConvRef.current = openConversation;

  // Listen for incoming DM messages
  useEffect(() => {
    return on("dmMessage", (data) => {
      const otherUserId = data.fromUserId === openConvRef.current?.userId
        ? data.fromUserId
        : data.toUserId === openConvRef.current?.userId
        ? data.toUserId
        : null;

      const isOpenConv = otherUserId !== null ||
        data.fromUserId === openConvRef.current?.userId ||
        data.toUserId === openConvRef.current?.userId;

      if (isOpenConv) {
        setOpenConversation((prev) => {
          if (!prev) return prev;
          // Deduplicate by id
          if (prev.messages.some((m) => m.id === data.id)) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: data.id,
                fromUserId: data.fromUserId,
                fromName: data.fromName,
                message: data.message,
                timestamp: data.timestamp,
              },
            ],
          };
        });
      } else {
        // Mark as unread from this sender
        setUnreadFrom((prev) => new Set(prev).add(data.fromUserId));
      }
    });
  }, [on]);

  const openDm = useCallback(
    async (userId: string, name: string) => {
      // Clear unread for this user
      setUnreadFrom((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

      setOpenConversation({ userId, name, messages: [], hasMore: false, loading: true });

      try {
        const res = await fetch(`/api/direct-messages/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setOpenConversation((prev) => {
            if (!prev || prev.userId !== userId) return prev;
            return {
              ...prev,
              messages: data.messages ?? [],
              hasMore: (data.messages?.length ?? 0) === 50,
              loading: false,
            };
          });
        } else {
          setOpenConversation((prev) => prev?.userId === userId ? { ...prev, loading: false } : prev);
        }
      } catch {
        setOpenConversation((prev) => prev?.userId === userId ? { ...prev, loading: false } : prev);
      }
    },
    [],
  );

  const closeDm = useCallback(() => {
    setOpenConversation(null);
  }, []);

  const sendDm = useCallback(
    (message: string) => {
      if (!openConvRef.current) return;
      emit("sendDm", { toUserId: openConvRef.current.userId, message });
    },
    [emit],
  );

  const loadMore = useCallback(async () => {
    const conv = openConvRef.current;
    if (!conv || !conv.hasMore || conv.loading || conv.messages.length === 0) return;

    const oldest = conv.messages[0].timestamp;
    setOpenConversation((prev) => prev ? { ...prev, loading: true } : prev);

    try {
      const res = await fetch(`/api/direct-messages/${conv.userId}?before=${oldest}`);
      if (res.ok) {
        const data = await res.json();
        setOpenConversation((prev) => {
          if (!prev || prev.userId !== conv.userId) return prev;
          return {
            ...prev,
            messages: [...(data.messages ?? []), ...prev.messages],
            hasMore: (data.messages?.length ?? 0) === 50,
            loading: false,
          };
        });
      }
    } catch {
      setOpenConversation((prev) => prev ? { ...prev, loading: false } : prev);
    }
  }, []);

  return { openConversation, unreadFrom, openDm, closeDm, sendDm, loadMore };
}

export function DmProvider({ children }: { children: React.ReactNode }) {
  const value = useDmInternal();
  return <DmContext.Provider value={value}>{children}</DmContext.Provider>;
}

export function useDm(): DmContextValue {
  const ctx = useContext(DmContext);
  if (!ctx) throw new Error("useDm must be used within DmProvider");
  return ctx;
}
