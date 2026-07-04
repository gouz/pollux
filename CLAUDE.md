# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install                 # install deps
bun run dev                 # run server on http://localhost:3000 (alias: bun src/index.ts)
bun test                    # run the test suite
bun test src/scoring.test.ts   # run a single test file
```

`bunx tsc --noEmit` does NOT pass cleanly — the config lacks Bun's ambient types, so text imports (`with { type: "text" }` → `HTMLBundle`), `req.params`, and the `Server` generic report errors at type-check time even though they work at runtime. Type-checking is not a gate here; `bun test` and the compile build are.

Tests use Bun's built-in runner (`bun:test`, zero-config). Pure logic is unit-tested directly (`src/scoring.test.ts`, `src/raffle-logic.test.ts`, `src/routes/helpers.test.ts`); `src/server.test.ts` is a full HTTP integration test that spawns the real server as a subprocess against a throwaway DB (`POLLUX_DB` env) on an ephemeral port (`PORT=0`); `src/scripts/script.test.ts` covers browser helpers via happy-dom. Both `POLLUX_DB` and `PORT` are read in `db.ts` / `index.ts` specifically so tests never touch `data/db.sqlite` or port 3000.

There is no linter or client bundler configured. Production builds compile a single binary via `bun build --compile` (see `.github/docker/Dockerfile`), triggered on git tag push by `.github/workflows/docker.yml`.

Domain logic that would otherwise be buried in route handlers is extracted into pure, testable modules: `src/scoring.ts` (quiz scoring + speed bonus) and `src/raffle-logic.ts` (pseudo generation + winner draw, with an injectable rng).

Docs live in `docs/` (Zensical/MkDocs-style, config in `zensical.toml`); `site/` is generated output and `docs.yml` deploys it to GitHub Pages.

## Architecture

Pollux is a zero-framework, Bun-native real-time polling/quiz/raffle server. Everything runs in one `Bun.serve` process (`src/index.ts`).

### Route module pattern
Each file in `src/routes/` exports a plain object mapping URL patterns to handlers (Bun's native `routes` matcher, including `:param` segments). `index.ts` spreads them all into a single `Bun.serve({ routes })` call. To add an endpoint, add it to the relevant route object — no registration elsewhere. Non-route requests (WebSocket upgrades) fall through to the `fetch` handler, which delegates to `wsUpgrade`.

### Assets are embedded, not served from disk
`pages.ts` and `assets.ts` import HTML/JS/CSS as strings via `import x from "./file.html" with { type: "text" }`, then return them as `Response`s. The compiled binary is fully self-contained — there is no static file directory at runtime. Client-side JS in `src/scripts/` is plain browser JS (no build/transpile).

### Two-tier state: SQLite + in-memory Maps
- **SQLite** (`src/db.ts`, `bun:sqlite`, WAL mode, at `data/db.sqlite`) persists *votes and quizz data*: `poll`, `quizz_answers`, `quizz_submissions`, `quizz_players`. All queries are prepared statements exported from `db.ts`.
- **In-memory Maps** (`src/routes/helpers.ts`) hold *ephemeral session config*: `dynamicPolls`, `quizzPolls`, and `rafflePolls`. **Raffle state (players + winner) lives only in memory — a server restart loses it entirely.** Dynamic/quizz round definitions also reset on restart (though quizz answers are re-hydratable from `quizz_answers`).

Schema is created at import time in `db.ts`, and migrations are done with `try { ALTER TABLE ... } catch {}`. Tables must be created *before* any `db.query()` referencing them, because bun:sqlite prepares statements eagerly.

### Choice encoding for multi-round polls (non-obvious)
Dynamic polls and quizzes pack the round into the choice integer: `choice = step * 100 + choiceIndex` (max 100 choices per step). `getResultsByStep` filters with `choice BETWEEN step*100 AND step*100+99`. Static polls use raw choice indices. Keep this scheme in mind whenever touching vote storage or result aggregation.

### Real-time via WebSocket pub/sub
One `websocket` handler (`src/routes/ws.ts`) serves all modes, discriminated by `ws.data.kind` (`static | dynamic | quizz | raffle`). On `open` it subscribes the socket to a topic channel and sends current state. Mutating HTTP handlers broadcast with `srv.publish(channel, json)`. Channel naming:
- static: `<uuid>`
- dynamic: `dynamic:<uuid>`
- quizz: `quizz:<uuid>`
- raffle: `raffle:<uuid>`

`srv` is a module-level singleton set once via `setServer(srv)` in `index.ts` and imported by route handlers to publish.

### Conventions
- Every endpoint validates the poll id with `guardUUID` / `isUUIDv7` (UUIDv7-only) and returns 422 on mismatch. Use the response helpers in `helpers.ts` (`json`, `invalid`, `notFound`, `options`, `html`, `js`) rather than constructing `Response`s ad hoc; they carry the shared CORS headers.
- A `croner` cron in `index.ts` runs every minute to purge data older than 4 hours (and orphaned quizz rows). Anything stored is inherently transient.
- Quizz scoring (`quizz.ts` `/api/quizz/vote`) = correct-choice count + a time-decay `speedBonus`; the server enforces the per-question timer and rejects late votes with 408.

### Modes at a glance
- **Static polls** — choices encoded client-side in the URL hash (lz-string); server only counts. Pages: `/vote`, `/many`, `/results`.
- **Dynamic polls** — round choices pushed server-side per step via `/api/dynamic/:uuid/step`. Pages: `/dynamic-vote`, `/dynamic-many`, `/dynamic-result`.
- **Quizzes** — admin-driven rounds with correct answers, timers, scoring, players. Pages: `/quizz-admin`, `/quizz-vote`, `/quizz-result`.
- **Raffles** — auto-registered random pseudos, admin spins a wheel, winner broadcast. Pages: `/raffle-admin`, `/raffle-vote`.
