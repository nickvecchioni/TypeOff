# TypeOff

Competitive typing game — ranked multiplayer with ELO matchmaking, solo practice, clans, cosmetics, and Pro subscriptions.

## Monorepo layout

```
apps/web/           — Next.js 15 frontend (App Router, React 19, Tailwind v4)
apps/ws-server/     — Socket.io WebSocket server (matchmaking, race lifecycle)
packages/shared/    — Types, ELO math, word lists, seeded PRNG (JIT — exports .ts)
packages/db/        — Drizzle ORM schema + Neon Postgres connection
```

## Commands

```bash
npm run dev          # Start everything (Turborepo)
npm run build        # Build all packages
npm run lint         # Typecheck all packages
npm run db:push --workspace=packages/db    # Push schema to Neon
npm run db:studio --workspace=packages/db  # Open Drizzle Studio
```

## Key conventions

- **Tailwind v4**: Uses `@import "tailwindcss"` + `@theme` block in globals.css. No tailwind.config.js.
- **PostCSS**: Plugin is `@tailwindcss/postcss` (not `tailwindcss`).
- **Shared package is JIT**: `packages/shared` exports raw `.ts` files. Next.js `transpilePackages` compiles them. No build step needed.
- **packageManager field**: Root package.json must keep `"packageManager": "npm@11.6.2"` for Turborepo.
- **Font**: JetBrains Mono via `next/font/google`. Monospace is essential — cursor positioning uses `ch` units.
- **Auth**: NextAuth v5 (beta) with Google OAuth + credentials (test accounts). JWT sessions. WebSocket auth via separate JWT from `/api/ws-token`.

## Auth JWT contents

JWT/session includes: `eloRating`, `rankTier`, `peakEloRating`, `peakRankTier`, `placementsCompleted`, `currentStreak`, `totalXp`, `cosmeticLevel` (derived from totalXp), `isPro`, `clanId`, `clanTag`, `activeBadge`, `activeTitle`, `activeNameColor`, `activeNameEffect`, `activeCursorStyle`, `activeProfileBorder`, `activeTypingTheme`.

## Typing engine (`apps/web/src/hooks/useTypingEngine.ts`)

Core state machine for both solo and race modes. Key design:

- Stats counters are `useRef` (not state) to avoid re-renders on every keystroke
- Cursor position calculated with `ch` units (no DOM measurement)
- Word scrolling via CSS `transform: translateY()` (GPU composited)
- Timer uses `performance.now()` deltas (no drift)
- Keydown handler on a focusable `<div>`, not an input/textarea
- Tab = restart, Escape = restart
- No cross-word backspace — space advances only after completing a word

## Database (`packages/db/`)

Neon Serverless Postgres with Drizzle ORM. Uses `@neondatabase/serverless` HTTP driver.

Schema changes: edit `packages/db/src/schema.ts`, then `npm run db:push --workspace=packages/db`.

Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Core user record (eloRating, rankTier, clanId) |
| `userStats` | Aggregate stats (totalXp, totalPp, streaks, WPM bests) |
| `races` | Completed race records |
| `raceParticipants` | Per-user race results + replay data |
| `soloResults` | Solo practice results |
| `friendships` | Friend relationships |
| `directMessages` | User-to-user DMs |
| `notifications` | In-app notifications |
| `userBlocks` | Blocked user pairs |
| `userReports` | User abuse reports |
| `userAchievements` | Unlocked achievements |
| `userChallengeProgress` | Daily/weekly challenge tracking |
| `userCosmetics` | Unlocked cosmetics (linked to season) |
| `userActiveCosmetics` | Currently equipped cosmetics (7 slots) |
| `userSubscription` | Stripe Pro subscription (customerId, subscriptionId) |
| `userPreferences` | Theme overrides per user |
| `userKeyAccuracy` | Per-key accuracy stats |
| `userBigramAccuracy` | Bigram (2-char sequence) accuracy |
| `clans` | Clan definitions (name, tag, ownerId) |
| `clanMembers` | Membership with role: leader/officer/member |
| `clanInvites` | Pending clan invites |
| `textLeaderboards` | Per-text performance leaderboards |
| `dailyChallenges` | Daily challenge definitions |
| `dailyChallengeResults` | User completions for daily challenges |
| `accounts` / `sessions` / `verificationTokens` | NextAuth internals |

## WebSocket server (`apps/ws-server/`)

Socket.io with typed events (defined in `packages/shared/src/race-types.ts`).

Modules:
- `matchmaker.ts` — ELO-based queue
- `race-manager.ts` — Race lifecycle
- `lobby-manager.ts` — Private rooms
- `social-manager.ts` — Online status / friends
- `party-manager.ts` — Party grouping for races
- `chat-manager.ts` — Party/race chat
- `notification-manager.ts` — Real-time notifications
- `xp-checker.ts` — XP calculation on race completion
- `achievement-checker.ts` — Achievement unlock logic
- `challenge-checker.ts` — Challenge progress tracking

ELO: K=32 for first 30 games, K=16 after. Matchmaking expands ±50 ELO every 5s (max ±400). Bot opponents after 20s timeout. 3 placement races before ranked.

## Features

- **Clans**: Create/join clans with roles (leader/officer/member). Clan tag shown in races. API: `/api/clans`, `/api/clans/[clanId]/*`.
- **Pro subscription**: Stripe-backed monthly subscription. `userSubscription` table tracks Stripe IDs. Pages: `/pro`, `/pro/checkout`, `/pro/checkout/return`. Webhook at `/api/webhooks`.
- **Daily challenges**: Defined in `dailyChallenges` table, tracked in `userChallengeProgress`. Page: `/daily`.
- **Ghost racing**: Replay a previous run as a ghost opponent. Page: `/ghost`. Hook: `useGhostRace.ts`.
- **Spectate**: Live spectator view. Page: `/spectate`. Hook: `useSpectate.ts`.
- **Analytics**: Per-key and bigram accuracy, WPM trends. Page: `/analytics`.
- **Text leaderboards**: Per-text difficulty scoring with PP (performance points). Page: `/text`.
- **Replay**: Race replay viewer. Page: `/races/[raceId]`. Hook: `useReplay.ts`.

## File locations

- Pages: `apps/web/app/` (Next.js App Router)
- API routes: `apps/web/app/api/`
- Components: `apps/web/src/components/` (typing/, race/, social/, auth/, profile/, leaderboard/, daily/, ghost/, replay/, spectate/, practice/, settings/)
- Hooks: `apps/web/src/hooks/` (useTypingEngine, useSocket, useRace, useLobby, useSocial, useParty, useChat, useNotifications, useGhostRace, useSpectate, useReplay)
- Shared types: `packages/shared/src/` (types.ts, race-types.ts, elo.ts, words.ts, prng.ts, achievements.ts, challenges.ts, difficulty.ts)
- DB schema: `packages/db/src/schema.ts`
- Auth config: `apps/web/auth.ts`

## Style

- Dark theme (bg `#0c0c12`, accent `#4d9eff`)
- Noise texture overlay for depth
- Focus mode: `.focus-active .focus-fade` fades non-essential UI during typing
- Rank colors: bronze, silver, gold, platinum, diamond, master, grandmaster
- Animations: fade-in, slide-up, blink cursor, rank-up glow, elo pop
- Tabular numbers on all counters to prevent layout shift
