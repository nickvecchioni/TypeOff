import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  real,
  boolean,
  unique,
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
  peakEloRating: integer("peak_elo_rating").notNull().default(1000),
  peakRankTier: text("peak_rank_tier").notNull().default("bronze"),
  placementsCompleted: boolean("placements_completed").notNull().default(false),
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
  wordPool: text("word_pool"),
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
  flagged: boolean("flagged").notNull().default(false),
  flagReason: text("flag_reason"),
});

// ─── Friendship Tables ──────────────────────────────────────────────

export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  addresseeId: text("addressee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

// ─── Solo Results ──────────────────────────────────────────────────

export const soloResults = pgTable("solo_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // "timed" | "wordcount"
  duration: integer("duration").notNull(), // seconds for timed, word count for wordcount
  wordPool: text("word_pool"), // "common" | "medium" | "hard" | "quotes" | "code" | null
  wpm: real("wpm").notNull(),
  rawWpm: real("raw_wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  correctChars: integer("correct_chars").notNull(),
  incorrectChars: integer("incorrect_chars").notNull(),
  extraChars: integer("extra_chars").notNull(),
  totalChars: integer("total_chars").notNull(),
  time: integer("time").notNull(), // actual elapsed seconds
  isPb: boolean("is_pb").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Per-Type Ratings ───────────────────────────────────────────────

export const userRatings = pgTable(
  "user_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    raceType: text("race_type").notNull(), // "common" | "medium" | "hard"
    eloRating: integer("elo_rating").notNull().default(1000),
    rankTier: text("rank_tier").notNull().default("bronze"),
    peakEloRating: integer("peak_elo_rating").notNull().default(1000),
    peakRankTier: text("peak_rank_tier").notNull().default("bronze"),
    placementsCompleted: boolean("placements_completed").notNull().default(false),
    racesPlayed: integer("races_played").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [unique().on(table.userId, table.raceType)]
);

// ─── Player Stats ───────────────────────────────────────────────────

export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  racesPlayed: integer("races_played").notNull().default(0),
  racesWon: integer("races_won").notNull().default(0),
  avgWpm: real("avg_wpm").notNull().default(0),
  maxWpm: real("max_wpm").notNull().default(0),
  avgAccuracy: real("avg_accuracy").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});
