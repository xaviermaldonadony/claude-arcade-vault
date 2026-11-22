// Keyboard tracker for the Tetris game. Attaches to a window from a client effect only.
// No React or Next imports.
//
// Each key event sets a one-shot flag. read() returns the flags and clears them, so an action
// is seen once per frame. Left, Right and Down take OS key repeats, as in the reference.
// Rotate, hard drop and pause ignore repeats.

import type { TetrisInput } from './types';

export type KeyboardTracker = {
  read(): TetrisInput;
  takePausePress(): boolean;
  detach(): void;
};

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyX', 'Space']);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function attachKeyboard(target: Window): KeyboardTracker {
  let left = false;
  let right = false;
  let rotate = false;
  let hardDrop = false;
  let softDrop = false;
  let pausePress = false;

  function clear(): void {
    left = false;
    right = false;
    rotate = false;
    hardDrop = false;
    softDrop = false;
    pausePress = false;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (isTypingTarget(e.target)) return;

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!e.repeat) pausePress = true;
      return;
    }
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();

    switch (e.code) {
      case 'ArrowLeft':
        left = true;
        break;
      case 'ArrowRight':
        right = true;
        break;
      case 'ArrowDown':
        softDrop = true;
        break;
      case 'ArrowUp':
      case 'KeyX':
        if (!e.repeat) rotate = true;
        break;
      case 'Space':
        if (!e.repeat) hardDrop = true;
        break;
    }
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('blur', clear);

  return {
    read(): TetrisInput {
      const input: TetrisInput = { left, right, rotate, softDrop, hardDrop };
      left = false;
      right = false;
      rotate = false;
      softDrop = false;
      hardDrop = false;
      return input;
    },
    takePausePress(): boolean {
      const pressed = pausePress;
      pausePress = false;
      return pressed;
    },
    detach(): void {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('blur', clear);
      clear();
    },
  };
}
