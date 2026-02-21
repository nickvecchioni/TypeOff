"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useSocket } from "./useSocket";
import { useSession } from "next-auth/react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  unreadCount: number;
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  toastQueue: Notification[];
  latestToast: Notification | null;
  clearToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { on } = useSocket();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const seenNotifIds = useRef(new Set<string>());

  // Poll for unread count
  useEffect(() => {
    if (!session?.user?.id) return;

    const pollCount = async () => {
      try {
        const res = await fetch("/api/notifications/count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread);
        }
      } catch {}
    };

    pollCount();
    pollRef.current = setInterval(pollCount, 60_000);
    return () => clearInterval(pollRef.current);
  }, [session?.user?.id]);

  // Listen for WS notifications (deduplicated by ID to prevent multi-tab duplicates)
  useEffect(() => {
    const unsub = on("notification", (data) => {
      if (seenNotifIds.current.has(data.id)) return;
      seenNotifIds.current.add(data.id);
      const notif: Notification = { ...data, read: false };
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [notif, ...prev]);
      setToastQueue((prev) => [...prev, notif].slice(-5));
    });
    return unsub;
  }, [on]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {}
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - ids.length));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await fetch("/api/notifications?all=true", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }, []);

  const clearToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const latestToast = toastQueue.length > 0 ? toastQueue[toastQueue.length - 1] : null;

  return (
    <NotificationContext value={{
      unreadCount,
      notifications,
      fetchNotifications,
      markAsRead,
      markAllRead,
      clearAll,
      toastQueue,
      latestToast,
      clearToast,
    }}>
      {children}
    </NotificationContext>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
