import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GlobalChatMessage,
} from "@typeoff/shared";
import {
  filterProfanity,
  GLOBAL_CHAT_MAX_LENGTH,
  GLOBAL_CHAT_RATE_LIMIT_MS,
  GLOBAL_CHAT_HISTORY_SIZE,
} from "@typeoff/shared";
import type { SocialManager } from "./social-manager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ROOM = "global-chat";

export class GlobalChatManager {
  private history: GlobalChatMessage[] = [];
  private lastMessageAt = new Map<string, number>();

  constructor(
    private io: TypedServer,
    private socialManager: SocialManager,
  ) {}

  handleJoin(socket: TypedSocket) {
    socket.join(ROOM);
    socket.emit("globalChatHistory", { messages: this.history });
  }

  handleMessage(
    socket: TypedSocket,
    content: string,
    sender: { id: string; name: string; activeBadge?: string | null; activeNameColor?: string | null },
  ) {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > GLOBAL_CHAT_MAX_LENGTH) return;

    // Rate limit
    const now = Date.now();
    const last = this.lastMessageAt.get(sender.id) ?? 0;
    if (now - last < GLOBAL_CHAT_RATE_LIMIT_MS) return;
    this.lastMessageAt.set(sender.id, now);

    const msg: GlobalChatMessage = {
      id: crypto.randomUUID(),
      userId: sender.id,
      username: sender.name,
      content: filterProfanity(trimmed),
      createdAt: new Date().toISOString(),
      activeBadge: sender.activeBadge,
      activeNameColor: sender.activeNameColor,
    };

    this.history.push(msg);
    if (this.history.length > GLOBAL_CHAT_HISTORY_SIZE) {
      this.history.shift();
    }

    this.io.to(ROOM).emit("globalChatMessage", msg);
  }

  /** Clean up rate-limit entries older than 1 minute (call periodically or on disconnect) */
  private pruneRateLimits() {
    const cutoff = Date.now() - 60_000;
    for (const [id, ts] of this.lastMessageAt) {
      if (ts < cutoff) this.lastMessageAt.delete(id);
    }
  }

  handleDisconnect(_socketId: string) {
    // Socket.io auto-removes from rooms on disconnect.
    // Periodically prune stale rate-limit entries.
    if (this.lastMessageAt.size > 100) {
      this.pruneRateLimits();
    }
  }
}
