// Sky Rush v2: every tuning number, colour and mission in one place. The game is a
// pseudo-3D chase-view flight game on a 1280x720 canvas: the camera sits behind the
// aircraft and looks forward over recognisable terrain (fields, a winding river, a town,
// mountains on the horizon), with a runway ahead at takeoff and landing, glowing target
// rings to fly through, and a lit instrument HUD. Nothing here depends on the screen
// size: the renderer draws in these field coordinates and scales to the window.

export const VIEW = { width: 1280, height: 720, horizonY: 252, focal: 420 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The chase camera: how far behind the aircraft it sits, and how far above it. */
export const CAMERA = { behind: 22, heightAbovePlane: 10, followX: 0.85 };

/** The aircraft: speeds in world units a second, altitudes in world units. */
export const PLANE = {
  startAltitude: 60,
  maxAltitude: 320,
  minSpeed: 70,
  maxSpeed: 260,
  /** Throttle 0 coasts at minSpeed, throttle 1 at maxSpeed. */
  speedApproach: 42,
  /** How fast the bank follows the stick, and how much bank turns the nose. */
  bankApproach: 3.2,
  turnRate: 24,
  /** Lateral slide from bank, as a fraction of forward speed. */
  bankSlide: 0.42,
  /** Vertical speed as a fraction of forward speed at full pitch. */
  climbFactor: 0.38,
  /** Stall speed: slower than this with no fuel, the aircraft sinks and crashes. */
  stallSpeed: 80,
};

/** Fuel: 100 at the start of a sortie, drained faster the harder the throttle works. */
export const FUEL = { start: 100, drainIdle: 0.3, drainThrottle: 0.55, lowWarning: 20 };

/** Damage: a bird or balloon hit costs this much; 100 is a crash. */
export const DAMAGE = { hit: 25, max: 100 };

export const LIVES = 3;

/** Glowing target rings: fly through the centre for points and a combo step. */
export const RING = {
  radius: 16,
  passPoints: 25,
  nearMissRadius: 26,
  nearMissPoints: 5,
  /** Distance between rings along the flight path, with jitter either way. */
  spacing: 520,
  spacingJitter: 100,
};

/** Hazards: birds flap across the flight path, balloons drift slowly and bob. */
export const HAZARD = {
  birdRadius: 9,
  balloonRadius: 12,
  birdInterval: 1.7,
  balloonInterval: 4.2,
  birdSpeed: 26,
  balloonSpeed: 6,
};

/** Missions: each level is one of these, in order, then the list repeats harder. */
export const MISSIONS = [
  {
    name: 'RING RUN',
    goal: 'Fly through 8 rings',
    rings: 8,
    fuel: 100,
    lowRings: false,
    landing: false,
    waypointDistance: 0,
  },
  {
    name: 'RIVER RUN',
    goal: 'Low rings over the river',
    rings: 6,
    fuel: 100,
    lowRings: true,
    landing: false,
    waypointDistance: 0,
  },
  {
    name: 'TOUCHDOWN',
    goal: 'Land on the runway',
    rings: 3,
    fuel: 100,
    lowRings: false,
    landing: true,
    runwayAhead: 6000,
    waypointDistance: 0,
  },
  {
    name: 'WAYPOINT DASH',
    goal: 'Beat the fuel gauge',
    rings: 4,
    fuel: 60,
    lowRings: false,
    landing: false,
    waypointDistance: 12000,
  },
];

/** A repeat of the mission list adds this many rings and takes this much fuel. */
export const REPEAT = { extraRings: 2, lessFuel: 5, minFuel: 55 };

/** The runway: a grey strip the aircraft takes off beside and lands on. */
export const RUNWAY = { width: 34, length: 420 };

/** Terrain is generated in chunks of this length along the flight path. */
export const CHUNK = 200;

/** How far ahead of the aircraft the world is drawn and populated. */
export const VIEW_DISTANCE = 900;

export const PALETTE = {
  skyTop: '#2f7fc9',
  skyMid: '#7cc0ee',
  skyBottom: '#d8f1ff',
  sun: '#ffd94d',
  sunGlow: '#fff3b0',
  mountainFar: '#8aa8c4',
  mountainNear: '#5f8a6a',
  groundNear: '#5d9148',
  groundFar: '#8fb573',
  field: ['#7fae56', '#8fbf62', '#a8c46a', '#c9b458', '#6d9e4e', '#b5a05a'],
  forest: '#3f7038',
  river: '#3f8fd2',
  riverBank: '#5da0d8',
  runway: '#5a5f66',
  runwayLine: '#f2f2e8',
  houseWall: '#e8dcc8',
  houseRoof: ['#b8543e', '#7a4a2b', '#4a6b8a', '#8a4a6b'],
  player: '#ff5a3c',
  playerDark: '#d63d24',
  playerWhite: '#f4f6f8',
  cockpit: '#9fd8ff',
  ring: '#f2c94c',
  ringInner: '#ffe98a',
  bird: '#2f3a4a',
  balloon: '#ff6b9d',
  balloonBasket: '#8a5a2b',
  cloud: '#ffffff',
  panel: '#0d1f33',
  panelEdge: '#2b6a8f',
  hudCyan: '#7fe7ff',
  hudAmber: '#ffc94d',
  text: '#ffffff',
  muted: '#c7d9ea',
  danger: '#ff5a3c',
  ok: '#7be495',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", monospace';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-rush.best';
