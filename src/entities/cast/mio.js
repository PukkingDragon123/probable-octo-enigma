// Mio, 16: a clumsy river otter in a sailor uniform. Side-swept dark bangs
// with one stubborn ahoge that bobs around, a yellow hairband, a sticking
// plaster on her cheek (always), a wide whiskery muzzle, a red scarf knot.
// A brown school satchel on her hip, covered in gacha capsule charms that
// jingle when she walks (she is Kodamaya's biggest fan).
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh, line3 } from '../craft.js';

const FUR = { b: 0x8c5e3e, d: 0x764c32, dd: 0x5a3826, l: 0xa6724c, ll: 0xbe8a5c };
const FACE = { b: 0xf2dec2, d: 0xdec6a6, l: 0xfaecd8 };
const HAIR = { b: 0x5e3a28, d: 0x4a2c20, l: 0x7a4e36 };
const NOSE = 0x2a1a18, NOSE_L = 0x5a4440;
const BAND = 0xf8c838, BAND_D = 0xd8a020;
const BLOUSE = { b: 0xf8f6f2, d: 0xe4e2de, l: 0xffffff };
const NAVY = { b: 0x2e3e6a, d: 0x232f52, l: 0x3e5082 };
const SCARF = { b: 0xd8343a, d: 0xa82428, l: 0xf05a54 };
const SOCK = 0xf8f6f2, LOAFER = 0x5a3424, LOAFER_D = 0x3e2418;
const BAG = { b: 0x7a4a2c, d: 0x5e381e, l: 0x96603a }, BUCKLE = 0xe8c050;

const fur = (x, y, z) => tone(x, y, z, FUR.b, FUR.d, FUR.l, 0.08, 0.06);

function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 10, -6, 5, 3.0, (x, y, z) => {
    // pale face: chin, cheeks and up around the eyes at the front
    if (z >= 3 && y <= 5 - Math.max(0, Math.abs(x + 0.5) - 4)) return tone(x, y, z, FACE.b, FACE.d, FACE.l, 0.06, 0.05);
    if (y <= 2 && z >= -2) return tone(x, y, z, FACE.b, FACE.d, FACE.l, 0.06, 0.05);
    if (y >= 9 && z <= -3) return tone(x, y, z, FUR.d, FUR.dd, FUR.b, 0.1, 0.05);
    return fur(x, y, z);
  });
  // wide flat muzzle with whisker pads and a big nose
  rbox(v, -4, 3, 0, 2, 6, 7, 1.0, (x, y, z) => tone(x, y, z, FACE.b, FACE.d, FACE.l, 0.06, 0.04));
  for (let x = -2; x <= 1; x++) v.set(x, 2, 8, x === -2 ? NOSE_L : NOSE);
  v.set(-1, 1, 8, NOSE); v.set(0, 1, 8, NOSE);
  // dark side-swept bangs over the forehead + the hairband
  for (let x = -7; x <= 6; x++) {
    const len = Math.max(1, Math.round(2.4 - (x + 7) * 0.14)); // longer on the left, swept right
    for (let k = 0; k < len; k++) v.set(x, 10 - k, 6, k === len - 1 ? HAIR.d : HAIR.b);
    v.set(x, 11, 5, HAIR.b); v.set(x, 11, 4, HAIR.l);
  }
  for (let x = -7; x <= 6; x++) for (let z = -1; z <= 0; z++) v.set(x, 11, z, z === 0 ? BAND : BAND_D);
  for (const x of [-8, 7]) for (let y = 7; y <= 10; y++) v.set(x, y, 0, BAND_D);
  return v;
}
function ear(side) {
  const v = new VoxelModel();
  ell(v, 0, 0, 0, 1.8, 1.6, 1, (x, y, z) => (z >= 1 && y <= 0 ? FUR.dd : FUR.d));
  return v;
}
// the ahoge: one bouncy strand (fine voxels) curling forward
function ahoge() {
  const v = new VoxelModel();
  const pts = [[0, 0], [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 4], [5, 4]];
  pts.forEach(([z, y], i) => { v.set(0, y, z, i > 6 ? HAIR.l : HAIR.b); v.set(-1, y, z, HAIR.d); });
  return v;
}
function whiskers() {
  const v = new VoxelModel();
  for (const s of [-1, 1]) for (const [dy, len] of [[0, 5], [-2, 4]]) line3(v, [s * 9, dy, 0], [s * (9 + len), dy + (dy === 0 ? 1 : -1), -1], 0xe8dccc);
  return v;
}
function torso() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 5, -3, 3, 1.8, (x, y, z) => (y >= 5 ? BLOUSE.l : tone(x, y, z, BLOUSE.b, BLOUSE.d, BLOUSE.l, 0.06, 0.05)));
  // sailor collar: navy V lapels at the front, the big square flap at the back, two white stripes
  for (let y = 1; y <= 5; y++) for (const s of [-1, 1]) {
    const xe = Math.round(-0.5 + s * (1 + (y - 1) * 0.8));
    for (let k = 0; k <= 1; k++) v.set(xe + s * k, y, 4, k === 1 && y < 5 ? BLOUSE.l : NAVY.b);
  }
  for (let x = -5; x <= 4; x++) for (let y = 1; y <= 5; y++) {
    const edge = x === -5 || x === 4 || y === 1;
    v.set(x, y, -4, edge ? NAVY.d : (x === -4 || x === 3 || y === 2) ? BLOUSE.l : NAVY.b);
  }
  // red scarf knot + two tails
  for (let x = -2; x <= 1; x++) for (let y = 2; y <= 3; y++) v.set(x, y, 5, y === 3 ? SCARF.l : SCARF.b);
  v.set(-1, 1, 5, SCARF.d); v.set(0, 1, 5, SCARF.b); v.set(-2, 0, 5, SCARF.d); v.set(1, 0, 5, SCARF.d);
  // satchel strap across the chest (left shoulder -> right hip)
  for (let k = 0; k <= 8; k++) v.set(Math.round(4 - k * 1.1), Math.round(5 - k * 0.95), 4, BAG.d);
  return v;
}
function pelvis() {
  const v = new VoxelModel();
  for (let y = -4; y <= 0; y++) {
    const f = (-y) * 0.42;
    for (let x = Math.floor(-5 - f); x <= Math.ceil(4 + f); x++) for (let z = Math.floor(-4 - f * 0.8); z <= Math.ceil(3 + f * 0.8); z++) {
      const dx = (x + 0.5) / (5 + f), dz = (z + 0.5) / (3.6 + f * 0.8);
      const d = dx * dx + dz * dz;
      if (d > 1.05 || (d < 0.55 && y > -4)) continue;
      const pleat = (Math.round(Math.atan2(dz, dx) * 4) & 1) ? NAVY.b : NAVY.d;
      v.set(x, y, z, y === -4 ? NAVY.d : y === 0 ? NAVY.l : pleat);
    }
  }
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, fur); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, (x, y, z) => (y >= -1 ? fur(x, y, z) : SOCK));
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 2; z++) { v.set(x, -2, z, SOCK); v.set(x, -3, z, z === 2 ? LOAFER_D : LOAFER); }
  v.set(-1, -2, 2, LOAFER); v.set(0, -2, 2, LOAFER);
  return v;
}
function upper() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 1, -1, 1, 0.9, (x, y, z) => tone(x, y, z, BLOUSE.b, BLOUSE.d, BLOUSE.l, 0.06, 0.05)); return v; }
function fore() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => (y <= -2 ? (y === -3 ? NAVY.b : BLOUSE.l) : BLOUSE.b));
  return v;
}
function tailSeg(r, len) {
  const v = new VoxelModel();
  ell(v, 0, 0, -len / 2, r + 0.3, r * 0.8, len / 2 + 0.3, (x, y, z) => (y > 0 ? FUR.l : fur(x, y, z)));
  return v;
}
// school satchel with gacha capsule charms (fine voxels)
function satchel() {
  const v = new VoxelModel();
  rbox(v, -7, 6, -10, 0, -2, 2, 1.2, (x, y, z) => (y === 0 ? BAG.l : z === 2 && y <= -2 && y >= -4 ? BAG.d : tone(x, y, z, BAG.b, BAG.d, BAG.l, 0.08, 0.06)));
  for (let x = -6; x <= 5; x++) v.set(x, -4, 3, BAG.d); // flap edge
  v.set(-1, -5, 3, BUCKLE); v.set(0, -5, 3, BUCKLE); v.set(-1, -6, 3, BUCKLE);
  return v;
}
function charms() {
  const v = new VoxelModel();
  const cap = (x0, top, bot) => { ell(v, x0 + 0.5, -7, 0.5, 2.2, 2.2, 2.2, (x, y, z) => (y >= -7 ? top : bot)); v.set(x0, -7, 2, 0x2a2a30); };
  for (let y = 0; y >= -4; y--) { v.set(-4, y, 0, 0xd8c070); v.set(3, y - 1, 0, 0xd8c070); }
  cap(-4, 0xff8aa8, 0xfff6ea);
  cap(3, 0x7ac8f0, 0xfff6ea);
  ell(v, -0.5, -9, 0.5, 1.6, 2.2, 1.4, (x, y, z) => (y >= -8 ? 0x8ad060 : 0x5aa040)); // a tiny kappa figure
  for (let y = 0; y >= -6; y--) v.set(-1, y, 0, 0xd8c070);
  return v;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, fur, { w: 1, pad: 0x5a3826 }), pivot: C }));
  const ah = ahoge();
  return {
    dims: { hipY: 6, hipX: 1.8, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.2, headScale: 1.1, tail: [-3, -3.5], tailTilt: 0.35, carry: [3, 6], blob: 0.62 },
    pelvis: pelvis(), torso: torso(),
    thigh: { model: thigh(), pivot: C }, shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [
      { model: ear(1), at: [5.6, 9.2, -1.5], side: 1, kind: 'otter' },
      { model: ear(-1), at: [-6.4, 9.2, -1.5], side: -1, kind: 'otter' },
    ],
    tail: [tailSeg(2.2, 3), tailSeg(1.8, 3), tailSeg(1.4, 3), tailSeg(1.0, 3)],
    extras: [
      { joint: 'head', model: ah, scale: FV, at: [-1.5, 11.4, 2.5], name: 'ahoge', spring: { k: 60, damp: 0.08, amp: 1.6, idle: 0.08 } },
      { joint: 'head', model: whiskers(), scale: FV, at: [-0.5, 1.6, 7.6], name: 'whiskers', shadow: false },
      { joint: 'pelvis', model: satchel(), scale: FV, at: [-5.6, 0.8, 0.5], rot: [0, -0.15, 0], name: 'satchel', spring: { k: 80, damp: 0.2, amp: 0.4, axis: 'x' } },
      { joint: 'pelvis', model: charms(), scale: FV, at: [-5.4, -1.6, 1.8], name: 'charms', spring: { k: 50, damp: 0.1, amp: 1.5, idle: 0.05 } },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 10 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 8, y: 0, h: 3, w: 8, my: 0 },
      cfg: {
        eyeStyle: 'gloss', girl: true, eyeW: 6, eyeH: 7, eyeY: 18, eyeDX: 13,
        iris: '#3a2214', irisLight: '#b07a40', pupil: '#1a0e0c', lash: '#24140e', lid: '#24140e',
        brow: '#3c241c', browY: 9, browW: 6, browThick: 1,
        blushCol: '#ff8a90', blushY: 25, blushDX: 17,
        decor: [{ type: 'bandaid', x: 18, y: 22 }],
        mouthCol: '#4a1c22', mouthW: 10,
      },
    },
  };
}
