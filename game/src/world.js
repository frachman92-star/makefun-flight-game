// The game's rules and state, with no drawing and no browser in it: the aircraft
// (throttle, bank, pitch, heading, fuel, damage), the rings and hazards ahead, the
// missions (ring runs, a low river run, a runway landing, a waypoint dash), score,
// combo, lives and levels. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.
import {
  CHUNK, DAMAGE, FUEL, HAZARD, LIVES, MISSIONS, PLANE, REPEAT, RING, RUNWAY, VIEW_DISTANCE,
} from './config.js';
import { riverCenterX } from './terrain.js';

export const EVENT_RING = 1;
export const EVENT_NEAR_MISS = 2;
export const EVENT_HIT = 4;
export const EVENT_LEVEL = 8;
export const EVENT_OVER = 16;
export const EVENT_LANDED = 32;
export const EVENT_MISSION = 64;
export const EVENT_LOWFUEL = 128;

const KIND_BIRD = 0;
const KIND_BALLOON = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** The mission for a level: the list repeats, harder each time round. */
export function missionForLevel(level) {
  const base = MISSIONS[level % MISSIONS.length];
  const repeat = Math.floor(level / MISSIONS.length);
  return {
    name: base.name,
    goal: base.goal,
    ringsTotal: base.rings + repeat * REPEAT.extraRings,
    fuel: Math.max(REPEAT.minFuel, base.fuel - repeat * REPEAT.lessFuel),
    lowRings: base.lowRings,
    landing: base.landing,
    runwayAhead: base.runwayAhead || 0,
    waypointDistance: base.waypointDistance || 0,
  };
}

export function createWorld(random, seed) {
  const state = {
    seed,
    time: 0,
    score: 0,
    lives: LIVES,
    level: 0,
    combo: 0,
    bestCombo: 0,
    x: 0,
    altitude: PLANE.startAltitude,
    z: 0,
    speed: 130,
    throttle: 0.6,
    bank: 0,
    pitch: 0,
    heading: 90,
    verticalSpeed: 0,
    fuel: FUEL.start,
    damage: 0,
    invulnerable: 0,
    shake: 0,
    missionName: '',
    missionGoal: '',
    missionProgress: '',
    ringsHit: 0,
    ringsTotal: 0,
    ringsSpawned: 0,
    rings: [],
    hazards: [],
    nextRingZ: 0,
    lastRingX: 0,
    lastRingAlt: 60,
    runway: null,
    waypointZ: 0,
    banner: '',
    bannerKind: '',
    bannerTime: 0,
    levelComplete: false,
    levelCompleteTimer: 0,
    lowFuelWarned: false,
    over: false,
    crashed: false,
    hazardTimer: 1.2,
    balloonTimer: 3.0,
  };

  function showBanner(text, kind, seconds) {
    state.banner = text;
    state.bannerKind = kind || '';
    state.bannerTime = seconds || 2.2;
  }

  /** Set the aircraft and the course for one level of the mission list. */
  function startLevel(level) {
    const mission = missionForLevel(level);
    state.level = level;
    state.missionName = mission.name;
    state.missionGoal = mission.goal;
    state.ringsTotal = mission.ringsTotal;
    state.ringsHit = 0;
    state.combo = 0;
    state.x = 0;
    state.altitude = PLANE.startAltitude;
    state.z = 0;
    state.speed = 130;
    state.throttle = 0.6;
    state.bank = 0;
    state.pitch = 0;
    state.heading = 90;
    state.verticalSpeed = 0;
    state.fuel = mission.fuel;
    state.damage = 0;
    state.invulnerable = 0;
    state.rings = [];
    state.ringsSpawned = 0;
    state.hazards = [];
    state.nextRingZ = 150;
    state.lastRingX = 0;
    state.lastRingAlt = PLANE.startAltitude;
    state.runway = mission.landing
      ? { x: 0, z1: mission.runwayAhead, z2: mission.runwayAhead + RUNWAY.length }
      : null;
    state.waypointZ = mission.waypointDistance;
    state.levelComplete = false;
    state.levelCompleteTimer = 0;
    state.lowFuelWarned = false;
    state.crashed = false;
    state.hazardTimer = 1.4;
    state.balloonTimer = 3.5;
    updateMissionProgress();
    showBanner(`LEVEL ${level + 1}: ${mission.name}`, '', 2.4);
  }

  function updateMissionProgress() {
    if (state.runway) {
      state.missionProgress = state.ringsHit >= state.ringsTotal
        ? 'LAND ON THE RUNWAY'
        : `RINGS ${state.ringsHit}/${state.ringsTotal} THEN LAND`;
    } else if (state.waypointZ > 0) {
      state.missionProgress = `WAYPOINT ${Math.max(0, Math.round((state.waypointZ - state.z) / 10))} m · RINGS ${state.ringsHit}/${state.ringsTotal}`;
    } else {
      state.missionProgress = `RINGS ${state.ringsHit}/${state.ringsTotal}`;
    }
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.lives = LIVES;
    state.over = false;
    startLevel(0);
  }

  /** The next ring the aircraft has not reached yet, or null when there is none. */
  function nextRing() {
    for (const ring of state.rings) {
      if (!ring.passed) return ring;
    }
    return null;
  }

  function spawnRing() {
    const mission = missionForLevel(state.level);
    const z = state.nextRingZ;
    let x;
    let alt;
    if (mission.lowRings) {
      x = riverCenterX(z) + (random() - 0.5) * 30;
      alt = 25 + random() * 55;
    } else {
      x = clamp(state.lastRingX + (random() - 0.5) * 180, -260, 260);
      alt = 40 + random() * 180;
    }
    state.rings.push({ x, alt, z, radius: RING.radius, passed: false, hit: false });
    state.ringsSpawned += 1;
    state.lastRingX = x;
    state.lastRingAlt = alt;
    state.nextRingZ = z + RING.spacing + (random() - 0.5) * RING.spacingJitter * 2;
  }

  function spawnHazard(balloon) {
    const z = state.z + 650 + random() * 250;
    state.hazards.push({
      kind: balloon ? KIND_BALLOON : KIND_BIRD,
      x: -280 + random() * 560,
      alt: 20 + random() * 240,
      z,
      vx: (random() - 0.5) * (balloon ? HAZARD.balloonSpeed : HAZARD.birdSpeed),
      phase: random() * Math.PI * 2,
      passed: false,
    });
  }

  function completeMission(events) {
    const bonus = 200 + Math.round(state.fuel) * 2;
    state.score += bonus;
    state.levelComplete = true;
    state.levelCompleteTimer = 2.6;
    showBanner(`MISSION COMPLETE  +${bonus}`, '', 2.6);
    return events | EVENT_LEVEL;
  }

  function crash(events) {
    state.lives -= 1;
    state.combo = 0;
    state.damage = DAMAGE.max;
    state.shake = 0.6;
    showBanner(state.lives > 0 ? 'CRASHED' : 'GAME OVER', 'bad', 2.2);
    if (state.lives <= 0) {
      state.over = true;
      return events | EVENT_HIT | EVENT_OVER;
    }
    startLevel(state.level);
    state.invulnerable = 2;
    showBanner('CRASHED', 'bad', 2.2);
    return events | EVENT_HIT;
  }

  /**
   * One fixed step. `input` is { throttle, bank, pitch } each -1, 0 or 1 (or in
   * between from a pointer drag). With `harmless` set (the title screen's
   * backdrop) things fly but nothing scores, breaks or ends.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.time += dt;
    if (state.bannerTime > 0) {
      state.bannerTime -= dt;
      if (state.bannerTime <= 0) state.banner = '';
    }
    if (state.invulnerable > 0) state.invulnerable = Math.max(0, state.invulnerable - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    if (state.levelComplete) {
      state.levelCompleteTimer -= dt;
      if (state.levelCompleteTimer <= 0) {
        startLevel(state.level + 1);
        events |= EVENT_MISSION;
      }
      return events;
    }

    // Throttle: W/S ease it up and down; an empty tank forces it to idle.
    if (state.fuel > 0) {
      state.throttle = clamp(state.throttle + input.throttle * dt * 0.8, 0, 1);
    } else {
      state.throttle = Math.max(0, state.throttle - dt * 0.5);
    }
    const targetSpeed = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.9);

    // Bank turns the nose; the nose sets the lateral slide.
    state.bank += clamp(input.bank - state.bank, -PLANE.bankApproach * dt, PLANE.bankApproach * dt);
    state.heading = (state.heading + state.bank * PLANE.turnRate * dt + 360) % 360;
    const headingRadians = (state.heading - 90) * Math.PI / 180;
    state.x += (Math.sin(headingRadians) * state.speed + state.bank * state.speed * PLANE.bankSlide * 0.35) * dt;
    state.x = clamp(state.x, -420, 420);

    // Pitch climbs and dives; an empty tank at low speed sinks the aircraft.
    state.pitch += clamp(input.pitch - state.pitch, -dt * 3, dt * 3);
    state.verticalSpeed = state.pitch * state.speed * PLANE.climbFactor;
    if (state.fuel <= 0 && state.speed < PLANE.stallSpeed) {
      state.verticalSpeed -= (PLANE.stallSpeed - state.speed) * 0.5;
    }
    state.altitude = clamp(state.altitude + state.verticalSpeed * dt, 0, PLANE.maxAltitude);
    state.z += state.speed * dt;

    if (!harmless) {
      state.fuel = Math.max(0, state.fuel - (FUEL.drainIdle + state.throttle * FUEL.drainThrottle) * dt);
      if (state.fuel < FUEL.lowWarning && !state.lowFuelWarned) {
        state.lowFuelWarned = true;
        events |= EVENT_LOWFUEL;
      }
    }

    // Rings ahead, up to the edge of what the camera can see.
    while (state.ringsSpawned < state.ringsTotal && state.nextRingZ < state.z + VIEW_DISTANCE) {
      spawnRing();
    }
    state.rings = state.rings.filter((r) => r.z > state.z - 80);

    state.hazardTimer -= dt;
    if (state.hazardTimer <= 0) {
      spawnHazard(false);
      state.hazardTimer += HAZARD.birdInterval + random() * 0.8;
    }
    state.balloonTimer -= dt;
    if (state.balloonTimer <= 0) {
      spawnHazard(true);
      state.balloonTimer += HAZARD.balloonInterval + random() * 1.5;
    }

    for (const ring of state.rings) {
      if (ring.passed || ring.z > state.z) continue;
      ring.passed = true;
      const distance = Math.hypot(state.x - ring.x, state.altitude - ring.alt);
      if (distance < ring.radius) {
        ring.hit = true;
        state.ringsHit += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += Math.round(RING.passPoints * (1 + Math.min(state.combo, 10) * 0.1));
        events |= EVENT_RING;
      } else if (distance < RING.nearMissRadius) {
        state.score += RING.nearMissPoints;
        events |= EVENT_NEAR_MISS;
      } else {
        state.combo = 0;
      }
      updateMissionProgress();
    }

    for (const hazard of state.hazards) {
      if (hazard.passed) continue;
      hazard.x += hazard.vx * dt;
      if (hazard.z < state.z - 40) {
        hazard.passed = true;
        continue;
      }
      if (harmless || state.invulnerable > 0) continue;
      if (Math.abs(hazard.z - state.z) > 8) continue;
      const radius = hazard.kind === KIND_BALLOON ? HAZARD.balloonRadius : HAZARD.birdRadius;
      if (Math.hypot(state.x - hazard.x, state.altitude - hazard.alt) < radius + 9) {
        hazard.passed = true;
        state.damage += DAMAGE.hit;
        state.combo = 0;
        state.invulnerable = 1.2;
        state.shake = 0.4;
        events |= EVENT_HIT;
        if (state.damage >= DAMAGE.max) return crash(events);
      }
    }
    state.hazards = state.hazards.filter((h) => !h.passed && h.z > state.z - 60);

    // The ground: a runway landing reads as a landing, anything else as a crash.
    if (state.altitude <= 0.5 && !harmless) {
      const runway = state.runway;
      const onRunway = runway
        && Math.abs(state.x) < RUNWAY.width / 2 - 2
        && state.z >= runway.z1 && state.z <= runway.z2;
      if (onRunway && state.speed < 150 && state.verticalSpeed > -35) {
        state.score += 200;
        events |= EVENT_LANDED;
        events = completeMission(events);
      } else {
        return crash(events);
      }
    }

    // The mission line is live: the waypoint distance counts down as you fly.
    updateMissionProgress();
    if (!harmless) {
      if (state.runway && state.ringsHit >= state.ringsTotal && !state.levelComplete) {
        updateMissionProgress();
      }
      if (!state.runway && state.waypointZ <= 0 && state.ringsHit >= state.ringsTotal && !state.levelComplete) {
        events = completeMission(events);
      }
      if (state.waypointZ > 0 && state.z >= state.waypointZ && !state.levelComplete) {
        events = completeMission(events);
      }
    }

    return events;
  }

  reset();
  return { state, reset, startLevel, step, nextRing, missionForLevel };
}
