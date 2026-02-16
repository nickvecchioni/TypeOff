# TypeOff

Competitive typing game — ranked multiplayer with ELO matchmaking, solo practice, tournaments, seasons.

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

Key tables: `users`, `races`, `raceParticipants`, `userStats`, `seasons`, `seasonSnapshots`, `soloResults`, `userAchievements`, `challenges`, `challengeProgress`, `tournaments`, `friendships`.

Schema changes: edit `packages/db/src/schema.ts`, then `npm run db:push --workspace=packages/db`.

## WebSocket server (`apps/ws-server/`)

Socket.io with typed events (defined in `packages/shared/src/race-types.ts`).

Modules: `matchmaker.ts` (ELO-based queue), `race-manager.ts` (race lifecycle), `lobby-manager.ts` (private rooms), `tournament-manager.ts` (brackets), `social-manager.ts` (online status), `achievement-checker.ts`.

ELO: K=32 for first 30 games, K=16 after. Matchmaking expands ±50 ELO every 5s (max ±400). Bot opponents after 20s timeout. 3 placement races before ranked.

## File locations

- Pages: `apps/web/app/` (Next.js App Router)
- API routes: `apps/web/app/api/`
- Components: `apps/web/src/components/` (typing/, race/, social/, auth/)
- Hooks: `apps/web/src/hooks/` (useTypingEngine, useSocket, useRace, useLobby, useSocial)
- Shared types: `packages/shared/src/` (types.ts, race-types.ts, elo.ts, words.ts, prng.ts)
- DB schema: `packages/db/src/schema.ts`
- Auth config: `apps/web/auth.ts`

## Style

- Dark theme (bg `#0c0c12`, accent sky-500 `#38bdf8`)
- Noise texture overlay for depth
- Focus mode: `.focus-active .focus-fade` fades non-essential UI during typing
- Rank colors: bronze, silver, gold, platinum, diamond, master, grandmaster
- Animations: fade-in, slide-up, blink cursor, rank-up glow, elo pop
- Tabular numbers on all counters to prevent layout shift
