// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over. Sound
// is a tiny WebAudio synth (no files): a chime for rings, a soft blip for a near miss,
// a thud for a hit, a fanfare on mission complete, a chime for a landing, all after
// the first user gesture. On the title screen an autopilot flies the backdrop.
//
// ?seed=N fixes the flight pattern. ?shot=cover|rings|landing|lowfuel (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_HIT, EVENT_LANDED, EVENT_LEVEL, EVENT_LOWFUEL,
  EVENT_NEAR_MISS, EVENT_OVER, EVENT_RING,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { autopilotInput, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed), seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function soundFor(events) {
  if (events & EVENT_RING) {
    audio.ringChime();
    renderer.addPopup('+25');
  } else if (events & EVENT_NEAR_MISS) {
    audio.nearMissBlip();
    renderer.addPopup('+5 NEAR MISS');
  }
  if (events & EVENT_HIT) audio.hitThud();
  if (events & EVENT_LEVEL) audio.missionFanfare();
  if (events & EVENT_LANDED) audio.landingChime();
  if (events & EVENT_LOWFUEL) audio.lowFuelBeep();
}

function runShot(name) {
  const scene = stageShot(name, world);
  // For debugging and verification: the staged state, readable from outside the page.
  window.__skyRush = { world, screen: scene.screen };
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.ensure();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Flying. ${LIVES} lives. Steer through the gold rings.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Flying.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, autopilotInput(world), true);
      return;
    }
    const events = world.step(STEP, input.stick(), false);
    audio.setEngine(world.state.throttle, screen === SCREEN_PLAY);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_HIT) {
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    } else if (events & EVENT_RING) announce(`Ring! Score ${world.state.score}.`);
    else if (events & EVENT_LANDED) announce(`Landed! Score ${world.state.score}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, STEP);
  }

  // Leaving the tab pauses a running game rather than letting hazards fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // For the playtest: the live state, readable from outside the page.
  window.__skyRush = { world, get screen() { return screen; } };

  announce('Sky Rush. Press Enter or tap to take off.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
