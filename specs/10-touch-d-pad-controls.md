# SPEC 10 — Touch D-pad for the four real games on phones

> **Status:** Approved
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
- Each game's D-pad sends the same inputs as its keyboard controls (see the mapping below). The engines do not change.
- The player page (`components/game-player.tsx`) shows the D-pad on coarse pointers for the four real games, in place of the keyboard note. Each real game component receives the touch state as a `touch` prop.
- Phone layout: the D-pad sits outside `.crt-screen` so the canvas keeps the full screen height.
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
- Changing the engines, the keyboard trackers, the scoring, or the catalog.
- Tests. The repo has no test runner (see `CLAUDE.md`). Checks are manual, on a phone and in the browser.

## Data model

No new data. No new tables, columns, routes, `localStorage` keys or cookies.

Client-only types, in `lib/touch/controls.ts`:

```ts
// lib/touch/controls.ts
export type TouchKey = 'up' | 'down' | 'left' | 'right' | 'action';

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
4. **Merge input.** Each real game takes the `touch` prop from step 3 and merges it with its keyboard read every frame. For held inputs, a direction is on if the key or the touch button is held. For Tetris one-shots, `takePress` from touch and the keyboard's press both count. For Snake, a touch press is queued as a turn the same way a keyboard press is. The engine receives the same input types as before.
5. **Clear on pause and blur.** When the game is paused, or the window loses focus, call `clear()` on the touch state so no button stays stuck.
6. **Canvas fit.** Make the canvas scale to the container width with its aspect ratio kept, in portrait and landscape, using CSS `max-width: 100%` and `height: auto`. The canvas keeps its internal pixel size. Verify on a phone in both orientations.
7. **Docs.** Update `CLAUDE.md` Architecture: add one paragraph for `lib/touch/` and `components/touch-dpad.tsx`, and say that real games show the D-pad on coarse pointers in place of the keyboard note. Do not touch the `AGENTS.md` block. Do not edit SPEC 05, 07, 08 or 09.

## Acceptance criteria

- [ ] On a phone (coarse pointer), opening `/games/asteroids/play` shows the D-pad and a FIRE button below the game screen without any extra tap.
- [ ] On a phone, opening `/games/tetris/play` shows the D-pad and a DROP button. Its up button rotates once per press.
- [ ] On a phone, opening `/games/arkanoid/play` shows left and right buttons and no action button. Holding left moves the paddle left until released.
- [ ] On a phone, opening `/games/snake/play` shows the four direction buttons. Each press turns the snake, and a reversal into the neck is ignored.
- [ ] Holding a direction button in Asteroids rotates the ship. Holding up thrusts. Holding FIRE fires, as the Space key does.
- [ ] Tapping the HUD `PAUSE` button pauses the game on a phone. Tapping it again (now `RESUME`) resumes. The D-pad releases any held button when paused.
- [ ] While a D-pad button is held, the page does not scroll or zoom.
- [ ] On a phone in portrait and in landscape, the canvas fits the screen width and no part of the canvas is cut off.
- [ ] On a laptop with a mouse (fine pointer), no D-pad appears on any real game. The keyboard note is unchanged for the games that show it on fine pointers.
- [ ] On a touch laptop that reports a fine pointer, no D-pad appears and the game plays as it does today.
- [ ] On the six placeholder games, the player page is unchanged.
- [ ] Keyboard controls still work on desktop for all four games.
- [ ] `npx tsc --noEmit` passes with no errors.
- [ ] `npm run lint` passes with no errors.
- [ ] `npm run build` passes.

## Decisions taken and discarded

- **D-pad only on coarse pointers.** Yes. The user asked for phones only and for touch laptops to stay as they are. `(pointer: coarse)` matches phones and tablets and does not match touch laptops, which report a fine pointer. Discarded: `navigator.maxTouchPoints > 0`, because it would show the D-pad on touch laptops.
- **D-pad appears when the game page opens.** Yes, as the user asked. It does not wait for the first tap.
- **Action button only where a game needs one.** Yes. Asteroids needs fire and Tetris needs hard drop to play. Arkanoid and Snake need nothing more than the D-pad. Discarded: one action button on every game, because it would do nothing on Arkanoid and Snake.
- **No separate pause button; the HUD `PAUSE` button is the touch pause.** The user first asked for a pause button beside the D-pad. The HUD already has `PAUSE`, which works with touch, so a second one would duplicate it. The user confirmed the HUD button and asked for the label to read `PAUSE`.
- **Canvas scales to fit in portrait.** Yes, as the user chose. Discarded: a rotate-your-phone prompt.
- **Screen size is not changed here.** The phone screen is still the 4:3 CRT frame. A bigger screen needs its own spec.
- **Styling is ours.** The user said the draft could be styled better. The D-pad uses the arcade palette and pixel font in `app/arcade.css`, not a copy of the draft's look.
- **Position: below the CRT frame.** Under the game screen, as the user chose. The first Step 3 put the D-pad inside `.crt-screen`, where it took all the space and the canvas shrank to zero height. Moving it outside the screen fixes that.