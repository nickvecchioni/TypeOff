"use client";

import { useEffect, useState, useCallback } from "react";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_ICONS: Record<string, string> = {
  friend_request: "👋",
  achievement: "🏆",
  challenge_complete: "✅",
  rank_up: "⬆️",
  rank_down: "⬇️",
};

interface ToastItem {
  id: string;
  type: string;
  title: string;
  body: string;
  visible: boolean;
}

export function NotificationToast() {
  const { latestToast, clearToast } = useNotifications();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!latestToast) return;
    const item: ToastItem = {
      id: latestToast.id,
      type: latestToast.type,
      title: latestToast.title,
      body: latestToast.body,
      visible: true,
    };
    setToasts((prev) => [...prev.slice(-2), item]);

    // Auto-dismiss after 5s
    const fadeTimer = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, visible: false } : t))
      );
    }, 4500);

    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
      clearToast(item.id);
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [latestToast, clearToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearToast(id);
  }, [clearToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto max-w-xs rounded-lg bg-surface/90 backdrop-blur-sm ring-1 ring-white/[0.08] px-3 py-2.5 shadow-lg transition-all duration-500 ${
            toast.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          }`}
          style={{ animation: toast.visible ? "slide-in-right 0.3s ease-out" : undefined }}
        >
          <div className="flex items-start gap-2">
            <span className="text-sm shrink-0">{TYPE_ICONS[toast.type] ?? "📌"}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-text truncate">{toast.title}</div>
              <div className="text-[11px] text-muted/60 truncate">{toast.body}</div>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted/60 hover:text-muted transition-colors shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
