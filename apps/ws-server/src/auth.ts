import { jwtVerify } from "jose";
import type { RacePlayer } from "@typeoff/shared";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function authenticateSocket(
  data: { token?: string },
  socketId: string
): Promise<RacePlayer> {
  if (!data.token) {
    throw new Error("Authentication required");
  }

  try {
    const { payload } = await jwtVerify(data.token, secret);

    // Guest token
    if (payload.isGuest === true) {
      return {
        id: payload.sub!,
        name: "Guest",
        isGuest: true,
        elo: 1000,
        modeElos: {},
        modeRacesPlayed: {},
      };
    }

    return {
      id: payload.sub!,
      name: (payload.name as string) ?? "Player",
      isGuest: false,
      elo: (payload.elo as number) ?? 1000,
      modeElos: (payload.modeElos as Record<string, number>) ?? {},
      modeRacesPlayed: (payload.modeRacesPlayed as Record<string, number>) ?? {},
      isPro: (payload.isPro as boolean) ?? false,
      activeBadge: (payload.activeBadge as string) ?? null,
      activeNameColor: (payload.activeNameColor as string) ?? null,
      activeNameEffect: (payload.activeNameEffect as string) ?? null,
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}
