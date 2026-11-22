// Server-only reads for the game catalog (SPEC 06). Used by route handlers only.
// Errors are thrown, not returned: the route decides the HTTP status.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game } from '@/lib/leaderboard';
import { createServerSupabase } from '@/lib/supabase/server';

type GameRow = Omit<Game, 'best'>;

const GAME_COLUMNS = 'id,title,short,long,cat,cover,color,plays';

// Highest score for one game, 0 when it has none. One row per query, so the cost does not grow with scores.
async function fetchBest(supabase: SupabaseClient, gameId: string): Promise<number> {
  const { data, error } = await supabase
    .from('scores')
    .select('score')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(1);
  if (error) throw error;
  const top = (data ?? [])[0] as { score: number } | undefined;
  return top?.score ?? 0;
}

export async function fetchGames(): Promise<Game[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('games').select(GAME_COLUMNS).order('title');
  if (error) throw error;

  const rows = (data ?? []) as GameRow[];
  const bests = await Promise.all(rows.map((row) => fetchBest(supabase, row.id)));
  return rows.map((row, i) => ({ ...row, best: bests[i] }));
}

// Returns null when no game has this id.
export async function fetchGame(id: string): Promise<Game | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as GameRow;
  return { ...row, best: await fetchBest(supabase, row.id) };
}
