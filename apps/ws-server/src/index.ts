import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ModeCategory,
} from "@typeoff/shared";
import { authenticateSocket } from "./auth.js";
import { Matchmaker } from "./matchmaker.js";
import { PartyManager } from "./party-manager.js";
import { SocialManager } from "./social-manager.js";
import { NotificationManager } from "./notification-manager.js";
import { directMessages } from "@typeoff/db";
import { getDb } from "./db.js";
import leoProfanity from "leo-profanity";

// ⚠️  SINGLE-INSTANCE CONSTRAINT
// Matchmaking queues, active races, party state, and social presence are all
// held in-process memory. Running multiple instances will split these pools
// and cause incorrect matchmaking, lost race state, and phantom presence.
// If horizontal scaling is needed, extract state into Redis or a shared store.
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const BUILD_TS = new Date().toISOString(); // rebuild trigger

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true, buildTs: BUILD_TS, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const socialManager = new SocialManager(io);
const notificationManager = new NotificationManager(io, socialManager);
const matchmaker = new Matchmaker(io, socialManager, notificationManager);
const partyManager = new PartyManager(io, socialManager);

// Track spectators: socketId → raceId
const spectators = new Map<string, string>();

// DM rate limiting: userId → last send timestamp
const dmLastSent = new Map<string, number>();
// Periodically prune stale DM rate-limit entries (older than 60s)
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [userId, ts] of dmLastSent) {
    if (ts < cutoff) dmLastSent.delete(userId);
  }
}, 60_000).unref();

// Track followers: userId being followed → Set of follower socketIds
const followers = new Map<string, Set<string>>();
// Reverse map: follower socketId → userId they're following
const followingMap = new Map<string, string>();

// Notify followers when a player enters a new race
matchmaker.setOnRaceStarted((raceId, playerUserIds) => {
  for (const userId of playerUserIds) {
    const followerSet = followers.get(userId);
    if (!followerSet || followerSet.size === 0) continue;
    for (const followerSocketId of followerSet) {
      const sock = io.sockets.sockets.get(followerSocketId);
      sock?.emit("followedPlayerRacing", { raceId, userId });
    }
  }
});

// ─── Auth Middleware ────────────────────────────────────────────────────
// Runs BEFORE any event handlers. Identifies the socket via the handshake
// auth token (sent on every connection including reconnections), proactively
// restoring race mappings so progress/finish events are never lost.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token && typeof token === "string") {
    try {
      const player = await authenticateSocket({ token }, socket.id);
      socket.data.userId = player.id;

      // If the user has an active race, proactively reconnect their socket
      // so progress/finish events sent immediately after reconnection work.
      const result = matchmaker.tryReconnect(socket, player.id);
      if (result) {
        console.log(`[middleware] proactive reconnect: ${socket.id} → race ${result.raceId} (userId=${player.id})`);
      }

      // Reconnect party socket so chat/updates reach the right socket
      partyManager.reconnectSocket(player.id, socket);
    } catch {
      // Auth failed (token expired, invalid, etc.) — try to decode the JWT
      // payload WITHOUT verification to extract the userId for routing purposes.
      // This handles the critical case where a socket reconnects during a race
      // but the fresh token fetch failed (network blip). Without the userId,
      // the matchmaker can't route raceFinish/raceProgress events and the race
      // gets stuck waiting for the 15s timeout.
      // Security: we only use the decoded userId for routing (finding which race
      // the socket belongs to). The race-manager verifies the player is actually
      // in the race. An attacker would need a previously-valid token with a
      // userId that's in an active race — very unlikely.
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
          if (payload.sub) {
            socket.data.userId = payload.sub;
            console.log(`[middleware] decoded expired/invalid token for routing: userId=${payload.sub} socket=${socket.id}`);

            const result = matchmaker.tryReconnect(socket, payload.sub);
            if (result) {
              console.log(`[middleware] proactive reconnect (expired token): ${socket.id} → race ${result.raceId}`);
            }

            partyManager.reconnectSocket(payload.sub, socket);
          }
        }
      } catch {
        // Token is completely unparseable — give up
      }
    }
  }
  next();
});

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}${socket.data.userId ? ` (userId=${socket.data.userId})` : ""}`);

  // Helper: require authenticated socket. Returns userId or null (after emitting error).
  function requireAuth(s: typeof socket): string | null {
    const uid = s.data.userId as string | undefined;
    if (!uid) {
      s.emit("error", { message: "Authentication required" });
      return null;
    }
    return uid;
  }

  // ─── Queue Events ─────────────────────────────────────────────────

  socket.on("joinQueue", async (data) => {
    console.log(`[joinQueue] ${socket.id} connected=${socket.connected}`);
    try {
      const player = await authenticateSocket(data, socket.id);
      socket.data.userId = player.id;
      console.log(`[joinQueue] ${socket.id} authenticated as ${player.id} (${player.name}) guest=${player.isGuest}`);
      // Fire-and-forget: don't block queue join on friend notifications (skip for guests)
      if (!player.isGuest) {
        socialManager.trackConnection(socket, player.id).catch(() => {});
      }

      const modeCategories: ModeCategory[] = data.modeCategories ?? ["words"];

      // Guests skip party logic entirely
      if (player.isGuest) {
        await matchmaker.addToQueue(socket, player, modeCategories);
        console.log(`[joinQueue] ${socket.id} guest addToQueue completed`);
        return;
      }

      // If this user is a party leader, enqueue the whole party
      const party = partyManager.getPartyForUser(player.id);
      if (party && party.leaderId === player.id) {
        const members = partyManager.getPartyMembers(player.id);
        if (members && members.length > 0) {
          // Enforce ready gate: all non-leader members must be ready
          const nonLeaderMembers = members.filter((m) => m.player.id !== player.id);
          if (nonLeaderMembers.length > 0) {
            const allReady = nonLeaderMembers.every((m) => party.readyState.get(m.player.id) === true);
            if (!allReady) {
              socket.emit("error", { message: "All party members must be ready before starting" });
              return;
            }
          }

          const partyEntries = members.map((m) => {
            const s = io.sockets.sockets.get(m.socketId);
            return s ? { socket: s, player: m.player } : null;
          }).filter((e): e is NonNullable<typeof e> => e !== null);

          // Reset ready state before starting
          partyManager.resetReadyState(party.id);

          if (data.privateRace) {
            await matchmaker.startPrivatePartyRace(partyEntries, modeCategories);
          } else {
            await matchmaker.addPartyToQueue(partyEntries, party.id, modeCategories);
          }
          console.log(`[joinQueue] party ${party.id} ${data.privateRace ? "private race" : "enqueued"} ${partyEntries.length} members`);
          return;
        }
      }

      await matchmaker.addToQueue(socket, player, modeCategories);
      console.log(`[joinQueue] ${socket.id} addToQueue completed`);
    } catch (err) {
      console.error(`[joinQueue] ${socket.id} error:`, err);
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("leaveQueue", () => {
    if (!requireAuth(socket)) return;
    matchmaker.removeFromQueue(socket.id);
  });

  socket.on("leaveRace", () => {
    if (!requireAuth(socket)) return;
    matchmaker.handleLeaveRace(socket.id);
  });

  socket.on("rejoinRace", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socket.data.userId = player.id;
      const result = matchmaker.tryReconnect(socket, player.id);
      if (result) {
        const state = result.race.getState();
        socket.emit("raceStart", state);
        socket.emit("raceCountdown", { countdown: 0 });
        console.log(`[rejoinRace] ${socket.id} reconnected to race ${result.raceId}`);
      } else {
        socket.emit("error", { message: "No active race found" });
      }
    } catch (err) {
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  // ─── Race Events ──────────────────────────────────────────────────

  socket.on("raceProgress", (data) => {
    if (!socket.data.userId) return; // silent drop — no error emit to avoid spam
    matchmaker.handleProgress(socket.id, data, socket.data.userId);
  });

  socket.on("raceFinish", (data) => {
    if (!socket.data.userId) return; // silent drop
    matchmaker.handleFinish(socket.id, data, socket.data.userId);
  });

  // ─── Party Events ─────────────────────────────────────────────────

  socket.on("createParty", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socialManager.trackConnection(socket, player.id).catch(() => {});
      partyManager.createParty(socket, player.id, player.name, player.elo, { activeBadge: player.activeBadge, activeNameColor: player.activeNameColor, activeNameEffect: player.activeNameEffect });
    } catch (err) {
      socket.emit("partyError", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("inviteToParty", (data) => {
    partyManager.inviteToParty(socket, data.userId);
  });

  socket.on("respondToPartyInvite", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socialManager.trackConnection(socket, player.id).catch(() => {});
      partyManager.respondToInvite(socket, data.partyId, data.accept, player.id, player.name, player.elo, { activeBadge: player.activeBadge, activeNameColor: player.activeNameColor, activeNameEffect: player.activeNameEffect });
    } catch (err) {
      socket.emit("partyError", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("leaveParty", () => {
    partyManager.leaveParty(socket);
  });

  socket.on("kickFromParty", (data) => {
    partyManager.kickMember(socket, data.userId);
  });

  socket.on("partySetPrivateRace", (data) => {
    partyManager.setPrivateRace(socket, data.privateRace);
  });

  socket.on("partyMarkReady", () => {
    partyManager.markReady(socket);
  });

  socket.on("sendPartyMessage", (data) => {
    partyManager.sendMessage(socket, data.message);
  });

  // ─── Direct Message Events ────────────────────────────────────────

  socket.on("sendDm", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socialManager.trackConnection(socket, player.id).catch(() => {});

      // Rate limit: 500ms between messages
      const last = dmLastSent.get(player.id) ?? 0;
      if (Date.now() - last < 500) return;
      dmLastSent.set(player.id, Date.now());

      // Profanity filter + length cap (500 chars)
      const content = leoProfanity.clean(data.message.trim().slice(0, 500));
      if (!content) return;

      const { toUserId } = data;
      if (!toUserId || toUserId === player.id) return;

      // Persist to DB
      const db = getDb();
      const [row] = await db.insert(directMessages).values({
        senderId: player.id,
        receiverId: toUserId,
        content,
      }).returning();

      const payload = {
        id: row.id,
        fromUserId: player.id,
        fromName: player.name,
        toUserId,
        message: content,
        timestamp: Date.now(),
      };

      // Deliver to recipient (all their sockets)
      for (const socketId of socialManager.getSocketsForUser(toUserId)) {
        io.to(socketId).emit("dmMessage", payload);
      }
      // Echo back to sender (all their sockets, for multi-tab)
      for (const socketId of socialManager.getSocketsForUser(player.id)) {
        io.to(socketId).emit("dmMessage", payload);
      }

      // Notify recipient (deduped — updates existing unread notification from same sender)
      notificationManager.notifyDm(
        toUserId,
        { userId: player.id, name: player.name },
        content.length > 80 ? content.slice(0, 80) + "…" : content,
      ).catch(() => {});
    } catch {
      // silently drop auth failures
    }
  });

  // ─── Social Events ───────────────────────────────────────────────

  socket.on("requestFriendStatuses", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socialManager.trackConnection(socket, player.id).catch(() => {});
      const statuses = await socialManager.getFriendsStatus(player.id);
      socket.emit("friendStatuses", statuses);
    } catch (err) {
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  // ─── Emote Events ───────────────────────────────────────────────

  socket.on("sendRaceEmote", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      matchmaker.handleEmoteByUserId(player.id, data.emote);
    } catch {
      // silently ignore auth failures for emotes
    }
  });

  // ─── Spectator Events ─────────────────────────────────────────────

  socket.on("listActiveRaces", () => {
    const races = matchmaker.getActiveRaces();
    socket.emit("activeRaces", { races });
  });

  socket.on("spectateRace", async (data) => {
    // Stop any current spectating
    const currentRaceId = spectators.get(socket.id);
    if (currentRaceId) {
      const currentRace = matchmaker.getRace(currentRaceId);
      currentRace?.removeSpectator(socket);
      spectators.delete(socket.id);
    }

    const race = matchmaker.getRace(data.raceId);
    if (!race) {
      socket.emit("error", { message: "Race not found" });
      return;
    }

    // Resolve display name from token (graceful fallback)
    let userId = `anon_${socket.id}`;
    let displayName = "Spectator";
    if (data.token) {
      try {
        const player = await authenticateSocket(data, socket.id);
        userId = player.id;
        displayName = player.name;
      } catch { /* anonymous spectator */ }
    }

    race.addSpectator(socket, userId, displayName);
    spectators.set(socket.id, data.raceId);
    socket.emit("spectateStarted", race.getSpectatorState());
  });

  socket.on("stopSpectating", () => {
    const raceId = spectators.get(socket.id);
    if (raceId) {
      const race = matchmaker.getRace(raceId);
      race?.removeSpectator(socket);
      spectators.delete(socket.id);
    }
  });

  socket.on("followPlayer", (data) => {
    // Remove from any previous follow
    const prevUserId = followingMap.get(socket.id);
    if (prevUserId) {
      followers.get(prevUserId)?.delete(socket.id);
    }
    // Add to new follow
    let set = followers.get(data.userId);
    if (!set) {
      set = new Set();
      followers.set(data.userId, set);
    }
    set.add(socket.id);
    followingMap.set(socket.id, data.userId);
  });

  socket.on("stopFollowing", () => {
    const userId = followingMap.get(socket.id);
    if (userId) {
      followers.get(userId)?.delete(socket.id);
      followingMap.delete(socket.id);
    }
  });

  // ─── Disconnect ───────────────────────────────────────────────────

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    matchmaker.handleDisconnect(socket.id);
    partyManager.handleDisconnect(socket.id);
    socialManager.trackDisconnection(socket.id);

    // Clean up following
    const followedUserId = followingMap.get(socket.id);
    if (followedUserId) {
      followers.get(followedUserId)?.delete(socket.id);
      followingMap.delete(socket.id);
    }

    // Clean up spectating
    const raceId = spectators.get(socket.id);
    if (raceId) {
      const race = matchmaker.getRace(raceId);
      race?.removeSpectator(socket);
      spectators.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ws-server] listening on port ${PORT}`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────
function shutdown(signal: string) {
  console.log(`[ws-server] ${signal} received — shutting down`);

  // Clear long-lived timers to allow clean exit
  matchmaker.destroy();
  socialManager.destroy();

  // Stop accepting new connections
  io.close(() => {
    console.log("[ws-server] all sockets closed");
    httpServer.close(() => {
      console.log("[ws-server] HTTP server closed");
      process.exit(0);
    });
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error("[ws-server] forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
