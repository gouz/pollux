# 🗳️ Pollux

A real-time poll management system built with Bun.

Supports **static polls** (choices embedded in the URL) and **dynamic polls**
(round-based, choices managed server-side via API).

## Static Polls

Choices are embedded in the URL hash using lz-string compression:

```javascript
LZString.compressToEncodedURIComponent(Bun.randomUUIDv7() + "|choice1|choice2|choice3")
```

### Create a Poll

```
https://yourdomain.com/vote#<LZString-compressed-hash>
```

### Vote & Results

- `vote#<hash>` — single vote per poll
- `many#<hash>` — unlimited votes
- `results#<hash>` — real-time results

## Dynamic Polls (Round-based)

The hash contains only a UUIDv7. Choices are sent server-side per round.

```
URL format: /dynamic-vote#<uuid>
```

### Flow

1. Generate a UUID: `GET /api/uuid`
2. Set round choices: `POST /api/dynamic/:uuid/step`
3. Share `dynamic-vote#<uuid>` with voters
4. Advance rounds as needed with new choices
5. View results: `dynamic-result?uuid=<uuid>&step=<N>`

The file [`test-dynamic.html`](test-dynamic.html) provides an admin panel
for driving dynamic poll sessions.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/uuid` | Generate a UUIDv7 |
| `POST` | `/api/vote` | Cast a vote |
| `GET` | `/api/vote/:uuid` | Get results |
| `GET` | `/api/vote/:uuid?step=N` | Get results for a round |
| `GET` | `/api/flush/:uuid` | Delete all votes for a poll |
| `POST` | `/api/dynamic/:uuid/step` | Set choices for a round |
| `GET` | `/api/dynamic/:uuid/step?step=N` | Get choices for a round |
| `WS` | `/ws?uuid=` | Real-time static results |
| `WS` | `/ws/dynamic?uuid=` | Real-time dynamic results & rounds |

## Host

```bash
docker run -it -d -v "./data":"/usr/src/app/data" -p 1337:3000 gouz/pollux 
```

## Running Locally

```bash
bun install
bun run src/index.ts
```

Then open `http://localhost:3000` to get started.
