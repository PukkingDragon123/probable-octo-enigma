// Yuki, 15: Bendy's waitress and the owner's daughter, a white Arctic fox with
// ice-blue eyes and freckles. Her red braided pigtails (blue ribbons) and the
// blue-and-white striped uniform with the round white collar are why the
// Bendy's sign looks like her. Frilly apron with an order pad and a pencil,
// name tag, white knee socks, red Mary-Janes, a big fluffy tail with a bow.
import * as THREE from 'three';
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh, mixc } from '../craft.js';
import { PixCanvas, makeTexture } from '../../core/pixtex.js';

const FUR = { b: 0xf4f0ea, d: 0xe2dbd4, dd: 0xc6bdb6, l: 0xfffdfa };
const CREAM = { b: 0xfff8ec, d: 0xf0e4d2 };
const EAR_IN = 0xf6c2cc, EAR_TIP = 0xcfc6c2, NOSE = 0x3a2a30, NOSE_L = 0x6a5a62;
const HAIR = { b: 0xd8452e, d: 0xb43424, dd: 0x8a2620, l: 0xf06a40, ll: 0xff9058 };
const RIB = { b: 0x3a7ad8, d: 0x2a5aac };
const BLUE = { b: 0x3d6fc4, d: 0x2f58a0, l: 0x5a8ad8 }, WHITE = { b: 0xfaf8f4, d: 0xe6e2dc };
const APRON = 0xfffdf8, APRON_D = 0xe8e2d8, BOW = 0xd8342e;
const SOCK = 0xfbfaf6, SHOE = 0xc8302a, SHOE_D = 0x8e1e1e;

const fur = (x, y, z) => tone(x, y, z, FUR.b, FUR.d, FUR.l, 0.07, 0.06);
const stripe = (x) => (((x + 40) % 3) === 0 ? BLUE.b : WHITE.b);

// ------------------------------------------------------------------ head
function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 2.6, (x, y, z) => {
    const cheek = y + Math.max(0, 2 - z) * 0.9 <= 5 && (x <= -4 || x >= 3 || z < 5);
    if (cheek && (z >= 0 || y <= 1)) return tone(x, y, z, CREAM.b, CREAM.d, CREAM.b, 0.08, 0);
    return fur(x, y, z);
  });
  // cheek tufts
  for (const s of [-1, 1]) {
    const X = (k) => (s < 0 ? -8 - k : 7 + k);
    for (let y = 1; y <= 3; y++) for (let z = 1; z <= 3; z++) if (!(y === 3 && z === 1)) v.set(X(0), y, z, CREAM.b);
    v.set(X(0), 0, 2, CREAM.d); v.set(X(1), 2, 2, CREAM.b); v.set(X(1), 1, 3, CREAM.d);
  }
  // small dainty muzzle + button nose
  for (let z = 6; z <= 8; z++) for (let x = -3; x <= 2; x++) for (let y = 0; y <= 2; y++) {
    if (z === 8 && y === 2 && (x === -3 || x === 2)) continue;
    v.set(x, y, z, y === 2 && z < 8 ? fur(x, y, z) : tone(x, y, z, CREAM.b, CREAM.d, CREAM.b, 0.06, 0));
  }
  v.set(-1, 2, 8, NOSE); v.set(0, 2, 8, NOSE); v.set(-1, 2, 9, NOSE_L); v.set(0, 2, 9, NOSE);
  // red hair on a white fox: hair swept forward from the crown into straight-cut
  // bangs, short side locks in front of the ears, and the two pigtails tied
  // with blue scrunchies at the sides (the braids hang from there)
  for (let x = -6; x <= 5; x++) for (let z = 0; z <= 5; z++) {
    const r = Math.abs(x + 0.5) / 6.5 + Math.max(0, (2 - z)) * 0.18;
    if (r > 1) continue;
    v.set(x, 12, z, x === -1 || x === 0 ? HAIR.d : z >= 3 && x < 0 ? HAIR.l : HAIR.b);
    if (z >= 4 || Math.abs(x + 0.5) > 4) v.set(x, 11, z + (z >= 5 ? 1 : 0), HAIR.b);
  }
  for (let x = -6; x <= 5; x++) {
    const len = x === -1 || x === 0 ? 1 : 2 + (x === -4 || x === 3 ? 1 : 0);
    for (let k = 0; k < len; k++) v.set(x, 11 - k, 6, k === len - 1 ? HAIR.d : k === 0 ? HAIR.l : HAIR.b);
  }
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? -8 : 7;
    for (let y = 6; y <= 11; y++) for (let z = 3; z <= 5; z++) if (!(y < 8 && z === 3)) v.set(x, y, z, y <= 7 ? HAIR.d : HAIR.b);
    // pigtail knot + scrunchie
    for (let y = 7; y <= 10; y++) for (let z = -3; z <= 0; z++) v.set(x + sx, y, z, (y === 7 || y === 10) ? HAIR.d : HAIR.b);
    for (let y = 8; y <= 9; y++) for (let z = -3; z <= 0; z++) v.set(x + 2 * sx, y, z, (z + y) % 2 ? RIB.b : RIB.d);
  }
  return v;
}
function ear(side) {
  const v = new VoxelModel();
  const rows = [[-2, 1], [-2, 1], [-2, 1], [-1, 1], [-1, 1], [0, 1], [0, 0]];
  rows.forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) for (let z = -2; z <= 0; z++) {
      if (z === -2 && (y > 3 || x === a || x === b)) continue;
      let c = fur(x, y, z);
      if (y >= 5) c = EAR_TIP;
      else if (z === 0 && x > a && x < b && y <= 4) c = EAR_IN;
      v.set(side < 0 ? -1 - x : x, y, z, c);
    }
  });
  return v;
}
// a braided pigtail (fine voxels): knots down to a blue ribbon and a tuft
function braid() {
  const v = new VoxelModel();
  for (let k = 0; k < 3; k++) {
    const y0 = -k * 4;
    ell(v, 0, y0 - 1.5, 0, 2.4, 2.2, 2.2, (x, y, z) => (y > y0 - 1 ? HAIR.l : y < y0 - 2.5 ? HAIR.d : HAIR.b));
    v.set(-1, y0 - 3, 1, HAIR.dd); v.set(0, y0 - 2, 2, HAIR.dd);
  }
  // ribbon bow
  for (const s of [-1, 1]) { ell(v, s * 2.6, -13, 0, 1.8, 1.4, 1, RIB.b); v.set(s * 3, -14, 0, RIB.d); }
  v.set(0, -13, 1, RIB.d); v.set(-1, -13, 1, RIB.d);
  // tuft
  ell(v, 0, -16.5, 0, 2.0, 2.4, 1.8, (x, y, z) => (y < -17 ? HAIR.d : HAIR.b));
  return v;
}

// ------------------------------------------------------------------ torso: striped dress, collar, apron
function torso() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 5, -3, 3, 1.8, (x, y, z) => (y >= 5 ? sh(stripe(x), 1.04) : stripe(x)));
  // round white collar with a red bow
  for (let x = -5; x <= 4; x++) for (let z = -3; z <= 4; z++) {
    if (Math.abs(x + 0.5) < 2.6 && z > -2 && z < 3) continue;
    const front = z >= 3;
    v.set(x, 5, z, WHITE.b);
    if (front && Math.abs(x + 0.5) > 1.2) v.set(x, 4, z + (z >= 4 ? 0 : 1), WHITE.b);
  }
  v.set(-1, 4, 4, BOW); v.set(0, 4, 4, BOW); v.set(-2, 4, 4, BOW); v.set(1, 4, 4, BOW); v.set(-1, 3, 4, sh(BOW, 0.8)); v.set(0, 3, 4, sh(BOW, 0.8));
  // apron bib: waist up to the chest, frilly top edge, a pocket with the order pad and pencil
  for (let x = -3; x <= 2; x++) for (let y = -3; y <= 1; y++) v.set(x, y, 4, y === 1 && (x & 1) ? APRON_D : APRON);
  for (let x = -5; x <= 4; x++) v.set(x, -3, 4, APRON_D); // waist band
  v.set(-3, -2, 5, 0xffffff); v.set(-2, -2, 5, 0xffffff); v.set(-3, -1, 5, 0xffffff); v.set(-2, -1, 5, 0xe8e4dc); // pad
  v.set(2, -1, 5, 0xe8b020); v.set(2, 0, 5, 0xe8b020); v.set(2, 1, 5, 0xffc8c8); // pencil
  // apron strings tied at the back
  v.set(-1, -3, -4, APRON); v.set(0, -3, -4, APRON); v.set(-2, -4, -4, APRON); v.set(1, -4, -4, APRON);
  return v;
}
// flared skirt (stripes) with the apron's frilly front
function pelvis() {
  const v = new VoxelModel();
  for (let y = -4; y <= 0; y++) {
    const f = (-y) * 0.45;
    for (let x = Math.floor(-5 - f); x <= Math.ceil(4 + f); x++) for (let z = Math.floor(-4 - f * 0.8); z <= Math.ceil(3 + f * 0.8); z++) {
      const dx = (x + 0.5) / (5 + f), dz = (z + 0.5) / (3.6 + f * 0.8);
      if (dx * dx + dz * dz > 1.05) continue;
      if (dx * dx + dz * dz < 0.55 && y > -4) continue; // hollow
      let c = stripe(x);
      if (y === -4) c = (x & 1) ? WHITE.d : BLUE.d; // hem
      if (z >= 2 && Math.abs(x + 0.5) < 3.5 + f * 0.4 && y > -4) c = y === -3 && (x & 1) ? APRON_D : APRON; // apron front + frill
      v.set(x, y, z, c);
    }
  }
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, fur); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, (x, y, z) => (y === 0 ? RIB.b : SOCK));
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 2; z++) { v.set(x, -3, z, z === 2 ? SHOE_D : SHOE); }
  v.set(-1, -2, 1, SHOE_D); v.set(0, -2, 1, SHOE_D); // strap
  return v;
}
function upper() {
  const v = new VoxelModel();
  // puffy short sleeve
  ell(v, 0.5, -0.5, 0.5, 2.0, 2.0, 2.0, (x, y, z) => (y <= -2 ? BLUE.b : WHITE.b));
  rbox(v, -1, 1, -3, -1, -1, 1, 0.8, fur);
  return v;
}
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, fur); return v; }
function tailSeg(r, cream, bow) {
  const v = new VoxelModel();
  ell(v, 0, 0, -r, r, r * 0.92, r + 0.8, (x, y, z) => (cream ? tone(x, y, z, CREAM.b, CREAM.d, CREAM.b, 0.1, 0) : y > r * 0.3 ? FUR.l : y < -r * 0.4 ? FUR.d : fur(x, y, z)));
  if (bow) { for (const s of [-1, 1]) { v.set(s * 2, Math.round(r) , -1, RIB.b); v.set(s * 3, Math.round(r), -1, RIB.b); v.set(s * 2, Math.round(r) + 1, -1, RIB.d); } v.set(0, Math.round(r), -1, RIB.d); }
  return v;
}
function nameTag(text) {
  const p = new PixCanvas(20, 8, 3);
  p.rect(0, 0, 20, 8, '#f8f4e8'); p.frame(0, 0, 20, 8, '#c8a040');
  p.text(text, 10, 1, { font: '7px "Galmuri7"', color: '#d8342e', align: 'center' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.044), new THREE.MeshLambertMaterial({ map: makeTexture(p.c, { mips: false }), alphaTest: 0.5 }));
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
  return m;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, fur, { w: 1, pad: 0xe8c8cc }), pivot: C }));
  const br = braid();
  return {
    dims: { hipY: 6, hipX: 1.8, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.2, headScale: 1.1, tail: [-3, -3.5], tailTilt: 0.85, carry: [3, 6], blob: 0.62 },
    pelvis: pelvis(), torso: torso(),
    thigh: { model: thigh(), pivot: C }, shin: { model: shin(), pivot: [0, 0, 0] },
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [
      { model: ear(1), at: [3.6, 11, -1.2], side: 1, kind: 'fox', tilt: -0.22 },
      { model: ear(-1), at: [-3.6, 11, -1.2], side: -1, kind: 'fox', tilt: 0.22 },
    ],
    tail: [tailSeg(1.8), tailSeg(2.5), tailSeg(2.6, false, true), tailSeg(2.1, true)],
    extras: [
      { joint: 'head', model: br, scale: FV, at: [-10.2, 8.4, -1.5], rot: [0.1, 0, 0.45], name: 'braidR', spring: { k: 45, damp: 0.1, amp: 1.3, idle: 0.04 } },
      { joint: 'head', model: mirror(br), scale: FV, at: [9.7, 8.4, -1.5], rot: [0.1, 0, -0.45], name: 'braidL', spring: { k: 45, damp: 0.1, amp: 1.3, idle: 0.04, phase: 1.3 } },
      { joint: 'chest', model: null, plane: nameTag('YUKI'), at: [-3.0, -2.3, 4.08], name: 'tag' },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 9, y: 0, h: 3, w: 6, my: 1 },
      cfg: {
        eyeStyle: 'gloss', girl: true, eyeW: 6, eyeH: 7, eyeY: 22, eyeDX: 13,
        iris: '#1e3a6a', irisLight: '#5aa8f0', pupil: '#121a2e', lash: '#2a1620', lid: '#2a1620',
        brow: '#c84a30', browY: 13, browW: 6, browThick: 1,
        blushCol: '#ff9ab0', blushY: 29, blushDX: 17, freckles: true,
        mouthCol: '#4a1c2a', mouthW: 10,
      },
    },
  };
}
