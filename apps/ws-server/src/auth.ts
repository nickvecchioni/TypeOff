import { jwtVerify } from "jose";
import type { RacePlayer } from "@typeoff/shared";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function authenticateSocket(
  data: { token?: string; guestName?: string },
  socketId: string
): Promise<RacePlayer> {
  // Guest auth
  if (!data.token) {
    const name = (data.guestName ?? "Guest").slice(0, 20).trim() || "Guest";
    return {
      id: `guest_${socketId}`,
      name,
      isGuest: true,
      elo: 1000,
    };
  }

  // JWT auth
  try {
    const { payload } = await jwtVerify(data.token, secret);
    return {
      id: payload.sub!,
      name: (payload.name as string) ?? "Player",
      isGuest: false,
      elo: (payload.elo as number) ?? 1000,
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}
