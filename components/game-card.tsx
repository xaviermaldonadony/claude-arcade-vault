'use client';

import Link from 'next/link';
import { useRef, type MouseEvent } from 'react';
import type { Game } from '@/lib/leaderboard';

// Card is one link to the detail page. The PLAY label is a styled span inside the link,
// because a button or nested <a> inside <a> is invalid HTML.
export function GameCard({ game }: { game: Game }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  const variant = game.color === 'magenta' ? 'magenta' : game.color === 'yellow' ? 'yellow' : '';

  return (
    <Link
      ref={ref}
      href={`/games/${game.id}`}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="cover">
        <div className={'cover-bg ' + game.cover}></div>
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>BEST SCORE</span>
            <b>{game.best.toLocaleString('en-US')}</b>
          </div>
          <span className={('btn ' + variant).trim()}>PLAY</span>
        </div>
      </div>
    </Link>
  );
}
