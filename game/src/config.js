// Every tuning number and colour in one place. Sky Rush is a side-scrolling
// flight game: the plane flies left to right through a 1280x720 sky, hazards
// and rings scroll in from the right. The renderer scales the field to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  width: 84,
  height: 34,
  x: 220,
  speedX: 320,
  speedY: 460,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** Hazards: birds flap across, balloons drift slowly and bob. */
export const HAZARD = {
  birdWidth: 54,
  birdHeight: 30,
  balloonWidth: 56,
  balloonHeight: 78,
  baseSpeed: 260,
  speedPerLevel: 26,
  speedJitter: 80,
  interval: 0.9,
  intervalScale: 0.9,
  minInterval: 0.32,
  passPoints: 2,
};

/** Gold rings: fly through the centre for big points and a combo step. */
export const RING = {
  size: 72,
  speed: 260,
  interval: 2.2,
  intervalJitter: 1.1,
  points: 25,
};

/** Small stars: easy pickups that keep the combo alive. */
export const STAR = {
  size: 26,
  speed: 260,
  interval: 1.1,
  intervalJitter: 0.7,
  points: 10,
};

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 12, max: 12 };

/** How many scrolling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 72;

/** Decorative clouds, also allocated once. */
export const CLOUDS = 9;

export const PALETTE = {
  backdrop: '#0e2a4a',
  skyTop: '#4aa8e8',
  skyMid: '#8fd0f5',
  skyBottom: '#d8f1ff',
  sun: '#ffd94d',
  sunGlow: '#fff3b0',
  mountainFar: '#7fa8c9',
  mountainNear: '#5b8a6a',
  ground: '#6b9e5e',
  groundDark: '#4e7d44',
  player: '#ff5a3c',
  playerWing: '#e33d24',
  cockpit: '#bfe9ff',
  propeller: '#3a2f2a',
  bird: '#2f3a4a',
  balloon: '#ff6b9d',
  balloonBasket: '#8a5a2b',
  ring: '#f2c94c',
  ringInner: '#ffe98a',
  star: '#ffd94d',
  panel: '#10233a',
  panelEdge: '#2b4a6b',
  text: '#ffffff',
  muted: '#c7d9ea',
  danger: '#ff5a3c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-rush.best';
