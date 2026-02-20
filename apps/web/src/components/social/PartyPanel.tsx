"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocial } from "@/hooks/useSocial";
import { useParty, type PartyChatMessage } from "@/hooks/useParty";
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
  const { chatMessages, sendChatMessage } = useParty();
  const [showInvite, setShowInvite] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const myUserId = session?.user?.id;
  const isLeader = party?.leaderId === myUserId;

  useEffect(() => {
    if (showInvite) {
      fetchFriends();
    }
  }, [showInvite, fetchFriends]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

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

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (trimmed.length === 0) return;
    sendChatMessage(trimmed);
    setChatInput("");
  };

  return (
    <div className="w-full animate-fade-in">
      {error && (
        <div className="text-xs text-error mb-2 text-center">{error}</div>
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
            <span className="text-sm text-text">
              {member.name}
            </span>
            {member.userId === party.leaderId && (
              <span className="text-[0.6rem] text-accent font-bold uppercase">
                Lead
              </span>
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
      <div className="flex items-center justify-center gap-3 mt-3">
        {isLeader && party.members.length < 4 && (
          <>
            {showInvite ? (
              <div className="flex items-center gap-2 flex-wrap">
                {invitableFriends.length === 0 ? (
                  <span className="text-xs text-muted/50">No online friends</span>
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
        {party.members.length >= 2 && (
          <button
            onClick={() => setShowChat((v) => !v)}
            className={`text-xs transition-colors ${
              showChat ? "text-accent" : "text-muted/40 hover:text-muted"
            }`}
          >
            {showChat ? "Hide Chat" : "Chat"}
          </button>
        )}
        <button
          onClick={onLeave}
          className="text-xs text-muted/40 hover:text-error transition-colors"
        >
          Leave Party
        </button>
      </div>

      {/* Party Chat */}
      {showChat && party.members.length >= 2 && (
        <div className="mt-3 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden animate-fade-in">
          {/* Messages */}
          <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1">
            {chatMessages.length === 0 ? (
              <p className="text-[10px] text-muted/25 text-center py-2">
                No messages yet
              </p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className={`font-semibold ${
                    msg.senderId === myUserId ? "text-accent" : "text-text"
                  }`}>
                    {msg.senderId === myUserId ? "you" : msg.senderName}
                  </span>
                  <span className="text-muted/70 ml-1.5">{msg.message}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input */}
          <div className="border-t border-white/[0.04] px-3 py-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendChat();
                }
                e.stopPropagation();
              }}
              placeholder="Type a message..."
              maxLength={200}
              className="w-full bg-transparent text-xs text-text outline-none placeholder:text-muted/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
