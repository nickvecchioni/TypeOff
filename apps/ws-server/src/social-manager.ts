import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import { createDb, friendships } from "@typeoff/db";
import { eq, or, and } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocialManager {
  // userId → Set<socketId> (user can have multiple tabs)
  private onlineUsers = new Map<string, Set<string>>();
  // socketId → userId
  private socketToUser = new Map<string, string>();

  constructor(private io: TypedServer) {}

  async trackConnection(socket: TypedSocket, userId: string) {
    this.socketToUser.set(socket.id, userId);

    const wasOnline = this.onlineUsers.has(userId);
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socket.id);

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

  async getFriendsStatus(userId: string): Promise<Array<{ userId: string; online: boolean }>> {
    try {
      const db = createDb(process.env.DATABASE_URL!);
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

      return rows.map((row) => {
        const friendId = row.requesterId === userId ? row.addresseeId : row.requesterId;
        return { userId: friendId, online: this.isOnline(friendId) };
      });
    } catch (err) {
      console.error("[social-manager] getFriendsStatus error:", err);
      return [];
    }
  }

  private async notifyFriends(userId: string, online: boolean) {
    try {
      const db = createDb(process.env.DATABASE_URL!);
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
          for (const socketId of friendSockets) {
            this.io.to(socketId).emit("friendStatus", { userId, online });
          }
        }
      }
    } catch (err) {
      console.error("[social-manager] notifyFriends error:", err);
    }
  }
}
