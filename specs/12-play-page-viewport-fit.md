# SPEC 12 — Play page fits the laptop screen

> **Status:** Draft
> **Kind:** shared
> **Depends on:** SPEC 01 (player shell), SPEC 10 (phone layout)
> **Date:** 2026-11-28
> **Objective:** On desktop, the play page (HUD, CRT frame, game board, SKIN row and bottom bar) fits inside the browser window without scrolling, for every real game, by capping the player width from the viewport height. Phones are not changed here.

## Why this spec exists

The play page is 4:3 and sized from its width. On a laptop (about 700px of usable height) the bottom of the CRT, and on some games the SKIN row, runs below the window. Every real game does this. Frogger shows it most, because its board is 8:7 and tall.

Nothing in SPEC 01 or SPEC 10 sets a height limit for the desktop player. This spec adds one.

## Scope

**In:**

- A desktop height cap on the player width in `app/arcade.css` (`.av-player`).
- The pass rule below, used by the automatic layout check in `/spec-impl-game`.

**Out:**

- Phone sizing (SPEC 13, later).
- Changes to any game's canvas size, engine or registry entry.
- The Home, Library and Hall of Fame pages.

## Pass rule (measured by the layout check)

Viewports: 1366x768, 1440x900, 1920x1080 (fine pointer, desktop).

For every id in `REAL_GAMES` at each viewport, on `/games/<id>/play`:

1. The bottom edge of `.crt` is at or above the viewport height.
2. The game canvas is fully visible (its bounding box is inside the viewport).
3. The page has no horizontal scroll (`scrollWidth <= clientWidth`).

## Approach

Cap the width of `.av-player` from the viewport height. The vertical chrome around the screen (nav, HUD, gaps, CRT padding, bottom row) is a fixed amount, called `--play-chrome` (start value 300px, adjust in implementation until rule 1 passes at 1366x768).

```css
.av-player {
  max-width: min(1100px, max(480px, calc((100dvh - var(--play-chrome)) * 4 / 3 + 96px)));
}
```

The `96px` is the horizontal padding of `.av-player` (24px each side) plus `.crt` (24px each side). The `480px` floor keeps very short windows usable.

Phone rules (`(pointer: coarse)`, `max-width: 620px`) are not changed.

## Implementation plan

1. Measure the current chrome height in a browser at 1366x768 and set `--play-chrome` so rule 1 passes.
2. Add the `max-width` cap to `.av-player` in `app/arcade.css`, outside the `(pointer: coarse)` blocks.
3. Run the layout check (all games, all viewports). Fix any failure that the cap alone does not cover, and record it here.

## Acceptance criteria

- [ ] Frogger at 1366x768: HUD, board and SKIN row visible without scrolling.
- [ ] Asteroids, Tetris, Arkanoid and Snake pass the pass rule at 1366x768, 1440x900 and 1920x1080.
- [ ] Frogger passes the pass rule at 1440x900 and 1920x1080.
- [ ] Desktop at 1920x1080 looks the same as before (the cap is inactive when the window is tall enough).
- [ ] Phone layout (390x844, touch) is unchanged.

## Decisions

- **Yes: cap the player width from viewport height** — keeps the 4:3 CRT look and needs one CSS rule. Reason: it fixes every game at once without touching game code.
- **No: change the canvas sizes** — each game's logical size stays as it is. Reason: the games' engines and layouts depend on those sizes.
