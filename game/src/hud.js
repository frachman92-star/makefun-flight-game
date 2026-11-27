// The lit instrument HUD: altitude, speed, heading and vertical speed readouts, a
// compass strip, an attitude indicator, throttle, fuel and damage gauges, the score and
// the mission objective. Everything glows like a flown panel, never like a drawn box:
// dark glass, cyan digits, amber warnings.
import { FONT, MONO, PALETTE, VIEW } from './config.js';

function instrumentPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(13,31,51,0.82)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(127,231,255,0.35)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function readout(ctx, x, y, label, value, unit, color) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText(label, x, y);
  ctx.fillStyle = color || PALETTE.hudCyan;
  ctx.font = `700 24px ${MONO}`;
  ctx.shadowColor = color || PALETTE.hudCyan;
  ctx.shadowBlur = 8;
  ctx.fillText(value, x, y + 26);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText(unit, x + ctx.measureText(value).width + 6, y + 26);
}

/** The whole HUD for a playing frame. `state` is the world's live state. */
export function drawLitInstrumentHud(ctx, state) {
  drawFlightInstruments(ctx, state);
  drawCompassStrip(ctx, state.heading);
  drawScorePanel(ctx, state);
  drawAttitudeIndicator(ctx, 92, 628, 52, state.bank, state.pitch);
  drawThrottleGauge(ctx, 168, 590, state.throttle);
  drawFuelAndDamageGauges(ctx, state);
  drawMissionObjective(ctx, state);
  if (state.banner) drawBanner(ctx, state.banner, state.bannerKind);
}

function drawFlightInstruments(ctx, state) {
  instrumentPanel(ctx, 16, 16, 300, 74);
  const altitudeFeet = Math.max(0, Math.round(state.altitude * 32));
  const speedKnots = Math.round(state.speed * 1.9);
  const verticalSpeed = Math.round(state.verticalSpeed * 96);
  readout(ctx, 30, 34, 'ALT', String(altitudeFeet).padStart(4, '0'), 'FT', PALETTE.hudCyan);
  readout(ctx, 122, 34, 'SPD', String(speedKnots).padStart(3, '0'), 'KT', PALETTE.hudCyan);
  readout(ctx, 214, 34, 'HDG', String(Math.round(state.heading)).padStart(3, '0'), 'DEG', PALETTE.hudAmber);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('V/S', 30, 78);
  ctx.fillStyle = verticalSpeed >= 0 ? PALETTE.ok : PALETTE.hudAmber;
  ctx.font = `700 15px ${MONO}`;
  ctx.fillText(`${verticalSpeed >= 0 ? '+' : ''}${verticalSpeed} FPM`, 62, 78);
}

function drawCompassStrip(ctx, heading) {
  const cx = VIEW.width / 2;
  const y = 26;
  ctx.save();
  ctx.fillStyle = 'rgba(13,31,51,0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - 170, 12, 340, 30, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - 170, 12, 340, 30);
  ctx.clip();
  ctx.textAlign = 'center';
  ctx.font = `700 13px ${MONO}`;
  for (let offset = -60; offset <= 60; offset += 5) {
    const deg = Math.round(((heading + offset) % 360 + 360) % 360);
    const x = cx + offset * 2.4;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? PALETTE.hudCyan : 'rgba(199,217,234,0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y + (major ? 20 : 15));
    ctx.stroke();
    if (major) {
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(label, x, y + 2);
    }
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(cx - 6, 12);
  ctx.lineTo(cx + 6, 12);
  ctx.lineTo(cx, 22);
  ctx.closePath();
  ctx.fill();
}

function drawScorePanel(ctx, state) {
  instrumentPanel(ctx, VIEW.width - 316, 16, 300, 74);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('SCORE', VIEW.width - 302, 34);
  ctx.fillStyle = PALETTE.hudCyan;
  ctx.font = `700 24px ${MONO}`;
  ctx.shadowColor = PALETTE.hudCyan;
  ctx.shadowBlur = 8;
  ctx.fillText(String(state.score).padStart(6, '0'), VIEW.width - 302, 60);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'right';
  ctx.fillStyle = state.combo > 1 ? PALETTE.hudAmber : PALETTE.muted;
  ctx.font = `700 16px ${MONO}`;
  ctx.fillText(state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO --', VIEW.width - 30, 38);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(`LIVES ${'✈'.repeat(Math.max(0, state.lives))}`, VIEW.width - 30, 62);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText(`LEVEL ${state.level + 1}  ·  ${state.missionName}`, VIEW.width - 30, 82);
}

function drawAttitudeIndicator(ctx, x, y, radius, bank, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-bank * 0.42);
  ctx.translate(0, pitch * 22);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-radius - 4, -radius - 4, radius * 2 + 8, radius + 4);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(-radius - 4, 0, radius * 2 + 8, radius + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.hudAmber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', x, y + radius + 16);
}

function drawThrottleGauge(ctx, x, y, throttle) {
  drawVerticalGauge(ctx, x, y, 22, 92, throttle, 'THR', PALETTE.hudCyan, false);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(throttle * 100)}%`, x + 11, y + 108);
}

function drawFuelAndDamageGauges(ctx, state) {
  const x = VIEW.width - 316;
  const y = 600;
  const lowFuel = state.fuel < 20;
  const blink = lowFuel && Math.floor(state.time * 3) % 2 === 0;
  drawVerticalGauge(ctx, x, y, 22, 92, state.fuel / 100, 'FUEL', blink ? PALETTE.danger : PALETTE.hudAmber, blink);
  ctx.fillStyle = blink ? PALETTE.danger : PALETTE.muted;
  ctx.font = `700 13px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(state.fuel)}%`, x + 11, y + 108);
  drawVerticalGauge(ctx, x + 44, y, 22, 92, 1 - state.damage / 100, 'HULL', state.damage > 60 ? PALETTE.danger : PALETTE.ok, false);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 13px ${MONO}`;
  ctx.fillText(`${Math.round(100 - state.damage)}%`, x + 55, y + 108);
  if (lowFuel) {
    ctx.fillStyle = blink ? PALETTE.danger : PALETTE.hudAmber;
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('LOW FUEL', x + 84, y + 26);
  }
}

function drawVerticalGauge(ctx, x, y, w, h, value, label, color, flash) {
  ctx.save();
  ctx.fillStyle = 'rgba(13,31,51,0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.stroke();
  const fillH = Math.max(0, Math.min(1, value)) * (h - 8);
  ctx.fillStyle = color;
  if (flash) ctx.shadowColor = color;
  if (flash) ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(x + 4, y + h - 4 - fillH, w - 8, fillH, 4);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 6);
}

function drawMissionObjective(ctx, state) {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(13,31,51,0.72)';
  const text = `${state.missionName}  ·  ${state.missionGoal}  ·  ${state.missionProgress}`;
  ctx.font = `600 14px ${FONT}`;
  const width = ctx.measureText(text).width + 28;
  ctx.beginPath();
  ctx.roundRect(VIEW.width / 2 - width / 2, 52, width, 26, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(text, VIEW.width / 2, 70);
}

function drawBanner(ctx, text, kind) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 34px ${FONT}`;
  ctx.shadowColor = kind === 'bad' ? PALETTE.danger : PALETTE.hudAmber;
  ctx.shadowBlur = 18;
  ctx.fillStyle = kind === 'bad' ? '#ffb0a0' : '#ffe9a8';
  ctx.fillText(text, VIEW.width / 2, 250);
  ctx.restore();
}
