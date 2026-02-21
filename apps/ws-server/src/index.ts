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

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const BUILD_TS = new Date().toISOString();

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

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ─── Queue Events ─────────────────────────────────────────────────

  socket.on("joinQueue", async (data) => {
    console.log(`[joinQueue] ${socket.id} connected=${socket.connected}`);
    try {
      const player = await authenticateSocket(data, socket.id);
      console.log(`[joinQueue] ${socket.id} authenticated as ${player.id} (${player.name})`);
      // Fire-and-forget: don't block queue join on friend notifications
      socialManager.trackConnection(socket, player.id).catch(() => {});

      const modeCategory: ModeCategory = data.modeCategory ?? "words";

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
            await matchmaker.startPrivatePartyRace(partyEntries, modeCategory);
          } else {
            await matchmaker.addPartyToQueue(partyEntries, party.id, modeCategory);
          }
          console.log(`[joinQueue] party ${party.id} ${data.privateRace ? "private race" : "enqueued"} ${partyEntries.length} members`);
          return;
        }
      }

      await matchmaker.addToQueue(socket, player, modeCategory);
      console.log(`[joinQueue] ${socket.id} addToQueue completed`);
    } catch (err) {
      console.error(`[joinQueue] ${socket.id} error:`, err);
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("leaveQueue", () => {
    matchmaker.removeFromQueue(socket.id);
  });

  socket.on("leaveRace", () => {
    matchmaker.handleLeaveRace(socket.id);
  });

  socket.on("rejoinRace", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
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
    matchmaker.handleProgress(socket.id, data);
  });

  socket.on("raceFinish", (data) => {
    matchmaker.handleFinish(socket.id, data);
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
      await authenticateSocket(data, socket.id);
      matchmaker.handleEmote(socket.id, data.emote);
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
