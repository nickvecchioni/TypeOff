import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { users, accounts, sessions, verificationTokens, userStats } from "@typeoff/db";
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
  pages: {},
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
      }
      return session;
    },
  },
});
