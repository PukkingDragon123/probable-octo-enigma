// Small helpers every location uses to turn voxel models and pixel canvases
// into meshes: lit voxel meshes (grain material, baked AO), glowing voxel
// meshes (windows, lamps, LEDs), pixel-art sign planes (lit or emissive),
// and a few fill / shape helpers on VoxelModel.
import * as THREE from 'three';
import { VoxelModel } from '../vox/voxel.js';
import { buildGeo, matFor, tone, hash3, rbox, ell } from '../vox/kit.js';
import { makeTexture } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';

export { VoxelModel, tone, hash3, rbox, ell };
export const V1 = 0.1, V5 = 0.05, V25 = 0.025;

const shc = (c, f) => { const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f)); return (r << 16) | (g << 8) | b; };
export const sh = shc;
export const mixc = (a, b, t) => { const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t), g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t); return (r << 16) | (g << 8) | bl; };
// textured colour fn: base with a few darker / lighter voxels
export const tx = (base, d = 0.12, l = 0.08) => { const D = shc(base, 0.88), L = shc(base, 1.08); return (x, y, z) => tone(x, y, z, base, D, L, d, l); };

/** lit voxel mesh (grain material, AO). pivot in voxel units. */
export function vm(model, scale = V5, pivot = [0, 0, 0], { cast = true, receive = true, grain = 0.07 } = {}) {
  if (!model || !model.vox?.size) return new THREE.Group();
  const g = buildGeo(model, pivot, scale);
  const m = new THREE.Mesh(g, matFor(g, grain));
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
/** unlit glowing voxel mesh (vertex colours, no AO) — windows, LEDs, lamp shades */
export function glowVm(model, scale = V5, pivot = [0, 0, 0], { intensity = 1.0, mode = 0, onU = null } = {}) {
  if (!model || !model.vox?.size) return new THREE.Group();
  const g = model.build({ pivot, scale, ao: false });
  const m = new THREE.Mesh(g, emitMat({ vertexColors: true, intensity, mode, onU }));
  m.castShadow = false; m.receiveShadow = false;
  return m;
}
/** a pixel canvas on a plane. w = width in metres (height from the aspect).
 *  emissive: glow amount (signs lit at night), lit: receive scene lighting */
export function signPlane(pc, w, { emissive = 0, mode = 0, onU = null, lit = true, double = false, alphaTest = 0.5 } = {}) {
  const tex = makeTexture(pc.c, { mips: false });
  const h = (w * pc.h) / pc.w;
  const geo = new THREE.PlaneGeometry(w, h);
  let mat;
  if (emissive > 0) mat = emitMat({ map: tex, intensity: emissive, mode, onU, alphaTest, side: double ? THREE.DoubleSide : THREE.FrontSide });
  else if (lit) {
    mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest, side: double ? THREE.DoubleSide : THREE.FrontSide });
  } else mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest, side: double ? THREE.DoubleSide : THREE.FrontSide });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = lit && !emissive;
  m.userData.tex = tex; m.userData.pc = pc;
  return m;
}
/** fill a voxel box (inclusive bounds, any order) */
export function fill(v, x0, x1, y0, y1, z0, z1, c) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const col = typeof c === 'function' ? c(x, y, z) : c;
    if (col === undefined) continue;
    v.set(x, y, z, col);
  }
  return v;
}
/** hollow out a box (sets null) */
export const carve = (v, x0, x1, y0, y1, z0, z1) => fill(v, x0, x1, y0, y1, z0, z1, null);
/** cylinder along y */
export function cyl(v, cx, cz, r, y0, y1, c) {
  for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++) {
    if ((x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2 > r * r) continue;
    for (let y = y0; y <= y1; y++) v.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
  }
  return v;
}
/** a group positioned at (x, y, z), rotated by yaw */
export function place(obj, x = 0, y = 0, z = 0, yaw = 0, parent = null) {
  obj.position.set(x, y, z); obj.rotation.y = yaw;
  if (parent) parent.add(obj);
  return obj;
}
/** deterministic rng */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
