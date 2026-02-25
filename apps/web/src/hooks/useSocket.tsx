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
  /** Update the cached auth token from outside (e.g. after joinQueue fetches one) */
  updateToken: (token: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  // Shared token ref — can be updated from outside (e.g. joinQueue) so that
  // reconnections always have a valid token even if the initial fetch failed.
  const tokenRef = useRef<string | null>(null);

  const updateToken = useCallback((token: string) => {
    tokenRef.current = token;
  }, []);

  useEffect(() => {
    // Token management for Socket.IO auth.
    // On the FIRST connection we use a cached token for speed.
    // On RECONNECTIONS we always fetch a fresh token because the cached one
    // may have expired — an expired token causes the server middleware to
    // fail authentication, which means socket.data.userId is never set and
    // race mappings can't be restored (root cause of the 0-WPM bug).

    const fetchFreshToken = async (): Promise<string | null> => {
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const data = await res.json();
          tokenRef.current = data.token ?? null;
        }
      } catch {
        // Token fetch failed — will connect without auth
      }
      return tokenRef.current;
    };

    const socket: TypedSocket = io(WS_URL, {
      autoConnect: false,
      transports: ["websocket"],
      // Send auth token on EVERY connection (including reconnections).
      // The server middleware uses this to identify the socket and
      // proactively restore race mappings BEFORE any events are processed.
      auth: (cb) => {
        // Always try to fetch a fresh token first.
        // If the fetch fails, fall back to tokenRef (which may have been
        // updated by joinQueue or a previous successful fetch).
        fetchFreshToken().then((token) => {
          cb(token ? { token } : {});
        });
      },
    });

    socket.on("connect", () => {
      setConnected(true);
      // Proactively refresh the token cache after every connection so the
      // NEXT reconnection always has a valid fallback token.
      fetchFreshToken();
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
    <SocketContext value={{ connected, socketRef, updateToken }}>
      {children}
    </SocketContext>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  const { connected, socketRef, updateToken } = ctx;

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

  return { connected, emit, on, socket: socketRef, updateToken };
}
