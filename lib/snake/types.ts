// Snake game state types (SPEC 09). No DOM, React or Next imports.

export type Cell = { x: number; y: number };

export type Dir = 'up' | 'down' | 'left' | 'right';

export type GameStatus = 'playing' | 'paused' | 'gameover';

export type Fruit = Cell & { kind: number }; // kind: index 0 to 21 into the fruit atlas

export type SnakeState = {
  status: GameStatus;
  body: Cell[]; // head first, tail last
  dir: Dir; // direction applied on the last step
  queued: Dir[]; // up to 2 turns waiting for the next steps
  fruit: Fruit;
  score: number;
  fruits: number; // fruits eaten this game
  stepInterval: number; // seconds per step, falls on every bite
  acc: number; // seconds since the last step
};

export type SnakeInput = { turn: Dir | null }; // at most one turn press per frame
