// Client hook for one game's ranking (SPEC 06). Fetches GET /api/scores when the game, limit or name changes.
// Results are tagged with the request key, so a stale response never shows for a newer request.

import { useEffect, useState } from 'react';
import type { ScoreRow, YourBest } from '@/lib/leaderboard';
import type { LoadStatus } from '@/lib/use-games';

type Result = { key: string; status: 'ready' | 'error'; rows: ScoreRow[]; you: YourBest };

export function useScores(
  gameId: string,
  options: { limit: number; name?: string | null },
): { rows: ScoreRow[]; you: YourBest; status: LoadStatus } {
  const { limit } = options;
  const name = options.name?.trim() ? options.name.trim() : null;
  const key = `${gameId}|${limit}|${name ?? ''}`;

  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    // No game yet (for example, the Hall of Fame before its games load): nothing to fetch.
    if (!gameId) return;
    const controller = new AbortController();

    const params = new URLSearchParams({ game: gameId, limit: String(limit) });
    if (name) params.set('name', name);

    fetch(`/api/scores?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/scores ${res.status}`);
        const body = (await res.json()) as { rows: ScoreRow[]; you: YourBest };
        setResult({ key, status: 'ready', rows: body.rows, you: body.you });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult({ key, status: 'error', rows: [], you: null });
      });

    return () => controller.abort();
  }, [key, gameId, limit, name]);

  // A result for an older key is not shown. While the new request runs, status is 'loading'.
  if (!result || result.key !== key) {
    return { rows: [], you: null, status: 'loading' };
  }
  return { rows: result.rows, you: result.you, status: result.status };
}
