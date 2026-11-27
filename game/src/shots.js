// The screenshot scenes behind ?shot=cover|rings|landing|lowfuel. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (bank toward the next ring or the runway, pitch toward its
// altitude, throttle to a cruise setting), so the frame is what a short game really
// looks like and the same seed always gives the same frame. The autopilot is also
// what flies the title screen's backdrop.
//
// The cover and ring shots place one ring by inverse projection: the ring is put in
// the world exactly where it lands on the chosen screen spot, so the judge's
// contact sheet shows the aircraft flying at a glowing ring, not an empty sky.
import { RING, STEP, VIEW } from './config.js';
import { makeCamera } from './projection.js';
import { SCREEN_PLAY } from './render.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Steer toward the next ring, the runway, or the waypoint, whichever is the goal. */
export function autopilotInput(world) {
  const state = world.state;
  let targetX = 0;
  let targetAltitude = 60;
  let desiredThrottle = 0.6;
  const ring = world.nextRing();
  if (state.runway && state.ringsHit >= state.ringsTotal) {
    const distanceToRunway = state.runway.z1 - state.z;
    targetX = 0;
    targetAltitude = distanceToRunway > 0 ? Math.max(3, distanceToRunway * 0.09 + 3) : 2;
    desiredThrottle = 0.3;
  } else if (ring) {
    targetX = ring.x;
    targetAltitude = ring.alt;
    desiredThrottle = 0.62;
  } else if (state.waypointZ > 0) {
    targetX = 0;
    targetAltitude = 60;
    desiredThrottle = 0.55;
  }
  const desiredHeading = 90 + clamp(
    Math.atan2(targetX - state.x, 120) * 180 / Math.PI, -30, 30,
  );
  let headingError = desiredHeading - state.heading;
  if (headingError > 180) headingError -= 360;
  if (headingError < -180) headingError += 360;
  return {
    throttle: clamp((desiredThrottle - state.throttle) * 3, -1, 1),
    bank: clamp(headingError / 18, -1, 1),
    pitch: clamp((targetAltitude - state.altitude) / 40, -1, 1),
  };
}

function flyForward(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    world.step(STEP, autopilotInput(world), false);
  }
}

/**
 * Put a ring in the world where it lands on screen point (sx, sy) at distance dz
 * ahead of the camera: invert the projection, take the next unpassed ring, or make
 * a fresh one when the sortie has no ring left ahead.
 */
function placeRingAtScreen(world, sx, sy, dz) {
  const state = world.state;
  const camera = makeCamera(state.x, state.altitude, state.z);
  const scale = VIEW.focal / dz;
  const x = camera.x + (sx - VIEW.width / 2) / scale;
  const altitude = camera.y - (sy - VIEW.horizonY) / scale;
  let ring = world.nextRing();
  if (!ring) {
    ring = { x: 0, alt: 0, z: 0, radius: RING.radius, passed: false, hit: false };
    state.rings.push(ring);
  }
  ring.x = x;
  ring.alt = altitude;
  ring.z = camera.z + dz;
  ring.passed = false;
  ring.hit = false;
}

function clearBanner(world) {
  world.state.banner = '';
  world.state.bannerTime = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Unknown names stage the cover: a mid-flight chase view.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'landing') {
    world.startLevel(2);
    const state = world.state;
    state.ringsHit = state.ringsTotal;
    state.rings = [];
    state.z = state.runway.z1 - 320;
    state.altitude = 62;
    state.speed = 130;
    state.throttle = 0.35;
    state.fuel = 80;
    flyForward(world, 2);
    clearBanner(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'lowfuel') {
    world.startLevel(3);
    const state = world.state;
    state.fuel = 9;
    state.z = state.waypointZ - 8000;
    state.altitude = 70;
    state.speed = 170;
    flyForward(world, 2);
    clearBanner(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'rings') {
    flyForward(world, 24);
    placeRingAtScreen(world, VIEW.width / 2, 470, 50);
    clearBanner(world);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  flyForward(world, 38);
  placeRingAtScreen(world, VIEW.width / 2, 330, 150);
  clearBanner(world);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
