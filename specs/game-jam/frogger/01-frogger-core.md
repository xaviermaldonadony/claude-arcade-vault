# SPEC — Frogger: Core Game Integration

> **Status:** Implemented
> **Depends on:** 06-games-table-leaderboard-supabase
> **Date:** 2026-05-20
> **Objective:** Integrate Frogger (pure canvas, built from scratch) as a playable game in Arcade Vault with ID `frogger`, connecting score, lives, level, and game over with the React HUD and the dedicated play-page.

---

## Scope

**In:**

- SQL INSERT to add the `frogger` row to the `games` table in Supabase.
- Create `components/games/FroggerGame.tsx` — a `"use client"` React component wrapping the main canvas (480 × 640 px). Accepts props: `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`.
- Game loop built from scratch in the component: 16 columns × 14 rows grid of 40 × 40 px cells. The vertical map is divided into three fixed zones: bottom safe zone (row 13 — starting base), road zone (rows 12–8, 5 traffic lanes), river zone (rows 7–2, 6 river lanes), and goal zone (row 1, 5 target bays).
- Road entities: cars and trucks of varying lengths (1–3 cells), speeds, and directions per lane; they move horizontally in a continuous loop; collision with the frog is lethal.
- River entities: logs (2–4 cells long) and turtles (groups of 2–3) per lane; they move horizontally. The frog only survives in the river if it is on top of a log or visible turtles; if it falls into the water, it dies. Turtles can submerge periodically (visible phase → underwater → visible); while underwater they do not provide support.
- Frog movement: based on discrete 1-cell (40 px) jumps in 4 directions (↑ ↓ ← →); each keypress moves the frog exactly one cell after completing a 120 ms jump animation. The frog cannot move beyond the side borders.
- Goal reached condition: the frog reaches one of the 5 target bays in the top row (each bay occupies 2 of the 16 columns). An already occupied bay cannot be used again in the same round. Filling all 5 bays completes the round and starts the next one.
- Death conditions: (a) collision with a vehicle, (b) falling into the water, (c) a turtle submerging beneath the frog, (d) drifting off the left/right edges of the river, (e) running out of the round timer (initial 15 s reduced in higher levels).
- Lives system: the frog starts with 3 lives. Each death subtracts 1 life and calls `onLivesChange(lives - 1)`. If `lives - 1 === 0`, `onLivesChange(0)` is called and then `onGameOver(finalScore)`.
- Scoring: +10 pts for each cell advanced upward for the first time in the round; +50 pts upon occupying a target bay; +200 pts upon completing a round; +time bonus = `remaining_time × 10` upon occupying a bay.
- Round timer visible in HUD: 15 s by default, decremented in higher rounds.
- Internal canvas HUD (score top-left, lives as frog icons top-right, level top-center, time bar in row 0) — dual HUD pattern matching the rest of the platform's games.
- `paused: boolean` prop freezes `update()` while continuing to call `draw()`.
- Clean up event listeners (`keydown` on `document`) in the `useEffect` `return`.
- Create `app/games/frogger/play/page.tsx` — dedicated play-page.
- Save score upon finishing: React modal pre-fills name from `localStorage` (`av_player_name`), inserts into Supabase, and persists the name for the next game.

**Out of scope:**

- External bitmap sprites — all elements are drawn with canvas primitives (rectangles, arcs, composite shapes) using themed colors; no images are loaded.
- Touch or mobile controls.
- Elaborate death animations (explosions, particles) — covered in a secondary spec.
- Special power-ups (fly in the target bay, crocodile disguised as a log) — covered in a secondary spec.
- Supabase Auth and RLS — `user_id` is stored as `null`.
- Realtime on the leaderboard.
- Generic `CanvasGame` component (YAGNI).

---

## Data model

### INSERT into `games` table

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'frogger',
  'FROGGER',
  'Cross the road and the river without turning into mush.',
  'Guide your frog across a highway packed with cars and a river of floating logs and turtles. Fill all five bays on the other side to complete the round; each level speeds up traffic and shortens the clock. Three lives and a whole lot of asphalt ahead.',
  'ARCADE',
  'cover-frogger',
  'lime'
);
```

### `FroggerGame` component props

```ts
interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

Local state starts with `lives = 3`, `score = 0`, `level = 1`.
`onLivesChange(n)` fires every time the frog dies.
`onLivesChange(0)` fires right before `onGameOver(score)` on any game-over condition.

No new tables or TypeScript types are introduced — `GameRow` and `ScoreRow` from `lib/supabase/types.ts` are reused.

---

## Implementation plan

1. **INSERT into Supabase** — run the data model SQL in the Supabase SQL Editor.
   Verification: the `frogger` row appears in the Table Editor; `/games` displays the card with cover `cover-frogger` and color `lime`.

2. **Define constants and types** inside `FroggerGame.tsx`:

   ```ts
   const COLS = 16;
   const ROWS = 14;
   const CELL = 40; // px
   const CANVAS_W = COLS * CELL; // 640 — scaled via CSS to the container
   const CANVAS_H = ROWS * CELL; // 560
   // Zones (row index, 0 = top)
   const ROW_GOALS = 0;
   const ROW_RIVER_TOP = 1;
   const ROW_RIVER_BOT = 6;
   const ROW_SAFE_MID = 7;
   const ROW_ROAD_TOP = 8;
   const ROW_ROAD_BOT = 12;
   const ROW_START = 13;
   ```

   Local types (unexported):

   ```ts
   type Direction = 'up' | 'down' | 'left' | 'right';
   interface Lane {
     row: number;
     speed: number;
     dir: 1 | -1;
     entities: Entity[];
   }
   interface Entity {
     col: number;
     width: number;
     type: 'car' | 'truck' | 'log' | 'turtle';
     submerged?: boolean;
   }
   interface Frog {
     col: number;
     row: number;
     animating: boolean;
     animT: number;
     targetCol: number;
     targetRow: number;
   }
   ```

3. **Build the lane map** — `buildLanes(level: number): Lane[]` function:
   - Road lanes (rows 8–12): speeds between 1.5 and 4 px/frame (scaled by level); alternating directions; pre-populated entities with gaps so they are crossable.
   - River lanes (rows 1–6): speeds between 1 and 3 px/frame; logs of 2–4 cells with gaps of at least 1 cell; turtle groups of 2–3 with a submersion cycle of 3 s visible / 1.5 s underwater.
   - Each level increases all speeds by 15%.
     Verification: logging the `lanes` array to the console shows each lane has at least 2 entities and visible gaps.

4. **Main game loop** using `requestAnimationFrame`:
   - `update(dt: number)`:
     - If `paused`, skip all logic.
     - Advance the position of each entity in its lane (`entity.col += lane.speed * lane.dir * dt / 16`); when an entity exits the edge, wrap it back in from the opposite side (`col = -entity.width` or `col = COLS`).
     - If the frog is not animating: check input (`pendingDir`); if there is a pending direction, start animation (`animating = true`, `animT = 0`, calculate `targetCol/targetRow`).
     - If the frog is animating: advance `animT += dt`; if `animT >= 120`, complete jump (`col = targetCol`, `row = targetRow`, `animating = false`), resolve destination cell logic (death/goal/score detection).
     - If the frog is in the river and not animating: apply the horizontal displacement of the entity it is resting on (verified via `getSupport(frog, lanes)`).
     - Decrement round timer; if it reaches 0, death by timeout.
     - Invoke state change callbacks if the value differs from the previous one.

   - `draw()`:
     - Zone backgrounds: black for road, dark blue for river, dark green for safe rows, light green for target bays.
     - Draw entities in each lane: cars (red/yellow/blue rectangle with circular wheels), trucks (gray rectangle with distinct cab), logs (brown rectangle with line texture), visible turtles (green circle with shell pattern), submerged turtles (semi-transparent outline).
     - Draw frog: bright green body (28×24 px ellipse) with white/black eyes (two circles), extended legs during jump animation.
     - Draw target bays: dark green goal rectangle with gold border; if occupied, draw a frog silhouette inside.
     - Internal HUD: score top-left (16 px white font), level top-center, frog icons top-right (one green circle per life), time bar (rectangle in row 0, width proportional to remaining time, color green → yellow → red).

5. **Collision and support detection**:
   - `checkRoadCollision(frog, lanes)`: iterates over road lane entities; if `frog.col` falls within `[entity.col, entity.col + entity.width)` and `frog.row === lane.row`, returns `true`.
   - `getSupport(frog, lanes)`: iterates over river lane entities; returns the entity whose range covers the frog's column in the same lane, or `null`. If the entity is a turtle with `submerged === true`, returns `null` (no support).
   - `checkGoal(frog, goals)`: if `frog.row === ROW_GOALS`, calculates the bay corresponding to `frog.col`; if unoccupied, marks it and adds points; if already occupied or `frog.col` is not a bay, it results in death.

6. **Round completion management** — `completeRound()`:
   - Resets frog position to `ROW_START`, center column.
   - Clears occupied bays.
   - Increments `level`, calls `onLevelChange(level)`.
   - Rebuilds lanes with `buildLanes(level)`.
   - Resets timer.

7. **Death management** — `killFrog()`:
   - Decrements `lives`.
   - Calls `onLivesChange(lives)`.
   - If `lives === 0`: calls `onLivesChange(0)`, then `onGameOver(score)`, stops the loop.
   - If `lives > 0`: resets frog position to `ROW_START`, center column; resets timer.

8. **Create `app/games/frogger/play/page.tsx`** — dedicated play-page:
   - Imports `FroggerGame` with `dynamic(..., { ssr: false })`.
   - Local state: `score`, `lives` (initial `3`), `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Passes `paused` and the four callbacks to `FroggerGame`.
   - Reuses the platform's visual layout (React HUD + CRT + game over modal), matching the play-pages for Asteroids, Tetris, Arkanoid, Snake, and Space Invaders.
   - Game over modal: pre-fills name from `localStorage.getItem('av_player_name')`; upon confirmation, saves to `localStorage` and inserts `{ game_id: 'frogger', player_name: name, score, user_id: null }` into Supabase.
   - Save button disables after the first submission.
   - "PLAY AGAIN" button increments `gameKey` to remount `FroggerGame`.
     Verification: the React HUD reflects score, lives, and level in real time.

9. **Final verification** — `npm run build` finishes with zero TypeScript errors. No existing routes return 500.

---

## Acceptance criteria

- [ ] The `frogger` row exists in the Supabase `games` table with the data model values.
- [ ] The Frogger card appears on `/games` with cover `cover-frogger` and color `lime`.
- [ ] The `/games/frogger/play` route loads without SSR or TypeScript errors.
- [ ] The canvas (640 × 560) renders with the three visually distinct zones (road, river, safe zones, target bays).
- [ ] The frog spawns centered on the starting row when the game loads.
- [ ] The frog jumps exactly one cell (40 px) per directional keypress with a 120 ms animation.
- [ ] The frog cannot move past the side borders.
- [ ] Cars and trucks move horizontally in a loop along their lanes; they wrap around from the opposite side upon exiting.
- [ ] Logs and turtles move horizontally in a loop along their lanes.
- [ ] Turtles alternate between visible and submerged according to the defined cycle.
- [ ] The frog dies when hit by a road vehicle.
- [ ] The frog dies when falling into the water (not on a log or visible turtles).
- [ ] The frog dies when the turtle supporting it submerges.
- [ ] The frog dies when the round timer runs out.
- [ ] Upon dying, `onLivesChange(lives - 1)` fires; the frog returns to the starting row.
- [ ] Upon reaching an empty bay, the bay is marked and the score bonus is added.
- [ ] Upon reaching an already occupied bay, the frog dies.
- [ ] Upon filling all 5 bays, the round ends and the next begins with `level` incremented.
- [ ] `onLevelChange(level)` fires at the start of each new round.
- [ ] Entity speed increases with each level.
- [ ] The round timer decreases with each level.
- [ ] `onScoreChange(score)` fires on every score change.
- [ ] The internal canvas HUD (score, level, life icons, time bar) renders properly.
- [ ] The platform's React HUD reflects score, lives, and level in real time.
- [ ] The platform's "PAUSE" button freezes the game loop; "RESUME" unfreezes it.
- [ ] The P / Esc keys do not trigger an independent canvas pause.
- [ ] Upon reaching `lives = 0`, `onLivesChange(0)` and `onGameOver(score)` fire; the React modal appears.
- [ ] The modal pre-fills the name from `av_player_name` if present in localStorage.
- [ ] Upon confirming the name, the score is inserted into Supabase and the name is persisted in localStorage.
- [ ] The save button is disabled after the first submission (no duplicate insertion).
- [ ] The "PLAY AGAIN" button restarts the game from scratch (new `gameKey`).
- [ ] The saved score appears on `/games/frogger` and `/hall-of-fame` upon reloading.
- [ ] `npm run build` completes with no TypeScript errors.
- [ ] No existing routes return 500.

---

## Decisions

- **Yes: Canvas primitives without bitmap sprites** — cars, trucks, logs, turtles, and the frog are drawn with geometric canvas shapes and themed colors. Reason: no Frogger assets exist in the repository; drawing via code removes image loading dependencies and allows visual tweaking without external files.

- **Yes: Discrete 40 px grid with 120 ms jump animation** — frog movement is cell-by-cell, not continuous. Reason: canonical Frogger mechanic; discrete movement vastly simplifies collision detection and river support by comparing integer rows/columns.

- **Yes: Dual HUD** — the canvas retains its internal HUD while React displays the same values in the platform HUD. Reason: consistency with the pattern established across all games on the platform.

- **Yes: 3 lives** — original Frogger starts with 3 lives. `onLivesChange` notifies on each loss. Reason: faithful to the classic mechanic; consistent with Arkanoid and Space Invaders.

- **Yes: Turtles with submersion cycle** — alternate between support and hazard on an independent timer per group. Reason: signature Frogger mechanic distinguishing it from a log-only river; adds risk management without excessive implementation complexity.

- **Yes: Round timer** — initial 15 s, decremented in higher levels. Death by timeout adds urgency. Reason: original Frogger mechanic; prevents the player from waiting indefinitely in the safe zone.

- **Yes: 5 target bays** — all must be filled to complete the round. Reason: original mechanic providing clear per-round goal structure rather than a single linear level.

- **Yes: 640 × 560 px Canvas (16 × 14 cells of 40 px)** — vertical aspect ratio close to the original. Reason: the Frogger map is vertical (the player advances upward); a canvas wider than it is tall would not represent the path well.

- **Yes: Dedicated play-page `app/games/frogger/play/page.tsx`** — instead of the generic `[id]/play` route. Reason: consistency with all previous games; Next.js App Router prioritizes static routes over dynamic ones.

- **Yes: `dynamic(..., { ssr: false })`** — the canvas component is loaded client-side only. Reason: `canvas` and `requestAnimationFrame` do not exist in Next.js SSR's Node.js environment.

- **No: Continuous (interpolated) movement** — the frog does not slide; it hops cell-to-cell. Reason: continuous interpolation would require continuous-space AABB collisions for the river and road, increasing complexity without adding fun.

- **No: Crocodile disguised as a log or bonus fly in bays** — covered in the secondary power-ups and events spec. Reason: these are difficulty and reward layers independent of the core mechanic.

- **No: Generic `CanvasGame` component** — each game has its own component. Reason: YAGNI.

- **No: RLS in this spec** — tables remain open (public INSERT and SELECT). Reason: mitigated in the future security spec.

- **No: Realtime on leaderboards** — scores are visible on reload. Reason: subscription complexity adds no value while active player counts are low.
