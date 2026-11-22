import { connection } from 'next/server';
import { fetchGame } from '@/lib/supabase/games';

// Server-only. Returns one game by id. Unknown ids get 404 with { error: "not_found" }.

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  try {
    const game = await fetchGame(id);
    if (!game) {
      return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    }
    return Response.json({ game }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
  }
}
