"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";

interface ChatPanelProps {
  friendId: string;
  friendName: string;
  online: boolean;
  currentUserId: string;
}

export function ChatPanel({ friendId, friendName, online, currentUserId }: ChatPanelProps) {
  const { messages, closeChat, sendMessage, loadMore, hasMore, loadingHistory } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive (not when loading older)
  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loadingHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [friendId, loadingHistory]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={closeChat}
          className="text-muted hover:text-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.06]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              online
                ? "bg-correct shadow-[0_0_6px_rgba(63,185,80,0.5)]"
                : "bg-white/[0.12]"
            }`}
          />
          <span className="text-sm font-bold text-text truncate">{friendName}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMore}
              disabled={loadingHistory}
              className="text-xs text-muted/60 hover:text-muted transition-colors disabled:opacity-50"
            >
              {loadingHistory ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        {loadingHistory && messages.length === 0 && (
          <p className="text-xs text-muted/65 text-center py-8">Loading...</p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-xs text-muted/45">No messages yet</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isMine
                    ? "bg-accent/[0.12] text-text"
                    : "bg-surface text-text"
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p
                  className={`text-xs mt-0.5 tabular-nums ${
                    isMine ? "text-accent/55 text-right" : "text-muted/65"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            maxLength={500}
            className="flex-1 bg-surface/60 text-text text-sm rounded-md px-3 py-2 outline-none ring-1 ring-white/[0.06] focus:ring-accent/25 transition-all placeholder:text-muted/65"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-2.5 py-2 text-accent/60 hover:text-accent rounded-md text-sm transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/[0.04]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
