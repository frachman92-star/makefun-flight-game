// The world below the aircraft: sky, mountains, and the ground itself. The ground is
// drawn as a gradient, then as flat quads projected through the chase camera, far to
// near: patchwork fields, a winding river, a little town, forest, and the runway when
// one is in view. Terrain comes in chunks along the flight path, each seeded from the
// run seed and its chunk index, so the same seed always grows the same countryside.
import { CHUNK, PALETTE, RUNWAY, VIEW } from './config.js';
import { chunkSeed, createRandom } from './random.js';
import { projectGround, projectGroundQuad, projectPoint } from './projection.js';

/** Where the river runs at distance z: a slow S-curve the low rings follow. */
export function riverCenterX(z) {
  return 150 * Math.sin(z * 0.0035) + 60 * Math.sin(z * 0.0011);
}

/** One chunk of countryside: fields, houses and forest, all flat ground quads. */
function generateChunkFeatures(seed, chunkIndex) {
  const random = createRandom(chunkSeed(seed, chunkIndex));
  const z0 = chunkIndex * CHUNK;
  const features = [];
  const fieldCount = 4 + Math.floor(random() * 4);
  for (let i = 0; i < fieldCount; i += 1) {
    const w = 50 + random() * 110;
    const x = -320 + random() * 640 - w / 2;
    const z1 = z0 + random() * 120;
    const z2 = z1 + 50 + random() * 120;
    features.push({
      kind: 'field',
      x1: x,
      x2: x + w,
      z1,
      z2,
      color: PALETTE.field[Math.floor(random() * PALETTE.field.length)],
    });
  }
  if (random() < 0.45) {
    const townX = -180 + random() * 360;
    const townZ = z0 + 30 + random() * 100;
    const houseCount = 7 + Math.floor(random() * 7);
    for (let i = 0; i < houseCount; i += 1) {
      features.push({
        kind: 'house',
        x: townX + (random() - 0.5) * 130,
        z: townZ + (random() - 0.5) * 70,
        size: 7 + random() * 5,
        roof: PALETTE.houseRoof[Math.floor(random() * PALETTE.houseRoof.length)],
      });
    }
  }
  if (random() < 0.6) {
    features.push({
      kind: 'forest',
      x: -280 + random() * 560,
      z: z0 + random() * CHUNK,
      r: 22 + random() * 26,
    });
  }
  return features;
}

/** The chunk cache: generated on demand, dropped once it falls behind the aircraft. */
const chunkCache = new Map();
function featuresNear(seed, planeZ) {
  const first = Math.floor((planeZ - 120) / CHUNK);
  const last = Math.floor((planeZ + 950) / CHUNK);
  for (const key of [...chunkCache.keys()]) {
    if (key < first || key > last) chunkCache.delete(key);
  }
  const out = [];
  for (let index = first; index <= last; index += 1) {
    if (!chunkCache.has(index)) chunkCache.set(index, generateChunkFeatures(seed, index));
    out.push(...chunkCache.get(index));
  }
  return out;
}

/** The sky: gradient, sun with a glow, drifting clouds, two mountain ranges. */
export function drawSky(ctx, camera, seed, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.horizonY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.horizonY + 1);

  const sunGlow = ctx.createRadialGradient(1080, 92, 8, 1080, 92, 90);
  sunGlow.addColorStop(0, PALETTE.sunGlow);
  sunGlow.addColorStop(1, 'rgba(255,243,176,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(980, 0, 200, 190);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(1080, 92, 30, 0, Math.PI * 2);
  ctx.fill();

  drawCloudLayer(ctx, camera, time, 0.05, 150, 0.85);
  drawMountainRange(ctx, camera, seed, 0.12, PALETTE.mountainFar, 46, 120);
  drawMountainRange(ctx, camera, seed, 0.28, PALETTE.mountainNear, 24, 66);
  drawCloudLayer(ctx, camera, time, 0.09, 90, 0.6);
}

function drawCloudLayer(ctx, camera, time, parallax, baseY, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.cloud;
  for (let i = 0; i < 8; i += 1) {
    const span = VIEW.width + 420;
    const drift = ((i * 317 + 90 - camera.x * parallax + time * (4 + i)) % span + span) % span;
    const x = drift - 210;
    const y = baseY + ((i * 53) % 110);
    const s = 0.7 + ((i * 37) % 10) / 14;
    ctx.beginPath();
    ctx.ellipse(x, y, 52 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 30 * s, y + 5 * s, 30 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 32 * s, y + 5 * s, 34 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const PEAKS = [58, 96, 44, 112, 70, 88, 52, 120, 64, 78, 98, 40, 108, 62, 84, 56, 116, 74, 92, 48];
function drawMountainRange(ctx, camera, seed, parallax, color, minHeight, maxHeight) {
  const spacing = 96;
  const shift = ((-camera.x * parallax) % spacing + spacing) % spacing;
  const seedOffset = (seed % 7) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-spacing, VIEW.horizonY + 1);
  for (let x = -spacing - shift; x < VIEW.width + spacing; x += spacing) {
    const index = (Math.floor((x + camera.x * parallax) / spacing) + seedOffset) % PEAKS.length;
    const peak = PEAKS[(index + PEAKS.length) % PEAKS.length];
    const height = minHeight + ((peak - 40) / 80) * (maxHeight - minHeight);
    ctx.lineTo(x + spacing / 2, VIEW.horizonY - height);
    ctx.lineTo(x + spacing, VIEW.horizonY + 1);
  }
  ctx.lineTo(VIEW.width + spacing, VIEW.horizonY + 1);
  ctx.closePath();
  ctx.fill();
}

/** The ground: gradient, then fields, river, town, forest and runway, far to near. */
export function drawTerrain(ctx, camera, seed, planeZ, runway) {
  const ground = ctx.createLinearGradient(0, VIEW.horizonY, 0, VIEW.height);
  ground.addColorStop(0, PALETTE.groundFar);
  ground.addColorStop(1, PALETTE.groundNear);
  ctx.fillStyle = ground;
  ctx.fillRect(0, VIEW.horizonY, VIEW.width, VIEW.height - VIEW.horizonY);

  const quads = [];
  for (const feature of featuresNear(seed, planeZ)) {
    if (feature.kind === 'field') {
      quads.push({ z: feature.z1, draw: () => drawGroundQuad(ctx, camera, feature) });
    } else if (feature.kind === 'house') {
      quads.push({ z: feature.z, draw: () => drawHouse(ctx, camera, feature) });
    } else if (feature.kind === 'forest') {
      quads.push({ z: feature.z, draw: () => drawForest(ctx, camera, feature) });
    }
  }
  for (let z = Math.max(camera.z + 30, Math.floor((camera.z + 30) / 25) * 25); z < camera.z + 920; z += 25) {
    const centre = riverCenterX(z);
    quads.push({
      z,
      draw: () => drawGroundQuad(ctx, camera, {
        x1: centre - 13, x2: centre + 13, z1: z, z2: z + 25, color: PALETTE.river,
      }),
    });
  }
  if (runway) {
    quads.push({ z: runway.z1, draw: () => drawRunway(ctx, camera, runway) });
  }
  quads.sort((a, b) => b.z - a.z);
  for (const quad of quads) quad.draw();
}

function drawGroundQuad(ctx, camera, feature) {
  const corners = projectGroundQuad(camera, feature.x1, feature.x2, feature.z1, feature.z2);
  if (!corners) return;
  ctx.fillStyle = feature.color;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.fill();
}

function drawHouse(ctx, camera, house) {
  const half = house.size / 2;
  const base = projectGroundQuad(camera, house.x - half, house.x + half, house.z - half, house.z + half);
  if (!base) return;
  ctx.fillStyle = PALETTE.houseWall;
  ctx.beginPath();
  ctx.moveTo(base[0].x, base[0].y);
  for (const corner of base.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.fill();
  const roof = projectGroundQuad(
    camera,
    house.x - half * 0.7, house.x + half * 0.7,
    house.z - half * 0.7, house.z + half * 0.2,
  );
  if (!roof) return;
  ctx.fillStyle = house.roof;
  ctx.beginPath();
  ctx.moveTo(roof[0].x, roof[0].y);
  for (const corner of roof.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.fill();
}

function drawForest(ctx, camera, forest) {
  const centre = projectGround(camera, forest.x, forest.z);
  if (!centre) return;
  const radius = Math.max(2, forest.r * centre.scale);
  ctx.fillStyle = PALETTE.forest;
  ctx.beginPath();
  ctx.ellipse(centre.x, centre.y, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(centre.x, centre.y - radius * 0.14, radius * 0.7, radius * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRunway(ctx, camera, runway) {
  const half = RUNWAY.width / 2;
  // The strip can run under the camera: clamp its near end into view, or the
  // whole quad is skipped and the runway vanishes mid-landing.
  const z1 = Math.max(runway.z1, camera.z + 6);
  const strip = projectGroundQuad(camera, -half, half, z1, runway.z2);
  if (!strip) return;
  ctx.fillStyle = PALETTE.runway;
  ctx.beginPath();
  ctx.moveTo(strip[0].x, strip[0].y);
  for (const corner of strip.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.runwayLine;
  for (let z = runway.z1 + 30; z < runway.z2 - 20; z += 60) {
    const dash = projectGroundQuad(camera, -2, 2, z, z + 26);
    if (!dash) continue;
    ctx.beginPath();
    ctx.moveTo(dash[0].x, dash[0].y);
    for (const corner of dash.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.fill();
  }
  for (const end of [runway.z1 + 8, runway.z2 - 22]) {
    const bars = projectGroundQuad(camera, -half + 3, half - 3, end, end + 12);
    if (!bars) continue;
    ctx.beginPath();
    ctx.moveTo(bars[0].x, bars[0].y);
    for (const corner of bars.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** A glowing beacon column over the waypoint, with its distance in metres. */
export function drawWaypointBeacon(ctx, camera, x, z, distance) {
  const base = projectGround(camera, x, z);
  if (!base) return;
  const top = projectPoint(camera, x, 150, z);
  if (!top) return;
  const gradient = ctx.createLinearGradient(0, top.y, 0, base.y);
  gradient.addColorStop(0, 'rgba(127,231,255,0)');
  gradient.addColorStop(1, 'rgba(127,231,255,0.55)');
  ctx.fillStyle = gradient;
  const halfWidth = Math.max(3, 10 * base.scale);
  ctx.fillRect(base.x - halfWidth, top.y, halfWidth * 2, base.y - top.y);
  const diamond = Math.max(5, 14 * base.scale);
  ctx.save();
  ctx.translate(base.x, top.y - diamond);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = PALETTE.hudCyan;
  ctx.fillRect(-diamond / 2, -diamond / 2, diamond, diamond);
  ctx.restore();
  ctx.fillStyle = PALETTE.hudCyan;
  ctx.font = `700 ${Math.max(12, 15 * base.scale + 8)}px ${'system-ui, sans-serif'}`;
  ctx.textAlign = 'center';
  const labelY = Math.max(64, top.y - diamond * 2 - 4);
  ctx.fillText(`${Math.round(distance)} m`, base.x, labelY);
}
