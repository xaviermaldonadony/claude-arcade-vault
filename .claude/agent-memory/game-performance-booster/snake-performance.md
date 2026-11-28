---
name: snake-performance
description: Snake play page perf run (SPEC 12). Classic/neo/retro all pass rAF rule; neo per-segment shadowBlur fixed with glow sprites; retro fruit tint cached. Numbers and file changes.
metadata:
  type: project
---

Snake (`snake` slug) on /games/snake/play, 1440x900, production build, fine pointer.

**Measured before change (rAF, worst of 3 x 10 s):** classic 59.98 fps, 0% frames >33ms, max gap 17.8 ms; neo 59.97 fps, 0%, 17.7 ms; retro 59.98 fps, 0%, 17.8 ms. All pass the rAF rule. The rAF cap (60 Hz) hides headroom, so the microbenchmark decided the fix.

**Microbenchmark (full scene: 200 body cells, fruit, grid, flush each frame, ms/frame):**

- Before: classic ~0.16, neo ~2.5 (per-block `shadowBlur`, the main cost), retro ~0.35 (fruit tint canvas rebuilt every frame).
- After: neo ~0.74 (glow sprite per colour, `drawImage`), retro ~0.29 (tint cache). Classic unchanged.
- Look check (pixel diff, neo, full 576x576 canvas): max 4/255 per channel, all in the glow halo. Retro tint: max diff 0.

**Changed (lib/snake/render.ts only):**

1. Neo glow: per-block `shadowBlur` replaced by a pre-rendered glow sprite per colour, margin `ceil(1.5 * glow)`, drawn with `drawImage` under each block in the same order.
2. Retro fruit tint: one tinted canvas per sprite name + colour, cached (was one shared scratch canvas redrawn each frame).

**Not changed:** components/snake-game.tsx (no per-frame useState, refs already used, loop stops on unmount: 0 rAF callbacks 2 s after client nav to Library).

**Gotchas:**

- The shared Playwright MCP browser gets navigated to other agents' pages mid-run (saw asteroids and arkanoid). Check `location.href` inside every measurement evaluate.
- `.next` is shared across agents: another `npm run build` replaced BUILD_ID under a running server. Check `.next/BUILD_ID` against the server's build before measuring.
- Private headless Chromium for microbenchmarks: the `playwright` package in `~/.npm/_npx/*/node_modules/playwright` plus `chromium_headless_shell-1254` from the ms-playwright cache (pass `executablePath`). Avoids the shared MCP tab.
- `sed -i` on macOS needs `''`.
