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
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-surface-bright/40">
        <button
          onClick={closeChat}
          className="text-muted hover:text-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.08]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              online
                ? "bg-correct shadow-[0_0_6px_rgba(63,185,80,0.4)]"
                : "bg-white/[0.1]"
            }`}
          />
          <span className="text-sm font-bold text-text truncate">{friendName}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMore}
              disabled={loadingHistory}
              className="text-xs text-muted hover:text-accent transition-colors disabled:opacity-50"
            >
              {loadingHistory ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        {loadingHistory && messages.length === 0 && (
          <p className="text-xs text-muted/50 text-center py-8">Loading...</p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <p className="text-xs text-muted/40 text-center py-8">
            No messages yet. Say hi!
          </p>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isMine
                    ? "bg-accent/20 text-text"
                    : "bg-white/[0.06] text-text"
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 tabular-nums ${
                    isMine ? "text-accent/40" : "text-muted/40"
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
      <div className="px-3 py-3 border-t border-white/[0.08]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 bg-bg text-text text-sm rounded-lg px-3 py-2.5 outline-none ring-1 ring-white/[0.08] focus:ring-accent/30 focus:bg-white/[0.03] transition-colors placeholder:text-muted/40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
