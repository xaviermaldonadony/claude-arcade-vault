// Keyboard tracker for the Snake game (SPEC 09). Attaches to window only when called from a client effect.

import type { Dir } from './types';

const MAX_PENDING_TURNS = 4;

const TURN_KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export type Keyboard = {
  // Oldest unread turn press, or null. The engine takes at most one per frame.
  takeTurn: () => Dir | null;
  // true once after P or Escape is pressed.
  takePausePress: () => boolean;
  detach: () => void;
};

export function attachKeyboard(target: Window): Keyboard {
  const pendingTurns: Dir[] = [];
  let pausePressed = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const turn = TURN_KEYS[e.code];
    if (turn !== undefined) {
      if (pendingTurns.length < MAX_PENDING_TURNS) pendingTurns.push(turn);
      if (ARROW_KEYS.has(e.code)) e.preventDefault();
      return;
    }
    if (PAUSE_KEYS.has(e.code)) {
      pausePressed = true;
    }
  };

  target.addEventListener('keydown', onKeyDown);

  return {
    takeTurn: () => (pendingTurns.length > 0 ? (pendingTurns.shift() ?? null) : null),
    takePausePress: () => {
      const was = pausePressed;
      pausePressed = false;
      return was;
    },
    detach: () => target.removeEventListener('keydown', onKeyDown),
  };
}
