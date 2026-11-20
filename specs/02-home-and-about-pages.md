# SPEC 02 — Home and About pages

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-11-19
> **Objective:** Port the Home landing page and the About page with its contact form from `references/templates/home-about/` into App Router routes `/` and `/about`, translated to English, with Library moved to `/games` and mock data only.

## Why this spec exists

SPEC 01 made the Library the home route at `/`. The new template adds a landing page that becomes the site entry point, so the Library moves to `/games`. This spec amends the route and nav decisions of SPEC 01. SPEC 01 is not edited: this spec is the record of the change.

## Scope

**In:**

- Home landing page at `/`, from `home.jsx`, replacing the Library at `/`.
- Library moved from `/` to `/games`, rendered by the same `components/library.tsx` with no behavior change.
- About page at `/about`, from `about.jsx`: mission, highlights, divider, contact intro, contact form.
- Shared nav updated for the new routes: Home, Library, Hall of Fame, About, plus the existing sign-in button and counter.
- All template copy translated from Spanish to English. Layout, class names, and visual structure stay as in the template.
- Home sections, in order: hero with floating pixel silhouettes, `WHY ARCADE VAULT` features (`// 01`), `GAMES AVAILABLE NOW` mini rail (`// 02`), stats strip, `LIVE ACTIVITY` ticker and top players (`// 03`), pricing card and FAQ (`// 04`), final CTA.
- Static mock data for stats, activity rows, top players, features, highlights, pricing, and FAQ, typed, in `lib/data.ts`.
- Scroll reveal on `.reveal` elements (fade in when they enter the viewport), and the drifting silhouettes, both disabled under `prefers-reduced-motion: reduce`.
- Contact form as a client-side mock: validate, show the terminal success panel, store nothing.
- Port of the Home and About rules from `references/templates/home-about/styles.css` into `app/arcade.css`, keeping the SPEC 01 edits.

**Out of scope (for future specs):**

- Sending contact messages anywhere. No API route, no email, no storage of `name`, `email`, or `msg`.
- Spanish copy or an i18n layer. The template's Spanish is translated once, to English, in this spec.
- Real live activity, real top players, real global ranking, and reading `av_scores` on Home. The Home data is fixed mock data.
- Real pricing, payments, or accounts. `$0` is a display string.
- Pulse (`.pulse`), blinking caret (`.blink`), flicker, and the typewriter on the terminal panel. These stay out per SPEC 01 Decisions.
- Changes to the Library, Detail, Player, Hall of Fame, and Auth screens beyond their route path (Library) and nav links.
- Tests. The repo has no test runner (see `CLAUDE.md`).
- Game names that match the template's activity and feature copy but not `GAMES` (for example Tetris, Snake). Their correction is copy work for a later spec.

## Data model

Add to `lib/data.ts`. Existing types `Game` and `ScoreRow` and the `GAMES`, `CATS`, `PLAYERS`, `seededScores` exports are unchanged.

```ts
export type Tone = 'cyan' | 'magenta' | 'yellow' | 'green';

export type ActivityRow = {
  player: string;
  game: string;
  score: number;
  ago: string; // display string, e.g. "2 min ago"
  tone: Tone;
};

export type TopPlayer = {
  rank: number; // 1 to 5
  name: string;
  score: number;
};

export type Stat = {
  value: string; // e.g. "12+", "THOUSANDS"
  unit: string; // e.g. "GAMES"
  note: string; // e.g. "AND COUNTING"
};

export type Feature = {
  icon: 'GAMEPAD' | 'FREE' | 'TROPHY' | 'ROCKET';
  title: string;
  body: string;
  tone: Tone;
};
```

- `ACTIVITY: ActivityRow[]` has the 7 rows from the template.
- `TOP_PLAYERS: TopPlayer[]` has the 5 rows from the template.
- `STATS: Stat[]` has the 3 blocks from the template.
- `FEATURES: Feature[]` has the 4 cards from the template.
- `ABOUT_HIGHLIGHTS` has the 3 rows from the template, typed as `{ icon: 'HEART' | 'BROWSER' | 'PLANT'; text: string; tone: Tone }`.
- `PRICING` and `FAQ` are constants: the plan card text and the 3 FAQ items.
- Number formatting uses `toLocaleString('en-US')`, fixed in code, so server and client render the same text.

No new storage. This feature introduces no `localStorage` keys.

## Implementation plan

1. **Library route.** Create `app/games/page.tsx` that renders `<Library />`. `/games` now shows the Library. `/` still shows the Library at this step, so the app stays functional.
2. **Nav links.** In `components/nav.tsx`, set the links to Home (`/`), Library (`/games`), Hall of Fame (`/hall-of-fame`), About (`/about`). The logo links to `/`. Active state from the pathname: Home on `/`; Library on `/games` and `/games/*`; Hall of Fame on `/hall-of-fame`; About on `/about`; the sign-in or account control is unchanged. The mobile panel uses the same four links and the same sign-in or `Account` item, and closes on navigation. Labels are English.
3. **Styles.** Diff `references/templates/home-about/styles.css` against `app/arcade.css`. Add every rule from it that the Home and About markup uses (`home-*`, `hero-*`, `section-*`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `ticker`, `tk-*`, `top-*`, `tp-*`, `pricing-*`, `price-*`, `pc-*`, `faq-*`, `home-final`, `final-*`, `about-*`, `contact-*`, `tip*`, `field`, `terminal-*`, `term-*`, `highlight*`, `hl-*`, `div-*`, `silo`, `reveal`, `shake`, `lb-link`). Keep the SPEC 01 edits: `next/font` variables for `--pixel` and `--mono`, and the `prefers-reduced-motion` block. Do not remove any existing rule. Do not change a rule that the Library, Detail, Player, Hall of Fame, or Auth screens use, unless the template version is needed by both and is verified visually on those screens.
4. **Data.** Add the types and constants from the Data model to `lib/data.ts`. Verify with `npx tsc --noEmit`.
5. **Shared icons and silhouettes.** Create `components/pixel-icons.tsx` (server-safe, no state) exporting `FeatureIcon` (GAMEPAD, FREE, TROPHY, ROCKET), `HighlightIcon` (HEART, BROWSER, PLANT), and `FloatingSilhouettes` (the eight `silo s1`–`s8` SVGs). SVG markup is copied from the template unchanged, except for the comments, which are translated.
6. **Reveal hook.** Create `components/use-reveal.ts` (client hook). It observes `.reveal` elements inside a given root with an `IntersectionObserver` (`threshold: 0.12`), adds the `in` class on intersect, and stops observing that element. When `prefers-reduced-motion: reduce` matches, it adds `in` to every `.reveal` element at once and does not observe. It disconnects on unmount.
7. **Home page.** Create `components/home.tsx` (client, uses the reveal hook) and `app/page.tsx` rendering `<Home />`. Build the sections in this order, one at a time, checking each in the browser before the next:
   a. Hero: silhouettes, eyebrow `▸ INSERT COIN`, the three title lines, subtitle, `EXPLORE GAMES` (to `/games`) and `CREATE ACCOUNT` (to `/auth`), the scroll hint. The `_` caret is not rendered. The `EXPLORE GAMES` button has no `pulse` class.
   b. Features (`// 01`) from `FEATURES`, each card with its `transitionDelay` as in the template.
   c. Games preview (`// 02`): the first 6 `GAMES` as mini cards. Each card is a `next/link` to `/games/[id]`, not a clickable `div`. `VIEW ALL GAMES →` links to `/games`.
   d. Stats strip from `STATS`.
   e. Live activity (`// 03`): the `ACTIVITY` ticker (7 rows) and the `TOP_PLAYERS` list (5 rows). `VIEW HALL OF FAME →` links to `/hall-of-fame`.
   f. Pricing (`// 04`): the single plan card from `PRICING` with `GET STARTED FREE →` (to `/auth`), and the 3 FAQ items.
   g. Final CTA: title, `INSERT COIN →` (to `/games`), tag line.
8. **About page.** Create `app/about/page.tsx` rendering `<About />`, and `components/about.tsx` (client, uses the reveal hook and holds the form state). Port the hero, highlights, divider banner (24 pixel spans with the template's `animationDelay`), contact intro with its 3 tips, and the form. Sections keep the template's order.
9. **Contact form.** In `components/about.tsx`: state `{ name, email, msg }`. On submit, call `preventDefault`. If any field is blank after trim, set `shake` on the form for 400 ms and stop. Otherwise set `sent` to the trimmed name. The success panel prints `> MESSAGE RECEIVED. WE WILL REPLY SOON. THANKS, <NAME>.` with the name uppercased. `SEND ANOTHER MESSAGE` clears `sent` and the fields. Nothing is written to storage or sent over the network. The email input keeps `type="email"`, as the template does. Browser validation may block submit on a malformed address, and that is accepted.
10. **Polish pass.** Check both pages at 1280 px and 390 px against the template HTML. Fix layout breakage caused by longer English labels (buttons, nav, pricing list) by adjusting CSS in `app/arcade.css`, not by changing the copy. Confirm the nav collapses below 840 px.

Every step leaves `npm run dev` running with every route rendering.

**UI work:** steps 5 to 10 use the `/frontend-design` skill, as `CLAUDE.md` requires for UI.

## Acceptance criteria

- [ ] `npm run build` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `/` renders the hero with three title lines, the eyebrow, the subtitle, `EXPLORE GAMES`, and `CREATE ACCOUNT`.
- [ ] `/` renders section headings `// 01`, `// 02`, `// 03`, `// 04` in that order, then the final CTA.
- [ ] `/` renders 4 feature cards, 6 mini game cards, 3 stat blocks, 7 activity rows, 5 top player rows numbered `#01` to `#05`, 1 pricing card with `$0`, and 3 FAQ items.
- [ ] Clicking a mini game card on `/` opens `/games/[id]` for that game.
- [ ] `EXPLORE GAMES` and `INSERT COIN →` go to `/games`. `CREATE ACCOUNT` and `GET STARTED FREE →` go to `/auth`. `VIEW ALL GAMES →` goes to `/games`. `VIEW HALL OF FAME →` goes to `/hall-of-fame`.
- [ ] `/games` renders the Library exactly as SPEC 01 specified for `/`, with 8 game cards.
- [ ] The logo goes to `/`.
- [ ] The nav shows 4 links in the order Home, Library, Hall of Fame, About. The active link matches the route: `/` Home, `/games` and `/games/fall` Library, `/hall-of-fame` Hall of Fame, `/about` About.
- [ ] Below 840 px wide the nav links are hidden. The hamburger opens the panel with Home, Library, Hall of Fame, About, and the sign-in or `Account` item. Clicking a panel link navigates and closes the panel.
- [ ] `/about` renders the title `ABOUT ARCADE VAULT`, the mission paragraph, 3 highlight blocks, the divider, the 3 contact tips, and the contact form with NAME, EMAIL, and MESSAGE fields.
- [ ] Submitting the `/about` form with any field blank adds the `shake` class to the form and shows no success panel.
- [ ] Submitting with all three fields filled shows the terminal panel with `MESSAGE RECEIVED` and the name uppercased.
- [ ] `SEND ANOTHER MESSAGE` returns to an empty form.
- [ ] Submitting the contact form does not change `localStorage` (no new keys, no changed values).
- [ ] With `prefers-reduced-motion` not set, a `.reveal` section gets the `in` class when it scrolls into view.
- [ ] With `prefers-reduced-motion: reduce`, `.reveal` sections are visible on load without the `in` class being waited for, and the silhouettes do not move.
- [ ] The rendered HTML of `/`, `/games`, and `/about` contains no element with class `pulse` or `blink`, and no `_` caret after the eyebrow.
- [ ] Every class used by `home.jsx` and `about.jsx` exists in `app/arcade.css`. The SPEC 01 font variables and reduced-motion block are still present.
- [ ] On `/`, `/games`, and `/about` at 1280 px and at 390 px, the layout, colors, and fonts match `references/templates/home-about/arcade-vault-standalone.html`, with English copy substituted. Differences are listed in the final report.
- [ ] No console errors on `/`, `/games`, or `/about` in the dev server.
- [ ] No React hydration warning on `/`, `/games`, or `/about`.
- [ ] Scanlines and the noise overlay appear on `/` and `/about`.
- [ ] The SPEC 01 criteria for Hall of Fame, Auth, Detail, and Player still pass, with the Library criteria applied at `/games`.
- [ ] `CLAUDE.md` is unchanged, because it does not list routes.

## Decisions

- **Yes:** Home at `/`, Library at `/games`. The Library path matches the existing `/games/[id]` routes, and Home becomes the entry point. This amends SPEC 01's route for the Library.
- **No:** Home at `/home` with Library kept at `/`. It leaves the site entry point on a screen that is not the landing page.
- **Yes:** English translation of all template copy. The user chose English for the new pages, matching SPEC 01's English UI. Spanish or i18n is a later spec.
- **Yes:** Nav labels Home, Library, Hall of Fame, About. Keeps SPEC 01 names and adds the two new routes.
- **Yes:** Home and About both ported in full in this spec. The user chose the full scope.
- **Yes:** Contact form as client mock: validate non-blank, show success, store nothing. Same pattern as the mock sign-in in SPEC 01. No backend exists.
- **No:** Sending contact messages, storing them, or a `mailto:` fallback. Real delivery needs a backend, a separate spec.
- **Yes:** Scroll reveal and drifting silhouettes kept. Pulse, blink, caret, and flicker dropped, matching SPEC 01 Decisions. Reduced motion disables reveal motion and silhouette drift, and shows content immediately.
- **No:** Full template motion. It would need pulse and blink, which SPEC 01 removed.
- **Yes:** Pricing and FAQ copy ported as-is, translated. The claims (`$0 / ALWAYS`, no ads between games, new games every month, global ranking, `NO CARD REQUIRED`) are placeholder marketing. The owner must review them before launch. Not a claim this app yet meets.
- **Yes:** Live activity, top players, and stats are static mock data in `lib/data.ts`. Matches SPEC 01's write-only saved scores. Reading `av_scores` on Home would reverse that decision.
- **No:** Deriving Home data from `GAMES` or `seededScores`. The template's activity and top players use game names that are not in `GAMES`. Deriving them would hide that mismatch and imply consistency that is not there.
- **Yes:** Game names in template feature and activity copy (for example Tetris, Snake, Invaders) are kept as written. They are flagged in Scope as copy to correct later.
- **Yes:** Mini game cards and CTAs as `next/link` anchors, not clickable `div` or `button` elements. Gives real URLs and keyboard access. Visual result is the same.
- **Yes:** Number formatting uses `en-US` in code. The template used `es-ES`. A fixed locale keeps server and client output identical.
- **Yes:** `CLAUDE.md` unchanged. It says `page.tsx` is the home route and does not list the others.
- **Yes:** Merge template CSS into `app/arcade.css` rule by rule, keeping SPEC 01 edits. Keeps the verbatim-port approach from SPEC 01.
- **No:** Converting the Home and About styles to Tailwind utilities. Same reason as SPEC 01.
- **Yes:** Hydration-safe reveal: `.reveal` elements render in the server HTML and the hook adds `in` only after mount. Avoids markup mismatch.

## Identified risks

| Risk                                                                                  | Mitigation                                                                                                                                               |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.reveal` content hidden when JavaScript is off, because the template hides it by CSS | Check the template CSS first. If `.reveal` starts hidden, make the hidden state apply only under a `.js` class set by the hook. Verify with JS disabled. |
| Longer English labels overflow `btn xl` buttons, pricing list, and nav at 840 px      | Polish step 10 checks both widths. Fix in `app/arcade.css`, not the copy.                                                                                |
| Rule conflicts when merging `home-about/styles.css` into `app/arcade.css`             | Diff first. Keep SPEC 01 edits. Re-check Library, Hall of Fame, Auth, Detail, and Player visually after the merge.                                       |
| Route move breaks links that point to `/` expecting the Library                       | Only the nav and the internal links in SPEC 01 screens point to `/`. Step 2 updates the nav. Search the codebase for `href="/"` before step 7.           |
| Placeholder pricing and feature claims read as real product promises                  | Decisions flag them. Owner review is a launch step outside this spec.                                                                                    |
| `input type="email"` native validation blocks submit with a malformed address         | Accepted. The form stores nothing and the native check matches the template behavior.                                                                    |

## What is **not** in this spec

- Sending or storing contact messages.
- Spanish copy or an i18n layer.
- Real live activity, real rankings, or reading saved scores on Home.
- Real pricing, payments, or accounts.
- Pulse, blink, caret, flicker, or the typewriter effect.
- Tests or a test runner.
- Correcting the game names in template copy to match `GAMES`.
- Any change to SPEC 01's file. Its route for the Library is superseded by this spec, not edited.
