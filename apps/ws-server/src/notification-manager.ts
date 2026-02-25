import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import type { SocialManager } from "./social-manager.js";
import { notifications } from "@typeoff/db";
import { getDb } from "./db.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  metadata?: string;
  actionUrl?: string;
}

export class NotificationManager {
  constructor(
    private io: TypedServer,
    private socialManager: SocialManager,
  ) {}

  /** Insert notification into DB and push to user's connected sockets. Fire-and-forget. */
  async notify(userId: string, payload: NotifyPayload): Promise<void> {
    try {
      const db = getDb();
      const [row] = await db
        .insert(notifications)
        .values({
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata ?? null,
          actionUrl: payload.actionUrl ?? null,
        })
        .returning({ id: notifications.id, createdAt: notifications.createdAt });

      // Push to all connected sockets for this user
      const socketIds = this.socialManager.getSocketsForUser(userId);
      for (const socketId of socketIds) {
        this.io.to(socketId).emit("notification", {
          id: row.id,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata,
          actionUrl: payload.actionUrl,
          createdAt: row.createdAt.toISOString(),
        });
      }
    } catch (err) {
      console.error("[notification-manager] notify error:", err);
    }
  }
}
