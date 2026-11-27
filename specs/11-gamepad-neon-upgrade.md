# SPEC 11 — Neon gamepad look for the phone touch controls

> **Status:** Approved
> **Depends on:** SPEC 10
> **Date:** 2026-11-27
> **Objective:** Restyle the phone touch controls (D-pad, round B and A buttons) to the Gamepad MK-II neon design in `references/game-pad-assets/`, without changing how they feed the games.

## Why this spec exists

SPEC 10 shipped working phone controls with a plain dark style. The user added the Gamepad MK-II reference (`gamepad.html`, `gamepad-neon.png`) and wants the phone controls to look like it. Only the look changes. The wiring stays: the `TouchControls` state, the per-game `LAYOUT`, the pointer handlers, the enabled and disabled keys, the `(pointer: coarse)` gate, and the bottom bar.

## Scope

**In:**

- A neon shell panel around the D-pad and the A and B buttons. It has a rounded border, a faint dot texture, and a cyan glow. It takes the look of the reference's `.gp` panel.
- D-pad keys as raised dark keys with inline SVG triangle arrows (the reference's arrow paths). A pressed key glows cyan and moves down 3px.
- A center hub with a pulsing cyan gem, drawn between the four direction keys.
- Round B (cyan) and A (magenta) buttons with a radial gloss, a colored glow, and a dashed ring that shows on press.
- The reference's pulse animation on the hub gem and its press ring. Both are turned off under `prefers-reduced-motion`.
- Sizes taken from the reference: 50px direction keys, 156px D-pad, 74px round buttons, 22px gap. Below 620px wide, the reference's mobile step: 46px keys, 144px D-pad, 64px round buttons, 16px gap.
- Disabled keys keep the SPEC 10 behavior: dimmed, `disabled`, and inert. The new look shows them dimmed too.
- The palette maps onto the existing variables in `app/arcade.css`. The reference's `--cyan` and `--magenta` values are reused as they are.
- One updated paragraph for the phone controls in `CLAUDE.md` Architecture.

**Out of scope (for future specs or not planned):**

- Showing the pad on desktop, touch laptops, or any fine pointer. The `(pointer: coarse)` gate from SPEC 10 stays.
- Porting the reference's keyboard script (WASD, arrows, Z/J/X/K). The game keyboard controls already exist.
- Porting the reference's `.on` class script. Pointer capture plus `:active` already gives the pressed state.
- Restyling the bottom bar (PAUSE, SKIN, EXIT). It stays as it is.
- Any change to `lib/touch/`, `lib/games-registry.ts`, `components/game-player.tsx`, the game components, or the engines.
- The reference's standalone page: its `lang="es"`, its `<title>`, and its `.page` background.
- New fonts. `Press Start 2P` is already loaded as `--font-pixel`.
- Changing the labels. They stay English (SPEC 10).
- Tests. The repo has no test runner (see `CLAUDE.md`). Checks are manual and by build.

## Data model

No new data. No new tables, columns, routes, `localStorage` keys, cookies, or client types. `TouchKey`, `TouchControls`, and `LAYOUT` are unchanged.

## Implementation plan

1. **Markup.** Edit `components/touch-dpad.tsx`. Wrap the existing `touch-controls` content in a shell `div` with the neon panel class. Replace the `▲ ▼ ◀ ▶` text glyphs with inline SVG arrows using the reference's paths. Add a `div` hub with a gem `span` in the center of the D-pad grid. In each round button, add a `span` ring and a `span` letter. Keep `LAYOUT`, `bind()`, `disabled`, `is-off`, `aria-label`s, and `DIR_ORDER` unchanged. The step leaves the app working. Verify with `npx tsc --noEmit`.
2. **Styles.** Edit `app/arcade.css`. Replace the block that starts with `/* ===== Phone controls (SPEC 10)` and runs down to the `.touch-*` disabled rules, the rules that cover the D-pad and the round buttons. Keep the existing class names as the selectors: `.touch-controls`, `.touch-dpad-pad`, `.touch-dir`, `.touch-up`, `.touch-down`, `.touch-left`, `.touch-right`, `.touch-ab`, `.touch-round`, `.touch-a`, `.touch-b`, `.is-off`, `.is-held`. The new rules are the reference's values, mapped onto those names. Add the `pulse-led` keyframes. Keep `touch-action: none`, `user-select: none`, and `-webkit-tap-highlight-color: transparent` on the interactive elements. Add the mobile step under `@media (max-width: 620px)`. Leave the `.touch-bar*` rules and the `body.av-play-touch` rules unchanged. Do not change `--touch-key` or `--touch-round` if other rules still read them. Check that they are no longer used, then remove them.
3. **Reduced motion.** In the existing `prefers-reduced-motion` block at the end of `app/arcade.css`, add a rule that stops the hub gem and the press ring from animating. This is a small addition beyond the reference, made to follow the repo's existing convention.
4. **Verify the build.** Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
5. **Docs.** Update the phone controls paragraph in `CLAUDE.md` Architecture to describe the neon look and the sizes. Do not touch the `AGENTS.md` block. Do not edit SPEC 05, 07, 08, 09, or 10.

## Acceptance criteria

- [ ] On a phone (coarse pointer), each of the four real games shows the neon shell panel around the D-pad and the A and B buttons.
- [ ] The four direction keys show SVG triangle arrows. The center hub shows a pulsing cyan gem.
- [ ] Round B is cyan and round A is magenta. Each has a gloss and a glow. The dashed ring shows while the button is pressed.
- [ ] A pressed direction key or round button glows and moves down. The glow turns off on release.
- [ ] Disabled keys are dimmed and do nothing: Asteroids down; Tetris none; Arkanoid up, down, A, and B; Snake B.
- [ ] Each key still drives its game as in SPEC 10. Asteroids: hold left and right to rotate, hold up to thrust, hold A to fire, B thrusts. Tetris: up rotates once per press, A rotates, B drops, down soft drops. Arkanoid: hold left and right to move the paddle. Snake: each direction press turns, and a reversal into the neck is ignored, and holding A boosts.
- [ ] Holding a button does not scroll or zoom the page.
- [ ] The bottom bar still shows PAUSE, SKIN, and EXIT, unchanged. PAUSE still releases any held button.
- [ ] At 360px wide, the shell does not overflow horizontally (no horizontal scrollbar on the play page).
- [ ] On a 360x640 and a 390x844 phone viewport, the D-pad, the round buttons, and the bottom bar are all visible without clipping. Any scrolling needed must be checked and recorded in the spec's risks section.
- [ ] With `prefers-reduced-motion: reduce`, the hub gem and the press ring do not animate.
- [ ] On a laptop with a mouse (fine pointer), no touch controls appear on any real game page.
- [ ] `git diff` shows no changes under `lib/`, to `components/game-player.tsx`, or to the game components.
- [ ] `npx tsc --noEmit` passes with no errors.
- [ ] `npm run lint` passes with no errors.
- [ ] `npm run build` passes.

## Decisions taken and discarded

- **Shell panel around the controls: yes.** The user chose the full look, so the D-pad and the A and B buttons sit in the reference's neon panel. The bottom bar stays outside the panel. Discarded: restyling the buttons only, with no panel.
- **Reference sizes instead of SPEC 10 sizes: yes.** The user chose the reference sizes. This replaces the `--touch-key` and `--touch-round` tuning from SPEC 10. Discarded: keeping the SPEC 10 sizes with only the new look. The cost is a taller and wider control area (see the risks).
- **Keep the pulse and the press ring.** The user chose the reference's motion. The reduced-motion override is added to follow the repo's convention. Discarded: dropping the pulse.
- **Phones only.** The user chose to keep the `(pointer: coarse)` gate, so no pad appears on desktop or touch laptops. Discarded: showing the pad on desktop, which would reopen SPEC 10's scope and needs its own key-mapping decisions.
- **Keep the existing class names.** The CSS keeps `.touch-*` names, so `components/touch-dpad.tsx` changes only its markup and the wiring in `game-player.tsx` stays the same. Discarded: renaming to the reference's `.dp`, `.ab`, and `.gp` names, which would widen the diff for no gain.
- **Pressed state from `:active` and pointer capture.** The reference uses a JS `.on` class. Pointer capture in the component already keeps `:active` on while the finger is down. Discarded: porting the reference's script, which is not needed.
- **Keyboard script not ported.** The game keyboard controls already exist in the game components. Discarded: the reference's WASD and Z/J/X/K handler, which would add a second keyboard path.

## Identified risks

- **Height.** The reference sizes make the control shell about 205px tall, against about 140px now. SPEC 10 tuned the sizes smaller and compacted the HUD so the controls fit on one screen. On a short phone the D-pad, the round buttons, and the bottom bar may no longer fit without scrolling. Mitigation: check on 360x640 and 390x844. If it does not fit, fall back to the SPEC 10 sizes by changing the size variables. That is a small edit, but it is a decision for the user.
- **Width.** The mobile step totals about 342px. That is tight on 360px screens, so it is checked in the acceptance criteria.
- **Continuous animation.** The hub pulse runs the whole time a game page is open. This costs battery on phones. Reduced motion turns it off.
- **Press state depends on `:active`.** `is-held` is not set by the component, so only `:active` drives the press glow. This matches SPEC 10, where held keys still work through the touch state, but the glow follows the finger, not the touch state.
