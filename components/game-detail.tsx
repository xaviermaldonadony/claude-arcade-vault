'use client';

import Link from 'next/link';
import { formatPlays, type Game } from '@/lib/leaderboard';
import { useScores } from '@/lib/use-scores';

// Game detail body (SPEC 06, step 7). The page resolves the game on the server. The top 10 scores load here.
export function GameDetail({ game }: { game: Game }) {
  const { rows, status } = useScores(game.id, { limit: 10 });

  return (
    <div className="av-detail">
      <div>
        <div className="detail-cover">
          <div className={'cover-bg ' + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 PLAYER</span>
            <span>KEYBOARD / TOUCH</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Plays</div>
              <div className="v">{formatPlays(game.plays)}</div>
            </div>
            <div>
              <div className="l">Global best</div>
              <div
                className="v"
                style={{ color: 'var(--magenta)', textShadow: '0 0 6px rgba(255,0,110,0.5)' }}
              >
                {game.best.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="l">Difficulty</div>
              <div
                className="v"
                style={{ color: 'var(--yellow)', textShadow: '0 0 6px rgba(245,255,0,0.5)' }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/play`} className="btn xl">
              ▶ PLAY NOW
            </Link>
            <Link href="/" className="btn ghost lg">
              BACK TO THE VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>TOP SCORES</h3>
          {status === 'loading' && (
            <div className="pixel" style={{ color: 'var(--ink-faint)', fontSize: 12, padding: 16 }}>
              LOADING
            </div>
          )}
          {status === 'error' && (
            <div className="pixel" style={{ color: 'var(--magenta)', fontSize: 12, padding: 16 }}>
              SCORES UNAVAILABLE
            </div>
          )}
          {status === 'ready' && rows.length === 0 && (
            <div className="pixel" style={{ color: 'var(--ink-faint)', fontSize: 12, padding: 16 }}>
              NO SCORES YET
            </div>
          )}
          {status === 'ready' &&
            rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  'lb-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
                }
              >
                <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
                <div className="pl">
                  {r.name}
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString('en-US')}</div>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
