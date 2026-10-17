// Water and hot springs for the Spirit Realm.
//   magicWater(rx, rz, o)  an elliptical pool with a shader: clear shallows
//                          fading to deep blue, drifting ripple lines, sun
//                          glints and sparkles (or milky, glowing onsen water)
//   rotenburo(r)           an open-air hot spring: a ring of mossy boulders, a
//                          cedar deck, a little shingled pavilion, a bamboo
//                          screen, a bamboo spout pouring in, buckets, stools,
//                          a lantern and the ゆ curtain
//   irisPond(rx, rz)       a small pond ringed with irises, and a red arched bridge
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, tone, sh, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { FONT } from '../ui/fonts.js';

const WATER_FRAG = /* glsl */ `
uniform float time, milky, glow;
uniform vec3 shallow, deep, foam;
varying vec2 vUv;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  float r = length(vUv - 0.5) * 2.0;           // 0 centre .. 1 rim
  float b = bayer4(gl_FragCoord.xy);
  float d = floor(smoothstep(1.0, 0.15, r) * 5.0 + b) / 5.0;
  vec3 c = mix(shallow, deep, d);
  // ripple lines drifting across, broken up by noise
  vec2 p = vW.xz * 3.2;
  float rip = step(0.93, fract(p.y * 0.7 + noise(p * 0.5 + time * 0.25) * 2.0 + time * 0.12)) * step(0.45, noise(p * 0.8 - time * 0.2));
  c = mix(c, foam, rip * 0.45);
  // foam at the rim, glints and sparkles
  c = mix(c, foam, step(0.9, r) * step(b, 0.6) * 0.8);
  float sp = step(0.985, hash(floor(vW.xz * 18.0) + floor(time * 4.0)));
  c += vec3(1.0, 0.98, 0.9) * sp * 0.8;
  // milky onsen water: soft and glowing, steaming swirls
  float sw = noise(vW.xz * 4.0 + vec2(time * 0.3, -time * 0.2));
  c = mix(c, mix(shallow, vec3(0.86, 0.97, 0.95), 0.45) * (0.88 + sw * 0.18), milky * 0.6);
  gl_FragColor = vec4(c * (1.0 + glow * (0.15 + 0.15 * sw)), 0.92);
}
`;
export function magicWater(rx, rz, { shallow = '#7ad8d0', deep = '#2a5a9a', foam = '#e8fffa', milky = 0, glow = 0, segs = 40 } = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: WATER_FRAG, transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, milky: { value: milky }, glow: { value: glow }, shallow: { value: new THREE.Color(shallow) }, deep: { value: new THREE.Color(deep) }, foam: { value: new THREE.Color(foam) } },
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, segs), mat);
  m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.renderOrder = 3;
  m.userData.update = (dt, t) => { mat.uniforms.time.value = t; };
  return m;
}

// ---------------------------------------------------------------- the open-air bath
const STONE = [0x7a766e, 0x8a867e, 0x9a958c, 0x6a6660];
const MOSS = [0x4a7a3a, 0x5a8a42, 0x6a9a4a];
function boulder(v, cx, cz, rx, ry, rz, seed) {
  for (let x = -rx; x <= rx; x++) for (let y = 0; y <= ry; y++) for (let z = -rz; z <= rz; z++) {
    const n = hash3(x + seed, y, z) * 0.25;
    if ((x / (rx + 0.5)) ** 2 + (y / (ry + 0.5)) ** 2 + (z / (rz + 0.5)) ** 2 > 1 - n * 0.4) continue;
    const top = y >= ry - 1;
    v.set(cx + x, y, cz + z, top && hash3(x, seed, z) < 0.5 ? MOSS[(x + z + 9) % 3] : STONE[Math.floor(hash3(x, y, z + seed) * 4)]);
  }
}
export function rotenburo(r = 1.3, { onU = null } = {}) {
  const g = new THREE.Group();
  const v = new VoxelModel();
  const R = Math.round(r / V5);
  // a ring of boulders (big and small, some mossy), the bath floor below
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + hash3(k, 1, 1) * 0.2;
    const big = hash3(k, 2, 2) < 0.4;
    boulder(v, Math.round(Math.cos(a) * (R + 2)), Math.round(Math.sin(a) * (R + 2)), big ? 5 : 3, big ? 6 : 4, big ? 4 : 3, k * 7);
  }
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) if (Math.hypot(x, z) < R) v.set(x, -3, z, 0x5a6a6a);
  g.add(vm(v, V5, [0.5, 0, 0.5]));
  // the cedar deck to the back with the pavilion
  const d = new VoxelModel();
  for (let x = -R - 6; x <= R + 6; x++) for (let z = -R - 20; z <= -R - 4; z++) d.set(x, 2, z, (z % 4 === 0) ? 0x7a4e2c : (x + z) % 9 === 0 ? 0xa8743e : 0x946640);
  for (const x of [-R - 6, R + 6]) for (const z of [-R - 20, -R - 5]) fill(d, x, x + 1, 0, 1, z, z + 1, 0x5a3a22);
  // the pavilion: four posts and a shingled hip roof
  const px0 = -12, px1 = 11, pz0 = -R - 19, pz1 = -R - 6;
  for (const x of [px0, px1]) for (const z of [pz0, pz1]) fill(d, x, x + 1, 3, 40, z, z + 1, 0x4a2e1c);
  for (let k = 0; k < 10; k++) for (let x = px0 - 5 + k; x <= px1 + 5 - k; x++) for (let z = pz0 - 5 + k; z <= pz1 + 5 - k; z++) {
    const edge = x === px0 - 5 + k || x === px1 + 5 - k || z === pz0 - 5 + k || z === pz1 + 5 - k;
    if (edge || k === 9) d.set(x, 41 + k, z, (x + z + k) % 3 === 0 ? 0x5a4a3a : k % 2 ? 0x6e5a44 : 0x7a6650);
  }
  fill(d, -2, 1, 51, 53, pz0 + 4, pz1 - 4, 0x3a2e24);
  // a bamboo screen behind
  for (let x = -R - 8; x <= R + 8; x++) for (let y = 3; y < 34; y++) { if (x % 2 === 0) d.set(x, y, -R - 22, y % 9 === 0 ? 0x8a9a4a : 0x9ab05a); else if (y % 11 === 5) d.set(x, y, -R - 22, 0x5a3a22); }
  g.add(vm(d, V5, [0.5, 0, 0.5]));
  // the bamboo spout pouring into the bath, a stream of water
  const sp = new VoxelModel();
  for (let y = 0; y < 26; y++) sp.set(0, y, 0, y % 6 === 0 ? 0x7a8a3a : 0x9ab05a);
  for (let z = 0; z < 14; z++) sp.set(0, 25 - Math.floor(z / 5), z, z % 6 === 0 ? 0x7a8a3a : 0x9ab05a);
  const spm = vm(sp, V5, [0.5, 0, 0.5]); spm.position.set(R * V5 * 0.55, 0, -R * V5 * 0.95); g.add(spm);
  const stream = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 0.03), emitMat({ color: 0xd8f8ff, intensity: 1.2 }));
  stream.position.set(R * V5 * 0.55, 0.62, -R * V5 * 0.95 + 0.68); g.add(stream);
  // the water itself (milky, glowing)
  const w = magicWater(r, r, { shallow: '#6ad8d0', deep: '#2a8aa8', milky: 0.55, glow: 0.2 }); w.position.y = 0.06; g.add(w);
  g.userData.water = w;
  // buckets and stools on the deck, a lantern, the ゆ curtain
  const bs = new VoxelModel();
  for (const [bx, bz] of [[-8, -R - 9], [-3, -R - 10]]) { for (let y = 0; y < 5; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const dd = Math.hypot(x, z); if (dd <= 3 && (dd > 2 || y === 0)) bs.set(bx + x, 3 + y, bz + z, y === 2 ? 0x4a3a2a : 0xc89a5a); } }
  for (const [sx, sz] of [[6, -R - 10], [9, -R - 14]]) rbox(bs, sx - 2, sx + 2, 3, 6, sz - 2, sz + 2, 1, 0xa8743e);
  g.add(vm(bs, V5, [0.5, 0, 0.5]));
  const yu = new PixCanvas(28, 30, 5301);
  yu.rect(0, 0, 28, 30, '#2a4a8a'); for (let k = 0; k < 3; k++) yu.rect(k * 9 + 8, 0, 1, 30, '#1a3270');
  yu.text('ゆ', 14, 6, { font: `16px ${FONT.brush}`, color: '#ffffff', align: 'center' });
  const nr = signPlane(yu, 0.55, { double: true }); nr.position.set(0, 1.6, (pz1 + 1) * V5); g.add(nr);
  return g;
}

// ---------------------------------------------------------------- a little iris pond and a red arched bridge
export function irisPond(rx = 1.0, rz = 0.6) {
  const g = new THREE.Group();
  const w = magicWater(rx, rz, { shallow: '#8ad8c8', deep: '#3a7aa8' }); w.position.y = 0.035; g.add(w);
  const v = new VoxelModel();
  const RX = Math.round(rx / V25), RZ = Math.round(rz / V25);
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * (RX + 2)), z = Math.round(Math.sin(a) * (RZ + 2));
    if (Math.abs(x) < 6 && z < 0) continue; // under the bridge
    const L = 8 + Math.floor(hash3(k, 1, 4) * 8);
    for (let y = 0; y < L; y++) v.set(x, y, z, 0x3a7a3a); v.set(x + 1, L - 3, z, 0x4a8a3a);
    if (k % 2 === 0) { const c = k % 4 ? 0x7a5ad8 : 0xb8a0ff; v.set(x, L, z, c); v.set(x - 1, L - 1, z, c); v.set(x + 1, L - 1, z, c); v.set(x, L + 1, z, 0xffe060); }
  }
  g.add(vm(v, V25, [0.5, 0, 0.5]));
  // the taikobashi: a round-backed red bridge across the narrow end
  const b = new VoxelModel();
  const L = Math.round((rx * 1.2) / V25);
  for (let x = -L; x <= L; x++) {
    const y = Math.round(Math.cos((x / L) * Math.PI / 2) * 8);
    for (let z = -4; z <= 4; z++) b.set(x, y, z, (x + 40) % 3 === 0 ? 0x8a3a2a : 0xa84a32);
    for (const z of [-5, 5]) { b.set(x, y + 4, z, 0xd8402a); if (x % 4 === 0) for (let k = 1; k < 4; k++) b.set(x, y + k, z, 0xd8402a); }
  }
  for (const x of [-L, L]) for (const z of [-5, 5]) for (let k = 0; k < 6; k++) b.set(x, k, z, 0xd8402a);
  const bm = vm(b, V25, [0.5, 0, 0.5]); bm.position.set(0, 0, -rz * 0.55); bm.rotation.y = Math.PI / 2; g.add(bm);
  g.userData.water = w;
  return g;
}
