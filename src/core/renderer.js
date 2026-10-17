// Pixel renderer: the 3D scene is drawn into a small render target, then
// upscaled with nearest-neighbour filtering through a post pass that adds a
// depth-based outline, soft bloom, a per-world colour grade, tilt-shift haze,
// vignette, letterbox bars and an iris wipe. A 1px margin lets the camera snap
// to whole texels while the leftover sub-pixel offset is applied when blitting
// (smooth camera motion with no pixel crawl).
//
// Kodamaya runs a finer grid than The Bear Must Eat (about 960x540 low-res
// pixels on a 1080p screen instead of 640x360) so faces and painted textures
// stay readable, while still reading as pixel art.
//
// The cloud sea over unexplored Spirit Realm islands is a raymarched
// heightfield ("fog") drawn once per low-res pixel into its own target.
import * as THREE from 'three';

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform float threshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float k = smoothstep(threshold, threshold + 0.55, l);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 dir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270270;
  s += texture2D(tSrc, vUv + dir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tSrc, vUv - dir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tSrc, vUv + dir * 3.2307692308).rgb * 0.0702702703;
  s += texture2D(tSrc, vUv - dir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(s, 1.0);
}
`;

const POST_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const POST_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tFog;
uniform vec2 rtSize;
uniform vec2 subpixel;
uniform float pixelScale;
uniform float depthRange;
uniform float persp;
uniform vec2 nearFar;
uniform float outlineAmt;
uniform vec2 edgeRange;
uniform vec3 outlineTint;
uniform float highlightAmt;
uniform vec2 screenSize;
uniform float vignette;
uniform vec3 vignetteColor;
uniform float saturation;
uniform vec3 grade;
uniform vec3 lift;
uniform float contrast;
uniform float bloomAmt;
uniform float haze;
uniform vec3 hazeColor;
uniform float flash;
uniform vec3 flashColor;
uniform vec3 iris;          // x, y (screen px), radius (px); radius < 0 = off
uniform float letterbox;    // 0..1 cinematic bars
uniform float fade;         // 0..1 fade to fadeColor (bayer-dithered in chunky pixels)
uniform vec3 fadeColor;
uniform float fogOn;
uniform float time;
uniform float warmth;       // golden-hour / lantern warmth push

float D(vec2 p) {
  float z = texture2D(tDepth, (p + 0.5) / rtSize).x;
  if (persp < 0.5) return z * depthRange;
  float n = nearFar.x, f = nearFar.y;
  return 2.0 * n * f / (f + n - (z * 2.0 - 1.0) * (f - n));
}
vec3 C(vec2 p) { return texture2D(tColor, (p + 0.5) / rtSize).rgb; }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 lp = floor(gl_FragCoord.xy / pixelScale + subpixel) + 1.0;
  vec3 col = C(lp);
  float d = D(lp);
  float dl = D(lp + vec2(-1.0, 0.0));
  float dr = D(lp + vec2(1.0, 0.0));
  float db = D(lp + vec2(0.0, -1.0));
  float dt = D(lp + vec2(0.0, 1.0));
  // Laplacian of depth: planar ramps cancel out, silhouettes and creases don't.
  float lap = (dl + dr + db + dt) - 4.0 * d;
  if (persp > 0.5) lap = lap / max(d, 0.02); // perspective: relative to how far away it is
  float edge = smoothstep(edgeRange.x, edgeRange.y, lap);
  float crease = smoothstep(edgeRange.x * 0.07, edgeRange.x * 0.3, lap) * (1.0 - edge);
  // tinted inner outline: darker and a little purple, never flat black
  col = mix(col, col * outlineTint, outlineAmt * edge);
  col *= 1.0 + highlightAmt * crease;
  vec2 buv = (lp - 0.5) / rtSize;
  vec3 bl = texture2D(tBloom, buv).rgb;
  col += bl * bloomAmt;
  if (fogOn > 0.5) {
    vec4 fg = texture2D(tFog, (lp + 0.5) / rtSize);
    col = mix(col, fg.rgb, fg.a);
  }
  // grade: lifted cool shadows, warm gain, gentle contrast
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, saturation);
  col = col * grade + lift * (1.0 - clamp(l * 1.6, 0.0, 1.0));
  col += warmth * vec3(0.06, 0.025, -0.03) * smoothstep(0.2, 0.9, l);
  col = mix(vec3(0.5), col, contrast);
  col = max(col, 0.0);
  vec2 uv = gl_FragCoord.xy / screenSize;
  // tilt-shift haze towards the top and bottom (miniature diorama feel)
  float ts = smoothstep(0.3, 0.52, abs(uv.y - 0.47));
  col = mix(col, mix(col, hazeColor, 0.3) + bl * 0.35, ts * haze);
  float v = smoothstep(0.95, 0.35, length((uv - 0.5) * vec2(1.0, 0.9)));
  col = mix(col * mix(vignetteColor, vec3(1.0), 0.35), col, mix(1.0 - vignette, 1.0, v));
  col = mix(col, flashColor, flash);
  // chunky pixel grid used by the wipes
  float px = pixelScale * 2.0;
  vec2 q = floor(gl_FragCoord.xy / px);
  if (iris.z >= 0.0) {
    vec2 qc = q * px + px * 0.5;
    float dq = length(qc - iris.xy);
    col *= step(dq, iris.z);
  }
  if (fade > 0.001) {
    float th = bayer8(q);
    col = mix(col, fadeColor, step(th, fade * 1.02 - 0.01));
  }
  if (letterbox > 0.001) {
    float bar = letterbox * 0.115 * screenSize.y;
    float yy = gl_FragCoord.y;
    if (yy < bar || yy > screenSize.y - bar) col = vec3(0.03, 0.02, 0.04);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------
// Cloud sea over unexplored ground (adapted from The Bear Must Eat's fog of the
// unexplored). A world-space mask (1 texel = 1 cell) grows a heightfield of
// billowing cloud tops; each low-res pixel's view ray is marched through it
// and shaded in a few chunky tones with ordered dithering.
const FOG_FRAG = /* glsl */ `
uniform sampler2D tDepth;
uniform vec2 rtSize;
uniform float time;
uniform sampler2D fogTex;
uniform sampler2D fogNoise;
uniform vec2 fogSize;
uniform vec2 fogOrigin;
uniform float fogCell;
uniform float fogTop;
uniform mat4 invVP;
uniform vec3 camDir;
uniform vec3 fogSun;
uniform vec3 fogLight;
uniform vec3 fogShade;
uniform vec3 fogRim;

vec4 fN(vec2 p) { return textureLod(fogNoise, p * 0.0625, 0.0); }
float fbayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float fbayer(vec2 a) { return fbayer2(0.5 * a) * 0.25 + fbayer2(a); }
vec2 fuv(vec2 xz) { return (xz - fogOrigin) / (fogSize * fogCell); }
vec3 fogField(vec2 xz) {
  vec2 cxz = xz / fogCell;
  vec4 nw = fN((cxz + time * vec2(0.09, 0.05)) * 0.11);
  vec2 t = textureLod(fogTex, fuv(xz + (nw.rg - 0.5) * 4.0 * fogCell), 1.6).rg;
  float g = t.g * 25.5;
  if (t.r < 0.003) return vec3(g - 9.0, 0.0, g);
  vec4 nb = fN((cxz + time * vec2(0.12, 0.05)) * 0.17 + 3.7);
  float sm = fN((cxz - time * vec2(0.07, -0.17)) * 0.42 + vec2(9.1, 5.3)).a;
  float big = max(nb.b, 0.3 + 0.35 * nb.g);
  float c = smoothstep(0.08, 0.5, t.r + (big - 0.45) * 0.35 + (sm - 0.5) * 0.25);
  float p = big * 0.8 + sm * 0.28;
  float h = fogTop * sqrt(c) * (0.38 + 0.7 * p);
  return vec3(g + h - (1.0 - c) * 0.9, c, g);
}
vec4 fogAt(vec2 lp, vec2 uv) {
  float z = textureLod(tDepth, uv, 0.0).x;
  vec4 wp = invVP * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  vec3 P = wp.xyz / wp.w;
  vec3 V = -camDir;
  float cy = max(0.08, V.y);
  // empty sky (no geometry): put the floor of the ray down at the cloud base
  if (z > 0.99999) { float tt = (P.y - (-6.0)) / max(0.08, -camDir.y); P = P + camDir * min(tt, 400.0); }
  float hTop = fogTop * 1.3;
  vec2 gP = textureLod(fogTex, fuv(P.xz), 0.0).rg;
  float g0 = gP.g * 25.5;
  vec2 far = P.xz + V.xz * max(0.0, (g0 + hTop - P.y) / cy);
  vec2 mid = mix(P.xz, far, 0.5);
  if (textureLod(fogTex, fuv(P.xz), 3.0).r + textureLod(fogTex, fuv(mid), 3.0).r + textureLod(fogTex, fuv(far), 3.0).r < 0.002) return vec4(0.0);
  float g1 = textureLod(fogTex, fuv(far), 1.0).g * 25.5;
  float g2 = textureLod(fogTex, fuv(mid), 1.0).g * 25.5;
  float gHi = max(max(g0, g1), g2), gLo = min(min(g0, g1), g2);
  float tTop = (gHi + hTop + 0.6 - P.y) / cy;
  float tBot = (gLo - 1.0 - P.y) / cy;
  const int N = 12;
  float st = (tTop - tBot) / float(N);
  float tHit = -1e5, tPrev = tTop;
  vec3 F = vec3(0.0);
  for (int i = 1; i <= N; i++) {
    float t = tTop - float(i) * st;
    vec3 q = P + V * t;
    vec3 f = fogField(q.xz);
    if (f.y > 0.01 && q.y < f.x) { tHit = t; F = f; break; }
    tPrev = t;
  }
  float dith = fbayer(lp);
  vec4 nwP = fN((P.xz / fogCell + time * vec2(0.09, 0.05)) * 0.11);
  vec2 pw = P.xz + (nwP.rg - 0.5) * 4.0 * fogCell;
  float cover = smoothstep(0.5, 0.8, textureLod(fogTex, fuv(pw), 0.0).r);
  float spill = textureLod(fogTex, fuv(pw), 2.6).r;
  vec2 wd = P.xz / fogCell + time * vec2(0.3, 0.1);
  float wisp = fN(vec2(wd.x * 0.32 + wd.y * 0.12, wd.y * 0.75 - wd.x * 0.1) + 1.3).g;
  float hAbove = P.y - g0;
  float mist = clamp(spill * 3.2 - 0.06, 0.0, 1.0) * smoothstep(1.2 + 2.6 * wisp, 0.0, hAbove) * smoothstep(0.3, 0.7, wisp + spill * 0.5);
  float veil = clamp(spill * 2.4 - 0.05, 0.0, 1.0) * smoothstep(0.5, 0.85, wisp) * smoothstep(fogTop * 1.2, 0.0, hAbove) * 0.6;
  mist = min(max(mist, veil), 0.8);
  bool front = tHit > -0.15, fake = false;
  if (tHit < -1e4 || (!front && cover < 0.01)) {
    if (mist < 0.02 && cover < 0.01) return vec4(0.0);
    if (cover < 0.01) {
      float ma = floor(mist * 4.0 + dith * 0.999) / 4.0;
      float mt = floor((0.45 + 0.5 * wisp) * 2.0 + dith) / 2.0;
      return vec4(mix(fogShade, fogLight, mt), ma);
    }
    if (tHit < -1e4) fake = true;
  }
  vec3 H;
  if (fake) {
    F = fogField(P.xz);
    H = vec3(P.x, F.x, P.z);
  } else {
    float ta = tPrev, tb = tHit;
    for (int k = 0; k < 3; k++) {
      float tm = 0.5 * (ta + tb);
      vec3 q = P + V * tm;
      vec3 f = fogField(q.xz);
      if (f.y > 0.01 && q.y < f.x) { tb = tm; F = f; } else ta = tm;
    }
    H = P + V * tb;
  }
  float e = 0.55 * fogCell;
  float hx = fogField(H.xz + vec2(e, 0.0)).x - F.x;
  float hz = fogField(H.xz + vec2(0.0, e)).x - F.x;
  vec3 nrm = normalize(vec3(-hx, e, -hz));
  float dif = clamp(dot(nrm, fogSun) * 0.8 + 0.2, 0.0, 1.0);
  vec2 sh2 = normalize(fogSun.xz);
  float slope = fogSun.y / max(0.2, length(fogSun.xz));
  float occ = fogField(H.xz + sh2 * 2.4 * fogCell).x - (H.y + 2.4 * fogCell * slope);
  float shadow = smoothstep(0.0, 1.6, occ);
  float hy = clamp((H.y - F.z) / fogTop, 0.0, 1.0);
  float v = 0.85 * dif + 0.5 * hy - 0.6 * shadow - (1.0 - F.y) * 0.2 - 0.26;
  v += 0.25 * smoothstep(0.55, 0.2, F.y) * smoothstep(0.3, 0.8, dif);
  float tone = clamp(floor(v * 4.2 + 0.3 + (dith - 0.5) * 0.5), 0.0, 4.0);
  vec3 deep = mix(fogShade * vec3(0.84, 0.8, 0.92), vec3(0.42, 0.33, 0.5), 0.2);
  vec3 col = tone < 0.5 ? deep : tone < 1.5 ? fogShade : tone < 2.5 ? mix(fogShade, fogLight, 0.45) : tone < 3.5 ? mix(fogLight, fogShade, 0.1) : fogRim;
  float a = smoothstep(0.03, 0.4, F.y);
  a = floor(a * 4.0 + dith * 0.999) / 4.0;
  if (!front) a = 0.0;
  a = max(a, cover > 0.01 ? clamp(floor(cover * 4.0 + dith * 0.999) / 4.0, 0.0, 1.0) : 0.0);
  float ma = floor(mist * 4.0 + dith * 0.999) / 4.0;
  vec3 mc = mix(fogShade, fogLight, floor((0.45 + 0.5 * wisp) * 2.0 + dith) / 2.0);
  float ao = a + ma * (1.0 - a);
  col = ao > 0.0 ? (col * a + mc * ma * (1.0 - a)) / ao : col;
  return vec4(col, ao);
}
void main() {
  vec2 lp = floor(gl_FragCoord.xy);
  gl_FragColor = fogAt(lp, (lp + 0.5) / rtSize);
}
`;

let _fogNoise = null;
function fogNoiseTexture() {
  if (_fogNoise) return _fogNoise;
  const S = 128, C = 8, P = S / C, d = new Uint8Array(S * S * 4);
  const hash = (x, z, k) => { let h = (x * 374761393 + z * 668265263 + k * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let k = 0; k < 2; k++)
    for (let z = 0; z < S; z++)
      for (let x = 0; x < S; x++) {
        const gx = Math.floor(x / C), gz = Math.floor(z / C), u = q((x % C) / C), v = q((z % C) / C);
        const h = (i, j) => hash((gx + i) % P, (gz + j) % P, k + 1);
        const n = (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
        d[(z * S + x) * 4 + k] = Math.round(n * 255);
      }
  const domes = (k, count, r0, r1) => {
    const hf = new Float32Array(S * S);
    let seed = k * 7919 + 13;
    const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
    for (let i = 0; i < count; i++) {
      const cx = rnd() * S, cz = rnd() * S, r = r0 + (r1 - r0) * rnd() * rnd(), top = 0.55 + 0.45 * (r - r0) / (r1 - r0);
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dd = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r);
          if (dd >= 1) continue;
          const j = ((z + S) % S) * S + ((x + S) % S);
          hf[j] = Math.max(hf[j], top * Math.sqrt(1 - dd));
        }
    }
    for (let j = 0; j < S * S; j++) d[j * 4 + k] = Math.round(Math.min(1, hf[j]) * 255);
  };
  domes(2, 70, 7, 18);
  domes(3, 260, 3.5, 8);
  const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return (_fogNoise = t);
}

// Colour-grade presets. The game blends between them (world changes, time of
// day, story moods).
export const GRADES = {
  // The Bear Must Eat's cozy grade is the base for everything: warm gain,
  // lifted violet shadows, tinted outlines, tilt-shift haze, soft bloom.
  // Human World: the same warmth, a hair less saturated, slightly cooler lift
  human: { saturation: 1.32, grade: [1.03, 1.0, 0.96], lift: [0.014, 0.01, 0.036], contrast: 1.08, vignette: 0.3, vignetteColor: [0.55, 0.42, 0.62], haze: 0.15, hazeColor: [1.0, 0.9, 0.8], outlineTint: [0.36, 0.3, 0.42], warmth: 0.05, bloom: 0.42 },
  humanDusk: { saturation: 1.38, grade: [1.05, 0.99, 0.95], lift: [0.028, 0.014, 0.056], contrast: 1.09, vignette: 0.32, vignetteColor: [0.55, 0.38, 0.6], haze: 0.15, hazeColor: [1.0, 0.8, 0.72], outlineTint: [0.4, 0.3, 0.42], warmth: 0.18, bloom: 0.6 },
  humanNight: { saturation: 1.3, grade: [0.97, 0.98, 1.06], lift: [0.02, 0.018, 0.07], contrast: 1.06, vignette: 0.42, vignetteColor: [0.3, 0.26, 0.5], haze: 0.24, hazeColor: [0.36, 0.36, 0.6], outlineTint: [0.3, 0.28, 0.44], warmth: 0.0, bloom: 0.62 },
  // Spirit Realm: warmer, more saturated, golden haze
  spirit: { saturation: 1.34, grade: [1.05, 1.0, 0.93], lift: [0.03, 0.012, 0.05], contrast: 1.04, vignette: 0.28, vignetteColor: [0.62, 0.45, 0.62], haze: 0.28, hazeColor: [1.0, 0.88, 0.74], outlineTint: [0.42, 0.3, 0.4], warmth: 0.3, bloom: 0.5 },
  spiritDusk: { saturation: 1.3, grade: [1.08, 0.97, 0.9], lift: [0.04, 0.012, 0.06], contrast: 1.05, vignette: 0.36, vignetteColor: [0.55, 0.35, 0.55], haze: 0.32, hazeColor: [1.0, 0.75, 0.62], outlineTint: [0.42, 0.28, 0.4], warmth: 0.55, bloom: 0.66 },
  // the sad train ride: still warm and readable, a touch quieter and bluer
  melancholy: { saturation: 1.12, grade: [1.01, 1.0, 1.0], lift: [0.02, 0.018, 0.048], contrast: 1.06, vignette: 0.36, vignetteColor: [0.42, 0.4, 0.6], haze: 0.14, hazeColor: [0.9, 0.88, 0.92], outlineTint: [0.36, 0.32, 0.44], warmth: 0.0, bloom: 0.4 },
  // interiors lit by warm bulbs (TBME's homes / lab)
  cozy: { saturation: 1.22, grade: [1.04, 1.0, 0.94], lift: [0.03, 0.014, 0.05], contrast: 1.05, vignette: 0.34, vignetteColor: [0.55, 0.4, 0.55], haze: 0.18, hazeColor: [1.0, 0.86, 0.72], outlineTint: [0.4, 0.3, 0.38], warmth: 0.3, bloom: 0.48 },
};


export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    }));
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.BasicShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.autoClear = true;

    this.pixelScale = 2;
    this.pixelDensity = 1; // user setting: <1 chunkier, >1 finer
    this.lowW = 1; this.lowH = 1;
    this.rtW = 3; this.rtH = 3;
    this.rt = null;
    this.bloomOn = true;
    this.bloomStrength = 0.42;
    this.gradeFrom = { ...GRADES.human };
    this.gradeCur = { ...GRADES.human };

    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const mkPass = (frag, uniforms, vert = FS_VERT) => {
      const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
      const scene = new THREE.Scene();
      const q = new THREE.Mesh(quadGeo, mat);
      q.frustumCulled = false;
      scene.add(q);
      return { mat, scene };
    };
    this.brightPass = mkPass(BRIGHT_FRAG, { tColor: { value: null }, threshold: { value: 0.88 } });
    this.blurPass = mkPass(BLUR_FRAG, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });

    const U = (this.uniforms = {
      tColor: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tFog: { value: null },
      rtSize: { value: new THREE.Vector2(1, 1) }, subpixel: { value: new THREE.Vector2() },
      pixelScale: { value: 2 }, depthRange: { value: 1 }, persp: { value: 0 }, nearFar: { value: new THREE.Vector2(1, 600) },
      outlineAmt: { value: 0.6 }, edgeRange: { value: new THREE.Vector2(0.07, 0.2) },
      outlineTint: { value: new THREE.Vector3(0.36, 0.32, 0.42) }, highlightAmt: { value: 0.1 },
      screenSize: { value: new THREE.Vector2(1, 1) },
      vignette: { value: 0.3 }, vignetteColor: { value: new THREE.Vector3(0.45, 0.4, 0.55) },
      saturation: { value: 1.05 }, grade: { value: new THREE.Vector3(1.02, 1, 0.97) },
      lift: { value: new THREE.Vector3(0.012, 0.012, 0.04) }, contrast: { value: 1.05 },
      bloomAmt: { value: 0.4 }, haze: { value: 0.2 }, hazeColor: { value: new THREE.Vector3(0.95, 0.9, 0.85) },
      flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) },
      iris: { value: new THREE.Vector3(0, 0, -1) }, letterbox: { value: 0 },
      fade: { value: 0 }, fadeColor: { value: new THREE.Color(0, 0, 0) },
      fogOn: { value: 0 }, time: { value: 0 }, warmth: { value: 0 },
      // cloud sea
      fogTex: { value: null }, fogNoise: { value: null }, fogSize: { value: new THREE.Vector2(1, 1) },
      fogOrigin: { value: new THREE.Vector2(0, 0) }, fogCell: { value: 1 }, fogTop: { value: 4.5 },
      invVP: { value: new THREE.Matrix4() }, camDir: { value: new THREE.Vector3(0, -1, 0) },
      fogLight: { value: new THREE.Vector3(1.0, 0.97, 0.93) }, fogShade: { value: new THREE.Vector3(0.78, 0.72, 0.84) },
      fogRim: { value: new THREE.Vector3(1, 1, 1) }, fogSun: { value: new THREE.Vector3(0, 1, 0) },
    });
    this.postScene = new THREE.Scene();
    this.postMat = new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: POST_FRAG, uniforms: U, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(quadGeo, this.postMat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
    const fu = {};
    for (const k of ['tDepth', 'rtSize', 'time', 'fogTex', 'fogNoise', 'fogSize', 'fogOrigin', 'fogCell', 'fogTop', 'invVP', 'camDir', 'fogSun', 'fogLight', 'fogShade', 'fogRim']) fu[k] = U[k];
    this.fogPass = { mat: new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: FOG_FRAG, uniforms: fu, depthTest: false, depthWrite: false }), scene: new THREE.Scene(), rt: null };
    const fq = new THREE.Mesh(quadGeo, this.fogPass.mat);
    fq.frustumCulled = false;
    this.fogPass.scene.add(fq);
    this.setGrade('human', 0);
  }

  resize(cssW, cssH, dpr) {
    const W = Math.max(1, Math.floor(cssW * dpr));
    const H = Math.max(1, Math.floor(cssH * dpr));
    this.W = W; this.H = H; this.dpr = dpr;
    this.renderer.setSize(W, H, false);
    const diag = Math.sqrt(W * W + H * H);
    const target = 1100 * this.pixelDensity; // low-res diagonal we aim for
    this.pixelScale = Math.max(2, Math.round(diag / target));
    if (diag < 900) this.pixelScale = Math.max(1, Math.round(diag / target)); // tiny windows
    this.lowW = Math.ceil(W / this.pixelScale);
    this.lowH = Math.ceil(H / this.pixelScale);
    this.rtW = this.lowW + 2;
    this.rtH = this.lowH + 2;
    if (this.rt) { this.rt.depthTexture.dispose(); this.rt.dispose(); this.bloomA.dispose(); this.bloomB.dispose(); }
    const depthTexture = new THREE.DepthTexture(this.rtW, this.rtH);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.minFilter = depthTexture.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(this.rtW, this.rtH, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: true, depthTexture,
    });
    const bw = Math.max(1, Math.ceil(this.rtW / 2)), bh = Math.max(1, Math.ceil(this.rtH / 2));
    const bopt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false };
    this.bloomA = new THREE.WebGLRenderTarget(bw, bh, bopt);
    this.bloomB = new THREE.WebGLRenderTarget(bw, bh, bopt);
    this.bloomTexel = new THREE.Vector2(1 / bw, 1 / bh);
    const u = this.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    u.tBloom.value = this.bloomA.texture;
    u.rtSize.value.set(this.rtW, this.rtH);
    u.pixelScale.value = this.pixelScale;
    u.screenSize.value.set(W, H);
  }

  // ---- colour grade: blend to a preset over `dur` seconds
  setGrade(name, dur = 1.5) {
    const g = typeof name === 'string' ? GRADES[name] : name;
    if (!g) return;
    this.gradeFrom = JSON.parse(JSON.stringify(this.gradeCur));
    this.gradeTo = JSON.parse(JSON.stringify(g));
    this.gradeT = 0;
    this.gradeDur = Math.max(0.0001, dur);
    if (dur <= 0) { this.gradeT = 1; this._applyGrade(1); }
  }
  _applyGrade(k) {
    const A = this.gradeFrom, B = this.gradeTo, C = this.gradeCur, u = this.uniforms;
    const L = (a, b) => a + (b - a) * k;
    for (const key of Object.keys(B)) {
      if (Array.isArray(B[key])) C[key] = B[key].map((v, i) => L(A[key]?.[i] ?? v, v));
      else C[key] = L(A[key] ?? B[key], B[key]);
    }
    u.saturation.value = C.saturation;
    u.grade.value.fromArray(C.grade);
    u.lift.value.fromArray(C.lift);
    u.contrast.value = C.contrast;
    u.vignette.value = C.vignette;
    u.vignetteColor.value.fromArray(C.vignetteColor);
    u.haze.value = C.haze;
    u.hazeColor.value.fromArray(C.hazeColor);
    u.outlineTint.value.fromArray(C.outlineTint);
    u.warmth.value = C.warmth;
    this.bloomStrength = C.bloom;
  }
  updateGrade(dt) {
    if (this.gradeT >= 1 || !this.gradeTo) return;
    this.gradeT = Math.min(1, this.gradeT + dt / this.gradeDur);
    const t = this.gradeT, k = t * t * (3 - 2 * t);
    this._applyGrade(k);
  }

  // ---- cloud sea over unexplored islands
  setFog(tex, w, h, { origin = [0, 0], cell = 1, top = 4.5 } = {}) {
    const u = this.uniforms;
    if (tex && !tex.generateMipmaps) {
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    }
    if (tex && !u.fogNoise.value) u.fogNoise.value = fogNoiseTexture();
    u.fogTex.value = tex;
    u.fogSize.value.set(w || 1, h || 1);
    u.fogOrigin.value.set(origin[0], origin[1]);
    u.fogCell.value = cell;
    u.fogTop.value = top;
    u.fogOn.value = tex ? 1 : 0;
  }
  setFogColors(light, shade, rim = null) {
    const u = this.uniforms;
    u.fogLight.value.set(light[0], light[1], light[2]);
    u.fogShade.value.set(shade[0], shade[1], shade[2]);
    const r = rim || light.map((c) => Math.min(1, c * 1.15 + 0.05));
    u.fogRim.value.set(r[0], r[1], r[2]);
  }

  setIris(cssX, cssY, radius) {
    const u = this.uniforms.iris.value;
    if (radius == null || radius < 0) { u.z = -1; return; }
    const dpr = this.dpr || 1;
    u.set(cssX * dpr, this.H - cssY * dpr, radius * dpr);
  }
  setEdges(lo, hi) { this.uniforms.edgeRange.value.set(lo, hi); }

  render(scene, cameraRig, time) {
    const r = this.renderer;
    const cam = cameraRig.camera;
    const u = this.uniforms;
    u.subpixel.value.copy(cameraRig.subpixel);
    u.depthRange.value = cam.far - cam.near;
    u.persp.value = cam.isPerspectiveCamera ? 1 : 0;
    u.nearFar.value.set(cam.near, cam.far);
    u.time.value = time;
    if (u.fogOn.value) {
      u.invVP.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse);
      u.camDir.value.set(0, 0, -1).transformDirection(cam.matrixWorld);
      const e = cam.matrixWorld.elements, sun = u.fogSun.value;
      const fx = -e[8], fz = -e[10], fl = Math.hypot(fx, fz) || 1;
      sun.set(-e[0] * 0.75 + (fx / fl) * 0.65, 1.1, -e[2] * 0.75 + (fz / fl) * 0.65).normalize();
    }
    r.setRenderTarget(this.rt);
    r.render(scene, cam);
    if (u.fogOn.value) {
      const F = this.fogPass;
      if (!F.rt || F.rt.width !== this.rtW || F.rt.height !== this.rtH) {
        F.rt?.dispose();
        F.rt = new THREE.WebGLRenderTarget(this.rtW, this.rtH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false });
        u.tFog.value = F.rt.texture;
      }
      r.setRenderTarget(F.rt);
      r.render(F.scene, this.fsCam);
    }
    if (this.bloomOn) {
      this.brightPass.mat.uniforms.tColor.value = this.rt.texture;
      r.setRenderTarget(this.bloomA);
      r.render(this.brightPass.scene, this.fsCam);
      const bu = this.blurPass.mat.uniforms;
      for (let i = 0; i < 2; i++) {
        bu.tSrc.value = this.bloomA.texture; bu.dir.value.set(this.bloomTexel.x * (1 + i), 0);
        r.setRenderTarget(this.bloomB); r.render(this.blurPass.scene, this.fsCam);
        bu.tSrc.value = this.bloomB.texture; bu.dir.value.set(0, this.bloomTexel.y * (1 + i));
        r.setRenderTarget(this.bloomA); r.render(this.blurPass.scene, this.fsCam);
      }
      u.bloomAmt.value = this.bloomStrength;
    } else u.bloomAmt.value = 0;
    r.setRenderTarget(null);
    r.render(this.postScene, this.fsCam);
  }

  // render an offscreen scene to a canvas (icons, phone screens, portraits)
  renderToCanvas(scene, camera, w, h, canvas) {
    const r = this.renderer;
    if (!this._offRT || this._offRT.width !== w || this._offRT.height !== h) {
      this._offRT?.dispose();
      this._offRT = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
      this._offBuf = new Uint8Array(w * h * 4);
    }
    const prevClear = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this._offRT);
    r.render(scene, camera);
    r.readRenderTargetPixels(this._offRT, 0, 0, w, h, this._offBuf);
    r.setRenderTarget(null);
    r.setClearAlpha(prevClear);
    const c = canvas || document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(this._offBuf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
