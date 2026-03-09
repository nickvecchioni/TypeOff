import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import type { SocialManager } from "./social-manager.js";
import { notifications } from "@typeoff/db";
import { getDb } from "./db.js";
import { eq, and } from "drizzle-orm";

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
      this.pushToSockets(userId, { ...payload, id: row.id, createdAt: row.createdAt });
    } catch (err) {
      console.error("[notification-manager] notify error:", err);
    }
  }

  /**
   * DM notification with deduplication.
   * If an unread DM notification from the same sender already exists,
   * update it instead of creating a new row — prevents notification spam.
   */
  async notifyDm(
    userId: string,
    senderMeta: { userId: string; name: string },
    messagePreview: string,
  ): Promise<void> {
    try {
      const db = getDb();
      const metaJson = JSON.stringify(senderMeta);

      // Try to update an existing unread DM notification from the same sender
      const updated = await db
        .update(notifications)
        .set({
          body: messagePreview,
          title: `Message from ${senderMeta.name}`,
          createdAt: new Date(),
          read: false,
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.type, "dm"),
            eq(notifications.read, false),
            eq(notifications.metadata, metaJson),
          ),
        )
        .returning({ id: notifications.id, createdAt: notifications.createdAt });

      let row: { id: string; createdAt: Date };

      if (updated.length > 0) {
        // Updated existing — use the first match
        row = updated[0];
      } else {
        // No existing unread notification from this sender — create one
        const [inserted] = await db
          .insert(notifications)
          .values({
            userId,
            type: "dm",
            title: `Message from ${senderMeta.name}`,
            body: messagePreview,
            metadata: metaJson,
          })
          .returning({ id: notifications.id, createdAt: notifications.createdAt });
        row = inserted;
      }

      this.pushToSockets(userId, {
        id: row.id,
        type: "dm",
        title: `Message from ${senderMeta.name}`,
        body: messagePreview,
        metadata: metaJson,
        createdAt: row.createdAt,
      });
    } catch (err) {
      console.error("[notification-manager] notifyDm error:", err);
    }
  }

  private pushToSockets(
    userId: string,
    data: { id: string; type: string; title: string; body: string; metadata?: string; actionUrl?: string; createdAt: Date },
  ): void {
    const socketIds = this.socialManager.getSocketsForUser(userId);
    for (const socketId of socketIds) {
      this.io.to(socketId).emit("notification", {
        id: data.id,
        type: data.type,
        title: data.title,
        body: data.body,
        metadata: data.metadata,
        actionUrl: data.actionUrl,
        createdAt: data.createdAt.toISOString(),
      });
    }
  }
}
