// Batched 2D pixel sprites living in the 3D world (the "2D" half of the look:
// grass tufts, flowers, leaves, signs, birds, insects, particles). Adapted from
// The Bear Must Eat's sprite batch.
//
// One draw call per batch: an instanced quad with per-sprite position, size,
// anchor, atlas rect, tint, alpha and behaviour flags. Alpha-tested (writes
// depth, so the outline pass outlines them), ordered-dither fading, wind sway
// weighted to the top of the sprite, foliage pushed aside by characters,
// shadows cast from a light-facing copy of each billboard.
//
// Modes: 0 = upright billboard (turns around Y to face the camera, height
// compensated for the camera pitch so pixel art isn't squashed),
//        1 = flat on the ground (decals, shadows, light pools),
//        2 = fully camera-facing (particles, text).
import * as THREE from 'three';
import { WORLD } from './materials.js';
import { PixCanvas } from './pixtex.js';

export const SPRITE_UNIFORMS = {
  uCamRight: { value: new THREE.Vector3(1, 0, 0) },
  uCamUp: { value: new THREE.Vector3(0, 1, 0) },
  uCamBack: { value: new THREE.Vector3(0, 0, 1) },
  uLightRight: { value: new THREE.Vector3(1, 0, 0) },
  uHeightComp: { value: 1.39 },
  uFlatComp: { value: 1.44 },
  uPush: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -99, 0, 0)) },
  uCut: { value: new THREE.Vector4(0, 0, 0, 0) },
};

const _v = new THREE.Vector3();
export function updateSpriteUniforms(camera, { sunDir = null, pushers = null, cut = null } = {}) {
  if (cut) SPRITE_UNIFORMS.uCut.value.set(cut.x, cut.z, cut.r, cut.k ?? 1);
  else SPRITE_UNIFORMS.uCut.value.set(0, 0, 0, 0);
  const e = camera.matrixWorld.elements;
  SPRITE_UNIFORMS.uCamRight.value.set(e[0], e[1], e[2]).normalize();
  SPRITE_UNIFORMS.uCamUp.value.set(e[4], e[5], e[6]).normalize();
  SPRITE_UNIFORMS.uCamBack.value.set(e[8], e[9], e[10]).normalize();
  const back = SPRITE_UNIFORMS.uCamBack.value;
  const pitch = Math.asin(Math.min(1, Math.max(-1, back.y)));
  SPRITE_UNIFORMS.uHeightComp.value = 1 / Math.max(0.3, Math.cos(pitch));
  SPRITE_UNIFORMS.uFlatComp.value = 1 / Math.max(0.3, Math.sin(pitch));
  if (sunDir) {
    _v.set(sunDir.z, 0, -sunDir.x);
    if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0);
    SPRITE_UNIFORMS.uLightRight.value.copy(_v.normalize());
  }
  const P = SPRITE_UNIFORMS.uPush.value;
  for (let i = 0; i < P.length; i++) {
    const p = pushers && pushers[i];
    if (p) P[i].set(p.x, p.y ?? 0, p.z, p.r ?? 0.6);
    else P[i].set(0, -99, 0, 0);
  }
}

const VERT_PARS = /* glsl */ `
attribute vec3 aPos;
attribute vec2 aSize;
attribute vec2 aAnchor;
attribute vec4 aUV;
attribute vec4 aParams;   // sway, phase, mode, alpha
attribute vec4 aExtra;    // flip, rotation, emissive, bob
attribute vec3 aTint;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamBack;
uniform vec3 uLightRight;
uniform float uTime;
uniform float uWind;
uniform float uHeightComp;
uniform float uFlatComp;
uniform vec4 uPush[8];
uniform vec4 uCut;
varying vec3 vSTint;
varying float vSAlpha;
varying float vSEmis;
vec3 spriteWorld(vec3 camRight) {
  vec2 corner = position.xy;
  vec2 local = (corner - aAnchor) * aSize;
  float rot = aExtra.y;
  if (rot != 0.0) { float c = cos(rot), s = sin(rot); local = vec2(c * local.x - s * local.y, s * local.x + c * local.y); }
  float mode = aParams.z;
  vec3 right = normalize(vec3(camRight.x, 0.0, camRight.z) + vec3(1e-5, 0.0, 0.0));
  vec3 p;
  if (mode < 0.5) {
    p = aPos + right * local.x + vec3(0.0, local.y * uHeightComp, 0.0);
  } else if (mode < 1.5) {
    vec3 fwd = normalize(vec3(uCamUp.x, 0.0, uCamUp.z) + vec3(0.0, 0.0, 1e-5));
    p = aPos + right * local.x + fwd * local.y * uFlatComp;
  } else {
    p = aPos + uCamRight * local.x + uCamUp * local.y;
  }
  float sway = aParams.x;
  if (sway > 0.0) {
    float hw = corner.y * corner.y;
    float t = uTime * 1.35 + aParams.y;
    float gust = 0.6 + 0.4 * sin(uTime * 0.37 + aPos.x * 0.05);
    vec2 w = vec2(sin(t + aPos.x * 0.35) + 0.35 * sin(t * 2.7 + aPos.z * 0.8), 0.45 * cos(t * 0.8 + aPos.z * 0.3));
    p.xz += w * sway * hw * uWind * gust * 0.06 * max(0.3, aSize.y);
    for (int i = 0; i < 8; i++) {
      vec4 q = uPush[i];
      if (q.w <= 0.0) continue;
      vec2 d = aPos.xz - q.xz;
      float dd = length(d);
      if (dd < q.w && abs(aPos.y - q.y) < 2.0) {
        float k = 1.0 - dd / q.w;
        p.xz += (d / max(dd, 1e-3)) * k * k * sway * hw * 0.35;
        p.y -= k * sway * hw * 0.1 * aSize.y;
      }
    }
  }
  float bob = aExtra.w;
  if (bob != 0.0) p.y += sin(uTime * 2.2 + aParams.y * 6.28) * bob;
  return p;
}
`;

const FRAG_PARS = /* glsl */ `
varying vec3 vSTint;
varying float vSAlpha;
varying float vSEmis;
float sBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float sBayer4(vec2 a) { return sBayer2(0.5 * a) * 0.25 + sBayer2(a) + 0.03; }
`;

const UV_BLOCK = /* glsl */ `
{
  vec2 cuv = position.xy;
  float fu = aExtra.x < 0.0 ? 1.0 - cuv.x : cuv.x;
  vec2 suv = vec2(mix(aUV.x, aUV.z, fu), mix(aUV.w, aUV.y, cuv.y));
  #ifdef USE_MAP
  vMapUv = suv;
  #endif
}
vSTint = aTint;
vSAlpha = aParams.w;
vSEmis = aExtra.z;
`;

function patchVertex(shader, forDepth) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + VERT_PARS)
    .replace('#include <beginnormal_vertex>', `
vec3 objectNormal = ${forDepth ? 'vec3(0.0, 1.0, 0.0)' : 'normalize(aParams.z > 0.5 && aParams.z < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.75, 0.0) + uCamBack * 0.7)'};
#ifdef USE_TANGENT
vec3 objectTangent = vec3(1.0, 0.0, 0.0);
#endif
`)
    .replace('#include <begin_vertex>', forDepth ? 'vec3 transformed = spriteWorld(uLightRight);' : 'vec3 transformed = spriteWorld(uCamRight);')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\n' + UV_BLOCK + (forDepth ? '' : `
if (uCut.z > 0.0 && aParams.x > 0.0) {
  vec2 cd = aPos.xz - uCut.xy;
  float cdd = length(cd);
  float front = dot(cd, normalize(uCamBack.xz + vec2(1e-5)));
  if (cdd < uCut.z && front > -0.15) vSAlpha *= 1.0 - uCut.w * 0.8 * (1.0 - smoothstep(uCut.z * 0.55, uCut.z, cdd));
}`));
}

function patchFragmentDiscard(src) {
  return src.replace('#include <map_fragment>', `#include <map_fragment>
if (diffuseColor.a < 0.5) discard;
if (vSAlpha < 0.999 && vSAlpha < sBayer4(gl_FragCoord.xy)) discard;
diffuseColor.a = 1.0;
`);
}

export function makeSpriteMaterials(texture, { lit = true, additive = false } = {}) {
  const mat = lit
    ? new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide })
    : new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, SPRITE_UNIFORMS);
    shader.uniforms.uTime = WORLD.uTime;
    shader.uniforms.uWind = WORLD.uWind;
    patchVertex(shader, false);
    let fs = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS);
    if (additive) {
      fs = fs.replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb *= diffuseColor.a * vSAlpha;`);
    } else fs = patchFragmentDiscard(fs);
    fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vSTint;');
    if (lit) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vSEmis * 1.6;');
    else fs = fs.replace('#include <opaque_fragment>', 'outgoingLight *= 1.0 + vSEmis * 1.6;\n#include <opaque_fragment>');
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'ksprite' + (lit ? 'L' : 'B') + (additive ? 'A' : '');
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, side: THREE.DoubleSide });
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, SPRITE_UNIFORMS);
    shader.uniforms.uTime = WORLD.uTime;
    shader.uniforms.uWind = WORLD.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', 'vec3 transformed = spriteWorld(uLightRight);')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n' + UV_BLOCK);
    shader.fragmentShader = patchFragmentDiscard(shader.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS));
  };
  depth.customProgramCacheKey = () => 'kspriteDepth';
  return { mat, depth };
}

const FLOATS = { aPos: 3, aSize: 2, aAnchor: 2, aUV: 4, aParams: 4, aExtra: 4, aTint: 3 };

export class SpriteBatch {
  constructor(atlas, { max = 1024, lit = true, additive = false, castShadow = false, receiveShadow = true, renderOrder = 0, name = 'sprites', texels = 64 } = {}) {
    this.atlas = atlas;
    const texture = atlas.texture;
    this.max = max;
    this.count = 0;
    this.texels = texels;
    this.aw = texture.image.width;
    this.ah = texture.image.height;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.attr = {};
    for (const [k, n] of Object.entries(FLOATS)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(k, a);
      this.attr[k] = a;
    }
    g.instanceCount = 0;
    this.geo = g;
    const { mat, depth } = makeSpriteMaterials(texture, { lit, additive });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.customDepthMaterial = depth;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.renderOrder = renderOrder;
    this.mesh.name = name;
    this.baseSize = new Float32Array(max * 2);
    this.dirty = true;
  }
  clear() { this.count = 0; this.dirty = true; }
  // frame: atlas frame name or { x, y, w, h, ax?, ay? }
  push(frame, x, y, z, o = {}) {
    if (this.count >= this.max) return -1;
    const i = this.count++;
    this.write(i, frame, x, y, z, o);
    return i;
  }
  write(i, frame, x, y, z, o = {}) {
    const f = typeof frame === 'string' ? this.atlas.frames[frame] : frame;
    if (!f) { console.warn('sprite frame missing', frame); return; }
    const A = this.attr;
    const tpu = o.texels || this.texels;
    const scale = o.scale ?? 1;
    const w = (o.w ?? f.w / tpu) * scale * (o.sx ?? 1);
    const h = (o.h ?? f.h / tpu) * scale * (o.sy ?? 1);
    A.aPos.array.set([x, y, z], i * 3);
    A.aSize.array.set([w, h], i * 2);
    this.baseSize.set([w, h], i * 2);
    const ax = o.ax ?? (f.ax != null ? f.ax / f.w : 0.5);
    const ay = o.ay ?? (f.ay != null ? 1 - f.ay / f.h : 0);
    A.aAnchor.array.set([ax, ay], i * 2);
    const inset = 0.001;
    A.aUV.array.set([(f.x + inset) / this.aw, 1 - (f.y + inset) / this.ah, (f.x + f.w - inset) / this.aw, 1 - (f.y + f.h - inset) / this.ah], i * 4);
    A.aParams.array.set([o.sway ?? 0, o.phase ?? Math.random() * 6.28, o.mode ?? 0, o.alpha ?? 1], i * 4);
    A.aExtra.array.set([o.flip ? -1 : 1, o.rot ?? 0, o.emissive ?? 0, o.bob ?? 0], i * 4);
    const t = o.tint;
    if (t) A.aTint.array.set([t[0], t[1], t[2]], i * 3);
    else A.aTint.array.set([1, 1, 1], i * 3);
    this.dirty = true;
  }
  setPos(i, x, y, z) { this.attr.aPos.array.set([x, y, z], i * 3); this.dirty = true; }
  setAlpha(i, a) { this.attr.aParams.array[i * 4 + 3] = a; this.dirty = true; }
  setRot(i, r) { this.attr.aExtra.array[i * 4 + 1] = r; this.dirty = true; }
  setFlip(i, f) { this.attr.aExtra.array[i * 4] = f ? -1 : 1; this.dirty = true; }
  setTint(i, t) { this.attr.aTint.array.set([t[0], t[1], t[2]], i * 3); this.dirty = true; }
  setEmissive(i, e) { this.attr.aExtra.array[i * 4 + 2] = e; this.dirty = true; }
  setScale(i, kx, ky = kx) {
    this.attr.aSize.array[i * 2] = this.baseSize[i * 2] * kx;
    this.attr.aSize.array[i * 2 + 1] = this.baseSize[i * 2 + 1] * ky;
    this.dirty = true;
  }
  setFrame(i, frame) {
    const f = typeof frame === 'string' ? this.atlas.frames[frame] : frame;
    if (!f) return;
    const inset = 0.001;
    this.attr.aUV.array.set([(f.x + inset) / this.aw, 1 - (f.y + inset) / this.ah, (f.x + f.w - inset) / this.aw, 1 - (f.y + f.h - inset) / this.ah], i * 4);
    this.dirty = true;
  }
  commit() {
    if (!this.dirty) return;
    this.dirty = false;
    this.geo.instanceCount = this.count;
    for (const [k, a] of Object.entries(this.attr)) {
      a.clearUpdateRanges();
      if (this.count) a.addUpdateRange(0, this.count * FLOATS[k]);
      a.needsUpdate = true;
    }
  }
  dispose() { this.geo.dispose(); this.mesh.material.dispose(); this.mesh.customDepthMaterial.dispose(); }
}

// ---------------------------------------------------------------- atlas
// Shelf-packs named pixel drawings into one canvas.
//   const A = new Atlas(1024, 1024);
//   A.add('tuft', 16, 12, (p) => { p.rect(...) }, { ax: 8, ay: 12 });
//   A.finish();   // -> A.texture, A.frames
export class Atlas {
  constructor(w = 1024, h = 1024) {
    this.pc = new PixCanvas(w, h);
    this.frames = {};
    this.x = 1; this.y = 1; this.rowH = 0;
    this.w = w; this.h = h;
    this.texture = null;
  }
  add(name, w, h, draw, { ax = null, ay = null } = {}) {
    if (this.x + w + 1 > this.w) { this.x = 1; this.y += this.rowH + 2; this.rowH = 0; }
    if (this.y + h + 1 > this.h) { console.warn('Atlas full', name); return null; }
    const f = { x: this.x, y: this.y, w, h, ax: ax ?? w / 2, ay: ay ?? h };
    const sub = new PixCanvas(w, h, (Object.keys(this.frames).length + 1) * 977);
    draw(sub, f);
    this.pc.draw(sub, f.x, f.y);
    this.frames[name] = f;
    this.x += w + 2;
    this.rowH = Math.max(this.rowH, h);
    return f;
  }
  // same drawing at several variants: name0..nameN
  addVariants(name, n, w, h, draw, opts) {
    for (let i = 0; i < n; i++) this.add(name + i, w, h, (p, f) => draw(p, i, f), opts);
  }
  finish() {
    const t = new THREE.CanvasTexture(this.pc.c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    this.texture = t;
    return this;
  }
  refresh() { if (this.texture) this.texture.needsUpdate = true; }
}
