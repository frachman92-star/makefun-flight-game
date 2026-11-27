// The chase camera and the one perspective projection the whole game uses: a world
// point (x, altitude, z) ahead of the camera comes back as a screen point and a scale
// (pixels per world unit at that distance), or null when it is behind the camera.
import { CAMERA, VIEW } from './config.js';

/** Where the camera sits for this frame: behind the aircraft, following its height. */
export function makeCamera(planeX, planeAltitude, planeZ) {
  return {
    x: planeX * CAMERA.followX,
    y: planeAltitude * 0.9 + CAMERA.heightAbovePlane,
    z: planeZ - CAMERA.behind,
  };
}

/** Project a point in the air (or on the ground, with y = 0) onto the screen. */
export function projectPoint(camera, x, y, z) {
  const dz = z - camera.z;
  if (dz < 4) return null;
  const scale = VIEW.focal / dz;
  return {
    x: VIEW.width / 2 + (x - camera.x) * scale,
    y: VIEW.horizonY + (camera.y - y) * scale,
    scale,
  };
}

/** Project a point on the ground: the same maths with altitude zero. */
export function projectGround(camera, x, z) {
  return projectPoint(camera, x, 0, z);
}

/** Project the four corners of a flat ground quad (x1..x2, z1..z2); null if it is off view. */
export function projectGroundQuad(camera, x1, x2, z1, z2) {
  const a = projectGround(camera, x1, z1);
  const b = projectGround(camera, x2, z1);
  const c = projectGround(camera, x2, z2);
  const d = projectGround(camera, x1, z2);
  if (!a || !b || !c || !d) return null;
  return [a, b, c, d];
}
