# Configuration

Reference documentation for Pollux server configuration.

## Server

Configuration is in `src/index.ts` through `Bun.serve()`:

```typescript
Bun.serve({
  port: 3000,
  // ...
});
```

### Changing the port

Edit the `port` option in `src/index.ts`:

```typescript
port: 8080,
```

Or use an environment variable:

```typescript
port: parseInt(process.env.PORT || "3000", 10),
```

## Database cleanup

Pollux automatically deletes votes older than 4 hours using a cron job defined in `src/index.ts`:

```typescript
new Cron("0 * * * * *", () => {
  clean.run();
});
```

The cron expression runs every minute (`0 * * * * *`). The `clean` query deletes records older than 4 hours.

To change the retention period, edit the SQL in `src/db.ts`:

```typescript
var clean = db.query("DELETE FROM poll WHERE date < datetime('now','-24 hours');");
```

To disable auto-cleanup, remove the `new Cron(...)` line from `src/index.ts`.

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
