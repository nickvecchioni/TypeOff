"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLobbyChat } from "@/hooks/useLobbyChat";

export function LobbyChat() {
  const { messages, sendMessage } = useLobbyChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 text-xs text-muted font-bold uppercase tracking-wider border-b border-white/[0.04]">
        Chat
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-xs text-muted/50 italic">No messages yet</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="text-accent font-medium">{msg.name}</span>
            <span className="text-muted mx-1.5">:</span>
            <span className="text-text/80">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-white/[0.04]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-transparent px-4 py-2.5 text-sm text-text placeholder:text-muted/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 text-sm text-accent font-bold hover:text-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
