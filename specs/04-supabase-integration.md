# SPEC 04 — Supabase integration: client and health route

> **Status:** Approved
> **Depends on:** SPEC 03
> **Date:** 2026-11-21
> **Objective:** Connect the Next.js app to the Supabase project with a browser client, a server client, and a `GET /api/supabase/health` route that confirms the project is reachable, without creating any table or changing any existing feature.

## Why this spec exists

The project has Supabase MCP configured (`.mcp.json`) and two Supabase lines in `.env.example`, but the app does not use Supabase yet. Real data storage (scores, messages, accounts) needs a working connection first. This spec builds only that connection, so each later data spec can start from a verified base. Schema, persistence, and auth are deliberately left to later specs.

## Scope

**In:**

- Add the `@supabase/supabase-js` npm package.
- Two env vars, both safe for the browser: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Documented in `.env.example` with placeholder values.
- A browser client helper in `lib/supabase/client.ts`.
- A server client helper in `lib/supabase/server.ts`, used by route handlers only.
- A route handler `GET /api/supabase/health` that checks that the project answers and returns a small JSON result.
- One short paragraph in `CLAUDE.md` Architecture about the Supabase setup.
- Manual checks with `curl` and the dev server.

**Out of scope (for future specs):**

- Any table, view, function, migration, or seed data. No `supabase/` folder is created. No schema is created in the Supabase project.
- Any change to how scores are saved or read. `localStorage` key `av_scores` is not touched: it keeps being written as in SPEC 01, and its migration is left to a future spec.
- Any change to the mock sign-in (`av_user`, `components/auth-provider.tsx`). Supabase Auth, sessions, and `@supabase/ssr` cookie handling come in a later auth spec.
- Storing contact messages. SPEC 03 stays as it is: Resend email, nothing stored.
- Row Level Security policies, because there are no tables yet.
- The service role key. It is not added to any file.
- Realtime, Storage buckets, Edge Functions, and Supabase CLI local stack.
- Any change to `SUPABASE_DB_PASSWORD` in `.env.example`. The user has already rotated the password, and the line stays as it is.
- Any UI change. No page, component, or nav item shows Supabase data or status.
- Tests. The repo has no test runner (see `CLAUDE.md`).

## Data model

This feature introduces no new database structures. It adds one TypeScript type for the health result, in `lib/supabase/server.ts`.

```ts
// lib/supabase/server.ts
export type SupabaseConfig = {
  url: string; // NEXT_PUBLIC_SUPABASE_URL, trimmed, no trailing slash
  publishableKey: string; // NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, trimmed
};

export type HealthResult = { ok: true } | { ok: false; error: 'config' | 'unreachable' };
```

Env vars:

| Name                                   | Required | Visible to browser | Value                                                               |
| -------------------------------------- | -------- | ------------------ | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | yes                | Project API URL, `https://<project-ref>.supabase.co`. Not a secret. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | yes                | Publishable key from the Supabase dashboard. Public by design.      |

The `NEXT_PUBLIC_` prefix is correct for these two values. The SPEC 03 rule that no env var uses `NEXT_PUBLIC_` still applies to `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL`. This spec does not change those.

Route response, `GET /api/supabase/health`:

- `200` `{ "ok": true }`: both env vars are set and the project answered with a 2xx status.
- `500` `{ "ok": false, "error": "config" }`: one of the two env vars is missing or empty.
- `500` `{ "ok": false, "error": "unreachable" }`: the request to the project failed, returned a non-2xx status, or timed out after 5 seconds.

The response never contains the URL or the key.

Health check request: `GET <url>/auth/v1/health` with header `apikey: <publishable key>`. This endpoint needs no table and no login. The exact path is confirmed in the Supabase docs via Context7 before the route is written.

No new `localStorage` keys. No new cookies.

## Implementation plan

1. **Dependency.** Run `npm install @supabase/supabase-js`. Verify `npm run build` and `npx tsc --noEmit` still exit 0 with no Supabase env vars set. Verify `package.json` lists the package under `dependencies`.
2. **Env template.** Add `NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here` to `.env.example`, with a comment that both are public and the values go in `.env.local`. Verify with `git ls-files .env.example` and `git status` that `.env.local` is still not tracked. Leave `SUPABASE_DB_PASSWORD` as it is.
3. **Browser client.** Create `lib/supabase/client.ts` exporting `createBrowserSupabase()`. It reads the two `NEXT_PUBLIC_` vars at call time and returns a `createClient` instance. If a var is missing, it throws an `Error` with the var name, not the value. Nothing imports it yet. Verify with `npx tsc --noEmit` and `npm run build` with the vars unset (the module is not executed at build time).
4. **Server client and config.** Create `lib/supabase/server.ts` exporting `getSupabaseConfig(): SupabaseConfig | null` (returns `null` when a var is missing or empty) and `checkSupabaseHealth(): Promise<HealthResult>`. `checkSupabaseHealth` calls the health endpoint with `fetch`, a 5-second `AbortSignal.timeout`, and the `apikey` header. It returns `{ ok: true }` on a 2xx status and `{ ok: false, error: 'unreachable' }` otherwise. It never logs or returns the URL or key. Verify with `npx tsc --noEmit`.
5. **Health route.** Create `app/api/supabase/health/route.ts` exporting `GET`. It calls `checkSupabaseHealth()` and returns the `HealthResult` as JSON with status `200` or `500`, as in the Data model. Before writing it, read the route handler and request-time rendering guides in `node_modules/next/dist/docs/` as `AGENTS.md` requires. With `cacheComponents` enabled, the route must read the environment and the network at request time, not at build time. Verify with `npm run build` that the route is listed as dynamic (`ƒ`) in the build output.
6. **Docs.** Add one short paragraph to `CLAUDE.md` Architecture: the browser and server helpers in `lib/supabase/`, the two `NEXT_PUBLIC_SUPABASE_*` vars, the health route, and that no tables exist yet. Do not touch the `AGENTS.md` block. Do not edit SPEC 01, 02, or 03.
7. **Environment check.** The user puts the real URL and publishable key in `.env.local`. Restart `npm run dev`. Run the checks in the acceptance criteria with `curl`. Then load `/`, `/games`, `/about`, and `/hall-of-fame` in the browser to confirm nothing changed visually.

Every step leaves `npm run dev` running with every route rendering. Steps 1 to 4 change no visible UI. Step 5 adds an API route only.

## Acceptance criteria

- [ ] `npm run build` exits 0 with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` unset.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `package.json` lists `@supabase/supabase-js` under `dependencies`, and no other `@supabase/*` package is added.
- [ ] `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with placeholder values only. `git grep` for the real publishable key value finds nothing in tracked files.
- [ ] `SUPABASE_DB_PASSWORD` is still present in `.env.example`, unchanged.
- [ ] With both vars set to valid values in `.env.local`, `curl -i http://localhost:3000/api/supabase/health` returns `200` and body `{"ok":true}`.
- [ ] With `NEXT_PUBLIC_SUPABASE_URL` unset, the same `curl` returns `500` and body `{"ok":false,"error":"config"}`.
- [ ] With `NEXT_PUBLIC_SUPABASE_URL` set to `http://127.0.0.1:1`, the same `curl` returns `500` and body `{"ok":false,"error":"unreachable"}`, and returns within 6 seconds.
- [ ] The health response body does not contain the URL or the publishable key, checked by `grep` on the `curl` output.
- [ ] `npm run build` lists `/api/supabase/health` as dynamic (`ƒ`).
- [ ] No file under `supabase/` exists, and `git status` shows no migration or seed file.
- [ ] `av_scores` writes are unchanged: `components/game-player.tsx` has no diff in this spec.
- [ ] `/`, `/games`, `/about`, and `/hall-of-fame` render with no console errors and no React hydration warning in the dev server.
- [ ] Submitting `/about` and saving a score on the Player screen do not change any new `localStorage` key.
- [ ] `CLAUDE.md` Architecture has one new paragraph about Supabase, and the `AGENTS.md` block is unchanged.

## Decisions

- **Yes:** `@supabase/supabase-js` only. No `@supabase/ssr` yet. Without auth or cookies, the plain client is enough. `@supabase/ssr` comes with the auth spec.
- **Yes:** Server route handlers are the only server path that calls Supabase in this spec. Matches SPEC 03's route pattern and keeps request logic in one place.
- **Yes:** Browser helper exists but is not used yet. It makes the next data spec a small change, and it is checked by build and typecheck.
- **Yes:** Publishable key with `NEXT_PUBLIC_` prefix. Supabase designs this key for browsers, and Row Level Security is the real guard once tables exist.
- **No:** Service role key. It bypasses Row Level Security, and this spec has no admin task that needs it.
- **No:** Schema, migrations, or tables now. The user decided this is a future spec.
- **No:** Migrating `av_scores` now. The user decided to leave it alone until a future spec.
- **No:** Supabase Auth now. Mock sign-in in SPEC 01 stays until an auth spec.
- **Yes:** Health route checks `GET /auth/v1/health` with the publishable key. It needs no table and no login, and it proves the URL and key work together. The exact path is confirmed in the Supabase docs before implementation.
- **Yes:** Health route returns `error: 'config'` and `error: 'unreachable'` as two distinct codes, so a missing `.env.local` is easy to tell apart from a network or project problem.
- **Yes:** Health route does not return the URL or key, and does not log them. It logs nothing on success.
- **Yes:** `SUPABASE_DB_PASSWORD` stays in `.env.example`. The user rotated the password and chose to leave the line. This spec does not use a database password, so the line has no effect on the app.
- **Yes:** Guest and signed-in users are not distinguished by this spec. The health route is public, and no feature in this spec reads the user.

## Identified risks

| Risk                                                                                    | Mitigation                                                                                                            |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Health route is public and reveals that the project is up or down                       | Accepted. It returns only `ok` and an error code, no project data. Rate limiting is out of scope.                     |
| `cacheComponents` prerenders the health route at build time, so it reports stale status | Step 5 requires the route to be dynamic, checked in build output and in the `curl` results.                           |
| The publishable key is pasted into a tracked file by mistake                            | Step 2 and the `git grep` acceptance criterion check that the real key is absent from tracked files.                  |
| `SUPABASE_DB_PASSWORD` in git history is still a risk after rotation                    | The user rotated it. The line stays as the user chose. It is not read by the app.                                     |
| The health path `/auth/v1/health` changes in a future Supabase release                  | Confirm with Context7 at step 5. A future change is a one-line fix in `lib/supabase/server.ts`.                       |
| A missing `NEXT_PUBLIC_` var breaks `npm run build`                                     | Step 3 and step 4 read vars at call time, not at module load. Build check with vars unset is an acceptance criterion. |

## What is **not** in this spec

- Tables, views, functions, migrations, or seed data.
- Any change to `av_scores`, Hall of Fame data, or the Player's SAVE SCORE.
- Supabase Auth, sessions, or cookies. Mock sign-in stays.
- Storing contact messages. SPEC 03 is unchanged.
- Row Level Security policies.
- The service role key.
- Realtime, Storage, Edge Functions, or the Supabase CLI local stack.
- Any change to `SUPABASE_DB_PASSWORD` in `.env.example`.
- Tests or a test runner.
