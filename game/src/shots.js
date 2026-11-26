// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple autopilot (avoid the nearest hazard
// ahead, chase the nearest ring or star when that is safe), so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_BALLOON, KIND_BIRD, KIND_RING, KIND_STAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play scene's pilot
 * looks well ahead and keeps all its lives; the end scene's looks only a moment ahead, so it is
 * caught out once the hazards speed up, as a hurried player is.
 */
const HORIZON_PLAY = 0.8;
const HORIZON_END = 0.25;

/** Is the plane, moving with dirY for `horizon` seconds, going to hit a hazard? */
function dangerAt(state, dirY, horizon) {
  const player = state.player;
  let y = player.y;
  let vy = player.vy;
  const steps = Math.ceil(horizon / STEP);
  for (let s = 0; s < steps; s += 1) {
    const targetVy = dirY * 460;
    vy += (targetVy - vy) * Math.min(1, STEP * 10);
    y += vy * STEP;
    y = Math.min(FIELD.groundY - player.height - 4, Math.max(24, y));
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || (item.kind !== KIND_BIRD && item.kind !== KIND_BALLOON)) continue;
      const ix = item.x - item.speed * STEP * (s + 1);
      if (ix < player.x + player.width && ix + item.width > player.x
        && item.y < y + player.height && item.y + item.height > y) return true;
    }
  }
  return false;
}

/** Steer toward the nearest ring or star ahead, unless that way is dangerous. */
function autopilot(state, horizon) {
  const player = state.player;
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || (item.kind !== KIND_RING && item.kind !== KIND_STAR)) continue;
    if (item.x < player.x) continue;
    if (target === null || item.x < target.x) target = item;
  }
  const centre = player.y + player.height / 2;
  let wanted = 0;
  if (target !== null) {
    const tc = target.y + target.height / 2;
    wanted = tc > centre + 10 ? 1 : tc < centre - 10 ? -1 : 0;
  } else if (centre < 200) wanted = 1;
  else if (centre > 480) wanted = -1;
  if (!dangerAt(state, wanted, horizon)) return { x: 0, y: wanted };
  for (const dir of [-1, 1, 0]) {
    if (!dangerAt(state, dir, horizon)) return { x: 0, y: dir };
  }
  return { x: 0, y: wanted };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    const dir = autopilot(world.state, horizon);
    if (world.step(STEP, dir.x, dir.y, false, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
