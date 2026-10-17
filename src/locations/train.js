// The Kodama, car 7, seen side-on like a stage set: the far wall is all big
// rounded windows, and through them Japan rolls by — the painted, endless
// Scenery (mountains, paddies, old farmhouses, tunnels, the town at dusk).
// Seats in profile with white headrest covers, luggage racks, drinks on the
// sills, sunbeams full of dust slanting in, catenary shadows sweeping through,
// rain beading on the glass, and the passengers of a long afternoon.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { VoxelModel, vm, glowVm, fill, tone, hash3, sh, V5, V25 } from '../world/build.js';
import { rbox } from '../vox/kit.js';
import { Scenery } from '../art/scenery/scenery.js';
import { shinkansenCar, CAR_LEN } from '../world/shinkansen.js';
import { PixCanvas, makeTexture } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { Character } from '../entities/rig.js';
import { CHARACTERS, LOCALS } from '../data/characters.js';
import { makeFolk } from '../data/folk.js';
import { FONT } from '../ui/fonts.js';

export const SEAT_PITCH = 1.25;
// where the outside set stands (well away from the cut-away car)
export const OUT = { x0: 12, y: 0, z: 70, car7: 12 - (CAR_LEN + 0.12) };
export const CAR = { rows: [-5, 5], wallZ: -0.8, aisleZ: 0.34, winY0: 0.7, winY1: 1.75, seatY: 0.275 };
export const ROWX = (i) => i * SEAT_PITCH;    // seat cushion centre
const WINX = (i) => i * SEAT_PITCH + 0.05;    // window centre beside that row

// ---------------------------------------------------------------- the car body (0.05 m voxels)
function carShell() {
  const v = new VoxelModel();
  const X0 = -160, X1 = 159;
  const wall = 0xf0e6d2, wallD = 0xe2d6be, wallL = 0xf8f0e0, panel = 0xc9b89a, kick = 0x6a5a58, frame = 0x9a948a, frameD = 0x7a746c, rubber = 0x2e2a2c;
  const winOf = (x) => { // window index and local coords for a voxel column
    const i = Math.round((x * V5 - 0.05) / SEAT_PITCH);
    const cx = Math.round(WINX(i) / V5);
    return { i, dx: x - cx };
  };
  const wy0 = Math.round(CAR.winY0 / V5), wy1 = Math.round(CAR.winY1 / V5) - 1; // 14..34
  const inWin = (x, y) => {
    const { dx, i } = winOf(x);
    if (i < CAR.rows[0] || i > CAR.rows[1]) return false;
    if (Math.abs(dx) > 10 || y < wy0 || y > wy1) return false;
    // rounded corners
    const ex = Math.abs(dx) === 10 ? 1 : Math.abs(dx) === 9 ? 0.5 : 0;
    const ey = y === wy0 || y === wy1 ? 1 : y === wy0 + 1 || y === wy1 - 1 ? 0.5 : 0;
    return ex + ey < 1.5;
  };
  for (let x = X0; x <= X1; x++) {
    for (let y = 0; y <= 49; y++) {
      // far wall (two voxels thick, inner face at z = -0.80)
      if (!inWin(x, y)) {
        let c = y < 2 ? kick : y < 11 ? tone(x, y, 0, panel, sh(panel, 0.95), sh(panel, 1.04), 0.05, 0.05) : tone(x, y, 0, wall, wallD, wallL, 0.04, 0.04);
        if (y >= 3 && y <= 5) c = (x % 2 === 0) ? 0x9a9488 : 0xb4aea0;
        if (y === 11) c = 0xc2b9a6;
        // window frames: a rubber line then the metal frame, recessed one voxel
        const near = inWin(x - 1, y) || inWin(x + 1, y) || inWin(x, y - 1) || inWin(x, y + 1);
        const near2 = !near && (inWin(x - 2, y) || inWin(x + 2, y) || inWin(x, y - 2) || inWin(x, y + 2) || inWin(x - 1, y - 1) || inWin(x + 1, y + 1) || inWin(x - 1, y + 1) || inWin(x + 1, y - 1));
        if (near) c = rubber; else if (near2) c = y > wy1 ? frameD : frame;
        v.set(x, y, -17, c);
        v.set(x, y, -18, near ? rubber : 0xf2f2f4);
        if (near2) v.set(x, y, -16, c); // the frame stands proud of the wall
      }
      // the window sill: a little shelf for drinks
      if (y === wy0 - 1) { const { dx, i } = winOf(x); if (Math.abs(dx) <= 11 && i >= CAR.rows[0] && i <= CAR.rows[1]) for (let z = -16; z <= -14; z++) v.set(x, y, z, z === -14 ? 0xb8ae9a : 0xcfc5b1); }
    }
    // roller-blind housings over each window, blinds rolled up
    { const { dx, i } = winOf(x); if (Math.abs(dx) <= 10 && i >= CAR.rows[0] && i <= CAR.rows[1]) { v.set(x, wy1 + 2, -16, 0xd8ccb0); v.set(x, wy1 + 3, -16, 0xc8bc9e); if (dx === 0) { v.set(x, wy1 + 1, -16, 0x8a7a60); } } }
    // luggage rack: brackets, a slatted shelf (light falls through), a front rail
    if (((x % 25) + 25) % 25 === 0) for (let k = 0; k < 8; k++) { v.set(x, 39, -16 + k, 0x7c828c); v.set(x, 39 - Math.max(0, 3 - k), -16, 0x7c828c); }
    for (let z = -16; z <= -9; z++) if ((z & 1) === 0) v.set(x, 40, z, 0xa8b0ba);
    v.set(x, 40, -8, 0x8c949e); v.set(x, 41, -8, 0xc4ccd4);
    // the upper wall curving into the ceiling, with a coat-hook strip and air vents
    for (let y = 42; y <= 49; y++) { const z = y < 45 ? -17 : y < 47 ? -16 : -15; v.set(x, y, z, y === 43 && x % 10 < 6 ? 0xc8c0b0 : tone(x, y, z, wall, wallD, wallL, 0.03, 0.04)); }
    for (let z = -15; z <= -6; z++) v.set(x, 50, z, z === -6 ? 0xc8c0b0 : 0xf0ece2);
    // carpet floor: a woven diamond pattern, the aisle a shade lighter
    for (let z = -16; z <= 18; z++) {
      const aisle = z >= 1 && z <= 13;
      const d = ((x + z) % 8 === 0 || (x - z) % 8 === 0);
      v.set(x, -1, z, aisle ? (d ? 0x6e5464 : 0x7e6272) : (d ? 0x5a4456 : 0x684e60));
    }
  }
  // the end walls: the front with its sliding door, glass panel and LED board
  for (const [ex, front] of [[X1 + 1, true], [X0 - 1, false]]) {
    for (let z = -17; z <= 18; z++) for (let y = 0; y <= 50; y++) {
      if (z > 8 && y > 20) continue;
      const door = front && z >= -2 && z <= 10 && y <= 42;
      let c = y < 2 ? kick : wall;
      if (door) c = (z === -2 || z === 10 || y === 42) ? frame : (y > 24 && y < 38 && z > 0 && z < 8) ? 0x9ac4d8 : 0xc8ccd2;
      v.set(ex, y, z, c);
    }
  }
  return v;
}

// ---------------------------------------------------------------- one row: window seat + aisle seat (0.025 m voxels), facing +x
function seatRow(seed = 1) {
  const v = new VoxelModel();
  const fab = 0x34589a, fabD = 0x284680, fabL = 0x466ab0, pat = 0x5a7cc0, cover = 0xf8f6f0, coverD = 0xe4e0d6, arm = 0x6c7482, armL = 0x8a92a0, leg = 0x4a505a;
  const seats = [[-31, -16], [-15, 0]];
  for (const [z0, z1] of seats) {
    // cushion (rounded front edge)
    rbox(v, -9, 9, 7, 10, z0 + 1, z1 - 1, 1.6, (x, y, z) => ((x + z) % 5 === 0 && y === 10 ? pat : tone(x, y, z, fab, fabD, fabL, 0.1, 0.06)));
    // backrest leaning back, a soft headrest bulge, the white cover
    for (let y = 11; y <= 41; y++) {
      const lean = Math.floor((y - 11) / 7);
      for (let z = z0 + 1; z <= z1 - 1; z++) for (let x = -14 - lean; x <= -10 - lean; x++) {
        const edge = z === z0 + 1 || z === z1 - 1;
        const front = x === -10 - lean;
        let c = edge ? fabD : (front && (x + y + z) % 6 === 0 ? pat : tone(x, y, z, fab, fabD, fabL, 0.08, 0.05));
        if (y >= 31 && front) c = (y === 31 ? coverD : cover);
        if (y >= 31 && !front && x === -11 - lean) c = cover;
        if (y === 41 && !edge) c = cover;
        v.set(x, y, z, c);
      }
      if (y >= 33 && y <= 39) for (let z = z0 + 3; z <= z1 - 3; z++) v.set(-9 - lean, y, z, cover); // headrest pillow
    }
    // the cover's little embroidered logo
    v.set(-12, 37, Math.round((z0 + z1) / 2), 0x3a6ad8); v.set(-12, 36, Math.round((z0 + z1) / 2), 0x3a6ad8);
    // back of the seat: folded tray table and a pocket with a magazine
    for (let z = z0 + 3; z <= z1 - 3; z++) for (let y = 21; y <= 28; y++) v.set(-16, y, z, y === 21 || y === 28 ? 0x8a909a : 0xaab0b8);
    for (let z = z0 + 3; z <= z1 - 3; z++) for (let y = 13; y <= 18; y++) v.set(-16, y, z, y === 18 ? 0x2a3a6a : z % 3 === 0 && y > 15 ? 0xe8b040 : 0x3a4a7a);
    // pedestal + rail
    for (let y = 0; y <= 6; y++) for (let x = -3; x <= 3; x++) { v.set(x, y, Math.round((z0 + z1) / 2), leg); }
    for (let x = -8; x <= 8; x++) v.set(x, 6, Math.round((z0 + z1) / 2), leg);
  }
  // armrests (aisle, middle, window), with the lever on the aisle side
  for (const z of [-32, -16, 1]) for (let x = -9; x <= 8; x++) { v.set(x, 16, z, x === 8 ? armL : arm); v.set(x, 17, z, armL); if (x === -9 || x === 6) for (let y = 7; y <= 15; y++) v.set(x, y, z, arm); }
  v.set(6, 18, 1, 0x2a2c32); v.set(6, 19, 1, 0x2a2c32);
  return v;
}

// the aisle side: floor out to the near wall, three-seat rows, blinds down, a ceiling
function nearSide() {
  const v = new VoxelModel();
  const X0 = -160, X1 = 159, ZW = 46;
  const wall = 0xf0e6d2, wallD = 0xe2d6be, panel = 0xc9b89a, blind = 0xf4dca8, blindD = 0xe8c888, frame = 0x9a948a;
  for (let x = X0; x <= X1; x++) {
    for (let z = 19; z <= ZW; z++) { const d = ((x + z) % 8 === 0 || (x - z) % 8 === 0); v.set(x, -1, z, d ? 0x5a4456 : 0x684e60); }
    for (let y = 0; y <= 49; y++) {
      const i = Math.round((x * V5 - 0.05) / SEAT_PITCH), dx = x - Math.round((i * SEAT_PITCH + 0.05) / V5);
      const win = Math.abs(dx) <= 10 && y >= 14 && y <= 34;
      let c = y < 2 ? 0x6a5a58 : y < 11 ? panel : tone(x, y, 0, wall, wallD, wall, 0.04, 0.04);
      if (win) c = (y - 14) % 3 === 2 ? blindD : blind; // pleated blinds, lit from outside
      else if (Math.abs(dx) <= 11 && y >= 13 && y <= 35) c = frame;
      v.set(x, y, ZW, c);
    }
    for (let z = -15; z <= ZW; z++) v.set(x, 50, z, z % 12 === 0 ? 0xd8d0c0 : 0xf2eee4);
    // the near luggage rack
    for (let z = ZW - 8; z <= ZW - 1; z++) if ((z & 1) === 0) v.set(x, 40, z, 0xa8b0ba);
  }
  return v;
}
// the near three-seat rows (0.025 m voxels), facing +x, from the aisle to the wall
function seatRow3() {
  const v = new VoxelModel();
  const fab = 0x34589a, fabD = 0x284680, fabL = 0x466ab0, cover = 0xf8f6f0;
  for (let s = 0; s < 3; s++) {
    const z0 = 32 + s * 17, z1 = z0 + 16;
    rbox(v, -9, 9, 7, 10, z0 + 1, z1 - 1, 1.6, (x, y, z) => tone(x, y, z, fab, fabD, fabL, 0.1, 0.06));
    for (let y = 11; y <= 41; y++) {
      const lean = Math.floor((y - 11) / 7);
      for (let z = z0 + 1; z <= z1 - 1; z++) for (let x = -14 - lean; x <= -10 - lean; x++) {
        const edge = z === z0 + 1 || z === z1 - 1;
        let c = edge ? fabD : tone(x, y, z, fab, fabD, fabL, 0.08, 0.05);
        if (y >= 31 && x >= -11 - lean) c = cover;
        v.set(x, y, z, c);
      }
    }
    for (let z = z0 + 3; z <= z1 - 3; z++) for (let y = 21; y <= 28; y++) v.set(-16, y, z, y === 21 || y === 28 ? 0x8a909a : 0xaab0b8);
    for (let y = 0; y <= 6; y++) for (let x = -3; x <= 3; x++) v.set(x, y, Math.round((z0 + z1) / 2), 0x4a505a);
  }
  for (const z of [32, 49, 66, 83]) for (let x = -9; x <= 8; x++) { v.set(x, 16, z, 0x6c7482); v.set(x, 17, z, 0x8a92a0); }
  return v;
}

// ---------------------------------------------------------------- props
function bottle(kind) {
  const v = new VoxelModel();
  if (kind === 'tea') { // a green-tea PET bottle
    fill(v, 0, 2, 0, 7, 0, 2, (x, y, z) => (y >= 2 && y <= 5 ? (y === 3 ? 0xe8e0c0 : 0x3a9a4a) : 0xc8e0a0));
    fill(v, 1, 1, 8, 9, 1, 1, 0x3a8a3a);
  } else if (kind === 'coffee') { // a little coffee can
    fill(v, 0, 2, 0, 5, 0, 2, (x, y, z) => (y === 0 || y === 5 ? 0xb8bcc4 : y === 3 ? 0xf0d080 : 0x5a3a24));
  } else if (kind === 'mikan') { // a net of mandarins
    for (const [x, z] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]]) fill(v, x, x + 1, 0, 1, z, z + 1, 0xf09030);
    v.set(1, 2, 1, 0x4a8a3a);
  }
  return vm(v, V25, [1, 0, 1]);
}
function duffel(color) {
  const v = new VoxelModel();
  rbox(v, -8, 8, 0, 9, -5, 5, 3, (x, y, z) => tone(x, y, z, color, sh(color, 0.85), sh(color, 1.1), 0.1, 0.05));
  for (let x = -6; x <= 6; x++) v.set(x, 10, 0, 0x2a2a30);
  for (let x = -8; x <= 8; x++) v.set(x, 5, 6, 0xf0c040);
  return vm(v, V25, [0, 0, 0]);
}
function rackBag(kind, c, seed) {
  const v = new VoxelModel();
  if (kind === 'suitcase') { rbox(v, -9, 8, 0, 11, -5, 4, 1.4, (x, y, z) => tone(x, y, z, c, sh(c, 0.85), sh(c, 1.1), 0.06, 0.05)); for (let y = 0; y <= 11; y += 4) for (let z = -5; z <= 4; z++) v.set(9, y, z, sh(c, 0.7)); fill(v, -2, 1, 12, 12, -1, 0, 0x2a2a30); }
  else if (kind === 'paper') { fill(v, -6, 5, 0, 13, -4, 3, (x, y, z) => (y === 13 ? 0xe8d8b0 : y > 9 && x === -6 ? 0xd84a3a : 0xc8a070)); fill(v, -2, 1, 14, 15, 0, 0, 0x8a6a40); }
  else if (kind === 'box') { fill(v, -8, 7, 0, 7, -5, 4, 0xd8c098); for (let x = -8; x <= 7; x++) v.set(x, 7, 0, 0xc8a050); fill(v, -6, -1, 3, 5, 5, 5, 0xe84a3a); } // a souvenir box tied with ribbon
  else { rbox(v, -8, 8, 0, 9, -5, 5, 3, (x, y, z) => tone(x, y, z, c, sh(c, 0.85), sh(c, 1.1), 0.1, 0.05)); for (let x = -6; x <= 6; x++) v.set(x, 10, 0, 0x2a2a30); }
  return vm(v, V25, [0, 0, 0]);
}

// ---------------------------------------------------------------- window glass: reflections, smudges, rain beading
const GLASS_FRAG = /* glsl */ `
uniform float time, rain, speed, seed, night;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = vUv * vec2(86.0, 80.0); // ~1 cell per centimetre
  // a soft diagonal reflection band and a fainter second one
  float d = vUv.x * 0.9 + vUv.y * 0.55 + seed;
  float band = smoothstep(0.06, 0.0, abs(fract(d * 0.8) - 0.3)) * 0.07 + smoothstep(0.03, 0.0, abs(fract(d * 0.8 + 0.37) - 0.5)) * 0.04;
  float a = 0.035 + band;
  vec3 c = vec3(0.85, 0.92, 1.0);
  // rain: beads that crawl back along the glass in the wind of the train
  if (rain > 0.01) {
    vec2 g = vec2(p.x + time * speed * 26.0, p.y + time * 3.0);
    vec2 cell = floor(g / 5.0);
    vec2 f = fract(g / 5.0) - 0.5;
    float h = hash(cell + seed * 13.0);
    if (h < rain * 0.7) {
      vec2 o = vec2(hash(cell + 1.7) - 0.5, hash(cell + 3.1) - 0.5) * 0.5;
      float r = length((f - o) * vec2(1.0, 1.4));
      float drop = step(r, 0.14 + h * 0.08);
      float trail = step(abs(f.y - o.y + 0.02), 0.04) * step(f.x - o.x, 0.0) * step(-0.45, f.x - o.x) * speed;
      a += drop * 0.5 + trail * 0.18;
      c = mix(c, vec3(1.0), drop * 0.4);
    }
  }
  gl_FragColor = vec4(c * (1.0 - night * 0.6), a);
}
`;
function glassMesh(seed) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: GLASS_FRAG, transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, rain: { value: 0 }, speed: { value: 1 }, seed: { value: seed }, night: { value: 0 } },
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.05), mat);
}
// a slanting sunbeam full of floating dust, seen from the aisle
const BEAM_FRAG = /* glsl */ `
uniform float time, amt, seed;
uniform vec3 col;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  float k = pow(vUv.y, 1.6) * smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
  k *= 0.75 + 0.25 * sin(time * 0.7 + seed + vUv.y * 3.0);
  // dust motes drifting in the light
  vec2 g = floor(vec2(vUv.x * 60.0, vUv.y * 90.0 + time * 1.5 + seed * 10.0));
  float mote = step(0.993, hash(g + floor(time * 0.5) * 0.0)) * (0.6 + 0.4 * sin(time * 3.0 + hash(g) * 20.0));
  float v = k * amt * (0.55 + 0.45 * step(bayer4(gl_FragCoord.xy), 0.5)) + mote * amt * 2.5 * vUv.y;
  gl_FragColor = vec4(col * v, 1.0);
}
`;
function beamMesh(seed, u) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: u.time, amt: u.amt, col: u.col, seed: { value: seed } },
  });
  // a parallelogram from the window down and toward us
  const g = new THREE.BufferGeometry();
  const top = CAR.winY1, bot = 0.02, w = 1.0;
  const pos = new Float32Array([-w / 2, top, 0, w / 2, top, 0, -w / 2 + 0.12, bot, 0.95, w / 2 + 0.12, bot, 0.95]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  m.renderOrder = 5;
  return m;
}

// the car-number plate + priority-seat sticker on the pillars
function pillarSticker(n) {
  const p = new PixCanvas(14, 18, 77 + n);
  p.rect(0, 0, 14, 18, '#f4f2ea'); p.frame(0, 0, 14, 18, '#9aa0a8');
  p.text(String(n), 7, 2, { font: `9px ${FONT.small}`, color: '#2a4a8a', align: 'center' });
  p.rect(2, 13, 10, 3, '#2a8a4a');
  return p;
}

export class TrainLocation extends Location {
  constructor(game) {
    super(game, 'train', { bg: 0x101018, lightMode: 'interior', grade: 'melancholy', music: undefined, ambience: 'train' });
    this.camCfg = { wupp: 0.0075, pitch: 4, yaw: 0 };
    this.clock = false;
    this.sky = false;
    this.shadowSize = 6;
    this.hourOverride = 15.5;
    this.rain = 0;
  }
  get speed() { return this.scenery.speed; }
  set speedGoal(v) { this.scenery.speedGoal = v; if (this.outScenery) this.outScenery.speedGoal = v; }
  get speedGoal() { return this.scenery.speedGoal; }
  async build() {
    const S = this.scene;
    S.add(vm(carShell(), V5, [0, 0, 0]));
    // the world outside
    this.scenery = new Scenery({ tsz: 0.0075, horizonY: 1.14, z: -1.45, refZ: CAR.wallZ, skyW: 30, skyH: 7 });
    S.add(this.scenery.group);
    // outside: the whole Kodama running through the country, for establishing shots
    // (far from the cut-away car; the camera visits it at z ~ OUT.z)
    this.outScenery = new Scenery({ tsz: 0.034, horizonY: OUT.y + 7.5, z: OUT.z - 8, refZ: OUT.z, layout: 'outside', skyW: 90, skyH: 34 });
    S.add(this.outScenery.group);
    this.outTrain = new THREE.Group();
    const cars = [shinkansenCar({ nose: true, number: 8 }), shinkansenCar({ number: 7, panto: true }), shinkansenCar({ number: 6 })];
    cars.forEach((c, i) => { c.position.x = -i * (CAR_LEN + 0.12); this.outTrain.add(c); });
    this.outTrain.position.set(OUT.x0, OUT.y + 1.2, OUT.z);
    S.add(this.outTrain);
    // seat rows along the far side
    const rowM = seatRow();
    this.rows = {};
    for (let i = CAR.rows[0]; i <= CAR.rows[1]; i++) {
      const m = vm(rowM, V25, [0, 0, 0]);
      m.position.set(ROWX(i), 0, 0);
      S.add(m);
      this.rows[i] = m;
    }
    // glass, sunbeams
    this.glassU = [];
    this.beamU = { time: { value: 0 }, amt: { value: 0.16 }, col: { value: new THREE.Color(1.0, 0.86, 0.62) } };
    this.beams = [];
    for (let i = CAR.rows[0]; i <= CAR.rows[1]; i++) {
      const gm = glassMesh(i * 0.37);
      gm.position.set(WINX(i), (CAR.winY0 + CAR.winY1) / 2, CAR.wallZ - 0.06);
      gm.renderOrder = 4;
      S.add(gm);
      this.glassU.push(gm.material.uniforms);
      const b = beamMesh(i * 1.7, this.beamU);
      b.position.set(WINX(i), 0, CAR.wallZ + 0.02);
      S.add(b);
      this.beams.push(b);
    }
    // stickers on a few pillars
    for (const i of [-5, -1, 3]) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.09), new THREE.MeshLambertMaterial({ map: makeTexture(pillarSticker(7).c, { mips: false }) }));
      st.position.set(WINX(i) + 0.62, 1.2, CAR.wallZ + 0.002); S.add(st);
    }
    // luggage up on the racks
    const bags = [[-5.7, 'suitcase', 0xc84a3a], [-4.4, 'box', 0], [-3.1, 'paper', 0], [-1.2, 'duffel', 0x3a6a5a], [0.25, 'box', 0], [1.9, 'suitcase', 0x4a4a5a], [3.2, 'paper', 0], [4.4, 'duffel', 0x8a5a9a], [5.8, 'suitcase', 0x2a6a8a]];
    bags.forEach(([x, k, c], j) => { const m = rackBag(k, c, j); m.position.set(x, 2.05, -0.62); S.add(m); });
    // things on the sills
    const sill = [[-4, 'tea'], [-2, 'coffee'], [0, 'tea'], [2, 'mikan'], [3, 'coffee'], [-5, 'mikan']];
    for (const [i, k] of sill) { const b = bottle(k); b.position.set(WINX(i) + 0.22 + (i % 2) * 0.12, CAR.winY0, CAR.wallZ + 0.1); S.add(b); if (i === 0) this.mamoTea = b; }
    // Mamo's bag on the aisle seat
    this.seatBag = duffel(0x4c5b84);
    this.seatBag.position.set(ROWX(0) + 0.02, CAR.seatY, -0.2);
    S.add(this.seatBag);
    // ceiling glow: a warm wash from above the racks
    const strip = new THREE.Mesh(new THREE.BoxGeometry(15, 0.03, 0.08), emitMat({ color: 0xfff4dc, intensity: 1.3 }));
    strip.position.set(0, 2.45, -0.4); S.add(strip);
    this.fill = new THREE.PointLight(0xfff0dc, 0.0, 5, 1.6); this.fill.position.set(0.2, 2.0, 0.6); S.add(this.fill);
    // tunnel lamps strobing through the windows
    this.tunLight = new THREE.PointLight(0xffa850, 0, 4, 1.4); this.tunLight.position.set(0, 1.2, -1.3); S.add(this.tunLight);
    // catenary masts outside: invisible, they only throw sweeping shadows
    this.poles = [];
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.1), shadowOnly);
      m.castShadow = true; m.position.set(-9 + i * 3.6, 1.5, -1.9);
      S.add(m); this.poles.push(m);
    }
    // the aisle side of the car (only seen in first person): three-seat rows,
    // the near wall with its blinds pulled down against the sun, the ceiling
    this.povSide = new THREE.Group();
    this.povSide.add(vm(nearSide(), V5, [0, 0, 0]));
    const row3 = seatRow3();
    for (let i = CAR.rows[0]; i <= CAR.rows[1]; i++) { const m = vm(row3, V25, [0, 0, 0]); m.position.set(ROWX(i), 0, 0); this.povSide.add(m); }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(14, 0.02, 0.22), emitMat({ color: 0xfff4dc, intensity: 1.2 }));
    lamp.position.set(0, 2.49, 0.65); this.povSide.add(lamp);
    this.povSide.visible = false;
    S.add(this.povSide);
    // the passengers of car 7
    this.passengers = [];
    const seat = (def, i, expr, act, opts = {}) => {
      const c = new Character(def);
      c.setPos(ROWX(i) + 0.02, opts.aisle ? -0.2 : -0.58, 0.0); c.faceNow(Math.PI / 2); c.setPose(opts.pose || 'sit');
      c.idleT = 999;
      if (expr) c.setExpr(expr, { react: false });
      this.add(c);
      if (act) c.play(act, { loop: true, ...(opts.actOpts || {}) });
      this.passengers.push(c);
      return c;
    };
    this.sleeper = seat({ ...LOCALS.ponta, id: 'sleeper' }, -2, 'asleep', 'sleep');
    this.granny = seat({ ...LOCALS.usami, id: 'granny' }, -4, 'calm', 'drink');
    seat(makeFolk(4101, 'student'), -1, 'neutral', 'phone');
    seat(makeFolk(4102, 'salaryman'), 1, 'tired', 'sleep');
    this.mother = seat(makeFolk(4103, 'shopper'), 2, 'gentle', null, { aisle: true });
    // her little one kneels up on the window seat, nose to the glass
    this.kid = new Character({ ...makeFolk(4104, 'student'), scale: 0.62, id: 'kid' });
    this.kid.setPos(ROWX(2) + 0.04, -0.6, CAR.seatY - 0.02); this.kid.faceNow(Math.PI); this.kid.setPose('seiza'); this.kid.idleT = 999;
    this.kid.setExpr('excited', { react: false });
    this.add(this.kid); this.passengers.push(this.kid);
    seat(LOCALS.saru, 3, 'neutral', 'phone');
    seat(makeFolk(4105, 'tourist'), 4, 'happy', null);
    seat(makeFolk(4106, 'tourist'), 4, 'smile', null, { aisle: true });
    seat(makeFolk(4107, 'officeLady'), -3, 'neutral', 'phone', { aisle: true });
    this.seats = { mamoru: { x: ROWX(0) + 0.02, z: -0.58, yaw: Math.PI / 2 } };
    this.aisleZ = CAR.aisleZ;
    this.navs.car = this.makeNav('car', { minX: -7.4, minZ: 0.1, w: 14.8, d: 0.6 });
  }
  async enter() {
    const g = this.game, P = g.player;
    g.place(P, this.seats.mamoru.x, this.seats.mamoru.z, this.seats.mamoru.yaw, 0);
    P.setPose('sit');
    P.idleT = 999;
    g.rig.setFollow(null);
    g.rig.play({ x: 0.3, y: 1.25, z: -0.2, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: this.camCfg.yaw, dur: 0 });
    g.lighting.fixedAzimuth = Math.PI - 0.45; // the sun is outside, beyond the far wall
    Character.faceUpK = 0.1; // the camera is low and side-on here
  }
  exit() { const l = this.game.lighting; l.override = null; l.fixedAzimuth = null; Character.faceUpK = 1; }
  setTime(name, dur) { this.scenery.setTime(name, dur); this.outScenery.setTime(name, dur); }
  setSegment(seg, o) { this.scenery.setSegment(seg, o); if (seg !== 'tunnel' && seg !== 'station') this.outScenery.setSegment(seg, { now: true }); }
  get outside() { return this.game.rig.target.z > OUT.z - 30 && !this.game.rig.pov; }
  update(dt, t) {
    const g = this.game, rig = g.rig, R = g.renderer;
    const sc = this.scenery;
    const pov = rig.pov ? { eye: rig.persp.position, fwd: rig.persp.getWorldDirection(this._fwd || (this._fwd = new THREE.Vector3())) } : null;
    sc.update(dt, { x: rig.target.x, z: rig.target.z, yaw: rig.yaw, pitch: rig.pitch, halfW: (R.rtW * rig.wupp) / 2, persp: pov });
    this.povSide.visible = !!pov;
    const out = this.outside;
    this.outScenery.group.visible = out; this.outTrain.visible = out;
    if (out) this.outScenery.update(dt, { x: rig.target.x, z: rig.target.z, yaw: rig.yaw, pitch: rig.pitch, halfW: (R.rtW * rig.wupp) / 2 });
    const tk = sc.tunnelK, lk = sc.look, sp = sc.speed;
    // the glass and the beams
    for (const u of this.glassU) { u.time.value = t; u.rain.value = this.rain; u.speed.value = sp; u.night.value = Math.max(tk, lk.lights * 0.6); }
    this.beamU.time.value = t;
    const sunny = Math.max(0, 1 - tk) * Math.min(1, lk.glow * 0.8 + 0.25) * (1 - this.rain * 0.8) * (1 - lk.lights * 0.7);
    this.beamU.amt.value = 0.1 * sunny * Math.min(1, Math.max(0, (lk.glow - 0.35) * 2.5)); // only in low golden light
    this.beamU.col.value.set(lk.sun);
    // catenary shadows sweep through the car
    for (const m of this.poles) {
      m.position.x -= dt * sp * 3.5;
      if (m.position.x < -10.8) m.position.x += 21.6;
      m.visible = tk < 0.5 && sp > 0.05;
    }
    // sway and rumble
    rig.sway = 0.2 + sp * 0.35;
    const bob = Math.sin(t * 13) * 0.003 * sp + Math.sin(t * 2.1) * 0.002 * sp;
    for (const c of this.chars) if (c !== this.kid) c.y = bob; else c.y = CAR.seatY - 0.02 + bob;
    // light: the sun through the windows, the ceiling lights in tunnels and at night
    const L = g.lighting;
    const sun = parseInt(lk.sun.slice(1), 16);
    const sunI = (lk.glow > 0.5 ? 2.2 : 2.6) * (1 - tk) * (1 - lk.lights * 0.75) * (1 - this.rain * 0.6);
    L.override = { elev: 0.62 - lk.glow * 0.2, sunI, sun, hemiI: 1.05 + tk * 0.1 + lk.lights * 0.1, sky: tk > 0.5 ? 0xfff0dc : parseInt(lk.hor.slice(1), 16), gnd: 0x8a7a80 };
    if (this.outside) { L.override = { elev: 0.5 - lk.glow * 0.18, azimuth: 0.55, sunI: 2.4 * (1 - lk.lights * 0.6), sun, hemiI: 1.2, sky: parseInt(lk.hor.slice(1), 16), gnd: 0x6a8a5a }; L.fixedAzimuth = null; }
    else L.fixedAzimuth = Math.PI - 0.45;
    this.fill.intensity = 0.3 + tk * 1.4 + lk.lights * 1.0;
    // passing tunnel lamps: orange pulses through the glass
    const ph = (t * sp * 2.55) % 1;
    this.tunLight.intensity = tk * sp * Math.max(0, 1 - Math.abs(ph - 0.5) * 6) * 3.0;
    this.tunLight.position.x = rig.target.x + (0.5 - ph) * 4;
  }
}
