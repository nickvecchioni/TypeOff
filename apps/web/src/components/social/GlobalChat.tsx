"use client";

import React, { useRef, useEffect, useState } from "react";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { useSession } from "next-auth/react";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { GLOBAL_CHAT_MAX_LENGTH } from "@typeoff/shared";

export function GlobalChat() {
  const { messages, sendMessage } = useGlobalChat();
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAuthed = !!session?.user?.id;

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const handleSend = () => {
    if (!input.trim() || !isAuthed) return;
    sendMessage(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Prevent typing shortcuts from leaking to the game
    e.stopPropagation();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          className="w-72 sm:w-80 rounded-xl bg-surface ring-1 ring-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "360px", animation: "slide-up 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-bold text-text">Global Chat</span>
            <button onClick={() => setOpen(false)} className="text-muted/40 hover:text-muted transition-colors text-sm leading-none px-1">
              &times;
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
            {messages.map((msg) => {
              const isMe = msg.userId === session?.user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <CosmeticBadge badge={msg.activeBadge} />
                    <span className="text-[10px] font-bold text-muted/60">
                      <CosmeticName nameColor={isMe ? null : msg.activeNameColor} nameEffect={null}>
                        {msg.username}
                      </CosmeticName>
                    </span>
                    <span className="text-[9px] text-muted/30">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`rounded-lg px-2.5 py-1.5 max-w-[90%] ${
                    isMe
                      ? "bg-accent/[0.12] ring-1 ring-accent/20 text-accent"
                      : "bg-white/[0.05] ring-1 ring-white/[0.05] text-text"
                  }`}>
                    <p className="text-xs break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-xs text-muted/40 text-center mt-4">No messages yet</p>
            )}
          </div>

          <div className="border-t border-white/[0.06] p-2">
            {isAuthed ? (
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, GLOBAL_CHAT_MAX_LENGTH))}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something..."
                  className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-muted/40 outline-none ring-1 ring-white/[0.06] focus:ring-accent/30 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="rounded-lg bg-accent/[0.08] ring-1 ring-accent/20 text-accent px-2.5 py-1.5 text-xs hover:bg-accent hover:text-bg transition-all disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted/40 text-center py-1">Sign in to chat</p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-surface ring-1 ring-white/[0.08] px-3 py-2 text-xs font-medium text-muted hover:text-text hover:ring-accent/20 transition-all shadow-lg"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Chat
      </button>
    </div>
  );
}
