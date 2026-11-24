---
name: arkanoid-skin-audit
description: Arkanoid skin audit status. Classic, neo, retro now in lib/arkanoid/skins.ts with SKIN select (arkanoid-skin). Read before touching Arkanoid skins.
metadata:
  type: project
---

Arkanoid skins: classic, neo, retro. Implemented in `lib/arkanoid/skins.ts`. `drawGame` takes a `SkinId` as a fourth argument (default classic). The component owns a SKIN select that persists under `arkanoid-skin`, mirroring Tetris.

Audit before work: no skin system at all. One fixed look: black canvas, white HUD and overlay text, sprite sheet drawn as-is. Classic keeps that look exactly (#000 canvas, #fff text, untinted sprites, same scrim alphas as before).

Neo: canvas `--bg` (#0a0a0f), HUD `--ink`, titles `--magenta`, shadow glow 12 px on paddle (cyan), ball (yellow), and bricks (per-color). Retro: canvas #14110d, amber text, sprite sheet desaturated 60% and warmed with a cream multiply (cached tinted canvas per sheet), no glow.

**Why:** the skin-designer audit requires all three skins on every real game. Arkanoid had none. The sprite sheet is fixed, so skins recolor sprites with canvas compositing, not new art.

**How to apply:** keep classic identical to the old render. Contrast checked: classic #fff on #000 21:1, neo HUD 16.4:1, neo dim 6.3:1, neo title 5.2:1, retro HUD 8.9:1, retro dim 4.8:1. Game-object 3:1 not measured numerically. Retro sprite tint uses `destination-in` clipping, so keep that step if the tint changes. Not committed. Verified with tsc and lint only; no Playwright screenshots taken.
