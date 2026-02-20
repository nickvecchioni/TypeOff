"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClanActionsProps {
  clanId: string;
  isLeaderOrOfficer: boolean;
  isMember: boolean;
  isLeader: boolean;
  viewerHasClan: boolean;
  pendingInviteId: string | null;
  redirectTo?: string;
}

export function ClanActions({
  clanId,
  isLeaderOrOfficer,
  isMember,
  isLeader,
  viewerHasClan,
  pendingInviteId,
  redirectTo = "/leaderboard?tab=clans",
}: ClanActionsProps) {
  const router = useRouter();
  const [inviteUsername, setInviteUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      // First look up the user by username
      const userRes = await fetch(`/api/users?username=${encodeURIComponent(inviteUsername.trim())}`);
      if (!userRes.ok) {
        setMessage("User not found");
        return;
      }
      const userData = await userRes.json();

      const res = await fetch(`/api/clans/${clanId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to send invite");
      } else {
        setMessage("Invite sent!");
        setInviteUsername("");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInviteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clans/${clanId}/invite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: pendingInviteId, accept: true }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json();
        setMessage(data.error ?? "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clans/${clanId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "self" }),
      });
      if (res.ok) {
        router.push(redirectTo);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisband = async () => {
    if (!confirm("Are you sure you want to disband this clan?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clans/${clanId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(redirectTo);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Invite controls */}
      {isLeaderOrOfficer && (
        <div className="flex items-center gap-2">
          <input
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="Invite by username"
            className="bg-surface rounded px-2 py-1.5 text-sm text-text ring-1 ring-white/[0.06] focus:ring-accent/40 outline-none w-40"
          />
          <button
            onClick={handleInvite}
            disabled={loading || !inviteUsername.trim()}
            className="text-xs bg-accent/[0.06] ring-1 ring-accent/20 text-accent rounded px-3 py-1.5 hover:bg-accent hover:text-bg transition-all disabled:opacity-40"
          >
            Invite
          </button>
        </div>
      )}

      {/* Accept invite CTA */}
      {pendingInviteId && !isMember && !viewerHasClan && (
        <button
          onClick={handleAcceptInvite}
          disabled={loading}
          className="text-xs bg-correct/[0.06] ring-1 ring-correct/20 text-correct rounded px-3 py-1.5 hover:bg-correct hover:text-bg transition-all disabled:opacity-40"
        >
          Accept Invite
        </button>
      )}

      {/* Leave */}
      {isMember && !isLeader && (
        <button
          onClick={handleLeave}
          disabled={loading}
          className="text-xs text-error/60 hover:text-error transition-colors"
        >
          Leave Clan
        </button>
      )}

      {/* Disband */}
      {isLeader && (
        <button
          onClick={handleDisband}
          disabled={loading}
          className="text-xs text-error/60 hover:text-error transition-colors"
        >
          Disband
        </button>
      )}

      {message && <span className="text-xs text-muted">{message}</span>}
    </div>
  );
}
