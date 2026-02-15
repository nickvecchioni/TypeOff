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
  peakEloRating: integer("peak_elo_rating").notNull().default(1000),
  peakRankTier: text("peak_rank_tier").notNull().default("bronze"),
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

// ─── Season Tables ──────────────────────────────────────────────────

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
});

export const seasonSnapshots = pgTable("season_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  finalElo: integer("final_elo").notNull(),
  finalRankTier: text("final_rank_tier").notNull(),
  peakElo: integer("peak_elo").notNull(),
  peakRankTier: text("peak_rank_tier").notNull(),
  racesPlayed: integer("races_played").notNull().default(0),
  racesWon: integer("races_won").notNull().default(0),
});

// ─── Achievement Tables ─────────────────────────────────────────────

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.achievementId] }),
  ]
);

// ─── Challenge Tables ───────────────────────────────────────────────

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // "daily" | "weekly"
  title: text("title").notNull(),
  description: text("description").notNull(),
  metric: text("metric").notNull(),
  target: integer("target").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }).notNull(),
});

export const challengeProgress = pgTable("challenge_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currentValue: integer("current_value").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

// ─── Tournament Tables ──────────────────────────────────────────────

export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status").notNull().default("open"), // "open" | "in_progress" | "finished"
  maxPlayers: integer("max_players").notNull().default(8),
  bracketSize: integer("bracket_size").notNull().default(8),
  currentRound: integer("current_round").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  startedAt: timestamp("started_at", { mode: "date" }),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
});

export const tournamentParticipants = pgTable("tournament_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seed: integer("seed"),
  eliminatedRound: integer("eliminated_round"),
  placement: integer("placement"),
  joinedAt: timestamp("joined_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const tournamentMatches = pgTable("tournament_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchIndex: integer("match_index").notNull(),
  player1Id: text("player1_id").references(() => users.id),
  player2Id: text("player2_id").references(() => users.id),
  winnerId: text("winner_id").references(() => users.id),
  raceId: uuid("race_id").references(() => races.id),
  status: text("status").notNull().default("pending"), // "pending" | "racing" | "finished"
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
