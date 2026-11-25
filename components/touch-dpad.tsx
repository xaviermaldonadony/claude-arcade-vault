'use client';

import type { PointerEvent } from 'react';
import type { TouchControls, TouchKey } from '@/lib/touch/controls';

type Dir = 'up' | 'down' | 'left' | 'right';
type GameId = 'asteroids' | 'tetris' | 'arkanoid' | 'snake';

// Which keys each game uses. Keys a game does not use are drawn dimmed and disabled (SPEC 10).
// The A and B labels are shown in the aria-label of each round button.
const LAYOUT: Record<GameId, { enabled: TouchKey[]; a: string | null; b: string | null }> = {
  asteroids: { enabled: ['up', 'left', 'right', 'a', 'b'], a: 'FIRE', b: 'THRUST' },
  tetris: { enabled: ['up', 'down', 'left', 'right', 'a', 'b'], a: 'ROTATE', b: 'DROP' },
  arkanoid: { enabled: ['left', 'right'], a: null, b: null },
  snake: { enabled: ['up', 'down', 'left', 'right', 'a'], a: 'BOOST', b: null },
};

const ARROWS: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
const DIR_ORDER: Dir[] = ['up', 'left', 'right', 'down'];

export function TouchDpad({ game, controls }: { game: string; controls: TouchControls }) {
  const layout = LAYOUT[game as GameId];
  // Games without a layout show nothing.
  if (!layout) return null;
  const enabled = new Set<TouchKey>(layout.enabled);

  const bind = (key: TouchKey) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      controls.press(key);
    },
    onPointerUp: () => controls.release(key),
    onPointerCancel: () => controls.release(key),
    onPointerLeave: () => controls.release(key),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const dirButton = (dir: Dir) => {
    const on = enabled.has(dir);
    return (
      <button
        key={dir}
        type="button"
        className={`touch-dir touch-${dir}${on ? '' : ' is-off'}`}
        aria-label={dir}
        disabled={!on}
        {...(on ? bind(dir) : {})}
      >
        {ARROWS[dir]}
      </button>
    );
  };

  const roundButton = (key: 'a' | 'b', label: string | null) => {
    const on = enabled.has(key) && label !== null;
    return (
      <button
        type="button"
        className={`touch-round touch-${key}${on ? '' : ' is-off'}`}
        aria-label={label ?? key.toUpperCase()}
        disabled={!on}
        {...(on ? bind(key) : {})}
      >
        {key.toUpperCase()}
      </button>
    );
  };

  return (
    <div className="touch-controls" role="group" aria-label="Touch controls">
      <div className="touch-dpad-pad">{DIR_ORDER.map(dirButton)}</div>
      <div className="touch-ab">
        {roundButton('b', layout.b)}
        {roundButton('a', layout.a)}
      </div>
    </div>
  );
}
