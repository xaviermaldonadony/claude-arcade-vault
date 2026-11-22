// Server-only reads and writes for scores (SPEC 06). Used by route handlers only.
// Errors are thrown, not returned: the route decides the HTTP status.

import type { SupabaseClient } from '@supabase/supabase-js';
import { formatScoreDate, type ScoreRow, type ScoreSubmit, type YourBest } from '@/lib/leaderboard';
import { createServerSupabase } from '@/lib/supabase/server';

// Ranking order: score descending, then the earlier created_at first.
function rankedQuery(supabase: SupabaseClient, gameId: string) {
  return supabase
    .from('scores')
    .select('name,score,created_at')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true });
}

export async function gameExists(gameId: string): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('games').select('id').eq('id', gameId).maybeSingle();
  if (error) throw error;
  return data !== null;
}

// `name` must already be normalized. Returns the top `limit` rows, and `you` when a name is given.
export async function fetchScores(
  gameId: string,
  limit: number,
  name: string | null,
): Promise<{ rows: ScoreRow[]; you: YourBest }> {
  const supabase = createServerSupabase();

  const { data: top, error } = await rankedQuery(supabase, gameId).limit(limit);
  if (error) throw error;

  const rows: ScoreRow[] = (top ?? []).map((r, i) => {
    const row = r as { name: string; score: number; created_at: string };
    return { rank: i + 1, name: row.name, score: row.score, date: formatScoreDate(row.created_at) };
  });

  if (name === null) return { rows, you: null };

  // The player's best row, then its rank: every score above it, plus equal scores that were earlier.
  const { data: mineData, error: mineError } = await supabase
    .from('scores')
    .select('score,created_at')
    .eq('game_id', gameId)
    .eq('name', name)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mineError) throw mineError;
  if (!mineData) return { rows, you: null };

  const mine = mineData as { score: number; created_at: string };

  const { count: above, error: aboveError } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .gt('score', mine.score);
  if (aboveError) throw aboveError;

  const { count: tied, error: tiedError } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('score', mine.score)
    .lt('created_at', mine.created_at);
  if (tiedError) throw tiedError;

  return {
    rows,
    you: {
      rank: (above ?? 0) + (tied ?? 0) + 1,
      score: mine.score,
      date: formatScoreDate(mine.created_at),
    },
  };
}

export async function insertScore(submit: ScoreSubmit): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('scores')
    .insert({ game_id: submit.game, name: submit.name, score: submit.score });
  if (error) throw error;
}
