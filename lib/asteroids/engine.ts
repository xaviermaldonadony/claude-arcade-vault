// Pure game engine, ported from the update() logic of references/started-games/02-asteroids/game.js.
// No DOM, canvas, React, or Next imports, and no browser globals.

import {
  ASTEROID_HIT_FACTOR,
  ASTEROID_ROT_SPEED_MAX,
  ASTEROID_SPEED_JITTER,
  ASTEROID_VERTS_MAX,
  ASTEROID_VERTS_MIN,
  ASTEROID_VERT_RADIUS_MAX,
  ASTEROID_VERT_RADIUS_MIN,
  BULLET_SPEED,
  BULLET_TTL,
  DEAD_DURATION,
  DT_MAX,
  EXPLODE_ASTEROID_PER_SIZE,
  EXPLODE_DEFAULT,
  EXPLODE_SHIP,
  H,
  LEVEL_BASE_ASTEROIDS,
  PARTICLE_LIFE_MAX,
  PARTICLE_LIFE_MIN,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEE_KILLS,
  POWERUP_RADIUS,
  POWERUP_SPEED_MAX,
  POWERUP_SPEED_MIN,
  POWERUP_TTL,
  RADII,
  RESPAWN_INVINCIBLE,
  SHIP_DRAG,
  SHIP_NOSE,
  SHIP_RADIUS,
  SHIP_ROT_SPEED,
  SHIP_START_ANGLE,
  SHIP_THRUST,
  SHOOT_COOLDOWN,
  SPAWN_SAFE_DIST,
  SPEEDS,
  START_ASTEROIDS,
  START_LIVES,
  TRIPLE_SPREAD,
  W,
} from './constants';
import type {
  Asteroid,
  AsteroidSize,
  AsteroidsInput,
  AsteroidsState,
  Bullet,
  GameStatus,
  Particle,
  PowerUp,
  Ship,
  Vec,
} from './types';

export type Rng = () => number;

// Ids only need to be unique within a session. Module-level counter; no DOM involved.
let idSeq = 0;
const nextId = (): number => ++idSeq;

export const wrap = (v: number, max: number): number => ((v % max) + max) % max;

export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

const rand = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

const randInt = (rng: Rng, min: number, max: number): number => Math.floor(rand(rng, min, max + 1));

// ── Asteroids ────────────────────────────────────────────────────────────────

export function makeAsteroid(rng: Rng, x: number, y: number, size: AsteroidSize): Asteroid {
  const radius = RADII[size];
  const angle = rand(rng, 0, Math.PI * 2);
  const speed = SPEEDS[size] + rand(rng, -ASTEROID_SPEED_JITTER, ASTEROID_SPEED_JITTER);
  const n = randInt(rng, ASTEROID_VERTS_MIN, ASTEROID_VERTS_MAX);
  const verts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radius * rand(rng, ASTEROID_VERT_RADIUS_MIN, ASTEROID_VERT_RADIUS_MAX);
    verts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return {
    id: nextId(),
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius,
    rot: rand(rng, 0, Math.PI * 2),
    rotSpeed: rand(rng, -ASTEROID_ROT_SPEED_MAX, ASTEROID_ROT_SPEED_MAX),
    verts,
  };
}

export function spawnAsteroids(rng: Rng, count: number): Asteroid[] {
  const out: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    do {
      x = rand(rng, 0, W);
      y = rand(rng, 0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SPAWN_SAFE_DIST);
    out.push(makeAsteroid(rng, x, y, 3));
  }
  return out;
}

// Large splits into two medium, medium into two small, small does not split.
export function splitAsteroid(rng: Rng, a: Asteroid): Asteroid[] {
  if (a.size <= 1) return [];
  const next = (a.size - 1) as AsteroidSize;
  return [makeAsteroid(rng, a.x, a.y, next), makeAsteroid(rng, a.x, a.y, next)];
}

function updateAsteroid(a: Asteroid, dt: number): Asteroid {
  return {
    ...a,
    x: wrap(a.x + a.vx * dt, W),
    y: wrap(a.y + a.vy * dt, H),
    rot: a.rot + a.rotSpeed * dt,
  };
}

// ── Bullets ──────────────────────────────────────────────────────────────────

function makeBullet(x: number, y: number, angle: number): Bullet {
  return {
    id: nextId(),
    x,
    y,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    ttl: BULLET_TTL,
  };
}

function updateBullet(b: Bullet, dt: number): Bullet {
  return {
    ...b,
    x: wrap(b.x + b.vx * dt, W),
    y: wrap(b.y + b.vy * dt, H),
    ttl: b.ttl - dt,
  };
}

// ── Power-ups ────────────────────────────────────────────────────────────────

function makePowerUp(rng: Rng, x: number, y: number): PowerUp {
  const angle = rand(rng, 0, Math.PI * 2);
  const speed = rand(rng, POWERUP_SPEED_MIN, POWERUP_SPEED_MAX);
  return {
    id: nextId(),
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    ttl: POWERUP_TTL,
  };
}

function updatePowerUp(p: PowerUp, dt: number): PowerUp {
  return {
    ...p,
    x: wrap(p.x + p.vx * dt, W),
    y: wrap(p.y + p.vy * dt, H),
    ttl: p.ttl - dt,
  };
}

// ── Particles ────────────────────────────────────────────────────────────────

function makeParticle(rng: Rng, x: number, y: number): Particle {
  const angle = rand(rng, 0, Math.PI * 2);
  const speed = rand(rng, PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX);
  const life = rand(rng, PARTICLE_LIFE_MIN, PARTICLE_LIFE_MAX);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    ttl: life,
  };
}

export function explode(
  rng: Rng,
  x: number,
  y: number,
  count: number = EXPLODE_DEFAULT,
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) out.push(makeParticle(rng, x, y));
  return out;
}

function updateParticle(p: Particle, dt: number): Particle {
  // Particles are not wrapped, as in the reference.
  return { ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ttl: p.ttl - dt };
}

// ── Ship ─────────────────────────────────────────────────────────────────────

// Respawn at center with invincibility. tripleShot carries over, as in the reference reset().
function respawnShip(tripleShot: number): Ship {
  return {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    angle: SHIP_START_ANGLE,
    radius: SHIP_RADIUS,
    invincible: RESPAWN_INVINCIBLE,
    shootCooldown: 0,
    tripleShot,
    thrusting: false,
  };
}

// Timers tick down toward 0. Invincibility may go slightly below 0, as in the reference.
const tick = (t: number, dt: number): number => (t > 0 ? t - dt : t);

function updateShip(ship: Ship, input: AsteroidsInput, dt: number): Ship {
  let angle = ship.angle;
  if (input.left) angle -= SHIP_ROT_SPEED * dt;
  if (input.right) angle += SHIP_ROT_SPEED * dt;

  let vx = ship.vx;
  let vy = ship.vy;
  if (input.thrust) {
    vx += Math.cos(angle) * SHIP_THRUST * dt;
    vy += Math.sin(angle) * SHIP_THRUST * dt;
  }
  vx *= SHIP_DRAG;
  vy *= SHIP_DRAG;

  return {
    ...ship,
    x: wrap(ship.x + vx * dt, W),
    y: wrap(ship.y + vy * dt, H),
    vx,
    vy,
    angle,
    invincible: tick(ship.invincible, dt),
    shootCooldown: tick(ship.shootCooldown, dt),
    tripleShot: tick(ship.tripleShot, dt),
    thrusting: input.thrust,
  };
}

// Returns the ship with cooldown set, plus any new bullets. Empty if on cooldown.
function fire(ship: Ship): { ship: Ship; bullets: Bullet[] } {
  if (ship.shootCooldown > 0) return { ship, bullets: [] };
  const ox = ship.x + Math.cos(ship.angle) * SHIP_NOSE;
  const oy = ship.y + Math.sin(ship.angle) * SHIP_NOSE;
  const angles =
    ship.tripleShot > 0
      ? [ship.angle - TRIPLE_SPREAD, ship.angle, ship.angle + TRIPLE_SPREAD]
      : [ship.angle];
  return {
    ship: { ...ship, shootCooldown: SHOOT_COOLDOWN },
    bullets: angles.map((a) => makeBullet(ox, oy, a)),
  };
}

// ── Game state ───────────────────────────────────────────────────────────────

export function createGame(rng: Rng = Math.random): AsteroidsState {
  return {
    status: 'playing',
    ship: respawnShip(0),
    asteroids: spawnAsteroids(rng, START_ASTEROIDS),
    bullets: [],
    particles: [],
    powerUps: [],
    score: 0,
    lives: START_LIVES,
    level: 1,
    deadTimer: 0,
    killsSinceDrop: 0,
    dropActive: false,
  };
}

// Pause and resume only switch between 'playing' and 'paused'. Other statuses are unchanged.
export function setPaused(state: AsteroidsState, paused: boolean): AsteroidsState {
  if (paused && state.status === 'playing') return { ...state, status: 'paused' };
  if (!paused && state.status === 'paused') return { ...state, status: 'playing' };
  return state;
}

// Advance the game by dt seconds. dt is clamped to DT_MAX.
export function step(
  state: AsteroidsState,
  input: AsteroidsInput,
  dt: number,
  rng: Rng = Math.random,
): AsteroidsState {
  const h = Math.min(Math.max(dt, 0), DT_MAX);
  switch (state.status) {
    case 'paused':
      return state;
    case 'gameover':
      return {
        ...state,
        particles: state.particles.map((p) => updateParticle(p, h)).filter((p) => p.ttl > 0),
      };
    case 'dead':
      return stepDead(state, h);
    case 'playing':
      return stepPlaying(state, input, h, rng);
  }
}

function stepDead(state: AsteroidsState, dt: number): AsteroidsState {
  const particles = state.particles.map((p) => updateParticle(p, dt)).filter((p) => p.ttl > 0);
  const asteroids = state.asteroids.map((a) => updateAsteroid(a, dt));
  const deadTimer = state.deadTimer - dt;
  if (deadTimer > 0) return { ...state, deadTimer, particles, asteroids };
  return {
    ...state,
    status: 'playing',
    ship: respawnShip(state.ship.tripleShot),
    deadTimer: 0,
    particles,
    asteroids,
  };
}

function stepPlaying(
  state: AsteroidsState,
  input: AsteroidsInput,
  dt: number,
  rng: Rng,
): AsteroidsState {
  // Fire uses the cooldown from before this frame, then the ship updates, as in the reference.
  const fired = input.fire ? fire(state.ship) : { ship: state.ship, bullets: [] };
  let ship = updateShip(fired.ship, input, dt);

  let bullets = [...state.bullets, ...fired.bullets]
    .map((b) => updateBullet(b, dt))
    .filter((b) => b.ttl > 0);
  let asteroids = state.asteroids.map((a) => updateAsteroid(a, dt));
  let particles = state.particles.map((p) => updateParticle(p, dt)).filter((p) => p.ttl > 0);
  let powerUps = state.powerUps.map((p) => updatePowerUp(p, dt)).filter((p) => p.ttl > 0);

  let score = state.score;
  let lives = state.lives;
  let level = state.level;
  let status: GameStatus = 'playing';
  let deadTimer = state.deadTimer;
  let killsSinceDrop = state.killsSinceDrop;
  let dropActive = state.dropActive;

  // Power-up pickup, before bullet collisions, as in the reference.
  const pickedUp = powerUps.some((p) => dist(ship, p) < ship.radius + POWERUP_RADIUS);
  if (pickedUp) {
    powerUps = powerUps.filter((p) => dist(ship, p) >= ship.radius + POWERUP_RADIUS);
    ship = { ...ship, tripleShot: POWERUP_DURATION };
  }

  // Bullet vs asteroid. Each bullet hits at most one asteroid, and each asteroid dies once.
  const hitBullets = new Set<number>();
  const hitAsteroids = new Set<number>();
  const fragments: Asteroid[] = [];
  const explosions: Particle[] = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (hitBullets.has(b.id) || hitAsteroids.has(a.id)) continue;
      if (dist(b, a) >= a.radius) continue;
      hitBullets.add(b.id);
      hitAsteroids.add(a.id);
      score += POINTS[a.size];
      explosions.push(...explode(rng, a.x, a.y, a.size * EXPLODE_ASTEROID_PER_SIZE));
      fragments.push(...splitAsteroid(rng, a));
      if (!dropActive) {
        killsSinceDrop++;
        // Guaranteed drop after N kills without one. Short-circuit: rng is not called when guaranteed.
        const guaranteed = killsSinceDrop >= POWERUP_GUARANTEE_KILLS;
        if (guaranteed || rng() < POWERUP_DROP_CHANCE) {
          powerUps = [...powerUps, makePowerUp(rng, a.x, a.y)];
          dropActive = true;
        }
      }
    }
  }
  bullets = bullets.filter((b) => !hitBullets.has(b.id));
  asteroids = asteroids.filter((a) => !hitAsteroids.has(a.id)).concat(fragments);
  particles = particles.concat(explosions);

  // Ship vs asteroid, only when not invincible.
  if (ship.invincible <= 0) {
    const hit = asteroids.some((a) => dist(ship, a) < ship.radius + a.radius * ASTEROID_HIT_FACTOR);
    if (hit) {
      particles = particles.concat(explode(rng, ship.x, ship.y, EXPLODE_SHIP));
      lives -= 1;
      if (lives <= 0) {
        status = 'gameover';
      } else {
        status = 'dead';
        deadTimer = DEAD_DURATION;
      }
    }
  }

  // Level complete: next level clears the field and respawns the ship, keeping triple shot.
  if (status === 'playing' && asteroids.length === 0) {
    level += 1;
    bullets = [];
    particles = [];
    powerUps = [];
    dropActive = false;
    killsSinceDrop = 0;
    ship = respawnShip(ship.tripleShot);
    asteroids = spawnAsteroids(rng, LEVEL_BASE_ASTEROIDS + level);
  }

  return {
    ...state,
    status,
    ship,
    asteroids,
    bullets,
    particles,
    powerUps,
    score,
    lives,
    level,
    deadTimer,
    killsSinceDrop,
    dropActive,
  };
}
