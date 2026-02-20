"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSocial } from "@/hooks/useSocial";
import { useChat } from "@/hooks/useChat";
import { useParty } from "@/hooks/useParty";
import { ChatPanel } from "./ChatPanel";

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
  const { data: session } = useSession();
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
  const { activeChat, openChat, closeChat, unreadCounts } = useChat();
  const { party, inviteToParty } = useParty();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ userId: string; username: string | null; name: string | null }>
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

  // Close chat when drawer closes
  useEffect(() => {
    if (!open && activeChat) {
      closeChat();
    }
  }, [open, activeChat, closeChat]);

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
      if (ok) {
        setSentRequests((prev) => new Set(prev).add(userId));
      }
    },
    [sendRequest],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeChat) {
          closeChat();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, activeChat, closeChat]);

  const friendIds = new Set(friends.map((f) => f.userId));
  const onlineFriends = friends.filter((f) => f.online);
  const offlineFriends = friends.filter((f) => !f.online);

  const myUserId = session?.user?.id;
  const isPartyLeader = party != null && party.leaderId === myUserId;
  const partyMemberIds = new Set(party?.members.map((m) => m.userId) ?? []);
  const canInvite = isPartyLeader && (party?.members.length ?? 0) < 4;

  // Find active chat friend info
  const activeFriend = activeChat
    ? friends.find((f) => f.userId === activeChat)
    : null;

  const renderFriendRow = (friend: (typeof friends)[0]) => {
    const unread = unreadCounts.get(friend.userId) ?? 0;
    const isOnline = friend.online;

    return (
      <div
        key={friend.userId}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-white/[0.04] transition-colors group cursor-pointer"
        onClick={() => openChat(friend.userId)}
      >
        {/* Online indicator */}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isOnline
              ? "bg-correct shadow-[0_0_6px_rgba(63,185,80,0.5)]"
              : "bg-white/[0.12]"
          }`}
        />

        {/* Name + last seen */}
        <span
          className={`text-sm truncate flex-1 ${
            isOnline ? "text-text" : "text-muted"
          } group-hover:text-text transition-colors`}
        >
          {friend.username ?? friend.name ?? "Unknown"}
          {!isOnline && friend.lastSeen && (
            <span className="text-[10px] text-muted/40 ml-1.5">
              {formatLastSeen(friend.lastSeen)}
            </span>
          )}
        </span>

        {/* Right side: unread badge OR hover actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canInvite && isOnline && !partyMemberIds.has(friend.userId) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                inviteToParty(friend.userId);
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-accent/70 hover:text-accent px-1.5 py-0.5 rounded border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all"
              title="Invite to party"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Invite
            </button>
          )}
          {friend.raceId && (
            <Link
              href={`/spectate?raceId=${friend.raceId}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-accent/70 hover:text-accent px-1.5 py-0.5 rounded border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all"
              title="Watch this race"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Watch
            </Link>
          )}
          {unread > 0 ? (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-bg text-[10px] font-bold tabular-nums px-1">
              {unread}
            </span>
          ) : (
            /* Chat icon — visible on hover */
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/[0.06] group-hover:text-muted transition-colors"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
          <Link
            href={`/profile/${friend.username ?? friend.userId}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-all w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06]"
            title="View profile"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFriend(friend.userId);
            }}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all w-5 h-5 flex items-center justify-center rounded hover:bg-error/10"
            title="Remove friend"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-80 bg-bg border-l border-white/[0.06] flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Chat view */}
        {activeChat && activeFriend && session?.user?.id ? (
          <ChatPanel
            friendId={activeChat}
            friendName={activeFriend.username ?? activeFriend.name ?? "Unknown"}
            online={activeFriend.online ?? false}
            currentUserId={session.user.id}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-xs font-bold text-muted uppercase tracking-widest">
                Friends
              </h2>
              <button
                onClick={onClose}
                className="text-muted hover:text-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.06]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search — fixed below header */}
            <div className="px-3 py-2.5 border-b border-white/[0.04]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Find or add friends..."
                className="w-full bg-surface/60 text-text text-sm rounded-md px-3 py-2 outline-none ring-1 ring-white/[0.06] focus:ring-accent/25 transition-all placeholder:text-muted/30"
              />
              {/* Search results dropdown */}
              {(searching || searchResults.length > 0 || (searchQuery.length >= 2 && !searching && searchResults.length === 0)) && (
                <div className="mt-2 rounded-md bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
                  {searching && (
                    <p className="text-xs text-muted/50 px-3 py-2.5">Searching...</p>
                  )}
                  {searchResults.map((user) => {
                    const isFriend = friendIds.has(user.userId);
                    const isSent = sentRequests.has(user.userId);
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-sm text-text truncate">
                          {user.username ?? user.name ?? "Unknown"}
                        </span>
                        {isFriend ? (
                          <span className="text-[10px] text-muted/40 uppercase tracking-wider">Friends</span>
                        ) : isSent ? (
                          <span className="text-[10px] text-correct/50 uppercase tracking-wider">Sent</span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user.userId)}
                            className="text-xs text-accent hover:text-accent font-bold px-2 py-0.5 rounded hover:bg-accent/10 transition-colors"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-muted/40 px-3 py-2.5">No users found</p>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Pending requests banner */}
              {pendingRequests.length > 0 && (
                <div className="px-3 py-2.5 border-b border-white/[0.04]">
                  <h3 className="text-[10px] font-bold text-accent/70 uppercase tracking-widest mb-2">
                    Requests
                    <span className="text-accent/40 tabular-nums ml-1">
                      {pendingRequests.length}
                    </span>
                  </h3>
                  <div className="space-y-1">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 bg-accent/[0.04] ring-1 ring-accent/[0.08]"
                      >
                        <span className="text-sm text-text truncate">
                          {req.username ?? req.name ?? "Unknown"}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => acceptRequest(req.id)}
                            className="text-[11px] text-correct hover:bg-correct/10 font-bold px-2 py-0.5 rounded transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineRequest(req.id)}
                            className="text-[11px] text-muted/50 hover:text-error hover:bg-error/10 font-bold px-2 py-0.5 rounded transition-colors"
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
                <div className="px-1.5 pt-2.5">
                  <h3 className="text-[10px] font-bold text-muted/50 uppercase tracking-widest px-3 mb-1">
                    Online
                    <span className="tabular-nums ml-1">{onlineFriends.length}</span>
                  </h3>
                  {onlineFriends.map(renderFriendRow)}
                </div>
              )}

              {/* Offline / All friends */}
              <div className="px-1.5 pt-2.5 pb-4">
                <h3 className="text-[10px] font-bold text-muted/50 uppercase tracking-widest px-3 mb-1">
                  {onlineFriends.length > 0 ? "Offline" : "Friends"}
                  <span className="tabular-nums ml-1">
                    {onlineFriends.length > 0 ? offlineFriends.length : friends.length}
                  </span>
                </h3>
                {loading ? (
                  <p className="text-xs text-muted/30 px-3 py-4">Loading...</p>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-muted/25 px-3 py-6 leading-relaxed">
                    No friends yet. Search above to add someone.
                  </p>
                ) : offlineFriends.length === 0 && onlineFriends.length > 0 ? (
                  <p className="text-xs text-muted/25 px-3 py-2">Everyone&apos;s online!</p>
                ) : (
                  offlineFriends.map(renderFriendRow)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
