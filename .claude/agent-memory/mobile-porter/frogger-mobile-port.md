---
name: frogger-mobile-port
description: Frogger (id frogger) phone port: D-pad up/down/left/right one-shot hops, A/B off, SKIN in bottom bar, portrait CRT aspect override in app/arcade.css
metadata:
  type: project
---

Frogger (`frogger`) is ported to phones. Its D-pad layout row (`LAYOUT.frogger` in `components/touch-dpad.tsx`) enables up, down, left, right and disables A and B.

**Why:** Frogger is a hop game, so each D-pad press queues one hop through `takePress`, the same one-shot model as Tetris left and right. Keyboard keydown does the same per press. Not held-repeat.

**How to apply:**

- Frogger's canvas is 640 x 560 (8:7). The 4:3 `.crt-screen` frame made the phone board small (238 px wide). A coarse + portrait rule in `app/arcade.css` sets `.crt-screen:has(canvas[aria-label='Frogger game board'])` to `aspect-ratio: 8 / 7`. Result on a 390 x 844 phone: canvas 283 x 247. Landscape is left unchanged on purpose (the CRT already overflows a 390 px tall viewport there, the same for all games).
- Verify with a Playwright probe: launch the bundled Chromium with `executablePath`. The npx-cached playwright package works when required by absolute path.
- Open question for next time: keyboard auto-repeat hops while a key is held, but a D-pad press hops once. Decide if held repeat is wanted.
- Also check the `.playwright-screenshots/frogger-*.png` set when changing the layout.
