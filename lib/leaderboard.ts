// Shared types and pure helpers for the game catalog and the leaderboard (SPEC 06).
// No DOM, React, Next or Supabase imports: safe for route handlers and client components.

export const MAX_SCORE = 10_000_000;
export const MAX_NAME_LENGTH = 10;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;

export type Game = {
  id: string; // URL slug, e.g. "block-buster"
  title: string; // uppercase display name
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string; // CSS class name, e.g. "cover-bricks"
  color: 'cyan' | 'magenta' | 'yellow' | 'green' | 'lime';
  best: number; // max score for the game, 0 when none
  plays: number; // integer counter
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: 'DD/MM/YYYY'

export type YourBest = { rank: number; score: number; date: string } | null;

export type ScoreSubmit = { game: string; name: string; score: number };

export type ValidateResult = { ok: true; value: ScoreSubmit } | { ok: false };

// Uppercase, trimmed, at most MAX_NAME_LENGTH characters. Empty becomes GUEST.
// Counts code points, the same way Postgres char_length does.
export function normalizeName(raw: string): string {
  const name = Array.from(raw.trim().toUpperCase()).slice(0, MAX_NAME_LENGTH).join('');
  return name || 'GUEST';
}

// Checks the POST /api/scores body. The route still checks that `game` exists in the database.
export function validateScoreSubmit(body: unknown): ValidateResult {
  if (typeof body !== 'object' || body === null) return { ok: false };
  const { game, name, score } = body as Record<string, unknown>;

  if (typeof game !== 'string' || game.trim() === '') return { ok: false };
  if (typeof name !== 'string') return { ok: false };
  if (typeof score !== 'number' || !Number.isInteger(score)) return { ok: false };
  if (score < 0 || score > MAX_SCORE) return { ok: false };

  return { ok: true, value: { game: game.trim(), name: normalizeName(name), score } };
}

// Parses the ?limit= query value. Missing means DEFAULT_LIMIT. Anything outside 1..MAX_LIMIT is null.
export function parseLimit(raw: string | null): number | null {
  if (raw === null) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_LIMIT ? n : null;
}

// 12400 -> "12.4K", 1000 -> "1K", 2500000 -> "2.5M", 999 -> "999".
export function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${trimZero((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${trimZero((n / 1_000).toFixed(1))}K`;
  return String(n);
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

// ISO timestamp -> "DD/MM/YYYY", in UTC so server and browser print the same date.
export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
