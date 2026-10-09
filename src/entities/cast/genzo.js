// Grandpa Genzō, 78: an old Japanese pond turtle who keeps Kodamaya. A big
// mossy shell with tiny flowers, tied with a little shimenawa (sacred straw
// rope) and zigzag paper shide: he has been friends with spirits for a long
// time. Bushy white brows that bounce, a walrus mustache, white tufts over the
// ears, round wire glasses, a tenugui towel round his neck, an indigo samue,
// the shop's green maekake apron (木霊屋), white tabi and geta, and on his hip
// the brass key ring with the kodama charm (the basement key).
import * as THREE from 'three';
import { VoxelModel, rbox, ell, tone, hash3, box, mirror, hand, roundGlasses, keyRing, FV, sh, mixc, topAt } from '../craft.js';
import { PixCanvas, makeTexture } from '../../core/pixtex.js';

const SKIN = { b: 0x84996a, d: 0x758a5c, dd: 0x5a6e48, l: 0x96ac7a, ll: 0xaec292 };
const SPOT = 0x6c8050;
const JAW = { b: 0xddd4a6, d: 0xc6bb8a, l: 0xece6c4 };
const HAIR = { b: 0xf6f2ea, d: 0xdcd6cc, l: 0xffffff };
const INDIGO = { b: 0x36456e, d: 0x2c385c, dd: 0x202a46, l: 0x48598a };
const TIE = 0xe8dcc0;
const APRON = { b: 0x2f5a46, d: 0x254a3a, dd: 0x1c3a2c, l: 0x3e705a };
const SHELL = { b: 0x6e5634, d: 0x584428, l: 0x8a6e44, seam: 0x34261a };
const MOSS = [0x4e7e34, 0x5e9040, 0x76aa4a, 0x96c460];
const ROPE = { b: 0xd8c088, d: 0xb49a60, l: 0xeedcaa };
const PAPER = 0xfbfaf4, PAPER_D = 0xe2ded2;
const TENUGUI = 0xf2f0ea, TEN_PAT = 0x3e5c8e;
const WOOD = { b: 0xb88a58, d: 0x8e6640, l: 0xd0a470 }, HANAO = 0xc83a32, TABI = 0xf4f2ec;

const skin = (x, y, z) => (hash3(x, y + 7, z) < 0.035 ? SPOT : tone(x, y, z, SKIN.b, SKIN.d, SKIN.l, 0.07, 0.05));

// ------------------------------------------------------------------ head
function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 3.0, (x, y, z) => {
    if (y <= 2 && z >= -2) return tone(x, y, z, JAW.b, JAW.d, JAW.l, 0.06, 0.05);
    if (y >= 9 && z >= 3 && (y === 9 || y === 10) && x > -5 && x < 4 && (x + y) % 5 === 0) return SKIN.d; // forehead wrinkles
    return skin(x, y, z);
  });
  // forehead wrinkle lines (two soft rows)
  for (let x = -3; x <= 2; x++) { v.set(x, 10, 5, SKIN.d); if (x > -2 && x < 2) v.set(x, 9, 5, SKIN.d); }
  // droopy snout / beak
  rbox(v, -3, 2, 1, 4, 6, 7, 1.0, (x, y, z) => (y <= 2 ? tone(x, y, z, JAW.b, JAW.d, JAW.l, 0.06, 0.04) : tone(x, y, z, SKIN.l, SKIN.b, SKIN.ll, 0.1, 0.05)));
  v.set(-1, 4, 8, SKIN.dd); v.set(0, 4, 8, SKIN.dd);
  // white hair: two fluffy clumps over the ears and a thin fringe round the back
  const hairCol = (x, y, z, cy) => (y >= cy + 1 ? HAIR.l : y <= cy - 1 ? HAIR.d : HAIR.b);
  for (const sx of [-1, 1]) {
    const cx = sx < 0 ? -7.3 : 6.3;
    ell(v, cx, 5.6, -1.6, 1.5, 2.1, 2.7, (x, y, z) => hairCol(x, y, z, 5));
    ell(v, cx + sx * 0.3, 4.2, -3.6, 1.3, 1.5, 1.6, (x, y, z) => hairCol(x, y, z, 4));
  }
  for (let x = -5; x <= 4; x++) { v.set(x, 4, -7, x % 3 === 0 ? HAIR.d : HAIR.b); if (Math.abs(x + 0.5) > 2) v.set(x, 5, -7, HAIR.b); }
  return v;
}
// bushy brow (fine voxels; this one sits over the viewer-right eye, mirrored for the other):
// a fluffy clump that droops at the outer end
function brow() {
  const v = new VoxelModel();
  ell(v, 0, 0, 0, 5.2, 2.2, 1.6, (x, y, z) => (y >= 1 ? HAIR.l : y <= -1 ? HAIR.d : HAIR.b));
  ell(v, 4.6, -1.6, 0.4, 2.2, 1.8, 1.2, (x, y, z) => (y >= -1 ? HAIR.b : HAIR.d)); // droopy outer end
  ell(v, -3.6, 1.0, 0.6, 1.8, 1.4, 1.0, HAIR.l); // tuft sticking up at the inner end
  return v;
}
// walrus mustache under the snout (fine voxels): two rounded lobes that droop at the ends
function mustache() {
  const v = new VoxelModel();
  for (const sx of [-1, 1]) {
    ell(v, sx * 4.2, -1.2, 0.5, 4.6, 2.4, 1.6, (x, y, z) => (y >= 0 ? HAIR.l : y <= -2 ? HAIR.d : HAIR.b));
    ell(v, sx * 7.6, -3.4, 0.2, 1.8, 2.4, 1.2, (x, y, z) => (y <= -4 ? HAIR.d : HAIR.b));
  }
  return v;
}

// ------------------------------------------------------------------ torso: samue + apron + tenugui
function torso() {
  const v = new VoxelModel();
  const I = (x, y, z) => tone(x, y, z, INDIGO.b, INDIGO.d, INDIGO.l, 0.1, 0.06);
  rbox(v, -5, 4, -3, 5, -4, 3, 1.8, (x, y, z) => (y >= 5 ? tone(x, y, z, INDIGO.l, INDIGO.b, INDIGO.l, 0.2, 0) : I(x, y, z)));
  // crossed collar: the left panel over the right (a diagonal edge) + inner collar band
  for (let y = 0; y <= 5; y++) {
    const xe = Math.round(2 - (5 - y) * 0.9);
    v.set(xe, y, 4, TIE);
    v.set(xe + 1, y, 4, INDIGO.dd);
  }
  // tie strings at the side of the chest
  v.set(3, 2, 4, TIE); v.set(4, 1, 4, TIE); v.set(4, 0, 4, TIE); v.set(3, 0, 4, TIE);
  // little chest pocket with a red pen
  for (let x = -4; x <= -2; x++) for (let y = 2; y <= 3; y++) v.set(x, y, 4, y === 3 ? INDIGO.dd : INDIGO.d);
  v.set(-3, 4, 4, 0xd8343a); v.set(-3, 3, 4, 0x2a2a30);
  // the shop apron (maekake): front panel from the waist down + ties around the back
  for (let x = -5; x <= 4; x++) for (let y = -4; y <= 0; y++) {
    const edge = x === -5 || x === 4 || y === -4;
    v.set(x, y, 4, edge ? APRON.d : y === 0 ? APRON.l : tone(x, y, 4, APRON.b, APRON.d, APRON.b, 0.1, 0));
  }
  for (let x = -5; x <= 4; x++) for (let z = -4; z <= 3; z++) if (v.has(x, 1, z) && (z <= -3 || x === -5 || x === 4)) v.set(x, 1, z, TIE);
  v.set(-1, 1, -5, TIE); v.set(0, 1, -5, TIE); v.set(-1, 0, -5, TIE); v.set(1, 0, -5, TIE); // bow at the back
  // tenugui towel round the neck, ends hanging down on the left
  for (let x = -4; x <= 3; x++) for (let z = -3; z <= 3; z++) {
    if (Math.abs(x + 0.5) < 3 && z > -2 && z < 3) continue;
    v.set(x, 6, z, (x + z) % 3 === 0 ? TEN_PAT : TENUGUI);
  }
  for (let y = 1; y <= 5; y++) for (let x = 2; x <= 3; x++) v.set(x, y, 5, y === 1 || y === 4 ? TEN_PAT : TENUGUI);
  return v;
}
// the mossy shell with scutes, the shimenawa rope and paper shide (spine space)
function shell() {
  const v = new VoxelModel();
  const CZ = -2.4, CY = 3.6;
  const cell = (x, y, z) => { const ring = Math.floor((y + 4) / 4.4); const th = Math.atan2(x + 0.5, -(z + 0.5 - CZ)) * (2.2 / Math.PI) + (ring % 2) * 0.5; return ring * 100 + Math.floor(th + 10); };
  const col = (x, y, z) => {
    const c0 = cell(x, y, z);
    if (cell(x + 1, y, z) !== c0 || cell(x, y + 1, z) !== c0 || cell(x, y, z - 1) !== c0) return SHELL.seam;
    return tone(x, y, z, SHELL.b, SHELL.d, SHELL.l, 0.14, 0.1);
  };
  ell(v, 0, CY, CZ, 7.2, 7.4, 5.4, (x, y, z) => (y < -3 ? null : z <= -1 ? col(x, y, z) : null));
  // marginal scutes rim
  for (let x = -7; x <= 6; x++) for (let z = -8; z <= -1; z++) if (v.has(x, -3, z)) v.set(x, -3, z, (x + z) % 2 ? SHELL.d : SHELL.seam);
  // moss blanket on top, tiny flowers
  for (let x = -7; x <= 6; x++) for (let z = -8; z <= -1; z++) {
    const top = topAt(v, x, z, 14, 0);
    if (top == null || top < 7) continue;
    const h = hash3(x, 5, z);
    if (h < 0.8) v.set(x, top, z, MOSS[Math.floor(h * 5) % 4]);
    if (h > 0.6) v.set(x, top + 1, z, MOSS[(Math.floor(h * 9) % 2) + 2]);
    const f = hash3(x, 9, z);
    if (f > 0.93) v.set(x, top + 2, z, [0xffffff, 0xf8a8c0, 0xffe070][Math.floor(f * 100) % 3]);
  }
  // the shimenawa: a twisted straw rope around the shell, with paper shide hanging off it
  for (let a = 0; a < 70; a++) {
    const t = (a / 70) * Math.PI * 1.15 + Math.PI * 0.92;
    const x = Math.round(Math.cos(t) * 7.6 - 0.5), z = Math.round(CZ + Math.sin(t) * 5.8 - 0.5);
    if (z > -1) continue;
    const y = 3 + ((a % 6) < 3 ? 0 : 1);
    v.set(x, y, z, a % 3 === 0 ? ROPE.d : a % 3 === 1 ? ROPE.b : ROPE.l);
    v.set(x, y - 1, z, ROPE.d);
  }
  for (const [x, z] of [[-6, -5], [0, -8], [5, -5]]) {
    // zigzag shide: three little steps of white paper
    v.set(x, 1, z, PAPER); v.set(x, 0, z, PAPER_D); v.set(x + 1, 0, z, PAPER); v.set(x + 1, -1, z, PAPER); v.set(x, -2, z, PAPER_D); v.set(x, -3, z, PAPER);
  }
  return v;
}

// ------------------------------------------------------------------ legs + arms
function pelvis() {
  const v = new VoxelModel();
  rbox(v, -4, 3, -3, 0, -3, 2, 1.2, (x, y, z) => tone(x, y, z, INDIGO.b, INDIGO.d, INDIGO.l, 0.1, 0.05));
  return v;
}
function thigh() {
  const v = new VoxelModel();
  rbox(v, -2, 1, -3, 0, -2, 1, 1.0, (x, y, z) => tone(x, y, z, INDIGO.b, INDIGO.d, INDIGO.l, 0.1, 0.05));
  return v;
}
function shin() {
  const v = new VoxelModel();
  // loose pant leg gathered at the ankle, white tabi, wooden geta with two teeth and a red strap
  rbox(v, -2, 1, -1, 0, -2, 1, 0.8, (x, y, z) => (y === -1 ? INDIGO.d : INDIGO.b));
  for (let x = -1; x <= 0; x++) for (let z = -1; z <= 2; z++) v.set(x, -2, z, TABI);
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) v.set(x, -3, z, z === 3 ? WOOD.l : tone(x, -3, z, WOOD.b, WOOD.d, WOOD.l, 0.15, 0.1));
  for (let x = -2; x <= 1; x++) { v.set(x, -4, -1, WOOD.d); v.set(x, -4, 2, WOOD.d); }
  v.set(-1, -2, 3, HANAO); v.set(0, -2, 3, HANAO); v.set(-2, -2, 1, HANAO); v.set(1, -2, 1, HANAO);
  return v;
}
function upper() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 1, -1, 1, 0.9, (x, y, z) => (y >= 0 ? INDIGO.l : tone(x, y, z, INDIGO.b, INDIGO.d, INDIGO.l, 0.1, 0.05)));
  return v;
}
function fore() {
  const v = new VoxelModel();
  rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => tone(x, y, z, INDIGO.b, INDIGO.d, INDIGO.l, 0.1, 0.05));
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) + Math.abs(z) < 4) v.set(x, -3, z, INDIGO.dd); // wide cuff
  return v;
}

// apron print: 木霊屋 in white under a little kodama mon
function apronPlane() {
  const p = new PixCanvas(28, 18, 5);
  p.circle(14, 4, 3, '#f4f2ea'); p.px(13, 4, '#2f5a46'); p.px(15, 4, '#2f5a46'); p.px(14, 0, '#9ad870');
  p.text('木霊屋', 14, 8, { font: '9px "Galmuri9"', color: '#f4f2ea', align: 'center' });
  const tex = makeTexture(p.c, { mips: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.225), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5 }));
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
  m.receiveShadow = true;
  return m;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, skin, { w: 1, claws: 0x4a4a3a }), pivot: [0.5, -0.6, 0.5] }));
  const bL = brow(), bR = mirror(bL);
  const glasses = roundGlasses({ frame: 0x8a6436, dx: 6.5, r: 4.4, temples: 12 });
  return {
    dims: { hipY: 7, hipX: 2, thigh: 3, chestY: 6, shoulderX: 5.4, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.1, neckZ: 0.6, headScale: 1.08, tail: [-2, -3], carry: [3, 6.5], shellAt: [0, 0, 0], blob: 0.72 },
    pelvis: pelvis(), torso: torso(), shell: shell(),
    thigh: thigh(), shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [],
    tail: [(() => { const v = new VoxelModel(); ell(v, 0, -0.5, -1, 1, 1, 1.6, skin); return v; })()],
    extras: [
      { joint: 'head', model: mirror(bL), scale: FV, at: [-3.25, 8.6, 6.3], name: 'browR', spring: { k: 90, damp: 0.12, amp: 0.8, idle: 0.03 } },
      { joint: 'head', model: bL, scale: FV, at: [3.25, 8.6, 6.3], name: 'browL', spring: { k: 90, damp: 0.12, amp: 0.8, idle: 0.03, phase: 1 } },
      { joint: 'head', model: mustache(), scale: FV, at: [-0.25, 3.9, 8.15], name: 'mustache', spring: { k: 140, damp: 0.2, amp: 0.25, axis: 'x', idle: 0.01 } },
      { joint: 'head', model: glasses, scale: FV, at: [0, 5.95, 6.7], name: 'glasses', shadow: false },
      { joint: 'spine', model: null, plane: apronPlane(), at: [-0.5, -1.6, 5.06], name: 'apronPrint' },
      { joint: 'pelvis', model: keyRing(), scale: FV, at: [-4.8, 0.2, 1.4], name: 'keys', spring: { k: 60, damp: 0.12, amp: 1.2, idle: 0.04 } },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 8, y: 1, h: 4, w: 6, beak: true, my: 10 },
      cfg: {
        eyeStyle: 'gloss', eyeW: 5, eyeH: 5, eyeY: 23, eyeDX: 13,
        iris: '#2a1c14', irisLight: '#7a5634', pupil: '#160c10', lash: '#24161a', lid: '#24161a',
        brow: null, browW: 0, browThick: 0, browY: 12,
        blushCol: '#f0907a', blushY: 30, blushDX: 18,
        mouthCol: '#3a2018', mouthW: 12, beak: true,
      },
    },
  };
}
