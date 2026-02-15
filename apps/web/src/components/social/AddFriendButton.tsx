"use client";

import React, { useState, useCallback } from "react";
import { useSocial } from "@/hooks/useSocial";

interface AddFriendButtonProps {
  targetUserId: string;
}

export function AddFriendButton({ targetUserId }: AddFriendButtonProps) {
  const { sendRequest } = useSocial();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setError(null);
    const ok = await sendRequest(targetUserId);
    if (ok) {
      setSent(true);
    } else {
      setError("Already sent or friends");
    }
  }, [sendRequest, targetUserId]);

  if (sent) {
    return <span className="text-xs text-muted">Request Sent</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSend}
        className="rounded-lg bg-accent/20 text-accent px-4 py-2 text-sm font-bold hover:bg-accent/30 transition-colors"
      >
        Add Friend
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
