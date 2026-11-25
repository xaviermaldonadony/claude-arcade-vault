'use client';

import Link from 'next/link';

// Bottom bar for phones (SPEC 10): PAUSE, the SKIN select slot, and EXIT.
// The game renders its SKIN select into the slot through a portal.
export function TouchBar({
  gameId,
  paused,
  onTogglePause,
  setSkinSlot,
}: {
  gameId: string;
  paused: boolean;
  onTogglePause: () => void;
  setSkinSlot: (el: HTMLElement | null) => void;
}) {
  return (
    <div className="touch-bar">
      <button type="button" className="btn yellow touch-bar-pause" onClick={onTogglePause}>
        {paused ? 'RESUME' : 'PAUSE'}
      </button>
      <div className="touch-bar-skin" ref={setSkinSlot} />
      <Link href={`/games/${gameId}`} className="btn ghost touch-bar-exit">
        ← EXIT
      </Link>
    </div>
  );
}
