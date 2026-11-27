# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is an online gaming platform where players compete for the highest score (see README.md). It is a working Next.js app: Home, Games library, Game detail, Play, Hall of Fame, About, and Auth pages, a Supabase-backed game catalog and leaderboard, and four playable canvas games (Asteroids, Tetris, Arkanoid, Snake). The other six catalog games are placeholders that run a fake score ticker. The implemented games are listed in `references/implemented-games.md`. `demos/demo.tsx` is a throwaway scratch file, not product code.

## Commands

- `npm run dev` — start the Next.js dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build (run `build` first)
- `npm run lint` — runs `eslint` with `eslint.config.mjs` (Next core-web-vitals + TypeScript rules)
- `npx tsc --noEmit` — typecheck (`strict` mode; there is no `typecheck` script)
- `npx prettier --write <file>` — format (`prettier` is a dev dependency, config in `.prettierrc`; there is no `format` script). The hook below runs it for you on edited files.

There is no test runner or test script configured. Do not assume `npm test` or a single-test command exists; add a test framework explicitly if tests are needed.

## Next.js version caveat

The project uses Next.js 16.4.6 with React 19.3. `AGENTS.md` warns that this version has breaking changes from older Next.js. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` as `AGENTS.md` instructs. Do not edit the `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md`; `next dev` rewrites it.

## Skills

Project skills live in `.claude/skills/` and are pinned in `skills-lock.json`:

- `/frontend-design` (from `anthropics/skills`): always use it to design the UI.
- `/spec` and `/spec-impl` (from `Klerith/fernando-skills`): write a spec, then implement from it. See the spec-driven workflow below.
- `/arcade-game-spec` (project-local, manual invocation only): specs a new playable game with a Supabase leaderboard from a `references/started-games/NN-name` folder or a game idea. It runs the `/spec` flow with game context preloaded and writes the spec only. Implement with `/spec-impl`.

## Agents

Project subagents live in `.claude/agents/`:

- `game-planner` (`.claude/agents/game-planner.md`): proposes the next game to add (one pick plus runners-up). Use it when asked what game to add next.
  - Tracks games in `references/game-suggestions-todo.md` (Suggested, Accepted, Implemented, Discarded). Never re-suggests a listed game.
  - Memory: `.claude/agent-memory/game-planner/`.
  - Edits only the todo file and its memory. Specs go through `/arcade-game-spec`, then `/spec-impl`.
- `mobile-porter` (`.claude/agents/mobile-porter.md`): ports a newly added game to phones. Use it only after a new game is added, never for the existing four.
  - Reuses `lib/touch/` and the touch components. Phone-only code is gated on `(pointer: coarse)`.
  - Memory: `.claude/agent-memory/mobile-porter/`.
  - Edits only the new game's files and its entry in the shared touch layout. Larger changes go through `/spec`.

## Tooling and hooks

- **Format hook:** `.claude/settings.json` registers a `PostToolUse` hook on `Edit|MultiEdit|Write` that runs `scripts/format-hook.sh`. It runs Prettier on every file Prettier can parse, strips trailing whitespace on other non-Markdown files, then runs `eslint --fix` on JS/TS files. Lint errors come back to Claude with exit code 2. Do not hand-format files to fight it.
- **MCP servers:** `.mcp.json` configures the `supabase` HTTP MCP server (project-scoped to this project, enabled in `.claude/settings.local.json`). Use it for `apply_migration`, `execute_sql`, `list_tables`, and advisors. Playwright and Context7 MCP are user-level, not in this repo. Save Playwright screenshots to `.playwright-screenshots/`.
- **`references/`:** design and game source material, not app code. `templates/` holds the original JSX/CSS prototype that the UI was ported from, `started-games/` holds starter material for Asteroids, Tetris, and Arkanoid, and `source-assets/` holds the Snake fruit sprite sheet and atlas data.

## Architecture

- **Router:** App Router only. Routes live in `app/`: `/` (home), `/games`, `/games/[id]`, `/games/[id]/play`, `/hall-of-fame`, `/about`, and `/auth`. API routes are under `app/api/` (`contact`, `games`, `games/[id]`, `scores`, `supabase/health`). `layout.tsx` is the root layout. There is no `pages/` directory.
- **Styling:** The template CSS is ported verbatim into `app/arcade.css`, imported from `app/layout.tsx`, with the original class names. `app/globals.css` only imports `tailwindcss`. The app is dark-only, with no light theme. Tailwind is compiled through the `@tailwindcss/turbopack` loader configured in `next.config.ts` under `turbopack.rules`, so keep that config when changing CSS handling. The `prefers-reduced-motion` overrides are at the end of `app/arcade.css`.
- **Fonts:** `Press Start 2P`, `Courier Prime`, and `JetBrains Mono` are loaded with `next/font/google` in `app/layout.tsx`, exposed as `--font-pixel`, `--font-courier`, and `--font-mono`. `app/arcade.css` maps `--pixel` and `--mono` to them.
- **Path alias:** `@/*` resolves to the repo root (`tsconfig.json`).
- **Experimental Next.js flags** in `next.config.ts`: `experimental.agentFeedback`, `cacheComponents`, and `partialPrefetching` are enabled. Account for them when changing caching, data fetching, or prefetching behavior.
- **Metadata:** `app/layout.tsx` exports the title `Arcade Vault` and the README description.
- **Mock auth:** `components/auth-provider.tsx` provides `AuthProvider` and the `useAuth()` hook (`user`, `signIn`, `signOut`). It is mock sign-in only: it stores `{ name }` in `localStorage` under `av_user`, with no passwords, sessions, or server records. It reads storage through `useSyncExternalStore` with a `null` server snapshot, so server render and hydration are always signed out. Components that need the user name should call `useAuth()`, not read `localStorage` directly.
- **Contact form:** The About form in `components/about.tsx` posts JSON to `POST /api/contact` (`app/api/contact/route.ts`), the only server code path for the form. The route validates with `lib/contact.ts` and sends one plain-text email through Resend (`resend` package, client created per request). Env vars, all server-only and never `NEXT_PUBLIC_`: `RESEND_API_KEY` (secret, in `.env.local`), `CONTACT_TO_EMAIL` (inbox; must be the Resend account owner's address while the test sender `onboarding@resend.dev` is used), and `CONTACT_FROM_EMAIL` (optional, defaults to the test sender). `.env.example` documents them; `.gitignore` keeps `.env*` ignored except `.env.example`. Messages are not stored anywhere. See `specs/03-about-contact-email.md`.
- **Supabase:** `@supabase/supabase-js` is installed. `lib/supabase/client.ts` (`createBrowserSupabase()`) is the browser client. `lib/supabase/server.ts` (`getSupabaseConfig()`, `createServerSupabase()`, `checkSupabaseHealth()`) is the server helper, used only by route handlers and by the server components under `app/games/[id]/`. Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public by design (the `NEXT_PUBLIC_` exception to the Resend rule above). `GET /api/supabase/health` returns `{ "ok": true }` or a `500` with `error` set to `config` or `unreachable`. The mock sign-in is unchanged. See `specs/04-supabase-integration.md`.
- **Game catalog and leaderboard:** Two tables in `public`, both with Row Level Security. `games` holds the ten games and their `plays` counter (the counter is incremented by the trigger `scores_bump_game_plays`). `scores` holds one row per submitted score. Anonymous callers (the publishable key) can read both tables and can insert into `scores` only. Migrations are in `supabase/migrations/` and are applied with the Supabase MCP `apply_migration` tool. Routes: `GET /api/games`, `GET /api/games/[id]`, `GET /api/scores?game=&limit=&name=`, and `POST /api/scores`. Only the real games submit scores: `asteroids`, `tetris`, `arkanoid`, and `snake`, the four entries in the registry `lib/games-registry.ts`. Migrations `0003` and `0004` added Tetris and Arkanoid, and `0005` moved `serpentine` to `snake`. The `av_scores` localStorage key is no longer used. Client components read the data with `useGames()` (`lib/use-games.ts`) and `useScores()` (`lib/use-scores.ts`). Domain types and validation are in `lib/leaderboard.ts`. See `specs/06-leaderboard-and-game-database.md`.
- **Asteroids engine:** `lib/asteroids/` holds the pure game logic (`types.ts`, `constants.ts`, `engine.ts`), the canvas drawing (`render.ts`), and the keyboard tracker (`input.ts`). The engine has no DOM, React, or Next imports, and `input.ts` attaches to `window` only from a client effect. `components/asteroids-game.tsx` is the client canvas component that runs the loop. The real games run inside the existing player in `components/game-player.tsx`. `lib/games-registry.ts` maps each real game id to its client component and its HUD mapping. Every other game keeps the fake ticker. See `specs/05-asteroids-game.md`.
- **Tetris engine:** `lib/tetris/` holds the pure game logic (`types.ts`, `constants.ts`, `engine.ts`), the canvas drawing (`render.ts`), the four skins (`skins.ts`), and the keyboard tracker (`input.ts`). Like the Asteroids engine, it has no DOM, React, or Next imports, and `input.ts` attaches to `window` only from a client effect. `components/tetris-game.tsx` is the client canvas component. It owns the SKIN select, which saves the choice under the `localStorage` key `tetris-skin`. See `specs/07-tetris-game.md`.
- **Arkanoid engine:** `lib/arkanoid/` holds the pure game logic (`types.ts`, `constants.ts`, `levels.ts`, `engine.ts`), the canvas drawing and sprite loader (`render.ts`), and the keyboard tracker (`input.ts`). The engine has no DOM, React, or Next imports. The engine emits `bounce` and `break` sound events, and the component plays them. `components/arkanoid-game.tsx` is the client canvas component. It reads the mouse position itself and passes it to the engine as `pointerX`. The sprite sheet and sounds are in `public/arkanoid/` and are served from `/arkanoid/`. See `specs/08-arkanoid-game.md`.
- **Snake engine:** `lib/snake/` holds the pure game logic (`types.ts`, `constants.ts`, `engine.ts`), the canvas drawing (`render.ts`), the fruit sprite atlas (`atlas.ts`, typed data from `sprites.js`), and the keyboard tracker (`input.ts`). The engine has no DOM, React, or Next imports. `components/snake-game.tsx` is the client canvas component. It loads the sprite sheet from `public/snake/fruits.png` (served from `/snake/fruits.png`) in an effect and draws a fallback until it loads. The catalog id is `snake`, and its `games` row was moved from `serpentine` by migration `0005_move_serpentine_to_snake.sql`. See `specs/09-snake-game.md`.
- **Phone controls (SPEC 10):** `lib/touch/` holds the touch state (`controls.ts`: held keys and one-shot presses for up, down, left, right, a, b) and the coarse-pointer helpers (`coarse.ts`). `components/touch-dpad.tsx` draws the D-pad and round B and A buttons below the CRT frame, with unused keys dimmed. `components/touch-bar.tsx` draws the bottom bar (PAUSE, EXIT and the SKIN slot). `components/game-player.tsx` shows both on coarse pointers for the four real games, passes the touch state and `skinSlot` to each game, clears the touch state on pause and window blur, and sets `av-play-touch` on the body so the navbar and footer are hidden. Each real game merges the touch state with its keyboard input, and renders its SKIN select into the slot through a portal. The Arkanoid D-pad sets the optional `paddleSpeed` (720 px/s). Snake A sets the optional `boost`. Fine-pointer devices see no change.

## Spec-driven design workflow

Features are built spec-first. The project uses the skills from `Klerith/fernando-skills` for spec-driven design, specifically `/spec` to write a spec and `/spec-impl` to implement from it (see README.md). For new feature work, produce or update the spec with `/spec` before writing implementation code, and use `/spec-impl` to build from that spec. For a new playable game, use `/arcade-game-spec` instead of `/spec`.

Specs are in `specs/`, numbered `01` to `10` (MVP, home and About pages, contact email, Supabase, Asteroids, leaderboard and game database, Tetris, Arkanoid, Snake, touch D-pad). Each game spec has acceptance criteria, which are checked off when verified, and a status field that is set to implemented when done. Each shipped spec also gets a matching Architecture entry in this file. Work goes on a `spec-NN-<name>` branch and merges by pull request.
