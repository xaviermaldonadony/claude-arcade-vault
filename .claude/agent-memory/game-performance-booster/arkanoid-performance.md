---
name: arkanoid-performance
description: Arkanoid (id arkanoid) play page perf run: neo skin shadowBlur cost fixed with cached glow halos in lib/arkanoid/render.ts; microbench disagrees with in-game numbers in this environment
metadata:
  type: project
---

Arkanoid play page, 1440x900, headless Chromium, production build. Skins: classic (default), neo (glow 12), retro (tinted sheet, no glow).

**Before (worst of 3 runs, 10 s each):** classic 59.9 fps / 0.17% over 33ms; neo 40.8 fps / 46.9% over 33ms (fail); retro 59.9 fps / 0.17% (pass). Microbench ms per frame: classic 0.5, neo 3.5-4.3 (shadowBlur path), retro about 27.

**Cost found:** neo `shadowBlur` on each of about 62 draws per frame (60 bricks, paddle, ball). Proven by a run with the shadowBlur setter forced to 0: neo went to 60 fps with 0% over 33ms.

**Fix:** `glowHalo()` in `lib/arkanoid/render.ts` caches one shadow-only canvas per (source, sprite rect, size, glow, colour). The sprite is drawn off the halo by a 4096 px shadow offset, the halo is drawn at (x - glow, y - glow), then the sprite is drawn directly on top. Pixel check against the old shadowBlur draw: max channel diff 8/255, mean about 0.005. Classic and retro take the unchanged flat path.

**After (worst of 3):** classic 60 / 0%, neo 60 / 0% (max gap 16.8 ms), retro 59.9 / 0.17%. Console errors: none.

**Microbench caveat:** the per-frame `getImageData` flush puts the microbench canvas off the accelerated path. Its neo number rose to 14-17 ms after the fix, while in-game went 44 to 60 fps. Retro microbench stays about 27 ms with identical in-game results. Trust the in-game rAF numbers for the pass rule and report the microbench as a caveat.

**Environment:** the MCP Playwright browser is shared with other agents, and they navigated it mid-run. Measure with an isolated Chromium (launch with `executablePath` to the cached chromium-1254 binary, and a Playwright package from the npx cache) instead. The next-start server on a port can die mid-session, so check it before each run.

**Why:** neo is the only Arkanoid skin with glow, and the same pattern (shadowBlur per entity) is in the other glow skins to check.

**How to apply:** for any game with `shadowBlur` per entity, measure with the shadow setter disabled first. If that restores 60 fps, a cached halo per colour and size is the fix. Check the look with a pixel diff against the old draw, not only by eye.
