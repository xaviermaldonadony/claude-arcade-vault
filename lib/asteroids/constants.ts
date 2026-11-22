// Numbers ported from references/started-games/02-asteroids/game.js.

// Field, in pixels. Origin top-left.
export const W = 800;
export const H = 600;

// Max dt per frame, in seconds.
export const DT_MAX = 0.05;

// Indexed by AsteroidSize (1 small, 2 medium, 3 large). Index 0 is unused.
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // base speed, px/s
export const POINTS = [0, 100, 50, 20] as const;

// Asteroid spawning and shape.
export const ASTEROID_SPEED_JITTER = 15; // ± px/s around the base speed
export const ASTEROID_ROT_SPEED_MAX = 1.2; // rad/s, ± range
export const ASTEROID_VERTS_MIN = 8;
export const ASTEROID_VERTS_MAX = 13;
export const ASTEROID_VERT_RADIUS_MIN = 0.6; // fraction of radius
export const ASTEROID_VERT_RADIUS_MAX = 1.0;
export const ASTEROID_HIT_FACTOR = 0.82; // ship hit if dist < ship.radius + radius * this
export const SPAWN_SAFE_DIST = 130; // no spawn closer than this to the center
export const START_ASTEROIDS = 4;
export const LEVEL_BASE_ASTEROIDS = 3; // level n spawns LEVEL_BASE_ASTEROIDS + n

// Bullets.
export const BULLET_SPEED = 520; // px/s
export const BULLET_TTL = 1.1; // s
export const BULLET_RADIUS = 2;

// Ship.
export const SHIP_RADIUS = 12;
export const SHIP_ROT_SPEED = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987; // velocity multiplier per frame
export const SHIP_NOSE = 21; // bullet spawn offset from center
export const SHIP_START_ANGLE = -Math.PI / 2;
export const SHOOT_COOLDOWN = 0.2; // s
export const RESPAWN_INVINCIBLE = 3; // s
export const DEAD_DURATION = 2; // s in 'dead' before respawn
export const START_LIVES = 3;

// Particles.
export const PARTICLE_SPEED_MIN = 30;
export const PARTICLE_SPEED_MAX = 130;
export const PARTICLE_LIFE_MIN = 0.4; // s
export const PARTICLE_LIFE_MAX = 1.1; // s
export const EXPLODE_DEFAULT = 8;
export const EXPLODE_SHIP = 14;
export const EXPLODE_ASTEROID_PER_SIZE = 5; // count = size * this

// Power-ups.
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEE_KILLS = 5; // kills without a drop before a drop is guaranteed
export const POWERUP_DURATION = 5; // s of triple shot
export const POWERUP_TTL = 12; // s on the field
export const POWERUP_RADIUS = 12;
export const POWERUP_SPEED_MIN = 20;
export const POWERUP_SPEED_MAX = 40;
export const TRIPLE_SPREAD = 0.18; // rad between the three shots
