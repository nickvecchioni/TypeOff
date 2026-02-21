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
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLeader = party?.leaderId === session?.user?.id;

  useEffect(() => {
    if (showInvite) fetchFriends();
  }, [showInvite, fetchFriends]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

  if (!party) {
    return (
      <button
        onClick={onCreateParty}
        className="text-sm text-muted hover:text-accent transition-colors"
      >
        Create Party
      </button>
    );
  }

  const invitableFriends = friends.filter(
    (f) => f.online && !party.members.some((m) => m.userId === f.userId),
  );
  const emptySlots = 4 - party.members.length;
  const myUserId = session?.user?.id;

  return (
    <div className="w-full animate-fade-in flex flex-col gap-3">
      {error && (
        <div className="text-xs text-error text-center">{error}</div>
      )}

      {/* Member row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {party.members.map((member) => {
          const isReady = party.readyState[member.userId] ?? false;
          const isMemberLeader = member.userId === party.leaderId;
          return (
            <div
              key={member.userId}
              className="group relative flex items-center gap-1.5 bg-surface/80 ring-1 ring-white/[0.06] rounded-lg px-3 py-1.5"
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isMemberLeader ? "bg-correct" : isReady ? "bg-correct" : "bg-white/[0.12]"
              }`} />
              <span className="text-sm text-text">{member.name}</span>
              {isMemberLeader && (
                <span className="text-[0.6rem] text-accent font-bold uppercase">Lead</span>
              )}
              {isLeader && member.userId !== myUserId && (
                <button
                  onClick={() => onKick(member.userId)}
                  className="text-muted/0 group-hover:text-muted hover:!text-error transition-colors text-sm ml-0.5"
                  title="Kick"
                >
                  &times;
                </button>
              )}
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/[0.06] px-3 py-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted/20" />
            <span className="text-sm text-muted/20">---</span>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-center gap-3">
        {isLeader && party.members.length < 4 && (
          <>
            {showInvite ? (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {invitableFriends.length === 0 ? (
                  <span className="text-xs text-muted/65">No online friends</span>
                ) : (
                  invitableFriends.map((friend) => (
                    <button
                      key={friend.userId}
                      onClick={() => {
                        onInvite(friend.userId);
                        setShowInvite(false);
                      }}
                      className="text-xs bg-surface/80 ring-1 ring-white/[0.06] rounded px-2.5 py-1 text-text hover:ring-accent/30 transition-colors"
                    >
                      + {friend.username ?? friend.name ?? "Unknown"}
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInvite(true)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                + Invite
              </button>
            )}
          </>
        )}
        <button
          onClick={onLeave}
          className="text-xs text-muted/60 hover:text-error transition-colors"
        >
          Leave Party
        </button>
      </div>

      {/* ── Party Chat ───────────────────────────────────────────── */}
      <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.05] overflow-hidden">
        {/* Message list */}
        <div className="h-28 overflow-y-auto px-3 py-2 flex flex-col gap-1 scroll-smooth">
          {messages.length === 0 ? (
            <p className="text-[11px] text-muted/45 italic m-auto select-none">
              Say something to your party!
            </p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.userId === myUserId;
              return (
                <div
                  key={i}
                  className="text-[12px] leading-snug"
                  style={{ animation: "fade-in 0.15s ease-out both" }}
                >
                  <span
                    className={`font-semibold mr-1 ${
                      isMe ? "text-accent" : "text-muted/70"
                    }`}
                  >
                    {isMe ? "you" : msg.name}
                  </span>
                  <span className="text-text/80 break-words">{msg.message}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center border-t border-white/[0.05]"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 150))}
            placeholder="Message..."
            className="flex-1 bg-transparent text-[12px] text-text placeholder:text-muted/45 px-3 py-2 outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-3 py-2 text-[11px] text-accent/60 hover:text-accent disabled:opacity-25 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
