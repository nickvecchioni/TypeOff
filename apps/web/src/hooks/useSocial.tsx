"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useSocket } from "./useSocket";

interface Friend {
  userId: string;
  username: string | null;
  name: string | null;
  online?: boolean;
  lastSeen?: string | null;
  raceId?: string | null;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  name: string | null;
  username: string | null;
  createdAt: string;
}

interface SocialContextValue {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  loading: boolean;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (addresseeId: string) => Promise<boolean>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<Array<{ userId: string; username: string | null; name: string | null }>>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { on, emit, connected } = useSocket();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Listen for individual friend online/offline status changes
  useEffect(() => {
    const unsub = on("friendStatus", (data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === data.userId
            ? {
                ...f,
                online: data.online,
                lastSeen: data.online ? null : (data.lastSeen ?? new Date().toISOString()),
                raceId: data.raceId ?? null,
              }
            : f,
        ),
      );
    });
    return unsub;
  }, [on]);

  // Listen for bulk friend statuses (initial sync)
  useEffect(() => {
    const unsub = on("friendStatuses", (data) => {
      const statusMap = new Map(data.map((s) => [s.userId, { online: s.online, lastSeen: s.lastSeen, raceId: s.raceId }]));
      setFriends((prev) =>
        prev.map((f) => {
          const status = statusMap.get(f.userId);
          return {
            ...f,
            online: status?.online ?? f.online ?? false,
            lastSeen: status ? (status.online ? null : (status.lastSeen ?? f.lastSeen)) : f.lastSeen,
            raceId: status?.raceId ?? f.raceId ?? null,
          };
        }),
      );
    });
    return unsub;
  }, [on]);

  // Helper: fetch a ws-token and emit requestFriendStatuses
  const requestStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/ws-token");
      if (!res.ok) return;
      const { token } = await res.json();
      if (token) emit("requestFriendStatuses", { token });
    } catch {
      // ignore — statuses will arrive via individual friendStatus events
    }
  }, [emit]);

  // Request friend statuses when socket connects
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ws-token");
        if (!res.ok || cancelled) return;
        const { token } = await res.json();
        if (!cancelled && token) emit("requestFriendStatuses", { token });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [connected, emit]);

  // Re-request statuses when user returns to the tab (catches missed events)
  useEffect(() => {
    if (!connected) return;
    function handleVisibility() {
      if (document.visibilityState === "visible") requestStatuses();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [connected, requestStatuses]);

  // Periodic refresh every 60s to self-correct any missed status events
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => requestStatuses(), 60_000);
    return () => clearInterval(interval);
  }, [connected, requestStatuses]);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        // Merge API response with existing socket-derived online statuses.
        // Use `existing != null` (not ??) so that null lastSeen (= friend is online)
        // is preserved and doesn't fall back to the stale HTTP lastSeen value.
        setFriends((prev) => {
          const prevMap = new Map(prev.map((f) => [f.userId, f]));
          return data.friends.map((f: Friend) => {
            const existing = prevMap.get(f.userId);
            return {
              ...f,
              online: existing?.online ?? false,
              lastSeen: existing != null ? existing.lastSeen : (f.lastSeen ?? null),
            };
          });
        });
        // Re-request friend statuses so socket data arrives after friends are populated
        if (connected) {
          try {
            const tokenRes = await fetch("/api/ws-token");
            if (tokenRes.ok) {
              const { token } = await tokenRes.json();
              if (token) emit("requestFriendStatuses", { token });
            }
          } catch {
            // ignore — statuses will arrive via individual friendStatus events
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [connected, emit]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests");
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests);
      }
    } catch {
      // ignore
    }
  }, []);

  const sendRequest = useCallback(async (addresseeId: string) => {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId }),
    });
    return res.ok;
  }, []);

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action: "accept" }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== friendshipId));
        await fetchFriends();
      }
    },
    [fetchFriends],
  );

  const declineRequest = useCallback(async (friendshipId: string) => {
    const res = await fetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "decline" }),
    });
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    }
  }, []);

  const removeFriend = useCallback(async (friendId: string) => {
    const res = await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.userId !== friendId));
    }
    return res.ok;
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.users as Array<{ userId: string; username: string | null; name: string | null }>;
  }, []);

  return (
    <SocialContext value={{
      friends,
      pendingRequests,
      loading,
      fetchFriends,
      fetchRequests,
      sendRequest,
      acceptRequest,
      declineRequest,
      removeFriend,
      searchUsers,
    }}>
      {children}
    </SocialContext>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) {
    throw new Error("useSocial must be used within a SocialProvider");
  }
  return ctx;
}
