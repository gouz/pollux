# Dynamic polls

Dynamic polls let an admin push new questions to participants in real time. Each step has its own set of choices, and results update live.

## How it works

```mermaid
sequenceDiagram
  actor Admin
  actor Participant
  participant Server
  participant WS as WebSocket

  Admin->>Server: POST /api/dynamic/:uuid/step
  Server-->>WS: broadcast step (choices)
  WS-->>Participant: render buttons

  Participant->>Server: POST /api/vote
  Server-->>WS: broadcast result

  Admin->>Server: POST /api/dynamic/:uuid/step (next)
  Server-->>WS: broadcast step (new choices)
  WS-->>Participant: render new buttons
```

## Run a dynamic poll

### 1. Start the server

```bash
bun src/index.ts
```

### 2. Open the admin page

Go to [http://localhost:3000/dynamic-many#YOUR_UUID](http://localhost:3000/dynamic-many#YOUR_UUID).

This page shows the current step's choices as buttons. Click a choice to submit your vote.

### 3. Push a new step

Use the API to define a new step:

```bash
curl -X POST http://localhost:3000/api/dynamic/YOUR_UUID/step \
  -H "Content-Type: application/json" \
  -d '{"step": 0, "choices": ["Red", "Blue", "Green"]}'
```

All connected clients with the WebSocket will see the new choices appear.

### 4. Vote on the current step

Participants click a choice to submit their vote. Each vote is broadcast to the results page.

### 5. Push another step

Repeat the API call with a different step number and choices. The vote page updates automatically.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/dynamic/:uuid/step` | Define choices for a step |
| `GET` | `/api/dynamic/:uuid/step?step=N` | Get choices for a step |
| `POST` | `/api/vote` | Submit a vote |
| `GET` | `/api/vote/:uuid?step=N` | Get results for a step |

## WebSocket events

Clients connected to `/ws/dynamic?uuid=YOUR_UUID` receive:

- `{ "type": "step", "step": 0, "choices": ["Red", "Blue"] }` — new choices available
- `{ "type": "result", "step": 0, "result": [...] }` — updated results for a step
