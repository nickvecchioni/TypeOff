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
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── NextAuth Tables ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
  lastSeen: timestamp("last_seen", { mode: "date" }),
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
  modeCategory: text("mode_category"), // "words" | "special" | "quotes" | "code"
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
  wpmHistory: text("wpm_history"), // JSON: WpmSample[]
  replayData: text("replay_data"), // JSON: ReplaySnapshot[]
  pp: real("pp"),
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
  wordPool: text("word_pool"), // "common" | "language" | "punctuation" | null
  wpm: real("wpm").notNull(),
  rawWpm: real("raw_wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  correctChars: integer("correct_chars").notNull(),
  incorrectChars: integer("incorrect_chars").notNull(),
  extraChars: integer("extra_chars").notNull(),
  totalChars: integer("total_chars").notNull(),
  time: integer("time").notNull(), // actual elapsed seconds
  isPb: boolean("is_pb").notNull().default(false),
  consistency: real("consistency"),
  keyStatsJson: text("key_stats_json"),
  replayData: text("replay_data"), // JSON: ReplaySnapshot[]
  seed: integer("seed"),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Key Accuracy (cumulative per-user per-key stats) ───────────────

export const userKeyAccuracy = pgTable(
  "user_key_accuracy",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

// ─── Reports ──────────────────────────────────────────────────────

export const userReports = pgTable("user_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedId: text("reported_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Blocks ───────────────────────────────────────────────────────

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

// ─── Direct Messages ────────────────────────────────────────────────

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Achievements ───────────────────────────────────────────────────

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
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
  lastRankedDate: text("last_ranked_date"),
  rankedDayStreak: integer("ranked_day_streak").notNull().default(0),
  maxRankedDayStreak: integer("max_ranked_day_streak").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  totalPp: real("total_pp").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Per-Mode Stats ─────────────────────────────────────────────────

export const userModeStats = pgTable(
  "user_mode_stats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modeCategory: text("mode_category").notNull(), // "words" | "special" | "quotes" | "code"
    racesPlayed: integer("races_played").notNull().default(0),
    racesWon: integer("races_won").notNull().default(0),
    avgWpm: real("avg_wpm").notNull().default(0),
    bestWpm: real("best_wpm").notNull().default(0),
    avgAccuracy: real("avg_accuracy").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.modeCategory] })],
);

// ─── Challenge Progress ─────────────────────────────────────────────

export const userChallengeProgress = pgTable(
  "user_challenge_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id").notNull(),
    periodKey: text("period_key").notNull(), // "2026-02-17" or "2026-W08"
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { mode: "date" }),
    xpAwarded: integer("xp_awarded").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.challengeId, t.periodKey] })],
);

export const userCosmetics = pgTable(
  "user_cosmetics",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cosmeticId: text("cosmetic_id").notNull(),
    seasonId: text("season_id").notNull(),
    unlockedAt: timestamp("unlocked_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cosmeticId] })],
);

// ─── Notifications ──────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "friend_request" | "achievement" | "challenge_complete" | "rank_up" | "rank_down"
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: text("metadata"), // JSON-stringified
  actionUrl: text("action_url"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Pro Subscription ──────────────────────────────────────────────

export const userSubscription = pgTable("user_subscription", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default("inactive"), // "active" | "past_due" | "canceled" | "inactive"
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const userActiveCosmetics = pgTable("user_active_cosmetics", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  activeBadge: text("active_badge"),
  activeTitle: text("active_title"),
  activeNameColor: text("active_name_color"),
  activeNameEffect: text("active_name_effect"),
  activeCursorStyle: text("active_cursor_style"),
  activeProfileBorder: text("active_profile_border"),
  activeTypingTheme: text("active_typing_theme"),
});

// ─── Text Leaderboards ───────────────────────────────────────────

export const textLeaderboards = pgTable(
  "text_leaderboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    textHash: text("text_hash").notNull(),
    seed: integer("seed").notNull(),
    mode: text("mode").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bestWpm: real("best_wpm").notNull(),
    bestAccuracy: real("best_accuracy").notNull(),
    bestRaceId: uuid("best_race_id").references(() => races.id, { onDelete: "set null" }),
    pp: real("pp").notNull().default(0),
    textDifficulty: real("text_difficulty").notNull().default(1),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique().on(t.textHash, t.userId)],
);

// ─── Bigram Accuracy ─────────────────────────────────────────────

export const userBigramAccuracy = pgTable(
  "user_bigram_accuracy",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bigram: text("bigram").notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bigram] })],
);

// ─── Accuracy Snapshots (practice progress tracking) ─────────────

export const userAccuracySnapshots = pgTable(
  "user_accuracy_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    snapshotType: text("snapshot_type").notNull(), // "key" | "bigram"
    target: text("target").notNull(),              // "j" or "th"
    accuracy: real("accuracy").notNull(),          // 0-1
    totalCount: integer("total_count").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("accuracy_snapshot_lookup_idx").on(t.userId, t.snapshotType, t.target, t.createdAt),
  ],
);

// ─── User Preferences ────────────────────────────────────────────

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  typingThemeOverride: text("typing_theme_override"),
  customThemeJson: text("custom_theme_json"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});
