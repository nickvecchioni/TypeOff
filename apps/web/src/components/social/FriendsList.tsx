"use client";

import React, { useEffect } from "react";
import { useSocial } from "@/hooks/useSocial";

export function FriendsList() {
  const { friends, loading, fetchFriends } = useSocial();

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  if (loading) {
    return <div className="text-sm text-muted">Loading friends...</div>;
  }

  if (friends.length === 0) {
    return <div className="text-sm text-muted">No friends yet. Add someone!</div>;
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.userId}
          className="flex items-center justify-between bg-surface rounded-lg px-4 py-2"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                friend.online ? "bg-correct" : "bg-muted/30"
              }`}
            />
            <span className="text-text text-sm">
              {friend.username ?? friend.name ?? "Unknown"}
            </span>
          </div>
          <span className="text-xs text-muted">
            {friend.online ? "Online" : "Offline"}
          </span>
        </div>
      ))}
    </div>
  );
}
