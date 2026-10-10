// Haruka, the Kodama's cabin attendant: a sika deer with soft ears that stick
// out sideways, a white chin, and the line's uniform: pink vest over a white
// blouse, a teal scarf, a pink cap with a teal brim, a name badge, a navy
// pencil skirt, and a white tail-puff.
import * as THREE from 'three';
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, FV, sh } from '../craft.js';
import { PixCanvas, makeTexture } from '../../core/pixtex.js';

const FUR = { b: 0xc8945e, d: 0xb07e4c, dd: 0x8e6038, l: 0xdcaa74 };
const WHITE = { b: 0xf8f0e2, d: 0xe6dac6 };
const NOSE = 0x2a1c1a, EAR_IN = 0xf2c4b4;
const PINK = { b: 0xe8648a, d: 0xc84c72, l: 0xf488a6 };
const TEAL = { b: 0x2a9ab0, d: 0x1e7a8e, l: 0x48b8cc };
const BLOUSE = 0xfbfaf6, NAVY = { b: 0x2e3450, d: 0x22283e }, SHOE = 0x2a2228;

const fur = (x, y, z) => tone(x, y, z, FUR.b, FUR.d, FUR.l, 0.07, 0.05);

function head() {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 11, -6, 5, 2.8, (x, y, z) => {
    if (y <= 2 && z >= 0) return tone(x, y, z, WHITE.b, WHITE.d, WHITE.b, 0.06, 0);
    if (y >= 10 && Math.abs(x + 0.5) < 1.5 && z >= 2) return FUR.d; // darker brow line
    return fur(x, y, z);
  });
  // slim muzzle with a dark nose and a white chin
  rbox(v, -3, 2, 0, 3, 6, 7, 1.0, (x, y, z) => (y <= 1 ? WHITE.b : fur(x, y, z)));
  for (let x = -2; x <= 1; x++) v.set(x, 3, 8, x === -2 ? 0x4a3a38 : NOSE);
  v.set(-1, 2, 8, NOSE); v.set(0, 2, 8, NOSE);
  // a few pale spots on the crown
  for (const [x, z] of [[-4, -3], [3, -2], [-1, -5], [4, 1], [-5, 1]]) v.set(x, 12, z, WHITE.b);
  // neat brown bob (fur) framing the face
  for (const sx of [-1, 1]) { const x = sx < 0 ? -8 : 7; for (let y = 4; y <= 10; y++) for (let z = 1; z <= 5; z++) if (!(y < 6 && z > 3)) v.set(x, y, z, y === 4 ? FUR.dd : FUR.d); }
  return v;
}
// soft deer ear sticking out sideways (left; mirrored for right)
function ear() {
  const v = new VoxelModel();
  for (let x = 0; x <= 5; x++) for (let y = -2; y <= 1; y++) {
    const w = 2 - Math.abs(x - 2.5) * 0.5;
    if (Math.abs(y + 0.5) > w) continue;
    v.set(x, y, 0, fur(x, y, 0));
    v.set(x, y, 1, x > 0 && x < 5 && Math.abs(y + 0.5) < w - 0.8 ? EAR_IN : FUR.l);
  }
  return v;
}
function cap() {
  const v = new VoxelModel();
  for (let x = -6; x <= 5; x++) for (let z = -5; z <= 4; z++) {
    const d = ((x + 0.5) / 6) ** 2 + ((z + 0.5) / 5.2) ** 2;
    if (d > 1) continue;
    v.set(x, 0, z, d > 0.8 ? TEAL.b : PINK.b); v.set(x, 1, z, PINK.b);
    if (d < 0.55) v.set(x, 2, z, PINK.l);
  }
  for (let x = -4; x <= 3; x++) for (let z = 5; z <= 7; z++) v.set(x, 0, z, z === 7 ? TEAL.d : TEAL.b); // brim
  v.set(-1, 2, 4, 0xe8c050); v.set(0, 2, 4, 0xe8c050); // badge
  return v;
}
function torso() {
  const v = new VoxelModel();
  rbox(v, -5, 4, -3, 5, -3, 3, 1.8, (x, y, z) => (z >= 3 && Math.abs(x + 0.5) < 1.4 ? BLOUSE : y >= 5 ? PINK.l : tone(x, y, z, PINK.b, PINK.d, PINK.l, 0.06, 0.05)));
  // vest V + buttons
  for (let y = 0; y <= 5; y++) for (const s of [-1, 1]) v.set(Math.round(-0.5 + s * (1 + (5 - y) * 0.35)), y, 4, PINK.d);
  v.set(-1, 1, 4, 0xe8c050); v.set(-1, -1, 4, 0xe8c050);
  // teal scarf tied at the neck, one end flared
  for (let x = -3; x <= 2; x++) v.set(x, 5, 4, TEAL.b);
  v.set(1, 4, 5, TEAL.l); v.set(2, 4, 5, TEAL.b); v.set(2, 3, 5, TEAL.d); v.set(3, 3, 5, TEAL.b);
  return v;
}
function pelvis() {
  const v = new VoxelModel();
  rbox(v, -4, 3, -4, 0, -3, 2, 1.2, (x, y, z) => (y === 0 ? NAVY.d : NAVY.b));
  return v;
}
function thigh() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, fur); return v; }
function shin() {
  const v = new VoxelModel();
  rbox(v, -1, 0, -2, 0, -1, 0, 0.5, fur);
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 2; z++) v.set(x, -3, z, SHOE);
  v.set(-1, -2, 1, SHOE); v.set(0, -2, 1, SHOE);
  return v;
}
function upper() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 1, -1, 1, 0.9, BLOUSE); return v; }
function fore() { const v = new VoxelModel(); rbox(v, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => (y === -3 ? PINK.b : BLOUSE)); return v; }
function badge() {
  const p = new PixCanvas(16, 8, 2);
  p.rect(0, 0, 16, 8, '#f8f4e8'); p.frame(0, 0, 16, 8, '#c8a040');
  p.text('はるか', 8, 1, { font: '7px "Galmuri7"', color: '#2a6a7a', align: 'center' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045), new THREE.MeshLambertMaterial({ map: makeTexture(p.c, { mips: false }), alphaTest: 0.5 }));
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
  return m;
}

export function design(def) {
  const C = [0.5, 0, 0.5];
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, fur, { w: 1, pad: FUR.dd }), pivot: C }));
  const e = ear();
  return {
    dims: { hipY: 6, hipX: 1.6, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.2, headScale: 1.08, tail: [-2, -3], tailTilt: 0.6, carry: [3, 6], blob: 0.62 },
    pelvis: pelvis(), torso: torso(),
    thigh: { model: thigh(), pivot: C }, shin: shin(),
    upper: { model: upper(), pivot: C }, fore: { model: fore(), pivot: C },
    hands,
    head: head(),
    ears: [
      { model: e, at: [6.6, 8.6, -1], side: 1, kind: 'deer', tilt: -0.25 },
      { model: mirror(e), at: [-7.6, 8.6, -1], side: -1, kind: 'deer', tilt: 0.25 },
    ],
    tail: [(() => { const v = new VoxelModel(); ell(v, 0, 0, -1, 1.6, 1.6, 1.4, WHITE.b); return v; })()],
    extras: [
      { joint: 'head', model: cap(), at: [0, 11.6, 0], rot: [-0.08, 0, 0], name: 'cap' },
      { joint: 'chest', model: null, plane: badge(), at: [2.6, -2.6, 4.06], name: 'badge' },
    ],
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: { x: -0.5, z: 8, y: 0, h: 3, w: 6, my: 2 },
      cfg: {
        eyeStyle: 'gloss', girl: true, eyeW: 6, eyeH: 7, eyeY: 21, eyeDX: 13,
        iris: '#3a2214', irisLight: '#a8703a', pupil: '#1a0e0c', lash: '#24140e', lid: '#24140e',
        brow: '#7a4a2a', browY: 12, browW: 6, browThick: 1,
        blushCol: '#ff8aa0', blushY: 28, blushDX: 17,
        mouthCol: '#4a1c22', mouthW: 8,
      },
    },
  };
}
