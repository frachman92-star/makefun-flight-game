// The game's rules and state, with no drawing and no browser in it: the plane,
// the pool of scrolling birds, balloons, rings and stars, spawning, collisions,
// score, combo, lives and level. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns.
import { CLOUDS, FIELD, HAZARD, LEVEL, LIVES, PLAYER, POOL_SIZE, RING, STAR } from './config.js';

export const KIND_BIRD = 0;
export const KIND_BALLOON = 1;
export const KIND_RING = 2;
export const KIND_STAR = 3;

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_RING = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: PLAYER.x, y: (FIELD.groundY - PLAYER.height) / 2, width: PLAYER.width, height: PLAYER.height,
    invulnerable: 0, vy: 0, tilt: 0, boost: false,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_BIRD, x: 0, y: 0, width: 0, height: 0, speed: 0, phase: 0, passed: false });
  }
  const clouds = [];
  for (let index = 0; index < CLOUDS; index += 1) {
    clouds.push({ x: random() * FIELD.width, y: 30 + random() * 340, scale: 0.6 + random() * 0.9, speed: 18 + random() * 30 });
  }
  const state = {
    player, items, clouds, score: 0, lives: LIVES, level: 1, elapsed: 0, distance: 0,
    combo: 0, bestCombo: 0, rings: 0, stars: 0, nearMiss: 0,
    hazardTimer: 0, ringTimer: 0, starTimer: 0, scroll: 0,
  };

  function reset() {
    player.x = PLAYER.x;
    player.y = (FIELD.groundY - PLAYER.height) / 2;
    player.invulnerable = 0;
    player.vy = 0;
    player.tilt = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.distance = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.rings = 0;
    state.stars = 0;
    state.nearMiss = 0;
    state.hazardTimer = HAZARD.interval;
    state.ringTimer = 1.0;
    state.starTimer = 0.6;
    state.scroll = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function scrollSpeed() {
    return HAZARD.baseSpeed + HAZARD.speedPerLevel * (state.level - 1);
  }

  function spawnHazard() {
    const item = freeItem();
    if (item === null) return;
    const balloon = random() < 0.35;
    item.active = true;
    item.kind = balloon ? KIND_BALLOON : KIND_BIRD;
    item.width = balloon ? HAZARD.balloonWidth : HAZARD.birdWidth;
    item.height = balloon ? HAZARD.balloonHeight : HAZARD.birdHeight;
    item.x = FIELD.width + 20;
    item.y = 60 + random() * (FIELD.groundY - 140 - item.height);
    item.speed = scrollSpeed() * (balloon ? 0.85 : 1.05) + random() * HAZARD.speedJitter;
    item.phase = random() * Math.PI * 2;
    item.passed = false;
  }

  function spawnRing() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_RING;
    item.width = RING.size;
    item.height = RING.size;
    item.x = FIELD.width + 20;
    item.y = 70 + random() * (FIELD.groundY - 160 - item.height);
    item.speed = scrollSpeed();
    item.phase = 0;
    item.passed = false;
  }

  function spawnStar() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_STAR;
    item.width = STAR.size;
    item.height = STAR.size;
    item.x = FIELD.width + 20;
    item.y = 60 + random() * (FIELD.groundY - 140 - item.height);
    item.speed = scrollSpeed();
    item.phase = random() * Math.PI * 2;
    item.passed = false;
  }

  function hazardInterval() {
    return Math.max(HAZARD.minInterval, HAZARD.interval * HAZARD.intervalScale ** (state.level - 1));
  }

  function comboMultiplier() {
    return 1 + Math.min(4, Math.floor(state.combo / 3));
  }

  /**
   * One fixed step. dirX / dirY are -1, 0 or 1. `boost` is Shift or Space held
   * down: faster scroll and double distance points. With `harmless` set (the
   * title screen's backdrop) things scroll but nothing touches the player and
   * nothing scores.
   */
  function step(dt, dirX, dirY, boost, harmless) {
    let events = 0;
    state.elapsed += dt;
    const level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (level !== state.level) {
      state.level = level;
      events |= EVENT_LEVEL;
    }

    const boostFactor = boost ? 1.55 : 1;
    const speed = scrollSpeed() * boostFactor;
    state.distance += speed * dt;
    state.scroll += speed * dt;
    if (!harmless) state.score += Math.floor(speed * dt * (boost ? 0.04 : 0.02));

    // Smooth vertical steering: velocity eases toward the held direction.
    const targetVy = dirY * PLAYER.speedY;
    player.vy += (targetVy - player.vy) * Math.min(1, dt * 10);
    player.y += player.vy * dt;
    player.x += dirX * PLAYER.speedX * dt;
    player.x = Math.min(420, Math.max(60, player.x));
    player.y = Math.min(FIELD.groundY - player.height - 4, Math.max(24, player.y));
    player.tilt = Math.max(-0.35, Math.min(0.35, player.vy / 1400));
    player.boost = boost;
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    for (let index = 0; index < state.clouds.length; index += 1) {
      const cloud = state.clouds[index];
      cloud.x -= cloud.speed * dt * (0.4 + boostFactor * 0.3);
      if (cloud.x < -180) {
        cloud.x = FIELD.width + 40;
        cloud.y = 30 + random() * 340;
      }
    }

    state.hazardTimer -= dt;
    if (state.hazardTimer <= 0) {
      spawnHazard();
      state.hazardTimer += hazardInterval();
    }
    state.ringTimer -= dt;
    if (state.ringTimer <= 0) {
      spawnRing();
      state.ringTimer += RING.interval + random() * RING.intervalJitter;
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      spawnStar();
      state.starTimer += STAR.interval + random() * STAR.intervalJitter;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.x -= item.speed * (boost ? 1.3 : 1) * dt;
      if (item.kind === KIND_BALLOON) item.y += Math.sin(state.elapsed * 2 + item.phase) * 22 * dt;
      if (item.kind === KIND_BIRD) item.y += Math.sin(state.elapsed * 6 + item.phase) * 30 * dt;
      if (item.x + item.width < 0) {
        item.active = false;
        if (!item.passed && (item.kind === KIND_BIRD || item.kind === KIND_BALLOON) && !harmless) {
          state.score += HAZARD.passPoints;
        }
        continue;
      }
      if (harmless || !overlaps(item, player)) {
        // Near miss: a hazard that just cleared the plane's nose.
        if (!harmless && !item.passed && (item.kind === KIND_BIRD || item.kind === KIND_BALLOON)
          && item.x + item.width < player.x && item.x + item.width > player.x - 90
          && Math.abs((item.y + item.height / 2) - (player.y + player.height / 2)) < 70) {
          item.passed = true;
          state.nearMiss += 1;
          state.score += 5;
        }
        continue;
      }
      if (item.kind === KIND_RING) {
        item.active = false;
        state.rings += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += RING.points * comboMultiplier();
        events |= EVENT_RING;
      } else if (item.kind === KIND_STAR) {
        item.active = false;
        state.stars += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += STAR.points * comboMultiplier();
        events |= EVENT_PICKUP;
      } else if (player.invulnerable === 0) {
        item.active = false;
        item.passed = true;
        state.lives -= 1;
        state.combo = 0;
        player.invulnerable = PLAYER.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
