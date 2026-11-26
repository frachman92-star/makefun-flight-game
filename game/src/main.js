// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over. Sound is a tiny WebAudio synth
// (no files): a chime for rings, a soft blip for stars, a thud for a hit, a rising arpeggio on
// level up, all after the first user gesture.
//
// ?seed=N fixes the flight pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_LEVEL, EVENT_OVER, EVENT_PICKUP, EVENT_RING } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

let audio = null;
function ensureAudio() {
  if (audio) return;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
}
function tone(freq, dur, type, gain) {
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain || 0.08, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  } catch {
    // Sound is decoration: never let it break the game.
  }
}
function soundFor(events) {
  if (events & EVENT_RING) { tone(880, 0.18, 'sine', 0.09); setTimeout(() => tone(1320, 0.22, 'sine', 0.09), 70); }
  else if (events & EVENT_PICKUP) tone(660, 0.1, 'sine', 0.06);
  if (events & EVENT_HIT) tone(140, 0.25, 'sawtooth', 0.1);
  if (events & EVENT_LEVEL) { tone(523, 0.12, 'triangle', 0.07); setTimeout(() => tone(784, 0.16, 'triangle', 0.07), 90); }
}

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

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
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
    ensureAudio();
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
      world.step(STEP, 0, 0, false, true);
      return;
    }
    let dirX = input.directionX();
    let dirY = input.directionY();
    const pointer = input.pointerTarget();
    if (pointer !== null) {
      const player = world.state.player;
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;
      dirX = Math.max(-1, Math.min(1, (pointer.x * FIELD.width - cx) / 90));
      dirY = Math.max(-1, Math.min(1, (pointer.y * FIELD.height - cy) / 70));
    }
    const events = world.step(STEP, dirX, dirY, input.isBoost(), false);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_HIT) announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    else if (events & EVENT_RING) announce(`Ring! Score ${world.state.score}.`);
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
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting hazards fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sky Rush. Press Enter or tap to take off.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
