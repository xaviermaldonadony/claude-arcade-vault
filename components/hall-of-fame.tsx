'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { normalizeName } from '@/lib/leaderboard';
import { useGames } from '@/lib/use-games';
import { useScores } from '@/lib/use-scores';

// Hall of Fame (SPEC 06, step 9). Tabs come from the games table. Rows and the YOUR BEST row come from GET /api/scores.
// The tab is client state only (not URL, not storage). The first game is the default once the games load.
const ROWS = 12;

export function HallOfFame() {
  const { user } = useAuth();
  const { games, status: gamesStatus } = useGames();
  const [picked, setPicked] = useState<string | null>(null);
  const tab = picked ?? games[0]?.id ?? '';
  const game = games.find((g) => g.id === tab);

  const { rows, you, status } = useScores(tab, { limit: ROWS, name: user?.name ?? null });

  const slot = (i: number) => rows[i];
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="av-hall">
      <div className="hall-head">
        <h1>HALL OF FAME</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          THE NAMES THAT NEVER FADE FROM THE SCREEN
        </p>
      </div>

      <div className="hall-tabs">
        {gamesStatus === 'loading' && (
          <div className="pixel" style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
            LOADING
          </div>
        )}
        {gamesStatus === 'error' && (
          <div className="pixel" style={{ color: 'var(--magenta)', fontSize: 12 }}>
            GAMES UNAVAILABLE
          </div>
        )}
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={'chip' + (tab === g.id ? ' active' : '')}
            aria-pressed={tab === g.id}
            onClick={() => setPicked(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{slot(1)?.name ?? '—'}</div>
          <div className="score">{slot(1) ? fmt(slot(1).score) : '—'}</div>
          <div className="date">{slot(1)?.date ?? ''}</div>
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.18em' }}
          >
            CHAMPION
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{slot(0)?.name ?? '—'}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {slot(0) ? fmt(slot(0).score) : '—'}
          </div>
          <div className="date">{slot(0)?.date ?? ''}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{slot(2)?.name ?? '—'}</div>
          <div className="score">{slot(2) ? fmt(slot(2).score) : '—'}</div>
          <div className="date">{slot(2)?.date ?? ''}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANK</div>
          <div>PLAYER</div>
          <div>SCORE</div>
          <div>DATE</div>
        </div>
        {status === 'loading' && (
          <div className="tr">
            <div className="pl" style={{ color: 'var(--ink-faint)' }}>
              LOADING
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="tr">
            <div className="pl" style={{ color: 'var(--magenta)' }}>
              SCORES UNAVAILABLE
            </div>
          </div>
        )}
        {status === 'ready' && rows.length === 0 && (
          <div className="tr">
            <div className="pl" style={{ color: 'var(--ink-faint)' }}>
              NO SCORES YET
            </div>
          </div>
        )}
        {status === 'ready' &&
          rows.map((r, i) => (
            <div
              key={r.rank}
              className={'tr' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')}
            >
              <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{fmt(r.score)}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))}
        {user && you && (
          <>
            <div className="tr you-label">▸ YOUR BEST SCORE IN {game?.title ?? ''}</div>
            <div className="tr you">
              <div className="rk" style={{ color: 'var(--yellow)' }}>
                #{String(you.rank).padStart(2, '0')}
              </div>
              <div className="pl" style={{ color: 'var(--yellow)' }}>
                {normalizeName(user.name)}
              </div>
              <div
                className="sc"
                style={{ color: 'var(--yellow)', textShadow: '0 0 6px rgba(245,255,0,0.5)' }}
              >
                {fmt(you.score)}
              </div>
              <div className="dt">{you.date}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link href="/" className="btn lg">
          BACK TO THE LIBRARY
        </Link>
      </div>
    </div>
  );
}
