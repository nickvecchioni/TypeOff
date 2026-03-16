-- Reset all ELO data and require fresh placements for every user.
-- Preserves: race history, user stats (avgWpm, maxWpm, streaks, XP, PP),
--            achievements, challenges, cosmetics, subscriptions, friendships,
--            solo results, replay data, key accuracy, etc.
--
-- Run via: psql $DATABASE_URL -f packages/db/reset-elo.sql
-- Or paste into Drizzle Studio SQL runner.

BEGIN;

-- 1. Delete all per-mode stats (resets placement detection + mode ELO).
--    Placement detection uses modeRacesPlayed which comes from this table.
--    Rows will be re-created as users complete races.
DELETE FROM user_mode_stats;

-- 2. Reset global ELO fields on users table to defaults.
--    These get re-synced from userModeStats after placement completion.
UPDATE users SET
  elo_rating = 1000,
  rank_tier = 'bronze',
  peak_elo_rating = 1000,
  peak_rank_tier = 'bronze',
  placements_completed = false;

COMMIT;
