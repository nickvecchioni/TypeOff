"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useDm } from "@/hooks/useDm";

const TYPE_ICONS: Record<string, string> = {
  dm: "💬",
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
  metadata?: string;
  visible: boolean;
}

export function NotificationToast() {
  const { toastQueue, clearToast } = useNotifications();
  const { openDm } = useDm();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const processedIds = useRef(new Set<string>());

  useEffect(() => {
    for (const notif of toastQueue) {
      if (processedIds.current.has(notif.id)) continue;
      processedIds.current.add(notif.id);

      const item: ToastItem = {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        metadata: notif.metadata,
        visible: true,
      };

      setToasts((prev) => [...prev.slice(-2), item]);

      const id = notif.id;

      // Fire-and-forget timers — not returned as cleanup so a new toast
      // arriving doesn't cancel the dismiss timer of an existing one.
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
        );
      }, 4500);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        clearToast(id);
        processedIds.current.delete(id);
      }, 5000);
    }
  }, [toastQueue, clearToast]);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      clearToast(id);
      processedIds.current.delete(id);
    },
    [clearToast]
  );

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
          <div
            className={`flex items-start gap-2${toast.type === "dm" ? " cursor-pointer" : ""}`}
            onClick={() => {
              if (toast.type === "dm" && toast.metadata) {
                try {
                  const meta = JSON.parse(toast.metadata);
                  if (meta.userId) {
                    openDm(meta.userId, meta.name ?? "Unknown");
                    dismiss(toast.id);
                  }
                } catch {}
              }
            }}
          >
            <span className="text-sm shrink-0">{TYPE_ICONS[toast.type] ?? "📌"}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-text truncate">{toast.title}</div>
              <div className="text-xs text-muted/60 truncate">{toast.body}</div>
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
