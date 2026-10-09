// Stylized materials. One lit material family (Lambert under the hood) with
// shader hooks for the Kodamaya look:
//   - soft cel bands on direct light (facets still read as low-poly)
//   - drifting cloud shadows sampled in world space
//   - wind sway weighted per vertex (aWind attribute from the GeoBuilder)
//   - rim light for characters
//   - wet ground: darker albedo + puddles that mirror the sky tint, rain ripples
//   - screen-door (ordered dither) fade for cutaway walls / roofs / occluders
//   - height clip for multi-storey interiors
// plus unlit emissive materials with flicker programs (fluorescent buzz, dying
// tubes, candle lanterns, neon, blinking signs) and a cheap glass material.
import * as THREE from 'three';

// --------------------------------------------------------------- global uniforms
export const WORLD = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uWindDir: { value: new THREE.Vector2(1, 0.35).normalize() },
  uCloudAmt: { value: 0.0 },
  uCloudTex: { value: null },
  uCloudScale: { value: 0.035 },
  uCloudVel: { value: new THREE.Vector2(0.018, 0.007) },
  uWet: { value: 0 },
  uRain: { value: 0 },
  uSkyTint: { value: new THREE.Color(0.6, 0.7, 0.9) },
  uNight: { value: 0 },
  uCel: { value: 0.55 },
  uPixel: { value: 1 },
};

// tiling cloud-shadow noise (soft blobs), generated once
function cloudTexture() {
  const S = 128, d = new Uint8Array(S * S * 4);
  const hash = (x, z, k) => { let h = (x * 374761393 + z * 668265263 + k * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const q = (t) => t * t * (3 - 2 * t);
  const noise = (x, z, C, k) => {
    const P = S / C, gx = Math.floor(x / C), gz = Math.floor(z / C), u = q((x % C) / C), v = q((z % C) / C);
    const h = (i, j) => hash(((gx + i) % P + P) % P, ((gz + j) % P + P) % P, k);
    return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
  };
  for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
    const n = noise(x, z, 32, 1) * 0.6 + noise(x, z, 16, 2) * 0.28 + noise(x, z, 8, 3) * 0.12;
    const v = Math.round(Math.min(1, Math.max(0, (n - 0.42) * 3.2)) * 255);
    const i = (z * S + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    // g channel: puddle mask noise (different seed)
    const p = noise(x, z, 16, 7) * 0.7 + noise(x, z, 8, 9) * 0.3;
    d[i + 1] = Math.round(Math.min(1, Math.max(0, (p - 0.5) * 4)) * 255);
  }
  const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
WORLD.uCloudTex.value = cloudTexture();

const COMMON_PARS = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform vec2 uWindDir;
uniform float uCloudAmt;
uniform sampler2D uCloudTex;
uniform float uCloudScale;
uniform vec2 uCloudVel;
uniform float uWet;
uniform float uRain;
uniform vec3 uSkyTint;
uniform float uNight;
uniform float uCel;
uniform float uFade;
uniform float uClipY;
uniform vec3 uRim;
uniform float uRimAmt;
uniform float uWetAmt;
uniform vec3 uTint;
varying vec3 vKW;
`;

const VERT_PARS = /* glsl */ `
attribute float aWind;
`;

const VERT_WIND = /* glsl */ `
  {
    vec4 kwp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      kwp = instanceMatrix * kwp;
    #endif
    kwp = modelMatrix * kwp;
    float w = aWind * uWind;
    if (w > 0.0) {
      float ph = dot(kwp.xz, vec2(0.71, 0.53));
      float gust = 0.6 + 0.4 * sin(uTime * 0.37 + ph * 0.13);
      float s = sin(uTime * 1.9 + ph) * 0.65 + sin(uTime * 3.7 + ph * 1.7) * 0.35;
      vec2 off = uWindDir * (s * 0.05 + 0.03) * w * gust;
      transformed.x += off.x;
      transformed.z += off.y;
      transformed.y -= abs(s) * 0.01 * w;
      kwp.xz += off;
    }
    vKW = kwp.xyz;
  }
`;

const FRAG_HEAD = /* glsl */ `
float kBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float kBayer4(vec2 a) { return kBayer2(0.5 * a) * 0.25 + kBayer2(a); }
float gCloud = 1.0;
float celNL(float d) {
  float a = smoothstep(0.0, 0.07, d);
  float b = smoothstep(0.3, 0.42, d);
  float banded = a * 0.68 + b * 0.32;
  return mix(d, banded, uCel);
}
`;

// modified Lambert direct term: cel bands + cloud shadow
const LAMBERT_PARS = /* glsl */ `
varying vec3 vViewPosition;
struct LambertMaterial { vec3 diffuseColor; float specularStrength; };
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
  float dotNL = celNL(saturate( dot( geometryNormal, directLight.direction ) ));
  vec3 irradiance = dotNL * directLight.color * gCloud;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Lambert
#define RE_IndirectDiffuse RE_IndirectDiffuse_Lambert
`;

const FRAG_PRE_LIGHT = /* glsl */ `
  // cloud shadows drifting over the ground
  if (uCloudAmt > 0.001) {
    float cs = texture2D(uCloudTex, vKW.xz * uCloudScale + uTime * uCloudVel).r;
    gCloud = 1.0 - uCloudAmt * cs;
  }
  // wet surfaces: darker, puddles mirror the sky
  float kPud = 0.0;
  if (uWetAmt > 0.001 && uWet > 0.001) {
    float pm = texture2D(uCloudTex, vKW.xz * 0.11 + vec2(0.37, 0.11)).g;
    kPud = smoothstep(0.35, 0.55, pm) * uWet * uWetAmt;
    diffuseColor.rgb *= 1.0 - 0.32 * uWet * uWetAmt - 0.25 * kPud;
  }
`;

const FRAG_POST_LIGHT = /* glsl */ `
  outgoingLight *= uTint;
  if (kPud > 0.001) {
    // puddle: a darkened mirror of the sky, rippling in the rain
    vec2 cell = floor(vKW.xz * 2.0);
    float rip = 0.0;
    if (uRain > 0.01) {
      float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
      float t = fract(uTime * 0.7 + h);
      vec2 c = (cell + 0.5 + (vec2(fract(h * 7.13), fract(h * 3.71)) - 0.5) * 0.6) / 2.0;
      float r = length(vKW.xz - c);
      rip = smoothstep(0.03, 0.0, abs(r - t * 0.45)) * (1.0 - t) * uRain;
    }
    vec3 refl = uSkyTint * (0.55 + 0.25 * uNight) + rip * 0.35;
    outgoingLight = mix(outgoingLight, refl * 0.6 + outgoingLight * 0.4, kPud * 0.75);
  }
  // rim light (characters)
  if (uRimAmt > 0.001) {
    float fr = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0);
    outgoingLight += uRim * fr * uRimAmt;
  }
`;

const FRAG_DISCARD = /* glsl */ `
  if (uFade > 0.001) {
    if (kBayer4(gl_FragCoord.xy) < uFade) discard;
  }
  if (vKW.y > uClipY) discard;
`;

let _lid = 0;
// Lit material.
//  map, color, vertexColors, transparent, alphaTest, side
//  wet: 0..1 (how much this surface gets wet), rim: [color, amount]
//  fade / clip: shared uniform objects ({ value }) so a building can fade or
//  clip all its materials at once
export function litMat({ map = null, color = 0xffffff, vertexColors = true, transparent = false, alphaTest = 0, side = THREE.FrontSide, wet = 0, rim = null, fade = null, clip = null, tint = null, emissive = 0x000000, emissiveMap = null, emissiveIntensity = 1, opacity = 1, name = '', noShadow = false, depthWrite = true, flatShading = false } = {}) {
  const m = new THREE.MeshLambertMaterial({ map, color, vertexColors, transparent, alphaTest, side, emissive, emissiveMap, emissiveIntensity, opacity, depthWrite, flatShading });
  m.name = name;
  m.userData.noShadow = noShadow;
  const fadeU = fade || { value: 0 };
  const clipU = clip || { value: 1e5 };
  const tintU = tint || { value: new THREE.Color(1, 1, 1) };
  const rimU = { value: new THREE.Color(rim ? rim[0] : 0xffffff) };
  const rimAmtU = { value: rim ? rim[1] : 0 };
  const wetU = { value: wet };
  m.userData.u = { fade: fadeU, clip: clipU, tint: tintU, rim: rimU, rimAmt: rimAmtU, wet: wetU };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WORLD);
    sh.uniforms.uFade = fadeU;
    sh.uniforms.uClipY = clipU;
    sh.uniforms.uTint = tintU;
    sh.uniforms.uRim = rimU;
    sh.uniforms.uRimAmt = rimAmtU;
    sh.uniforms.uWetAmt = wetU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON_PARS + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_WIND);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + COMMON_PARS + FRAG_HEAD)
      .replace('#include <lights_lambert_pars_fragment>', LAMBERT_PARS)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_DISCARD)
      .replace('#include <lights_lambert_fragment>', FRAG_PRE_LIGHT + '\n#include <lights_lambert_fragment>')
      .replace('#include <envmap_fragment>', FRAG_POST_LIGHT + '\n#include <envmap_fragment>');
  };
  m.customProgramCacheKey = () => 'kodama-lit';
  m.userData.lid = ++_lid;
  return m;
}

// --------------------------------------------------------------- emissive
// flicker programs (GLSL), selected by uMode:
// 0 steady, 1 fluorescent buzz, 2 dying tube, 3 candle/lantern, 4 neon, 5 blink, 6 slow pulse (spirit)
const EMIT_FRAG_PARS = /* glsl */ `
uniform float uTime;
uniform float uMode;
uniform float uPhase;
uniform float uOn;
uniform float uGlow;
uniform float uFade;
uniform float uClipY;
varying vec3 vKW;
float eh(float n) { return fract(sin(n * 91.345 + uPhase * 17.13) * 43758.5453); }
float kBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float kBayer4(vec2 a) { return kBayer2(0.5 * a) * 0.25 + kBayer2(a); }
float flicker() {
  float t = uTime + uPhase * 13.7;
  if (uMode < 0.5) return 1.0;
  if (uMode < 1.5) { // fluorescent: steady with rare double-blinks
    float s = floor(t * 9.0);
    float r = eh(s);
    float off = step(0.985, r) + step(0.985, eh(s - 1.0)) * 0.6;
    return 1.0 - 0.75 * clamp(off, 0.0, 1.0) - 0.04 * eh(floor(t * 60.0));
  }
  if (uMode < 2.5) { // dying tube: long stutters
    float s = floor(t * 7.0);
    float burst = step(0.7, eh(floor(t * 0.4)));
    float r = eh(s);
    return mix(1.0, step(0.45, r) * (0.6 + 0.4 * eh(s + 3.0)), burst) * (0.92 + 0.08 * eh(floor(t * 40.0)));
  }
  if (uMode < 3.5) { // candle
    return 0.82 + 0.1 * sin(t * 7.3) * sin(t * 2.9 + 1.3) + 0.08 * eh(floor(t * 14.0));
  }
  if (uMode < 4.5) { // neon: hum + occasional flutter
    float fl = step(0.93, eh(floor(t * 1.3)));
    return 1.0 - fl * step(0.5, eh(floor(t * 24.0))) * 0.8 - 0.05 * sin(t * 50.0);
  }
  if (uMode < 5.5) { // blink
    return step(0.5, fract(t * 0.8));
  }
  return 0.75 + 0.25 * sin(t * 1.6); // slow pulse
}
`;

export function emitMat({ color = 0xffffff, map = null, intensity = 1.6, mode = 0, phase = Math.random(), on = 1, transparent = false, alphaTest = 0, side = THREE.FrontSide, fade = null, clip = null, onU = null, vertexColors = false, opacity = 1, depthWrite = true, blending = THREE.NormalBlending, name = '' } = {}) {
  const m = new THREE.MeshBasicMaterial({ color, map, transparent, alphaTest, side, vertexColors, opacity, depthWrite, blending });
  m.name = name;
  m.userData.noShadow = true;
  const U = {
    uMode: { value: mode }, uPhase: { value: phase }, uOn: onU || { value: on }, uGlow: { value: intensity },
    uFade: fade || { value: 0 }, uClipY: clip || { value: 1e5 },
  };
  m.userData.u = U;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WORLD.uTime;
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 kwp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      kwp = instanceMatrix * kwp;
    #endif
    vKW = (modelMatrix * kwp).xyz; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + EMIT_FRAG_PARS)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uFade > 0.001 && kBayer4(gl_FragCoord.xy) < uFade) discard;
  if (vKW.y > uClipY) discard;`)
      .replace('#include <opaque_fragment>', `
  float fk = flicker();
  float on = clamp(uOn, 0.0, 1.0);
  // off = the unlit glass/tube colour (dim), on = bright and blooming
  outgoingLight *= mix(0.32, uGlow * fk, on);
  #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'kodama-emit';
  return m;
}

// --------------------------------------------------------------- glass
// window glass: tinted, a soft vertical sheen streak; at night it can glow
// (lit room behind) through uOn.
export function glassMat({ color = 0x9fc4d8, opacity = 0.55, glow = 0xffd9a0, onU = null, fade = null } = {}) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  m.userData.noShadow = true;
  const U = { uOn: onU || { value: 0 }, uGlowCol: { value: new THREE.Color(glow) }, uFade: fade || { value: 0 } };
  m.userData.u = U;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WORLD.uTime;
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vKW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uOn; uniform vec3 uGlowCol; uniform float uFade; varying vec3 vKW;
float kBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float kBayer4(vec2 a) { return kBayer2(0.5 * a) * 0.25 + kBayer2(a); }`)
      .replace('#include <opaque_fragment>', `
  if (uFade > 0.001 && kBayer4(gl_FragCoord.xy) < uFade) discard;
  float sheen = smoothstep(0.06, 0.0, abs(fract((vKW.x + vKW.z) * 0.45 + vKW.y * 0.25) - 0.3)) * 0.35;
  outgoingLight = mix(outgoingLight + sheen, uGlowCol * 1.4, uOn * 0.85);
  diffuseColor.a = mix(diffuseColor.a, 0.92, uOn);
  #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'kodama-glass';
  return m;
}

// simple shadow-catcher blob under characters/props (flat, multiplied)
let _blobTex = null;
export function blobShadowMat(opacity = 0.32) {
  if (!_blobTex) {
    const S = 32, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const d = Math.hypot(i + 0.5 - S / 2, j + 0.5 - S / 2) / (S / 2);
      const b = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(j & 3) * 4 + (i & 3)] / 16;
      const a = d < 0.62 ? 1 : d < 1 ? ((1 - d) / 0.38 > b ? 1 : 0) : 0;
      if (a) { x.fillStyle = '#000'; x.fillRect(i, j, 1, 1); }
    }
    _blobTex = new THREE.CanvasTexture(c);
    _blobTex.magFilter = _blobTex.minFilter = THREE.NearestFilter;
    _blobTex.generateMipmaps = false;
  }
  const m = new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, color: 0x2a1a3a });
  m.userData.noShadow = true;
  return m;
}
