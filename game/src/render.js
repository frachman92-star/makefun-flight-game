// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour.
// Canvas shapes and gradients, no images and no network, canvas text for the HUD and panels.
import { FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_BALLOON, KIND_BIRD, KIND_RING, KIND_STAR } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 660, top: 138, line: 34, bottom: 72 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const comboLabel = cachedLabel('Combo x');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const ringLabel = cachedLabel('Rings ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
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

  function drawSky(state) {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Sun with a soft glow, top right.
    const glow = context.createRadialGradient(1120, 110, 10, 1120, 110, 130);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255,243,176,0)');
    context.fillStyle = glow;
    context.fillRect(990, -20, 260, 260);
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1120, 110, 44, 0, Math.PI * 2);
    context.fill();

    // Far mountains, parallax by scroll.
    context.fillStyle = PALETTE.mountainFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    const farOff = (state.scroll * 0.08) % 640;
    for (let x = -640; x < FIELD.width + 640; x += 320) {
      context.lineTo(x - farOff + 160, 470);
      context.lineTo(x - farOff + 320, FIELD.groundY);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();

    // Near hills.
    context.fillStyle = PALETTE.mountainNear;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    const nearOff = (state.scroll * 0.18) % 480;
    for (let x = -480; x < FIELD.width + 480; x += 240) {
      context.lineTo(x - nearOff + 120, 570);
      context.lineTo(x - nearOff + 240, FIELD.groundY);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();

    // Clouds.
    context.fillStyle = 'rgba(255,255,255,0.92)';
    for (let index = 0; index < state.clouds.length; index += 1) {
      const cloud = state.clouds[index];
      const s = cloud.scale;
      context.beginPath();
      context.arc(cloud.x, cloud.y, 26 * s, 0, Math.PI * 2);
      context.arc(cloud.x + 30 * s, cloud.y + 6 * s, 20 * s, 0, Math.PI * 2);
      context.arc(cloud.x - 30 * s, cloud.y + 8 * s, 18 * s, 0, Math.PI * 2);
      context.fill();
    }

    // Ground strip.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.groundDark;
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
  }

  function drawPlane(player, elapsed) {
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;
      context.save();
      context.translate(cx, cy);
      context.rotate(player.tilt);
      // Tail wing.
      context.fillStyle = PALETTE.playerWing;
      context.beginPath();
      context.moveTo(-34, -4);
      context.lineTo(-22, -18);
      context.lineTo(-12, -4);
      context.closePath();
      context.fill();
      // Main wing.
      context.fillStyle = PALETTE.playerWing;
      context.beginPath();
      context.moveTo(-6, -2);
      context.lineTo(6, -26);
      context.lineTo(18, -2);
      context.closePath();
      context.fill();
      // Fuselage.
      context.fillStyle = PALETTE.player;
      context.beginPath();
      context.ellipse(0, 0, 42, 13, 0, 0, Math.PI * 2);
      context.fill();
      // Cockpit.
      context.fillStyle = PALETTE.cockpit;
      context.beginPath();
      context.ellipse(12, -6, 14, 8, -0.15, 0, Math.PI * 2);
      context.fill();
      // Propeller, spinning with time.
      const spin = elapsed * 30;
      context.strokeStyle = PALETTE.propeller;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(42, -Math.sin(spin) * 20);
      context.lineTo(42, Math.sin(spin) * 20);
      context.moveTo(42, -Math.cos(spin) * 20);
      context.lineTo(42, Math.cos(spin) * 20);
      context.stroke();
      context.fillStyle = PALETTE.propeller;
      context.beginPath();
      context.arc(42, 0, 4, 0, Math.PI * 2);
      context.fill();
      context.restore();
      // Boost flame.
      if (player.boost) {
        context.fillStyle = '#ffb347';
        context.beginPath();
        context.moveTo(player.x - 2, cy - 6);
        context.lineTo(player.x - 26 - Math.random() * 10, cy);
        context.lineTo(player.x - 2, cy + 6);
        context.closePath();
        context.fill();
      }
    }
  }

  function drawItems(state) {
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      if (item.kind === KIND_RING) {
        context.strokeStyle = PALETTE.ring;
        context.lineWidth = 9;
        context.beginPath();
        context.arc(cx, cy, item.width / 2 - 4, 0, Math.PI * 2);
        context.stroke();
        context.strokeStyle = PALETTE.ringInner;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, item.width / 2 - 4, 0, Math.PI * 2);
        context.stroke();
      } else if (item.kind === KIND_STAR) {
        context.fillStyle = PALETTE.star;
        context.beginPath();
        for (let p = 0; p < 10; p += 1) {
          const r = p % 2 === 0 ? 13 : 6;
          const a = -Math.PI / 2 + (p * Math.PI) / 5;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (p === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
      } else if (item.kind === KIND_BIRD) {
        const flap = Math.sin(state.elapsed * 10 + item.phase) * 10;
        context.fillStyle = PALETTE.bird;
        context.beginPath();
        context.ellipse(cx, cy, 22, 10, 0, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.moveTo(cx - 6, cy - 4);
        context.lineTo(cx - 18, cy - 16 - flap);
        context.lineTo(cx + 2, cy - 8);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(cx + 4, cy - 4);
        context.lineTo(cx + 16, cy - 14 - flap);
        context.lineTo(cx + 10, cy - 6);
        context.closePath();
        context.fill();
        context.fillStyle = '#ffd94d';
        context.beginPath();
        context.arc(cx + 18, cy - 2, 3, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === KIND_BALLOON) {
        context.fillStyle = PALETTE.balloon;
        context.beginPath();
        context.ellipse(cx, cy - 12, 26, 30, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(255,255,255,0.7)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(cx - 12, cy - 38);
        context.lineTo(cx - 8, cy + 8);
        context.moveTo(cx + 12, cy - 38);
        context.lineTo(cx + 8, cy + 8);
        context.stroke();
        context.fillStyle = PALETTE.balloonBasket;
        context.fillRect(cx - 9, cy + 8, 18, 12);
      }
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left', true);
    text(levelLabel(state.level), FIELD.width / 2, 18, 26, PALETTE.text, 'center', true);
    if (state.combo >= 2) {
      text(comboLabel(1 + Math.min(4, Math.floor(state.combo / 3))), FIELD.width / 2, 52, 22, PALETTE.ring, 'center', true);
    }
    const firstLife = FIELD.width - 24 - LIVES * 28;
    text('Lives', firstLife - 14, 18, 26, PALETTE.text, 'right', true);
    for (let life = 0; life < LIVES; life += 1) {
      const x = firstLife + life * 28;
      context.fillStyle = life < state.lives ? PALETTE.player : 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.arc(x + 10, 32, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = life < state.lives ? '#ffffff' : 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.arc(x + 10, 32, 3, 0, Math.PI * 2);
      context.fill();
    }
    text(ringLabel(state.rings), 24, 56, 20, PALETTE.ringInner, 'left', false);
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center', false);
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.ring, 'center', true);
  }

  const TITLE_LINES = ['Fly through the gold rings. Dodge the birds and balloons.', 'Steer with arrows or WASD, or drag the plane. Shift is boost.', ''];
  const PAUSED_LINES = ['The sky will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the sky, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    drawItems(state);
    drawPlane(state.player, state.elapsed);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[2] = bestLabel(best);
      drawPanel('Sky Rush', TITLE_LINES, 'Press Enter or tap to take off');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `Rings ${state.rings}  ·  Stars ${state.stars}  ·  Best combo ${state.bestCombo}`;
      drawPanel('Game over', OVER_LINES, 'Press Enter or tap to fly again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
