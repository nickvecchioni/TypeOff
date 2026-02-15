import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  LobbyState,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const MAX_LOBBY_PLAYERS = 4;
const CODE_LENGTH = 6;

interface LobbyEntry {
  socket: TypedSocket;
  player: RacePlayer;
}

interface Lobby {
  code: string;
  hostId: string;
  players: Map<string, LobbyEntry>;
  race: RaceManager | null;
}

export class LobbyManager implements RaceOwner {
  private lobbies = new Map<string, Lobby>(); // code → Lobby
  private socketToLobby = new Map<string, string>(); // socketId → code
  private socketToRace = new Map<string, string>(); // socketId → raceId

  constructor(private io: TypedServer) {}

  createLobby(socket: TypedSocket, player: RacePlayer) {
    // Remove from any existing lobby
    this.leaveLobby(socket);

    const code = this.generateCode();
    const lobby: Lobby = {
      code,
      hostId: socket.id,
      players: new Map([[socket.id, { socket, player }]]),
      race: null,
    };

    this.lobbies.set(code, lobby);
    this.socketToLobby.set(socket.id, code);
    socket.join(`lobby:${code}`);

    socket.emit("lobbyCreated", this.getLobbyState(lobby));
  }

  joinLobby(socket: TypedSocket, player: RacePlayer, code: string) {
    const lobby = this.lobbies.get(code.toUpperCase());
    if (!lobby) {
      socket.emit("lobbyError", { message: "Lobby not found" });
      return;
    }

    if (lobby.race) {
      socket.emit("lobbyError", { message: "Race already in progress" });
      return;
    }

    if (lobby.players.size >= MAX_LOBBY_PLAYERS) {
      socket.emit("lobbyError", { message: "Lobby is full" });
      return;
    }

    // Remove from any existing lobby
    this.leaveLobby(socket);

    lobby.players.set(socket.id, { socket, player });
    this.socketToLobby.set(socket.id, code.toUpperCase());
    socket.join(`lobby:${code.toUpperCase()}`);

    this.io.to(`lobby:${code.toUpperCase()}`).emit("lobbyUpdate", this.getLobbyState(lobby));
  }

  leaveLobby(socket: TypedSocket) {
    const code = this.socketToLobby.get(socket.id);
    if (!code) return;

    const lobby = this.lobbies.get(code);
    if (!lobby) {
      this.socketToLobby.delete(socket.id);
      return;
    }

    lobby.players.delete(socket.id);
    this.socketToLobby.delete(socket.id);
    socket.leave(`lobby:${code}`);

    if (lobby.players.size === 0) {
      this.lobbies.delete(code);
      return;
    }

    // Transfer host if host left
    if (lobby.hostId === socket.id) {
      const firstEntry = lobby.players.values().next().value;
      if (firstEntry) {
        lobby.hostId = firstEntry.socket.id;
      }
    }

    this.io.to(`lobby:${code}`).emit("lobbyUpdate", this.getLobbyState(lobby));
  }

  startLobby(socket: TypedSocket) {
    const code = this.socketToLobby.get(socket.id);
    if (!code) {
      socket.emit("lobbyError", { message: "Not in a lobby" });
      return;
    }

    const lobby = this.lobbies.get(code);
    if (!lobby) {
      socket.emit("lobbyError", { message: "Lobby not found" });
      return;
    }

    if (lobby.hostId !== socket.id) {
      socket.emit("lobbyError", { message: "Only the host can start" });
      return;
    }

    if (lobby.players.size < 2) {
      socket.emit("lobbyError", { message: "Need at least 2 players" });
      return;
    }

    // Create a race with isLobbyRace = true
    const entries = [...lobby.players.values()].map((e) => ({
      socket: e.socket,
      player: e.player,
    }));

    const race = new RaceManager(
      this.io,
      entries,
      this, // LobbyManager implements RaceOwner
      [], // no bots
      undefined,
      undefined,
      true, // isLobbyRace
    );

    lobby.race = race;
    for (const entry of lobby.players.values()) {
      this.socketToRace.set(entry.socket.id, race.raceId);
    }

    race.start();
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number }
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;

    const code = this.socketToLobby.get(socketId);
    if (!code) return;

    const lobby = this.lobbies.get(code);
    lobby?.race?.handleProgress(socketId, data);
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: import("@typeoff/shared").WpmSample[] }
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;

    const code = this.socketToLobby.get(socketId);
    if (!code) return;

    const lobby = this.lobbies.get(code);
    lobby?.race?.handleFinish(socketId, data);
  }

  handleDisconnect(socketId: string) {
    const code = this.socketToLobby.get(socketId);
    if (!code) return;

    const lobby = this.lobbies.get(code);
    if (lobby?.race) {
      lobby.race.handleDisconnect(socketId);
    }

    // Create a mock socket for leave cleanup
    this.socketToLobby.delete(socketId);
    this.socketToRace.delete(socketId);

    if (lobby) {
      lobby.players.delete(socketId);
      if (lobby.players.size === 0) {
        this.lobbies.delete(code);
      } else {
        if (lobby.hostId === socketId) {
          const firstEntry = lobby.players.values().next().value;
          if (firstEntry) lobby.hostId = firstEntry.socket.id;
        }
        if (!lobby.race) {
          this.io.to(`lobby:${code}`).emit("lobbyUpdate", this.getLobbyState(lobby));
        }
      }
    }
  }

  isInLobby(socketId: string): boolean {
    return this.socketToLobby.has(socketId);
  }

  isInLobbyRace(socketId: string): boolean {
    return this.socketToRace.has(socketId);
  }

  cleanupRace(raceId: string, socketIds: string[]) {
    for (const id of socketIds) {
      this.socketToRace.delete(id);
    }

    // Find and reset the lobby's race
    for (const lobby of this.lobbies.values()) {
      if (lobby.race?.raceId === raceId) {
        lobby.race = null;
        // Lobby stays open for rematch
        this.io.to(`lobby:${lobby.code}`).emit("lobbyUpdate", this.getLobbyState(lobby));
        break;
      }
    }
  }

  handleChat(socket: TypedSocket, message: string) {
    const code = this.socketToLobby.get(socket.id);
    if (!code) return;

    const lobby = this.lobbies.get(code);
    if (!lobby) return;

    const entry = lobby.players.get(socket.id);
    if (!entry) return;

    // Sanitize: trim and limit to 200 chars
    const sanitized = message.trim().slice(0, 200);
    if (!sanitized) return;

    this.io.to(`lobby:${code}`).emit("lobbyChatMessage", {
      playerId: entry.player.id,
      name: entry.player.name,
      message: sanitized,
      timestamp: Date.now(),
    });
  }

  private generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    } while (this.lobbies.has(code));
    return code;
  }

  private getLobbyState(lobby: Lobby): LobbyState {
    return {
      code: lobby.code,
      hostId: lobby.hostId,
      players: [...lobby.players.values()].map((e) => e.player),
    };
  }
}
