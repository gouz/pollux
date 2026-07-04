# Configuration

Reference documentation for Pollux server configuration.

## Environment variables

Two settings are read from the environment, primarily so tests never touch the
production database or port 3000.

| Variable | Read in | Default | Purpose |
|---|---|---|---|
| `PORT` | `src/index.ts` | `3000` | Listen port (`0` = ephemeral, used by tests) |
| `POLLUX_DB` | `src/db.ts` | `data/db.sqlite` | SQLite path (`:memory:` for a throwaway DB) |

```bash
# Run on a different port with an isolated database
PORT=8080 POLLUX_DB=/var/lib/pollux/db.sqlite bun src/index.ts
```

The server binding is defined in `src/index.ts`:

```typescript
Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  // ...
});
```

## Database cleanup

Everything Pollux stores is transient. A cron job in `src/index.ts` fires every
minute (`0 * * * * *`) and purges old and orphaned rows:

```typescript
new Cron("0 * * * * *", () => {
  clean.run();               // votes older than 4h
  cleanQuizzAnswers.run();   // quizz questions older than 4h
  cleanQuizzSubmissions.run(); // submissions with no question
  cleanQuizzPlayers.run();     // players with no question
});
```

The retention window (4 hours) lives in the SQL in `src/db.ts`:

```typescript
export const clean = db.query(
  "DELETE FROM poll WHERE date < datetime('now','-4 hours');",
);
```

Edit the interval to change retention, or remove the `new Cron(...)` block to
disable auto-cleanup.

!!! note "Raffle state is not stored"
    Raffle players and winners live only in memory (`rafflePolls` in
    `helpers.ts`) and are therefore never subject to cleanup — they vanish on
    restart. See [State & data model](../explanation/state-model.md).

## CORS

CORS headers are defined in `src/routes/helpers.ts`:

```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```

## Database

- **Engine**: SQLite via `bun:sqlite`
- **File location**: `data/db.sqlite` (relative to the working directory)
- **Journal mode**: WAL (Write-Ahead Logging)

### Tables

#### `poll`

| Column | Type | Description |
|---|---|---|
| `uuid` | TEXT | Poll UUIDv7 |
| `choice` | INTEGER | Selected choice index |
| `date` | datetime | Vote timestamp (default: current_timestamp) |

#### `quizz_answers`

| Column | Type | Description |
|---|---|---|
| `uuid` | TEXT | Quiz UUIDv7 |
| `step` | INTEGER | Step number |
| `correct` | TEXT | JSON array of correct indices |
| `question` | TEXT | Question text |
| `timer` | INTEGER | Default timer in seconds |
| `choices` | TEXT | JSON array of choices |
| `media` | TEXT | Optional media URL (image, video, audio) |
| `date` | datetime | Quiz session creation timestamp (default: current_timestamp) |

#### `quizz_submissions`

| Column | Type | Description |
|---|---|---|
| `uuid` | TEXT | Quiz UUIDv7 |
| `user_id` | TEXT | Player UUIDv7 |
| `step` | INTEGER | Step number |
| `choices` | TEXT | JSON array of selected indices |
| `score` | INTEGER | Total score for this submission |
| `total` | INTEGER | Maximum possible score |
| `response_time_ms` | INTEGER | Response time in milliseconds |

#### `quizz_players`

| Column | Type | Description |
|---|---|---|
| `uuid` | TEXT | Quiz UUIDv7 |
| `user_id` | TEXT | Player UUIDv7 |
| `pseudo` | TEXT | Display name |
