# Suggested to do

Four tables. Each row has the same columns as `references/implemented-games.md`. The `game-planner` agent owns these tables.

### 💡 Suggested

| #   | ID               | Title        | Category | Color   | Description                                                  |
| --- | ---------------- | ------------ | -------- | ------- | ------------------------------------------------------------ |
| 1   | `invaders`       | INVADERS     | SHOOTER  | green   | Defend the planet from alien rows.                           |
| 2   | `glutton`        | GLUTTON      | ARCADE   | yellow  | Devour points and escape the ghosts.                         |
| 3   | `frogrun`        | FROGRUN      | ARCADE   | green   | Cross the pixel highway.                                     |
| 4   | `skyhop`         | SKYHOP       | ARCADE   | yellow  | Bounce up endless platforms. Score height climbed.           |
| 5   | `gem-digger`     | GEM DIGGER   | ARCADE   | magenta | Dig tunnels, collect gems, dodge falling boulders.           |
| 6   | `ladder-leap`    | LADDER LEAP  | ARCADE   | cyan    | Climb ladders and jump rolling barrels to the top.           |
| 7   | `bomb-blocks`    | BOMB BLOCKS  | ARCADE   | green   | Place bombs to blast blocks and enemies in a maze.           |
| 8   | `burger-stack`   | BURGER STACK | ARCADE   | yellow  | Walk platforms, stack ingredients on plates, dodge chasers.  |
| 9   | `laser-dodge`    | LASER DODGE  | ARCADE   | cyan    | Steer through sweeping lasers. Score time and near misses.   |
| 10  | `beam-towers`    | BEAM TOWERS  | ARCADE   | magenta | Place turrets to burn waves on a path. Chain kills.          |
| 11  | `twin-blaster`   | TWIN BLASTER | SHOOTER  | cyan    | Move with WASD, aim and fire with arrows, clear waves.       |
| 12  | `lunar-drop`     | LUNAR DROP   | ARCADE   | yellow  | Thrust a lander onto multiplier pads. Fuel left adds score.  |
| 13  | `starfall-shmup` | STARFALL     | SHOOTER  | magenta | Scroll through enemy waves. Score grazes and kills.          |
| 14  | `gem-swap`       | GEM SWAP     | PUZZLE   | green   | Swap gems to make lines. Cascades multiply points.           |
| 15  | `slide-merge`    | SLIDE MERGE  | PUZZLE   | yellow  | Slide tiles on a 4x4 grid. Merges score their sum.           |
| 16  | `flood-fill`     | FLOOD        | PUZZLE   | cyan    | Recolor the region from a corner within a move cap.          |
| 17  | `simon-grid`     | SIMON GRID   | PUZZLE   | magenta | Repeat the lit-cell sequence. Longer runs score more.        |
| 18  | `minefield`      | MINEFIELD    | PUZZLE   | yellow  | Reveal safe cells. Chain reveals multiply. Mines end it.     |
| 19  | `neon-drift`     | NEON DRIFT   | SHOOTER  | magenta | Dodge traffic, shoot rivals, earn near-miss bonuses.         |
| 20  | `blaster-run`    | BLASTER RUN  | SHOOTER  | cyan    | Jump hazards, shoot obstacles. Distance plus kills.          |
| 21  | `beat-drop`      | BEAT DROP    | PUZZLE   | yellow  | Hit notes on the beat line. Streaks multiply. Miss ends it.  |
| 22  | `reflex`         | REFLEX       | PUZZLE   | green   | Press the matching tile fast. Cues speed up each round.      |

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
