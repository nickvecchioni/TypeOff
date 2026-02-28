import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import { friendships, users } from "@typeoff/db";
import { getDb } from "./db.js";
import { eq, or, and, inArray } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocialManager {
  // userId → Set<socketId> (user can have multiple tabs)
  private onlineUsers = new Map<string, Set<string>>();
  // socketId → userId
  private socketToUser = new Map<string, string>();
  // userId → raceId (in-memory only, tracks active race participation)
  private userRace = new Map<string, string>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private io: TypedServer) {
    this.startHeartbeat();
  }

  destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async trackConnection(socket: TypedSocket, userId: string) {
    this.socketToUser.set(socket.id, userId);

    const wasOnline = this.onlineUsers.has(userId);
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socket.id);

    // Update lastSeen in DB
    this.updateLastSeen(userId).catch(() => {});

    // If user just came online, notify friends
    if (!wasOnline) {
      await this.notifyFriends(userId, true);
    }
  }

  async trackDisconnection(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    this.socketToUser.delete(socketId);
    const sockets = this.onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.onlineUsers.delete(userId);
        // Update lastSeen to now (preserve timestamp for "last seen X ago")
        this.updateLastSeen(userId).catch(() => {});
        // User went offline, notify friends
        await this.notifyFriends(userId, false);
      }
    }
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getSocketsForUser(userId: string): string[] {
    const sockets = this.onlineUsers.get(userId);
    return sockets ? [...sockets] : [];
  }

  getUserForSocket(socketId: string): string | null {
    return this.socketToUser.get(socketId) ?? null;
  }

  setUserRace(userId: string, raceId: string | null) {
    if (raceId === null) {
      this.userRace.delete(userId);
    } else {
      this.userRace.set(userId, raceId);
    }
    // Notify friends of the updated status
    this.notifyFriends(userId, this.isOnline(userId)).catch(() => {});
  }

  getUserRace(userId: string): string | null {
    return this.userRace.get(userId) ?? null;
  }

  async getFriendsStatus(userId: string): Promise<Array<{ userId: string; online: boolean; lastSeen?: string | null }>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(friendships)
        .where(
          and(
            or(
              eq(friendships.requesterId, userId),
              eq(friendships.addresseeId, userId),
            ),
            eq(friendships.status, "accepted"),
          ),
        );

      const friendIds = rows.map((row) =>
        row.requesterId === userId ? row.addresseeId : row.requesterId,
      );

      if (friendIds.length === 0) return [];

      // Query lastSeen for all friends
      const friendUsers = await db
        .select({ id: users.id, lastSeen: users.lastSeen })
        .from(users)
        .where(or(...friendIds.map((id) => eq(users.id, id))));

      const lastSeenMap = new Map(
        friendUsers.map((u) => [u.id, u.lastSeen]),
      );

      return friendIds.map((friendId) => {
        const online = this.isOnline(friendId);
        const lastSeen = lastSeenMap.get(friendId);
        return {
          userId: friendId,
          online,
          lastSeen: online ? null : (lastSeen?.toISOString() ?? null),
          raceId: online ? (this.userRace.get(friendId) ?? null) : null,
        };
      });
    } catch (err) {
      console.error("[social-manager] getFriendsStatus error:", err);
      return [];
    }
  }

  private async updateLastSeen(userId: string) {
    try {
      const db = getDb();
      await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, userId));
    } catch (err) {
      console.error("[social-manager] updateLastSeen error:", err);
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      const onlineUserIds = [...this.onlineUsers.keys()];
      if (onlineUserIds.length === 0) return;
      try {
        const db = getDb();
        await db.update(users).set({ lastSeen: new Date() }).where(inArray(users.id, onlineUserIds));
      } catch (err) {
        console.error("[social-manager] heartbeat error:", err);
      }
    }, 2 * 60 * 1000);
  }

  private async notifyFriends(userId: string, online: boolean) {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(friendships)
        .where(
          and(
            or(
              eq(friendships.requesterId, userId),
              eq(friendships.addresseeId, userId),
            ),
            eq(friendships.status, "accepted"),
          ),
        );

      for (const row of rows) {
        const friendId = row.requesterId === userId ? row.addresseeId : row.requesterId;
        const friendSockets = this.onlineUsers.get(friendId);
        if (friendSockets) {
          const lastSeen = online ? null : new Date().toISOString();
          const raceId = online ? (this.userRace.get(userId) ?? null) : null;
          for (const socketId of friendSockets) {
            this.io.to(socketId).emit("friendStatus", { userId, online, lastSeen, raceId });
          }
        }
      }
    } catch (err) {
      console.error("[social-manager] notifyFriends error:", err);
    }
  }
}
