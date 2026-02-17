import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RaceType,
} from "@typeoff/shared";
import { authenticateSocket } from "./auth.js";
import { Matchmaker } from "./matchmaker.js";
import { LobbyManager } from "./lobby-manager.js";
import { SocialManager } from "./social-manager.js";

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
const lobbyManager = new LobbyManager(io);
const socialManager = new SocialManager(io);

// Track spectators: socketId → raceId
const spectators = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ─── Queue Events ─────────────────────────────────────────────────

  socket.on("joinQueue", async (data) => {
    console.log(`[joinQueue] ${socket.id} connected=${socket.connected} raceType=${data.raceType ?? "common"}`);
    try {
      const player = await authenticateSocket(data, socket.id);
      console.log(`[joinQueue] ${socket.id} authenticated as ${player.id} (${player.name})`);
      // Fire-and-forget: don't block queue join on friend notifications
      socialManager.trackConnection(socket, player.id).catch(() => {});
      const raceType = (data.raceType ?? "common") as RaceType;
      await matchmaker.addToQueue(socket, player, raceType);
      console.log(`[joinQueue] ${socket.id} addToQueue completed for type=${raceType}`);
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

  // ─── Race Events (route to correct manager) ──────────────────────

  socket.on("raceProgress", (data) => {
    if (lobbyManager.isInLobbyRace(socket.id)) {
      lobbyManager.handleProgress(socket.id, data);
    } else {
      matchmaker.handleProgress(socket.id, data);
    }
  });

  socket.on("raceFinish", (data) => {
    if (lobbyManager.isInLobbyRace(socket.id)) {
      lobbyManager.handleFinish(socket.id, data);
    } else {
      matchmaker.handleFinish(socket.id, data);
    }
  });

  // ─── Lobby Events ─────────────────────────────────────────────────

  socket.on("createLobby", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      lobbyManager.createLobby(socket, player);
    } catch (err) {
      socket.emit("lobbyError", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("joinLobby", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      lobbyManager.joinLobby(socket, player, data.code);
    } catch (err) {
      socket.emit("lobbyError", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("leaveLobby", () => {
    lobbyManager.leaveLobby(socket);
  });

  socket.on("startLobby", () => {
    lobbyManager.startLobby(socket);
  });

  // ─── Lobby Chat Events ──────────────────────────────────────────

  socket.on("lobbyChat", (data) => {
    lobbyManager.handleChat(socket, data.message);
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
    lobbyManager.handleDisconnect(socket.id);
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
