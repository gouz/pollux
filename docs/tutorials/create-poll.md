# Create a poll

Learn how to create, share, and manage a simple static poll.

## How polls work

Each poll is identified by a UUIDv7. The UUID is used as a URL fragment (`#uuid`) for vote pages and as a query parameter (`?uuid=uuid`) for results pages.

## Create a poll from the home page

1. Open [http://localhost:3000](http://localhost:3000)
2. A UUID is generated automatically
3. Use the links on the page to access the vote and results pages

## Create a poll programmatically

Generate a UUID via the API:

```bash
curl http://localhost:3000/api/uuid
# Returns: 0194f1e0-abcd-7000-8000-000000000000
```

Then use this UUID in your vote and results URLs:

- Vote: `http://localhost:3000/vote#0194f1e0-abcd-7000-8000-000000000000`
- Results: `http://localhost:3000/results?uuid=0194f1e0-abcd-7000-8000-000000000000`

## Vote via the API

```bash
curl -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"uuid": "0194f1e0-abcd-7000-8000-000000000000", "choice": 0}'
```

The `choice` field is a number (0–99 for the first step, 100–199 for the second, etc.).

## Get results

```bash
curl http://localhost:3000/api/vote/0194f1e0-abcd-7000-8000-000000000000
```

Returns all votes grouped by choice:

```json
{ "result": [{ "choice": 0, "total": 5 }, { "choice": 1, "total": 3 }] }
```
