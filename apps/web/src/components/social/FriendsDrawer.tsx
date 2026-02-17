"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSocial } from "@/hooks/useSocial";

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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const friendIds = new Set(friends.map((f) => f.userId));
  const onlineFriends = friends.filter((f) => f.online);
  const offlineFriends = friends.filter((f) => !f.online);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2.5">
                Pending Requests
              </h3>
              <div className="space-y-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                  >
                    <span className="text-sm text-text truncate font-medium">
                      {req.username ?? req.name ?? "Unknown"}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => acceptRequest(req.id)}
                        className="text-xs text-correct hover:bg-correct/10 font-bold px-2 py-1 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req.id)}
                        className="text-xs text-muted hover:text-error hover:bg-error/10 font-bold px-2 py-1 rounded transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Search */}
          <section>
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2.5">
              Add Friends
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-white/[0.04] text-text text-sm rounded-lg px-3 py-2.5 outline-none border border-white/[0.06] focus:border-accent/30 focus:bg-white/[0.06] transition-colors placeholder:text-muted/40"
            />
            {searching && (
              <p className="text-xs text-muted/60 mt-2">Searching...</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map((user) => {
                  const isFriend = friendIds.has(user.userId);
                  const isSent = sentRequests.has(user.userId);
                  return (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="text-sm text-text truncate">
                        {user.username ?? user.name ?? "Unknown"}
                      </span>
                      {isFriend ? (
                        <span className="text-xs text-muted/50">Friends</span>
                      ) : isSent ? (
                        <span className="text-xs text-muted/50">Sent</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.userId)}
                          className="text-xs text-accent hover:bg-accent/10 font-bold px-2 py-1 rounded transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {searchQuery.length >= 2 &&
              !searching &&
              searchResults.length === 0 && (
                <p className="text-xs text-muted/50 mt-2">No users found</p>
              )}
          </section>

          {/* Friends List */}
          <section>
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2.5">
              Friends{" "}
              <span className="text-muted/40 tabular-nums">
                ({friends.length})
              </span>
            </h3>
            {loading ? (
              <p className="text-xs text-muted/50">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted/50">
                No friends yet. Search above to add someone!
              </p>
            ) : (
              <div className="space-y-0.5">
                {[...onlineFriends, ...offlineFriends].map((friend) => (
                  <div
                    key={friend.userId}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/[0.04] transition-colors group"
                  >
                    <Link
                      href={`/profile/${friend.username ?? friend.userId}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          friend.online
                            ? "bg-correct shadow-[0_0_6px_rgba(63,185,80,0.4)]"
                            : "bg-white/[0.1]"
                        }`}
                      />
                      <span className="text-sm text-text hover:text-accent transition-colors truncate">
                        {friend.username ?? friend.name ?? "Unknown"}
                      </span>
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.userId)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all text-sm shrink-0 ml-2 w-5 h-5 flex items-center justify-center rounded hover:bg-error/10"
                      title="Remove friend"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
