import { connection } from 'next/server';
import { fetchGames } from '@/lib/supabase/games';

// Server-only. Returns the game catalog, ordered by title. Each game includes its best score and plays count.
// `connection()` keeps this route dynamic under cacheComponents, so the data is read per request.

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  await connection();

  try {
    const games = await fetchGames();
    return Response.json({ games }, { headers: NO_STORE });
  } catch {
    // The error text is not returned: it may name the project.
    return Response.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
  }
}
