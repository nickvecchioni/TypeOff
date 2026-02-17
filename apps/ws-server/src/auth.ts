import { jwtVerify } from "jose";
import type { RacePlayer, RaceType } from "@typeoff/shared";

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
    return {
      id: payload.sub!,
      name: (payload.name as string) ?? "Player",
      isGuest: false,
      elo: (payload.elo as number) ?? 1000,
      eloByType: (payload.eloByType as Partial<Record<RaceType, number>>) ?? {},
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}
