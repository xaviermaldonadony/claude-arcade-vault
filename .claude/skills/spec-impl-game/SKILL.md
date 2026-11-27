---
name: spec-impl-game
description: Implements an approved game spec with /spec-impl, then runs the skin-designer agent and then the mobile-porter agent, one after the other (never in parallel). Manual invocation only.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Skill, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(git add:*), Bash(git commit:*), Bash(git show:*), Bash(cat:*), Bash(ls:*), Bash(grep:*)
---

# /spec-impl-game — Implement a game spec, then skin it and port it to phones

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

This command wraps `/spec-impl` and adds two agent runs after it. **You do not write the game code yourself here.** `spec-impl` has `disable-model-invocation: true`, so you run its phases yourself by reading its file.

The received argument is: `$ARGUMENTS`

---

## Step 1 — Run /spec-impl

Read `.claude/skills/spec-impl/SKILL.md` and treat it as binding for the implementation flow. Follow its four phases in strict order, unchanged: approval check, branch, spec summary, step-by-step implementation with pauses. Pass `$ARGUMENTS` through as the spec argument. Do not change its rules (no commits unless `AutoCommitSteps` is `true`, no pushes, no `--no-verify`, no improvised ambiguity answers).

Do not skip any pause that `spec-impl` requires. Wait for the user at each one.

## Step 2 — Gate before the agents

Continue to Step 3 **only** when `spec-impl` ended with its final message ("All steps of the plan are implemented"). If `spec-impl` stopped for any other reason (spec not Approved, pending working tree changes not resolved, user paused, ambiguity open, step not confirmed), stop here and report where it stopped. **Do not launch any agent.**

## Step 3 — Resolve the game id

The game id is the one `REAL_GAMES` in `lib/games-registry.ts` uses for this game. Get it from the spec header or slug, then confirm it with:

```
grep -n "REAL_GAMES" lib/games-registry.ts
```

- If the id is clear and registered, continue.
- If the id is unclear, or the game is not registered in `REAL_GAMES`, ask the user with AskUserQuestion. Do not guess. Do not register the game yourself.

## Step 4 — Design direction with /frontend-design

Before any agent runs, invoke the `frontend-design` skill with the Skill tool (`skill: "frontend-design"`). Project rule: always use it to design the UI. Pass the game id and the spec path as args, and ask for a visual direction for the game's skins (`classic`, `neo`, `retro`) and its phone touch layout, on the dark theme, using the `--cyan`, `--magenta`, `--green`, `--yellow` accents from `app/arcade.css`.

Keep its output (the design direction) as text. You will pass it to both agents in Steps 5 and 6. Do not write the design into any file yourself.

If the Skill call fails or is unavailable, stop and tell the user. Do not launch the agents without the design direction.

## Step 5 — skin-designer (first, only after Step 4)

Launch the agent with the Agent tool:

- `subagent_type`: `skin-designer`
- Run in the foreground. Wait for it to finish.
- Prompt: the game id, the spec path (`specs/...`), the design direction from Step 4, and this line: "Work only on this game. Ensure it has the `classic`, `neo`, and `retro` skins and that each reads well on the dark theme."

When it returns, show the user a short summary: files changed and skins added or fixed. If it stopped and asked a question, relay the question and wait for the answer before continuing.

## Step 6 — mobile-porter (second, only after Step 5 returned)

Only start this after the skin-designer call has returned and its summary is shown. Never send both Agent calls in the same message. Never run them in parallel.

Launch the agent with the Agent tool:

- `subagent_type`: `mobile-porter`
- Run in the foreground. Wait for it to finish.
- Prompt: the same game id, spec path, and design direction from Step 4, plus: "The skin-designer has already run. Port this game to phones per the touch layout. Do not change the four existing games."

When it returns, show the user a short summary of its changes. If it stopped and asked a question, relay it and wait.

## Step 7 — Final report

Report, in this order:

1. Result of `/spec-impl` (branch, steps done, commits if any).
2. Design direction used (short).
3. Files touched by skin-designer.
4. Files touched by mobile-porter.
5. Reminder: verify the spec's acceptance criteria one by one, then set the spec state to "Implemented" and make the final commit before merging.

Do not commit, push, or open a PR unless the user asks.
