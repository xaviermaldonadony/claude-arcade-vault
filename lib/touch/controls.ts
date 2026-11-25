// Touch state for the on-screen D-pad. Pure: no DOM, React, or Next imports.
// The D-pad component calls press and release; each game reads held() and takePress() once per frame.

export type TouchKey = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

export type TouchControls = {
  // Keys held down right now (pointer is still on the button).
  held(): ReadonlySet<TouchKey>;
  // True once per press since the last call. Used for discrete actions (Tetris rotate and drop).
  takePress(key: TouchKey): boolean;
  press(key: TouchKey): void;
  release(key: TouchKey): void;
  // Releases everything and drops pending presses. Called on pause and on blur.
  clear(): void;
};

export function createTouchControls(): TouchControls {
  const held = new Set<TouchKey>();
  const pending = new Set<TouchKey>();

  return {
    held: () => held,
    takePress(key) {
      if (!pending.has(key)) return false;
      pending.delete(key);
      return true;
    },
    press(key) {
      held.add(key);
      pending.add(key);
    },
    release(key) {
      held.delete(key);
    },
    clear() {
      held.clear();
      pending.clear();
    },
  };
}
