// Tarōbō: the tengu of the cloud-peak castle. Rich, classy, greedy and
// hot-tempered, mad about tea. A crimson face with a long upturned nose,
// fierce golden eyes under great white brows, a white mane and beard, the
// little black tokin cap, a white yamabushi robe with gold brocade trim, the
// kesa sash with purple-and-gold bonten pom-poms, dark prayer beads with a
// purple tassel, purple hakama, one-tooth tengu geta, folded crow wings
// glossed blue, and his feather fan.
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh, line3 } from '../craft.js';

const SKIN = { b: 0xd8463a, d: 0xbc3a30, dd: 0x8e2a26, l: 0xee6450, ll: 0xf88a6a };
const HAIR = { b: 0xf6f4f0, d: 0xdcd8d0, l: 0xffffff };
const TOKIN = 0x1e1a24, TOKIN_L = 0x3e3848;
const ROBE = { b: 0xf2eee2, d: 0xdcd6c6, l: 0xfffcf4 };
const GOLD = { b: 0xe0b848, d: 0xb88e2a, l: 0xf8dc80 };
const HAKAMA = { b: 0x50407e, d: 0x3e3064, l: 0x6854a0 };
const PURPLE = { b: 0x8a5ac8, d: 0x6a40a8, l: 0xb08ae0 };
const WING = { b: 0x24242e, d: 0x18181e, l: 0x3a3a50, sheen: 0x34466e };
const WOOD = { b: 0x8a5a3a, d: 0x6a4228, l: 0xa87048 }, STRAP = 0xc83a32, KYAHAN = 0xf2eee2;
const BEAD = 0x3a2420, BEAD_L = 0x6a4434;

const skin = (x, y, z) => tone(x, y, z, SKIN.b, SKIN.d, SKIN.l, 0.07, 0.05);
const hair = (cy) => (x, y, z) => (y >= cy + 1 ? HAIR.l : y <= cy - 1 ? HAIR.d : HAIR.b);

function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 2.6, skin);
  // the long nose: 2x2, curving gently upwards towards the tip
  for (let z = 6; z <= 16; z++) {
    const lift = z >= 15 ? 2 : z >= 12 ? 1 : 0;
    for (let x = -1; x <= 0; x++) for (let y = 5; y <= 6; y++) {
      if (z === 16 && y === 5) continue;
      v.set(x, y + lift, z, y === 6 ? (z >= 13 ? SKIN.ll : SKIN.l) : z >= 13 ? SKIN.b : SKIN.d);
    }
  }
  v.set(-2, 5, 6, SKIN.b); v.set(1, 5, 6, SKIN.b); v.set(-2, 6, 6, SKIN.l); v.set(1, 6, 6, SKIN.l); // nose root
  // white mane around the back and sides, puffed in clumps
  for (const [cx, cy, cz, rx, ry, rz] of [[-7.4, 6.5, -2, 1.8, 3.2, 3.2], [6.4, 6.5, -2, 1.8, 3.2, 3.2], [-4, 8, -6.8, 2.8, 3, 1.8], [3, 8, -6.8, 2.8, 3, 1.8], [-0.5, 4.5, -7, 3.4, 2.8, 1.8], [-4.5, 11, -4.4, 2.4, 1.6, 2.2], [3.5, 11, -4.4, 2.4, 1.6, 2.2], [-0.5, 11.6, -5.6, 2.2, 1.4, 1.6]])
    ell(v, cx, cy, cz, rx, ry, rz, hair(cy));
  // the tokin: a small black cap on the forehead, tied under the mane
  for (let x = -2; x <= 1; x++) for (let z = 1; z <= 4; z++) for (let y = 12; y <= 13; y++) {
    if (y === 13 && (x === -2 || x === 1 || z === 1 || z === 4)) continue;
    v.set(x, y, z, y === 13 ? TOKIN_L : TOKIN);
  }
  v.set(-1, 14, 2, TOKIN); v.set(0, 14, 3, TOKIN); // pleated top
  return v;
}
// fierce white brow (fine voxels): inner end low, flaring up and out
function brow() {
  const v = new VoxelModel();
  for (let x = -5; x <= 5; x++) {
    const y = Math.round((x + 5) * 0.45);
    for (let k = 0; k < 3 + (x > 1 ? 1 : 0); k++) v.set(x, y + k, (k > 1 ? 1 : 0), k === 2 ? HAIR.l : k === 0 ? HAIR.d : HAIR.b);
  }
  ell(v, 6, 6, 0.5, 1.8, 1.4, 1, HAIR.b); // the flick at the outer end
  return v;
}
// long white beard (fine voxels) under the face
function beard() {
  const v = new VoxelModel();
  ell(v, 0, -4, 0, 9, 6, 3, hair(-3));
  ell(v, 0, -10, 1, 5.5, 4, 2.2, hair(-10));
  ell(v, 0.5, -14, 1.5, 2.4, 2.4, 1.6, HAIR.d);
  return v;
}
function torso() {
  const v = new VoxelModel();
  const R = (x, y, z) => (y >= 5 ? ROBE.l : tone(x, y, z, ROBE.b, ROBE.d, ROBE.l, 0.06, 0.05));
  rbox(v, -6, 5, -3, 5, -4, 3, 2.0, R);
  ell(v, -0.5, 1.4, 2.4, 5, 4, 2.4, R); // a well-fed belly
  // crossed collar with gold trim
  for (let y = -1; y <= 5; y++) {
    const xe = Math.round(-0.5 + (y - 5) * 0.8 + 2.5);
    v.set(xe, y, 5, GOLD.b); v.set(xe + 1, y, 5, GOLD.d);
  }
  // the kesa: a gold band over each shoulder with three bonten pom-poms down each side
  for (const s of [-1, 1]) for (let y = -2; y <= 6; y++) v.set(Math.round(-0.5 + s * 3.5), y, 4 + (y < 3 ? 1 : 0), y % 3 === 0 ? GOLD.d : GOLD.b);
  return v;
}
function bonten() {
  const v = new VoxelModel();
  const cols = [PURPLE, { b: 0xf6f4f0, d: 0xdcd8d0, l: 0xffffff }, GOLD];
  [0, -1, -2].forEach((k, i) => {
    const C = cols[i % 3];
    for (const s of [-1, 1]) ell(v, s * 7, 2 - i * 5, 0.5, 2.2, 2.2, 2.2, (x, y, z) => (hash3(x, y, z) < 0.35 ? C.l : y < 1 - i * 5 ? C.d : C.b));
  });
  return v;
}
// prayer beads with a purple tassel (fine voxels)
function juzu() {
  const v = new VoxelModel();
  for (let a = 0; a < 18; a++) {
    const t = (a / 17) * Math.PI;
    const x = Math.round(Math.cos(t) * 7), y = Math.round(-Math.sin(t) * 6);
    v.set(x, y, 0, a % 3 === 0 ? BEAD_L : BEAD); v.set(x, y, 1, BEAD);
  }
  for (let y = -7; y >= -12; y--) v.set(0, y, 1, y < -9 ? PURPLE.b : GOLD.b);
  v.set(-1, -12, 1, PURPLE.d); v.set(1, -12, 1, PURPLE.d); v.set(0, -13, 1, PURPLE.d);
  return v;
}
function pelvis() {
  const v = new VoxelModel();
  // hakama: wide pleated trousers, flaring
  for (let y = -5; y <= 0; y++) {
    const f = (-y) * 0.25;
    for (let x = Math.floor(-6 - f); x <= Math.ceil(5 + f); x++) for (let z = Math.floor(-4 - f); z <= Math.ceil(3 + f); z++) {
      const dx = (x + 0.5) / (6 + f), dz = (z + 0.5) / (4 + f);
      const d = dx * dx + dz * dz;
      if (d > 1.05 || (d < 0.5 && y > -5)) continue;
      const pleat = ((x + 30) % 3 === 0) ? HAKAMA.d : HAKAMA.b;
      v.set(x, y, z, y === 0 ? GOLD.b : y === -5 ? HAKAMA.d : pleat);
    }
  }
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -2, 1, -3, 0, -2, 1, 1.0, HAKAMA.b); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, KYAHAN);
  for (let x = -1; x <= 0; x++) for (let z = -1; z <= 1; z++) v.set(x, -2, z, KYAHAN);
  // one-tooth geta: a board on a single tall tooth
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) v.set(x, -3, z, tone(x, -3, z, WOOD.b, WOOD.d, WOOD.l, 0.15, 0.1));
  for (let x = -2; x <= 1; x++) for (let y = -6; y <= -4; y++) v.set(x, y, 0, y === -6 ? WOOD.d : WOOD.b);
  v.set(-1, -2, 2, STRAP); v.set(0, -2, 2, STRAP); v.set(-2, -2, 1, STRAP); v.set(1, -2, 1, STRAP);
  return v;
}
function upper() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 1, -1, 1, 0.9, (x, y, z) => tone(x, y, z, ROBE.b, ROBE.d, ROBE.l, 0.06, 0.04));
  rbox(v, -2, 2, -6, -1, -2, 3, 1.2, (x, y, z) => (y === -6 ? GOLD.b : tone(x, y, z, ROBE.b, ROBE.d, ROBE.l, 0.06, 0.04))); // wide sleeve
  return v;
}
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => (y === -3 ? GOLD.b : ROBE.b)); return v; }
// a folded crow wing (left; mirrored for the right): a long teardrop of
// layered feathers, small coverts at the shoulder, long primaries below with
// jagged tips and a blue sheen along the leading edge
function wing() {
  const v = new VoxelModel();
  const H = 13;
  for (let y = 0; y > -H; y--) {
    const t = -y / H;
    const w = Math.max(2, Math.round(6.5 - t * 4.5 + Math.sin(t * Math.PI) * 1.2));
    for (let x = 0; x <= w; x++) {
      // scalloped feather rows: each row's lower edge is lighter, separations darker
      const row = Math.floor((y + 40) / 3);
      const edge = (y + 40) % 3 === 0;
      let c = edge ? WING.l : (x + row) % 4 === 0 ? WING.d : WING.b;
      if (x === 0 || x === 1 && t < 0.4) c = WING.sheen;
      if (t < 0.22) c = (x + y) % 2 ? WING.l : WING.b; // coverts at the shoulder
      if (y === -H + 1 && (x & 1)) continue; // jagged primary tips
      v.set(x, y, 0, c);
      v.set(x, y, -1, x === w ? WING.l : WING.d);
      if (t < 0.35 && x < w - 1) v.set(x, y, 1, WING.b); // thicker at the shoulder
    }
  }
  return v;
}
// the feather fan (hauchiwa): a fan of long dark feathers on a gold handle
function fan() {
  const v = new VoxelModel();
  for (let y = 0; y >= -6; y--) v.set(0, y, 0, y > -2 ? GOLD.l : GOLD.d);
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.22;
    for (let k = 0; k < 13; k++) {
      const x = Math.round(Math.sin(a) * k), y = Math.round(1 + Math.cos(a) * k);
      v.set(x, y, 0, k > 10 ? WING.l : i % 2 ? WING.b : 0x6a2a2a);
      if (k > 3 && k < 11) v.set(x + (i >= 0 ? 1 : -1), y, 0, WING.d);
    }
  }
  return v;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, skin, { w: 1, claws: 0x3a2a2a }), pivot: C }));
  const b = brow(), w = wing();
  return {
    dims: { hipY: 9, hipX: 2.2, thigh: 3, chestY: 6.5, shoulderX: 6.4, shoulderY: -1.6, upper: 3, fore: 3, grip: 2.6, neckY: 0.3, neckZ: 0.4, headScale: 1.1, carry: [3, 8], blob: 0.82 },
    pelvis: pelvis(), torso: torso(),
    thigh: thigh(), shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [],
    tail: [],
    extras: [
      { joint: 'head', model: mirror(b), scale: FV, at: [-3.25, 8.6, 6.2], name: 'browR', spring: { k: 110, damp: 0.14, amp: 0.5, idle: 0.02 } },
      { joint: 'head', model: b, scale: FV, at: [3.25, 8.6, 6.2], name: 'browL', spring: { k: 110, damp: 0.14, amp: 0.5, idle: 0.02, phase: 1 } },
      { joint: 'head', model: beard(), scale: FV, at: [-0.5, 3.2, 5.6], name: 'beard', spring: { k: 90, damp: 0.16, amp: 0.4, axis: 'x', idle: 0.02 } },
      { joint: 'chest', model: bonten(), scale: FV, at: [-0.5, -1.4, 5.4], name: 'bonten', spring: { k: 80, damp: 0.12, amp: 0.6, axis: 'x', idle: 0.03 } },
      { joint: 'chest', model: juzu(), scale: FV, at: [-0.5, -0.4, 5.6], name: 'juzu', spring: { k: 70, damp: 0.12, amp: 0.8, idle: 0.03 } },
      { joint: 'spine', model: mirror(w), at: [-1.5, 6.8, -4.6], rot: [0.25, -0.75, 0.1], name: 'wingR', spring: { k: 60, damp: 0.12, amp: 0.4, axis: 'z', idle: 0.03 } },
      { joint: 'spine', model: w, at: [0.5, 6.8, -4.6], rot: [0.25, 0.75, -0.1], name: 'wingL', spring: { k: 60, damp: 0.12, amp: 0.4, axis: 'z', idle: 0.03, phase: 0.5 } },
      { joint: 'gripR', model: fan(), scale: FV, at: [0, 0, 0], rot: [0.3, 0, 0], name: 'fan' },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: null,
      cfg: {
        eyeStyle: 'gloss', eyeW: 6, eyeH: 6, eyeY: 20, eyeDX: 12,
        iris: '#c88a18', irisLight: '#ffe060', pupil: '#2a1406', lash: '#2a1012', lid: '#2a1012',
        brow: null, browW: 0, browThick: 0,
        blushCol: '#ff5a4a', blushY: 27, blushDX: 18,
        mouthCol: '#3a0e14', mouthW: 10, mouthY: 33,
      },
    },
  };
}
