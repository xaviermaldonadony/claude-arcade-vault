# SPEC 08 — Arkanoid game on the ARKANOID player route

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-22
> **Objective:** Make `/games/arkanoid/play` run a playable Arkanoid game, ported from `references/started-games/04-arkanoid/` to TypeScript, that submits its real score to the leaderboard through `POST /api/scores`, while every other game keeps its fake ticker.

## Why this spec exists

The reference in `references/started-games/04-arkanoid/` is a finished vanilla JavaScript game with five levels, lives, sound, and a sprite sheet. This spec ports its mechanics and numbers into the App Router app, following the engine pattern of SPEC 05 and SPEC 07, and connects it to the existing PAUSE, END, and SAVE SCORE controls.

## Scope

**In:**

- Pure engine in `lib/arkanoid/`: types, constants, levels, engine, render, and keyboard input.
- Client canvas component `components/arkanoid-game.tsx`.
- Paddle control with the keyboard (Left and Right arrows) and with the mouse on fine pointers.
- Pause with `P` or `Escape`, controlled by the existing player PAUSE button.
- Five levels, three lives, 10 points per brick, and the game-over and win rules of the reference.
- Sound: bounce and break, played by the component from the engine's sound events.
- Sprite sheet and sounds served from `public/arkanoid/`. The files were moved from the repository root `assets/` during this spec's design.
- One migration `supabase/migrations/0004_add_arkanoid_game.sql` that adds the `arkanoid` row to `games`.
- One `.cover-arkanoid` CSS block in `app/arcade.css`.
- One entry for `arkanoid` in the registry `lib/games-registry.ts`.
- `CLAUDE.md` Architecture update for the new game and the catalog count.

**Out of scope (for future specs):**

- The level-jump buttons 1 to 5 on the pause overlay. They were a debug feature of the reference.
- Touch controls. On a coarse pointer the game shows `THIS GAME NEEDS A KEYBOARD`.
- Mute, volume, or any audio setting.
- A launch step. The ball starts moving as soon as it is placed on the paddle, as in the reference.
- Changing the mock activity feed in `lib/data.ts`.
- Per-level high scores or any change to the leaderboard API or tables.

## Data model

This feature adds no table and no API route. It adds the engine types in `lib/arkanoid/types.ts`:

```ts
export type ArkanoidStatus = 'playing' | 'paused' | 'gameover' | 'won';

export type BrickColor = 'gray' | 'red' | 'yellow' | 'cyan' | 'magenta' | 'hotpink' | 'green';

export type Rect = { x: number; y: number; w: number; h: number };

export type Brick = Rect & { color: BrickColor; alive: boolean };

export type Ball = Rect & { vx: number; vy: number };

export type Explosion = Rect & { color: BrickColor; elapsed: number };

// Sound events produced by one step. The component plays them and the engine never plays audio.
export type SoundEvent = 'bounce' | 'break';

export type ArkanoidState = {
  status: ArkanoidStatus;
  level: number; // 1 to 5
  score: number;
  lives: number; // starts at 3
  paddle: Rect; // w 81, h 14, y 560
  ball: Ball; // w 16, h 16
  bricks: Brick[];
  explosions: Explosion[];
  sounds: SoundEvent[]; // only the events of the last step
};

// Input for one frame. Pause is not part of the input: the component calls setPaused.
export type ArkanoidInput = {
  left: boolean;
  right: boolean;
  pointerX: number | null; // paddle center in canvas coordinates, or null when the mouse is not on the canvas
};
```

Conventions:

- Coordinates: origin top-left, canvas 800 × 600 px.
- Velocities in pixels per second, as in the reference (`BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, times the level speed).
- Brick grid: 10 columns × 6 rows, 64 × 24 px each, origin x 80, origin y 80.
- Levels are data in `lib/arkanoid/levels.ts`, ported from `levels.js` with the same five patterns and speeds 1.00, 1.10, 1.21, 1.33, 1.46.

## Implementation plan

0. **Assets (done during spec design).** `public/arkanoid/spritesheet-breakout.png` and `public/arkanoid/sounds/{rebound,destroy}.mp3` are in place. The root `assets/` folder is gone.
1. **Engine types and constants.** Create `lib/arkanoid/types.ts`, `lib/arkanoid/constants.ts` (canvas size, paddle, ball, brick grid, explosion frames, speeds), and `lib/arkanoid/levels.ts`. Verify with `npx tsc --noEmit`.
2. **Engine logic.** Create `lib/arkanoid/engine.ts` with `createGame()`, `setPaused(state, paused)`, and `step(state, input, dt)`. Port the reference mechanics: paddle movement, ball walls, paddle bounce, one brick per frame, explosions, ball lost, level advance, win and game over. `dt` is clamped to 0.05 s. Nothing imports it yet. Verify with `npx tsc --noEmit`.
3. **Render and input.** Create `lib/arkanoid/render.ts` with `loadSprites(src)` and `drawGame(ctx, state, now)`, where `drawGame` draws the bricks, explosions, paddle, ball, HUD, and the GAME OVER and win overlays. Create `lib/arkanoid/input.ts` with `attachKeyboard(window)` that returns `{ read, takePausePress, detach }`. Verify with `npx tsc --noEmit`.
4. **Client component.** Create `components/arkanoid-game.tsx` with props `paused`, `onStats`, `onEnd`, `onTogglePause`. It loads the sprite sheet and both sounds, starts the rAF loop only after the sprite sheet loads, plays `state.sounds` after each step, and reads the mouse position from the canvas. It is not yet registered. Verify with `npm run build`.
5. **Migration.** Create `supabase/migrations/0004_add_arkanoid_game.sql` with one `insert into public.games` row (see Decisions). Apply it with the Supabase MCP `apply_migration` tool. Verify with `list_tables` and `execute_sql` (`select count(*) from public.games` goes from 10 to 11).
6. **Cover CSS.** Add `.cover-arkanoid` in `app/arcade.css` after `.cover-tetris`. Verify `/games` shows the new card with the cover.
7. **Registry entry.** Add `arkanoid` to `REAL_GAMES` in `lib/games-registry.ts`, with `mapStats` returning the lives slot with hearts. Verify `/games/arkanoid/play` runs the real game and `/games/fall/play` keeps the fake ticker.
8. **Save flow.** Confirm SAVE SCORE sends `POST /api/scores` with `game: 'arkanoid'`, gets `201`, and the row appears in the Hall of Fame. No API change.
9. **Docs.** Update `CLAUDE.md` Architecture: the catalog count, the real-game list (`asteroids`, `tetris`, `arkanoid`), and a paragraph for the Arkanoid engine. Leave the `AGENTS.md` block alone.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint`, and `npx tsc --noEmit` exit 0.
- [ ] `lib/arkanoid/types.ts`, `lib/arkanoid/levels.ts`, and `lib/arkanoid/engine.ts` contain none of `react`, `next`, `window`, `document`, or `localStorage`.
- [ ] `arkanoid` appears in `/games` with the magenta color and the `.cover-arkanoid` cover, and opens at `/games/arkanoid`.
- [ ] `/games/arkanoid/play` renders the Arkanoid canvas with no console errors and no React hydration warning.
- [ ] The first frame is drawn only after the sprite sheet loads. No `drawImage` error appears in the console.
- [ ] The paddle moves with the Left and Right arrow keys and clamps at both canvas edges.
- [ ] On a fine pointer, moving the mouse over the canvas moves the paddle center to the pointer x.
- [ ] Breaking a brick adds exactly 10 points to the score.
- [ ] Breaking a brick plays `destroy.mp3`. Hitting a wall or the paddle plays `rebound.mp3`.
- [ ] Losing the ball reduces lives by one and places the ball on the paddle. At 0 lives the game ends.
- [ ] Clearing level 1 to 4 loads the next level and raises the ball speed by its level factor.
- [ ] Clearing level 5 ends the game in the won state.
- [ ] PAUSE, `P`, and `Escape` each pause and resume. The ball, paddle, and score do not change while paused.
- [ ] There are no level-jump buttons on the pause overlay.
- [ ] Game over and win each open the END modal with the real score.
- [ ] SAVE SCORE sends `POST /api/scores` and gets `201`. The row appears in the Hall of Fame tab for `arkanoid`.
- [ ] With the network blocked, SAVE SCORE shows `COULD NOT SAVE. TRY AGAIN` and keeps the name and score.
- [ ] `plays` in `games` for `arkanoid` increases by 1 after a saved score.
- [ ] `/games/fall/play` still shows `NOT RANKED YET` with no SAVE button.
- [ ] On a coarse pointer the game shows `THIS GAME NEEDS A KEYBOARD`.
- [ ] `grep -rn "NIVEL\|PUNTAJE\|PAUSA\|ESPACIO\|Saltar\|Completaste" lib/arkanoid components/arkanoid-game.tsx` returns no matches.

## Decisions

- **Yes: pure engine in `lib/arkanoid/`, same shape as SPEC 05 and SPEC 07.** `types.ts`, `engine.ts`, and `levels.ts` have no DOM, React, or Next imports, so the physics can be checked without a browser.
- **Yes: `levels.ts` as a sixth file.** The pre-set layout lists five files. Levels are pure data with a helper, so they do not belong in `constants.ts`.
- **Yes: `createGame()` and `step(state, input, dt)` have no `rng` parameter.** The reference uses no randomness. Adding an unused parameter would be noise. This differs from the pre-set signature.
- **Yes: sound is kept, and the engine emits events.** The user added the reference sounds to the project. `step` fills `state.sounds` with `'bounce'` and `'break'`. The component plays `public/arkanoid/sounds/rebound.mp3` and `destroy.mp3`. The engine never creates an `Audio` object.
- **Yes: mouse control on fine pointers, keyboard on all pointers.** The user chose mouse plus keyboard. Mouse position is read in the component with `getBoundingClientRect()`, scaled to canvas coordinates, and passed as `pointerX`. `input.ts` handles only the keyboard, so it stays a window-level listener as in SPEC 05.
- **Yes: coarse pointer shows `THIS GAME NEEDS A KEYBOARD`.** This is the pre-set rule. Touch players cannot use the arrow keys.
- **No: level-jump buttons.** The user chose to drop them. They were a debug feature.
- **Yes: game over at 0 lives, and win after level 5.** Both set the status and call `onEnd(score)` once. The win does not restart the game.
- **Yes: keep the reference physics.** The paddle bounce only flips `vy`. There is no angle change from the hit point, and speed is constant within a level. This keeps the port faithful. A different feel would be a later tuning spec.
- **Yes: ball relaunches immediately after a lost life.** The reference does this. A launch step is out of scope.
- **Yes: `.cover-arkanoid` goes after `.cover-tetris`.** The pre-set rule says after `.cover-duel`. `.cover-tetris` is now the last cover block, so the new block follows it.
- **Yes: `cat` is `ARCADE`.** Breakout is a classic arcade game, and `PUZZLE` and `SHOOTER` do not fit.
- **Yes: `color` is `magenta`.** Tetris uses `cyan`. The reference bricks use pink and magenta.
- **Yes: id `arkanoid`, title `ARKANOID`.** The id comes from the folder name `04-arkanoid`. It does not collide with any existing row in `games`.
- **Yes: assets in `public/arkanoid/`.** Next.js serves `public/` at the site root. The folder name keeps the files separate from other games.
- **Yes: the registry refactor is already done.** `lib/games-registry.ts` exists, so this spec only adds one entry.
- **No: change the SPEC 01 to 07 docs.** Only `CLAUDE.md` changes.

## Identified risks

| Risk                                                                  | Mitigation                                                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game id `arkanoid` collides with an existing row                      | Checked: `games` has no `arkanoid` row. The migration fails on a duplicate primary key, so a collision cannot go unnoticed.                         |
| The sprite sheet loads after the first frame, so the first draw fails | The rAF loop starts only after `loadSprites` resolves. `drawGame` returns early if the image is not ready.                                          |
| Browser blocks audio playback before a user gesture                   | The component starts sounds only inside the rAF loop after the first keypress or click. Each `play()` promise has a `catch` that ignores the error. |
| Mouse coordinates are wrong when CSS scales the canvas                | Scale with `canvas.width / rect.width`, as the reference does. Check the mouse path in the browser at a non-default window size.                    |
| Level 5 win comes quickly for a player with lives left                | Accepted. The reference behaves the same way. Tuning is a later spec.                                                                               |
| Spanish text survives in the port                                     | Acceptance grep checks the game files for the reference strings.                                                                                    |

## What is **not** in this spec

- Level-jump buttons on the pause overlay.
- Touch controls.
- Audio settings or a mute toggle.
- A launch step before the ball moves.
- Speed or physics tuning beyond the reference numbers.
- The activity feed mock data in `lib/data.ts`.
- Per-level scores or any change to the scores API or tables.

Each one of those, if it lands, goes in its own spec.
