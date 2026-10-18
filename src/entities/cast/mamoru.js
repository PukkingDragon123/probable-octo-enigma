// Mamoru ("Mamo"), 11: a Reeves' turtle (kusagame) kid with yellow stripes
// along his head. He wears his late dad's fishing-club hoodie, mustard and two
// sizes too big: sleeves swallow his hands, his shell makes a hump under the
// back, a faded fish print on the chest. Earbuds in, cables down to the
// pocket, cargo shorts, white high-tops with a red stripe, and a red-and-white
// fishing bobber clipped to his belt loop (Dad's) that swings when he walks.
import { VoxelModel, rbox, ell, tone, hash3, box, ramp5, T, mirror, handSet, roundGlasses, earbud, bobberCharm, FV, sh, mixc } from '../craft.js';

const SKIN = { b: 0x8db35a, d: 0x7ea54f, dd: 0x5e8640, l: 0x9cc066, ll: 0xb8d47e };
const JAW = { b: 0xe8da92, d: 0xcabb72, l: 0xf4ecb4 };
const STRIPE = 0xeedc5a, STRIPE_D = 0xc8b040;
const HOOD = { b: 0xdc9c3a, d: 0xbe7e2c, dd: 0x8e5a26, l: 0xeeb456, ll: 0xf8d088 };
const RIB = 0xc8862e, STRING = 0xfff2d8, STRING_D = 0xe0d0b0;
const SHORTS = { b: 0x55627a, d: 0x434e64, dd: 0x343c50, l: 0x6a7890 };
const SHELL = { b: 0x86603a, d: 0x684828, l: 0xa47c4c, seam: 0x3e2a1a };
const SOCK = 0xf6f2ea, SHOE = 0xf8f6f0, SHOE_D = 0xdcd6cc, SOLE = 0xe8e0d4, STRIPE_R = 0xd8483a, LACE = 0xe6e0d6;

const skin = (x, y, z) => tone(x, y, z, SKIN.b, SKIN.d, SKIN.l, 0.07, 0.05);

// ------------------------------------------------------------------ head
// x -7..6, y 0..11, z -6..5, a rounded box; snout x -3..2, y 1..4, z 6..7
function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 2.8, (x, y, z) => {
    const side = x <= -6 || x >= 5;
    // pale jaw and throat
    if (y <= 2 && z >= -2) return tone(x, y, z, JAW.b, JAW.d, JAW.l, 0.06, 0.05);
    // two clean yellow stripes along each side of the head
    if (side && z < 4 && (y === 7 || y === 4)) return y === 7 ? STRIPE : STRIPE_D;
    if (side && z < 4 && y === 8) return SKIN.dd; // dark border above the top stripe
    // top of the head: a sparse scale pattern, a touch darker towards the back
    if (y >= 11) return (x * 3 + z * 5) % 7 === 0 ? SKIN.d : skin(x, y, z);
    if (y >= 9 && z <= -4) return tone(x, y, z, SKIN.d, SKIN.dd, SKIN.b, 0.08, 0.05);
    return skin(x, y, z);
  });
  // stripe that runs from the eye corner back over the cheek (front corners)
  for (const x of [-7, 6]) for (let z = 1; z <= 3; z++) v.set(x, 7, z, STRIPE);
  // snout (upper beak) with nostrils, lighter
  rbox(v, -3, 2, 1, 4, 6, 7, 1.0, (x, y, z) => (y <= 2 ? tone(x, y, z, JAW.b, JAW.d, JAW.l, 0.08, 0.05) : y === 4 && z === 7 ? SKIN.l : tone(x, y, z, SKIN.l, SKIN.b, SKIN.ll, 0.12, 0.05)));
  v.set(-1, 4, 8, SKIN.dd); v.set(0, 4, 8, SKIN.dd);
  v.set(-2, 4, 7, SKIN.ll); v.set(1, 4, 7, SKIN.ll);
  // the little tympanum (ear spot) on each side, where the earbuds go
  for (const x of [-8, 7]) { v.set(x, 5, 0, SKIN.d); v.set(x, 5, 1, SKIN.d); }
  return v;
}

// hood up: a soft shell over the crown, back and sides of the head, its front
// edge set back so the face and snout show (from the side too), with a dark
// lining rim, a lip over the forehead and drawstrings at the jaw
function hoodUp() {
  const v = new VoxelModel();
  const lin = HOOD.dd, fold = HOOD.d;
  rbox(v, -8, 7, 3, 13, -7, 3, 2.6, (x, y, z) => {
    if (x >= -7 && x <= 6 && y <= 11 && z >= -6) return null; // the head inside
    if (z === 3) return y >= 12 || x <= -8 || x >= 7 ? lin : null; // the lining at the front edge
    if (y >= 12 && hash3(x, y, z) < 0.3) return HOOD.l;
    if ((x + y * 2 + z) % 9 === 0) return fold;
    return tone(x, y, z, HOOD.b, HOOD.d, HOOD.l, 0.08, 0.1);
  });
  // the lip over the forehead, a shade darker underneath
  for (let x = -7; x <= 6; x++) { v.set(x, 12, 4, HOOD.l); v.set(x, 11, 4, x <= -6 || x >= 5 ? lin : null); }
  for (const x of [-7, 6]) for (let y = 4; y <= 11; y++) v.set(x + (x < 0 ? -1 : 1), y, 4, lin);
  // seam over the crown (front to back)
  for (let z = -7; z <= 4; z++) { const y = (() => { for (let yy = 16; yy >= 0; yy--) if (v.has(0, yy, z)) return yy; return null; })(); if (y != null) v.set(0, y, z, HOOD.d); }
  // drawstrings from the bottom front corners
  for (const x of [-7, 6]) for (let k = 0; k < 5; k++) v.set(x, 3 - k, 5, k === 4 ? STRING_D : STRING);
  return v;
}

// ------------------------------------------------------------------ torso (the hoodie)
// spine at y = 0 (waist); hoodie y -3..5 (hem overlaps the shorts), x -5..4, z -4..3
function torso() {
  const v = new VoxelModel();
  const H = (x, y, z) => {
    if (y <= -3) return (x & 1) ? RIB : sh(RIB, 0.9); // ribbed hem
    if (y >= 5) return tone(x, y, z, HOOD.l, HOOD.b, HOOD.ll, 0.2, 0.1); // shoulders catch the light
    return tone(x, y, z, HOOD.b, HOOD.d, HOOD.l, 0.1, 0.07);
  };
  rbox(v, -5, 4, -3, 5, -4, 3, 1.8, H);
  // the shell's hump under the back of the hoodie
  ell(v, -0.0, 1.8, -4.2, 5.2, 4.8, 2.6, (x, y, z) => (z <= -4 ? (y <= -3 ? RIB : tone(x, y, z, HOOD.b, HOOD.d, HOOD.l, 0.12, 0.06)) : undefined));
  // shell rim peeking under the hem at the back
  for (let x = -4; x <= 3; x++) for (let z = -6; z <= -3; z++) if (Math.hypot(x + 0.5, (z + 3) * 1.6) < 5.2) v.set(x, -4, z, (x + z) % 2 ? SHELL.b : SHELL.seam);
  // kangaroo pocket: raised panel with a darker opening line and side seams
  for (let x = -3; x <= 2; x++) for (let y = -2; y <= 0; y++) v.set(x, y, 4, y === 0 ? HOOD.dd : x === -3 || x === 2 ? HOOD.d : tone(x, y, 4, HOOD.b, HOOD.d, HOOD.b, 0.15, 0));
  // faded fish print on the chest (Dad's fishing club)
  const fish = ['.cc..c', 'cKcccc', '.cc..c'];
  fish.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; v.set(-3 + i, 4 - j, 4, ch === 'K' ? HOOD.d : mixc(HOOD.b, 0xfff0d0, 0.32)); }));
  // neckline
  for (let x = -2; x <= 1; x++) v.set(x, 5, 3, HOOD.dd);
  return v;
}
// drawstrings + earbud cables in fine voxels (chest space, on the hoodie front)
function cords() {
  const v = new VoxelModel();
  for (const x of [-3, 2]) for (let y = 0; y >= -6; y--) v.set(x, y, 0, y === -6 ? STRING_D : STRING);
  for (const [x0, x1] of [[-9, -2], [8, 1]]) for (let k = 0; k <= 11; k++) v.set(Math.round(x0 + (x1 - x0) * (k / 11)), -1 - k, 0, 0xf0f2f6);
  return v;
}
// the hood bunched at the back of the neck when it's down (chest space: chest pivot = y 6)
function hoodDown() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -2, 1, -6, -2, 1.4, (x, y, z) => (y === 1 && z <= -4 ? HOOD.l : (x + y + z) % 4 === 0 ? HOOD.d : HOOD.b));
  for (let x = -3; x <= 2; x++) v.set(x, -1, -2, HOOD.dd);
  return v;
}

// ------------------------------------------------------------------ shorts + legs
function pelvis() {
  const v = new VoxelModel();
  rbox(v, -4, 3, -3, 0, -3, 2, 1.2, (x, y, z) => (y === 0 ? SHORTS.d : tone(x, y, z, SHORTS.b, SHORTS.d, SHORTS.l, 0.12, 0.08)));
  for (const x of [-3, 2]) v.set(x, 0, 3, SHORTS.dd); // belt loops
  v.set(-1, -1, 3, SHORTS.d); // fly seam
  return v;
}
function thigh(side) {
  const v = new VoxelModel();
  rbox(v, -2, 1, -3, 0, -2, 1, 1.0, (x, y, z) => (y === -3 ? SHORTS.l : tone(x, y, z, SHORTS.b, SHORTS.d, SHORTS.l, 0.1, 0.06)));
  // cargo pocket on the outside
  const ox = side > 0 ? 2 : -3;
  for (let y = -2; y <= -1; y++) for (let z = -1; z <= 0; z++) v.set(ox, y, z, y === -1 ? SHORTS.dd : SHORTS.d);
  return v;
}
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -1, 0, -1, 0, 0.5, skin);
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 1; z++) v.set(x, -1, z, SOCK);
  // high-top: sole y -3, upper y -2 (+ collar at -1 around the sock)
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) {
    v.set(x, -3, z, z === 3 ? SHOE_D : SOLE);
    if (!(z === 3)) v.set(x, -2, z, (x === -2 || x === 1) && z >= -1 && z <= 1 ? STRIPE_R : z >= 2 ? SHOE : SHOE);
  }
  v.set(-1, -2, 3, SHOE_D); v.set(0, -2, 3, SHOE_D);
  for (const z of [0, 1]) v.set(-1, -1, z + 1, LACE);
  v.set(0, -1, 1, LACE);
  return v;
}

// ------------------------------------------------------------------ arms (oversized sleeves)
function upper() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 1, -1, 1, 0.9, (x, y, z) => (y >= 0 ? tone(x, y, z, HOOD.l, HOOD.b, HOOD.ll, 0.2, 0.08) : tone(x, y, z, HOOD.b, HOOD.d, HOOD.l, 0.1, 0.06)));
  return v;
}
function fore() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => tone(x, y, z, HOOD.b, HOOD.d, HOOD.l, 0.1, 0.06));
  // a wide ribbed cuff that swallows half the hand
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) + Math.abs(z) < 4) for (let y = -4; y <= -3; y++) v.set(x, y, z, (x + z) % 2 ? RIB : sh(RIB, 0.92));
  return v;
}

// ------------------------------------------------------------------ the design
export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = handSet(skin, { w: 1, claws: null });
  // sweater paws: only the fingertips poke out of the cuffs (hand pivot sits at the cuff)
  for (const k of Object.keys(hands)) hands[k] = hands[k].map((m) => ({ model: m, pivot: [0.5, -1, 0.5] }));
  const bud = earbud();
  return {
    dims: { hipY: 6, hipX: 2, thigh: 3, chestY: 6, shoulderX: 5.4, shoulderY: -1.5, shoulderZ: 0, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.3, headScale: 1.12, tail: [-2, -2.6], carry: [3, 6], shellAt: [0, 0, 0], blob: 0.66 },
    pelvis: pelvis(),
    torso: torso(),
    hoodDown: hoodDown(),
    thighL: thigh(1), thighR: thigh(-1), shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    hood: hoodUp(),
    ears: [],
    tail: [(() => { const v = new VoxelModel(); ell(v, 0, -0.5, -1, 1, 1, 1.6, skin); v.set(0, -1, -2, SKIN.d); return v; })()],
    extras: [
      { joint: 'head', model: bud, scale: FV, at: [-7.9, 5.2, 0.6], name: 'earbudR', shadow: false },
      { joint: 'head', model: bud, scale: FV, at: [7.4, 5.2, 0.6], name: 'earbudL', shadow: false },
      { joint: 'chest', model: cords(), scale: FV, at: [0, -1.2, 4.02], name: 'cords', shadow: false },
      { joint: 'pelvis', model: bobberCharm(), scale: FV, at: [4.6, -0.6, 1.2], name: 'bobber', spring: { k: 55, damp: 0.12, amp: 1.4, idle: 0.05 } },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 8, y: 1, h: 4, w: 6, beak: true, my: 7 },
      cfg: {
        eyeStyle: 'gloss', eyeW: 6, eyeH: 7, eyeY: 21, eyeDX: 13,
        iris: '#3a2418', irisLight: '#9a6a34', pupil: '#1a0e14', lash: '#22141e', lid: '#22141e',
        brow: '#4a6630', browY: 12, browW: 6, browThick: 2,
        blushCol: '#ff8a86', blushY: 29, blushDX: 17,
        mouthCol: '#3a1e1a', mouthW: 12, beak: true, nostrils: false,
      },
    },
  };
}
