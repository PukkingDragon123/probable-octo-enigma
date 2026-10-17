// The Spirit Realm's look: organic floating islands, the nebula void they
// float over, luminous drifting clouds, and the living magic in the air —
// will-o'-wisps, hitodama souls rising out of the deep, glowing butterflies,
// fireflies over the water, sparkles off the flowers, sakura petals.
//
//   S.add(organicIsland(shape, { pond, seed }))
//   S.add(nebulaVoid()); S.add(dreamClouds())
//   const air = new SpiritAir(scene, shape, { flowers, water }); air.update(dt, t, camera)
import * as THREE from 'three';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { litMat, emitMat } from '../core/materials.js';
import { fbm2, hash2 } from '../core/util.js';

const smooth = (t) => t * t * (3 - 2 * t);
const C = (hex) => new THREE.Color(hex);

// ---------------------------------------------------------------- the grass tile (pixel art, 64 texels per metre)
let GRASS = null;
function grassTexture() {
  if (GRASS) return GRASS;
  const S = 256, p = new PixCanvas(S, S, 7100);
  // big soft meadow patches (deep to sunlit), then a fine salt-and-pepper of
  // neighbouring shades so it never reads as flat paint
  const PAL = ['#3c7a36', '#468636', '#50923c', '#5c9e40', '#68aa46', '#76b44c', '#84be54'];
  p.noiseFill(PAL, { scale: 0.03, octaves: 3, contrast: 1.25 });
  const W = (x, y, c) => p.px(((x % S) + S) % S, ((y % S) + S) % S, c);
  const r = () => p.rnd();
  for (let i = 0; i < 5200; i++) W(Math.floor(r() * S), Math.floor(r() * S), PAL[Math.floor(r() * PAL.length)]);
  // clumps of blades: dark root, mid shaft, a sunlit tip
  const BL = [['#2f6a2e', '#4a8a38', '#8ec85a'], ['#356e30', '#56963e', '#9ad266'], ['#2c6036', '#4a8a46', '#a8dc72'], ['#3a7a2c', '#62a040', '#b8e07a']];
  for (let c = 0; c < 340; c++) {
    const cx = r() * S, cy = r() * S, n = 4 + Math.floor(r() * 7), pal = BL[Math.floor(r() * BL.length)];
    for (let k = 0; k < n; k++) {
      const x = Math.floor(cx + (r() - 0.5) * 9), y = Math.floor(cy + (r() - 0.5) * 6), h = 2 + Math.floor(r() * 3), lean = r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0;
      W(x, y, pal[0]);
      for (let j = 1; j < h; j++) W(x + (j === h - 1 ? lean : 0), y - j, j === h - 1 ? pal[2] : pal[1]);
    }
  }
  // clover: three round leaves, a few with white flower balls
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * S), y = Math.floor(r() * S);
    for (const [dx, dy] of [[0, 0], [2, 0], [1, -2]]) { W(x + dx, y + dy, '#3e8a3a'); W(x + dx + 1, y + dy, '#4e9c44'); W(x + dx, y + dy - 1, '#62b050'); }
    if (i % 3 === 0) { W(x + 1, y - 4, '#f8f4ec'); W(x, y - 4, '#ece4ec'); W(x + 2, y - 4, '#ffffff'); W(x + 1, y - 5, '#ffffff'); W(x + 1, y - 3, '#f0c8d8'); }
  }
  // wildflowers in little drifts: white, butter yellow, pink, lilac, sky blue
  const FL = [['#ffffff', '#f0d8e0'], ['#fff07a', '#e8b030'], ['#ffb0d0', '#e870a0'], ['#d8b8ff', '#9a78e0'], ['#a8d8ff', '#5a98e8']];
  for (let d = 0; d < 34; d++) {
    const cx = r() * S, cy = r() * S, f = FL[d % FL.length], n = 3 + Math.floor(r() * 6);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(cx + (r() - 0.5) * 14), y = Math.floor(cy + (r() - 0.5) * 9);
      W(x, y + 1, '#3a7a30');
      if (k % 2) { W(x, y, f[0]); W(x - 1, y, f[1]); W(x + 1, y, f[1]); W(x, y - 1, f[0]); W(x, y + 0, '#ffe860'); }
      else { W(x, y, f[0]); W(x + 1, y, f[1]); }
    }
  }
  // a few drifted petals and sun-flecks
  for (let i = 0; i < 70; i++) W(Math.floor(r() * S), Math.floor(r() * S), i % 2 ? '#ffd0e4' : '#c8f08a');
  const t = new THREE.CanvasTexture(p.c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  GRASS = t;
  return t;
}

// ---------------------------------------------------------------- organic floating island
// S: islandShape(). The top is a smooth, gently undulating meadow (flat where
// things stand); a mossy lip rolls over the edge into an earth band, then rock
// strata that taper, bulging and folding, to a point far below. Glowing
// crystals stud the rock; roots and vines hang from the rim.
export function organicIsland(S, { pond = null, seed = 3, rings = 26, segs = 200, rock = null } = {}) {
  const g = new THREE.Group();
  const R = rock || ['#8e7e72', '#7c6c66', '#9c8a7c', '#6e6278', '#5a4e70', '#4a3e66'];
  // the outline: march out along each direction until we leave the shape
  const edgeT = new Float32Array(segs);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    let t = 0.2;
    while (t < 1.8 && S.inside(S.cx + Math.cos(a) * S.rx * t, S.cz + Math.sin(a) * S.rz * t)) t += 0.004;
    edgeT[i] = t;
  }
  const P = (i, t) => { const a = (i / segs) * Math.PI * 2; return [S.cx + Math.cos(a) * S.rx * t, S.cz + Math.sin(a) * S.rz * t]; };
  const pondK = (x, z) => (pond ? ((x - pond.x) / pond.rx) ** 2 + ((z - pond.z) / pond.rz) ** 2 : 9);
  // ---- top
  const pos = [], col = [], uv = [], idx = [];
  const grassCol = (x, z, rim) => {
    const n = fbm2(x * 0.35, z * 0.35, seed, 3), m = fbm2(x * 0.16 + 9, z * 0.16, seed + 5, 2);
    const c = C('#ffffff').lerp(C('#d8f0c0'), n * 0.5);
    c.multiply(m > 0.55 ? C('#ffffff').lerp(C('#fff2c8'), (m - 0.55) * 2.2) : C('#ffffff').lerp(C('#c8e8e0'), (0.55 - m) * 1.8));
    if (rim > 0.9) c.multiply(C('#c8dcb8'));
    const q = pondK(x, z);
    if (q < 1.25) c.lerp(C(pond?.sand ? '#f0e0b0' : '#b8b0a0'), smooth(Math.min(1, (1.25 - q) * 2.2)));
    return c;
  };
  const topY = (x, z) => {
    const q = pondK(x, z);
    if (q < 1) return -(pond.depth ?? 3) * 0.1 * Math.min(1, (1 - q) * 3);
    return 0;
  };
  pos.push(S.cx, 0, S.cz); col.push(1, 1, 1); uv.push(S.cx / 4, S.cz / 4);
  for (let r = 1; r <= rings + 1; r++) {
    for (let i = 0; i < segs; i++) {
      const lip = r === rings + 1;
      const t = edgeT[i] * (lip ? 1.012 : r / rings);
      const [x, z] = P(i, t);
      const y = lip ? -0.14 : topY(x, z);
      pos.push(x, y, z);
      const c = lip ? C('#7ab050').multiply(C('#b8d0a0')) : grassCol(x, z, r / rings);
      col.push(c.r, c.g, c.b);
      uv.push(x / 4, z / 4);
    }
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let r = 1; r <= rings; r++) for (let i = 0; i < segs; i++) {
    const a = 1 + (r - 1) * segs + i, b = 1 + (r - 1) * segs + ((i + 1) % segs), c = 1 + r * segs + i, d = 1 + r * segs + ((i + 1) % segs);
    idx.push(a, b, c, b, d, c);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  tg.setIndex(idx); tg.computeVertexNormals();
  const top = new THREE.Mesh(tg, litMat({ map: grassTexture(), vertexColors: true }));
  top.receiveShadow = true;
  g.add(top);
  // ---- the cliffs: profile rings from the lip down to the tip
  const K = 22;
  const cp = [], cc = [], ci = [];
  const depth = new Float32Array(segs);
  for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2; depth[i] = 4.6 + fbm2(Math.cos(a) * 1.4 + 3, Math.sin(a) * 1.4 + 3, seed + 4, 3) * 4.2; }
  // smooth the depths round the ring
  const dep = depth.map((_, i) => (depth[(i + segs - 2) % segs] + depth[(i + segs - 1) % segs] * 2 + depth[i] * 3 + depth[(i + 1) % segs] * 2 + depth[(i + 2) % segs]) / 9);
  const tipX = S.cx + (hash2(seed, 1) - 0.5) * S.rx * 0.3, tipZ = S.cz + (hash2(seed, 2) - 0.5) * S.rz * 0.3;
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      // the profile: a lip, a slight bulge under it, then folding in to the tip
      const prof = u < 0.06 ? 1.0 : (1.03 - u * 0.1) * (1 - Math.pow((u - 0.06) / 0.94, 1.7));
      const bump = 1 + (fbm2(a * 3.2, u * 6 + seed, seed + 7, 3) - 0.5) * 0.36 * Math.sin(Math.PI * Math.min(1, u * 1.4));
      const t = edgeT[i] * prof * bump;
      let [x, z] = P(i, t);
      x += (tipX - S.cx) * u * u; z += (tipZ - S.cz) * u * u;
      const y = -0.1 - Math.pow(u, 1.15) * dep[i];
      cp.push(x, y, z);
      // colour: mossy earth up top, then strata darkening to violet deep down
      let c;
      if (y > -0.45) c = C('#6a8a3a').lerp(C('#7a5a3a'), smooth((-y - 0.1) / 0.35));
      else {
        const band = Math.floor((-y * 3.2 + fbm2(a * 4, -y, seed + 2, 2) * 2.5)) % 4;
        c = C(R[band]).lerp(C(R[4]), smooth(Math.min(1, -y / 7)) * 0.7);
        if (fbm2(a * 9, y * 1.5, seed + 11, 2) > 0.66 && y > -2.4) c.lerp(C('#5a8a44'), 0.75); // moss streaks
        if (hash2(i * 7 + k, seed) < 0.02) c.lerp(C('#3a3048'), 0.6);
      }
      cc.push(c.r, c.g, c.b);
    }
  }
  const tip = cp.length / 3;
  cp.push(tipX, -0.1 - Math.max(...dep) * 1.02, tipZ); const ct = C(R[5]); cc.push(ct.r, ct.g, ct.b);
  for (let k = 0; k < K; k++) for (let i = 0; i < segs; i++) {
    const a = k * segs + i, b = k * segs + ((i + 1) % segs), c = (k + 1) * segs + i, d = (k + 1) * segs + ((i + 1) % segs);
    ci.push(a, c, b, b, c, d);
  }
  for (let i = 0; i < segs; i++) ci.push(K * segs + i, tip, K * segs + ((i + 1) % segs));
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  cg.setIndex(ci); cg.computeVertexNormals();
  const cliff = new THREE.Mesh(cg, litMat({ vertexColors: true }));
  cliff.castShadow = false; cliff.receiveShadow = true;
  g.add(cliff);
  // ---- crystals glowing in the rock, and roots and vines hanging off the rim
  const crystals = new THREE.Group();
  const cm = [emitMat({ color: 0x8ae8ff, intensity: 1.7 }), emitMat({ color: 0xd8a0ff, intensity: 1.6 }), emitMat({ color: 0xffb0e0, intensity: 1.5 })];
  for (let n = 0; n < 34; n++) {
    const i = Math.floor(hash2(n, seed + 21) * segs), u = 0.2 + hash2(n, seed + 22) * 0.55, k = Math.round(u * K);
    const vi = (k * segs + i) * 3;
    const x = cp[vi], y = cp[vi + 1], z = cp[vi + 2];
    const cl = new THREE.Group();
    for (let s = 0; s < 3; s++) {
      const h = 0.18 + hash2(n * 3 + s, seed) * 0.3;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.06 + h * 0.15, h, 5), cm[(n + s) % 3]);
      m.position.set((s - 1) * 0.07, 0, 0); m.rotation.z = (s - 1) * 0.5 + Math.PI; m.rotation.x = 0.3;
      cl.add(m);
    }
    const a = (i / segs) * Math.PI * 2;
    cl.position.set(x + Math.cos(a) * 0.05, y, z + Math.sin(a) * 0.05);
    cl.lookAt(x + Math.cos(a) * 2, y - 0.6, z + Math.sin(a) * 2);
    crystals.add(cl);
  }
  g.add(crystals);
  // roots and vines
  const rv = [], rc = [];
  for (let n = 0; n < 180; n++) {
    const i = Math.floor(hash2(n, seed + 31) * segs);
    const [x0, z0] = P(i, edgeT[i] * 0.995);
    const vine = hash2(n, seed + 32) < 0.45;
    const L = 0.4 + hash2(n, seed + 33) * (vine ? 2.6 : 1.4);
    const a = (i / segs) * Math.PI * 2;
    const c = vine ? C(hash2(n, 5) < 0.5 ? '#5a9a3a' : '#7ac050') : C('#5a3a24');
    let x = x0, z = z0, y = -0.12;
    for (let s = 0; s < 8; s++) {
      const nx = x + Math.cos(a) * 0.02 + (hash2(n, s) - 0.5) * 0.06, nz = z + Math.sin(a) * 0.02 + (hash2(n, s + 9) - 0.5) * 0.06, ny = y - L / 8;
      rv.push(x, y, z, nx, ny, nz); rc.push(c.r, c.g, c.b, c.r, c.g, c.b);
      x = nx; z = nz; y = ny;
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true })));
  g.userData.edge = (i) => P(i, edgeT[i]);
  return g;
}

// ---------------------------------------------------------------- the nebula void
const VOID_FRAG = /* glsl */ `
uniform float time;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { a += noise(p) * w; p = p * 2.03 + 7.1; w *= 0.5; } return a; }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec2 p = vW.xz * 0.012;
  float t = time * 0.01;
  vec3 c = mix(vec3(0.03, 0.025, 0.1), vec3(0.08, 0.05, 0.2), fbm(p * 0.7 + t));
  float b = bayer4(gl_FragCoord.xy);
  // three veils of nebula: rose, violet, teal, with a warm gold heart
  float n1 = fbm(p * 1.3 + vec2(t, -t * 0.6));
  float n2 = fbm(p * 2.1 - vec2(t * 0.7, t) + 4.0);
  float n3 = fbm(p * 0.9 + vec2(-t * 0.4, t * 0.5) + 9.0);
  float q1 = floor(smoothstep(0.42, 0.78, n1) * 5.0 + b) / 5.0;
  float q2 = floor(smoothstep(0.48, 0.82, n2) * 5.0 + b) / 5.0;
  float q3 = floor(smoothstep(0.5, 0.8, n3) * 5.0 + b) / 5.0;
  c += vec3(0.95, 0.32, 0.62) * q1 * 0.55;
  c += vec3(0.45, 0.3, 1.0) * q2 * 0.5;
  c += vec3(0.2, 0.85, 0.85) * q3 * 0.4;
  c += vec3(1.0, 0.8, 0.45) * pow(q1 * q2, 2.0) * 0.6;
  // stars: tiny ones everywhere, a few bright crosses, all twinkling
  vec2 sp = floor(vW.xz * 1.2);
  float s = hash(sp);
  if (s > 0.985) c += vec3(0.9, 0.92, 1.0) * (0.5 + 0.5 * sin(time * 2.0 + s * 80.0)) * (s - 0.985) * 66.0;
  vec2 bp = floor(vW.xz * 0.3);
  float bs = hash(bp + 3.0);
  if (bs > 0.992) { vec2 f = fract(vW.xz * 0.3) - 0.5; float cr = max(step(abs(f.x), 0.02) * step(abs(f.y), 0.18), step(abs(f.y), 0.02) * step(abs(f.x), 0.18)); c += vec3(1.0, 0.95, 0.85) * cr * (0.7 + 0.3 * sin(time * 1.3 + bs * 50.0)) * 1.4; }
  gl_FragColor = vec4(c, 1.0);
}
`;
export function nebulaVoid(size = 900, y = -42) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: VOID_FRAG, uniforms: { time: { value: 0 } }, depthWrite: true,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  m.frustumCulled = false;
  m.userData.update = (dt, t) => { mat.uniforms.time.value = t; };
  return m;
}

// ---------------------------------------------------------------- luminous clouds drifting over the void
const CLOUD_FRAG = /* glsl */ `
uniform float time;
uniform vec3 lit, shade, rim;
uniform float cover;
varying vec3 vW;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { a += noise(p) * w; p = p * 2.07 + 3.3; w *= 0.5; } return a; }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec2 p = vW.xz * 0.06 + vec2(time * 0.012, time * 0.006);
  float d = fbm(p);
  float edge = smoothstep(cover, cover + 0.04, d);
  float b = bayer4(gl_FragCoord.xy);
  if (edge < b) discard;
  // light from the upper left: compare with a sample nudged toward the light
  float d2 = fbm(p + vec2(-0.05, -0.05));
  float l = clamp((d - d2) * 9.0 + 0.55 + (d - cover) * 1.6, 0.0, 1.0);
  l = floor(l * 4.0 + b) / 4.0;
  vec3 c = mix(shade, lit, l);
  c += rim * (1.0 - smoothstep(cover, cover + 0.07, d)) * 0.9;
  gl_FragColor = vec4(c, 1.0);
}
`;
export function dreamClouds({ size = 420, y = -9, cover = 0.52, lit = '#fff0f8', shade = '#b8a0d8', rim = '#a8f0ff' } = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: CLOUD_FRAG,
    uniforms: { time: { value: 0 }, lit: { value: C(lit) }, shade: { value: C(shade) }, rim: { value: C(rim) }, cover: { value: cover } },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  m.frustumCulled = false;
  m.userData.update = (dt, t) => { mat.uniforms.time.value = t; };
  return m;
}

// ---------------------------------------------------------------- glow sprites (instanced billboards)
// atlas of little pixel sprites: wisp, soul (hitodama), butterflies (2 frames
// x 3 colours), sparkle, firefly, petal
function spriteAtlas() {
  const p = new PixCanvas(128, 32, 7200);
  const F = {};
  const put = (name, x, y, w, h, draw) => { draw(x, y); F[name] = [x / 128, 1 - (y + h) / 32, (x + w) / 128, 1 - y / 32]; };
  // wisp: a bright core in a dithered halo
  put('wisp', 0, 0, 9, 9, (x, y) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const d = Math.hypot(i - 4, j - 4); if (d < 1.6) p.px(x + i, y + j, '#ffffff'); else if (d < 2.8) p.px(x + i, y + j, '#e8fff8'); else if (d < 4.4 && (i + j) % 2 === 0) p.px(x + i, y + j, '#a8ffe8'); } });
  // soul: hitodama, a teardrop flame with a wisping tail
  put('soul', 9, 0, 9, 14, (x, y) => { for (let j = 0; j < 14; j++) for (let i = 0; i < 9; i++) { const cx = 4 + Math.sin(j * 0.6) * (j > 7 ? (j - 7) * 0.35 : 0), r = j < 8 ? 3.6 * Math.sin(Math.PI * (j + 1) / 9) + 0.6 : Math.max(0, 2.2 - (j - 8) * 0.4); const d = Math.abs(i - cx); if (d < r * 0.45) p.px(x + i, y + j, '#ffffff'); else if (d < r) p.px(x + i, y + j, j < 8 ? '#bfe8ff' : '#8ac8ff'); } });
  // butterflies: open and closed wings, three colours
  const bfly = (x, y, c1, c2, open) => {
    if (open) { p.rect(x + 1, y + 1, 3, 3, c1); p.rect(x + 5, y + 1, 3, 3, c1); p.rect(x + 1, y + 4, 2, 2, c2); p.rect(x + 6, y + 4, 2, 2, c2); p.px(x + 2, y + 2, '#ffffff'); p.px(x + 6, y + 2, '#ffffff'); }
    else { p.rect(x + 3, y + 1, 1, 4, c1); p.rect(x + 5, y + 1, 1, 4, c1); }
    p.rect(x + 4, y + 1, 1, 5, '#2a1830'); p.px(x + 3, y, '#2a1830'); p.px(x + 5, y, '#2a1830');
  };
  [['#7ad8ff', '#3a8ad8'], ['#ffa8e0', '#e85aa8'], ['#ffe07a', '#ff9a3a']].forEach(([a, b], k) => {
    put('bf' + k + 'a', 18 + k * 18, 0, 9, 7, (x, y) => bfly(x, y, a, b, true));
    put('bf' + k + 'b', 27 + k * 18, 0, 9, 7, (x, y) => bfly(x, y, a, b, false));
  });
  put('sparkle', 0, 16, 7, 7, (x, y) => { p.px(x + 3, y + 3, '#ffffff'); for (let k = 1; k < 4; k++) { p.px(x + 3, y + 3 - k, k < 3 ? '#fff8d8' : '#ffd890'); p.px(x + 3, y + 3 + k, k < 3 ? '#fff8d8' : '#ffd890'); p.px(x + 3 - k, y + 3, k < 3 ? '#fff8d8' : '#ffd890'); p.px(x + 3 + k, y + 3, k < 3 ? '#fff8d8' : '#ffd890'); } });
  put('firefly', 8, 16, 5, 5, (x, y) => { p.px(x + 2, y + 2, '#ffffff'); p.px(x + 1, y + 2, '#e8ff9a'); p.px(x + 3, y + 2, '#e8ff9a'); p.px(x + 2, y + 1, '#e8ff9a'); p.px(x + 2, y + 3, '#e8ff9a'); });
  put('petal', 14, 16, 5, 4, (x, y) => { p.rect(x + 1, y, 3, 1, '#ffd0e0'); p.rect(x, y + 1, 5, 2, '#ffb8d0'); p.rect(x + 1, y + 3, 3, 1, '#ff98b8'); });
  const tex = new THREE.CanvasTexture(p.c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, F };
}
const SPRITE_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iRect;
attribute vec4 iCol;
attribute vec2 iSize;
uniform vec3 camR, camU;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vec3 w = iPos + camR * position.x * iSize.x + camU * position.y * iSize.y;
  vUv = mix(iRect.xy, iRect.zw, uv);
  vCol = iCol;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const SPRITE_FRAG = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vec4 t = texture2D(map, vUv);
  if (t.a < 0.5 || vCol.a < 0.02) discard;
  gl_FragColor = vec4(pow(t.rgb, vec3(2.2)) * vCol.rgb * vCol.a, 1.0);
}
`;
export class GlowSprites {
  constructor(max = 400) {
    const { tex, F } = spriteAtlas();
    this.F = F; this.max = max; this.n = 0;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aRect = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
    for (const a of [this.aPos, this.aRect, this.aCol, this.aSize]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iRect', this.aRect); g.setAttribute('iCol', this.aCol); g.setAttribute('iSize', this.aSize);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({ vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG, uniforms: { map: { value: tex }, camR: { value: new THREE.Vector3(1, 0, 0) }, camU: { value: new THREE.Vector3(0, 1, 0) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 9;
    this.g = g;
  }
  begin(camera) {
    this.n = 0;
    const e = camera.matrixWorld.elements;
    this.mat.uniforms.camR.value.set(e[0], e[1], e[2]); this.mat.uniforms.camU.value.set(e[4], e[5], e[6]);
  }
  // world-space sprite (px = texels -> metres via ppm)
  add(frame, x, y, z, { w = 0.18, h = null, r = 1, g = 1, b = 1, a = 1 } = {}) {
    if (this.n >= this.max) return;
    const i = this.n++, F = this.F[frame];
    this.aPos.array.set([x, y, z], i * 3);
    this.aRect.array.set(F, i * 4);
    this.aCol.array.set([r, g, b, a], i * 4);
    this.aSize.array.set([w, h ?? w * ((F[3] - F[1]) * 32) / ((F[2] - F[0]) * 128)], i * 2);
  }
  end() {
    this.g.instanceCount = this.n;
    for (const a of [this.aPos, this.aRect, this.aCol, this.aSize]) a.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- the magic in the air
// shape: the island (walkable bounds); o.flowers: [{x,z}] for butterflies and
// sparkles; o.water: [{x,z,r}] for fireflies; o.trees: [{x,z}] for petals
export class SpiritAir {
  constructor(scene, shape, o = {}) {
    this.S = shape;
    this.sp = new GlowSprites(520);
    scene.add(this.sp.mesh);
    const rnd = Math.random;
    const onIsland = () => { for (let k = 0; k < 40; k++) { const x = shape.cx + (rnd() - 0.5) * shape.rx * 1.8, z = shape.cz + (rnd() - 0.5) * shape.rz * 1.8; if (shape.inside(x, z)) return [x, z]; } return [shape.cx, shape.cz]; };
    this.wisps = Array.from({ length: o.wisps ?? 9 }, (_, i) => { const [x, z] = onIsland(); return { x, z, y: 0.6 + rnd() * 1.2, vx: 0, vz: 0, ph: rnd() * 9, hue: i % 3 }; });
    this.souls = Array.from({ length: o.souls ?? 14 }, () => this.newSoul(true));
    const flowers = o.flowers?.length ? o.flowers : Array.from({ length: 8 }, () => { const [x, z] = onIsland(); return { x, z }; });
    this.flowers = flowers;
    this.flies = Array.from({ length: o.butterflies ?? 10 }, (_, i) => { const f = flowers[i % flowers.length]; return { cx: f.x, cz: f.z, x: f.x, z: f.z, y: 0.4, a: rnd() * 6, sp: 0.8 + rnd() * 0.8, r: 0.6 + rnd() * 0.9, col: i % 3, ph: rnd() * 6, hop: rnd() * 6 }; });
    this.water = o.water || [];
    this.ff = this.water.length ? Array.from({ length: o.fireflies ?? 22 }, (_, i) => { const w = this.water[i % this.water.length]; return { x: w.x + (rnd() - 0.5) * w.r * 2, z: w.z + (rnd() - 0.5) * w.r * 2, y: 0.2 + rnd() * 0.8, ph: rnd() * 9, w }; }) : [];
    this.sparks = [];
    this.trees = o.trees || [];
    this.petals = this.trees.length ? Array.from({ length: o.petals ?? 26 }, () => this.newPetal(true)) : [];
    this.t = 0;
  }
  newSoul(init = false) {
    const S = this.S, a = Math.random() * Math.PI * 2, rr = 1.15 + Math.random() * 0.9;
    return { x: S.cx + Math.cos(a) * S.rx * rr, z: S.cz + Math.sin(a) * S.rz * rr, y: init ? -6 + Math.random() * 10 : -8, sp: 0.18 + Math.random() * 0.25, ph: Math.random() * 9, pink: Math.random() < 0.25 };
  }
  newPetal(init = false) {
    const t = this.trees[Math.floor(Math.random() * this.trees.length)];
    return { x: t.x + (Math.random() - 0.5) * 1.6, z: t.z + (Math.random() - 0.5) * 1.6, y: init ? Math.random() * 2.6 : 2.6 + Math.random() * 0.6, ph: Math.random() * 9, vy: 0.18 + Math.random() * 0.15 };
  }
  update(dt, t, camera) {
    const S = this.S, sp = this.sp;
    this.t += dt;
    sp.begin(camera);
    // wisps: wander low over the meadow, pulsing, leaving sparkles
    for (const w of this.wisps) {
      const ax = Math.sin(t * 0.37 + w.ph) * 0.5 + Math.sin(t * 0.91 + w.ph * 2) * 0.3, az = Math.cos(t * 0.29 + w.ph * 1.3) * 0.5 + Math.cos(t * 0.73 + w.ph) * 0.3;
      w.vx += (ax - w.vx) * dt; w.vz += (az - w.vz) * dt;
      const nx = w.x + w.vx * dt * 0.8, nz = w.z + w.vz * dt * 0.8;
      if (S.inside(nx, nz) && S.k(nx, nz) > 0.05) { w.x = nx; w.z = nz; } else { w.vx *= -1; w.vz *= -1; }
      const y = w.y + Math.sin(t * 1.3 + w.ph) * 0.18;
      const pulse = 0.75 + 0.25 * Math.sin(t * 3.1 + w.ph);
      const col = [[0.6, 1.4, 1.2], [1.3, 0.9, 1.5], [1.5, 1.3, 0.7]][w.hue];
      sp.add('wisp', w.x, y, w.z, { w: 0.22 * pulse + 0.08, r: col[0], g: col[1], b: col[2], a: 1.6 });
      sp.add('wisp', w.x, y, w.z, { w: 0.55, r: col[0], g: col[1], b: col[2], a: 0.18 });
      if (Math.random() < dt * 3) this.sparks.push({ x: w.x, y, z: w.z, vy: 0.1, life: 1.0, t: 0, c: col });
    }
    // souls: rising out of the deep round the island, swaying, fading as they climb
    for (let i = 0; i < this.souls.length; i++) {
      const s = this.souls[i];
      s.y += s.sp * dt;
      const sx = s.x + Math.sin(t * 0.6 + s.ph) * 0.4;
      const a = Math.min(1, (s.y + 8) / 3) * Math.max(0, Math.min(1, (6 - s.y) / 3));
      if (s.y > 6) this.souls[i] = this.newSoul();
      sp.add('soul', sx, s.y, s.z, { w: 0.34, r: s.pink ? 1.6 : 0.8, g: s.pink ? 0.9 : 1.2, b: s.pink ? 1.4 : 1.7, a: a * 1.3 });
      sp.add('wisp', sx, s.y - 0.08, s.z, { w: 0.9, r: 0.6, g: 0.8, b: 1.4, a: a * 0.15 });
    }
    // butterflies: flutter round the flowers, glowing a little
    for (const f of this.flies) {
      f.a += dt * f.sp; f.hop += dt * 9;
      const x = f.cx + Math.cos(f.a) * f.r + Math.sin(f.a * 2.7) * 0.25, z = f.cz + Math.sin(f.a * 1.3) * f.r * 0.6;
      const y = 0.35 + Math.abs(Math.sin(f.hop * 0.5)) * 0.25 + Math.sin(f.a * 0.7) * 0.2;
      const open = Math.sin(f.hop * 1.6) > -0.45;
      sp.add('bf' + f.col + (open ? 'a' : 'b'), x, y, z, { w: 0.3, a: 1.35 });
      if (Math.random() < dt * 0.8) { const fl = this.flowers[Math.floor(Math.random() * this.flowers.length)]; f.cx = fl.x; f.cz = fl.z; }
    }
    // fireflies over the water, blinking
    for (const f of this.ff) {
      const x = f.x + Math.sin(t * 0.5 + f.ph) * 0.4, z = f.z + Math.cos(t * 0.43 + f.ph) * 0.3, y = f.y + Math.sin(t * 0.9 + f.ph) * 0.2;
      const blink = Math.max(0, Math.sin(t * 1.7 + f.ph * 3));
      sp.add('firefly', x, y, z, { w: 0.08, r: 1.6, g: 1.8, b: 0.8, a: blink * 1.4 });
    }
    // sparkles drifting up off the flowers
    if (Math.random() < dt * 6) { const fl = this.flowers[Math.floor(Math.random() * this.flowers.length)]; this.sparks.push({ x: fl.x + (Math.random() - 0.5) * 0.5, y: 0.2, z: fl.z + (Math.random() - 0.5) * 0.5, vy: 0.35, life: 1.6, t: 0, c: [1.6, 1.4, 0.9] }); }
    this.sparks = this.sparks.filter((s) => (s.t += dt) < s.life);
    for (const s of this.sparks) { s.y += s.vy * dt; const k = 1 - s.t / s.life; sp.add('sparkle', s.x, s.y, s.z, { w: 0.1 * (0.5 + k), r: s.c[0], g: s.c[1], b: s.c[2], a: k * 1.3 }); }
    // sakura petals tumbling down
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.y -= p.vy * dt; p.x += Math.sin(t * 1.1 + p.ph) * dt * 0.3 + dt * 0.12; p.z += Math.cos(t * 0.8 + p.ph) * dt * 0.2;
      if (p.y < 0.02) this.petals[i] = this.newPetal();
      sp.add('petal', p.x, p.y, p.z, { w: 0.07, r: 1.1, g: 1.0, b: 1.0, a: 0.9 });
    }
    sp.end();
  }
}
