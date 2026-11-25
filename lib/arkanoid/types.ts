// Engine types for Arkanoid. No DOM, React, or Next imports (SPEC 08).

export type ArkanoidStatus = 'playing' | 'paused' | 'gameover' | 'won';

export type BrickColor = 'gray' | 'red' | 'yellow' | 'cyan' | 'magenta' | 'hotpink' | 'green';

export type Rect = { x: number; y: number; w: number; h: number };

export type Brick = Rect & { color: BrickColor; alive: boolean };

export type Ball = Rect & { vx: number; vy: number };

export type Explosion = Rect & { color: BrickColor; elapsed: number };

// Sound events produced by one step. The component plays them; the engine never plays audio.
export type SoundEvent = 'bounce' | 'break';

export type ArkanoidState = {
  status: ArkanoidStatus;
  level: number; // 1 to 5
  score: number;
  lives: number; // starts at 3
  paddle: Rect; // w 81, h 14, y 560
  ball: Ball; // w 16, h 16
  bricks: Brick[];
  explosions: Explosion[];
  sounds: SoundEvent[]; // only the events of the last step
};

// Input for one frame. Pause is not part of the input: the component calls setPaused.
export type ArkanoidInput = {
  left: boolean;
  right: boolean;
  pointerX: number | null; // paddle center in canvas coordinates, or null when the mouse is not on the canvas
  // Paddle speed for left and right, in px/s. Unset uses PADDLE_SPEED. The touch D-pad sets it (SPEC 10).
  paddleSpeed?: number;
};

export type LevelBlock = { col: number; row: number; color: BrickColor };

export type LevelDef = { speed: number; blocks: LevelBlock[] };
