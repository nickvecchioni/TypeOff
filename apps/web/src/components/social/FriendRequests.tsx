"use client";

import React, { useEffect } from "react";
import { useSocial } from "@/hooks/useSocial";

export function FriendRequests() {
  const { pendingRequests, fetchRequests, acceptRequest, declineRequest } = useSocial();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (pendingRequests.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text">Friend Requests</h3>
      {pendingRequests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between bg-surface rounded-lg px-4 py-2"
        >
          <span className="text-text text-sm">
            {req.username ?? req.name ?? "Unknown"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => acceptRequest(req.id)}
              className="text-xs text-correct hover:text-correct/80 font-bold"
            >
              Accept
            </button>
            <button
              onClick={() => declineRequest(req.id)}
              className="text-xs text-error hover:text-error/80 font-bold"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
