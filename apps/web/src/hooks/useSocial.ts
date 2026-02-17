"use client";

import { useState, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";

interface Friend {
  userId: string;
  username: string | null;
  name: string | null;
  online?: boolean;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  name: string | null;
  username: string | null;
  createdAt: string;
}

export function useSocial() {
  const { on } = useSocket();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Listen for friend online/offline status
  useEffect(() => {
    const unsub = on("friendStatus", (data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === data.userId ? { ...f, online: data.online } : f,
        ),
      );
    });
    return unsub;
  }, [on]);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
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
  };
}
