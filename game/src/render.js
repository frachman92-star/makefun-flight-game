// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred. One frame is the sky and
// mountains, the terrain below, the rings and hazards ahead, the waypoint beacon, the
// aircraft seen from behind, then the lit instrument HUD or a panel for the screen
// the game is on. Canvas shapes and gradients, no images and no network.
import { FONT, PALETTE, VIEW } from './config.js';
import { makeCamera, projectPoint } from './projection.js';
import { drawSky, drawTerrain, drawWaypointBeacon } from './terrain.js';
import { drawChaseViewAircraft } from './aircraft.js';
import { drawLitInstrumentHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 680, top: 148, line: 34, bottom: 74 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const popups = [];

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** Where the aircraft sits on screen: centred, banking sideways, pitching up and down. */
  function aircraftScreenPosition(state) {
    const px = VIEW.width / 2 + state.bank * 46;
    const py = Math.max(380, Math.min(560, 470 + state.pitch * 16 - (state.altitude - 60) * 0.22));
    return { px, py };
  }

  function drawRing(ctx, camera, ring, time) {
    const at = projectPoint(camera, ring.x, ring.alt, ring.z);
    if (!at) return;
    const radius = Math.max(3, ring.radius * at.scale);
    const pulse = 1 + Math.sin(time * 5) * 0.06;
    ctx.save();
    ctx.shadowColor = PALETTE.ring;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = Math.max(2, 5 * at.scale);
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = PALETTE.ringInner;
    ctx.lineWidth = Math.max(1, 1.6 * at.scale);
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (at.scale < 1.4) {
      ctx.fillStyle = PALETTE.ringInner;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y - radius - 16);
      ctx.lineTo(at.x - 7, at.y - radius - 6);
      ctx.lineTo(at.x + 7, at.y - radius - 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBird(ctx, camera, hazard, time) {
    const at = projectPoint(camera, hazard.x, hazard.alt + Math.sin(time * 6 + hazard.phase) * 3, hazard.z);
    if (!at) return;
    const s = Math.max(0.4, at.scale);
    const flap = Math.sin(time * 10 + hazard.phase) * 8 * s;
    ctx.fillStyle = PALETTE.bird;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, 13 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(at.x - 4 * s, at.y - 2 * s);
    ctx.lineTo(at.x - 14 * s, at.y - 10 * s - flap);
    ctx.lineTo(at.x + 2 * s, at.y - 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(at.x + 4 * s, at.y - 2 * s);
    ctx.lineTo(at.x + 14 * s, at.y - 10 * s - flap);
    ctx.lineTo(at.x + 10 * s, at.y - 4 * s);
    ctx.closePath();
    ctx.fill();
  }

  function drawBalloon(ctx, camera, hazard, time) {
    const bob = Math.sin(time * 2 + hazard.phase) * 4;
    const at = projectPoint(camera, hazard.x, hazard.alt + bob, hazard.z);
    if (!at) return;
    const s = Math.max(0.4, at.scale);
    ctx.fillStyle = PALETTE.balloon;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y - 8 * s, 15 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.moveTo(at.x - 8 * s, at.y - 22 * s);
    ctx.lineTo(at.x - 5 * s, at.y + 8 * s);
    ctx.moveTo(at.x + 8 * s, at.y - 22 * s);
    ctx.lineTo(at.x + 5 * s, at.y + 8 * s);
    ctx.stroke();
    ctx.fillStyle = PALETTE.balloonBasket;
    ctx.fillRect(at.x - 6 * s, at.y + 8 * s, 12 * s, 8 * s);
  }

  function drawPopups(dt) {
    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const popup = popups[i];
      popup.ttl -= dt;
      if (popup.ttl <= 0) {
        popups.splice(i, 1);
        continue;
      }
      popup.y -= 34 * dt;
      context.save();
      context.globalAlpha = Math.min(1, popup.ttl);
      context.textAlign = 'center';
      context.font = `800 26px ${FONT}`;
      context.shadowColor = PALETTE.ring;
      context.shadowBlur = 12;
      context.fillStyle = '#ffe98a';
      context.fillText(popup.text, popup.x, popup.y);
      context.restore();
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (VIEW.width - PANEL.width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = 'rgba(16,35,58,0.92)';
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, VIEW.width / 2, y + 84, 52, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], VIEW.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center', false);
    }
    text(prompt, VIEW.width / 2, y + height - 36, 24, PALETTE.ring, 'center', true);
  }

  const TITLE_LINES = [
    'A chase-view flight game: fly the rings, mind the fuel, land the runway.',
    'W / S throttle  ·  A / D or arrows bank  ·  Up / Down pitch  ·  drag also steers',
    'P pauses. Fly through gold rings, dodge birds and balloons.',
  ];

  /** Paint one frame: sky, terrain, objects, aircraft, HUD or a panel. */
  function draw(world, screen, best, dt) {
    const state = world.state;
    const camera = makeCamera(state.x, state.altitude, state.z);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0e2a4a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (state.shake > 0) {
      const shake = state.shake * 14;
      context.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawSky(context, camera, state.seed, state.time);
    const runwayInView = state.runway && state.runway.z2 > camera.z + 20 && state.runway.z1 < camera.z + 920
      ? state.runway
      : null;
    drawTerrain(context, camera, state.seed, state.z, runwayInView);
    if (state.waypointZ > 0 && state.z < state.waypointZ) {
      drawWaypointBeacon(context, camera, 0, state.waypointZ, (state.waypointZ - state.z) / 10);
    }
    for (const ring of state.rings) drawRing(context, camera, ring, state.time);
    for (const hazard of state.hazards) {
      if (hazard.kind === 1) drawBalloon(context, camera, hazard, state.time);
      else drawBird(context, camera, hazard, state.time);
    }

    const { px, py } = aircraftScreenPosition(state);
    const gearDown = state.altitude < 45 && state.speed < 160;
    if (!(state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 1)) {
      drawChaseViewAircraft(context, px, py, state.bank, state.pitch, state.throttle, state.time, gearDown);
    }
    drawPopups(dt);

    if (screen === SCREEN_TITLE) {
      drawPanel('SKY RUSH', [...TITLE_LINES, `Best score ${best}`], 'Press Enter or tap to take off');
      return;
    }
    drawLitInstrumentHud(context, state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The sky will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Game over', [
        `Score ${state.score}`,
        `Best ${best}`,
        `Rings ${state.ringsHit}  ·  Best combo x${state.bestCombo}  ·  Level ${state.level + 1}`,
      ], 'Press Enter or tap to fly again');
    }
  }

  /** A floating score popup above the aircraft, for a ring or a near miss. */
  function addPopup(text) {
    popups.push({ text, x: VIEW.width / 2, y: 330, ttl: 1.4 });
    if (popups.length > 4) popups.shift();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, addPopup };
}
