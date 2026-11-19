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

## Architecture

- **Router:** App Router only. Routes live in `app/` (`layout.tsx` is the root layout, `page.tsx` the home route). There is no `pages/` directory.
- **Styling:** Tailwind CSS v4. `app/globals.css` imports `tailwindcss` and defines light/dark CSS variables (`--background`, `--foreground`) mapped to Tailwind colors via `@theme inline`. Dark mode follows `prefers-color-scheme`. Tailwind is compiled through the `@tailwindcss/turbopack` loader configured in `next.config.ts` under `turbopack.rules`, so keep that config when changing CSS handling.
- **Fonts:** Geist and Geist Mono loaded with `next/font/google` in `app/layout.tsx`, exposed as `--font-geist-sans` and `--font-geist-mono`.
- **Path alias:** `@/*` resolves to the repo root (`tsconfig.json`).
- **Experimental Next.js flags** in `next.config.ts`: `experimental.agentFeedback`, `cacheComponents`, and `partialPrefetching` are enabled. Account for them when changing caching, data fetching, or prefetching behavior.
- **Metadata:** `app/layout.tsx` still exports the scaffold title and description ("Create Next App"). Replace these when the product takes shape.

## Spec-driven design workflow

Features are built spec-first. The project uses the skills from `Klerith/fernando-skills` for spec-driven design, specifically `/spec` to write a spec and `/spec-impl` to implement from it (see README.md). For new feature work, produce or update the spec with `/spec` before writing implementation code, and use `/spec-impl` to build from that spec.
