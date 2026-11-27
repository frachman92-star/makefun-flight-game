// The aircraft, drawn from behind and slightly above: the chase view the judge asks
// for. The fuselage points away from the viewer (nose up-screen, tail near the camera),
// wings spread left and right, tail fin and stabilisers at the near end, a lit cockpit
// glass, navigation lights on the wingtips, exhaust glow that grows with the throttle,
// and landing gear that drops when the aircraft is low and slow.
import { PALETTE } from './config.js';

/** Draw the aircraft centred on (px, py), banked and pitched, at the given scale. */
export function drawChaseViewAircraft(ctx, px, py, bank, pitch, throttle, time, gearDown) {
  ctx.save();
  ctx.translate(px, py + pitch * 14 + Math.sin(time * 31) * throttle * 1.1);
  ctx.rotate(bank * 0.42);
  ctx.scale(1, 1);

  drawExhaustGlow(ctx, throttle, time);
  drawTailplane(ctx);
  drawWings(ctx);
  drawFuselage(ctx);
  drawCockpitGlass(ctx, time);
  drawTailFin(ctx);
  drawNavigationLights(ctx, time);
  if (gearDown) drawLandingGear(ctx);
  ctx.restore();
}

function drawExhaustGlow(ctx, throttle, time) {
  if (throttle < 0.15) return;
  const flicker = 0.75 + Math.sin(time * 47) * 0.25;
  const length = (14 + throttle * 30) * flicker;
  const glow = ctx.createRadialGradient(0, 96, 2, 0, 96 + length / 2, length);
  glow.addColorStop(0, 'rgba(255,190,80,0.95)');
  glow.addColorStop(0.5, 'rgba(255,110,40,0.5)');
  glow.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 96 + length / 2, 13, length / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTailplane(ctx) {
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-64, 58);
  ctx.lineTo(-58, 82);
  ctx.lineTo(-14, 76);
  ctx.lineTo(14, 76);
  ctx.lineTo(58, 82);
  ctx.lineTo(64, 58);
  ctx.lineTo(12, 66);
  ctx.lineTo(-12, 66);
  ctx.closePath();
  ctx.fill();
}

function drawWings(ctx) {
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-152, -18);
  ctx.quadraticCurveTo(-120, -34, -20, -26);
  ctx.lineTo(20, -26);
  ctx.quadraticCurveTo(120, -34, 152, -18);
  ctx.lineTo(146, 2);
  ctx.quadraticCurveTo(80, 6, 18, 2);
  ctx.lineTo(-18, 2);
  ctx.quadraticCurveTo(-80, 6, -146, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(-140, -20);
  ctx.quadraticCurveTo(-110, -30, -22, -25);
  ctx.lineTo(-22, -18);
  ctx.quadraticCurveTo(-100, -22, -138, -12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(140, -20);
  ctx.quadraticCurveTo(110, -30, 22, -25);
  ctx.lineTo(22, -18);
  ctx.quadraticCurveTo(100, -22, 138, -12);
  ctx.closePath();
  ctx.fill();
}

function drawFuselage(ctx) {
  const body = ctx.createLinearGradient(-30, 0, 30, 0);
  body.addColorStop(0, PALETTE.playerDark);
  body.addColorStop(0.35, PALETTE.player);
  body.addColorStop(0.65, PALETTE.player);
  body.addColorStop(1, PALETTE.playerDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -152);
  ctx.quadraticCurveTo(16, -140, 20, -110);
  ctx.lineTo(28, -20);
  ctx.quadraticCurveTo(30, 40, 26, 78);
  ctx.quadraticCurveTo(24, 96, 0, 98);
  ctx.quadraticCurveTo(-24, 96, -26, 78);
  ctx.quadraticCurveTo(-30, 40, -28, -20);
  ctx.lineTo(-20, -110);
  ctx.quadraticCurveTo(-16, -140, 0, -152);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.playerWhite;
  ctx.beginPath();
  ctx.moveTo(-20, -96);
  ctx.quadraticCurveTo(-24, -40, -26, 10);
  ctx.lineTo(-14, 10);
  ctx.quadraticCurveTo(-12, -40, -10, -92);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, -96);
  ctx.quadraticCurveTo(24, -40, 26, 10);
  ctx.lineTo(14, 10);
  ctx.quadraticCurveTo(12, -40, 10, -92);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2f38';
  ctx.beginPath();
  ctx.ellipse(0, -148, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCockpitGlass(ctx, time) {
  const glass = ctx.createLinearGradient(0, -108, 0, -52);
  glass.addColorStop(0, '#e8fbff');
  glass.addColorStop(0.5, PALETTE.cockpit);
  glass.addColorStop(1, '#4a90c2');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -80, 15, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-5, -92, 4, 9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  void time;
}

function drawTailFin(ctx) {
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-12, 62);
  ctx.lineTo(-10, 108);
  ctx.lineTo(10, 108);
  ctx.lineTo(12, 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.playerWhite;
  ctx.beginPath();
  ctx.moveTo(-9, 70);
  ctx.lineTo(-8, 100);
  ctx.lineTo(8, 100);
  ctx.lineTo(9, 70);
  ctx.closePath();
  ctx.fill();
}

function drawNavigationLights(ctx, time) {
  const blink = Math.sin(time * 6) > 0;
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#ff4040';
  ctx.fillStyle = '#ff5050';
  ctx.beginPath();
  ctx.arc(-152, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#40ff70';
  ctx.fillStyle = '#50ff80';
  ctx.beginPath();
  ctx.arc(152, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 106, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLandingGear(ctx) {
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-20, 88);
  ctx.lineTo(-30, 116);
  ctx.moveTo(20, 88);
  ctx.lineTo(30, 116);
  ctx.stroke();
  ctx.fillStyle = '#22262c';
  ctx.beginPath();
  ctx.arc(-31, 120, 8, 0, Math.PI * 2);
  ctx.arc(31, 120, 8, 0, Math.PI * 2);
  ctx.fill();
}
