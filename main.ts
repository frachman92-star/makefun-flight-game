// Sky Rush v2 (Node 22, standard library only): the entrypoint that hands the game in.
// The game lives in this directory's game/ folder, plain static files a desktop browser
// loads offline: game/index.html and its ES modules, no library, no network request, no
// build step. This program copies game/ and screenshots/ from beside this file into
// /output and writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-game.ts, copied from the kit unchanged).
//
// What the game is: a pseudo-3D chase-view flight game. The camera sits behind a red
// aircraft and looks forward over recognisable terrain, patchwork fields, a winding
// river, a little town, mountains on the horizon, with a runway ahead at takeoff and
// landing, glowing target rings to fly through, and a lit instrument HUD showing
// altitude, speed, heading, throttle, fuel and damage. Four missions rotate: a ring
// run, a low river run, a runway landing, and a waypoint dash against the fuel gauge.
// Throttle rewards discipline (full throttle drinks fuel), missions change the goal,
// and landings and crashes read as what happened. The source is split into one-job
// files under game/src/: config, projection, terrain, aircraft, hud, world, input,
// audio, render, shots and main.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function isImageFile(name: string): boolean {
  return /\.(png|jpe?g)$/i.test(name);
}

function listShots(): string[] {
  if (!existsSync(shotsDir)) return [];
  return readdirSync(shotsDir).filter(isImageFile).sort();
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Sky Rush needs its cover: refuse a silent empty hand-in instead of shipping it.
const shots = listShots();
if (shots.length === 0) {
  throw new Error('Sky Rush: no screenshots in screenshots/, nothing to hand in');
}
if (shots.length > 4) {
  throw new Error(`Sky Rush: ${shots.length} screenshots, the scorer takes at most 4`);
}
console.log(`Sky Rush: handing in ${shots.length} screenshot(s): ${shots.join(', ')}`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all, or a path
// under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('Sky Rush: dossier.json written');
