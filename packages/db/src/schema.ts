import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── NextAuth Tables ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Game-specific fields
  username: text("username").unique(),
  eloRating: integer("elo_rating").notNull().default(1000),
  rankTier: text("rank_tier").notNull().default("bronze"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ─── Game Tables ───────────────────────────────────────────────────

export const races = pgTable("races", {
  id: uuid("id").primaryKey().defaultRandom(),
  seed: integer("seed").notNull(),
  wordCount: integer("word_count").notNull(),
  playerCount: integer("player_count").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
});

export const raceParticipants = pgTable("race_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  raceId: uuid("race_id")
    .notNull()
    .references(() => races.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  placement: integer("placement"),
  wpm: real("wpm"),
  rawWpm: real("raw_wpm"),
  accuracy: real("accuracy"),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  eloBefore: integer("elo_before"),
  eloAfter: integer("elo_after"),
});

export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  racesPlayed: integer("races_played").notNull().default(0),
  racesWon: integer("races_won").notNull().default(0),
  avgWpm: real("avg_wpm").notNull().default(0),
  maxWpm: real("max_wpm").notNull().default(0),
  avgAccuracy: real("avg_accuracy").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});
