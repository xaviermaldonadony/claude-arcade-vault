# SPEC 06 — Leaderboard and game database in Supabase

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 05
> **Date:** 2026-11-22
> **Objective:** Store the game catalog and the scores of the Asteroids game in Supabase, and show the Hall of Fame, the game pages and the home and library lists from those tables instead of the mock data in `lib/data.ts`.

## Why this spec exists

SPEC 04 connected the app to Supabase but created no tables. SPEC 05 made Asteroids produce a real score, which is still saved only to `localStorage` under `av_scores`, and the Hall of Fame still shows `seededScores`. A leaderboard needs one shared store that every visitor reads, so scores and the game list move to Supabase together. The game list moves in the same spec because the leaderboard, the play page and the game pages all key off the game id.

## Scope

**In:**

- A `games` table holding the eight games now in `GAMES` in `lib/data.ts`, seeded by a migration with the same ids and display fields.
- A `scores` table holding one row per submitted score, with the game id, a player name, and the score.
- Row Level Security on both tables. Anonymous callers (the publishable key) may read both tables and insert into `scores` only.
- A trigger that increments `games.plays` on each insert into `scores`.
- Route handlers: `GET /api/games`, `GET /api/games/[id]`, `GET /api/scores`, `POST /api/scores`.
- A server Supabase client helper in `lib/supabase/server.ts`, used by route handlers only.
- Score submission from the Asteroids game only, through `POST /api/scores`, from the existing SAVE SCORE button.
- Client-side loading of the game list in the home page, the library, the game detail page, the play page and the Hall of Fame.
- The Hall of Fame shows the top 12 scores per game, and a "YOUR BEST" row when a mock user is signed in.
- The game detail page shows the top 10 scores for that game.
- Removal of `GAMES`, `seededScores` and the `ScoreRow` type from `lib/data.ts`.
- Update of `CLAUDE.md` Architecture: the tables now exist, and the leaderboard routes are listed.
- Migration files committed under `supabase/migrations/`, applied to the remote Supabase project with the Supabase MCP `apply_migration` tool.

**Out of scope (for future specs):**

- Real accounts. Supabase Auth, sessions, `@supabase/ssr`, and linking a score to a user id. The player name stays what the player typed, as in SPEC 05.
- Anti-cheat beyond basic bounds. No signing, no replay validation, no rate limiting.
- Scores for the fake-ticker games (every game except Asteroids). They are not submitted and not ranked.
- Import of the old `av_scores` data from `localStorage`. The key is no longer written or read.
- Home page activity feed, top players, stats and pricing blocks. They stay the static mock data from SPEC 02.
- Pagination, a full ranking page, and search in the leaderboard.
- Editing or deleting scores, and any admin screen.
- Realtime subscriptions. The leaderboard loads once per page view.
- Edge Functions, a service role key, and any server-side secret beyond the two `NEXT_PUBLIC_SUPABASE_*` values.
- Changes to the health route `GET /api/supabase/health` and to the contact form.
- Changes to the Asteroids engine (`lib/asteroids/`) and its rendering.
- Tests. The repo has no test runner (see `CLAUDE.md`).

## Data model

Tables live in the `public` schema of the Supabase project. Types are Postgres types; the TypeScript shapes are in `lib/leaderboard.ts`.

```sql
-- supabase/migrations/0001_games_and_scores.sql (shape only)
create table public.games (
  id text primary key,            -- URL slug, e.g. 'block-buster'
  title text not null,            -- uppercase display name
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,            -- CSS class name, e.g. 'cover-bricks'
  color text not null check (color in ('cyan','magenta','yellow','green')),
  plays integer not null default 0 check (plays >= 0)
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  name text not null check (char_length(name) between 1 and 10),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
```

Field notes:

- `games.best` is not stored. It is the maximum `scores.score` for the game, computed when the API reads it. It is `0` when the game has no scores.
- `games.plays` is a counter. It starts at `0` for every game. The mock values such as `"12.4K"` are dropped.
- `scores.name` is stored uppercase, trimmed, at most 10 characters. An empty name is stored as `GUEST`.
- `scores.score` is an integer from 0 to 10,000,000 (the cap is a decision, see Decisions).

Trigger, run as the table owner so it bypasses RLS on `games`:

- `after insert on public.scores`: `update public.games set plays = plays + 1 where id = new.game_id`.

RLS policies (RLS enabled on both tables):

- `games`: `select` for role `anon` and `authenticated`, `using (true)`. No insert, update or delete policy.
- `scores`: `select` for `anon` and `authenticated`, `using (true)`. `insert` for `anon` and `authenticated`, `with check (true)`, with the column checks above doing the validation. No update or delete policy.

Seed data: the migration inserts the eight rows of `GAMES` from `lib/data.ts` (`block-buster`, `fall`, `serpentine`, `glutton`, `invaders`, `asteroids`, `frogrun`, `pixel-duel`), with the same `title`, `short`, `long`, `cat`, `cover`, `color` values. `plays` is `0`.

TypeScript shapes in `lib/leaderboard.ts`:

```ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  best: number; // max score, 0 when none
  plays: number; // integer counter
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: 'DD/MM/YYYY' from created_at

export type YourBest = { rank: number; score: number; date: string } | null;

export type ScoreSubmit = { game: string; name: string; score: number };
```

`Game` is exported from `lib/leaderboard.ts`. `lib/data.ts` keeps its static home, about and pricing data and no longer exports `GAMES`, `seededScores` or `ScoreRow`. Components that import `Game` from `lib/data.ts` change their import to `lib/leaderboard.ts`.

Route contracts (all responses are JSON, all use `Cache-Control: no-store`):

- `GET /api/games` → `200` `{ "games": Game[] }`, ordered by `title`. `500` `{ "error": "unavailable" }` when Supabase fails or config is missing.
- `GET /api/games/[id]` → `200` `{ "game": Game }`. `404` `{ "error": "not_found" }` for an unknown id. `500` `{ "error": "unavailable" }`.
- `GET /api/scores?game=<id>&limit=<n>&name=<name>` → `200` `{ "rows": ScoreRow[], "you": YourBest }`. `limit` defaults to 12 and is capped at 50. `name` is optional; when present, `you` is the best score of that name in that game, with its rank among all scores, else `you` is `null`. `400` `{ "error": "bad_request" }` for an unknown game or a bad limit. `500` `{ "error": "unavailable" }`.
- `POST /api/scores` with JSON body `{ game, name, score }` → `201` `{ "ok": true }`. `400` `{ "error": "bad_request" }` when validation fails (see Implementation plan, step 4). `500` `{ "error": "unavailable" }`.

Ranking: rows are ordered by `score` descending, then `created_at` ascending, so the earlier of two equal scores ranks higher. `rank` is the 1-based position in that order.

Environment: no new env vars. The server helper reuses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from SPEC 04.

## Implementation plan

1. **Migration.** Create `supabase/migrations/0001_games_and_scores.sql` with both tables, the index, the RLS policies, the trigger and the eight seed rows. Apply it to the remote project with the Supabase MCP `apply_migration` tool. Verify with `list_tables` that both tables exist with RLS enabled, and with `execute_sql` that `select count(*) from games` returns `8`. Verify that the old health route still returns `200` with `{"ok":true}`.
2. **Server client and domain module.** Add `createServerSupabase()` to `lib/supabase/server.ts`. It returns a `createClient` instance from `@supabase/supabase-js` with the publishable key, or throws an `Error` naming the missing env var. Create `lib/leaderboard.ts` with the types above and pure functions: `validateScoreSubmit(body: unknown): { ok: true; value: ScoreSubmit } | { ok: false }`, `normalizeName(raw: string): string`, `formatPlays(n: number): string` (`12400` → `"12.4K"`), and `formatScoreDate(iso: string): string`. Nothing imports them yet. Verify with `npx tsc --noEmit`.
3. **Game routes.** Create `app/api/games/route.ts` (`GET`) and `app/api/games/[id]/route.ts` (`GET`). Each reads from `games` and computes `best` from `scores`. Verify with `curl -i http://localhost:3000/api/games` (8 items) and `curl -i http://localhost:3000/api/games/nope` (`404`).
4. **Score routes.** Create `app/api/scores/route.ts` with `GET` and `POST`. `POST` runs `validateScoreSubmit`: `game` must be an existing id in `games`, `name` is normalized, `score` must be an integer from 0 to 10,000,000. Then it inserts one row. `GET` implements the contract above. Verify with `curl` as listed in Acceptance criteria.
5. **Client data hook.** Create `lib/use-games.ts`, a client hook `useGames()` that returns `{ games, status }` with `status` as `'loading' | 'ready' | 'error'`, fetching `GET /api/games` once per mount. Create `lib/use-scores.ts`, a client hook `useScores(gameId, { limit, name })` with the same status shape. Nothing else changes in this step.
6. **Home and library.** Replace `GAMES` with `useGames()` in `components/home.tsx` (the games preview shows the first 6 games when ready) and in `components/library.tsx` (the category filter runs on the loaded list). Loading shows a `LOADING` line in the existing pixel style. Error shows `GAMES UNAVAILABLE`. Verify in the browser that `/` and `/games` list the eight games and that the category chips still filter.
7. **Game detail page.** In `app/games/[id]/page.tsx`, remove `generateStaticParams` and the `instant` export. Keep the page a server component with dynamic rendering: it reads the `games` row by id with the server Supabase helper and calls `notFound()` when it is missing, so unknown ids return HTTP `404`. Move the rest of the page body into a client component `components/game-detail.tsx`, which receives the game as a prop and calls `GET /api/scores?game=<id>&limit=10`. Verify with `/games/fall` (real data, top 10 rows) and `/games/nope` (HTTP `404`, Next.js not-found page).
8. **Play page and submission.** Change `app/games/[id]/play/page.tsx` to a client component that loads the game with `GET /api/games/[id]` and renders `GamePlayer` when ready. In `components/game-player.tsx`: remove every read and write of `av_scores` and the `SavedScore` type. For `asteroids`, the game-over modal's SAVE SCORE button calls `POST /api/scores`. While the request is open, the button shows `SAVING`. On `201`, the modal shows `SCORE SAVED`. On any failure, the modal shows `COULD NOT SAVE. TRY AGAIN` and keeps the name and score, and the button sends the request again. For the other games, the game-over modal shows `NOT RANKED YET` in place of the name input and the SAVE button. The PLAY AGAIN and BACK TO THE VAULT buttons keep working in every state.
9. **Hall of Fame.** Replace the tabs source with `useGames()`. Replace `seededScores` with `useScores(tab, { limit: 12, name: user?.name })`. Podium and table show real rows. The YOUR BEST row appears only when `user` is set and `you` is not `null`, and shows `you.rank`, `you.score` and `you.date`. When `rows` is empty the table shows `NO SCORES YET`. The name is compared uppercase, so `user.name` is sent uppercase.
10. **Remove mock game data.** Delete `GAMES`, `seededScores`, `ScoreRow` and the `PLAYERS` list from `lib/data.ts`, keeping the home, about and pricing data. Move the `Game` type import in `components/game-card.tsx` and the other importers to `lib/leaderboard.ts`. Verify with `grep -rn "GAMES\|seededScores\|av_scores" app components lib` that nothing matches, and `npx tsc --noEmit` exits 0.
11. **Docs.** Update the Supabase paragraph in `CLAUDE.md` Architecture: the two tables exist, the RLS rule, the four routes, and that `av_scores` is no longer used. Do not touch the `AGENTS.md` block. Do not edit SPEC 01 to 05.

Every step leaves `npm run dev` running with every route rendering. Step 1 changes the remote database only. Steps 2 to 5 add code that nothing uses yet. Steps 6 to 10 switch the UI to the new data one screen at a time.

## Acceptance criteria

- [ ] `supabase/migrations/0001_games_and_scores.sql` and `supabase/migrations/0002_anon_table_grants.sql` exist, and they are the only migration files in `supabase/migrations/`.
- [ ] `list_tables` shows `public.games` and `public.scores` with RLS enabled on both.
- [ ] `execute_sql` `select count(*) from public.games` returns `8`, and the eight ids match the ids listed in the Data model.
- [ ] `npm run build` exits 0 with no changes to the existing env vars.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `curl -i http://localhost:3000/api/games` returns `200` and a body with 8 items in `games`.
- [ ] `curl -i http://localhost:3000/api/games/fall` returns `200`, and `curl -i http://localhost:3000/api/games/nope` returns `404` with `{"error":"not_found"}`.
- [ ] `curl -i -X POST` with body `{"game":"asteroids","name":"ace","score":1500}` returns `201` and `{"ok":true}`. A following `GET /api/games/asteroids` shows `plays` increased by 1 and `best` at least `1500`.
- [ ] `POST` with `score` set to `-1`, `1.5`, `"12"`, or `10000001` returns `400`. `POST` with `game` set to `nope` returns `400`. A `POST` with a `name` longer than 10 characters stores the first 10 characters, uppercase. An empty `name` stores `GUEST`.
- [ ] `GET /api/scores?game=asteroids&limit=12` returns at most 12 rows sorted by score descending. `limit=51` returns `400`.
- [ ] With the publishable key and no session, a direct `curl` insert into `scores` through the Supabase REST API succeeds, and a direct `curl` update or delete on `scores` affects 0 rows or returns an error.
- [ ] With the publishable key and no session, a direct `curl` insert into `games` is rejected.
- [ ] Setting `NEXT_PUBLIC_SUPABASE_URL` to `http://127.0.0.1:1` and calling `GET /api/games` returns `500` with `{"error":"unavailable"}` within 6 seconds.
- [ ] `/` shows the first 6 games from the database, and `/games` shows all 8 and the category chips filter them.
- [ ] `/games/fall` shows up to 10 real score rows. `/games/nope` returns HTTP `404`, verified with `curl -i`.
- [ ] `/games/asteroids/play`: a finished game opens the game-over modal, SAVE SCORE shows `SAVING`, and then `SCORE SAVED`. A new row appears in `scores` for that name and score.
- [ ] With the network blocked in devtools, SAVE SCORE shows `COULD NOT SAVE. TRY AGAIN`, keeps the name and score, and succeeds after the network returns.
- [ ] `/games/fall/play` shows the game-over modal with `NOT RANKED YET` and no SAVE button, and no request to `/api/scores` is sent.
- [ ] `/hall-of-fame` lists real rows for the selected tab. Changing the tab requests that game's rows.
- [ ] With a mock user signed in, `/hall-of-fame` shows the YOUR BEST row with that name's best score in the tab's game, and the row is hidden for a game the name has not played.
- [ ] `grep -rn "GAMES\|seededScores\|av_scores" app components lib` returns no matches.
- [ ] `localStorage` has no `av_scores` key written after a game-over save.
- [ ] `/`, `/games`, `/games/fall`, `/hall-of-fame` and `/games/asteroids/play` render with no console errors and no React hydration warning in the dev server.
- [ ] The health route `GET /api/supabase/health` still returns `200` with `{"ok":true}` when the env vars are set.
- [ ] `CLAUDE.md` Architecture describes the two tables, the RLS rule and the four routes, and the `AGENTS.md` block is unchanged.
- [ ] SPEC 01 to 05 are unchanged in git (`git diff --stat specs/0[1-5]*` is empty).

## Decisions

- **Yes:** Scope is scores, leaderboard and the games table, as asked. The games list moves to Supabase in this spec, not in a later one.
- **Yes:** Scores are written through `POST /api/scores`. The route validates the body and inserts with the publishable key. This matches SPEC 03's route pattern.
- **Yes:** Only the Asteroids game submits scores. The other games are fake tickers, and their numbers are random, so ranking them would rank noise.
- **Yes:** `av_scores` is no longer written or read. Old local scores stay in the browser and are not imported. Nothing is deleted from `localStorage`.
- **Yes:** Game list is read through `GET /api/games` from client components. Server components do not query the database, which avoids cacheComponents caching rules for this data.
- **Yes:** `lib/data.ts` loses `GAMES` and `seededScores`. A single source of truth is the `games` table.
- **Yes:** All readers of the game list move to the database: home, library, game detail, play page, and Hall of Fame.
- **Yes:** `best` is computed from `scores`, not stored. `plays` is a counter incremented by a trigger. Both are real data from this spec on.
- **Yes:** RLS with the publishable key. Anonymous callers can read both tables and insert into `scores` only, with column checks doing the validation. This keeps SPEC 04's decision of no service role key.
- **Yes:** Scores are capped at 10,000,000 for every game. Quick decision, not confirmed in the question phase: the cap is a single constant in the migration check and in `lib/leaderboard.ts`, and it can be changed per game in a later spec.
- **Yes:** Names are uppercase, at most 10 characters, and an empty name is stored as `GUEST`, matching the current `game-player.tsx` behaviour. Quick decision, not confirmed in the question phase.
- **Yes:** Ties are ordered by the earlier `created_at` first. Quick decision, not confirmed in the question phase.
- **Yes:** Game detail page shows the top 10, and the Hall of Fame shows the top 12, as today. Quick decision, not confirmed in the question phase.
- **Yes:** An unknown `/games/[id]` returns a real HTTP `404`, as in SPEC 01 and SPEC 02. The page stays a server component. It reads the one `games` row with the server Supabase helper at request time, and calls `notFound()` when the row is missing. Scores and the rest of the detail UI stay in the client component. Reason: a `200` for a missing resource is wrong, and the server read keeps the existing behaviour. Quick decision, not confirmed.
- **Yes:** The migration seeds `plays` at `0`. The mock play counts (`"12.4K"`, etc.) are dropped. Quick decision, not confirmed.
- **Yes:** Migrations live in `supabase/migrations/` and are applied with the Supabase MCP `apply_migration` tool. This is the first `supabase/` folder in the repo. SPEC 04 said no such folder would exist yet, and that rule ends here.
- **Yes:** Table grants are a separate migration, `0002_anon_table_grants.sql`. Step 1 created the tables and RLS policies without `GRANT SELECT` for anon, so the publishable key got `permission denied` before RLS was checked. `0001` is already applied remotely, so it was not edited.
- **Yes:** The trigger function is `SECURITY DEFINER`, not "run as the table owner" as the Data model said. A plain trigger runs as the caller (anon), who has no update policy on `games`.
- **No:** Supabase Auth and linking scores to users. The mock sign-in stays until an auth spec.
- **No:** Anti-cheat beyond bounds. Signing or server-side replay would be a larger spec.
- **No:** Edge Functions and database functions called over RPC. The trigger covers the only write-side side effect.
- **No:** Realtime. A page view loads the data once.
- **No:** Importing `av_scores` from `localStorage`. The user chose to leave old local data alone.
- **No:** Changes to the Asteroids engine or to the fake-ticker games.

## Identified risks

| Risk                                                                            | Mitigation                                                                                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anyone with the publishable key can post any score up to the cap.               | Accepted for this spec. Bounds limit the damage. Anti-cheat is a named future spec.                                                                                |
| Anyone can post scores under any name, including someone else's.                | Accepted. Names are not identities until auth exists. The YOUR BEST row is a display convenience, not a claim.                                                     |
| Migration applied to the remote project before the code that uses it is merged. | Step 1 only adds tables and seed rows. Old code ignores them, so the app keeps working.                                                                            |
| Ordering of `plays` increments under concurrent inserts.                        | The trigger runs `plays = plays + 1` in one statement, so concurrent inserts do not lose increments.                                                               |
| The Hall of Fame and detail pages show an empty state until the first score.    | `NO SCORES YET` is shown explicitly, so an empty board is not mistaken for an error.                                                                               |
| Supabase unreachable on home or library.                                        | Both show `GAMES UNAVAILABLE` and no crash. The rest of the page still renders.                                                                                    |
| Score POST retried after a timeout creates a duplicate row.                     | Accepted for now. The button is disabled while `SAVING`, and a retry happens only after an error. A duplicate is visible in the table and does not break anything. |

## What is **not** in this spec

- Real accounts and linking scores to user ids.
- Anti-cheat beyond bounds.
- Scores for the fake-ticker games.
- Importing old `localStorage` scores.
- Editing, deleting or moderating scores.
- Pagination, search, and a full ranking page.
- Realtime updates.
- Changes to the home page's mock activity, top players, stats and pricing blocks.
- Changes to the health route and the contact form.

Each one of those, if it lands, goes in its own spec.
