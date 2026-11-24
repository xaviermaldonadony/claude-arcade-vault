---
name: snake-skin-audit
description: Snake skin audit status. Classic, neo, retro added in lib/snake/skins.ts with SKIN select (snake-skin). Read before touching Snake skins.
metadata:
  type: project
---

Snake skins: classic, neo, retro. Implemented in `lib/snake/skins.ts`. `drawGame` takes a `SkinId` and draws the fruit sprite through the skin. The component owns a SKIN select that persists under `snake-skin`, mirroring Asteroids and Tetris.

Audit before work: one hardcoded green/magenta look, no skin select, no skin data. Classic kept as the original look (#0a0a0f canvas, green body, pale green head, full-color fruit, no glow). Neo added on arcade.css accents (cyan grid, green body, yellow head, 12 px glow). Retro added as phosphor green and amber on #0d0d14, 2 px flat bevel, and one-color amber fruit silhouette drawn through an offscreen canvas with `source-in`.

Contrast (computed): classic and neo body and head at 14.7:1 and above. Retro body 7.7:1, retro head 8.6:1, retro fallback 4.2:1. Retro shade is decorative only.

**Why:** the skin-designer audit requires all three skins on every real game. Snake had none of the named skins.

**How to apply:** keep classic identical to the old render so default players see no change. Retro fruit tint uses `document.createElement` in render.ts, which matches Tetris. The engine stays pure. Not committed. Verify with `npx tsc --noEmit` and `npm run lint`. Registry entry `snake` needed no change.
