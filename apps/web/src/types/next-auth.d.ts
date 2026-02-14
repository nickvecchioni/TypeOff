import type { RankTier } from "@typeoff/shared";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      eloRating: number;
      rankTier: RankTier;
      username: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    eloRating?: number;
    rankTier?: RankTier;
    username?: string | null;
  }
}
