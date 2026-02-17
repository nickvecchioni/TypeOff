import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PartyState,
  RacePlayer,
} from "@typeoff/shared";
import type { SocialManager } from "./social-manager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const MAX_PARTY_SIZE = 4;
const INVITE_EXPIRY_MS = 30_000;

interface PartyMember {
  userId: string;
  name: string;
  socketId: string;
  elo: number;
}

interface Party {
  id: string;
  leaderId: string; // userId
  members: Map<string, PartyMember>; // userId → member
  pendingInvites: Set<string>; // userIds with outstanding invites
}

export class PartyManager {
  private parties = new Map<string, Party>(); // partyId → Party
  private userToParty = new Map<string, string>(); // userId → partyId
  private socketToUser = new Map<string, string>(); // socketId → userId

  constructor(
    private io: TypedServer,
    private socialManager: SocialManager,
  ) {}

  createParty(socket: TypedSocket, userId: string, name: string, elo: number) {
    // Leave existing party first
    this.leaveParty(socket);

    const partyId = crypto.randomUUID();
    const party: Party = {
      id: partyId,
      leaderId: userId,
      members: new Map([[userId, { userId, name, socketId: socket.id, elo }]]),
      pendingInvites: new Set(),
    };

    this.parties.set(partyId, party);
    this.userToParty.set(userId, partyId);
    this.socketToUser.set(socket.id, userId);

    this.broadcastPartyUpdate(party);
  }

  inviteToParty(socket: TypedSocket, targetUserId: string) {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit("partyError", { message: "Not in a party" });
      return;
    }

    const partyId = this.userToParty.get(userId);
    if (!partyId) {
      socket.emit("partyError", { message: "Not in a party" });
      return;
    }

    const party = this.parties.get(partyId);
    if (!party) {
      socket.emit("partyError", { message: "Party not found" });
      return;
    }

    if (party.leaderId !== userId) {
      socket.emit("partyError", { message: "Only the party leader can invite" });
      return;
    }

    if (party.members.size >= MAX_PARTY_SIZE) {
      socket.emit("partyError", { message: "Party is full" });
      return;
    }

    if (party.members.has(targetUserId)) {
      socket.emit("partyError", { message: "Already in your party" });
      return;
    }

    if (this.userToParty.has(targetUserId)) {
      socket.emit("partyError", { message: "Player is already in a party" });
      return;
    }

    if (party.pendingInvites.has(targetUserId)) {
      socket.emit("partyError", { message: "Invite already sent" });
      return;
    }

    // Send invite to target's active sockets
    const targetSockets = this.socialManager.getSocketsForUser(targetUserId);
    if (targetSockets.length === 0) {
      socket.emit("partyError", { message: "Player is offline" });
      return;
    }

    const leader = party.members.get(userId)!;
    party.pendingInvites.add(targetUserId);

    for (const socketId of targetSockets) {
      this.io.to(socketId).emit("partyInvite", {
        partyId,
        fromUserId: userId,
        fromName: leader.name,
      });
    }

    // Auto-expire invite
    setTimeout(() => {
      party.pendingInvites.delete(targetUserId);
    }, INVITE_EXPIRY_MS);
  }

  respondToInvite(socket: TypedSocket, partyId: string, accept: boolean, userId: string, name: string, elo: number) {
    const party = this.parties.get(partyId);
    if (!party) {
      socket.emit("partyError", { message: "Party no longer exists" });
      return;
    }

    if (!party.pendingInvites.has(userId)) {
      socket.emit("partyError", { message: "Invite expired" });
      return;
    }

    party.pendingInvites.delete(userId);

    if (!accept) return;

    if (party.members.size >= MAX_PARTY_SIZE) {
      socket.emit("partyError", { message: "Party is full" });
      return;
    }

    // Leave any existing party
    this.leaveParty(socket);

    party.members.set(userId, { userId, name, socketId: socket.id, elo });
    this.userToParty.set(userId, partyId);
    this.socketToUser.set(socket.id, userId);

    this.broadcastPartyUpdate(party);
  }

  leaveParty(socket: TypedSocket) {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) return;

    const partyId = this.userToParty.get(userId);
    if (!partyId) return;

    const party = this.parties.get(partyId);
    if (!party) {
      this.userToParty.delete(userId);
      this.socketToUser.delete(socket.id);
      return;
    }

    party.members.delete(userId);
    this.userToParty.delete(userId);
    this.socketToUser.delete(socket.id);

    if (party.members.size === 0) {
      this.parties.delete(partyId);
      return;
    }

    // Transfer leadership if leader left
    if (party.leaderId === userId) {
      const nextMember = party.members.values().next().value;
      if (nextMember) {
        party.leaderId = nextMember.userId;
      }
    }

    this.broadcastPartyUpdate(party);
  }

  kickMember(socket: TypedSocket, targetUserId: string) {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit("partyError", { message: "Not in a party" });
      return;
    }

    const partyId = this.userToParty.get(userId);
    if (!partyId) {
      socket.emit("partyError", { message: "Not in a party" });
      return;
    }

    const party = this.parties.get(partyId);
    if (!party) {
      socket.emit("partyError", { message: "Party not found" });
      return;
    }

    if (party.leaderId !== userId) {
      socket.emit("partyError", { message: "Only the leader can kick" });
      return;
    }

    const target = party.members.get(targetUserId);
    if (!target) {
      socket.emit("partyError", { message: "Player not in party" });
      return;
    }

    party.members.delete(targetUserId);
    this.userToParty.delete(targetUserId);
    this.socketToUser.delete(target.socketId);

    // Notify the kicked player
    this.io.to(target.socketId).emit("partyDisbanded");

    this.broadcastPartyUpdate(party);
  }

  handleDisconnect(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    const partyId = this.userToParty.get(userId);
    if (!partyId) {
      this.socketToUser.delete(socketId);
      return;
    }

    const party = this.parties.get(partyId);
    if (!party) {
      this.userToParty.delete(userId);
      this.socketToUser.delete(socketId);
      return;
    }

    party.members.delete(userId);
    this.userToParty.delete(userId);
    this.socketToUser.delete(socketId);

    if (party.members.size === 0) {
      this.parties.delete(partyId);
      return;
    }

    // Transfer leadership if leader disconnected
    if (party.leaderId === userId) {
      const nextMember = party.members.values().next().value;
      if (nextMember) {
        party.leaderId = nextMember.userId;
      }
    }

    this.broadcastPartyUpdate(party);
  }

  getPartyForUser(userId: string): Party | null {
    const partyId = this.userToParty.get(userId);
    if (!partyId) return null;
    return this.parties.get(partyId) ?? null;
  }

  /** Get all party members with their sockets — used by matchmaker to enqueue the whole party */
  getPartyMembers(userId: string): Array<{ socketId: string; player: RacePlayer }> | null {
    const party = this.getPartyForUser(userId);
    if (!party) return null;

    const result: Array<{ socketId: string; player: RacePlayer }> = [];
    for (const member of party.members.values()) {
      result.push({
        socketId: member.socketId,
        player: {
          id: member.userId,
          name: member.name,
          isGuest: false,
          elo: member.elo,
        },
      });
    }
    return result;
  }

  getPartyIdForUser(userId: string): string | undefined {
    return this.userToParty.get(userId);
  }

  isInParty(userId: string): boolean {
    return this.userToParty.has(userId);
  }

  getUserForSocket(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  private broadcastPartyUpdate(party: Party) {
    const state: PartyState = {
      partyId: party.id,
      leaderId: party.leaderId,
      members: [...party.members.values()].map((m) => ({
        userId: m.userId,
        name: m.name,
      })),
    };

    for (const member of party.members.values()) {
      this.io.to(member.socketId).emit("partyUpdate", state);
    }
  }
}
