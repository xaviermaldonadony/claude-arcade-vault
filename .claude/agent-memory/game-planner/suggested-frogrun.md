---
name: suggested-frogrun
description: FROGRUN (id frogrun, ARCADE, green, Frogger style) suggested as runner-up 2026-11-23; green collides with snake
metadata:
  type: project
---

FROGRUN (`frogrun`, ARCADE, green, placeholder slot) was runner-up 2 on 2026-11-23. Status: Suggested.

**Why:** Placeholder slot, effort M. Weak on color: green is already used by the shipped SNAKE in ARCADE, so the spec would need a different color (yellow or cyan) or a color-constraint migration. Color check constraint in `supabase/migrations/0001_games_and_scores.sql` allows only cyan, magenta, yellow, green.

**How to apply:** If picked, resolve the color collision in the spec. Update this file's status on accept, reject, or ship.
