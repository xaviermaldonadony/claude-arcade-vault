# Suggested to do

Four tables. Each row has the same columns as `references/implemented-games.md`. The `game-planner` agent owns these tables.

### 💡 Suggested

| #   | ID  | Title | Category | Color | Description |
| --- | --- | ----- | -------- | ----- | ----------- |

### 👍 Accepted

| #   | ID  | Title | Category | Color | Description |
| --- | --- | ----- | -------- | ----- | ----------- |

### ✅ Implemented

| #   | ID          | Title     | Category | Color   | Description                                            |
| --- | ----------- | --------- | -------- | ------- | ------------------------------------------------------ |
| 1   | `asteroids` | ASTEROIDS | SHOOTER  | yellow  | Pulverize asteroids in zero gravity.                   |
| 2   | `tetris`    | TETRIS    | PUZZLE   | cyan    | Stack falling blocks and clear rows.                   |
| 3   | `arkanoid`  | ARKANOID  | ARCADE   | magenta | Break every brick with one ball.                       |
| 4   | `snake`     | SNAKE     | ARCADE   | green   | Eat fruit, grow longer, and do not bite your own tail. |

### 🗑️ Discarded

| #   | ID  | Title | Category | Color | Description |
| --- | --- | ----- | -------- | ----- | ----------- |

## Status flow

- New pick or runner-up: add a row to **Suggested**.
- User accepts it: move the row to **Accepted**.
- Spec written and game built: move the row to **Implemented**, and add the matching row to `references/implemented-games.md`.
- User rejects it, from Suggested or Accepted: move the row to **Discarded**. Discarded games are never suggested again.
- Never add a game that already appears in any table.
- Number rows `#` within each table. Renumber when a row moves.
