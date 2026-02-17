# TypeOff

Competitive typing game with ranked multiplayer, ELO matchmaking, and solo practice.

## Stack

- **Frontend** — Next.js 15, React 19, Tailwind CSS v4, NextAuth v5
- **WebSocket Server** — Node.js, Socket.io
- **Database** — Neon Postgres, Drizzle ORM
- **Shared** — TypeScript package with types, ELO math, word lists, PRNG
- **Monorepo** — Turborepo + npm workspaces

## Structure

```
apps/
  web/             Next.js app (port 3000)
  ws-server/       Socket.io server (port 3001)
packages/
  shared/          Types, ELO, words, PRNG (JIT — exports .ts directly)
  db/              Drizzle schema + Neon connection
```

## Setup

```bash
npm install
```

Copy env files and fill in values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/ws-server/.env.example apps/ws-server/.env
```

**Required env vars:**

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | web, ws-server | Neon Postgres connection string |
| `AUTH_SECRET` | web, ws-server | NextAuth secret (shared for JWT verification) |
| `AUTH_TRUST_HOST` | web | Set to `true` |
| `GOOGLE_CLIENT_ID` | web | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | web | Google OAuth client secret |
| `NEXT_PUBLIC_WS_URL` | web | WebSocket server URL (`http://localhost:3001`) |
| `ADMIN_SECRET` | web | Admin panel access key |
| `PORT` | ws-server | Server port (default `3001`) |
| `CORS_ORIGIN` | ws-server | Allowed origin (default `http://localhost:3000`) |

Push the database schema:

```bash
npm run db:push --workspace=packages/db
```

## Development

```bash
npm run dev
```

Starts both the Next.js app and WebSocket server via Turborepo.

## Features

**Solo mode** — Timed (15s–120s) or word count (10–100) tests with common/medium/hard word pools. Personal bests and leaderboards.

**Ranked multiplayer** — ELO-based matchmaking with 7 rank tiers (Bronze → Grandmaster), 3 placement races for calibration, bot opponents when the queue is empty.

**Private lobbies** — Create rooms with 6-character codes, invite friends, lobby chat.

**Social** — Friend system with requests, online status, and profile pages with full race history.

## Architecture notes

- Typing engine uses `useRef` counters (not state) to avoid per-keystroke re-renders
- Cursor positioned via `ch` units — monospace font means no DOM measurement
- Word scrolling uses CSS `transform: translateY()` for GPU compositing
- Timer uses `performance.now()` deltas to prevent drift
- Seeded PRNG ensures all players in a race type identical words
- ELO uses K=32 for first 30 games, K=16 after — pairwise calculation across all race participants
- Matchmaking expands the ELO search window by ±50 every 5 seconds up to ±400

## Deployment

Both services deploy to Railway as separate services. The WebSocket server exposes a `/health` endpoint for health checks.
