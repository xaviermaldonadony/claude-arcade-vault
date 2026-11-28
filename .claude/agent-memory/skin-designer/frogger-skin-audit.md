---
name: frogger-skin-audit
description: Frogger skin audit status. Classic, neo, retro in lib/frogger/skins.ts with SKIN select (frogger-skin). Read before touching Frogger skins.
metadata:
  type: project
---

Frogger skins: classic, neo, retro. Palettes in `lib/frogger/skins.ts` (no `lib/frogger/render.ts`, drawing stays in `components/frogger-game.tsx`). The SKIN select lives in `FroggerRealGame` and persists under `frogger-skin`. Default is classic.

Audit before work: one hardcoded look, no skin data, no SKIN select, no `skinSlot` prop on `FroggerRealGame`. Classic kept as the original look. Only change: logs lightened from #7a4a1e to #a0683a, because the old brown was 1.9:1 against the river.

Contrast (computed, WCAG): classic HUD text 18.9:1, classic car red 3.7:1 and blue 3.9:1, classic turtle 4.1:1. Neo HUD cyan 15.5:1, neo cars 5.3 to 18.6:1, neo turtles and frog 14:1. Retro HUD 8.2:1, retro cars 3.9 to 8.8:1, retro log 3.4:1, retro turtle ring 7.6:1, retro submerged turtle 3.4:1, retro time bar low 3.9:1.

**Why:** the skin-designer audit requires all three skins on every real game.

**How to apply:** Frogger's draw code is in the component, not in `lib/`. Moving the draw code to `lib/frogger/render.ts` is a separate refactor and was not done. Recheck the retro submerged turtle and cars if palettes change. Not visually verified in a browser yet. The canvas now sits in a flex column under the arena, so check the layout on desktop and phone.
