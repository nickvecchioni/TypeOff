"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocial } from "@/hooks/useSocial";
import { useParty } from "@/hooks/useParty";
import type { PartyState } from "@typeoff/shared";

interface PartyPanelProps {
  party: PartyState | null;
  error: string | null;
  onCreateParty: () => void;
  onInvite: (userId: string) => void;
  onKick: (userId: string) => void;
  onLeave: () => void;
}

export function PartyPanel({
  party,
  error,
  onCreateParty,
  onInvite,
  onKick,
  onLeave,
}: PartyPanelProps) {
  const { data: session } = useSession();
  const { friends, fetchFriends } = useSocial();
  const { messages, sendMessage } = useParty();
  const [showInvite, setShowInvite] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenCount = useRef(0);

  const isLeader = party?.leaderId === session?.user?.id;
  const myUserId = session?.user?.id;

  // Track unread messages when chat is closed
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
      lastSeenCount.current = messages.length;
    } else if (messages.length > lastSeenCount.current) {
      setUnreadCount(messages.length - lastSeenCount.current);
    }
  }, [messages.length, showChat]);

  useEffect(() => {
    if (showInvite) fetchFriends();
  }, [showInvite, fetchFriends]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close chat on click outside
  useEffect(() => {
    if (!showChat) return;
    function handleClick(e: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setShowChat(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showChat]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

  if (!party) {
    return null;
  }

  const invitableFriends = friends.filter(
    (f) => f.online && !party.members.some((m) => m.userId === f.userId),
  );
  const emptySlots = 4 - party.members.length;

  return (
    <div className="w-full animate-fade-in">
      {error && (
        <div className="text-xs text-error text-center mb-1">{error}</div>
      )}

      {/* Compact party bar */}
      <div className="flex items-center gap-1.5 justify-center flex-wrap">
        {/* Members */}
        {party.members.map((member) => {
          const isReady = party.readyState[member.userId] ?? false;
          const isMemberLeader = member.userId === party.leaderId;
          return (
            <div
              key={member.userId}
              className="group relative flex items-center gap-1 bg-surface/60 ring-1 ring-white/[0.06] rounded-md px-2 py-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isMemberLeader || isReady ? "bg-correct" : "bg-white/[0.12]"
              }`} />
              <span className="text-xs text-text font-medium">{member.name}</span>
              {isMemberLeader && (
                <span className="text-[0.55rem] text-accent font-bold uppercase leading-none">L</span>
              )}
              {isLeader && member.userId !== myUserId && (
                <button
                  onClick={() => onKick(member.userId)}
                  className="text-muted/0 group-hover:text-muted hover:!text-error transition-colors text-xs ml-0.5 leading-none"
                  title="Kick"
                >
                  &times;
                </button>
              )}
            </div>
          );
        })}

        {/* Empty slots (subtle) */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center rounded-md border border-dashed border-white/[0.05] px-2 py-1"
          >
            <span className="text-xs text-muted/30">—</span>
          </div>
        ))}

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.06] mx-0.5" />

        {/* Action buttons */}
        {isLeader && party.members.length < 4 && (
          <div className="relative">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-1 text-xs text-accent/70 hover:text-accent transition-colors px-1.5 py-1 rounded-md hover:bg-accent/[0.06]"
              title="Invite friend"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-80">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Invite</span>
            </button>

            {/* Invite dropdown */}
            {showInvite && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-surface ring-1 ring-white/[0.08] rounded-lg shadow-xl p-2 min-w-[140px] animate-fade-in">
                {invitableFriends.length === 0 ? (
                  <span className="text-xs text-muted/55 px-1">No online friends</span>
                ) : (
                  invitableFriends.map((friend) => (
                    <button
                      key={friend.userId}
                      onClick={() => {
                        onInvite(friend.userId);
                        setShowInvite(false);
                      }}
                      className="flex items-center gap-1.5 w-full text-left text-xs text-text/80 hover:text-text hover:bg-white/[0.04] rounded px-2 py-1.5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-correct shrink-0" />
                      {friend.username ?? "Unknown"}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat toggle */}
        <div className="relative" ref={chatRef}>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-1 text-xs px-1.5 py-1 rounded-md transition-colors ${
              showChat
                ? "text-accent bg-accent/[0.08]"
                : "text-muted/60 hover:text-muted hover:bg-white/[0.04]"
            }`}
            title="Party chat"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-80">
              <path d="M2 3h12v8H5l-3 3V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {unreadCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-accent text-bg text-[0.6rem] font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Chat popover */}
          {showChat && (
            <div className="absolute bottom-full right-0 mb-2 z-50 w-72 rounded-lg bg-surface ring-1 ring-white/[0.08] shadow-xl overflow-hidden animate-fade-in">
              {/* Messages */}
              <div className="h-36 overflow-y-auto px-3 py-2 flex flex-col gap-1 scroll-smooth">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted/40 italic m-auto select-none">
                    Say something to your party!
                  </p>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.userId === myUserId;
                    return (
                      <div key={i} className="text-xs leading-snug">
                        <span className={`font-semibold mr-1 ${isMe ? "text-accent" : "text-muted/65"}`}>
                          {isMe ? "you" : msg.name}
                        </span>
                        <span className="text-text/75 break-words">{msg.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center border-t border-white/[0.06]"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 150))}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-xs text-text placeholder:text-muted/40 px-3 py-2 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="px-2.5 py-2 text-xs text-accent/50 hover:text-accent disabled:opacity-25 transition-colors shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="text-xs text-muted/40 hover:text-error transition-colors px-1.5 py-1 rounded-md hover:bg-error/[0.06]"
          title="Leave party"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-80">
            <path d="M6 2H3v12h3M11 4l4 4-4 4M7 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
