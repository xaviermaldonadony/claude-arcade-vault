# SPEC 07 — Tetris game on the TETRIS player route

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-11-22
> **Objective:** Make `/games/tetris/play` run a playable Tetris game, ported from `references/started-games/03-tetris/` to TypeScript, that submits its real score to the leaderboard through `POST /api/scores`.

## Why this spec exists

SPEC 05 made Asteroids the only game with a real engine and a ranked score. Every other game still uses the fake ticker. The Tetris reference is a finished vanilla JavaScript game. This spec ports its mechanics and numbers into the App Router app, using the same engine, render, input and component pattern as SPEC 05. It also moves the component-gate in `components/game-player.tsx` to a registry, so the next real game needs one entry instead of another boolean.

## Scope

**In:**

- A real Tetris game for the catalog id `tetris`, title `TETRIS`, rendered at `/games/tetris/play`.
- A new `games` row for `tetris`, added by migration `0003_add_tetris_game.sql`, with `cat` `PUZZLE`, `color` `cyan`, `cover` `cover-tetris`.
- A `.cover-tetris` block in `app/arcade.css`, placed after `.cover-duel`. A dark background with a faint grid and a few colored tetromino squares, plus a glyph.
- A registry `lib/games-registry.ts` that maps a game id to its real component and stats mapping. Asteroids and Tetris are registered. Every other id keeps the fake ticker.
- Port of the reference mechanics and numbers: 10 by 20 board, 8 pieces including the custom nut piece, clockwise rotation with wall kicks, soft drop, hard drop, line clears, levels and gravity, game over on spawn collision.
- Scoring from the reference: line clear points `[0, 100, 300, 500, 800]` times the level, plus 1 point per soft-drop cell, plus 2 points per hard-drop cell.
- Keyboard controls from the reference: Left and Right arrows move, Up or `X` rotates, Down soft-drops, Space hard-drops.
- Pause with the existing PAUSE button, with `P`, or with `Escape`.
- Real score, lines and level in the existing HUD, and END opens the existing game-over modal with the real score.
- SAVE SCORE for this game submits through `POST /api/scores`, the same flow as Asteroids in SPEC 05 and SPEC 06.
- English text for all in-game labels.
- A `lib/tetris/` engine with no DOM, React or Next imports, and a client canvas component `components/tetris-game.tsx`.
- Four skins for the game canvas, ported from `03-claude-tetris`: Retro (the default, the reference look), Neon, Pastel and Pixel art. A SKIN select under the canvas picks one. The choice is saved in `localStorage` under `tetris-skin`. Skins restyle only the game canvas. The page stays dark.

**Out of scope (for future specs):**

- Touch controls and on-screen buttons. On a coarse pointer the game shows the keyboard note.
- Page-wide dark and light theme toggle. The reference `tetris-theme` localStorage key is dropped. The app is dark-only (see `CLAUDE.md`). Skins are in scope, but they restyle only the game canvas.
- Held-key auto-repeat beyond the OS key repeat already used by the reference.
- The `NEXT` preview as a separate panel in the page. It is drawn inside the game canvas.
- Hold piece, ghost-piece toggle, and any other control not in the reference.
- Lives. The reference has none, and the game ends on spawn collision.
- Sound, music, and any audio.
- Scores for the other fake-ticker games, and any change to the activity feed mock in `lib/data.ts`.
- Changes to the Asteroids engine (`lib/asteroids/`), to the scores API, to the `games` table schema, and to the RLS or grants.
- Tests. The repo has no test runner (see `CLAUDE.md`).

## Data model

This feature adds game-state types and one `games` row. It adds no new table. It adds one `localStorage` key, `tetris-skin`, for the chosen skin.

```ts
// lib/tetris/types.ts
export type Cell = number; // 0 = empty, 1..8 = piece color index
export type Board = Cell[][]; // ROWS rows of COLS cells, row 0 at the top

export type Piece = {
  type: number; // 1..8, index into PIECES
  shape: number[][]; // square matrix of 0 or piece color index
  x: number; // column of the shape's top-left cell
  y: number; // row of the shape's top-left cell
};

export type TetrisStatus = 'playing' | 'paused' | 'gameover';

export type TetrisState = {
  status: TetrisStatus;
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropAccum: number; // seconds since last gravity step
  dropInterval: number; // seconds between gravity steps
};

export type TetrisInput = {
  left: boolean; // justPressed
  right: boolean; // justPressed
  rotate: boolean; // justPressed, Up or X
  softDrop: boolean; // Down, repeats with OS key repeat
  hardDrop: boolean; // justPressed, Space
};

// lib/tetris/skins.ts
export type SkinId = 'retro' | 'neon' | 'pastel' | 'pixel';
```

Conventions:

- Board is 10 columns by 20 rows (`COLS = 10`, `ROWS = 20`). Cell size is 30 pixels (`BLOCK = 30`). The main canvas is 300 by 600 pixels.
- Piece colors, index 1 to 8: `#4dd0e1` (I), `#ffd54f` (O), `#ba68c8` (T), `#81c784` (S), `#e57373` (Z), `#90caf9` (J), `#ffb74d` (L), `#9e9e9e` (N, the nut piece). These match the reference.
- Skins. `SkinId` is `retro`, `neon`, `pastel` or `pixel`. Retro is the default. It uses the piece colors above and the reference drawing: a flat block with a top highlight strip. Neon and Pastel have their own palettes, indexed 1 to 8 like `COLORS`. Neon: `#00f0ff`, `#fff200`, `#ff00e6`, `#39ff14`, `#ff1744`, `#2979ff`, `#ffab00`, `#b0bec5` (nut). Pastel: `#b5e6f2`, `#fff1a8`, `#d7bfef`, `#bfeec4`, `#f7bcbc`, `#bcd3f5`, `#ffd3a8`, `#d6dde3` (nut). The nut colors are chosen for this spec, because `03-claude-tetris` has no nut piece. Pixel art uses the Retro palette with its own drawing.
- Skin drawing, as in `03-claude-tetris/game.js`. Neon: a glow of 12 pixels in the block color, and a white inner outline at 55% alpha. Pastel: a rounded body with radius `max(3, 0.25 × block size)`, a faint border, and a light sheen along the top. Pixel art: a flat block, a 2 by 2 dither overlay drawn with `fillRect` (not a canvas pattern), and a 2-pixel light bevel on the top and left, dark on the bottom and right.
- Skin canvas and ghost, per skin. Background and grid: Retro uses the reference `:root` colors in `references/started-games/03-tetris/style.css`. Neon: `#000000` and `#0b2a33`. Pastel: `#fffafd` and `#f1e6f1`. Pixel art: `#12122a` and `#1f1f3a`. Ghost alpha: Retro 0.2, Neon 0.35, Pastel 0.3, Pixel art 0.25.
- Gravity interval: `dropInterval = max(100, 1000 - (level - 1) * 90)` milliseconds. The engine stores seconds, so it divides by 1000.
- Line scores: `LINE_SCORES = [0, 100, 300, 500, 800]`, indexed by the number of lines cleared at once, times `level`.
- Level: `level = floor(lines / 10) + 1`.
- The engine receives `dt` in seconds, clamped to 0.05 per frame, as in SPEC 05.

Saved score, written through `POST /api/scores` on SAVE SCORE. The shape is the SPEC 06 `ScoreSubmit`:

```json
{ "game": "tetris", "name": "KAI", "score": 4200 }
```

The `games` row inserted by migration `0003_add_tetris_game.sql`:

| Column  | Value                                                                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | `tetris`                                                                                                                                                                            |
| `title` | `TETRIS`                                                                                                                                                                            |
| `short` | `Stack falling blocks and clear rows.`                                                                                                                                              |
| `long`  | `Rotate and drop falling blocks to fill complete rows. Each cleared row scores, and the blocks fall faster every ten lines. The game ends when a new block cannot enter the board.` |
| `cat`   | `PUZZLE`                                                                                                                                                                            |
| `cover` | `cover-tetris`                                                                                                                                                                      |
| `color` | `cyan`                                                                                                                                                                              |
| `plays` | `0`                                                                                                                                                                                 |

## Implementation plan

1. **Engine types and constants.** Create `lib/tetris/types.ts` and `lib/tetris/constants.ts` with the types and values above, including `PIECES` (8 shapes, the nut piece included), `COLORS`, `LINE_SCORES` and the gravity formula. Verify with `npx tsc --noEmit`.
2. **Pure engine.** Create `lib/tetris/engine.ts` exporting `createGame(rng?)`, `setPaused(state, paused)` and `step(state, input, dt, rng?)`, plus helpers `collide`, `rotateCW`, `tryRotate` (kicks `[0, -1, 1, -2, 2]`), `merge`, `clearLines`, `ghostY`. Port the logic of the reference `loop`, `softDrop`, `hardDrop`, `lockPiece`, `spawn` and `clearLines`, with `Math.random` replaced by `rng`. Verify with `npx tsc --noEmit`. Nothing imports it yet.
3. **Rendering and skins.** Create `lib/tetris/skins.ts` with `SkinId`, `SKIN_IDS`, `isSkinId(value)`, the Neon and Pastel palettes, the canvas colors and ghost alpha per skin, and the four block drawers (Retro, Neon, Pastel, Pixel art) from Conventions. Create `lib/tetris/render.ts` exporting `drawTetris(ctx, state, now, skin)`. It fills the canvas background for the skin, draws the grid, the board, the ghost piece at the skin's alpha, the current piece, and the NEXT preview in a 120 by 120 sub-rect to the right of the board. It draws the PAUSED and GAME OVER overlays on the canvas, as SPEC 05 does. Verify with `npx tsc --noEmit`.
4. **Input.** Create `lib/tetris/input.ts` exporting `attachKeyboard(window)` that returns `{ read(), takePausePress(), detach() }`. It handles `ArrowLeft`, `ArrowRight`, `ArrowUp`, `KeyX`, `ArrowDown` and `Space` for game actions, and `KeyP` and `Escape` for pause. Discrete actions (`left`, `right`, `rotate`, `hardDrop`) are true for one frame after the press. `softDrop` follows the held key. It calls `preventDefault` for game keys, ignores typing targets, and clears held keys on `blur`. Verify with `npx tsc --noEmit`.
5. **Canvas component.** Create `components/tetris-game.tsx` (client). It owns a `<canvas width={300} height={600}>` and follows `components/asteroids-game.tsx`: latest-props refs, empty-deps rAF loop, `onStats`, `onEnd`, `paused` and `onTogglePause` props, the coarse-pointer note `THIS GAME NEEDS A KEYBOARD`. Its `onStats` also reports `lines`. It owns the skin state and renders a SKIN select under the canvas with the options Retro, Neon, Pastel and Pixel art. It reads `tetris-skin` in an effect after mount, so server render and hydration both start on Retro. A missing or unknown value falls back to Retro. A change writes `tetris-skin` inside try/catch and blurs the select, so Space keeps controlling the game. Verify with `npm run build`.
6. **Migration.** Create `supabase/migrations/0003_add_tetris_game.sql` with the `tetris` row from the Data model. Apply it with the Supabase MCP `apply_migration` tool. Verify with `list_tables` (both tables still RLS enabled) and `execute_sql` (`select count(*) from public.games` returns `9`, and `select id from public.games where id = 'tetris'` returns one row).
7. **Cover CSS.** Add `.cover-tetris` to `app/arcade.css` after `.cover-duel`, in the same pattern as the other cover classes. Verify `/games` shows the TETRIS card with the new cover.
8. **Registry.** Create `lib/games-registry.ts`. It maps game id to `{ component, mapStats }`, where `component` is the client component and `mapStats` turns the component's stats into the HUD values (Asteroids: lives shown; Tetris: lines shown in the lives slot). Register `asteroids` and `tetris`. Replace the `isRealGame = game.id === 'asteroids'` check at `components/game-player.tsx:18` with a registry lookup. Other ids keep the fake ticker. Update the stale comments at `components/game-player.tsx:9-10` and `:17` and `app/api/scores/route.ts:5`. Verify `/games/asteroids/play` still runs the real game and `/games/fall/play` still shows the fake ticker.
9. **Wire into the player.** In `components/game-player.tsx`, render the registry component for `tetris` in the arena. The HUD shows score, lines and level from the real game. END opens the existing game-over modal with the real score. The SAVE SCORE path is the same as for Asteroids. Verify `/games/tetris/play` in the browser.
10. **Docs.** Update `CLAUDE.md` Architecture: add one paragraph for `lib/tetris/` (including `skins.ts`) and the client canvas component, and change the "Only the Asteroids game submits scores" line so it names both real games and the registry. Do not touch the `AGENTS.md` block. Do not edit SPEC 01 to 06.

## Acceptance criteria

- [ ] `npm run build`, `npm run lint` and `npx tsc --noEmit` exit 0.
- [ ] `grep -nE "react|from 'next|window|document|localStorage" lib/tetris/types.ts lib/tetris/engine.ts lib/tetris/constants.ts` returns no matches.
- [ ] `supabase/migrations/0003_add_tetris_game.sql` exists, and `execute_sql` `select count(*) from public.games` returns `9`.
- [ ] `/games` lists TETRIS with the cyan cover and the PUZZLE chip filters it in.
- [ ] `/games/tetris/play` loads with no console errors and no React hydration warning in the dev server.
- [ ] On `/games/tetris/play` the board is drawn with 10 columns and 20 rows, and a piece spawns at the top center.
- [ ] Left and Right arrows move the piece one column per press. Up and `X` rotate it clockwise.
- [ ] Down moves the piece one row down and adds 1 point per cell. Space drops it to the ghost position and adds 2 points per cell.
- [ ] Completing one row adds 100 points at level 1. Two rows at once add 300. Three add 500. Four add 800.
- [ ] Every 10 lines the level increases by one, and the fall interval shortens by 90 milliseconds, with a floor of 100 milliseconds.
- [ ] The 8 pieces appear, including the gray nut piece, and the NEXT preview shows the upcoming piece.
- [ ] PAUSE, `P` and `Escape` each pause and resume. While paused, the piece, the board and the timers do not change.
- [ ] Stacking a piece that cannot spawn ends the game, and the game-over modal opens with the real score.
- [ ] SAVE SCORE sends `POST /api/scores` with `game: "tetris"` and gets `201`. The score appears in the Hall of Fame tab for TETRIS.
- [ ] With the network blocked, SAVE SCORE shows `COULD NOT SAVE. TRY AGAIN` and keeps the name and score.
- [ ] `/games/asteroids/play` still runs the Asteroids engine, and `/games/fall/play` still shows the fake ticker and `NOT RANKED YET`.
- [ ] On a coarse pointer, `/games/tetris/play` shows `THIS GAME NEEDS A KEYBOARD`.
- [ ] `grep -rnE "NIVEL|PUNTAJE|PAUSA|ESPACIO|Puntuación|Reiniciar" components/tetris-game.tsx lib/tetris/ components/game-player.tsx` returns no matches.
- [ ] `localStorage` has no `tetris-theme` key after the game runs.
- [ ] The SKIN select lists Retro, Neon, Pastel and Pixel art. Each one changes the block colors, the block drawing, and the canvas background and grid. The page stays dark.
- [ ] After a reload, the chosen skin is still selected. A missing or unknown `tetris-skin` value shows Retro.
- [ ] Changing the skin during a game does not pause or restart it.
- [ ] `CLAUDE.md` Architecture names both real games and the registry, and the `AGENTS.md` block is unchanged.
- [ ] SPEC 01 to 06 are unchanged in git (`git diff --stat specs/0[1-6]*` is empty).

## Decisions

- **Yes:** Port the reference mechanics and numbers exactly, as SPEC 05 did for Asteroids. The reference numbers are the source of truth.
- **Yes:** Keep all 8 pieces, including the custom nut piece. The user chose this, to keep the reference game intact.
- **Yes:** Category `PUZZLE` and color `cyan`. The user chose these. Cyan matches the reference I-piece.
- **Yes:** Cover is a falling-blocks grid. The user chose this.
- **Yes:** Game id `tetris`, title `TETRIS`. The user chose this, and it matches the reference folder name.
- **Yes:** Registry in `lib/games-registry.ts` replaces the `isRealGame` boolean. Reason: a second real game with a boolean would copy `game.id ===` checks in several places. A registry gives the next game one entry. No registry file existed before this spec.
- **Yes:** `Escape` also pauses, as in SPEC 05. The reference has only `P`.
- **Yes:** The HUD shows lines in the slot that Asteroids uses for lives. Reason: Tetris has no lives. The HUD keeps one layout for every real game.
- **Yes:** Soft drop and rotation follow the reference, which relies on OS key repeat for arrows. Reason: matches the reference feel without a custom repeat timer.
- **Yes:** Copy for `short` and `long` is written in this spec and reviewed with the spec. Reason: the `games` row needs text, and the reference README is in Spanish.
- **Yes:** Four skins from `03-claude-tetris`: Retro (default), Neon, Pastel and Pixel art. Reason: the user asked for the skins from that project. Retro stays the default because it is the reference look.
- **Yes:** Skins restyle only the game canvas. Reason: the app is dark-only, and the Pastel page background is light.
- **Yes:** The skin choice is saved under `tetris-skin`. Reason: matches the saved skin in `03-claude-tetris`.
- **Yes:** Nut piece colors for Neon (`#b0bec5`) and Pastel (`#d6dde3`) are chosen in this spec. Reason: `03-claude-tetris` has no nut piece.
- **No:** Dark and light theme toggle. Reason: the app is dark-only, and the toggle used `localStorage`.
- **No:** Hold piece and ghost toggle. Reason: not in the reference.
- **No:** Lives. Reason: not in the reference. Game over is spawn collision.
- **No:** Changes to the activity feed mock in `lib/data.ts:36-45`. The user chose to leave it unchanged, as SPEC 06 keeps those blocks static.
- **No:** A separate database table or score cap for Tetris. Reason: SPEC 06 caps all games at 10,000,000, and the reference scores stay far below that.

## Identified risks

| Risk                                                                                | Mitigation                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game id `tetris` collides with an existing row.                                     | The migration uses a plain insert. Before applying, run `select id from public.games` and confirm `tetris` is absent. The current seed has the eight ids from SPEC 06. |
| Registry refactor changes the Asteroids path and breaks the real game.              | Step 8 keeps Asteroids registered with the same props. Acceptance criteria check `/games/asteroids/play` after the change.                                             |
| Discrete keys (rotate, hard drop) double-fire with OS key repeat.                   | The input tracker reads `e.repeat` and ignores repeats for `rotate`, `hardDrop` and pause, so only held arrows repeat.                                                 |
| Gravity loop runs while the tab is hidden, then drops many rows at once.            | `dt` is clamped to 0.05 seconds per frame, as in SPEC 05.                                                                                                              |
| Spawn-collision check runs before the new piece is drawn, so the game-over is late. | The engine checks spawn collision inside `spawn`, in the same `step`, and returns `gameover` before the render call.                                                   |
| Pastel is a light palette, but the app is dark-only.                                | Skins restyle only the game canvas. The page chrome stays dark (see `CLAUDE.md`).                                                                                      |
| The reference draws each piece with `Math.random`, so a run cannot be replayed.     | `rng` is an injected parameter. Tests can pass a fixed sequence later. Acceptance criteria are manual in the browser, as in SPEC 05.                                   |

## What is **not** in this spec

- Page-wide dark and light theme toggle.
- Touch controls or on-screen buttons.
- Hold piece, ghost toggle, or any control not in the reference.
- Lives or levels beyond the reference gravity table.
- Sound and music.
- Scores for the other fake-ticker games.
- Changes to the activity feed mock in `lib/data.ts`.
- Changes to the Asteroids engine, the scores API, the `games` schema, RLS or grants.
- Tests or a test runner.

Each one of those, if it lands, goes in its own spec.
