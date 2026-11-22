---
name: arcade-game-spec
description: Spec a new playable game with a Supabase leaderboard for Arcade Vault, from a references/started-games folder or a game idea. Runs the /spec flow with game context pre-loaded. Spec only; implement with /spec-impl.
disable-model-invocation: true
argument-hint: '<references/started-games/NN-name | game idea>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /arcade-game-spec — Game spec designer for Arcade Vault

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

---

This skill writes a spec for one new playable game. **You don't write code here.** It wraps the `/spec` flow: `/spec` has `disable-model-invocation: true`, so you run its phases yourself, with game context pre-loaded.

## Step 0 — Load the /spec flow

Read these two files first and treat them as binding:

- `.claude/skills/spec/SKILL.md` — phases 1 to 4, hard rules, numbering, `Draft` state, language rule, `specs/.spec-config.yml` seed, stop condition.
- `.claude/skills/spec/template.md` — spec shape (header, scope, data model, implementation plan, acceptance criteria, decisions, risks, "not in" tail).

Where this file and `/spec` disagree, `/spec` wins for flow and format. This file adds game content only.

## Step 1 — Read the game context

Read before asking anything:

1. `specs/05-asteroids-game.md` and `specs/06-leaderboard-and-game-database.md`. They are the reference conventions for a real game and its leaderboard. Copy their headings and tone.
2. `lib/asteroids/` (`types.ts`, `constants.ts`, `engine.ts`, `render.ts`, `input.ts`). This is the engine pattern to mirror.
3. `components/asteroids-game.tsx` (canvas client component pattern).
4. `components/game-player.tsx` (the `isRealGame` gate at line 18, HUD, save flow).
5. `supabase/migrations/` (seed row shape for `games`).
6. If `$ARGUMENTS` is a path under `references/started-games/`, read that folder (its `game.js`, `index.html`, `README.md`).

If `$ARGUMENTS` is empty, ask for one sentence: which game, and whether it comes from a reference folder or is a new idea.

## Step 2 — Decide the source mode

- **Reference port:** `$ARGUMENTS` is a folder under `references/started-games/`. The spec ports it to TypeScript. Its mechanics and numbers are the default, and Spanish text becomes English.
- **New game:** `$ARGUMENTS` is a text idea. The spec designs engine state, controls, scoring and game-over from scratch. Ask about these in phase 2.

Check whether the reference is already ported. `lib/asteroids/` ports `02-asteroids`. If the user asks for that folder, say it is done and stop. Do not write a spec.

## Step 3 — Pre-answered decisions

Do not re-ask these. Record each one in the spec's **Decisions** section as **Yes** with a short reason.

- **Engine:** pure TypeScript in `lib/<game>/` with `types.ts`, `constants.ts`, `engine.ts`, `render.ts`, `input.ts`. No DOM, React or Next imports in `types.ts` and `engine.ts`. State is immutable. `createGame(rng?)`, `setPaused(state, paused)` and `step(state, input, dt, rng?)` are exported. `dt` is clamped to 0.05 s. `drawGame(ctx, state, now)` draws it. `attachKeyboard(window)` returns `{ read, takePausePress, detach }`. Reason: the same pattern as SPEC 05, which keeps the physics testable and React-free.
- **Component:** `components/<game>-game.tsx`, a client canvas component with props `paused`, `onStats`, `onEnd` and `onTogglePause`. It uses latest-props refs and an empty-deps rAF loop. It shows `THIS GAME NEEDS A KEYBOARD` on coarse pointers. Reason: matches SPEC 05 and keeps the player shell shared.
- **Scores:** the existing `POST /api/scores` and `GET /api/scores`. Only "the game id exists in `games`" is checked. Name rules, score cap 10,000,000 and `GUEST` come from SPEC 06. No API or table change. Reason: `validateScoreSubmit` has no per-game allowlist.
- **Database:** one new migration `supabase/migrations/000N_add_<id>_game.sql` with one `insert into public.games (id, title, short, long, cat, cover, color, plays)` row. It is applied with the Supabase MCP `apply_migration` tool and verified with `execute_sql`. Reason: the tables, RLS, grants and trigger already exist.
- **Cover:** a `.cover-<name>` block in `app/arcade.css`, placed after `.cover-duel`. The `cover` and `color` values in the migration row must match it. `color` is one of `cyan`, `magenta`, `yellow`, `green`.
- **Registry refactor** (only if `lib/games-registry.ts` does not exist yet): the spec adds a step that replaces `isRealGame = game.id === 'asteroids'` in `components/game-player.tsx:18` with an id-to-component registry. Asteroids is registered in it. The other games keep the fake ticker as fallback. The step also fixes the stale "Only Asteroids" comments at `components/game-player.tsx:9-10` and `:17`, and `app/api/scores/route.ts:5`. If the registry file already exists, the spec only adds one entry.
- **Docs:** one step updates `CLAUDE.md` Architecture (the "Only the Asteroids game submits scores" line and the engine paragraph). Do not touch the `AGENTS.md` block. Do not edit SPEC 01 to 06.
- **Tooling rules:** read `node_modules/next/dist/docs/` before writing Next code. Use the `/frontend-design` skill for HUD and overlay styling. The repo has no test runner, so checks are manual in the browser plus `npm run build`, `npm run lint` and `npx tsc --noEmit`.

## Step 4 — Port rules for reference games

Use these when `$ARGUMENTS` is a reference folder. Put each one in the spec's Scope or Decisions section, as relevant.

- **Tetris (`references/started-games/03-tetris`):**
  - Easy to port: `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY` and scoring, once `board` moves into state.
  - Needs rework: `Math.random` becomes an `rng` parameter. Discrete keys (rotate, hard drop, pause) need a justPressed-style input, like `takePausePress`.
  - Drop: the `tetris-theme` localStorage toggle, and the DOM HUD and overlay (the player's HUD handles it).
  - The second "next" canvas becomes a sub-rect of the game canvas, or a separate canvas passed to `drawGame`.
  - The game ends on spawn collision. There are no lives.
- **Arkanoid (`references/started-games/04-arkanoid`):**
  - `levels.js` is pure data and moves over as is.
  - The sprite sheet goes to `public/`. Load it asynchronously before the first draw.
  - Sound (`Audio` objects) does not belong in the engine. Either the engine emits an event list that the host plays, or the spec drops sound. Ask which.
  - Mouse input needs scaling from client to canvas coordinates in `input.ts`.
  - The reference has no restart. Add one: the modal's PLAY AGAIN, as in SPEC 05.
  - The level-jump buttons on the pause overlay are a debug feature. Drop them, or make them a `jumpToLevel` action. Ask which.
  - Spanish text (`Nivel:`, `PAUSA`, `Saltar al nivel:`, `¡Completaste el juego!`) becomes English.
- **Asteroids (`references/started-games/02-asteroids`):** already ported in SPEC 05. Stop and tell the user.
- **Free-text idea:** there is no reference to port. Ask in phase 2 for the engine state, the controls, the scoring rule and the game-over rule.

## Step 5 — Game questions (phase 2)

Ask only what is not already settled by the reference or by Step 3. Use `AskUserQuestion`, 3 to 5 questions per block, recommendation first and labeled. Cover these topics:

1. Game id (URL slug, e.g. `tetris`) and display title (uppercase, e.g. `TETRIS`).
2. `cat`: `ARCADE`, `PUZZLE`, `SHOOTER` or `VERSUS`.
3. `color`: `cyan`, `magenta`, `yellow` or `green`.
4. Cover look for the `.cover-<name>` CSS block (gradient or pattern, plus a glyph).
5. Controls, and which keys pause.
6. Scoring rule and any cap that differs from 10,000,000.
7. Lives, levels, or the game-over condition.
8. Cuts from the reference: sound, mouse, assets, debug features.
9. Whether to also fix the activity-feed game names in `lib/data.ts:36-45` (mock data).

If the user says "skip the questions", remind them: "Questions now save hours later. Are you sure you want to skip them?" If they insist, record "Quick definition without detailed clarification" in Decisions.

## Step 6 — Required spec content

The spec must contain these. Phase 3 of `/spec` decides whether sections are written in one go. Here, content is fixed.

**Implementation plan** (numbered, each step leaves `npm run dev` working):

1. Pure engine skeleton in `lib/<game>/` (types, constants). Verify with `npx tsc --noEmit`.
2. Engine logic in `engine.ts`, with the reference mechanics ported. Verify with `npx tsc --noEmit`. Nothing imports it yet.
3. `render.ts` and `input.ts`. Verify with `npx tsc --noEmit`.
4. Client canvas component `components/<game>-game.tsx`. Verify with `npm run build`.
5. Migration `000N_add_<id>_game.sql`, applied with Supabase MCP `apply_migration`. Verify with `list_tables` and `execute_sql` (`select count(*) from public.games` is the previous count plus 1).
6. `.cover-<name>` CSS block in `app/arcade.css`.
7. Registry refactor (if needed), then wire the game in `components/game-player.tsx`. Verify `/games/<id>/play` renders the real game and `/games/fall/play` keeps the fake ticker.
8. Save flow: confirm `POST /api/scores` on SAVE SCORE and the row in the Hall of Fame. No API change.
9. Docs: `CLAUDE.md` Architecture update.

**Acceptance criteria** (boolean, checkable):

- `npm run build`, `npm run lint` and `npx tsc --noEmit` exit 0.
- `grep` finds no `react`, `next`, `window`, `document` or `localStorage` in `lib/<game>/types.ts` and `lib/<game>/engine.ts`.
- The game id appears in `/games` and opens at `/games/<id>`.
- `/games/<id>/play` runs the real game with no console errors and no React hydration warning.
- PAUSE, `P` and `Escape` each pause and resume. The state does not change while paused.
- END, and game over, open the modal with the real score.
- SAVE SCORE sends `POST /api/scores` and gets `201`. The row appears in the Hall of Fame tab for the game.
- With the network blocked, SAVE SCORE shows `COULD NOT SAVE. TRY AGAIN` and keeps the name and score.
- Other games (e.g. `/games/fall/play`) still show `NOT RANKED YET` with no SAVE button.
- `plays` in `games` increases by 1 after a saved score.
- On a coarse pointer, the game shows `THIS GAME NEEDS A KEYBOARD`.
- Grep for Spanish labels (`NIVEL`, `PUNTAJE`, `PAUSA`, `ESPACIO`) in the game files returns no matches.

**Risks table:** include at least "game id collides with an existing id" (mitigation: check `games` before the migration) and "reference uses assets or audio" when relevant.

**"What is not in this spec" tail:** list the cuts from Step 5, and "scores for the other fake-ticker games" when they are not being ranked.

## Step 7 — Save and stop

Follow `/spec` Phase 4 exactly:

1. Number the file from the `specs/` listing in the session context (highest + 1, two digits).
2. Slug: kebab-case from the game title, e.g. `specs/07-tetris-game.md`.
3. Date from the session context. Never guess it.
4. State `Draft`. Do not mark it `Approved`.
5. Check that every `**Depends on:**` spec exists. For this skill, that is usually SPEC 05 and SPEC 06.
6. Seed `specs/.spec-config.yml` only if it is missing. Never overwrite it.
7. Confirm the path. Remind the user to review and change `Draft` to `Approved`. Tell them to run `/spec-impl NN-slug`.
8. **Stop.** Do not write code, apply migrations, or start implementation.

## Hard rules

- **Never write code.** The only file written is the spec `.md`.
- **Never apply a migration or touch the database.** Those belong to the implementation spec.
- **Never add a game to the registry or edit `game-player.tsx` here.** That is an implementation step.
- **Never assume a decision the user did not confirm.** Ask in Step 5. Use Step 3 only for the pre-answered items.
- **Never write a date you did not read from the session context.**
- **Language:** reply in the language of the user's prompt. Spec headings stay in English to match SPEC 05 and SPEC 06, unless the user asks otherwise.
