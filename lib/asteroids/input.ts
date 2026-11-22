// Keyboard tracker for the asteroids game. DOM-facing, so it is attached from a client effect only.
// Keys typed into form fields (for example the SAVE SCORE name box) are ignored.

import type { AsteroidsInput } from './types';

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

export type KeyboardTracker = {
  // Held state of the game controls. Read once per frame.
  read(): AsteroidsInput;
  // True once per P or Escape press since the last call.
  takePausePress(): boolean;
  // Removes all listeners and clears held keys.
  detach(): void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function attachKeyboard(target: Window): KeyboardTracker {
  const held = new Set<string>();
  let pausePressed = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) {
      // Keeps arrows and Space from scrolling the page while the game is mounted.
      e.preventDefault();
      held.add(e.code);
    }
    if (PAUSE_KEYS.has(e.code) && !e.repeat) pausePressed = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    held.delete(e.code);
  };

  // Losing focus can swallow keyup events. Clear held keys so nothing sticks.
  const onBlur = () => {
    held.clear();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return {
    read: () => ({
      left: held.has('ArrowLeft'),
      right: held.has('ArrowRight'),
      thrust: held.has('ArrowUp'),
      fire: held.has('Space'),
    }),
    takePausePress: () => {
      const was = pausePressed;
      pausePressed = false;
      return was;
    },
    detach: () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      held.clear();
      pausePressed = false;
    },
  };
}
