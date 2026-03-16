"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { useDm } from "@/hooks/useDm";

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

function NotifIcon({ type }: { type: string }) {
  const cls = "shrink-0 mt-0.5";
  switch (type) {
    case "dm":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "friend_request":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      );
    case "achievement":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "challenge_complete":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "rank_up":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case "rank_down":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    default:
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

function notifIconColor(type: string): string {
  switch (type) {
    case "dm": return "text-accent";
    case "friend_request": return "text-accent";
    case "achievement": return "text-yellow-400";
    case "challenge_complete": return "text-[#3fb950]";
    case "rank_up": return "text-[#3fb950]";
    case "rank_down": return "text-error";
    default: return "text-muted/60";
  }
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { notifications, fetchNotifications, markAsRead, clearAll, unreadCount } = useNotifications();
  const { openDm } = useDm();
  const router = useRouter();

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Invisible backdrop for click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown panel */}
      <div
        className="absolute top-full right-0 mt-2 w-80 z-50 flex flex-col overflow-hidden"
        style={{
          background: "#0d0d16",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset",
          maxHeight: "480px",
          animation: "dropdown-in 150ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted/60 uppercase tracking-widest">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs tabular-nums text-accent/60">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted/60 hover:text-accent transition-colors uppercase tracking-wider"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted/60 hover:text-text transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="text-xs text-muted/65">No notifications</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                className={`w-full text-left px-3.5 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${
                  !notif.read ? "bg-accent/[0.03]" : ""
                }`}
                onClick={() => {
                  if (!notif.read) markAsRead([notif.id]);
                  if (notif.type === "dm" && notif.metadata) {
                    try {
                      const meta = JSON.parse(notif.metadata);
                      if (meta.userId) {
                        openDm(meta.userId, meta.name ?? "Unknown");
                        onClose();
                      }
                    } catch {}
                  } else if (notif.actionUrl) {
                    router.push(notif.actionUrl);
                    onClose();
                  }
                }}
              >
                <div className="flex items-start gap-2.5">
                  <span className={notifIconColor(notif.type)}>
                    <NotifIcon type={notif.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${notif.read ? "text-muted" : "text-text"}`}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-text/55 truncate mt-0.5">{notif.body}</p>
                    <span className="text-xs text-text/45 tabular-nums mt-0.5 block">
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
