# State & data model

Pollux keeps state in **two tiers** with very different durability guarantees.
Understanding which tier holds what explains why some things survive a restart
and others don't.

## Two tiers

```mermaid
flowchart TB
  subgraph persistent["Persistent — SQLite (data/db.sqlite, WAL)"]
    P1["poll — every vote"]
    P2["quizz_answers — question definitions"]
    P3["quizz_submissions — scored answers"]
    P4["quizz_players — pseudonyms"]
  end

  subgraph ephemeral["Ephemeral — in-memory Maps (helpers.ts)"]
    E1["dynamicPolls — current step + choices"]
    E2["quizzPolls — active round, timer, startedAt"]
    E3["rafflePolls — players + winner"]
  end

  R["Server restart"] -. wipes .-> ephemeral
  R -. keeps .-> persistent
```

| Concern | Tier | Survives restart? |
|---|---|---|
| Static & dynamic votes | SQLite `poll` | ✅ |
| Quizz answers / submissions / players | SQLite `quizz_*` | ✅ |
| Dynamic/quizz **round definitions** | in-memory Maps | ❌ (quizz answers are re-hydratable from `quizz_answers`) |
| Raffle players **and** winner | in-memory Maps | ❌ — lost entirely |

The maps hold *session configuration* — what's happening right now. The database
holds *facts* — what was voted. Because everything Pollux stores is transient by
design, this split is intentional rather than a limitation.

## Choice encoding for multi-round polls

Dynamic polls and quizzes squeeze the round number into the choice integer, so a
single flat `poll.choice` column can serve every step:

```
choice = step × 100 + choiceIndex        (max 100 choices per step)
```

```mermaid
flowchart LR
  subgraph step0["Step 0"]
    A0["choiceIndex 0 → 0"]
    A1["choiceIndex 1 → 1"]
  end
  subgraph step1["Step 1"]
    B0["choiceIndex 0 → 100"]
    B1["choiceIndex 1 → 101"]
  end
  subgraph step2["Step 2"]
    C0["choiceIndex 0 → 200"]
  end
```

Result aggregation reverses it: `getResultsByStep` filters
`choice BETWEEN step*100 AND step*100+99`. Static polls skip the scheme and store
raw choice indices. Keep this in mind whenever you touch vote storage or result
aggregation.

## Data lifecycle

Nothing is meant to live long. A [`croner`](https://github.com/hexagon/croner)
job in `index.ts` fires every minute and purges anything older than four hours,
plus orphaned quizz rows.

```mermaid
flowchart LR
  T["Cron: 0 * * * * *<br/>(every minute)"] --> C1["DELETE poll > 4h"]
  T --> C2["DELETE quizz_answers > 4h"]
  T --> C3["DELETE quizz_submissions (orphaned)"]
  T --> C4["DELETE quizz_players (orphaned)"]
```

See [Configuration](../reference/configuration.md) for how to change the
retention window or disable cleanup.
