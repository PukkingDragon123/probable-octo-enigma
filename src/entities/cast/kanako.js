// Kanako, 17: the well-mannered crab girl who runs the family thrift shop
// (Kani-ya) on Kodama Ginza. A wide red carapace with a scalloped rim and
// little front spines, two fine antennae that twitch, a sakura kanzashi with
// dangling beads, a lilac kimono with white sakura, a golden obi with a red
// obijime cord and a pearl, wide sleeves, white tabi and zori, and two big
// careful claws.
import { VoxelModel, rbox, ell, tone, hash3, mirror, FV, sh, line3 } from '../craft.js';

const SHELL = { b: 0xd8573a, d: 0xba452e, dd: 0x8e3424, l: 0xee7a52, ll: 0xf89c6c };
const UNDER = { b: 0xf8dcc4, d: 0xe8c4a8 };
const KIMONO = { b: 0xccb6e2, d: 0xb29ccc, dd: 0x8e78ae, l: 0xdecef0 };
const SAKURA = 0xfff4f8, SAKURA_P = 0xf8b8cc;
const COLLAR = 0xfbfaf6;
const OBI = { b: 0xe6be5a, d: 0xc49c3c, l: 0xf6d886 }, CORD = 0xd8443a, PEARL = 0xf8f6f0;
const TABI = 0xf6f4ee, ZORI = 0xd8c8a8, STRAP = 0xc83a4a;
const KANZ = { gold: 0xe8c050, petal: 0xf8b8cc, petalL: 0xffe0ea, bead: 0xd8343a };

const shell = (x, y, z) => (hash3(x, y, z) < 0.07 ? SHELL.ll : tone(x, y, z, SHELL.b, SHELL.d, SHELL.l, 0.08, 0.06));
const kimono = (x, y, z) => {
  // white sakura with pink hearts, scattered on a lilac ground
  const h = hash3(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2));
  if (h > 0.86 && (x + y) % 2 === 0) return SAKURA;
  if (h > 0.86) return SAKURA_P;
  return tone(x, y, z, KIMONO.b, KIMONO.d, KIMONO.l, 0.07, 0.05);
};

function head() {
  const v = new VoxelModel();
  // wide carapace: x -8..7, y 0..9, z -6..5
  rbox(v, -8, 7, 0, 9, -6, 5, 2.4, (x, y, z) => {
    if (y <= 2 && z >= 1) return tone(x, y, z, UNDER.b, UNDER.d, UNDER.b, 0.08, 0);
    if (y >= 8 && z <= -3) return tone(x, y, z, SHELL.d, SHELL.dd, SHELL.b, 0.1, 0.05);
    return shell(x, y, z);
  });
  // scalloped front rim along the top edge + small spines at the front corners
  for (let x = -7; x <= 6; x++) if ((x + 20) % 3 === 0) v.set(x, 10, 4, SHELL.l);
  for (const s of [-1, 1]) {
    const x = s < 0 ? -9 : 8;
    v.set(x, 7, 3, SHELL.l); v.set(x, 6, 4, SHELL.b); v.set(x + s, 7, 4, SHELL.ll); v.set(x, 4, 2, SHELL.b); v.set(x + s, 5, 2, SHELL.l);
  }
  // carapace grooves (an H shape on top)
  for (let z = -4; z <= 3; z++) { v.set(-3, 10, z, SHELL.d); v.set(2, 10, z, SHELL.d); }
  for (let x = -2; x <= 1; x++) v.set(x, 10, -1, SHELL.d);
  return v;
}
// a twitchy antenna (fine voxels)
function antenna() {
  const v = new VoxelModel();
  line3(v, [0, 0, 0], [1, 8, 3], (i, n) => (i > n - 2 ? SHELL.dd : SHELL.b));
  return v;
}
// sakura kanzashi: a gold pin, a flower and a dangling string of beads
function kanzashi() {
  const v = new VoxelModel();
  line3(v, [0, 0, 0], [-5, -2, -3], KANZ.gold);
  for (let a = 0; a < 5; a++) { const t = (a / 5) * Math.PI * 2; ell(v, Math.cos(t) * 2.2, 1 + Math.sin(t) * 2.2, 0.5, 1.3, 1.3, 0.8, a % 2 ? KANZ.petal : KANZ.petalL); }
  v.set(0, 1, 1, KANZ.gold);
  return v;
}
function beads() {
  const v = new VoxelModel();
  for (let y = 0; y >= -6; y--) v.set(0, y, 0, KANZ.gold);
  for (const y of [-2, -4, -7]) { v.set(0, y, 1, y === -7 ? KANZ.bead : KANZ.petal); v.set(1, y, 0, y === -7 ? KANZ.bead : KANZ.petalL); }
  return v;
}
function torso() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 5, -3, 3, 1.8, kimono);
  // collar: white under-collar, the kimono overlaps left over right
  for (let y = 0; y <= 5; y++) {
    const xe = Math.round(-0.5 + (y - 5) * 0.9 + 2);
    v.set(xe, y, 4, COLLAR); v.set(xe + 1, y, 4, KIMONO.dd);
    v.set(-xe - 1, y, 4, y > 2 ? COLLAR : KIMONO.d);
  }
  // obi: a wide gold band at the waist, red cord with a pearl, bow at the back
  for (let x = -6; x <= 5; x++) for (let z = -4; z <= 4; z++) for (let y = -3; y <= 0; y++) {
    const d = ((x + 0.5) / 6) ** 2 + ((z + 0.5) / 4.4) ** 2;
    if (d > 1.02 || d < 0.62) continue;
    v.set(x, y, z, y === -1 && z >= 2 ? CORD : (x + y) % 4 === 0 ? OBI.d : y === 0 ? OBI.l : OBI.b);
  }
  v.set(-1, -1, 5, PEARL); v.set(0, -1, 5, PEARL);
  rbox(v, -4, 3, -3, 1, -7, -5, 1.0, (x, y, z) => (y === 1 ? OBI.l : OBI.b)); // otaiko bow at the back
  return v;
}
// the long kimono skirt down to the ankles
function pelvis() {
  const v = new VoxelModel();
  for (let y = -6; y <= 0; y++) {
    const f = (-y) * 0.08;
    for (let x = -5; x <= 4; x++) for (let z = -4; z <= 3; z++) {
      const dx = (x + 0.5) / (5 + f), dz = (z + 0.5) / (3.8 + f);
      const d = dx * dx + dz * dz;
      if (d > 1.05 || (d < 0.5 && y > -6)) continue;
      v.set(x, y, z, y === -6 ? KIMONO.dd : kimono(x, y, z));
    }
  }
  // the front overlap seam
  for (let y = -6; y <= -1; y++) v.set(1, y, 4, KIMONO.dd);
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, KIMONO.d); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, TABI);
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 2; z++) v.set(x, -3, z, ZORI);
  for (let x = -1; x <= 0; x++) for (let z = -1; z <= 1; z++) v.set(x, -2, z, TABI);
  v.set(-1, -2, 2, STRAP); v.set(0, -2, 2, STRAP); v.set(-2, -2, 1, STRAP); v.set(1, -2, 1, STRAP);
  return v;
}
// wide kimono sleeves: the upper arm carries a hanging sleeve pouch
function upper() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 1, -1, 1, 0.9, kimono);
  rbox(v, -1, 1, -6, -1, -2, 3, 1.2, (x, y, z) => (y === -6 ? KIMONO.dd : kimono(x, y, z)));
  return v;
}
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => (y === -3 ? COLLAR : kimono(x, y, z))); return v; }
// crab claw, pivot at the wrist: a chunky palm, a fixed upper finger and a
// movable lower finger (open = spread)
function claw(kind, side) {
  const v = new VoxelModel();
  rbox(v, -1, 2, -4, 0, -2, 2, 1.2, (x, y, z) => (y <= -3 && z >= 1 ? SHELL.l : shell(x, y, z)));
  const gap = kind === 'open' ? 2 : kind === 'fist' ? 0 : 1;
  for (let y = -5; y >= -8; y--) { v.set(0, y, 1, y === -8 ? SHELL.dd : SHELL.b); v.set(1, y, 1, SHELL.l); }
  for (let y = -5; y >= -7; y--) { v.set(0, y, -1 - gap, y === -7 ? SHELL.dd : SHELL.d); v.set(1, y, -1 - gap, SHELL.b); }
  // little teeth on the inside
  v.set(0, -6, 0, UNDER.b);
  return side < 0 ? mirror(v) : v;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: claw(k, s), pivot: [0.5, -0.5, 0] }));
  const ant = antenna();
  return {
    dims: { hipY: 6, hipX: 1.6, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 3.6, neckY: 0.2, neckZ: 0.1, headScale: 1.05, carry: [3, 6], blob: 0.66 },
    pelvis: pelvis(), torso: torso(),
    thigh: { model: thigh(), pivot: C }, shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [],
    tail: [],
    extras: [
      { joint: 'head', model: ant, scale: FV, at: [-2.2, 10, 4.2], rot: [-0.2, 0, 0.25], name: 'antennaR', spring: { k: 70, damp: 0.08, amp: 1.2, idle: 0.1, idleF: 3.1 } },
      { joint: 'head', model: mirror(ant), scale: FV, at: [1.2, 10, 4.2], rot: [-0.2, 0, -0.25], name: 'antennaL', spring: { k: 70, damp: 0.08, amp: 1.2, idle: 0.1, idleF: 2.7, phase: 2 } },
      { joint: 'head', model: kanzashi(), scale: FV, at: [5.2, 10.2, -1.5], rot: [0, 0, -0.3], name: 'kanzashi' },
      { joint: 'head', model: beads(), scale: FV, at: [6.6, 9.6, -2.2], name: 'beads', spring: { k: 45, damp: 0.08, amp: 1.4, idle: 0.05 } },
    ],
    face: {
      box: { x0: -8, x1: 7, y0: 0, y1: 9 }, faceZ: 6, lift: 0.1,
      snout: null,
      cfg: {
        eyeStyle: 'gloss', girl: true, eyeW: 6, eyeH: 7, eyeY: 16, eyeDX: 14,
        iris: '#3a1424', irisLight: '#a85a7a', pupil: '#1a0a12', lash: '#2a1018', lid: '#2a1018',
        brow: '#8e3424', browY: 7, browW: 6, browThick: 1,
        blushCol: '#ff9ab0', blushY: 24, blushDX: 19,
        mouthCol: '#6a1e2a', mouthW: 8, mouthY: 29,
      },
    },
  };
}
