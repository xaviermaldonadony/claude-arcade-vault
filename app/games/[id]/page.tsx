import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GAMES, seededScores } from '@/lib/data';

// Prerender the known games. Unknown ids still render on request and hit notFound().
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

// Blocking route: params are read outside <Suspense>, so the page must not stream its shell first.
// notFound() then runs before streaming starts and unknown ids return a real 404 (same as the play page).
export const instant = false;

// The game is resolved here, then rendered inside <Suspense>.
export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return (
    <Suspense fallback={null}>
      <GameDetail id={id} game={game} />
    </Suspense>
  );
}

async function GameDetail({ id, game }: { id: string; game: (typeof GAMES)[number] }) {
  // Same seed formula as the template, so the leaderboard matches the prototype.
  const scores = seededScores(id.length * 17 + 3, 10);

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
              <div className="v">{game.plays}</div>
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
          {scores.map((r, i) => (
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
