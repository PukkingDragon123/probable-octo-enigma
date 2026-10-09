// Bendo, 58: founder of Bendy's (the burger diner on Kodama Ginza), Yuki's
// dad. A big, round silver fox with bushy grey brows, a grey mustache and
// rosy cheeks; short-sleeved white dress shirt with a red tie and a gold clip,
// a long white apron with ketchup and mustard spots, pens in the breast
// pocket, a paper diner cap and a pencil tucked behind one ear.
import * as THREE from 'three';
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh } from '../craft.js';
import { PixCanvas, makeTexture } from '../../core/pixtex.js';

const FUR = { b: 0x4e4e5c, d: 0x40404c, dd: 0x32323c, l: 0x62626e };
const WHITEF = { b: 0xdcdce4, d: 0xc4c4ce };
const NOSE = 0x1e1a20, NOSE_L = 0x4a4250, EAR_IN = 0xc8a0a8;
const GREY = { b: 0xd4d4dc, d: 0xb4b4c0, l: 0xf0f0f4 };
const SHIRT = { b: 0xf6f6f2, d: 0xe0e2e6, l: 0xffffff };
const TIE = { b: 0xd0342c, d: 0xa42420, l: 0xe8564a };
const GOLD = 0xe8c050;
const APRON = { b: 0xfdfcf8, d: 0xe6e4de };
const TROUSER = { b: 0x3c3c48, d: 0x2e2e38, l: 0x4c4c5a };
const SHOE = 0x2a2226, BELT = 0x5a3a24;
const KETCHUP = 0xd8342e, MUSTARD = 0xf0c030;

const fur = (x, y, z) => tone(x, y, z, FUR.b, FUR.d, FUR.l, 0.08, 0.06);

function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 2.8, (x, y, z) => {
    const cheek = y + Math.max(0, 2 - z) * 0.9 <= 5 && (x <= -4 || x >= 3 || z < 5);
    if (cheek && (z >= 0 || y <= 1)) return tone(x, y, z, WHITEF.b, WHITEF.d, WHITEF.b, 0.08, 0);
    if (y >= 10 && z <= -2) return tone(x, y, z, FUR.d, FUR.dd, FUR.b, 0.1, 0.05);
    return fur(x, y, z);
  });
  // big fluffy cheek ruffs
  for (const s of [-1, 1]) {
    const X = (k) => (s < 0 ? -8 - k : 7 + k);
    for (let y = 0; y <= 4; y++) for (let z = 0; z <= 3; z++) if (!(y === 4 && z === 0)) v.set(X(0), y, z, y >= 3 ? WHITEF.b : WHITEF.d);
    v.set(X(1), 1, 2, WHITEF.b); v.set(X(1), 2, 1, WHITEF.d); v.set(X(1), 0, 3, WHITEF.d);
  }
  // muzzle (broad) + big nose
  for (let z = 6; z <= 8; z++) for (let x = -3; x <= 2; x++) for (let y = 0; y <= 3; y++) {
    if (z === 8 && y === 3 && (x === -3 || x === 2)) continue;
    v.set(x, y, z, y === 3 && z < 8 ? fur(x, y, z) : tone(x, y, z, WHITEF.b, WHITEF.d, WHITEF.b, 0.06, 0));
  }
  for (let x = -2; x <= 1; x++) v.set(x, 3, 9, NOSE);
  v.set(-1, 3, 9, NOSE_L);
  v.set(-1, 2, 9, NOSE); v.set(0, 2, 9, NOSE);
  return v;
}
function ear(side) {
  const v = new VoxelModel();
  const rows = [[-2, 1], [-2, 1], [-2, 1], [-1, 1], [-1, 0]];
  rows.forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) for (let z = -2; z <= 0; z++) {
      if (z === -2 && (y > 2 || x === a || x === b)) continue;
      let c = fur(x, y, z);
      if (y >= 4) c = GREY.b;
      else if (z === 0 && x > a && x < b && y <= 3) c = EAR_IN;
      v.set(side < 0 ? -1 - x : x, y, z, c);
    }
  });
  return v;
}
// grey bushy brow (fine voxels)
function brow() {
  const v = new VoxelModel();
  ell(v, 0, 0, 0, 5, 2, 1.6, (x, y, z) => (y >= 1 ? GREY.l : y <= -1 ? GREY.d : GREY.b));
  ell(v, 4.4, -1.2, 0.3, 2, 1.6, 1.2, GREY.b);
  return v;
}
function mustache() {
  const v = new VoxelModel();
  for (const s of [-1, 1]) ell(v, s * 3.8, -1, 0.5, 4.4, 2.2, 1.6, (x, y, z) => (y >= 0 ? GREY.l : y <= -2 ? GREY.d : GREY.b));
  return v;
}
// paper diner cap: a boat-shaped garrison cap, white with a red band
function cap() {
  const v = new VoxelModel();
  for (let z = -6; z <= 5; z++) for (let x = -5; x <= 4; x++) {
    const ez = Math.abs(z + 0.5) / 6.2, ex = Math.abs(x + 0.5) / 5;
    if (ex > 1 || ez > 1) continue;
    const h = Math.round((1 - ez * ez) * 3.4 * (1 - ex * 0.35));
    for (let y = 0; y <= h; y++) {
      const ridge = Math.abs(x + 0.5) < 0.8 && y === h;
      v.set(x, y, z, y === 1 ? TIE.b : ridge ? SHIRT.d : y === 0 ? SHIRT.d : SHIRT.b);
    }
  }
  return v;
}
function torso() {
  const v = new VoxelModel();
  rbox(v, -6, 5, -3, 6, -4, 3, 2.2, (x, y, z) => (y >= 6 ? SHIRT.l : tone(x, y, z, SHIRT.b, SHIRT.d, SHIRT.l, 0.08, 0.06)));
  ell(v, -0.5, 1.5, 2.6, 5.2, 4.6, 2.8, (x, y, z) => tone(x, y, z, SHIRT.b, SHIRT.d, SHIRT.l, 0.08, 0.05)); // belly
  // collar points + red tie with a gold clip
  v.set(-2, 6, 4, SHIRT.l); v.set(1, 6, 4, SHIRT.l); v.set(-2, 5, 5, SHIRT.d); v.set(1, 5, 5, SHIRT.d);
  for (let y = 0; y <= 6; y++) { const w = y >= 5 ? 1 : y <= 1 ? 1 : 0; for (let x = -1 - w; x <= w; x++) v.set(x, y, 5 + (y < 3 ? 1 : 0), y === 6 ? TIE.d : x === -1 - w ? TIE.d : TIE.b); }
  v.set(-1, 3, 6, GOLD); v.set(0, 3, 6, GOLD); v.set(-2, 3, 6, GOLD); v.set(1, 3, 6, GOLD);
  // breast pocket with pens
  for (let x = 2; x <= 4; x++) for (let y = 2; y <= 3; y++) v.set(x, y, 5, y === 3 ? SHIRT.d : SHIRT.b);
  v.set(2, 4, 5, 0x3a6ad8); v.set(3, 4, 5, TIE.b); v.set(4, 4, 4, 0x2a2a30);
  // apron: from the chest down, with neck strap, spots of ketchup and mustard
  for (let x = -4; x <= 3; x++) for (let y = -3; y <= 2; y++) {
    const z = 7 - Math.round(Math.max(0, (Math.abs(x + 0.5) - 2) * 0.6)) - (y < 0 ? 0 : 0);
    v.set(x, y, z - 1, y === 2 ? APRON.d : APRON.b);
  }
  for (const [x, y, c] of [[-2, 0, KETCHUP], [2, -2, MUSTARD], [-3, -2, KETCHUP], [1, 1, MUSTARD]]) v.set(x, y, 7 - (Math.abs(x + 0.5) > 2 ? 1 : 0) - 1, c);
  for (const x of [-4, 3]) for (let y = 3; y <= 6; y++) v.set(x, y, 4, APRON.d); // neck strap
  return v;
}
function pelvis() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 0, -3, 3, 1.4, (x, y, z) => (y === 0 ? BELT : tone(x, y, z, TROUSER.b, TROUSER.d, TROUSER.l, 0.08, 0.05)));
  v.set(-1, 0, 4, GOLD); v.set(0, 0, 4, GOLD);
  // the apron skirt continues down the front to the knees
  for (let x = -4; x <= 3; x++) for (let y = -5; y <= -1; y++) v.set(x, y, 4, y === -5 ? APRON.d : APRON.b);
  v.set(-2, -3, 4, KETCHUP); v.set(1, -4, 4, MUSTARD);
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -2, 1, -3, 0, -2, 1, 1.0, (x, y, z) => tone(x, y, z, TROUSER.b, TROUSER.d, TROUSER.l, 0.08, 0.05)); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -2, 1, -2, 0, -2, 1, 0.8, (x, y, z) => tone(x, y, z, TROUSER.b, TROUSER.d, TROUSER.l, 0.08, 0.05));
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) v.set(x, -3, z, z === 3 ? sh(SHOE, 1.4) : SHOE);
  return v;
}
function upper() {
  const v = new VoxelModel();
  rbox(v, -2, 2, -2, 1, -2, 2, 1.4, (x, y, z) => (y === -2 ? SHIRT.d : SHIRT.b)); // short sleeve
  rbox(v, -1, 1, -3, -2, -1, 1, 0.8, fur);
  return v;
}
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, fur); return v; }
function tailSeg(r, tip) {
  const v = new VoxelModel();
  ell(v, 0, 0, -r, r, r * 0.92, r + 0.8, (x, y, z) => (tip ? tone(x, y, z, WHITEF.b, WHITEF.d, WHITEF.b, 0.1, 0) : y > r * 0.3 ? FUR.l : y < -r * 0.4 ? FUR.d : fur(x, y, z)));
  return v;
}
function nameTag(text) {
  const p = new PixCanvas(22, 8, 3);
  p.rect(0, 0, 22, 8, '#f8f4e8'); p.frame(0, 0, 22, 8, '#c8a040');
  p.text(text, 11, 1, { font: '7px "Galmuri7"', color: '#d8342e', align: 'center' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.044), new THREE.MeshLambertMaterial({ map: makeTexture(p.c, { mips: false }), alphaTest: 0.5 }));
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
  return m;
}
function pencil() { const v = new VoxelModel(); for (let z = 0; z <= 9; z++) v.set(0, 0, z, z >= 8 ? 0xf0b8b0 : z === 0 ? 0x3a3a3a : 0xf0c030); v.set(0, 0, -1, 0xe8c8a0); return v; }

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, fur, { w: 1, pad: 0x6a5a62 }), pivot: C }));
  const b = brow();
  return {
    dims: { hipY: 6, hipX: 2.4, thigh: 3, chestY: 6.5, shoulderX: 6.6, shoulderY: -1.6, upper: 3, fore: 3, grip: 2.4, neckY: 0.4, neckZ: 0.2, headScale: 1.05, tail: [-2, -3.5], tailTilt: 0.7, carry: [3, 8], blob: 0.85 },
    pelvis: pelvis(), torso: torso(),
    thigh: thigh(), shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [
      { model: ear(1), at: [3.6, 11, -1.4], side: 1, kind: 'fox', tilt: -0.3 },
      { model: ear(-1), at: [-3.6, 11, -1.4], side: -1, kind: 'fox', tilt: 0.3 },
    ],
    tail: [tailSeg(2.4), tailSeg(3.2), tailSeg(3.2), tailSeg(2.6, true)],
    extras: [
      { joint: 'head', model: mirror(b), scale: FV, at: [-3.25, 8.4, 6.3], name: 'browR', spring: { k: 100, damp: 0.14, amp: 0.6, idle: 0.02 } },
      { joint: 'head', model: b, scale: FV, at: [3.25, 8.4, 6.3], name: 'browL', spring: { k: 100, damp: 0.14, amp: 0.6, idle: 0.02, phase: 1 } },
      { joint: 'head', model: mustache(), scale: FV, at: [-0.25, 2.2, 9.1], name: 'mustache' },
      { joint: 'head', model: cap(), at: [0, 11.6, -0.4], rot: [-0.12, 0, 0.08], name: 'cap' },
      { joint: 'head', model: pencil(), scale: FV, at: [7.4, 9.6, -2], rot: [0.3, 0, -0.2], name: 'pencil' },
      { joint: 'chest', model: null, plane: nameTag('BENDO'), at: [-3.2, -3.4, 5.06], name: 'tag' },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 9, y: 0, h: 3, w: 6, my: 2 },
      cfg: {
        eyeStyle: 'gloss', eyeW: 5, eyeH: 6, eyeY: 23, eyeDX: 13,
        iris: '#2a1c14', irisLight: '#7a5a3a', pupil: '#160c10', lash: '#24161a', lid: '#24161a',
        brow: null, browW: 0, browThick: 0,
        blushCol: '#ff8a8a', blushY: 29, blushDX: 18,
        mouthCol: '#3a1a22', mouthW: 10,
      },
    },
  };
}
