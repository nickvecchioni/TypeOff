"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDm } from "@/hooks/useDm";
import { useSession } from "next-auth/react";

export function DirectMessageWindow() {
  const { data: session } = useSession();
  const { openConversation, closeDm, sendDm, loadMore } = useDm();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id;

  // Scroll to bottom when conversation opens or new message arrives
  useEffect(() => {
    if (openConversation && !openConversation.loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [openConversation?.messages.length, openConversation?.loading]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop === 0) loadMore();
  }, [loadMore]);

  const handleSend = useCallback(() => {
    const msg = draft.trim();
    if (!msg || !openConversation) return;
    sendDm(msg);
    setDraft("");
  }, [draft, openConversation, sendDm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!openConversation) return null;

  return (
    <div className="fixed bottom-14 right-4 z-50 flex flex-col w-72 rounded-lg overflow-hidden shadow-2xl animate-fade-in"
      style={{
        background: "#0d0d16",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
        <span className="text-xs font-bold text-text truncate">
          {openConversation.name}
        </span>
        <button
          onClick={closeDm}
          className="text-muted/40 hover:text-text w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06] transition-colors ml-2 shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
        style={{ height: 280 }}
      >
        {openConversation.loading && openConversation.messages.length === 0 && (
          <p className="text-[11px] text-muted/30 text-center py-6">Loading...</p>
        )}
        {!openConversation.loading && openConversation.messages.length === 0 && (
          <p className="text-[11px] text-muted/25 text-center py-6 leading-relaxed">
            No messages yet. Say hi!
          </p>
        )}
        {openConversation.messages.map((msg) => {
          const isMe = msg.fromUserId === myId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[10px] text-muted/40 mb-0.5 px-1">{msg.fromName}</span>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs break-words ${
                  isMe
                    ? "bg-accent/20 text-accent/90"
                    : "bg-white/[0.06] text-text"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t border-white/[0.06] shrink-0 flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 bg-white/[0.04] text-text text-xs rounded px-2.5 py-1.5 outline-none ring-1 ring-white/[0.06] focus:ring-accent/25 transition-all placeholder:text-muted/30 min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="shrink-0 rounded bg-accent/20 hover:bg-accent/30 text-accent px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
