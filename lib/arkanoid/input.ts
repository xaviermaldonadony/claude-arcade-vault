// Keyboard tracker for the arkanoid game. DOM-facing, so it is attached from a client effect only.
// Keys typed into form fields (for example the SAVE SCORE name box) are ignored.
// The mouse is not handled here: the component sends pointerX, because it needs the canvas rect.

import type { ArkanoidInput } from './types';

const PAUSE_CODES = new Set(['KeyP', 'Escape']);

export type ArkanoidKeys = Omit<ArkanoidInput, 'pointerX'>;

export type KeyboardTracker = {
  // Held state of the paddle keys. Read once per frame.
  read(): ArkanoidKeys;
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
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      // Keeps the arrows from scrolling the page while the game is mounted.
      e.preventDefault();
      held.add(e.code);
    }
    if (PAUSE_CODES.has(e.code) && !e.repeat) pausePressed = true;
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
