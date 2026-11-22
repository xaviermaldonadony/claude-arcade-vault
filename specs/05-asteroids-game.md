# SPEC 05 — Asteroids game on the ASTEROIDS player route

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-21
> **Objective:** Make `/games/asteroids/play` run a playable Asteroids game, ported from `references/started-games/02-asteroids/` to TypeScript, that reports its real score to the existing PAUSE, END, and SAVE SCORE controls, while every other game keeps its fake ticker.

## Why this spec exists

SPEC 01 built the Player screen as a visual shell with a fake score ticker. The reference in `references/started-games/02-asteroids/` is a finished vanilla JavaScript game. This spec ports its mechanics and numbers into the App Router app and connects it to the existing player controls.

## Scope

**In:**

- A real Asteroids game for the catalog id `asteroids`, rendered at `/games/asteroids/play`.
- Rename the catalog entry in `lib/data.ts` from id `rocks` to id `asteroids`, title `ASTEROIDS`. The `Rocks` game name in the activity mock data (`lib/data.ts`) changes to `Asteroids`. The cover class `cover-rocks` (`app/arcade.css`, `cover` field) stays as is.
- Port of the reference mechanics: ship rotation, thrust with drag, screen wrap-around, bullets with a time-to-live, asteroids in three sizes that split, levels, particles, 3 lives with respawn invulnerability, and the triple-shot power-up.
- Power-up drop rule from the reference: a 15% chance per destroyed asteroid, and a guaranteed drop after 5 kills without a drop. Only one power-up is active on the field at a time.
- Scoring from the reference: large asteroid 20 points, medium 50, small 100.
- Keyboard controls from the reference: Left and Right arrows rotate, Up thrusts, Space fires.
- Pause with the existing PAUSE button, or with the `P` or `Escape` key.
- Real score in the existing HUD, and END opens the existing game-over modal with the real score.
- SAVE SCORE for this game writes the real score to `av_scores`, in the shape SPEC 01 defines.
- English text for all in-game labels.
- The canvas rendering in a client component, with the game logic in pure TypeScript modules that have no DOM access.

**Out of scope (for future specs):**

- Touch controls and on-screen buttons. On touch devices the game shows a short note that it needs a keyboard.
- UFOs. The catalog `long` copy mentions UFOs, but the reference game has none. The copy stays as is.
- Restart with Space from the game-over state. Restart goes through the existing PLAY AGAIN button in the modal.
- High score persistence beyond `av_scores`. No best-score tracking, no leaderboard change, no Hall of Fame change.
- Reading `av_scores` for anything in this game. It is write-only, as in SPEC 01.
- Sound, music, and any audio.
- Server calls, Supabase writes, or any database. Saved scores stay in `localStorage`.
- Changes to the fake ticker for the other games.
- Changes to the Library card, the Detail page, the nav, or the Hall of Fame.
- Tests. The repo has no test runner (see `CLAUDE.md`). Checks are manual, in the browser.

## Data model

This feature adds game-state types and no storage. The only persisted data is the existing `av_scores` entry written by SAVE SCORE, which keeps the SPEC 01 shape.

```ts
// lib/asteroids/types.ts
export type Vec = { x: number; y: number };

export type GameStatus = 'playing' | 'paused' | 'dead' | 'gameover';

export type AsteroidSize = 1 | 2 | 3; // 1 small, 2 medium, 3 large

export type Asteroid = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: AsteroidSize;
  radius: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][];
};

export type Bullet = { id: number; x: number; y: number; vx: number; vy: number; ttl: number };

export type Particle = { x: number; y: number; vx: number; vy: number; ttl: number; life: number };

export type PowerUp = { id: number; x: number; y: number; vx: number; vy: number; ttl: number };

export type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  invincible: number; // seconds left
  shootCooldown: number; // seconds left
  tripleShot: number; // seconds left
  thrusting: boolean; // true while Up is held, drives the thruster flame
};

export type AsteroidsState = {
  status: GameStatus;
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  deadTimer: number; // seconds left in 'dead'
  killsSinceDrop: number;
  dropActive: boolean; // a power-up is on the field this level
};

export type AsteroidsInput = { left: boolean; right: boolean; thrust: boolean; fire: boolean };
```

Conventions:

- The field is 800 by 600 pixels, origin top-left (`W = 800`, `H = 600`).
- Velocities are in pixels per second. Angles are in radians.
- Asteroid radii: `[_, 16, 30, 50]` for sizes 1, 2, 3. Base speeds: `[_, 85, 55, 32]`. Points: `[_, 100, 50, 20]`.
- The engine receives `dt` in seconds, clamped to 0.05 per frame.

Saved score, written by SAVE SCORE to `localStorage` key `av_scores` (unchanged from SPEC 01):

```json
{ "game": "asteroids", "score": 1240, "name": "KAI", "at": 1763712000000 }
```

No new `localStorage` keys. No new cookies.

## Implementation plan

1. **Catalog rename.** In `lib/data.ts`, change the entry with id `rocks` to id `asteroids` and title `ASTEROIDS`. Change only the `id`, `title`, and activity-row `game` value in `lib/data.ts`. Do not change `cover-rocks`. Verify with `npx tsc --noEmit`, `npm run build`, and `curl -I http://localhost:3000/games/asteroids` returning `200`, and `/games/rocks` returning `404`.
2. **Engine types and utilities.** Create `lib/asteroids/types.ts` with the types above, and `lib/asteroids/constants.ts` with the field size, radii, speeds, points, ship and bullet constants, and power-up constants from the reference. Verify with `npx tsc --noEmit`.
3. **Pure engine.** Create `lib/asteroids/engine.ts` exporting `createGame(rng?)`, `step(state, input, dt, rng?)`, and small helpers for wrap, distance, spawn, split, and collisions. It has no DOM, canvas, or React imports. Port the logic of `update()` in the reference, including the dead-state timer, the level-complete check, and the same order of collision checks. Verify with `npx tsc --noEmit`. Nothing imports it yet.
4. **Rendering.** Create `lib/asteroids/render.ts` exporting `drawGame(ctx, state, now)` that draws the same shapes as the reference: ship silhouette with thruster flame, asteroid polygons, bullets, particles, power-up square with its `3x` label, the HUD line, and the overlay for `gameover` and `paused`. All text is English (SCORE, LEVEL, LIVES, GAME OVER, FINAL SCORE, PAUSED). Verify with `npx tsc --noEmit`.
5. **Input.** Create `lib/asteroids/input.ts` exporting a small keyboard tracker, with `keydown` and `keyup` on `window` and `preventDefault` for the arrow keys and Space while the game has focus. It reads `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`, `KeyP`, and `Escape`. It is removed on unmount. Verify with `npx tsc --noEmit`.
6. **Canvas component.** Create `components/asteroids-game.tsx` (client). It owns a `<canvas width={800} height={600}>`, runs `requestAnimationFrame` inside `useEffect`, calls `step` and `drawGame` each frame, and cancels the frame on unmount. It takes props `onStats({ score, lives, level })`, fired when any of those change, `onEnd(score: number)`, a `paused` prop controlled by the player, and an optional `onTogglePause()` called on `P` or `Escape`. It shows a note with the text `THIS GAME NEEDS A KEYBOARD` when the device has no fine pointer (`matchMedia('(pointer: coarse)')`). Verify with `npm run build`, which must still exit 0 with no game code running at build time.
7. **Wire into the player.** In `components/game-player.tsx`, when the game id is `asteroids`, render `AsteroidsGame` in the arena instead of the fake ticker and fake arena. The HUD score, the lives, and the level come from the real game through the callbacks. PAUSE and RESUME control the game through the `paused` prop, and `P` and `Escape` toggle the same state. END opens the existing game-over modal with the real score. The other game ids keep the current code path with no change. Before editing the player, read the relevant guides in `node_modules/next/dist/docs/` as `AGENTS.md` requires, and use the `/frontend-design` skill for the HUD and overlay styling, as `CLAUDE.md` requires for UI.
8. **Save and restart.** SAVE SCORE for `asteroids` writes `{ game: "asteroids", score, name, at }` to `av_scores`, using the real score and the same name rules as SPEC 01. PLAY AGAIN resets the engine with `createGame()`. The game-over modal and its buttons come from SPEC 01 and are not redesigned.
9. **Touch note and docs.** Show the keyboard note from step 6 on coarse pointers. Add one short paragraph to `CLAUDE.md` Architecture: the `lib/asteroids/` modules, the client canvas component, and that only the `asteroids` game runs the real engine. Do not touch the `AGENTS.md` block. Do not edit SPEC 01 or SPEC 02.

Every step leaves `npm run dev` running with every route rendering. Step 1 changes the URL of one card and nothing else. Steps 2 to 5 add files that nothing imports yet. Step 6 adds the component without a route change. Step 7 is the first step that changes what a user sees inside the player, and only on `/games/asteroids/play`.

## Acceptance criteria

- [ ] `npm run build` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `lib/asteroids/engine.ts` and `lib/asteroids/types.ts` contain no import from `react` or `next`, and no use of `window`, `document`, or `localStorage`, checked by `grep`.
- [ ] `/games/asteroids/play` loads with no console errors and no React hydration warning in the dev server.
- [ ] On `/games/asteroids/play`, the canvas is visible and the ship is drawn at the center of the field at start.
- [ ] Left and Right arrows rotate the ship, and Up thrusts it. Pressing and holding Space fires bullets at the rate of one shot per 0.2 seconds.
- [ ] A ship that moves past one edge of the field appears at the opposite edge, in both axes.
- [ ] Destroying a large asteroid adds 20 points, a medium one adds 50, and a small one adds 100. The HUD score updates to match.
- [ ] A large asteroid splits into two medium asteroids, and a medium one splits into two small ones. Small asteroids do not split.
- [ ] Clearing all asteroids starts the next level. The HUD level increases by one, and the number of asteroids is 3 plus the new level number.
- [ ] Colliding with an asteroid while not invincible removes one life. The ship respawns at the center with 3 seconds of invincibility, shown as blinking.
- [ ] With 0 lives left, the game-over modal opens with the real score.
- [ ] Destroying 5 asteroids in a row without a power-up drop produces a power-up. Only one power-up is on the field per level.
- [ ] Collecting a power-up turns on triple shot for 5 seconds, shown in the HUD as `3x` with a countdown.
- [ ] PAUSE, the `P` key, and the `Escape` key each pause the game, and each resumes it. While paused, the ship, asteroids, and timers do not change.
- [ ] END opens the game-over modal with the current score.
- [ ] As a guest, SAVE SCORE on `asteroids` writes one entry to `localStorage.av_scores` with `game: "asteroids"`, the real score, and the name typed, and shows `SCORE SAVED`.
- [ ] PLAY AGAIN starts a new game with score 0, 3 lives, and level 1.
- [ ] Every other game, for example `/games/fall/play`, still shows the fake ticker and works as in SPEC 01.
- [ ] On a device with a coarse pointer, `/games/asteroids/play` shows `THIS GAME NEEDS A KEYBOARD`, and the canvas is still rendered.
- [ ] No text in the game screen is in Spanish. `NIVEL`, `PUNTAJE`, and `ESPACIO` do not appear in `components/asteroids-game.tsx`, `lib/asteroids/`, or the player.
- [ ] `/about`, the Hall of Fame, and the catalog cards show no change in this spec, except the ASTEROIDS card from step 1.
- [ ] `CLAUDE.md` Architecture has one new paragraph about the asteroids engine, and the `AGENTS.md` block is unchanged.

## Decisions

- **Yes:** Rename the catalog entry `rocks` to `asteroids`. The URL and title match the game, and a second entry would duplicate the card.
- **Yes:** Run the real engine only for `asteroids`, inside the existing player. The other games keep the fake ticker until each one gets its own spec. This keeps SPEC 01's player shell and its CRT frame.
- **No:** A separate full-page route. It would duplicate the CRT frame and the PAUSE, END, and SAVE SCORE controls.
- **Yes:** Real score in the HUD, pause through the existing PAUSE button, and END through the existing game-over modal. The player keeps the same controls for every game.
- **Yes:** `P` and `Escape` also pause. The reference has no pause, so this is a new control.
- **No:** Space to restart from the canvas game-over state. The modal's PLAY AGAIN button is the single restart path.
- **Yes:** English for all in-game text, to match SPEC 02.
- **Yes:** Port the reference mechanics and numbers exactly.
- **Yes:** Triple-shot power-up in this spec, as part of the reference game.
- **Yes:** Keep the logic in pure TypeScript under `lib/asteroids/`. It type-checks under the project's strict mode, keeps React out of the physics, and makes the game testable later without a DOM.
- **No:** Copy `game.js` into `public/` and load it as a script. It skips the strict TypeScript setup and puts global state next to React.
- **Yes:** Keyboard only, with a note on touch devices. Touch controls get their own spec.
- **Yes:** `av_scores` written only, as in SPEC 01.
- **No:** UFOs. The reference game does not have them.
- **Yes:** The catalog copy (`short`, `long`) for ASTEROIDS is not changed in this spec.
- **Yes:** `dt` clamped to 0.05 seconds per frame, as in the reference.
- **Yes:** `Ship.thrusting` is set from the Up key each frame, so the renderer draws the thruster flame from state alone.
- **Yes:** One `onStats({ score, lives, level })` callback replaces the score-only callback. The player HUD reads everything from it.

## Identified risks

| Risk                                                                       | Mitigation                                                                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas and React state update every frame, which causes re-renders and lag | The engine state lives in a ref, not in React state. React state changes only when score, lives, level, or status change, through callbacks. |
| Arrow keys and Space scroll the page while the game is focused             | The input module calls `preventDefault` for the game keys while the game is mounted, and the page is not scrolled by them.                   |
| The game keeps running after the player leaves the route                   | The component cancels the animation frame and removes the key listeners on unmount. The acceptance criteria check the navigation path.       |
| SSR calls `window` or `document` during prerender of the player route      | The canvas component reads the DOM only inside `useEffect`. `npm run build` is an acceptance criterion.                                      |
| Real score and the existing fake ticker code paths diverge for other games | Step 7 keeps the other game ids on the existing code path. The acceptance criteria check `/games/fall/play`.                                 |
| `cacheComponents` prerenders the player with the game state                | The game state is created only on the client, inside the component, and never in a server component.                                         |
| Frame time jumps after a tab switch make asteroids skip through the ship   | `dt` is clamped to 0.05 seconds per frame, as in the reference.                                                                              |

## What is **not** in this spec

- Touch controls or on-screen buttons.
- UFOs or any enemy beyond the asteroids.
- Restart with Space from the canvas. PLAY AGAIN in the modal is the only restart.
- Best-score tracking, leaderboard changes, or Hall of Fame changes.
- Reading `av_scores` in any part of the game.
- Sound.
- Real engines for any game other than `asteroids`.
- Changes to the ASTEROIDS catalog copy (`short`, `long`) or the card layout.
- Server calls, Supabase writes, or any database.
- Tests or a test runner.
