import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { users, accounts, sessions, verificationTokens, userStats, userActiveCosmetics, userSubscription } from "@typeoff/db";
import { getXpLevel } from "@typeoff/shared";
import { eq } from "drizzle-orm";

const adapter = process.env.DATABASE_URL
  ? DrizzleAdapter(getDb(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersTable: users as any,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
        const userId = token.id as string;

        const [row, subRows, cosmeticRows] = await Promise.all([
          db
            .select({
              eloRating: users.eloRating,
              rankTier: users.rankTier,
              username: users.username,
              currentStreak: userStats.currentStreak,
              totalXp: userStats.totalXp,
            })
            .from(users)
            .leftJoin(userStats, eq(users.id, userStats.userId))
            .where(eq(users.id, userId))
            .limit(1),
          db
            .select({ status: userSubscription.status })
            .from(userSubscription)
            .where(eq(userSubscription.userId, userId))
            .limit(1),
          db
            .select({
              activeBadge: userActiveCosmetics.activeBadge,
              activeTitle: userActiveCosmetics.activeTitle,
              activeNameColor: userActiveCosmetics.activeNameColor,
              activeNameEffect: userActiveCosmetics.activeNameEffect,
              activeCursorStyle: userActiveCosmetics.activeCursorStyle,
              activeProfileBorder: userActiveCosmetics.activeProfileBorder,
              activeTypingTheme: userActiveCosmetics.activeTypingTheme,
            })
            .from(userActiveCosmetics)
            .where(eq(userActiveCosmetics.userId, userId))
            .limit(1),
        ]);

        if (row.length > 0) {
          token.eloRating = row[0].eloRating;
          token.rankTier = row[0].rankTier as any;
          token.username = row[0].username;
          token.currentStreak = row[0].currentStreak ?? 0;
          token.totalXp = row[0].totalXp ?? 0;
        } else {
          // User was deleted from DB — invalidate the session
          return {} as typeof token;
        }

        // Compute level from totalXp (used for cosmetic unlocks)
        token.cosmeticLevel = getXpLevel(token.totalXp as number ?? 0).level;

        // Pro subscription status
        const sub = subRows[0];
        token.isPro = sub?.status === "active" || sub?.status === "lifetime" || sub?.status === "past_due";

        // Active cosmetics
        const cosmetics = cosmeticRows[0];
        token.activeBadge = cosmetics?.activeBadge ?? null;
        token.activeTitle = cosmetics?.activeTitle ?? null;
        token.activeNameColor = cosmetics?.activeNameColor ?? null;
        token.activeNameEffect = cosmetics?.activeNameEffect ?? null;
        token.activeCursorStyle = cosmetics?.activeCursorStyle ?? null;
        token.activeProfileBorder = cosmetics?.activeProfileBorder ?? null;
        token.activeTypingTheme = cosmetics?.activeTypingTheme ?? null;

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
        session.user.currentStreak = (token.currentStreak as number) ?? 0;
        session.user.totalXp = (token.totalXp as number) ?? 0;
        session.user.cosmeticLevel = (token.cosmeticLevel as number) ?? 0;
        session.user.isPro = (token.isPro as boolean) ?? false;
        session.user.activeBadge = (token.activeBadge as string) ?? null;
        session.user.activeTitle = (token.activeTitle as string) ?? null;
        session.user.activeNameColor = (token.activeNameColor as string) ?? null;
        session.user.activeNameEffect = (token.activeNameEffect as string) ?? null;
        session.user.activeCursorStyle = (token.activeCursorStyle as string) ?? null;
        session.user.activeProfileBorder = (token.activeProfileBorder as string) ?? null;
        session.user.activeTypingTheme = (token.activeTypingTheme as string) ?? null;
      }
      return session;
    },
  },
});
