# SPEC 10 — Touch D-pad for the four real games on phones

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-11-24
> **Objective:** Show an on-screen D-pad, plus one action button where a game needs it, on phones when a real game opens, so Asteroids, Tetris, Arkanoid and Snake can be played by touch.

## Why this spec exists

SPEC 05, 07, 08 and 09 each show `THIS GAME NEEDS A KEYBOARD` on coarse pointers and list touch controls as out of scope. The user now wants phones to play. This spec reverses that note for the four real games on phones only. Laptops, including touch laptops that report a fine pointer, keep today's behavior. Specs 05, 07, 08 and 09 are not edited.

## Scope

**In:**

- A simple D-pad with four buttons: up, down, left, right. It is drawn below the CRT frame, under the game screen, not inside it.
- One action button per game that needs one, shown beside the D-pad:
  - Asteroids: `FIRE` (sends Space).
  - Tetris: `DROP` (sends Space, hard drop).
  - Arkanoid and Snake: no action button.
- The D-pad and action button appear when a real game page opens, and only when the browser reports a coarse pointer (`(pointer: coarse)`, a finger-driven screen).
- Each game's D-pad sends the same inputs as its keyboard controls (see the mapping below). The engines do not change, except one optional field: Arkanoid's `paddleSpeed`, so the D-pad moves the paddle faster (see Decisions).
- The player page (`components/game-player.tsx`) shows the D-pad on coarse pointers for the four real games, in place of the keyboard note. Each real game component receives the touch state as a `touch` prop.
- Phone layout: the D-pad sits outside `.crt-screen` so the canvas keeps the full screen height.
- Round B and A buttons to the right of the D-pad (redesign, see steps 8 to 12). B is blue and A is red. Unused keys are drawn dimmed and disabled.
- A bottom bar under the controls with PAUSE (RESUME while paused), the SKIN select and EXIT. On phones the SKIN select moves from the game screen into this bar.
- On phones, the navbar, its mobile menu and the footer line are hidden on game play pages only. Other pages keep them.
- A/B actions: Asteroids A = FIRE, B = THRUST (up also thrusts). Tetris A = ROTATE (up also rotates), B = DROP. Snake A = BOOST (held, doubles the step rate). Arkanoid A and B are dimmed.
- Visual style: a dark, pixel-style D-pad and buttons that match the existing arcade palette in `app/arcade.css`. The user asked for a rough draft to be styled better.
- Touch buttons use pointer events, release on pointer up or cancel, and do not scroll or zoom the page while held.
- The canvas scales to the screen width in portrait and landscape. The existing HUD `PAUSE` button is the touch pause.
- One short paragraph in `CLAUDE.md` Architecture.

**Out of scope (for future specs):**

- Swipe, drag or tap gestures on the canvas.
- A second, separate pause button. The HUD `PAUSE` button already works with touch.
- A rotate-your-phone prompt. The canvas scales to fit instead.
- Resizing the phone game screen or the CRT frame. Needs its own spec.
- Touch on the six placeholder games. Their player pages keep the fake ticker and their current note.
- Touch laptops and any device with a fine pointer. Their behavior is unchanged.
- Haptic feedback and sound changes.
- Changing the engines beyond the optional Arkanoid `paddleSpeed` field, the keyboard trackers, the scoring, or the catalog.
- Tests. The repo has no test runner (see `CLAUDE.md`). Checks are manual, on a phone and in the browser.

## Data model

No new data. No new tables, columns, routes, `localStorage` keys or cookies.

Client-only types, in `lib/touch/controls.ts`:

```ts
// lib/touch/controls.ts
export type TouchKey = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

export type TouchControls = {
  // Keys held down right now (pointer is still on the button).
  held(): ReadonlySet<TouchKey>;
  // True once per press since the last call. Used for discrete actions (Tetris rotate and drop).
  takePress(key: TouchKey): boolean;
  press(key: TouchKey): void;
  release(key: TouchKey): void;
  clear(): void; // releases everything, called on pause and on blur
};
```

Key mapping, per game. The D-pad sends the same inputs as the keyboard does for that game:

| Button | Asteroids                   | Tetris                              | Arkanoid                  | Snake       |
| ------ | --------------------------- | ----------------------------------- | ------------------------- | ----------- |
| up     | thrust (`ArrowUp`)          | rotate (`ArrowUp`, one-shot)        | none                      | steer up    |
| down   | none                        | soft drop (`ArrowDown`)             | none                      | steer down  |
| left   | rotate left (`ArrowLeft`)   | move left (`ArrowLeft`, one-shot)   | move left (`ArrowLeft`)   | steer left  |
| right  | rotate right (`ArrowRight`) | move right (`ArrowRight`, one-shot) | move right (`ArrowRight`) | steer right |
| action | fire (`Space`)              | hard drop (`Space`, one-shot)       | none                      | none        |

Rules:

- Asteroids and Arkanoid use held state. Tetris `left`, `right`, `up` and `action` are one-shot presses. Tetris `down` is held, and the engine repeats it as its keyboard tracker does: one step per press event, then one per repeat interval.
- Snake: a direction press is a turn request. The component passes at most one turn per frame, as the keyboard does.
- Buttons are inactive, with a dimmed style, where the table says `none`. They are not drawn at all for Arkanoid's up and down.

## Implementation plan

1. **Touch state.** Create `lib/touch/controls.ts` exporting `createTouchControls()` with the type above. It holds a `Set` of held keys and a `Set` of pending one-shot presses. It has no DOM, React, or Next imports, so it can be unit-checked later. Verify with `npx tsc --noEmit`.
2. **D-pad component.** Create `components/touch-dpad.tsx` (client). Props: `controls: TouchControls`, `game: 'asteroids' | 'tetris' | 'arkanoid' | 'snake'`. It renders a 3x3 grid with the four direction buttons and the action button at the right, sized for thumbs: direction keys `clamp(34px, 8.5vw, 38px)`, action button `clamp(46px, 12.5vw, 50px)`. Keys are below the 44 px touch guideline on purpose, at the user's request for a smaller pad. Each button calls `press` on `pointerdown` and `release` on `pointerup`, `pointercancel`, and `pointerleave`. It calls `setPointerCapture` and `preventDefault` so the page does not scroll. It is inside a `<div>` with `touch-action: none`. Styles go in `app/arcade.css`, reusing the existing palette variables. Verify with `npx tsc --noEmit`.
3. **Coarse-pointer gate and placement.** Create `lib/touch/coarse.ts` with `subscribeCoarse`, `readCoarse` and `serverCoarse`, moved from the four game components, which no longer need them. In `components/game-player.tsx`, read `isCoarse` with `useSyncExternalStore`, create the touch state with `useState(createTouchControls)`, pass it to the real game as `touch`, and render `<TouchDpad>` below the `.crt` frame when the game is a real game and `isCoarse` is true. The D-pad is outside `.crt-screen`, so the canvas keeps the screen. Remove the keyboard note from the four game components. Keep the check after mount so hydration matches. Verify with `npx tsc --noEmit`.
4. **Merge input.** Each real game takes the `touch` prop from step 3 and merges it with its keyboard read every frame. For held inputs, a direction is on if the key or the touch button is held. For Tetris one-shots, `takePress` from touch and the keyboard's press both count. For Snake, a touch press is queued as a turn the same way a keyboard press is. The engines receive the same input types as before, plus Arkanoid's optional `paddleSpeed`, which the component sets to `TOUCH_PADDLE_SPEED` (720 px/s) while a D-pad left or right is held. The keyboard speed stays at `PADDLE_SPEED` (400 px/s).
5. **Clear on pause and blur.** In `components/game-player.tsx`, call `clear()` on the touch state when `paused` becomes true, and when the window fires `blur`, so no button stays stuck. Pause from the HUD and pause from the keyboard both go through `paused`.
6. **Canvas fit.** Make the canvas scale to the container width with its aspect ratio kept, in portrait and landscape, using CSS `max-width: 100%` and `height: auto`. The canvas keeps its internal pixel size. Verify on a phone in both orientations.
7. **Docs.** Update `CLAUDE.md` Architecture: add one paragraph for `lib/touch/` and `components/touch-dpad.tsx`, and say that real games show the D-pad on coarse pointers in place of the keyboard note. Do not touch the `AGENTS.md` block. Do not edit SPEC 05, 07, 08 or 09.

8. **Round A and B buttons.** Change `TouchKey` in `lib/touch/controls.ts` to `'up' | 'down' | 'left' | 'right' | 'a' | 'b'`. In `components/touch-dpad.tsx`, always draw the four direction keys and the round B and A buttons. `LAYOUT` lists the enabled keys per game. Disabled keys get `disabled` and the `is-off` class. Verify with `npx tsc --noEmit`.
9. **Game input.** Asteroids: `fire` also reads `a`, and `thrust` also reads `b`. Tetris: `rotate` also reads `a`, and `hardDrop` reads `b` (was `action`). Snake: the engine gets `boost: held('a')`. Add `SnakeInput.boost?: boolean` and `BOOST_MULT = 2` in `lib/snake/`. While boost is set, the time added per frame is multiplied by `BOOST_MULT`. Unset behaves as before. Verify with a node script that compiles `lib/snake/engine.ts` to `/tmp` and shows more steps with boost.
10. **Bottom bar and SKIN slot.** Create `components/touch-bar.tsx` with PAUSE or RESUME, an empty `div` slot for the SKIN select, and an EXIT link to `/games/<id>`. `components/game-player.tsx` renders it under the D-pad on coarse pointers for real games, and passes `skinSlot` to each game through `lib/games-registry.ts`. Each game renders its SKIN select with `createPortal` into the slot when it is set, and inline otherwise.
11. **Hide navbar and footer.** `components/game-player.tsx` toggles the `av-play-touch` class on `document.body` while a real game page is open on a coarse pointer. `app/arcade.css` hides `.av-nav`, the mobile panel, the backdrop and `.av-footer` under that class. `app/layout.tsx` gives the footer the `av-footer` class.
12. **Styles and docs.** Replace the D-pad styles in `app/arcade.css` with the round-button and bottom-bar styles, using `--touch-key` and `--touch-round` variables. Update the `CLAUDE.md` Architecture paragraph for the touch bar, A and B, and the skin slot. Do not touch the `AGENTS.md` block.

## Acceptance criteria

- [x] On a phone (coarse pointer), opening `/games/asteroids/play` shows the D-pad and a FIRE button below the game screen without any extra tap.
- [x] On a phone, opening `/games/tetris/play` shows the D-pad and a DROP button. Its up button rotates once per press.
- [x] On a phone, opening `/games/arkanoid/play` shows left and right buttons and no action button. Holding left moves the paddle left until released.
- [x] On a phone, opening `/games/snake/play` shows the four direction buttons. Each press turns the snake, and a reversal into the neck is ignored.
- [x] Holding a direction button in Asteroids rotates the ship. Holding up thrusts. Holding FIRE fires, as the Space key does.
- [x] Tapping the HUD `PAUSE` button pauses the game on a phone. Tapping it again (now `RESUME`) resumes. The D-pad releases any held button when paused.
- [x] While a D-pad button is held, the page does not scroll or zoom.
- [x] On a phone in portrait and in landscape, the canvas fits the screen width and no part of the canvas is cut off.
- [x] On a laptop with a mouse (fine pointer), no D-pad appears on any real game. The keyboard note is unchanged for the games that show it on fine pointers.
- [x] On a touch laptop that reports a fine pointer, no D-pad appears and the game plays as it does today.
- [x] On the six placeholder games, the player page is unchanged.
- [x] Keyboard controls still work on desktop for all four games.
- [x] `npx tsc --noEmit` passes with no errors.
- [x] `npm run lint` passes with no errors.
- [x] `npm run build` passes.

- [x] On a phone, the play page shows the D-pad, round B and A, and the bottom bar (PAUSE, SKIN, EXIT).
- [x] On a phone, the SKIN select appears only in the bottom bar. Changing it changes the skin and the arrow keys still work afterwards.
- [x] On a phone, PAUSE changes to RESUME while paused, and the D-pad releases any held button.
- [x] On a phone, the navbar, its menu and the footer are not shown on a game play page. They are still shown on `/games` and the other pages.
- [x] On a phone, Asteroids A fires and B thrusts. Tetris A rotates and B drops. Snake A boosts. Arkanoid A and B are dimmed and do nothing.
- [x] On a desktop, the navbar and footer show on a game play page, there is no bottom bar, and the SKIN select is still inside the game screen.
- [x] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

- **D-pad only on coarse pointers.** Yes. The user asked for phones only and for touch laptops to stay as they are. `(pointer: coarse)` matches phones and tablets and does not match touch laptops, which report a fine pointer. Discarded: `navigator.maxTouchPoints > 0`, because it would show the D-pad on touch laptops.
- **D-pad appears when the game page opens.** Yes, as the user asked. It does not wait for the first tap.
- **Action button only where a game needs one.** Yes. Asteroids needs fire and Tetris needs hard drop to play. Arkanoid and Snake need nothing more than the D-pad. Discarded: one action button on every game, because it would do nothing on Arkanoid and Snake.
- **No separate pause button; the HUD `PAUSE` button is the touch pause.** The user first asked for a pause button beside the D-pad. The HUD already has `PAUSE`, which works with touch, so a second one would duplicate it. The user confirmed the HUD button and asked for the label to read `PAUSE`.
- **Canvas scales to fit in portrait.** Yes, as the user chose. Discarded: a rotate-your-phone prompt.
- **Screen size is not changed here.** The phone screen is still the 4:3 CRT frame. A bigger screen needs its own spec. Exception: Frogger's board is 8:7 and its phone frame uses 8:7 (see the Frogger note below).
- **Frogger phone board sizing (after the first pass).** On iOS Safari the Frogger canvas could keep its 640px intrinsic width and overflow the CRT frame. Fix: on coarse portrait, `.frogger-board` takes `width: 100%` and `height: auto` (`app/arcade.css`), so width sets the size and the 8:7 ratio sets the height. Checked in Chromium mobile emulation at 375, 390 and 430 px wide and confirmed by the user on an iPhone. Frogger's own spec should carry this as an acceptance criterion once it is written.
- **Faster Arkanoid paddle on the D-pad.** The user found the keyboard speed too slow to react with touch. The engine takes an optional `paddleSpeed` (720 px/s for touch) and the keyboard keeps 400 px/s. Discarded: changing `PADDLE_SPEED`, which would also change the keyboard game.
- **Styling is ours.** The user said the draft could be styled better. The D-pad uses the arcade palette and pixel font in `app/arcade.css`, not a copy of the draft's look.
- **Position: below the CRT frame.** Under the game screen, as the user chose. The first Step 3 put the D-pad inside `.crt-screen`, where it took all the space and the canvas shrank to zero height. Moving it outside the screen fixes that.

## Identified risks

- **Top HUD duplicates the bar.** On phones the top HUD keeps PAUSE and END, and the bottom bar adds PAUSE and EXIT. The user chose to keep the HUD.
- **English, not Spanish.** The mockup showed Spanish labels, but the user asked for all text in English. The repo has no translation system, so every label is English.
- **A/B mapping is my choice.** The user delegated it. Asteroids, Tetris and Snake use A and B. Arkanoid uses neither.
- **Button sizes unchanged.** The mockup draws larger keys. The user tuned the keys smaller in earlier rounds, so they are set by `--touch-key` (40 to 44 px on phones, after the user asked for a bit more size). The play page HUD is compacted on phones so the controls fit on one screen.
- **Navbar hidden on phone play pages.** The user asked for this. The only way back is EXIT in the bottom bar.
