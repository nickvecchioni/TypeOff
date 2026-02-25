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

No test runner is configured. No CI/CD pipelines exist. No ESLint/Prettier configs are present. Linting: web app uses `next lint`, ws-server/shared/db use `tsc --noEmit` (typecheck only).

## Key conventions

- **Tailwind v4**: Uses `@import "tailwindcss"` + `@theme` block in `globals.css`. No `tailwind.config.js`.
- **PostCSS**: Plugin is `@tailwindcss/postcss` (not `tailwindcss`). Config at `apps/web/postcss.config.mjs`.
- **Shared package is JIT**: `packages/shared` exports raw `.ts` files. Next.js `transpilePackages` compiles them. No build step needed.
- **packageManager field**: Root `package.json` must keep `"packageManager": "npm@11.6.2"` for Turborepo.
- **Font**: JetBrains Mono via `next/font/google`. Monospace is essential — cursor positioning uses `ch` units.
- **Auth**: NextAuth v5 (beta) with Google OAuth + credentials (test accounts). JWT sessions. WebSocket auth via separate JWT from `/api/ws-token`.
- **Path aliases** (in `tsconfig.json` for web and ws-server):
  - `@/*` → `./src/*` (web only)
  - `@typeoff/shared` → `../../packages/shared/src`
  - `@typeoff/db` → `../../packages/db/src`
- **TypeScript**: Strict mode, target ES2022, bundler module resolution. Root `tsconfig.json` is extended by `ws-server`, `shared`, and `db`. The web app has its own standalone Next.js tsconfig.
- **WS server**: Uses `tsx` for dev (`tsx watch`) and production (`tsx src/index.ts`). Module type ESM.
- **Profanity filter**: `leo-profanity` in ws-server for chat/message filtering.
- **No middleware**: No Next.js middleware file exists.

## Environment variables

### Web app (`apps/web/.env.local`) — see `.env.local.example`

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | NextAuth JWT secret (must match ws-server) |
| `AUTH_TRUST_HOST` | Set to `true` for local dev |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (exposed to browser) |
| `NEXT_PUBLIC_APP_URL` | App URL for Stripe redirects |
| `ADMIN_SECRET` | Admin panel / test account access key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe monthly price ID |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Stripe yearly price ID |
| `GITHUB_TOKEN` | GitHub PAT for bug report integration |
| `GITHUB_REPO_OWNER` | GitHub repo owner |
| `GITHUB_REPO_NAME` | GitHub repo name |

### WebSocket server (`apps/ws-server/.env`) — see `.env.example`

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection (same as web) |
| `AUTH_SECRET` | JWT secret (must match web) |
| `PORT` | Server port (default 3001) |
| `CORS_ORIGIN` | Allowed CORS origin (default `http://localhost:3000`) |

## Auth system

**Config**: `apps/web/src/lib/auth.ts`
**Type extensions**: `apps/web/src/types/next-auth.d.ts`

NextAuth v5 (beta) with JWT strategy (not database sessions). DrizzleAdapter for user/account storage.

**Providers**: Google OAuth + Credentials (test accounts, gated by `ADMIN_SECRET`).

**JWT/session contents**: `id`, `eloRating`, `rankTier`, `username`, `placementsCompleted`, `currentStreak`, `totalXp`, `cosmeticLevel` (derived from `totalXp` via `getXpLevel()`), `isPro`, `activeBadge`, `activeTitle`, `activeNameColor`, `activeNameEffect`, `activeCursorStyle`, `activeProfileBorder`, `activeTypingTheme`.

JWT refreshes user data from DB every 30 seconds on active sessions.

## Typing engine (`apps/web/src/hooks/useTypingEngine.ts`)

Core state machine for both solo and race modes. Key design:

- Stats counters are `useRef` (not state) to avoid re-renders on every keystroke
- Cursor position calculated with `ch` units (no DOM measurement)
- Word scrolling via CSS `transform: translateY()` (GPU composited)
- Timer uses `performance.now()` deltas (no drift)
- Keydown handler on a focusable `<div>`, not an input/textarea
- Tab = restart, Escape = restart
- No cross-word backspace — space advances only after completing a word
- Records `ReplaySnapshot[]` (timestamp, word index, char index) for replay/ghost
- Tracks per-key and bigram accuracy stats

## Database (`packages/db/`)

Neon Serverless Postgres with Drizzle ORM. Uses `@neondatabase/serverless` HTTP driver.

Schema changes: edit `packages/db/src/schema.ts`, then `npm run db:push --workspace=packages/db`.

**Files**: `schema.ts` (table definitions), `client.ts` (Neon HTTP driver + `createDb()`), `index.ts` (re-exports).

Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Core user record (eloRating, rankTier, peakEloRating, peakRankTier, lastSeen) |
| `userStats` | Aggregate stats (totalXp, totalPp, streaks, WPM bests) |
| `userModeStats` | Per-mode category stats |
| `races` | Completed race records (seed, wordCount, mode, playerCount) |
| `raceParticipants` | Per-user race results + replay data + PP |
| `soloResults` | Solo practice results with full stats + replay data + PB flag |
| `friendships` | Friend requests/connections with status |
| `directMessages` | User-to-user DMs |
| `notifications` | In-app notifications with metadata |
| `userBlocks` | Blocked user pairs |
| `userReports` | User abuse reports |
| `userAchievements` | Unlocked achievements |
| `userChallengeProgress` | Daily/weekly challenge tracking with XP awarded |
| `userCosmetics` | Unlocked cosmetics (linked to season) |
| `userActiveCosmetics` | Currently equipped cosmetics (7 slots: badge, title, name color/effect, cursor, profile border, typing theme) |
| `userSubscription` | Stripe Pro subscription (customerId, subscriptionId, status, currentPeriodEnd) |
| `userPreferences` | Theme overrides, custom theme JSON |
| `userKeyAccuracy` | Per-key accuracy stats (cumulative) |
| `userBigramAccuracy` | Bigram (2-char sequence) accuracy |
| `userAccuracySnapshots` | Periodic key/bigram accuracy snapshots for tracking improvement over time |
| `textLeaderboards` | Per-text performance leaderboards with PP |
| `accounts` / `sessions` / `verificationTokens` | NextAuth internals |

## WebSocket server (`apps/ws-server/`)

Socket.io with typed events (defined in `packages/shared/src/race-types.ts`). Health check at `GET /health`.

Source modules:
- `index.ts` — Main server entry, socket event wiring, DM/chat handling, spectator/follow logic
- `auth.ts` — JWT verification for socket connections
- `db.ts` — Lazy singleton DB connection (`getDb()`)
- `matchmaker.ts` — ELO-based queue, bot generation after timeout
- `race-manager.ts` — Race lifecycle (countdown, progress tracking, finish, ELO calculation)
- `party-manager.ts` — Party creation, invites, ready-state gate, private race mode
- `social-manager.ts` — Online status tracking, friend notifications
- `notification-manager.ts` — Real-time notification delivery
- `xp-checker.ts` — XP calculation + level-up detection on race completion
- `achievement-checker.ts` — Achievement unlock logic (22 achievements)
- `challenge-checker.ts` — Daily/weekly challenge progress tracking

ELO: K=32 for first 30 games, K=16 after. Matchmaking expands ±50 ELO every 5s (max ±400). Bot opponents fill immediately (0ms delay). 3 placement races before ranked. Max 4 players per race.

## Shared package (`packages/shared/src/`)

JIT TypeScript — no build needed. All modules re-exported from `index.ts`.

| Module | Contents |
|--------|----------|
| `types.ts` | Core types: `CharStatus`, `WordState`, `TestConfig`, `TestStats`, `ReplaySnapshot`, `EngineAPI`, content/mode/difficulty enums |
| `race-types.ts` | Socket.io typed events (`ClientToServerEvents`, `ServerToClientEvents`), `RaceState`, `RacePlayer`, `PartyState`, `RaceMode`, `EmoteKey` |
| `elo.ts` | `RankTier` enum, tier thresholds (Bronze 0–999 → Grandmaster 2500+), `calculateEloChange()`, `getRankInfo()`, `getRankProgress()` |
| `achievements.ts` | 22 achievement definitions across 6 categories (speed, accuracy, volume, wins, rank, social) |
| `challenges.ts` | 9 daily + 6 weekly challenge definitions, `getXpLevel()`, `getDailyKey()`, `getWeeklyKey()` |
| `words.ts` | Word lists by difficulty (easy/medium/hard) |
| `quotes.ts` | Famous quotes for quote mode |
| `code-snippets.ts` | Code samples for code mode |
| `prng.ts` | Mulberry32 seeded PRNG — deterministic word selection so all race players see identical words |
| `difficulty.ts` | `TextDifficultyAnalyzer` — scores text difficulty from bigram rarity, word length, special chars; `getBigramFrequency()` |
| `username.ts` | Username validation (pattern + length) |
| `type-pass.ts` | TypePass (cosmetic battle pass) — tier pricing, progression, reward definitions |
| `smart-practice.ts` | `rankWeaknesses()`, `estimateWpmImpact()` — ranks key/bigram weaknesses by WPM impact for practice insights |

## Pages (`apps/web/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Home page |
| `/race` | Race lobby / queue screen |
| `/solo` | Solo practice arena |
| `/leaderboard` | Leaderboards (PP, text, universe) |
| `/profile/[username]` | User profile with stats, achievements |
| `/races/[raceId]` | Race replay viewer |
| `/analytics` | Per-key and bigram accuracy, WPM trends |
| `/history` | Race history |
| `/spectate` | Live spectator mode |
| `/cosmetics` | Cosmetics shop / browser |
| `/ranks` | Rank info page |
| `/pro` | Pro subscription landing |
| `/pro/checkout` | Stripe checkout |
| `/pro/checkout/return` | Checkout return handler |
| `/admin` | Admin dashboard |
| `/signin` | Sign in page |
| `/setup-username` | Onboarding username setup |
| `/report-issue` | Bug report form |

## API routes (`apps/web/app/api/`)

| Route | Purpose |
|-------|---------|
| `auth/[...nextauth]` | NextAuth handler |
| `ws-token` | JWT for WebSocket auth |
| `users` | User info |
| `username` | Username availability / update |
| `achievements/[userId]` | Unlocked achievements |
| `challenges` | Daily/weekly challenges |
| `claim-placement` | Claim placement rewards |
| `analytics` | Typing analytics data |
| `history` | Race history |
| `key-accuracy` | Per-key accuracy stats |
| `bigram-accuracy` | Bigram accuracy stats |
| `friends` | Friend list / add |
| `friends/requests` | Friend requests |
| `friends/search` | Search users for friend add |
| `direct-messages/[userId]` | Per-user DM conversation thread (cursor-paginated) |
| `messages` | DM history (query by `?friendId=`) |
| `messages/unread` | Unread message count |
| `notifications` | User notifications |
| `notifications/count` | Unread notification count |
| `blocks` | Block / unblock users |
| `races/[raceId]` | Race details (for replay) |
| `practice-progress` | Accuracy snapshot history for practice improvement tracking |
| `solo-results` | Submit solo result |
| `report-replay` | Report suspicious replay |
| `pp` | User PP score |
| `pp/leaderboard` | Global PP leaderboard |
| `text-leaderboard` | Per-text leaderboards |
| `cosmetics` | Available cosmetics |
| `cosmetics/[userId]` | User's unlocked cosmetics |
| `pro/checkout` | Stripe checkout session |
| `pro/checkout/status` | Stripe checkout session status polling |
| `pro/portal` | Stripe customer portal |
| `type-pass` | TypePass progression info (stub — not yet implemented) |
| `type-pass/checkout` | TypePass checkout |
| `type-pass/checkout/status` | TypePass checkout status polling |
| `webhooks/stripe` | Stripe webhook handler |
| `preferences` | Save user preferences |
| `seasons/current` | Current season info (stub — not yet implemented) |
| `admin/users` | Admin user management |
| `admin/test-accounts` | Create test accounts |
| `bug-report` | Submit bug report (creates GitHub issue) |
| `reports` | Report user |

## Components (`apps/web/src/components/`)

| Directory | Key components |
|-----------|---------------|
| `typing/` | `WordDisplay`, `CodeWordDisplay`, `Word`, `Character`, `Cursor`, `KeyboardHeatmap`, `WpmChart` |
| `race/` | `RaceArena`, `RaceTypingArea`, `RaceTrack`, `QueueScreen`, `CountdownOverlay`, `RaceResults`, `RaceEmoteBar`, `ChallengesWidget`, `TypePassWidget`, `PlacementReveal`, `GuestPlacement`, `FloatingEmote`, `SpectatorIndicator` |
| `analytics/` | `AnalyticsInsights` (weakness-based WPM impact insights using `smart-practice` module) |
| `practice/` | `PracticeArena`, `ConfigBar`, `PracticeResults`, `PracticeProgress`, `ZenArena`, `ZenFreeformArena`, `StrictModeSelector`, `CodeLanguagePicker`, `BigramAnalysis`, `BigramHeatmap` |
| `social/` | `FriendsButton`, `FriendsDrawer`, `FriendsList`, `AddFriendButton`, `FriendRequests`, `DirectMessageWindow`, `ChatPanel`, `NotificationBell`, `NotificationDrawer`, `NavNotifications`, `NotificationToast`, `PartyInviteToast`, `PartyPanel`, `ReportBlockButton` |
| `replay/` | `ReplayClient`, `ReplayView`, `ReplayControls`, `ReportButton` |
| `spectate/` | `SpectatePageClient`, `SpectatorView`, `SpectatorWordDisplay` |
| `profile/` | `PerformanceCharts`, `ActivityCalendar` |
| `leaderboard/` | `LeaderboardTabs`, `PPLeaderboard`, `TextLeaderboard`, `UniverseSelector`, `SoloModeSelector` |
| `auth/` | `SessionProvider`, `AuthNavLinks`, `UsernameGuard`, `UserMenu`, `SignInPrompt` |
| `items/` | `ItemsBrowser` (cosmetics browser) |
| `settings/` | `ThemePicker` |
| `shared/` | `ShareResultCard`, `VerifiedBadge`, `ReportIssueButton` |
| Root-level | `RankBadge`, `RankUpOverlay`, `NavLogo`, `NavLinks`, `MobileNav`, `WatchLiveButton`, `CosmeticBadge`, `CosmeticTitle`, `CosmeticName` |

## Hooks (`apps/web/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useTypingEngine.ts` | Core typing state machine (solo + race) |
| `useRace.ts` | Race join/leave, progress updates, finish |
| `useSocket.tsx` | Socket.io client connection + context provider |
| `useSocial.tsx` | Friend online status tracking |
| `useParty.tsx` | Party creation, invites, ready state |
| `useChat.tsx` | Party/race chat messages |
| `useDm.tsx` | Direct message conversations |
| `useNotifications.tsx` | Real-time notification handling |
| `useReplay.ts` | Replay playback, scrubbing, speed control |
| `useSpectate.ts` | Live race spectating |
| `useResultCard.ts` | Result card data aggregation |
| `useCapsLock.ts` | Caps Lock key detection |

## Lib (`apps/web/src/lib/`)

| File | Purpose |
|------|---------|
| `auth.ts` | NextAuth v5 configuration (providers, adapter, JWT callbacks) |
| `db.ts` | Lazy singleton `getDb()` for Neon Postgres connection |
| `admin-auth.ts` | `validateAdminSecret()` — timing-safe admin secret comparison |
| `rate-limit.ts` | `createRateLimit()` — in-memory sliding-window rate limiter for API routes |

## Contexts (`apps/web/src/contexts/`)

- `CosmeticContext.tsx` — Cosmetic availability context provider (`CosmeticProvider`, `useActiveCosmetics`, `useUpdateCosmetics`)

## Style

- Dark theme — "Midnight Arena" (bg `#0c0c12`, surface `#16161e`, accent `#4d9eff`)
- Noise texture overlay for depth
- Focus mode: `.focus-active .focus-fade` fades non-essential UI during typing
- Rank colors: bronze `#d97706`, silver `#9ca3af`, gold `#eab308`, platinum `#67e8f9`, diamond `#3b82f6`, master `#a855f7`, grandmaster `#ef4444`
- Animations: blink (cursor), fade-in, slide-up, rank-up-glow, elo-pop, count-pulse
- Tabular numbers (`.tabular-nums`) on all counters to prevent layout shift
- No ligatures (`.no-ligatures`) for accurate character width in typing areas
- Font: `--font-mono: "JetBrains Mono", monospace`

## Deployment

- Web and ws-server deploy separately to Railway
- WebSocket server exposes `/health` for health checks
- Both services must share the same `DATABASE_URL` and `AUTH_SECRET`
- No Docker, Vercel, or CI/CD configuration in the repo

## File quick reference

| What | Where |
|------|-------|
| Pages | `apps/web/app/` |
| API routes | `apps/web/app/api/` |
| Components | `apps/web/src/components/` |
| Hooks | `apps/web/src/hooks/` |
| Auth config | `apps/web/src/lib/auth.ts` |
| DB helper (web) | `apps/web/src/lib/db.ts` |
| Admin auth helper | `apps/web/src/lib/admin-auth.ts` |
| Rate limiter | `apps/web/src/lib/rate-limit.ts` |
| Session types | `apps/web/src/types/next-auth.d.ts` |
| Cosmetic context | `apps/web/src/contexts/CosmeticContext.tsx` |
| Global styles | `apps/web/app/globals.css` |
| Next.js config | `apps/web/next.config.ts` |
| PostCSS config | `apps/web/postcss.config.mjs` |
| Shared types | `packages/shared/src/` |
| DB schema | `packages/db/src/schema.ts` |
| DB client | `packages/db/src/client.ts` |
| Drizzle config | `packages/db/drizzle.config.ts` |
| WS server entry | `apps/ws-server/src/index.ts` |
| WS server DB helper | `apps/ws-server/src/db.ts` |
| Turbo config | `turbo.json` |
| Root TS config | `tsconfig.json` |
