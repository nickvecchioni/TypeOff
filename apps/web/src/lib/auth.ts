import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { users, accounts, sessions, verificationTokens, userStats, userActiveCosmetics, userSubscription, clans } from "@typeoff/db";
import { getCosmeticLevel } from "@typeoff/shared";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "credentials",
      name: "Test Account",
      credentials: {
        userId: { type: "text" },
        adminSecret: { type: "text" },
      },
      async authorize(credentials) {
        const secret = credentials?.adminSecret as string | undefined;
        const userId = credentials?.userId as string | undefined;
        if (!secret || !userId) return null;
        if (secret !== process.env.ADMIN_SECRET) return null;

        const db = getDb();
        const row = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (row.length === 0) return null;

        return { id: row[0].id, name: row[0].username };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Refresh from DB on sign-in, explicit update, missing username, or every 30s
      const now = Date.now();
      const lastRefresh = (token.eloRefreshedAt as number) ?? 0;
      const shouldRefresh =
        trigger === "signIn" ||
        trigger === "update" ||
        !token.username ||
        now - lastRefresh > 30_000;

      if (shouldRefresh && token.id) {
        const db = getDb();
        const row = await db
          .select({
            eloRating: users.eloRating,
            rankTier: users.rankTier,
            username: users.username,
            placementsCompleted: users.placementsCompleted,
            clanId: users.clanId,
            currentStreak: userStats.currentStreak,
            totalXp: userStats.totalXp,
          })
          .from(users)
          .leftJoin(userStats, eq(users.id, userStats.userId))
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (row.length > 0) {
          token.eloRating = row[0].eloRating;
          token.rankTier = row[0].rankTier as any;
          token.username = row[0].username;
          token.placementsCompleted = row[0].placementsCompleted;
          token.currentStreak = row[0].currentStreak ?? 0;
          token.totalXp = row[0].totalXp ?? 0;
        } else {
          // User was deleted from DB — invalidate the session
          return {} as typeof token;
        }

        // Compute cosmetic level from totalXp
        token.cosmeticLevel = getCosmeticLevel(token.totalXp as number ?? 0);

        // Fetch Pro subscription status
        const [sub] = await db
          .select({ status: userSubscription.status })
          .from(userSubscription)
          .where(eq(userSubscription.userId, token.id as string))
          .limit(1);
        token.isPro = sub?.status === "active";

        const [cosmetics] = await db
          .select({
            activeBadge: userActiveCosmetics.activeBadge,
            activeTitle: userActiveCosmetics.activeTitle,
            activeNameColor: userActiveCosmetics.activeNameColor,
          })
          .from(userActiveCosmetics)
          .where(eq(userActiveCosmetics.userId, token.id as string))
          .limit(1);
        token.activeBadge = cosmetics?.activeBadge ?? null;
        token.activeTitle = cosmetics?.activeTitle ?? null;
        token.activeNameColor = cosmetics?.activeNameColor ?? null;

        // Fetch clan info
        if (row[0].clanId) {
          const [clan] = await db
            .select({ tag: clans.tag })
            .from(clans)
            .where(eq(clans.id, row[0].clanId as string))
            .limit(1);
          token.clanId = row[0].clanId;
          token.clanTag = clan?.tag ?? null;
        } else {
          token.clanId = null;
          token.clanTag = null;
        }

        token.eloRefreshedAt = now;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.eloRating = (token.eloRating as number) ?? 1000;
        session.user.rankTier = (token.rankTier as any) ?? "bronze";
        session.user.username = (token.username as string) ?? null;
        session.user.placementsCompleted = (token.placementsCompleted as boolean) ?? false;
        session.user.currentStreak = (token.currentStreak as number) ?? 0;
        session.user.totalXp = (token.totalXp as number) ?? 0;
        session.user.cosmeticLevel = (token.cosmeticLevel as number) ?? 0;
        session.user.isPro = (token.isPro as boolean) ?? false;
        session.user.activeBadge = (token.activeBadge as string) ?? null;
        session.user.activeTitle = (token.activeTitle as string) ?? null;
        session.user.activeNameColor = (token.activeNameColor as string) ?? null;
        session.user.clanId = (token.clanId as string) ?? null;
        session.user.clanTag = (token.clanTag as string) ?? null;
      }
      return session;
    },
  },
});
