# SPEC 13 — Game loop and render performance

> **Status:** Approved
> **Depends on:** SPEC 05 (Asteroids), SPEC 07 (Tetris), SPEC 08 (Arkanoid), SPEC 09 (Snake), SPEC 12 (play page layout)
> **Date:** 2026-11-27
> **Objective:** The five playable games (Frogger first, then Asteroids, Tetris, Arkanoid and Snake) reach a steady 60fps on a laptop play page, by fixing their game loops and drawing code, without changing game rules or the look.

## Why this spec exists

Frogger drops frames during play on a laptop. The other four real games use the same pattern (a `requestAnimationFrame` loop in a client component that draws with a 2D canvas context and per-entity effects), so they may have the same costs. Nobody has measured them yet. This spec measures first and then fixes what the measurements show. It does not guess at causes.

## Scope

**In:**

- A baseline measurement of frame rate for all five games on `/games/<id>/play`, at 1440x900, in desktop Chromium. The baseline is recorded in this spec before any code change.
- Fixes in Frogger: `components/frogger-game.tsx`, `lib/frogger/skins.ts`, and any Frogger render helpers that the measurement points to.
- The same audit and fixes, only where measured, in the four other real games: `components/asteroids-game.tsx`, `components/tetris-game.tsx`, `components/arkanoid-game.tsx`, `components/snake-game.tsx`, and their render modules `lib/asteroids/render.ts`, `lib/tetris/render.ts`, `lib/arkanoid/render.ts`, `lib/snake/render.ts`.
- Allowed kinds of change:
  - Draw less per frame: cache static layers or sprites on offscreen canvases, batch draw calls, skip off-screen work.
  - Reuse objects and gradients instead of creating them every frame.
  - Replace per-entity `shadowBlur` with a cheaper glow only where the measurement shows it is a major cost. The look must stay the same.
  - Use fewer `useState` hooks. Values that change every frame or do not affect what is drawn move to `useRef`, so changing them does not re-render. Only values the HUD shows still use state or reach the parent, and they update only when they change, or a few times per second.
  - Stop a loop and its listeners on unmount or pause, if the measurement shows a leak.
- A before and after screenshot pair per game, saved under `.playwright-screenshots/`.

**Out (for future specs or not planned):**

- Changes to game rules, scores, timing, or the `lib/*/engine.ts` files. Engine logic stays as it is.
- Changes to canvas logical sizes, skins, colors, sprites, or the visual design.
- Phone performance (coarse pointer). This spec targets laptops only. Any phone work gets its own spec.
- The touch controls: `lib/touch/`, `components/touch-dpad.tsx`, `components/touch-bar.tsx`.
- The play page layout (SPEC 12) and `components/game-player.tsx`, unless a measured cost is in the shell and cannot be fixed in a game.
- The Games library, Home, Hall of Fame, About, and the Supabase data calls.
- The six placeholder games that run the fake score ticker.
- New dependencies, a test runner, or a performance library. Measurement uses the Playwright MCP tools and the browser's own APIs.
- Lowering the canvas resolution to gain frames.

## Data model

This feature introduces no new data. No new tables, columns, routes, `localStorage` keys, or client types. Existing types in the game modules are unchanged.

## Measurement method

These rules apply to the baseline and to every re-measurement. They are the only source for the numbers in this spec.

1. Start the app with `npm run build` then `npm run start`, so the numbers come from a production build, not the dev server.
2. Open `/games/<id>/play` in desktop Chromium at 1440x900 through the Playwright MCP tools. Use a fine pointer (no touch emulation).
3. Start the game with its normal start input. Play for 10 seconds with inputs that keep the game active (for example, moving and firing in Asteroids, dropping in Tetris).
4. In the page, record `requestAnimationFrame` timestamps over those 10 seconds with `browser_evaluate`. Compute the average frames per second and the share of frames longer than 33ms.
5. Repeat each run 3 times. Record the worst of the 3 runs. Close other heavy apps before the runs.
6. For each game that is slow, take a Chrome performance profile of one 10-second run and record the top 5 self-time functions in this spec.

**Pass rule for one game:** over 10 seconds, average fps is at least 57, and no more than 2% of frames are longer than 33ms. Measured by the method above.

## Implementation plan

1. **Baseline.** No code change. Run the measurement method for all five games. Record the numbers and the top 5 costs for each slow game in the "Measurements" section below. Save one screenshot per game to `.playwright-screenshots/` as the "before" reference. This step is complete when the table has all five rows filled in.
2. **Frogger fixes.** Fix the costs found in step 1 for Frogger, in `components/frogger-game.tsx` and `lib/frogger/skins.ts`. Keep the look. Within `FroggerRealGame`, replace the `stats` `useState` with a `useRef` that holds the latest score, level and lives. Call the parent `onStats` only when one of those values changes. Check in the profile that `onScoreChange`, `onLivesChange` and `onLevelChange` fire on events and not every frame. If they fire every frame, throttle them. Re-measure. Record the new numbers. Run `npx tsc --noEmit` and `npm run lint`. The game must still play after the step.
3. **Other four games.** For each of Asteroids, Tetris, Arkanoid and Snake, check the baseline row. If it passes the pass rule, make no change to that game. If it fails, fix the top measured costs in its component and render module only. These four components already keep their game state and callbacks in `useRef` and have no `useState`, so look for other per-frame costs there (drawing, allocations, `shadowBlur`). Re-measure after each game. The game must still play after each game's change.
4. **Verify the look.** Save an "after" screenshot for each game that changed. Compare it with the "before" screenshot by eye. Record "same look" or the difference in the Measurements section.
5. **Verify the build.** Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
6. **Record.** Fill in the final measurements, check the acceptance criteria, and set the status to `Implemented` only when every criterion is checked.

## Measurements

Fill in before any code change (step 1), then after each step. Numbers are the worst of 3 runs.

| Game      | Baseline avg fps | Baseline frames >33ms | Top costs (baseline)        | After avg fps | After frames >33ms |
| --------- | ---------------- | --------------------- | --------------------------- | ------------- | ------------------ |
| Frogger   | 60.0             | 0.00%                 | none (passes, not profiled) | _pending_     | _pending_          |
| Asteroids | 60.0             | 0.00%                 | none (passes, not profiled) | _pending_     | _pending_          |
| Tetris    | 60.0             | 0.00%                 | none (passes, not profiled) | _pending_     | _pending_          |
| Arkanoid  | 60.0             | 0.00%                 | none (passes, not profiled) | _pending_     | _pending_          |
| Snake     | 60.0             | 0.00%                 | none (passes, not profiled) | _pending_     | _pending_          |

Baseline notes (step 1, production build from `next start` on port 3020, Playwright MCP browser, 1440x900, fine pointer):

- Skins: the baseline ran each game's default skin (flat, no glow). Glow skins were not in the baseline. See "Neon skin check" below.
- Each game: 3 runs of 10 seconds. Keys sent every 300 ms during each run (arrows, Space). Worst run shown. All 3 runs were identical for every game (60.0 fps, 0.00%, max frame gap 17.7 to 19.6 ms).
- Screenshots: `.playwright-screenshots/13-<game>-before.png`. Each shows the game running.
- Console errors: none during the runs.
- The spec's report that Frogger drops frames on a laptop was **not reproduced** in this environment. Re-check on the user's laptop before closing the spec.
- The pass rule uses rAF timestamps, which cap at 60 Hz here, so this method cannot show fps above 60.

**Neon skin check (Tetris, `tetris-skin` = `neon`):**

- In-game, 3 runs: 60.0 fps, 0.00% frames over 33ms. The rAF cap hides the cost, so this does not show headroom.
- Canvas microbenchmark, full 10x20 board (200 cells), flushed each frame, 3 rounds: neon `drawCellNeon` about 2.9 ms per frame, flat cell about 0.2 ms per frame. That is about 17% of a 16.7 ms frame budget for the cells alone.
- The Neo skins in Asteroids, Snake, Arkanoid and Frogger also use `shadowBlur` and are not measured yet.

## Acceptance criteria

- [ ] The baseline table is filled in for all five games before any code change is committed.
- [ ] Frogger passes the pass rule at 1440x900 on the production build.
- [ ] Frogger passes the pass rule at 1366x768, the viewport from SPEC 12.
- [ ] Each of Asteroids, Tetris, Arkanoid and Snake passes the pass rule at 1440x900, either from the baseline or after a fix recorded in the table.
- [ ] No game shows console errors during the 10 second runs.
- [ ] After a game is left (navigating to another page), its `requestAnimationFrame` loop stops. Checked by counting frame callbacks in `browser_evaluate` after navigation.
- [ ] `git diff --stat` shows no changes under `lib/*/engine.ts`, `lib/touch/`, `components/touch-dpad.tsx`, `components/touch-bar.tsx`, or `components/game-player.tsx`.
- [ ] `git diff` shows no change to any canvas logical size constant (the `width` and `height` values of each game).
- [ ] For each changed game, the before and after screenshots show the same look, checked by eye, and the result is written in the Measurements section.
- [ ] Each game still plays after its change: start, play, pause, and exit work with the keyboard.
- [ ] `npx tsc --noEmit` passes with no errors.
- [ ] `npm run lint` passes with no errors.
- [ ] `npm run build` passes.

## Decisions

- **Yes: measure before fixing.** The causes are not known yet, and a guessed fix can cost time without gaining frames. Discarded: fixing by reading the code alone.
- **Yes: fix Frogger first, then the other four games by measurement.** Frogger is where the problem was seen. The other games are assumed to share the pattern, but each one is only changed if its own numbers fail the pass rule. Discarded: applying the same change to all five without measuring.
- **Yes: fewer `useState`, more `useRef`.** Values that change every frame or only feed the drawing code live in refs, so they do not re-render the component. Only the HUD values (score, level, lives) stay in React state or the parent, because the HUD must re-render to show them. Reason: a `setState` in a game loop re-renders the component on every change. Discarded: removing all state, which would leave the HUD stale. Note: the other four games already follow this pattern, so the change mainly affects Frogger.
- **Yes: loop and render only.** Game rules stay the same, so the change carries no gameplay risk. Discarded: refactoring the engines (`lib/*/engine.ts`) for speed. That would need a regression check for each rule change and its own spec.
- **Yes: keep the look.** Glow, skins, and sprites stay visually the same. Replacing `shadowBlur` is allowed only where it is measured as a major cost. Discarded: lowering the canvas resolution or removing effects, which would change the design.
- **Yes: pass rule at 60fps over 10 seconds, measured on desktop Chromium.** This matches the user's target of 60fps on a laptop. The threshold of 57 average fps leaves a small margin for measurement noise. Discarded: a single-run check, which is too noisy.
- **No: phone performance in this spec.** The user asked about laptop frame rate. Phones need their own targets and their own checks.
- **No: a test runner or a performance library.** `CLAUDE.md` says the repo has no test runner. The Playwright MCP tools and the browser's own APIs are enough for these checks.
- **No: changing the React structure of the games beyond the per-frame state issue.** Discarded: a broad rewrite of the game components. The change stays as small as the measurements allow.

## Identified risks

| Risk                                                                                              | Mitigation                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Headless or laptop noise makes the fps numbers jump between runs.                                 | Take the worst of 3 runs, close other apps, and run from the production build.                                                                |
| The laptop GPU differs from the one used for measurement.                                         | The pass rule is measured on the machine that runs the spec. The user's own laptop is the final check; record its result if it differs.       |
| Caching sprites or gradients changes the look.                                                    | Before and after screenshots per changed game, checked by eye. Revert any cache that changes the look.                                        |
| Frogger HUD state is updated from the loop, and moving it out of React could leave the HUD stale. | HUD values update only when they change or a few times per second. The HUD must still show the right score, level and lives after the change. |
| Frogger file is large (862 lines). A broad edit is hard to review.                                | Make one measured change per commit, and re-measure after each commit.                                                                        |

## Lessons for future specs and games

Findings from the step 1 baseline. Use them when measuring any new or existing game.

**Measurement**

- **Measure every skin a player can pick.** The default skin is often flat. In this spec the baseline ran flat skins and missed the glow cost. Tetris stores its skin under `localStorage` key `tetris-skin`. Set it, then reload. Check the key in each game's component before you use it.
- **A 60 Hz rAF pass hides headroom.** If the browser caps at 60 fps, a 60.0 result does not show how much frame budget is left. Add a canvas microbenchmark that times one frame of draw calls and flushes with `getImageData(0, 0, 1, 1)`. Compare the costs (ms per frame) of the skins under test.
- **Synthetic keys depend on the game.** Frogger reads `e.key`. Asteroids, Tetris, Arkanoid and Snake read `e.code`. Dispatch `KeyboardEvent` on `window` or `document` with both `key` and `code` set.
- **Port conflicts.** Before you start a server, check the port with `lsof -nP -iTCP -sTCP:LISTEN`. Do not stop a process you did not start. Use another port (`npx next start -p <port>`). An old server on the port may serve a stale build.
- **Reference numbers (step 1, headless Chromium on the measurement machine).** Tetris `drawCellNeon` with a full board (200 cells): about 2.9 ms per frame. The same board flat: about 0.2 ms. The laptop GPU will differ.

**Solution (proposed, not implemented or verified)**

- Glow cost comes from `shadowBlur` on every cell or entity, one blur per draw call.
- Proposed fix: pre-render each glowing sprite once per colour into an offscreen canvas. The canvas must include the blur margin (about `shadowBlur` px on each side). Then draw it with `drawImage` each frame. Use one sprite per colour, not per cell.
- The look must match. Compare before and after screenshots by eye, and check the edge of the glow in particular. If the look changes, revert.
- Re-run the microbenchmark and the in-game measurement after the change. Record both.

**Checklist for a new game**

1. Measure the default skin and every glow skin.
2. Run the microbenchmark on each glow skin, so the glow cost is known before the game ships.
3. Keep per-frame values in refs. Put only HUD values in React state, and update them on change.
4. Stop the rAF loop and its listeners on unmount and on pause.

## What is **not** in this spec

- Changes to game rules or the `lib/*/engine.ts` files.
- Changes to canvas sizes, skins, colors, or the visual design.
- Phone performance.
- The touch controls, the play page layout, and the Games library.
- New dependencies or a test runner.
