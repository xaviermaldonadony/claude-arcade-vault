---
name: spec-impl-game
description: Auto workflow for a game spec. Approved spec: implements it step by step, commits each step, then stops for the human acceptance check. Implemented spec: runs frontend-design, skin-designer and mobile-porter one after the other. Stops for decisions, failing checks or actions outside the repo. Manual invocation only.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Skill, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git show:*), Bash(cat:*), Bash(ls:*), Bash(grep:*), Bash(npx tsc:*), Bash(npx eslint:*), Bash(npx prettier:*), Bash(npm run dev:*), Bash(pkill:*), Bash(curl:*), mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_snapshot
---

# /spec-impl-game — Auto workflow: implement a game spec, commit each step, skin it, port it

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Workflow config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "No config file — defaults apply: AutoCreateBranch: true, AutoCommitSteps: false"`

---

This command runs the game workflow in two phases, with a human check between them:

1. **Implementation (auto):** implements the spec step by step and commits each step. It does not stop between steps.
2. **Human acceptance:** the user verifies the spec's acceptance criteria and sets the spec state to `Implemented`.
3. **Agents and layout (auto):** after the state is `Implemented`, runs `frontend-design`, `skin-designer` and `mobile-porter` one after the other (skipping any whose commit already exists), then implements SPEC 12 (layout fit) on the current branch if it is not yet done, and runs the layout check over every game.

SPEC 12 is implemented on the same branch as the game, with no extra branch and no switching. The skill never sets SPEC 12 to `Implemented` unless the layout check passes.

The command never sets the state to `Implemented` itself. Only the user does.

The received argument is: `$ARGUMENTS`

**Run mode: auto.** The user invoked this command to run the full flow, so the start confirmation is given. This overrides these `/spec-impl` rules for this run only:

- Phase 4 start confirmation and the pause after each step are skipped.
- Commits are made by this command after every step (see Commit rules below), not by `/spec-impl`. Leave `AutoCommitSteps` as it is in the config, so `/spec-impl` does not commit a second time.

Everything else in `/spec-impl` stays binding: the Approved check, branch creation, the working-tree question, no pushes, no `--no-verify`, and no improvised answers to ambiguity.

## Game pattern (required for every new real game)

A new game is a real game, so it must follow the same pattern as Asteroids, Tetris, Arkanoid and Snake. Do not add a dedicated route such as `app/games/<id>/play/page.tsx`. Implement these in the spec's steps:

1. **Component:** the game component accepts the same props as the other real games: `touch`, `skinSlot`, `paused`, `onStats`, `onEnd`, `onTogglePause` (`RealGameProps` in `lib/games-registry.ts`). If the engine uses different props, add a thin adapter that maps them, as `FroggerRealGame` does.
2. **Registry:** one entry in `REAL_GAMES` (`lib/games-registry.ts`) with `component` and `mapStats`. `mapStats` gives the HUD score, level and one slot (for example Lives as hearts).
3. **Touch layout:** add the game id and its enabled keys to `LAYOUT` in `components/touch-dpad.tsx`, and the id to `GameId`. Without it the D-pad has no layout.
4. **Play route:** none new. `/games/[id]/play` serves every real game through `GamePlayer`.
5. **Score save:** through `POST /api/scores`, the same as the other games.
6. **Layout:** canvas sizing follows the shared flex pattern (`flex: 1 1 0; minHeight: 0; aspectRatio` in the wrapper). No fixed pixel heights, so the layout check in Step 6b can pass.

If a spec's plan puts the game on a dedicated route or skips the registry, treat that as an ambiguity (rule 2). Show the options and ask before implementing.

---

## Stop rules (the only reasons to pause for the user)

Stop, show the problem, and ask with AskUserQuestion when any of these happens:

1. The spec state is neither `Approved` nor `Implemented`, or the working tree has pending changes (the `/spec-impl` Phase 3 question).
2. The spec is `Implemented` but the current branch is not `spec-NN-slug`, or a step commit is missing. Do not launch agents.
3. The spec has an ambiguity that the spec does not resolve (`/spec-impl` rule). Give 2 or 3 options.
4. A step's check fails after 2 fix attempts (see Quality gate).
5. A step needs an action outside the repo: a remote database change, a push, a pull request, an external service, or a manual check (for example a Supabase SQL run or a browser check that you cannot do).
6. The game id is unclear or not in `REAL_GAMES` (`lib/games-registry.ts`).
7. A requested change is out of the spec's scope.
8. `frontend-design`, `skin-designer` or `mobile-porter` stops and asks a question.
9. SPEC 12 is missing, Draft or not `Approved`/`Implemented` when Step 6b is reached. Stop and ask the user to write and approve SPEC 12. Also stop when the layout check fails because of shared CSS (`app/arcade.css`), and report which viewport and game failed.

Do not stop for anything else. In particular, do not stop to show a diff and wait, and do not stop to ask whether to continue to the next step.

---

## Step 0 — Read the spec state and choose the path

1. Find the spec from `$ARGUMENTS` (full name, number, slug, or path such as `@specs/game-jam/frogger/01-frogger-core.md`). Read the `Status` line near the top (the blockquote `> **Status:** ...`).
2. Choose the path by the state:
   - **`Approved`** (or equivalent): run Step 1 (implementation). Then stop at Step 2 for the human check.
   - **`Implemented`** (or equivalent): skip Step 1. Check that the current branch is `spec-NN-slug` and that step commits exist (`git log --oneline` shows `spec-NN step MM` for each plan step). If yes, go to Step 3 (the agents). If not, stop (rule 8).
   - **Anything else** (Draft, In review, Obsolete, unknown): stop (rule 1).

## Step 1 — Run /spec-impl in auto mode

Read `.claude/skills/spec-impl/SKILL.md` and follow its phases in order, with the auto-mode overrides above:

1. **Phase 1:** Find the spec (see Step 0).
2. **Phase 2:** Check the state is `Approved`. Otherwise stop (rule 1).
3. **Phase 3:** Check the working tree and create or switch to the branch `spec-NN-slug` (`AutoCreateBranch` rules). Show the spec summary (objective, scope, plan, criteria). Do not wait for confirmation.
4. **Phase 4:** Implement each step of the plan in order. After each step: run the Quality gate, commit the step, and continue to the next step with no pause.

## Quality gate (after every step, before its commit)

1. Run `npx tsc --noEmit`. It must pass.
2. Run `npx eslint <each file this step touched>`. Errors must be zero. Warnings are allowed only when they come from code that a later step of the same spec will use. Say so in the commit message.
3. Run `npx prettier --write <each file this step touched>` if the hook did not already format it.
4. If a check fails, fix it and run the check again. After 2 failed fix attempts, stop (rule 3).

Do not use `--no-verify`. Do not bypass hooks.

## Commit rules (per step)

- Stage only the files this step created or changed: `git add -- <file> <file> ...`. Never `git add -A` or `git add .`.
- Check `git diff --cached --stat` first. It must list only this step's files.
- Commit message: a meaningful subject and a short body. Format:
  - Subject: `feat: <what the step did> (spec-NN step MM)`, for example `feat: add frogger goal and bay handling (spec-01 step 6)`.
  - Body: 1 to 3 lines on what changed and any open decision you made.
  - Last line: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.
- Use `git commit -m` with the message. Do not open an editor.
- If the commit fails, stop and show the error (rule 4 style). Do not retry blindly.
- Never push.

After the commit, print one line: `Committed step MM as <short hash>`.

## Step 2 — Human acceptance gate (hard stop)

After Phase 4 finishes every step and all their commits exist, **stop**. Do not launch any agent. Print this and nothing that starts the agents:

```
✅ Implementation finished and committed on branch spec-NN-slug.

Next, you check the spec:
  1. Run the acceptance criteria in specs/.../NN-slug.md (browser, Supabase, manual checks).
  2. Fix anything that fails: ask me to change code, then the change gets its own commit.
  3. When all pass, set the spec state to "Implemented" and commit that change.
  4. Re-run /spec-impl-game <NN-spec-name>. I will skip implementation and run the agents.
```

Also list the criteria that need a human (browser, Supabase, manual look), so the user knows what to check. Do not run the agents in the same turn, even if no browser check is pending.

If the implementation stopped early (a stop rule fired), stop there and report where it stopped. The gate above applies only when every step is done.

## Step 3 — Resolve the game id (agents phase, state `Implemented` only)

Reached only from Step 0 when the state is `Implemented`. A run that implements the spec stops at Step 2 and never reaches this step.

The game id is the one in `REAL_GAMES` (`lib/games-registry.ts`) for this game. Get it from the spec header or slug, then confirm it with:

```
grep -n "REAL_GAMES" lib/games-registry.ts
```

- Clear and registered: continue.
- Unclear or not registered: stop and ask (rule 5). Do not guess. Do not register the game yourself.
- Registered but the game's touch layout (`LAYOUT` in `components/touch-dpad.tsx`) is missing: stop and report it (rule 8 style). The mobile-porter agent needs it.

## Step 4 — Design direction with /frontend-design

Invoke the `frontend-design` skill with the Skill tool (`skill: "frontend-design"`). Project rule: always use it to design the UI. Pass the game id and the spec path, and ask for a visual direction for the game's skins (`classic`, `neo`, `retro`) and its phone touch layout, on the dark theme, using the `--cyan`, `--magenta`, `--green`, `--yellow` accents from `app/arcade.css`.

Keep the output as text. Pass it to both agents in Steps 5 and 6. Do not write the design into a file yourself.

If the Skill call fails, stop and tell the user (rule 7 style). Do not launch the agents without it.

## Step 5 — skin-designer (only after Step 4)

Resume check: if `git log --oneline` already has a commit tagged `(spec-NN skin)` for this spec, skip Steps 4 and 5 and go to Step 6. Print one line saying so.

Launch the agent with the Agent tool:

- `subagent_type`: `skin-designer`
- Run in the foreground. Wait for it to finish.
- Prompt: the game id, the spec path (`specs/...`), the design direction from Step 4, and this line: "Work only on this game. Ensure it has the `classic`, `neo`, and `retro` skins and that each reads well on the dark theme."

When it returns:

1. If it asked a question, stop and relay it (rule 7).
2. Otherwise run the Quality gate on the files it changed.
3. Commit them as `feat: add skins for <game> (spec-NN skin)` with the same body and co-author rules as the step commits.
4. Print a short summary: files changed, skins added or fixed, and the commit hash.

## Step 6 — mobile-porter (only after Step 5 is committed)

Resume check: if `git log --oneline` already has a commit tagged `(spec-NN mobile)` for this spec, skip this step and go to Step 6b. Print one line saying so.

Never send both Agent calls in the same message. Never run them in parallel.

Launch the agent with the Agent tool:

- `subagent_type`: `mobile-porter`
- Run in the foreground. Wait for it to finish.
- Prompt: the same game id, spec path, and design direction from Step 4, plus: "The skin-designer has already run and its work is committed. Port this game to phones per the touch layout. Do not change the four existing games."

When it returns:

1. If it asked a question, stop and relay it (rule 7).
2. Otherwise run the Quality gate on the files it changed.
3. Commit them as `feat: add phone controls for <game> (spec-NN mobile)` with the same body and co-author rules.
4. Print a short summary: files changed and the commit hash.

## Step 6b — Layout fit (SPEC 12), after mobile-porter

1. **Read SPEC 12.** Open `specs/12-play-page-viewport-fit.md` and read its `Status` line.
   - `Implemented`: skip to step 3.
   - `Approved`: implement it with the Step 1 rules, but stay on the current branch (no branch creation, no switching). Run the Quality gate and commit each step as `feat: <what> (spec-12 step MM)`. Then go to step 3.
   - Draft, missing or anything else: stop (rule 9).
2. **Layout check.** Start the dev server in the background: `npm run dev`. For every id in `REAL_GAMES` (`lib/games-registry.ts`), open `http://localhost:3000/games/<id>/play` with the Playwright MCP tools at these viewports: 1366x768, 1440x900, 1920x1080 (fine pointer) and 390x844 (touch). Use the pass rule written in SPEC 12. If SPEC 12 does not state one, stop (rule 9).
   - Desktop pass: the bottom of `.crt` is inside the viewport height, the canvas is fully visible, and there is no horizontal scroll.
   - Phone pass: the canvas width fits the viewport, and the touch bar is visible.
   - If one game fails because of its own wrapper or canvas styles, fix only that game's files, re-run the check for that game (max 2 attempts), and commit `fix: <game> layout fit (spec-12 layout)`.
   - If the failure comes from shared CSS (`app/arcade.css`), stop (rule 9) and report the viewport and game.
   - Stop the dev server when done: `pkill -f "next dev"`.
3. **Mark SPEC 12 done.** Only when every game passes every viewport: set the `Status` line of `specs/12-play-page-viewport-fit.md` to `Implemented` and commit `docs: mark spec-12 implemented (spec-12 layout)`. This is the one state the skill sets itself, because the acceptance criteria are measured. Game specs are never set by the skill.

## Step 7 — Final report

Report, in this order:

1. Result of `/spec-impl`: branch, steps done, and the commit for each step (short hash and subject).
2. Design direction used (short).
3. Commit and files from skin-designer.
4. Commit and files from mobile-porter.
5. SPEC 12 (layout fit): commits made, and the layout check result as a table of game by viewport (pass or fail).
6. Checks that still need a human: acceptance criteria that need a browser run, a Supabase action, or a manual look. List each one.
7. Reminder: verify the acceptance criteria, then set the spec state to `Implemented` and commit that change.

Do not push, open a PR, or merge unless the user asks.
