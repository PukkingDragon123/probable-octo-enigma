// The Bear Must Eat's pixel nature atlas (trees, bushes, ground cover, rocks,
// water plants, birds, bugs, critters) plus Kodamaya's Japanese additions
// (sakura, momiji, camphor, ginkgo, bamboo, tea bushes, hydrangea, azalea,
// susuki, higanbana), wrapped for our SpriteBatch.
//   const B = natureBatch({ max: 800, castShadow: true });
//   B.push('sakura_0', x, 0, z, { sway: 0.6 });
// Animated sprites have extra frames under 'name#i'.
import * as THREE from 'three';
import { buildNatureAtlas, NATURE_TEXELS_PER_UNIT } from './nature/natureArt.js';
import { SpriteBatch } from '../core/sprites.js';

let NAT = null;
export function natureAtlas() {
  if (NAT) return NAT;
  const a = buildNatureAtlas();
  const frames = {}, anim = {};
  for (const [k, arr] of Object.entries(a.frames)) {
    if (!arr || !arr.length) continue;
    frames[k] = arr[0];
    anim[k] = arr;
    arr.forEach((f, i) => { frames[k + '#' + i] = f; });
  }
  const t = new THREE.CanvasTexture(a.canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  NAT = { texture: t, frames, anim, canvas: a.canvas, texels: NATURE_TEXELS_PER_UNIT };
  return NAT;
}
export const NATURE_TPU = NATURE_TEXELS_PER_UNIT;
export function natureBatch(opts = {}) { return new SpriteBatch(natureAtlas(), { texels: NATURE_TEXELS_PER_UNIT, ...opts }); }
export function natureFrames(name) { return natureAtlas().anim[name] || []; }
