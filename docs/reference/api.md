# API reference

All HTTP endpoints exposed by Pollux.

## UUID

### `GET /api/uuid`

Generate a new UUIDv7.

```bash
curl http://localhost:3000/api/uuid
# 0194f1e0-abcd-7000-8000-000000000000
```

---

## Voting

### `POST /api/vote`

Submit a vote for a static or dynamic poll.

**Request body:**

```json
{
  "uuid": "0194f1e0-...",
  "choice": 0
}
```

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Poll UUIDv7 |
| `choice` | number | Choice index (0–99 for step 0, 100–199 for step 1, etc.) |

**Response:** `201 Created`

### `GET /api/vote/:uuid`

Get poll results. Optional query parameter `?step=N` to filter by step.

```bash
curl http://localhost:3000/api/vote/0194f1e0-...?step=0
```

```json
{
  "result": [
    { "choice": 0, "total": 5 },
    { "choice": 1, "total": 3 }
  ]
}
```

---

## Dynamic polls

### `POST /api/dynamic/:uuid/step`

Define choices for a step.

**Request body:**

```json
{
  "step": 0,
  "choices": ["Red", "Blue", "Green"]
}
```

**Response:** `201 Created`

### `GET /api/dynamic/:uuid/step?step=N`

Get choices for a specific step.

```bash
curl "http://localhost:3000/api/dynamic/UUID/step?step=0"
```

```json
{
  "step": 0,
  "choices": ["Red", "Blue", "Green"]
}
```

---

## Quizzes

### `POST /api/quizz/:uuid/step`

Save a quiz question definition.

**Request body:**

```json
{
  "step": 0,
  "choices": ["Paris", "London", "Berlin"],
  "correct": [0, 2],
  "question": "Which cities are capitals?",
  "media": "https://example.com/image.jpg"
}
```

| Field | Type | Description |
|---|---|---|
| `step` | number | Step number (0-based) |
| `choices` | string[] | Array of choice strings |
| `correct` | number[] | Array of 0-based indices of correct answers |
| `question` | string | Optional question text |
| `media` | string | Optional media URL (image, video, or audio) |

**Response:** `201 Created`

### `GET /api/quizz/:uuid/step?step=N`

Get a question definition with correct answers.

```bash
curl "http://localhost:3000/api/quizz/UUID/step?step=0"
```

```json
{
  "step": 0,
  "choices": ["Paris", "London", "Berlin"],
  "question": "Which cities are capitals?",
  "correct": [0, 2],
  "timer": 0,
  "startedAt": null,
  "media": "https://example.com/image.jpg"
}
```

### `POST /api/quizz/:uuid/start`

Start a question with a timer.

**Request body:**

```json
{
  "step": 0,
  "timer": 30
}
```

**Response:**

```json
{ "step": 0, "timer": 30, "startedAt": 1718200000000 }
```

### `POST /api/quizz/:uuid/podium`

Broadcast the final podium to all connected clients.

**Response:**

```json
{ "scores": [...] }
```

### `POST /api/quizz/:uuid/register`

Register a player with a pseudonym.

```json
{
  "user_id": "0194f1e0-...",
  "pseudo": "Alice"
}
```

**Response:** `201 Created`

### `GET /api/quizz/:uuid/players`

Get all registered players.

```bash
curl http://localhost:3000/api/quizz/UUID/players
```

```json
{
  "players": [
    { "user_id": "...", "pseudo": "Alice" }
  ]
}
```

### `POST /api/quizz/vote`

Submit a quiz answer.

**Request body:**

```json
{
  "uuid": "0194f1e0-...",
  "user_id": "0194f1e0-...",
  "step": 0,
  "choices": [0, 2],
  "response_time_ms": 4500
}
```

**Response:**

```json
{
  "score": 3,
  "total": 2,
  "correct": [0, 2],
  "correctScore": 2,
  "speedBonus": 1
}
```

### `GET /api/quizz/:uuid/scores`

Get leaderboard or individual submissions.

Use `?user_id=UUID` to get a specific player's submissions.

```bash
curl http://localhost:3000/api/quizz/UUID/scores
```

```json
{
  "scores": [
    { "user_id": "...", "pseudo": "Alice", "score": 15, "total": 20 }
  ]
}
```

### `GET /api/quizz/:uuid/results?step=N`

Get aggregated results for a step.

```bash
curl "http://localhost:3000/api/quizz/UUID/results?step=0"
```

---

## Flush

### `POST /api/flush/:uuid`

Delete all votes for a poll.

```bash
curl -X POST http://localhost:3000/api/flush/0194f1e0-...
```

---

## Static assets

| Path | Content type |
|---|---|
| `/styles/style.css` | `text/css` |
| `/scripts/script.js` | `application/javascript` |
| `/scripts/vote.js` | `application/javascript` |
| `/scripts/result.js` | `application/javascript` |
| `/scripts/many.js` | `application/javascript` |
| `/scripts/dynamic-vote.js` | `application/javascript` |
| `/scripts/dynamic-many.js` | `application/javascript` |
| `/scripts/dynamic-result.js` | `application/javascript` |
| `/scripts/quizz-admin.js` | `application/javascript` |
| `/scripts/quizz-vote.js` | `application/javascript` |
| `/scripts/quizz-result.js` | `application/javascript` |

## Error codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `204` | No content (OPTIONS) |
| `400` | Bad request / WebSocket upgrade failed |
| `404` | Not found |
| `408` | Timeout (quiz submission after deadline) |
| `422` | Invalid UUID or request body |
