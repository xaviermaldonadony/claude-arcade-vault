import { connection } from 'next/server';
import { normalizeName, parseLimit, validateScoreSubmit } from '@/lib/leaderboard';
import { fetchScores, gameExists, insertScore } from '@/lib/supabase/scores';

// Server-only. GET reads the ranking for one game. POST saves one score for a game in the games table (SPEC 06, SPEC 07).
// Both return { error } with no project details on failure.

const NO_STORE = { 'Cache-Control': 'no-store' };

function badRequest() {
  return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });
}

function unavailable() {
  return Response.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
}

// GET /api/scores?game=<id>&limit=<n>&name=<name>
export async function GET(request: Request) {
  await connection();

  const params = new URL(request.url).searchParams;
  const game = params.get('game')?.trim() ?? '';
  const limit = parseLimit(params.get('limit'));
  const rawName = params.get('name')?.trim() ?? '';
  if (!game || limit === null) return badRequest();

  const name = rawName ? normalizeName(rawName) : null;

  try {
    if (!(await gameExists(game))) return badRequest();
    const result = await fetchScores(game, limit, name);
    return Response.json(result, { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}

// POST /api/scores with body { game, name, score }
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest();
  }

  const result = validateScoreSubmit(body);
  if (!result.ok) return badRequest();

  try {
    if (!(await gameExists(result.value.game))) return badRequest();
    await insertScore(result.value);
    return Response.json({ ok: true }, { status: 201, headers: NO_STORE });
  } catch {
    return unavailable();
  }
}
