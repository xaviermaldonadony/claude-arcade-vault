---
name: asteroids-performance
description: Asteroids (id asteroids) perf check: all 3 skins pass the rAF pass rule; neo glow shadowBlur costs ~0.9 ms per full frame; no code change made
metadata:
  type: project
---

Asteroids passed SPEC 12 pass rule on every skin (classic, neo, retro) at 1440x900, production build. No code change made.

**Measured (worst of 3 runs, 10 s each, keys every 300 ms):**

- classic (default): 59.98 fps, 0.00% frames >33ms, max gap 17.8 ms
- neo: 59.98 fps, 0.00%, max gap 17.7 ms
- retro: 59.98 fps, 0.00%, max gap 17.8 ms

**Microbenchmark (full scene: 14 asteroids, 12 bullets, 80 particles, 2 power-ups, ship thrusting, 800x600 canvas, getImageData flush, min of 3 rounds of 400 frames):**

- classic 0.34 ms/frame, neo 0.86 ms/frame, retro 0.29 ms/frame. All well under the 16.7 ms budget.
- Neo's `shadowBlur` (10 px) is about 5% of the budget. Not a major cost, so no sprite replacement.

**Costs found:** none major. Minor per-frame string and object allocations (particle rgba string, HUD template strings). Not measured as costs; left alone.

**Loop stop:** on client navigation from play to the game detail page (EXIT link), rAF calls dropped from 60/s to 0 over 2 s.

**Notes:**

- The Playwright browser is shared with other agents. A navigation from another agent moved my tab once during the run. Re-navigate and re-check after any unexpected URL.
- Building in the repo while other agents run `next start` on the same `.next` would break their servers. Build in an APFS clone of the repo (`cp -cR` for node_modules; a symlinked node_modules fails Turbopack with a misleading "concurrent install" error).

**How to apply:** if Asteroids regresses, re-run the rAF check first, then the microbenchmark. The glow path (`setGlow` in `lib/asteroids/render.ts`) is the first suspect.
