# 🗳️ Pollux

A real-time poll and raffle management system built with Bun.

Supports **static polls** (choices embedded in the URL), **dynamic polls**
(round-based, choices managed server-side via API), **quizzes**, and **raffles**.

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

## Raffles (Tirage au sort)

Random draw with a spinning wheel. Players auto-register with a random pseudo,
the admin sees the wheel and clicks to spin, and all players are notified
in real time who won.

```
Admin page: /raffle-admin
Player page: /raffle-vote#<uuid>
```

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
| `POST` | `/api/raffle/:uuid/register` | Register a player for a raffle |
| `POST` | `/api/raffle/:uuid/spin` | Spin the raffle wheel |
| `GET` | `/api/raffle/:uuid/players` | Get registered raffle players |
| `GET` | `/api/raffle/:uuid/status` | Get raffle status |
| `WS` | `/ws?uuid=` | Real-time static results |
| `WS` | `/ws/dynamic?uuid=` | Real-time dynamic results & rounds |
| `WS` | `/ws/raffle?uuid=` | Real-time raffle events |

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
