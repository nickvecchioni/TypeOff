"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";

interface Toast {
  id: string;
  title: string;
  icon: string;
}

export function AchievementToast() {
  const { on } = useSocket();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((data: { achievementId: string; title: string; icon: string }) => {
    const id = `${data.achievementId}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title: data.title, icon: data.icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    return on("achievementUnlocked", addToast);
  }, [on, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3 shadow-lg animate-fade-in"
        >
          <span className="text-2xl">{toast.icon}</span>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Achievement Unlocked</div>
            <div className="text-sm font-bold text-text">{toast.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
