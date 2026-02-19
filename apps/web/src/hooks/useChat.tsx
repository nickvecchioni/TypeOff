"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./useSocket";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

interface ChatContextValue {
  activeChat: string | null;
  messages: Message[];
  unreadCounts: Map<string, number>;
  totalUnread: number;
  loadingHistory: boolean;
  openChat: (friendId: string) => void;
  closeChat: () => void;
  sendMessage: (content: string) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = currentUserId;
  const { on, emit, connected } = useSocket();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Map<string, Message[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cursorsMap, setCursorsMap] = useState<Map<string, string | null>>(new Map());
  const activeChatRef = useRef<string | null>(null);

  // Keep ref in sync
  activeChatRef.current = activeChat;

  const totalUnread = Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0);

  const messages = activeChat ? (messagesMap.get(activeChat) ?? []) : [];
  const hasMore = activeChat ? cursorsMap.get(activeChat) !== null : false;

  // Fetch unread counts on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messages/unread");
        if (res.ok && !cancelled) {
          const data = await res.json();
          const counts = new Map<string, number>();
          for (const [friendId, count] of Object.entries(data.counts)) {
            counts.set(friendId, count as number);
          }
          setUnreadCounts(counts);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    const unsub = on("directMessage", (data) => {
      const isMine = data.senderId === currentUserIdRef.current;
      // Conversation key is always the friend's ID
      const friendId = isMine ? data.recipientId : data.senderId;

      const msg: Message = {
        id: data.messageId,
        senderId: data.senderId,
        content: data.content,
        createdAt: data.createdAt,
        readAt: null,
      };

      setMessagesMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(friendId) ?? [];
        if (!existing.some((m) => m.id === data.messageId)) {
          next.set(friendId, [...existing, msg]);
        }
        return next;
      });

      // Only increment unread for messages from others, when that chat isn't open
      if (!isMine && activeChatRef.current !== friendId) {
        setUnreadCounts((prev) => {
          const next = new Map(prev);
          next.set(friendId, (next.get(friendId) ?? 0) + 1);
          return next;
        });
      }
    });
    return unsub;
  }, [on]);

  // Listen for messages marked read
  useEffect(() => {
    const unsub = on("messagesMarkedRead", (data) => {
      // The friend read our messages — update read status in our local cache
      setMessagesMap((prev) => {
        const msgs = prev.get(data.friendId);
        if (!msgs) return prev;
        const next = new Map(prev);
        next.set(
          data.friendId,
          msgs.map((m) =>
            m.senderId !== data.byUserId && !m.readAt
              ? { ...m, readAt: new Date().toISOString() }
              : m,
          ),
        );
        return next;
      });
    });
    return unsub;
  }, [on]);

  const fetchHistory = useCallback(
    async (friendId: string, cursor?: string) => {
      setLoadingHistory(true);
      try {
        const params = new URLSearchParams({ friendId });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/messages?${params}`);
        if (res.ok) {
          const data = await res.json();
          const fetched: Message[] = data.messages;
          setMessagesMap((prev) => {
            const next = new Map(prev);
            const existing = cursor ? (next.get(friendId) ?? []) : [];
            // Messages come newest-first from API, reverse for display order
            const reversed = [...fetched].reverse();
            next.set(friendId, [...reversed, ...existing]);
            return next;
          });
          setCursorsMap((prev) => {
            const next = new Map(prev);
            next.set(friendId, data.nextCursor);
            return next;
          });
        }
      } catch {
        // ignore
      } finally {
        setLoadingHistory(false);
      }
    },
    [],
  );

  const openChat = useCallback(
    (friendId: string) => {
      setActiveChat(friendId);

      // Fetch history if not cached
      if (!messagesMap.has(friendId)) {
        fetchHistory(friendId);
      }

      // Clear unread count for this friend
      setUnreadCounts((prev) => {
        if (!prev.has(friendId) || prev.get(friendId) === 0) return prev;
        const next = new Map(prev);
        next.delete(friendId);
        return next;
      });

      // Mark messages as read via socket
      if (connected) {
        (async () => {
          try {
            const res = await fetch("/api/ws-token");
            if (res.ok) {
              const { token } = await res.json();
              if (token) emit("markMessagesRead", { token, friendId });
            }
          } catch {
            // ignore
          }
        })();
      }
    },
    [messagesMap, connected, emit, fetchHistory],
  );

  const closeChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeChat || !content.trim()) return;

      (async () => {
        try {
          const res = await fetch("/api/ws-token");
          if (res.ok) {
            const { token } = await res.json();
            if (token) {
              emit("sendDirectMessage", {
                token,
                recipientId: activeChat,
                content: content.trim(),
              });
            }
          }
        } catch {
          // ignore
        }
      })();
    },
    [activeChat, emit],
  );

  const loadMore = useCallback(async () => {
    if (!activeChat) return;
    const cursor = cursorsMap.get(activeChat);
    if (!cursor) return;
    await fetchHistory(activeChat, cursor);
  }, [activeChat, cursorsMap, fetchHistory]);

  return (
    <ChatContext
      value={{
        activeChat,
        messages,
        unreadCounts,
        totalUnread,
        loadingHistory,
        openChat,
        closeChat,
        sendMessage,
        loadMore,
        hasMore,
      }}
    >
      {children}
    </ChatContext>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
