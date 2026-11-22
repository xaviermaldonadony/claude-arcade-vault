// Client hook for the game catalog (SPEC 06). Fetches GET /api/games once per mount.
// Server render and first client render both report 'loading', so hydration matches.

import { useEffect, useState } from 'react';
import type { Game } from '@/lib/leaderboard';

export type LoadStatus = 'loading' | 'ready' | 'error';

export function useGames(): { games: Game[]; status: LoadStatus } {
  const [state, setState] = useState<{ games: Game[]; status: LoadStatus }>({
    games: [],
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/games', { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/games ${res.status}`);
        const body = (await res.json()) as { games: Game[] };
        setState({ games: body.games, status: 'ready' });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ games: [], status: 'error' });
      });

    return () => controller.abort();
  }, []);

  return state;
}
