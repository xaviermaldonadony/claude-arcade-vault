export type Vec = { x: number; y: number };

export type GameStatus = 'playing' | 'paused' | 'dead' | 'gameover';

export type AsteroidSize = 1 | 2 | 3; // 1 small, 2 medium, 3 large

export type Asteroid = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: AsteroidSize;
  radius: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][];
};

export type Bullet = { id: number; x: number; y: number; vx: number; vy: number; ttl: number };

export type Particle = { x: number; y: number; vx: number; vy: number; ttl: number; life: number };

export type PowerUp = { id: number; x: number; y: number; vx: number; vy: number; ttl: number };

export type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  invincible: number; // seconds left
  shootCooldown: number; // seconds left
  tripleShot: number; // seconds left
};

export type AsteroidsState = {
  status: GameStatus;
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  deadTimer: number; // seconds left in 'dead'
  killsSinceDrop: number;
  dropActive: boolean; // a power-up is on the field this level
};

export type AsteroidsInput = { left: boolean; right: boolean; thrust: boolean; fire: boolean };
