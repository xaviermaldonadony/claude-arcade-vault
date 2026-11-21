# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is an online gaming platform where players compete for the highest score (see README.md). The codebase is still the stock `create-next-app` scaffold: one root layout and one placeholder home page. Most product code does not exist yet.

## Commands

- `npm run dev` — start the Next.js dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build (run `build` first)
- `npm run lint` — runs `eslint` with `eslint.config.mjs` (Next core-web-vitals + TypeScript rules)
- `npx tsc --noEmit` — typecheck (`strict` mode; there is no `typecheck` script)

There is no test runner or test script configured. Do not assume `npm test` or a single-test command exists; add a test framework explicitly if tests are needed.

## Next.js version caveat

The project uses Next.js 16.4.6 with React 19.3. `AGENTS.md` warns that this version has breaking changes from older Next.js. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` as `AGENTS.md` instructs. Do not edit the `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md`; `next dev` rewrites it.

## Skills

Always use /frontend-design skill to design the UI.

## Architecture

- **Router:** App Router only. Routes live in `app/` (`layout.tsx` is the root layout, `page.tsx` the home route). There is no `pages/` directory.
- **Styling:** The template CSS is ported verbatim into `app/arcade.css`, imported from `app/layout.tsx`, with the original class names. `app/globals.css` only imports `tailwindcss`. The app is dark-only, with no light theme. Tailwind is compiled through the `@tailwindcss/turbopack` loader configured in `next.config.ts` under `turbopack.rules`, so keep that config when changing CSS handling. The `prefers-reduced-motion` overrides are at the end of `app/arcade.css`.
- **Fonts:** `Press Start 2P`, `Courier Prime`, and `JetBrains Mono` are loaded with `next/font/google` in `app/layout.tsx`, exposed as `--font-pixel`, `--font-courier`, and `--font-mono`. `app/arcade.css` maps `--pixel` and `--mono` to them.
- **Path alias:** `@/*` resolves to the repo root (`tsconfig.json`).
- **Experimental Next.js flags** in `next.config.ts`: `experimental.agentFeedback`, `cacheComponents`, and `partialPrefetching` are enabled. Account for them when changing caching, data fetching, or prefetching behavior.
- **Metadata:** `app/layout.tsx` exports the title `Arcade Vault` and the README description.
- **Mock auth:** `components/auth-provider.tsx` provides `AuthProvider` and the `useAuth()` hook (`user`, `signIn`, `signOut`). It is mock sign-in only: it stores `{ name }` in `localStorage` under `av_user`, with no passwords, sessions, or server records. It reads storage through `useSyncExternalStore` with a `null` server snapshot, so server render and hydration are always signed out. Components that need the user name should call `useAuth()`, not read `localStorage` directly.
- **Contact form:** The About form in `components/about.tsx` posts JSON to `POST /api/contact` (`app/api/contact/route.ts`), the only server code path for the form. The route validates with `lib/contact.ts` and sends one plain-text email through Resend (`resend` package, client created per request). Env vars, all server-only and never `NEXT_PUBLIC_`: `RESEND_API_KEY` (secret, in `.env.local`), `CONTACT_TO_EMAIL` (inbox; must be the Resend account owner's address while the test sender `onboarding@resend.dev` is used), and `CONTACT_FROM_EMAIL` (optional, defaults to the test sender). `.env.example` documents them; `.gitignore` keeps `.env*` ignored except `.env.example`. Messages are not stored anywhere. See `specs/03-about-contact-email.md`.

## Spec-driven design workflow

Features are built spec-first. The project uses the skills from `Klerith/fernando-skills` for spec-driven design, specifically `/spec` to write a spec and `/spec-impl` to implement from it (see README.md). For new feature work, produce or update the spec with `/spec` before writing implementation code, and use `/spec-impl` to build from that spec.
