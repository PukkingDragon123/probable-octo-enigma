// Kappei: the kappa of the hot-spring island. Bouncy, silly, mad about
// cucumbers. Green with a pale belly, a yellow hooked beak, the water dish on
// his head (it must never spill) ringed by a shaggy bowl cut, a mossy shell,
// webbed hands and flipper feet, red swim trunks, and his beloved cucumber
// floatie round his middle.
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh } from '../craft.js';

const SKIN = { b: 0x5ea86c, d: 0x4c905a, dd: 0x3a7448, l: 0x78c084, ll: 0x98d4a0 };
const BELLY = { b: 0xd6e6a6, d: 0xc0d48c };
const BEAK = { b: 0xe8b032, d: 0xc8902a, l: 0xf8cc58 };
const RIM = { b: 0xf2eee0, d: 0xd8d2c0 }, WATER = { b: 0x7ccdf0, l: 0xc8f0ff, d: 0x4aa8d8 };
const HAIR = { b: 0x2e6a40, d: 0x22502e, l: 0x438a52 };
const SHELL = { b: 0x5e7e40, d: 0x48642e, l: 0x7a9e52, seam: 0x2e4020 };
const CUKE = { b: 0x3e8a32, d: 0x2e6a26, l: 0x7ac85a, bump: 0xd8f0b8 };
const TRUNKS = { b: 0xd8443a, d: 0xa83028 };

const skin = (x, y, z) => tone(x, y, z, SKIN.b, SKIN.d, SKIN.l, 0.08, 0.06);

function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 10, -6, 5, 3.2, (x, y, z) => (y <= 2 && z >= -1 ? tone(x, y, z, BELLY.b, BELLY.d, BELLY.b, 0.06, 0) : skin(x, y, z)));
  // hooked beak
  rbox(v, -3, 2, 1, 3, 6, 8, 0.9, (x, y, z) => (y === 1 ? BEAK.d : y === 3 ? BEAK.l : BEAK.b));
  v.set(-1, 2, 9, BEAK.d); v.set(0, 2, 9, BEAK.d); v.set(-1, 3, 9, BEAK.b); v.set(0, 3, 9, BEAK.b);
  v.set(-2, 3, 8, BEAK.d); v.set(1, 3, 8, BEAK.d); // nostrils
  // the dish (sara): a white rim with water inside, on top of the head
  for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (d > 4.8) continue;
    if (d > 3.6) { v.set(x, 11, z, RIM.b); v.set(x, 12, z, d > 4.2 ? RIM.d : RIM.b); }
    else v.set(x, 11, z, (x + z) % 5 === 0 ? WATER.l : WATER.b);
  }
  // shaggy bowl cut around the dish: pointed strands, short at the front
  for (let x = -8; x <= 7; x++) for (let z = -7; z <= 6; z++) {
    const d = Math.hypot(x + 0.5, (z + 0.5) * 1.05);
    if (d < 4.8 || d > 8.4) continue;
    const front = z >= 4;
    const len = front ? 1 + ((x + 20) % 3 === 0 ? 1 : 0) : 2 + Math.floor(hash3(x, 3, z) * 3);
    for (let k = 0; k < len; k++) {
      const y = 11 - k;
      if (v.has(x, y, z) && k > 0 && d < 7.6) continue;
      v.set(x, y, z, k === 0 ? (z < 0 ? HAIR.b : HAIR.l) : k === len - 1 ? HAIR.d : HAIR.b);
    }
  }
  return v;
}
function torso() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 5, -3, 3, 1.9, (x, y, z) => (z >= 2 && Math.abs(x + 0.5) < 4 && y < 5 ? tone(x, y, z, BELLY.b, BELLY.d, BELLY.b, 0.08, 0) : skin(x, y, z)));
  // belly plates
  for (let y = -2; y <= 4; y += 2) for (let x = -3; x <= 2; x++) v.set(x, y, 4, BELLY.d);
  return v;
}
function shell() {
  const v = new VoxelModel();
  const CZ = -2.2, CY = 2.2;
  const cell = (x, y, z) => { const ring = Math.floor((y + 4) / 4); const th = Math.atan2(x + 0.5, -(z + 0.5 - CZ)) * (2.2 / Math.PI) + (ring % 2) * 0.5; return ring * 100 + Math.floor(th + 10); };
  ell(v, 0, CY, CZ, 6.4, 6.6, 4.6, (x, y, z) => {
    if (y < -3 || z > -2) return null;
    const c0 = cell(x, y, z);
    if (cell(x + 1, y, z) !== c0 || cell(x, y + 1, z) !== c0 || cell(x, y, z - 1) !== c0) return SHELL.seam;
    return tone(x, y, z, SHELL.b, SHELL.d, SHELL.l, 0.12, 0.08);
  });
  return v;
}
// the cucumber floatie: a torus, dark green with light stripes and white bumps
function floatie() {
  const v = new VoxelModel();
  const R = 6.6, r = 2.0;
  for (let x = -10; x <= 9; x++) for (let z = -10; z <= 9; z++) for (let y = -3; y <= 2; y++) {
    const q = Math.hypot(x + 0.5, (z + 0.5) * 1.0) - R;
    if (q * q + (y + 0.5) * (y + 0.5) > r * r) continue;
    const a = Math.atan2(z + 0.5, x + 0.5);
    const stripe = Math.floor((a / Math.PI + 1) * 10) % 2 === 0;
    const h = hash3(x, y, z);
    v.set(x, y, z, h > 0.93 ? CUKE.bump : y >= 1 ? (stripe ? CUKE.l : CUKE.b) : stripe ? CUKE.b : CUKE.d);
  }
  // a little stem nub at the front
  v.set(-1, 0, 9, 0x8a6a3a); v.set(0, 0, 9, 0x6a4a2a);
  return v;
}
function pelvis() {
  const v = new VoxelModel();
  rbox(v, -4, 3, -3, 0, -3, 2, 1.2, (x, y, z) => (y === 0 ? TRUNKS.d : TRUNKS.b));
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.9, skin); return v; }
// webbed flipper foot
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, skin);
  for (let x = -2; x <= 1; x++) for (let z = -1; z <= 3; z++) v.set(x, -3, z, z === 3 && (x === -2 || x === 1 || x === -1) ? SKIN.dd : z >= 2 ? SKIN.ll : SKIN.l);
  for (let x = -1; x <= 0; x++) v.set(x, -2, 0, SKIN.b);
  return v;
}
function upper() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 1, -1, 1, 0.9, skin); return v; }
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, skin); return v; }

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, skin, { w: 1, pad: SKIN.ll, claws: SKIN.dd }), pivot: C }));
  return {
    dims: { hipY: 6, hipX: 1.8, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.2, headScale: 1.12, carry: [3, 8], shellAt: [0, 0.5, -1], blob: 0.7 },
    pelvis: pelvis(), torso: torso(), shell: shell(),
    thigh: { model: thigh(), pivot: C }, shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [],
    tail: [],
    extras: [
      { joint: 'spine', model: floatie(), at: [-0.5, -0.2, 0], name: 'floatie', spring: { k: 90, damp: 0.14, amp: 0.25, idle: 0.02 } },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 10 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 9, y: 1, h: 3, w: 6, beak: true, my: 6 },
      cfg: {
        eyeStyle: 'gloss', eyeW: 7, eyeH: 8, eyeY: 18, eyeDX: 13,
        iris: '#1a2a20', irisLight: '#5aa070', pupil: '#0e1610', lash: '#14201a', lid: '#14201a',
        brow: '#2a5a3a', browY: 8, browW: 6, browThick: 2,
        blushCol: '#ff8a8a', blushY: 25, blushDX: 18,
        mouthCol: '#3a1a10', mouthW: 12, beak: true,
      },
    },
  };
}
