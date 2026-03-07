"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSocial } from "@/hooks/useSocial";
import { useParty } from "@/hooks/useParty";
import { useDm } from "@/hooks/useDm";

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

interface FriendsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsDrawer({ open, onClose }: FriendsDrawerProps) {
  const {
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
  } = useSocial();
  const { party, inviteToParty } = useParty();
  const { openDm, unreadFrom } = useDm();

  const panelRef = useRef<HTMLDivElement>(null);

  // Clamp panel so it doesn't overflow the right edge of the viewport
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const rect = el.getBoundingClientRect();
    const overflow = rect.right - window.innerWidth + 8; // 8px margin
    if (overflow > 0) {
      el.style.transform = `translateX(-${overflow}px)`;
    } else {
      el.style.transform = "";
    }
  }, [open]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ userId: string; username: string | null }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      fetchFriends();
      fetchRequests();
    }
  }, [open, fetchFriends, fetchRequests]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        const results = await searchUsers(query);
        setSearchResults(results);
        setSearching(false);
      }, 300);
    },
    [searchUsers],
  );

  const handleSendRequest = useCallback(
    async (userId: string) => {
      const ok = await sendRequest(userId);
      if (ok) setSentRequests((prev) => new Set(prev).add(userId));
    },
    [sendRequest],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const friendIds = new Set(friends.map((f) => f.userId));
  const onlineFriends = friends.filter((f) => f.online);
  const offlineFriends = friends.filter((f) => !f.online);
  const partyMemberIds = new Set(party?.members.map((m) => m.userId) ?? []);
  const partyFull = (party?.members.length ?? 0) >= 4;

  const renderFriendRow = (friend: (typeof friends)[0]) => {
    const isOnline = friend.online;
    const canInviteToParty = isOnline && !partyMemberIds.has(friend.userId) && !partyFull;
    const profileHref = `/profile/${friend.username ?? friend.userId}`;

    return (
      <div
        key={friend.userId}
        className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors group"
      >
        {/* Status dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isOnline
              ? "bg-[#3fb950] shadow-[0_0_6px_rgba(63,185,80,0.6)]"
              : "bg-white/[0.15]"
          }`}
        />

        {/* Name — links to profile */}
        <Link
          href={profileHref}
          onClick={onClose}
          className={`text-sm flex-1 truncate transition-colors hover:text-accent ${
            isOnline ? "text-text" : "text-muted"
          }`}
        >
          {friend.username ?? "Unknown"}
          {!isOnline && friend.lastSeen && (
            <span className="text-xs text-muted/60 ml-1.5">
              {formatLastSeen(friend.lastSeen)}
            </span>
          )}
        </Link>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {friend.raceId && (
            <Link
              href={`/spectate?raceId=${friend.raceId}`}
              onClick={onClose}
              className="text-xs font-bold text-accent/70 hover:text-accent px-1.5 py-0.5 rounded border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all"
              title="Watch race"
            >
              LIVE
            </Link>
          )}
          {canInviteToParty && (
            <button
              onClick={() => inviteToParty(friend.userId)}
              className="text-accent/70 hover:text-accent w-6 h-6 flex items-center justify-center rounded border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all"
              title="Invite to party"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              openDm(friend.userId, friend.username ?? "Unknown");
              onClose();
            }}
            className={`relative w-6 h-6 flex items-center justify-center rounded border transition-all ${
              unreadFrom.has(friend.userId)
                ? "text-accent border-accent/40 bg-accent/10"
                : "text-accent/70 hover:text-accent border-accent/20 hover:border-accent/40 hover:bg-accent/10"
            }`}
            title="Send message"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadFrom.has(friend.userId) && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>
          <button
            onClick={() => removeFriend(friend.userId)}
            className="text-muted/60 hover:text-error w-5 h-5 flex items-center justify-center rounded hover:bg-error/10 transition-all"
            title="Remove friend"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      {/* Invisible backdrop for click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown panel */}
      <div
        ref={panelRef}
        className="absolute top-full left-0 mt-2 w-80 z-50 flex flex-col overflow-hidden"
        style={{
          background: "#0d0d16",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset",
          maxHeight: "520px",
          animation: "dropdown-in 150ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted/60 uppercase tracking-widest">Friends</span>
            <span className="text-xs text-muted/65 tabular-nums">{friends.length}</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted/60 hover:text-text transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/65 pointer-events-none"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Find or add friends..."
              className="w-full bg-white/[0.04] text-text text-xs rounded px-3 py-1.5 pl-7 outline-none ring-1 ring-white/[0.06] focus:ring-accent/25 transition-all placeholder:text-muted/65"
            />
          </div>
          {(searching || searchResults.length > 0 || (searchQuery.length >= 2 && !searching && searchResults.length === 0)) && (
            <div className="mt-1.5 rounded bg-white/[0.03] ring-1 ring-white/[0.04] overflow-hidden">
              {searching && (
                <p className="text-xs text-muted/65 px-3 py-2">Searching...</p>
              )}
              {searchResults.map((user) => {
                const isFriend = friendIds.has(user.userId);
                const isSent = sentRequests.has(user.userId);
                return (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
                  >
                    <Link
                      href={`/profile/${user.username ?? user.userId}`}
                      onClick={onClose}
                      className="text-xs text-text hover:text-accent truncate transition-colors"
                    >
                      {user.username ?? "Unknown"}
                    </Link>
                    {isFriend ? (
                      <span className="text-xs text-muted/60 uppercase tracking-wider ml-2 shrink-0">Friends</span>
                    ) : isSent ? (
                      <span className="text-xs text-[#3fb950]/50 uppercase tracking-wider ml-2 shrink-0">Sent</span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.userId)}
                        className="text-xs font-bold text-accent hover:bg-accent/10 px-2 py-0.5 rounded transition-colors ml-2 shrink-0 uppercase tracking-wider"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted/60 px-3 py-2">No users found</p>
              )}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="border-b border-white/[0.04] py-2">
              <p className="text-xs font-bold text-accent/60 uppercase tracking-widest px-3.5 mb-1.5">
                Requests <span className="text-accent/40 tabular-nums">{pendingRequests.length}</span>
              </p>
              <div className="px-2 space-y-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded px-2.5 py-1.5 bg-accent/[0.05] ring-1 ring-accent/[0.1]"
                  >
                    <Link
                      href={`/profile/${req.username ?? req.requesterId}`}
                      onClick={onClose}
                      className="text-xs text-text hover:text-accent truncate transition-colors"
                    >
                      {req.username ?? "Unknown"}
                    </Link>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => acceptRequest(req.id)}
                        className="text-xs font-bold text-[#3fb950] hover:bg-[#3fb950]/10 px-2 py-0.5 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req.id)}
                        className="text-xs text-muted/65 hover:text-error hover:bg-error/10 font-bold px-2 py-0.5 rounded transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Online friends */}
          {onlineFriends.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-bold text-muted/60 uppercase tracking-widest px-3.5 mb-1">
                Online <span className="tabular-nums">{onlineFriends.length}</span>
              </p>
              {onlineFriends.map(renderFriendRow)}
            </div>
          )}

          {/* Offline friends */}
          <div className="pt-2 pb-2">
            <p className="text-xs font-bold text-muted/65 uppercase tracking-widest px-3.5 mb-1">
              {onlineFriends.length > 0 ? "Offline" : "Friends"}{" "}
              <span className="tabular-nums">
                {onlineFriends.length > 0 ? offlineFriends.length : friends.length}
              </span>
            </p>
            {loading ? (
              <p className="text-xs text-muted/65 px-3.5 py-3">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted/45 px-3.5 py-4 leading-relaxed">
                No friends yet. Search above to add someone.
              </p>
            ) : offlineFriends.length === 0 && onlineFriends.length > 0 ? (
              <p className="text-xs text-muted/45 px-3.5 py-2">Everyone is online!</p>
            ) : (
              offlineFriends.map(renderFriendRow)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
