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
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-bg border-l border-white/[0.06] flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-text">Friends</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
                Pending Requests
              </h3>
              <div className="space-y-1.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between bg-surface rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-text truncate">
                      {req.username ?? req.name ?? "Unknown"}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => acceptRequest(req.id)}
                        className="text-xs text-correct hover:text-correct/80 font-bold px-1.5 py-0.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req.id)}
                        className="text-xs text-error hover:text-error/80 font-bold px-1.5 py-0.5"
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
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Add Friends
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-surface text-text text-sm rounded-lg px-3 py-2 outline-none border border-white/[0.06] focus:border-accent/40 transition-colors placeholder:text-muted/50"
            />
            {searching && (
              <p className="text-xs text-muted mt-2">Searching...</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {searchResults.map((user) => {
                  const isFriend = friendIds.has(user.userId);
                  const isSent = sentRequests.has(user.userId);
                  return (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between bg-surface rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-text truncate">
                        {user.username ?? user.name ?? "Unknown"}
                      </span>
                      {isFriend ? (
                        <span className="text-xs text-muted">Friends</span>
                      ) : isSent ? (
                        <span className="text-xs text-muted">Sent</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.userId)}
                          className="text-xs text-accent hover:text-accent/80 font-bold px-1.5 py-0.5"
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
                <p className="text-xs text-muted mt-2">No users found</p>
              )}
          </section>

          {/* Friends List */}
          <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Friends{" "}
              <span className="text-muted/60 tabular-nums">
                ({friends.length})
              </span>
            </h3>
            {loading ? (
              <p className="text-xs text-muted">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted">
                No friends yet. Search above to add someone!
              </p>
            ) : (
              <div className="space-y-1.5">
                {[...onlineFriends, ...offlineFriends].map((friend) => (
                  <div
                    key={friend.userId}
                    className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 group"
                  >
                    <Link
                      href={`/profile/${friend.username ?? friend.userId}`}
                      onClick={onClose}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          friend.online ? "bg-correct" : "bg-muted/30"
                        }`}
                      />
                      <span className="text-sm text-text hover:text-accent transition-colors truncate">
                        {friend.username ?? friend.name ?? "Unknown"}
                      </span>
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.userId)}
                      className="text-muted/0 group-hover:text-muted hover:!text-error transition-colors text-sm shrink-0 ml-2"
                      title="Remove friend"
                    >
                      &times;
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
