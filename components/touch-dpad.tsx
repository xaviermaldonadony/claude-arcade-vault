'use client';

import type { PointerEvent } from 'react';
import type { TouchControls, TouchKey } from '@/lib/touch/controls';

type Direction = Exclude<TouchKey, 'action'>;

// Which buttons each real game shows. Matches the mapping table in SPEC 10.
const LAYOUT: Record<
  'asteroids' | 'tetris' | 'arkanoid' | 'snake',
  { directions: Direction[]; action: string | null }
> = {
  asteroids: { directions: ['up', 'left', 'right'], action: 'FIRE' },
  tetris: { directions: ['up', 'down', 'left', 'right'], action: 'DROP' },
  arkanoid: { directions: ['left', 'right'], action: null },
  snake: { directions: ['up', 'down', 'left', 'right'], action: null },
};

const ARROWS: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };

export function TouchDpad({
  game,
  controls,
}: {
  game: keyof typeof LAYOUT;
  controls: TouchControls;
}) {
  const { directions, action } = LAYOUT[game];

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

  return (
    <div className="touch-dpad" role="group" aria-label="Touch controls">
      <div className="touch-dpad-pad">
        {directions.includes('up') && (
          <button type="button" className="touch-key touch-up" aria-label="Up" {...bind('up')}>
            {ARROWS.up}
          </button>
        )}
        {directions.includes('left') && (
          <button
            type="button"
            className="touch-key touch-left"
            aria-label="Left"
            {...bind('left')}
          >
            {ARROWS.left}
          </button>
        )}
        {directions.includes('right') && (
          <button
            type="button"
            className="touch-key touch-right"
            aria-label="Right"
            {...bind('right')}
          >
            {ARROWS.right}
          </button>
        )}
        {directions.includes('down') && (
          <button
            type="button"
            className="touch-key touch-down"
            aria-label="Down"
            {...bind('down')}
          >
            {ARROWS.down}
          </button>
        )}
      </div>
      {action && (
        <button
          type="button"
          className="touch-key touch-action"
          aria-label={action}
          {...bind('action')}
        >
          {action}
        </button>
      )}
    </div>
  );
}
