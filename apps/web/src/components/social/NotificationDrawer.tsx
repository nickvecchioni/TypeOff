"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_ICONS: Record<string, string> = {
  friend_request: "\u{1F44B}",
  achievement: "\u{1F3C6}",
  challenge_complete: "\u2705",
  rank_up: "\u2B06\uFE0F",
  rank_down: "\u2B07\uFE0F",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DURATION = 200;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { notifications, fetchNotifications, markAsRead, markAllRead, unreadCount } = useNotifications();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  // Mount when open becomes true, start close animation before unmounting
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, DURATION);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 w-80 h-full z-50 bg-bg/95 backdrop-blur-sm border-l border-white/[0.06] flex flex-col"
        style={{
          animation: `${closing ? "slide-out-right" : "slide-in-right"} ${DURATION}ms ease-out ${closing ? "forwards" : ""}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-text">Notifications</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-accent hover:text-accent/80 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted hover:text-text transition-colors p-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted/40">
              No notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                className={`w-full text-left px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                  !notif.read ? "bg-accent/[0.03]" : ""
                }`}
                onClick={() => {
                  if (!notif.read) markAsRead([notif.id]);
                  if (notif.actionUrl) {
                    router.push(notif.actionUrl);
                    onClose();
                  }
                }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">
                    {TYPE_ICONS[notif.type] ?? "\u{1F4CC}"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium truncate ${
                        notif.read ? "text-muted" : "text-text"
                      }`}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted/60 truncate mt-0.5">
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-muted/40 tabular-nums mt-0.5 block">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
