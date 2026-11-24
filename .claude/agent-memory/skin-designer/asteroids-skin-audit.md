---
name: asteroids-skin-audit
description: Asteroids skin audit status. Classic, neo, retro now in lib/asteroids/skins.ts with SKIN select (asteroids-skin). Read before touching Asteroids skins.
metadata:
  type: project
---

Asteroids skins: classic, neo, retro. Implemented in `lib/asteroids/skins.ts`. `drawGame` takes a `SkinId`. The component owns a SKIN select that persists under `asteroids-skin`, mirroring Tetris.

Audit before work: one hardcoded white/cyan look, no skin select, no skin data. Classic kept as the original look (#000 canvas, white outlines, cyan power-up, orange flame). Neo added on arcade.css accents with glow 10 px. Retro added as a three-color muted CRT set with flat square bullets and no glow.

**Why:** the skin-designer audit requires all three skins on every real game. Asteroids had none of the named skins.

**How to apply:** keep classic identical to the old render so default players see no change. Retro hudDim (#a0783a) is the tightest text contrast, about 4.8:1 against #0d0d14. Recheck it if the retro palette changes. Verify with `npx tsc --noEmit` and `npm run lint`. Not committed.
