# SPEC 09 — Snake game on the SNAKE player route

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-22
> **Objective:** Make `/games/snake/play` run a playable Snake game, built from the fruit sprite sheet in `references/source-assets/`, that submits its real score through `POST /api/scores`, while every other game keeps its fake ticker.

## Why this spec exists

The catalog already has a row with id `serpentine` (ARCADE, `cover-snake`, green). Its copy describes a snake, and the user confirmed that this row is the Snake game. This spec moves that row to id `snake`, renames its title to SNAKE, gives it a real engine, and changes the mock activity line to "Snake". The only source material is `references/source-assets/`: a fruit sprite sheet (`fruits.png`) and its atlas (`sprites.js`). There is no reference game code, so the rules come from the catalog copy and the answers in this spec.

## Scope

**In:**

- A real Snake game for the existing catalog id `snake`, rendered at `/games/snake/play`.
- Catalog row change: the row with id `serpentine` becomes id `snake`, title `SNAKE`, with new `short` and `long` copy in English. `cat` (`ARCADE`), `cover` (`cover-snake`), `color` (`green`) and `plays` do not change.
- Mock activity line in `lib/data.ts` (the entry at line 44, `game: "Serpentine"`) becomes `game: "Snake"`. This is the only change to that file.
- Copy the sprite sheet to `public/snake/fruits.png`, and port the atlas in `references/source-assets/sprites.js` to a typed TypeScript module with no `window` access.
- Grid play on a 24 by 24 grid. The snake starts with 3 segments and moves one cell per step.
- Food is a fruit sprite chosen at random from the 22 fruits in the atlas for each new fruit.
- Walls wrap around. Only the snake's own body ends the game.
- One life. Biting the body ends the run and opens the existing game-over modal.
- Speed rises on every bite, down to a minimum step time.
- Scoring: 10 points per fruit.
- Controls: Arrow keys and W, A, S, D steer. P and Escape pause and resume, as in Asteroids. A reversal into the neck is ignored.
- Real score, level and length in the existing HUD. END opens the existing game-over modal with the real score.
- SAVE SCORE for `snake` writes through `POST /api/scores`, using the SPEC 06 name rules and score cap.
- English text for all in-game labels.
- The engine in pure TypeScript under `lib/snake/`, with the canvas drawing and keyboard tracker in the same folder, and the canvas component in `components/snake-game.tsx`.
- One registry entry in `lib/games-registry.ts`, and one optional `length` field added to `GameStats` in the same file.
- One short paragraph in `CLAUDE.md` Architecture.

**Out of scope (for future specs):**

- Sound and music. The sprite sheet has no audio.
- Touch controls and on-screen buttons. On coarse pointers the game shows the keyboard note only.
- Mouse controls.
- Restart with a key from the canvas. PLAY AGAIN in the modal is the only restart path.
- Wall-collision mode. Walls wrap in this spec.
- Per-fruit point values. Every fruit is 10 points.
- Changes to the snake's cover art. The `.cover-snake` CSS block stays as it is.
- Best-score tracking, leaderboard changes, or Hall of Fame changes.
- Server calls, new tables, or new API routes. The existing `POST /api/scores` and `GET /api/scores` are used as they are.
- Tests. The repo has no test runner (see `CLAUDE.md`). Checks are manual, in the browser.

## Data model

This feature adds game-state types and one SQL statement that updates an existing row. It adds no new tables, columns, policies or routes.

```ts
// lib/snake/types.ts
export type Cell = { x: number; y: number };

export type Dir = 'up' | 'down' | 'left' | 'right';

export type GameStatus = 'playing' | 'paused' | 'gameover';

export type Fruit = Cell & { kind: number }; // kind: index 0 to 21 into the fruit atlas

export type SnakeState = {
  status: GameStatus;
  body: Cell[]; // head first, tail last
  dir: Dir; // direction applied on the last step
  queued: Dir[]; // up to 2 turns waiting for the next steps
  fruit: Fruit;
  score: number;
  fruits: number; // fruits eaten this game
  stepInterval: number; // seconds per step, falls on every bite
  acc: number; // seconds since the last step
};

export type SnakeInput = { turn: Dir | null }; // at most one turn press per frame
```

Conventions:

- The grid is 24 columns by 24 rows. Origin top-left. `x` grows to the right, `y` grows down.
- Each cell is 24 pixels, so the canvas is 576 by 576 pixels.
- Step times are in seconds. The engine receives `dt` in seconds, clamped to 0.05 per frame.
- Start: body `(12,12)`, `(11,12)`, `(10,12)`, direction `right`, status `playing`, step interval `0.15`.
- Speed: each bite subtracts `0.004` from `stepInterval`, down to a minimum of `0.06`.
- Level shown in the HUD: `1 + floor(fruits / 5)`. It is a display counter only. Speed does not change at level edges.
- Length shown in the HUD: `body.length`.
- Fruit atlas, in `lib/snake/atlas.ts` (pure data, no `window`). It keeps the field names of `sprites.js`: `banana`, `orange`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `watermelon`, `pepper`, `kiwi`, `lemon`, `peach`, `peanut`, `apple`, `tomato`, `berries`, `grapes2`, `pineapple`, `melon`. Each entry is `{ x, y, w, h }` in the source sheet. The source path is `/snake/fruits.png`.

Catalog change, a new migration file `supabase/migrations/0005_move_serpentine_to_snake.sql`. It runs in one transaction, in this order, because `scores.game_id` references `games.id` and the id cannot be updated in place while scores point at it:

1. Insert a `snake` row copied from the `serpentine` row: `title = 'SNAKE'`, `short` and `long` as below, and `cat`, `cover`, `color`, `plays` copied from `serpentine`.
2. `update public.scores set game_id = 'snake' where game_id = 'serpentine'`.
3. Delete the `serpentine` row from `public.games`.

- Short copy: `Eat fruit, grow longer, and do not bite your own tail.`
- Long copy: `Steer the snake through the grid to eat fruit. Every bite makes it longer and faster, and the walls wrap around. One life: bite your own tail and the run ends.`
- No schema change, no RLS or grant change. The insert trigger on `scores` does not run on the update in step 2.

Saved score, written by the existing SAVE SCORE flow through `POST /api/scores` (unchanged from SPEC 06):

```json
{ "game": "snake", "name": "KAI", "score": 240 }
```

No new `localStorage` keys. No new cookies.

## Implementation plan

1. **Catalog and mock copy.** Add `supabase/migrations/0005_move_serpentine_to_snake.sql` with the three steps above. Apply it with the Supabase MCP `apply_migration` tool. Verify with `execute_sql` that `select id, title, plays from public.games where id = 'snake'` returns one row with title `SNAKE`, that `select count(*) from public.games where id = 'serpentine'` returns `0`, that `select count(*) from public.scores where game_id = 'serpentine'` returns `0`, and that `select count(*) from public.games` returns the same count as before (`10`). In `lib/data.ts`, change `game: "Serpentine"` to `game: "Snake"` on line 44. Verify that `/games/snake` shows SNAKE, that `/games/serpentine` returns `404`, and that `/games/snake/play` still shows the fake ticker, because the game is not registered yet.
2. **Sprite asset and atlas.** Copy `references/source-assets/fruits.png` to `public/snake/fruits.png`. Leave the reference file in place. Create `lib/snake/atlas.ts` exporting `FRUIT_SHEET` (the sheet path and its size) and `FRUIT_ATLAS` (the 22 entries above, in order, as an array so `kind` is an index). Verify with `npx tsc --noEmit`. Nothing imports it yet.
3. **Types and constants.** Create `lib/snake/types.ts` with the types above, and `lib/snake/constants.ts` with `COLS = 24`, `ROWS = 24`, `CELL = 24`, `START_LENGTH = 3`, `START_INTERVAL = 0.15`, `MIN_INTERVAL = 0.06`, `SPEEDUP_PER_FRUIT = 0.004`, `POINTS_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`, `FRUIT_KINDS = 22`, `MAX_QUEUED_TURNS = 2`, and `DT_MAX = 0.05`. Verify with `npx tsc --noEmit`.
4. **Pure engine.** Create `lib/snake/engine.ts` exporting `createGame(rng?)`, `setPaused(state, paused)`, and `step(state, input, dt, rng?)`. Helpers: `spawnFruit`, `wrap`, `isOpposite`, `level`. The step does the following in order:
   1. Return the state unchanged when the status is not `playing`.
   2. Queue `input.turn` when it is not a reversal of the last queued or applied direction, and the queue has fewer than 2 entries.
   3. Add `dt` (clamped) to `acc`. While `acc >= stepInterval`, subtract the interval and make one move.
   4. Each move applies the first queued turn, moves the head one cell, and wraps it at the edges.
   5. If the new head is on the body, excluding the tail cell that will leave this step, the status becomes `gameover`.
   6. If the new head is on the fruit, add 10 points, grow by one segment, increase `fruits`, reduce `stepInterval` down to `MIN_INTERVAL`, and spawn a new fruit on a free cell.
   7. If no free cell is left, the status becomes `gameover`.

   It has no DOM, canvas, or React imports. Verify with `npx tsc --noEmit`. Nothing imports it yet.

5. **Render and input.** Create `lib/snake/render.ts` exporting `drawGame(ctx, state, fruitImage | null)`. It draws the grid background, the snake (head brighter than the body), the fruit sprite fitted inside its cell with the aspect ratio kept and smoothing off, and a magenta dot in place of the sprite when the image is `null`. It draws a `PAUSED` overlay when paused. Create `lib/snake/input.ts` exporting `attachKeyboard(window)`, which returns `{ takeTurn(), takePausePress(), detach() }`. It listens to `keydown` on `window`, reads `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyP`, and `Escape`, calls `preventDefault` on the arrow keys, ignores auto-repeat, and is removed by `detach()`. `attachKeyboard` is called only from a client effect. Verify with `npx tsc --noEmit`.
6. **Canvas component.** Create `components/snake-game.tsx` as a client component. It implements `RealGameProps` from `lib/games-registry.ts`. It owns a `<canvas width={576} height={576}>`, keeps the engine state in a ref, and runs `requestAnimationFrame` in an effect with an empty dependency list. Props are read through latest-props refs. It loads `/snake/fruits.png` into an `Image` inside the effect, and draws the magenta fallback until the image is ready. It calls `onStats` when score, fruits, or status change, and `onEnd(score)` once when the status becomes `gameover`. `P` and `Escape` call `onTogglePause`. The `paused` prop sets the engine state through `setPaused`. It shows the text `THIS GAME NEEDS A KEYBOARD` on coarse pointers, using `matchMedia('(pointer: coarse)')`, and still renders the canvas. Use the `/frontend-design` skill for the overlay and note styling, as `CLAUDE.md` requires for UI. Read the Next.js guide in `node_modules/next/dist/docs/` before writing Next code. Verify with `npm run build`.
7. **Registry entry.** In `lib/games-registry.ts`, add `length?: number` to `GameStats`, and add one entry under the key `snake`. Its `component` is `SnakeGame`. Its `mapStats` returns `score`, `level`, and `slot: { label: 'Length', value: length, hearts: false }`. This is the only change to that file. `components/game-player.tsx` does not change. Verify that `/games/snake/play` shows the real game, that the HUD shows Length, and that `/games/fall/play` keeps the fake ticker.
8. **Save flow.** Confirm that SAVE SCORE on `snake` sends `POST /api/scores` with `game: "snake"` and the real score, gets `201`, and shows `SCORE SAVED`. Confirm that the row appears in the Hall of Fame under SNAKE. Confirm that `plays` in `games` rises by 1. No API change.
9. **Docs.** Update `CLAUDE.md` Architecture. In the game-catalog bullet, the list of games that submit scores gains `snake`. Add one short paragraph for the `lib/snake/` modules and `components/snake-game.tsx`. Do not touch the `AGENTS.md` block. Do not edit SPEC 01 to 08. Verify with `npm run lint` and `npx tsc --noEmit`.

Every step leaves `npm run dev` running with every route rendering. Step 1 changes copy only. Steps 2 to 5 add files that nothing imports yet. Step 6 adds the component without a route change. Step 7 is the first step that changes what a user sees, and only on `/games/snake/play`.

## Acceptance criteria

- [x] `npm run build` exits 0.
- [x] `npm run lint` exits 0.
- [x] `npx tsc --noEmit` exits 0.
- [x] `lib/snake/types.ts`, `lib/snake/constants.ts`, and `lib/snake/engine.ts` contain no import from `react` or `next`, and no use of `window`, `document`, or `localStorage`, checked by `grep`.
- [x] `public/snake/fruits.png` exists, and it is the same file as `references/source-assets/fruits.png`.
- [x] `execute_sql` on `public.games` shows `title = 'SNAKE'` for id `snake`, and `cat`, `cover`, and `color` are unchanged (`ARCADE`, `cover-snake`, `green`).
- [ ] `/games` lists the catalog card as SNAKE, and `/games/snake` opens.
- [ ] `/games/serpentine` returns `404`, and `select count(*) from public.scores where game_id = 'serpentine'` returns `0`.
- [ ] The mock activity line in `lib/data.ts` reads `game: "Snake"`, and no line in `lib/data.ts` reads "Serpentine".
- [x] `/games/snake/play` loads with no console errors and no React hydration warning in the dev server.
- [x] At start the snake has 3 segments in the middle row, facing right, and one fruit is on the field.
- [x] The fruit sprite on the field is one of the 22 atlas sprites, and no fruit is drawn as a broken image.
- [ ] Arrow keys and W, A, S, D steer the snake. Pressing the reverse of the current direction does nothing.
- [ ] A snake that leaves one edge appears at the opposite edge, on both axes.
- [ ] Eating a fruit adds 10 points, adds one segment, and the HUD score and Length update to match.
- [ ] After each bite the step time drops by 0.004 seconds, and it never goes below 0.06 seconds.
- [ ] A fruit never appears on a cell of the snake's body.
- [ ] Biting the body ends the game, opens the game-over modal, and shows the real score.
- [ ] PAUSE, the `P` key, and the `Escape` key each pause the game, and each resumes it. While paused, the snake and fruit do not change.
- [x] END opens the game-over modal with the current score.
- [x] SAVE SCORE on `snake` sends `POST /api/scores` and gets `201`, and the modal shows `SCORE SAVED`.
- [x] The row for `snake` appears in the Hall of Fame tab SNAKE after a saved score.
- [x] `plays` for `snake` in `public.games` increases by 1 after a saved score.
- [ ] With the network blocked, SAVE SCORE shows `COULD NOT SAVE. TRY AGAIN` and keeps the name and score.
- [ ] PLAY AGAIN starts a new game with score 0, 3 segments, and the start speed.
- [ ] On a device with a coarse pointer, `/games/snake/play` shows `THIS GAME NEEDS A KEYBOARD`, and the canvas is still rendered.
- [ ] `/games/fall/play` still shows the fake ticker, `NOT RANKED YET`, and no SAVE button.
- [x] No text in the game screen is in Spanish. `NIVEL`, `PUNTAJE`, `PAUSA`, and `ESPACIO` do not appear in `components/snake-game.tsx`, `lib/snake/`, or `lib/games-registry.ts`.
- [x] `CLAUDE.md` Architecture has one new paragraph about the snake engine, and the `AGENTS.md` block is unchanged.
- [x] SPEC 01 to 08 are unchanged in git (`git diff --stat specs/0[1-8]*` is empty).

## Decisions

- **Yes:** The URL id is `snake`, so the catalog row `serpentine` moves to id `snake`, with title SNAKE. The user asked for `/games/snake`. The existing cover, color and category stay in place.
- **Yes:** Move the row in a new migration `0005_move_serpentine_to_snake.sql`: insert the `snake` row, move the `scores` rows, delete `serpentine`. The row cannot be renamed in place, because `scores.game_id` references `games.id`. The name does not match the `000N_add_<id>_game.sql` pattern because it moves an existing row.
- **No:** A second `snake` row next to `serpentine`. It would leave two snake cards in the catalog.
- **Yes:** The mock activity line changes from "Serpentine" to "Snake" in this spec. The user said the mock line is part of the project. This changes SPEC 06's "static mock data" scope for this one line only.
- **Yes:** Food is a random fruit sprite from the 22 in the atlas. The user chose the sprite sheet over the catalog's magenta cores.
- **No:** Magenta core in place of the sprites. The sprite sheet is the asset the user supplied for this game.
- **Yes:** Walls wrap. The catalog copy names only self-collision as a loss, and the user chose wrapping.
- **Yes:** One life. The catalog copy says one wrong move ends the run, and the user chose one life.
- **Yes:** Scoring is 10 points per fruit. Quick decision, not confirmed with a per-fruit value.
- **Yes:** Speed rises on every bite, from 0.15 seconds to a minimum of 0.06 seconds, in steps of 0.004. The user chose faster every bite, with a cap. The numbers are a quick decision and can be tuned in `constants.ts`.
- **Yes:** Controls are Arrow keys plus W, A, S, D, with P and Escape to pause. The user chose arrows plus WASD. The pause keys match SPEC 05.
- **Yes:** No sound. The user chose no sound, and the sprite sheet has no audio.
- **Yes:** Keep the existing `.cover-snake` block. The user chose to keep the cover.
- **Yes:** The engine is pure TypeScript under `lib/snake/`, the same pattern as SPEC 05, SPEC 07 and SPEC 08. The atlas is typed data in `lib/snake/atlas.ts`, not the `window.SPRITE_ATLAS` global of `sprites.js`.
- **Yes:** The sprite sheet is copied to `public/snake/fruits.png`, and the reference file stays in `references/source-assets/`. Next.js serves files under `public/`, and the component loads the image in an effect.
- **Yes:** Grid 24 by 24 with 24-pixel cells, so the canvas is 576 by 576. Quick decision for a square board that fits the player shell. It can be changed in `constants.ts`.
- **Yes:** The HUD shows LEVEL as `1 + floor(fruits / 5)`. Quick decision. The per-bite speed rule does not depend on it, so the level is a progress counter, not a speed tier. If the user wants speed tied to level, that changes the rules and is a new decision.
- **Yes:** A full board ends the game as `gameover`, with the score kept. Quick decision, since 576 cells almost never fill.
- **Yes:** The registry gets one new optional field, `length`, in `GameStats`. The other games do not send it.
- **Yes:** Score cap, name rules, and the `GUEST` fallback come from SPEC 06 without change. The cap is 10,000,000, which no game reaches.
- **No:** Mouse control. The user chose keyboard controls, and the SPEC 05 pattern is keyboard only.
- **No:** New API routes, tables, or policies. The existing `POST /api/scores` already accepts any id in `games`.

## Identified risks

| Risk                                                                                                      | Mitigation                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprite coordinates in `sprites.js` were found by pixel analysis and may crop the wrong region.            | Step 5 and the acceptance criteria check each fruit on the field in the browser. A wrong crop shows up as a visible error and is fixed in `lib/snake/atlas.ts`. |
| The sprite sheet comes from a third-party site (`spriters-resource.com`, per the header of `sprites.js`). | Confirm the license before the repo is published. The assets are only moved to `public/snake/` and are not edited.                                              |
| Image loads after the first frame, so the field is empty or broken for a moment.                          | The component draws the magenta fallback until the image is ready. The engine does not wait for the image.                                                      |
| Fast speed at the minimum step time (16 cells per second) is hard to steer with the keyboard.             | The turn queue holds 2 turns, so a quick double-press is not lost. The minimum is a constant and can be raised.                                                 |
| The HUD level counter does not match the speed, so players may expect speed to jump at level edges.       | The spec says the level is a counter only. Step 7 shows the HUD in the browser, and the decision can be changed later.                                          |
| The mock activity line changes while the old `serpentine` id still exists in `scores`.                    | Migration step order moves scores before deleting the old row, and step 1 checks that no `scores` row still uses `serpentine`.                                  |
| A game id mismatch between the catalog and the registry sends SAVE SCORE to a missing game.               | The registry key is `snake`, the same as the catalog id. Step 8 checks the `201` response and the Hall of Fame row.                                             |

## What is **not** in this spec

- Sound and music.
- Touch controls or on-screen buttons.
- Mouse control.
- Wall collision. Walls wrap.
- Per-fruit point values.
- Changes to the `.cover-snake` art or the card layout.
- Other changes to the mock activity feed in `lib/data.ts` beyond the one "Serpentine" to "Snake" line.
- Restart with a key from the canvas. PLAY AGAIN in the modal is the only restart.
- Best-score tracking, leaderboard changes, or Hall of Fame changes.
- New tables, API routes, policies, or environment variables.
- Real engines for any game other than `snake`.
- Tests or a test runner.
