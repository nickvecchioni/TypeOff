import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { users, accounts, sessions, verificationTokens } from "@typeoff/db";
import { slugifyUsername } from "@typeoff/shared";
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
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.name) return;
      const db = getDb();
      let slug = slugifyUsername(user.name);
      if (!slug) slug = "player";

      // Check uniqueness, append numeric suffix on collision
      let candidate = slug;
      let suffix = 1;
      while (true) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, candidate))
          .limit(1);
        if (existing.length === 0) break;
        candidate = `${slug}-${suffix++}`.slice(0, 20);
      }

      await db
        .update(users)
        .set({ username: candidate })
        .where(eq(users.id, user.id));
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Load elo/rank/username from DB on sign-in or update
      if ((trigger === "signIn" || trigger === "update") && token.id) {
        const db = getDb();
        const row = await db
          .select({
            eloRating: users.eloRating,
            rankTier: users.rankTier,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (row.length > 0) {
          token.eloRating = row[0].eloRating;
          token.rankTier = row[0].rankTier as any;
          token.username = row[0].username;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.eloRating = (token.eloRating as number) ?? 1000;
        session.user.rankTier = (token.rankTier as any) ?? "bronze";
        session.user.username = (token.username as string) ?? null;
      }
      return session;
    },
  },
});
