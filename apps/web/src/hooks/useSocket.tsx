"use client";

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

interface SocketContextValue {
  connected: boolean;
  socketRef: React.RefObject<TypedSocket | null>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Token management for Socket.IO auth.
    // On the FIRST connection we use a cached token for speed.
    // On RECONNECTIONS we always fetch a fresh token because the cached one
    // may have expired — an expired token causes the server middleware to
    // fail authentication, which means socket.data.userId is never set and
    // race mappings can't be restored (root cause of the 0-WPM bug).
    let cachedToken: string | null = null;
    let hasConnectedOnce = false;

    const fetchFreshToken = async (): Promise<string | null> => {
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const data = await res.json();
          cachedToken = data.token ?? null;
        }
      } catch {
        // Token fetch failed — will connect without auth
      }
      return cachedToken;
    };

    const socket: TypedSocket = io(WS_URL, {
      autoConnect: false,
      transports: ["websocket"],
      // Send auth token on EVERY connection (including reconnections).
      // The server middleware uses this to identify the socket and
      // proactively restore race mappings BEFORE any events are processed.
      auth: (cb) => {
        if (hasConnectedOnce) {
          // Reconnection — ALWAYS fetch a fresh token to avoid sending an
          // expired one. The small delay (~100ms) is worth the reliability.
          fetchFreshToken().then((token) => {
            cb(token ? { token } : {});
          });
        } else if (cachedToken) {
          // First connection with a cached token — use it immediately
          cb({ token: cachedToken });
          fetchFreshToken(); // refresh in background
        } else {
          // First connection, no cache — wait for fetch
          fetchFreshToken().then((token) => {
            cb(token ? { token } : {});
          });
        }
      },
    });

    socket.on("connect", () => {
      hasConnectedOnce = true;
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext value={{ connected, socketRef }}>
      {children}
    </SocketContext>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  const { connected, socketRef } = ctx;

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    [socketRef]
  );

  // Re-create `on` when connected changes so dependent useEffects re-register
  // handlers after the socket is created (child effects run before parent effects,
  // so socketRef.current may be null on initial mount).
  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ) => {
      socketRef.current?.on(event, handler as any);
      return () => {
        socketRef.current?.off(event, handler as any);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socketRef, connected]
  );

  return { connected, emit, on, socket: socketRef };
}
