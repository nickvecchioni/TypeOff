import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
} from "@typeoff/shared";
import { createDb, friendships, directMessages, users } from "@typeoff/db";
import { eq, or, and, desc, lt, isNull } from "drizzle-orm";
import { SocialManager } from "./social-manager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class ChatManager {
  constructor(
    private io: TypedServer,
    private socialManager: SocialManager,
  ) {}

  async handleSendMessage(
    socket: TypedSocket,
    data: { recipientId: string; content: string },
    sender: RacePlayer,
  ) {
    const content = data.content.trim();
    if (!content || content.length > 500) {
      socket.emit("error", { message: "Message must be 1-500 characters" });
      return;
    }

    try {
      const db = createDb(process.env.DATABASE_URL!);

      // Verify friendship exists
      const friendship = await db
        .select()
        .from(friendships)
        .where(
          and(
            or(
              and(
                eq(friendships.requesterId, sender.id),
                eq(friendships.addresseeId, data.recipientId),
              ),
              and(
                eq(friendships.requesterId, data.recipientId),
                eq(friendships.addresseeId, sender.id),
              ),
            ),
            eq(friendships.status, "accepted"),
          ),
        )
        .limit(1);

      if (friendship.length === 0) {
        socket.emit("error", { message: "You can only message friends" });
        return;
      }

      // Insert message
      const [msg] = await db
        .insert(directMessages)
        .values({
          senderId: sender.id,
          recipientId: data.recipientId,
          content,
        })
        .returning();

      const payload = {
        messageId: msg.id,
        senderId: sender.id,
        recipientId: data.recipientId,
        senderName: sender.name,
        content,
        createdAt: msg.createdAt.toISOString(),
      };

      // Emit to all recipient sockets
      const recipientSockets = this.socialManager.getSocketsForUser(data.recipientId);
      for (const socketId of recipientSockets) {
        this.io.to(socketId).emit("directMessage", payload);
      }

      // Echo to sender's other tabs
      const senderSockets = this.socialManager.getSocketsForUser(sender.id);
      for (const socketId of senderSockets) {
        this.io.to(socketId).emit("directMessage", payload);
      }
    } catch (err) {
      console.error("[chat-manager] handleSendMessage error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  async handleMarkRead(
    socket: TypedSocket,
    data: { friendId: string },
    userId: string,
  ) {
    try {
      const db = createDb(process.env.DATABASE_URL!);

      // Update unread messages from friendId to userId
      await db
        .update(directMessages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(directMessages.senderId, data.friendId),
            eq(directMessages.recipientId, userId),
            isNull(directMessages.readAt),
          ),
        );

      // Notify the friend that their messages were read
      const friendSockets = this.socialManager.getSocketsForUser(data.friendId);
      for (const socketId of friendSockets) {
        this.io.to(socketId).emit("messagesMarkedRead", {
          byUserId: userId,
          friendId: data.friendId,
        });
      }
    } catch (err) {
      console.error("[chat-manager] handleMarkRead error:", err);
    }
  }
}
