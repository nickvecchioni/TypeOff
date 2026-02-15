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
    <div className="w-full bg-surface rounded-lg overflow-hidden flex flex-col" style={{ height: "200px" }}>
      <div className="px-3 py-2 text-xs text-muted font-bold uppercase tracking-wider border-b border-bg">
        Chat
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
      >
        {messages.length === 0 && (
          <div className="text-xs text-muted italic">No messages yet</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="text-accent font-bold">{msg.name}: </span>
            <span className="text-text">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-bg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 text-sm text-accent font-bold hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
