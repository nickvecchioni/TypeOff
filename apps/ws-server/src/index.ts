import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import { authenticateSocket } from "./auth.js";
import { Matchmaker } from "./matchmaker.js";
import { PartyManager } from "./party-manager.js";
import { SocialManager } from "./social-manager.js";
import { ChatManager } from "./chat-manager.js";

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

const matchmaker = new Matchmaker(io);
const socialManager = new SocialManager(io);
const partyManager = new PartyManager(io, socialManager);
const chatManager = new ChatManager(io, socialManager);

// Track spectators: socketId → raceId
const spectators = new Map<string, string>();

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

      // If this user is a party leader, enqueue the whole party
      const party = partyManager.getPartyForUser(player.id);
      if (party && party.leaderId === player.id) {
        const members = partyManager.getPartyMembers(player.id);
        if (members && members.length > 0) {
          const partyEntries = members.map((m) => {
            const s = io.sockets.sockets.get(m.socketId);
            return s ? { socket: s, player: m.player } : null;
          }).filter((e): e is NonNullable<typeof e> => e !== null);

          // Reset ready state before starting
          partyManager.resetReadyState(party.id);

          if (data.privateRace) {
            await matchmaker.startPrivatePartyRace(partyEntries);
          } else {
            await matchmaker.addPartyToQueue(partyEntries, party.id);
          }
          console.log(`[joinQueue] party ${party.id} ${data.privateRace ? "private race" : "enqueued"} ${partyEntries.length} members`);
          return;
        }
      }

      await matchmaker.addToQueue(socket, player);
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
      partyManager.createParty(socket, player.id, player.name, player.elo);
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
      partyManager.respondToInvite(socket, data.partyId, data.accept, player.id, player.name, player.elo);
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

  // ─── Chat Events ────────────────────────────────────────────────

  socket.on("sendDirectMessage", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      socialManager.trackConnection(socket, player.id).catch(() => {});
      await chatManager.handleSendMessage(socket, data, player);
    } catch (err) {
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("markMessagesRead", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      await chatManager.handleMarkRead(socket, data, player.id);
    } catch (err) {
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  // ─── Spectator Events ─────────────────────────────────────────────

  socket.on("listActiveRaces", () => {
    const races = matchmaker.getActiveRaces();
    socket.emit("activeRaces", { races });
  });

  socket.on("spectateRace", (data) => {
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

    race.addSpectator(socket);
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

  // ─── Disconnect ───────────────────────────────────────────────────

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    matchmaker.handleDisconnect(socket.id);
    partyManager.handleDisconnect(socket.id);
    socialManager.trackDisconnection(socket.id);

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
