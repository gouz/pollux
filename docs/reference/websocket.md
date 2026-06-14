# WebSocket protocol

Reference documentation for Pollux's WebSocket messaging.

## Connection

### Static polls

```
ws://localhost:3000/ws?uuid=0194f1e0-...
```

### Dynamic polls

```
ws://localhost:3000/ws/dynamic?uuid=0194f1e0-...
```

### Quizzes

```
ws://localhost:3000/ws/quizz?uuid=0194f1e0-...&user=0194f1e0-...
```

The `user` parameter is required for quizzes to distinguish players.

## Events

### Static polls

Sent on connection:

```json
{ "result": [{ "choice": 0, "total": 5 }, { "choice": 1, "total": 3 }] }
```

Broadcast on vote:

```json
{ "result": [{ "choice": 0, "total": 6 }, ...] }
```

### Dynamic polls

Sent on connection (if a step exists):

```json
{ "type": "step", "step": 0, "choices": ["Red", "Blue"] }
{ "type": "result", "step": 0, "result": [...] }
```

Broadcast on step creation:

```json
{ "type": "step", "step": 1, "choices": ["Green", "Yellow"] }
```

Broadcast on vote:

```json
{ "type": "result", "step": 0, "result": [...] }
```

### Quizzes

Sent on connection:

```json
{ "type": "players", "players": [{ "user_id": "...", "pseudo": "Alice" }] }
```

If a question is active:

```json
{
  "type": "start",
  "step": 0,
  "choices": ["Paris", "London"],
  "question": "Which are capitals?",
  "correct": [0],
  "timer": 30,
  "startedAt": 1718200000000
}
{
  "type": "result",
  "step": 0,
  "result": [{ "choice": 0, "total": 3 }, { "choice": 1, "total": 1 }]
}
{
  "type": "score",
  "step": 0,
  "scores": [{ "user_id": "...", "pseudo": "Alice", "score": 3, "total": 2 }]
}
```

Admin broadcasts:

| Event | Trigger | Payload |
|---|---|---|
| `start` | Admin starts question | `{ "type": "start", "step": 0, "choices": [...], "timer": 30, "startedAt": ..., "correct": [...] }` |
| `result` | Vote submitted | `{ "type": "result", "step": 0, "result": [...] }` |
| `score` | Vote submitted | `{ "type": "score", "step": 0, "scores": [...] }` |
| `players` | Player registers | `{ "type": "players", "players": [...] }` |
| `podium` | Admin triggers podium | `{ "type": "podium", "scores": [...] }` |
