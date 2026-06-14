# Real-time updates

Pollux uses WebSockets to push vote results and quiz events to all connected clients in real time.

## How it works

When a client connects to a WebSocket endpoint, the server:

1. Validates the UUID and optional user ID
2. Upgrades the HTTP connection to a WebSocket
3. Subscribes the client to a channel named after the poll UUID
4. Sends the current state (existing results, active question, etc.)
5. Listens for future broadcasts on that channel

## Pub/sub model

Pollux uses Bun's built-in `server.publish()` / `ws.subscribe()` mechanism:

```
Client A ──ws──▶  Server  ◀──ws── Client B
                  │
           ┌──────┴──────┐
           │  Channel:   │
           │  poll-uuid  │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  publish()  │
           │  on vote /  │
           │  quiz event │
           └─────────────┘
```

When a vote is cast, the handler:
1. Stores the vote in SQLite
2. Calls `srv.publish(uuid, JSON.stringify({ result: ... }))`
3. All WebSocket clients subscribed to that channel receive the message

## Channel naming

| Poll type | Channel pattern |
|---|---|
| Static poll | `{uuid}` |
| Dynamic poll | `dynamic:{uuid}` |
| Quiz | `quizz:{uuid}` |

This separation prevents static poll clients from receiving dynamic poll events and vice versa.

## WebSocket endpoints

| Endpoint | Poll type |
|---|---|
| `/ws?uuid=UUID` | Static polls |
| `/ws/dynamic?uuid=UUID` | Dynamic polls |
| `/ws/quizz?uuid=UUID&user=USER_ID` | Quizzes |

## Reconnection

The quiz result page implements automatic reconnection: when the WebSocket closes, it attempts to reconnect after 2 seconds.

On reconnection, the server sends the current state in the `open` handler, so the client catches up with any missed events.
