# SPEC 01 — Arcade Vault visual MVP

> **Status:** Approved
> **Depends on:** none
> **Date:** 2026-11-19
> **Objective:** Port the five screens in `references/templates/` to Next.js App Router pages backed by mock data and a mock sign-in, with no real game logic and no real authentication.

## Why this spec exists

The templates are a single-file, in-browser Babel prototype (React 18 UMD, hash router, global `window.*` exports). The project is a Next.js 16 App Router app with React 19. This spec fixes how the prototype maps onto the project's architecture so the port does not improvise routing, styling, data handling, or sign-in.

## Scope

**In:**

- Five screens, one per template concept, as App Router routes:
  - Library (`/`), from `library.jsx`.
  - Game detail (`/games/[id]`), from `detail.jsx`.
  - Player (`/games/[id]/play`), from `player.jsx`.
  - Hall of Fame (`/hall-of-fame`), from `hall.jsx`.
  - Auth (`/auth`), from `auth.jsx`.
- Shared shell from `app.jsx` and `nav.jsx`: navbar, mobile menu, footer.
- Mock sign-in from `auth.jsx` and `app.jsx`: any non-empty or empty username signs in, sign-out, guest mode. The signed-in name shows in the nav, on the player HUD, and on Hall of Fame.
- Mock data from `data.jsx`, typed, in `lib/data.ts`.
- Port of `references/templates/styles.css` into the app, with class names kept.
- Visual effects as decided in Decisions: background grid scroll, scanlines and noise, card 3D tilt, full CRT look on the player screen, and `prefers-reduced-motion` handling.
- Fonts `Press Start 2P`, `Courier Prime`, `JetBrains Mono` via `next/font/google`.
- Player screen: fake score ticker, lives, level, pause/resume, END, game-over modal, and SAVE SCORE writing to `localStorage`.
- Update `CLAUDE.md` sections that describe styling, fonts, and metadata so they match the result.

**Out of scope (for future specs):**

- Playing any game. No input handling, no game loop, no collision logic. The arena stays the CSS animation from the template.
- Real authentication: no password checks, no hashing, no sessions, no email verification, no server-side user records. Google and GitHub buttons render and do nothing.
- A backend, API routes, or database. All game and score data is static mock data.
- Reading saved scores back into Library, Detail, or Hall of Fame. Saved scores are written only.
- Title flicker, blinking caret, PLAY NOW pulse, page fade-in, Hall of Fame row rise, and SAVE SCORE typewriter toast. Not selected for this MVP.
- Tests. The repo has no test runner (see `CLAUDE.md`). Adding one is a separate decision.
- Replacing the React 19 + Next.js 16 stack with the template's React 18 UMD setup.
- Any dark/light theme switching. The templates are dark-only and the project's `prefers-color-scheme` rule is removed.

## Data model

Mock game data lives in `lib/data.ts`:

```ts
export type Game = {
  id: string;          // URL slug, e.g. "block-buster"
  title: string;       // uppercase display name
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;       // CSS class name, e.g. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;        // global best score
  plays: string;       // display string, e.g. "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };
```

- `GAMES: Game[]` is the 8 entries from `data.jsx`, unchanged.
- `CATS` and `PLAYERS` are copied unchanged.
- `seededScores(seed, count)` is copied unchanged. It must stay deterministic, so server and client render the same output.

**Saved scores (written only):** `localStorage` key `av_scores`, value is a JSON array of `{ game: string, score: number, name: string, at: number }`. This is the same shape the template writes. No code reads it in this spec.

**Signed-in user (mock):** `localStorage` key `av_user`, value `{ "name": string }`. `name` is the typed username, uppercased, capped at 10 characters, with `PLAYER1` used when empty. The key is absent for guests and after sign-out. The `AuthProvider` context (`components/auth-provider.tsx`) holds `user: { name: string } | null`, `signIn(name: string)`, and `signOut()`. It reads `av_user` through `useSyncExternalStore`, with `localStorage` as the external store and a server snapshot of `null`. Server render and hydration are always signed out, so server and client markup match. After hydration the stored value is read, and `signIn` and `signOut` notify subscribers.

## Implementation plan

1. **Fonts and layout shell.** In `app/layout.tsx`, replace Geist with the three Google fonts via `next/font/google`. Expose them as `--font-pixel`, `--font-courier`, `--font-mono`. Set `metadata.title` to `Arcade Vault` and `description` to the README line. Render `Nav`, `<main>`, and the footer text `© 2026 ARCADE VAULT · MADE WITH PIXELS AND NEON · v2.6.0`. The app still renders the old home placeholder at this step.
2. **Styles.** Copy `references/templates/styles.css` to `app/arcade.css` unchanged, except that `--pixel` and `--mono` point to the `next/font` variables. Import it from `app/layout.tsx`. Append a `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` on `.av-bg::before`, `.game-arena .grid-floor`, `.game-arena .e1`, `.game-arena .e2`, `.game-arena .e3`, and `.game-arena .player-ship`; sets `transform: none` on `.card:hover`; and sets `transition: none` on `.av-mobile-panel` and `.av-mobile-backdrop`. Do not apply the classes `flicker`, `blink`, `pulse`, `fade-in`, or `slide-in`, do not apply the Hall of Fame row animation, and do not render the `toast-saved` typewriter. Those rules stay in the CSS unused. Reduce `app/globals.css` to the `tailwindcss` import, removing the scaffold's `prefers-color-scheme` variables and body rules. Keep `turbopack.rules` in `next.config.ts` unchanged.
3. **Data.** Create `lib/data.ts` with the types, `GAMES`, `CATS`, `PLAYERS`, `seededScores`. Verify with `npx tsc --noEmit`.
4. **Auth context and nav.** Create `components/auth-provider.tsx` (client) with the `AuthProvider` described in the Data model, and wrap `children` with it in `app/layout.tsx`. Create `components/nav.tsx` as a client component using `usePathname`, `useAuth`, and `next/link`. Port the logo, Library and Hall of Fame links, `CREDITS · 03` counter, the hamburger, and the mobile panel. When signed out, show a Sign In button that links to `/auth`. When signed in, show the username with `▾` as a button that calls `signOut()` and stays on the current route. The mobile panel shows `Account` when signed in and `Sign In` when not, and closes on navigation. Active state comes from the pathname: `/` and `/games/*` activate Library.
5. **Library page.** Create `components/game-card.tsx` (client, tilt on hover via inline transform, skipped when `window.matchMedia("(prefers-reduced-motion: reduce)")` matches) and `components/library.tsx` (client, search and category chips over `GAMES`). Create `app/page.tsx` rendering the hero (no `flicker` class, no blinking caret), filters, grid, and NO RESULTS state. Each card links to `/games/[id]`. The PLAY button links to `/games/[id]` too.
6. **Detail page.** Create `app/games/[id]/page.tsx` as a server component. It reads `params` (awaited, per Next 16), finds the game, and calls `notFound()` if missing. It renders the cover, tags, description, stat strip, top 10 leaderboard from `seededScores`, PLAY NOW (links to `/games/[id]/play`, no `pulse` class), and BACK TO THE VAULT (links to `/`).
7. **Player page.** Create `app/games/[id]/play/page.tsx` (server, `notFound()` on missing game) rendering `components/game-player.tsx` (client). Port the ticker, HUD, CRT frame, arena, pause overlay, and game-over modal. The player name defaults to the signed-in name, or `GUEST` for guests. It is capped at 10 characters and uppercased. SAVE SCORE appends to `av_scores` and shows `SCORE SAVED` as plain text. PLAY AGAIN resets. BACK TO THE VAULT links to `/`. EXIT links to `/games/[id]`.
8. **Hall of Fame page.** Create `app/hall-of-fame/page.tsx` and `components/hall-of-fame.tsx` (client). The tab strip renders one tab per entry in `GAMES`, in `GAMES` order (8 tabs), with the tab label as the game title. The first tab (BLOCK BUSTER) is selected on load. Selecting a tab changes the podium and table to that game's scores. Tab selection is client state only and is not stored in the URL or `localStorage`. Port the podium and table, with rows rendered without the rise animation. When signed in, render the `YOUR BEST SCORE IN <TITLE>` row below the table, with the signed-in name and the template formula (`youRank` and `youScore`) for the selected game. When signed out, do not render it.
9. **Auth page.** Create `app/auth/page.tsx` and `components/auth-form.tsx` (client). Port the card without the `fade-in` class, and the tabs (SIGN IN / CREATE ACCOUNT), fields (email shown only on CREATE ACCOUNT), submit buttons, PLAY AS GUEST, and the social buttons. Submit calls `preventDefault`, then `signIn(name)` with the normalized name (`PLAYER1` if empty), then navigates to `/`. PLAY AS GUEST navigates to `/` without calling `signIn`. Google and GitHub buttons do nothing. The email field is not validated and not stored.
10. **Docs.** Update `CLAUDE.md` sections Architecture (Styling, Fonts, Metadata, and a new note on the mock auth context) to describe `app/arcade.css`, `next/font` variables, the new metadata, and `AuthProvider`. Remove the Geist and `prefers-color-scheme` text. Do not touch the `AGENTS.md` block.

Every step leaves `npm run dev` running with every route rendering.

**UI work:** steps 4 to 9 use the `/frontend-design` skill, as `CLAUDE.md` requires for UI.

## Acceptance criteria

- [ ] `npm run build` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `/` renders the hero, the search box, the category chips, and 8 game cards.
- [ ] Typing `bl` in search leaves only BLOCK BUSTER. Typing `zzz` shows the NO RESULTS block.
- [ ] Clicking the `PUZZLE` category chip leaves only FALL.
- [ ] `/games/fall` renders the title FALL, the stat strip, and 10 leaderboard rows with ranks `#01` to `#10`.
- [ ] `/games/does-not-exist` returns the Next.js 404 page.
- [ ] `/games/fall/play` shows the score increasing about every 220 ms until PAUSE is pressed.
- [ ] PAUSE shows the PAUSED overlay. RESUME hides it and the score continues.
- [ ] END opens the GAME OVER modal showing the current score.
- [ ] As a guest, SAVE SCORE with name `KAI` writes one entry with `game: "fall"` and `name: "KAI"` to `localStorage.av_scores`, and shows SCORE SAVED.
- [ ] PLAY AGAIN resets score to 0, lives to 3, and level to 01.
- [ ] `/hall-of-fame` renders exactly 8 game tabs, one per `GAMES` entry, in `GAMES` order, with BLOCK BUSTER selected on load.
- [ ] `/hall-of-fame` renders podium slots 01, 02, 03 and a 12-row table for the selected tab.
- [ ] Clicking each game tab changes the podium and table to that game's scores, and the selected tab is highlighted.
- [ ] `/auth` shows the email field only after clicking CREATE ACCOUNT.
- [ ] Submitting `/auth` with username `kai` signs in as `KAI`: `localStorage.av_user` is `{"name":"KAI"}`, the browser lands on `/`, and the nav shows `KAI ▾`.
- [ ] Submitting `/auth` with an empty username signs in as `PLAYER1`.
- [ ] A username longer than 10 characters is stored truncated to 10 characters.
- [ ] Clicking PLAY AS GUEST navigates to `/` and does not write `av_user`.
- [ ] Clicking the signed-in name in the nav removes `av_user`, shows the Sign In button, and keeps the current route.
- [ ] After sign-in, reloading any route keeps the user signed in. During hydration, before the stored value is read, the nav shows Sign In, and no hydration warning appears in the console.
- [ ] Signed in as `KAI`, the `/games/fall/play` HUD shows `KAI` as the player, and SAVE SCORE prefills `KAI`.
- [ ] Signed in, the Hall of Fame page shows the `YOUR BEST SCORE IN <TITLE>` row for the selected tab. Signed out, that row does not appear.
- [ ] The Google and GitHub buttons on `/auth` do not navigate, write storage, or change the page.
- [ ] Below 840 px wide the nav links are hidden and the hamburger opens the side panel. Clicking a panel link navigates and closes the panel.
- [ ] The Press Start 2P, Courier Prime, and JetBrains Mono fonts are loaded from `next/font` (no `fonts.googleapis.com` `<link>` in the HTML).
- [ ] No console errors on any of the five routes in the dev server.
- [ ] Side by side with `references/templates/Arcade Vault.html` opened in a browser, each route matches it at 1280 px and 390 px wide in layout, colors, and fonts. Animation differences per Decisions are listed in the final report.
- [ ] The background grid scrolls on `/` when `prefers-reduced-motion` is not set, and is static when it is set to `reduce`.
- [ ] Scanlines and the noise overlay appear on every route.
- [ ] Hovering a game card tilts it. With `prefers-reduced-motion: reduce`, hovering does not change its transform.
- [ ] The hero title and the `INSERT COIN` line do not flicker or blink.
- [ ] PLAY NOW does not pulse.
- [ ] On `/games/[id]/play`, enemies drift and the ship bobs without reduced motion, and both are static with it.
- [ ] Hall of Fame rows appear without an animation.
- [ ] SAVE SCORE shows `SCORE SAVED` as plain text.
- [ ] With `prefers-reduced-motion: reduce`, the mobile panel and backdrop appear without a transition.
- [ ] `CLAUDE.md` no longer mentions Geist or `prefers-color-scheme`.

## Decisions

- **Yes:** App Router routes (`/`, `/games/[id]`, `/games/[id]/play`, `/hall-of-fame`, `/auth`). `CLAUDE.md` requires App Router only, and URLs and back-button work out of the box.
- **No:** Keep the template's hash router inside one page. It breaks the App Router rule and gives no real URLs.
- **Yes:** `localStorage` for `av_scores` and `av_user`. Matches the template, needs no backend, and gives SAVE SCORE and sign-in a visible effect.
- **Yes:** Mock sign-in, not real auth. Any username signs in, as in the template. Real auth needs a backend and is a separate spec. The user first said "no auth for now", then asked to add auth back. This reading is the one chosen.
- **No:** Real authentication now. It needs a backend, password storage, and sessions, all excluded from this MVP.
- **No:** Field validation on the auth form. Mock sign-in accepts any input, and validation would suggest real checks.
- **Yes:** Read `av_user` through `useSyncExternalStore` with a server snapshot of `null`, not in a lazy initializer or during the first client render. Avoids a server and client markup mismatch, and the React lint rule `set-state-in-effect` is not triggered. Changed from the original `useEffect` plan.
- **Yes:** Port `styles.css` verbatim with its class names. Keeps the visual match with the templates, which is the acceptance bar.
- **No:** Converting every class to Tailwind utilities now. Large effort, and high risk of visual drift. Can be a later spec.
- **Yes:** `next/font/google` for the three fonts. `CLAUDE.md` says Geist is loaded this way, and the same method keeps fonts self-hosted at build time.
- **No:** The `<link>` tags to Google Fonts from the template. They bypass `next/font`.
- **Yes:** Hall of Fame scores are mock data from `seededScores`, and the selected tab is client state only (no URL or storage). Persisting the tab in the URL is deferred to a later spec.
- **Yes:** Hardcoded mock data in `lib/data.ts`. There is no backend yet, and a typed module is the seam later specs will replace.
- **Yes:** Fake arena and ticker on the player screen. The templates depend on them to show the screen. They are visuals, not game logic.
- **No:** Real game logic, input handling, or a game loop. Out of scope per the request.
- **Yes:** Remove the `prefers-color-scheme` light theme. Templates are dark-only, and the project's light theme would break the neon palette.
- **Yes:** Server components for the detail and player route shells, client components for anything with state or DOM events. Keeps `seededScores` deterministic on both sides.
- **No:** Adding a test framework in this spec. `CLAUDE.md` says to add one explicitly if needed, and the user did not ask for tests.
- **Yes:** Background grid scroll, scanlines, and noise overlay on every route. The user chose to keep all three.
- **Yes:** Card 3D tilt on hover, implemented in JS. Skipped under `prefers-reduced-motion: reduce`.
- **No:** Title flicker, blinking caret, PLAY NOW pulse, page fade-in, Hall of Fame row rise, and SAVE SCORE typewriter. The user did not select them. Their CSS stays unused, and the replacements are static.
- **Yes:** Full CRT look on the player screen: scanlines, glow, drifting enemies, bobbing ship, and scrolling floor. Kept as in the template.
- **Yes:** Under `prefers-reduced-motion: reduce`, disable non-essential motion: background grid scroll, floor scroll, enemy drift, ship bob, card tilt, and mobile panel and backdrop transitions. Colors, layout, and hover color changes stay.
- **Yes (flagged):** Mobile panel slide and backdrop fade are treated as non-essential and disabled under reduced motion. They were not in the user's motion list. Revert if you want them unconditional.

## Identified risks

| Risk | Mitigation |
| --- | --- |
| `Math.random` in the player ticker or `seededScores` drift causes hydration mismatch | Ticker runs only inside `useEffect` on the client. `seededScores` is deterministic and called with a fixed seed per game. |
| `av_user` read during render causes hydration mismatch | Read through `useSyncExternalStore` with a `null` server snapshot. Server render and hydration are always signed out. |
| Google Fonts unreachable at build time breaks `next build` | `next/font` downloads fonts at build. If the build environment is offline, the build fails. |
| Template CSS assumes global `body` and `#root` styles | `app/arcade.css` is imported in `layout.tsx`. The `#root` wrapper is replaced with the Next.js body. Verified in acceptance criteria visually. |
| `usePathname` in nav forces a client boundary in the layout | Nav is a client component only. Layout stays a server component. |
| Mock sign-in is mistaken for real security | Documented in Scope and Decisions. Nothing sensitive is stored, and `av_user` holds only a display name. |

## What is **not** in this spec

- Any playable game.
- Real sign-in, password checks, sessions, OAuth, or server-side user accounts.
- A backend, API routes, or a database.
- Reading saved scores back into any screen.
- Tests or a test runner.
- Dark/light theme switching.
- Converting the CSS to Tailwind utilities.
