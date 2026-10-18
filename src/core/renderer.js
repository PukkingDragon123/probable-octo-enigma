// Pixel renderer: the 3D scene is drawn into a small render target, then a
// low-res composite pass adds thin anime ink lines, the characters' rim
// light, soft bloom, a per-world colour grade, tilt-shift haze and vignette,
// and a screen pass upscales it with nearest-neighbour filtering under
// flashes, letterbox bars, fades and an iris wipe. A 1px margin lets the
// camera snap to whole texels while the leftover sub-pixel offset is applied
// when blitting (smooth camera motion with no pixel crawl).
//
// Kodamaya runs a finer grid than The Bear Must Eat (about 960x540 low-res
// pixels on a 1080p screen instead of 640x360) so faces and painted textures
// stay readable, while still reading as pixel art. ?px=N (setPixelScale)
// renders N screen pixels per low-res pixel at the same framing: ?px=1 is
// full resolution, about 4x the fragment work of the default on 1080p.
//
// The cloud sea over unexplored Spirit Realm islands is a raymarched
// heightfield ("fog") drawn once per low-res pixel into its own target.
import * as THREE from 'three';
import { ANIME } from './materials.js';

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

// Low-res composite, one fragment per low-res pixel (so the outline taps cost
// a quarter of what they would at screen resolution): anime ink lines, the
// characters' rim light, bloom, the cloud sea, the colour grade, tilt-shift
// haze and vignette.
//
// Ink: 1 low-res pixel (2 with ?px= finer pixels) on the near side of depth
// discontinuities (the depth Laplacian is positive there; planar ramps
// cancel out), so silhouettes of characters and props against what is
// behind them get a clean line while flat walls, floors, painted planes and
// face planes (polygon-offset onto their surface) get none. The gap has to
// clear a threshold in world units (relative to distance in first person)
// sized above a voxel step, so the voxel grid doesn't turn into a mesh of
// lines; characters (class actor in the colour target's alpha, see
// materials.js OUTLINE) take a finer threshold so arms in front of bodies
// still read, pixel sprites only get their big silhouettes and dither-faded
// cutaways none. A second, wider test finds strong convex creases (box
// edges, eaves) that hold over a few pixels on both sides. Lines fade out
// behind the focus and are mixed in perceptual (sqrt) space so they stay
// light.
const COMP_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tFog;
uniform vec2 rtSize;
uniform vec2 lowSize;       // screen size in low-res pixels
uniform float depthRange;
uniform float persp;
uniform vec2 nearFar;
uniform vec2 edgeRange;     // silhouette gap thresholds (world units; relative in perspective)
uniform float lineAmt;      // ink opacity (grade x zoom)
uniform float lineW;        // line width in low-res pixels (2 when rendering finer pixels, ?px=)
uniform vec3 inkColor;
uniform float focusDepth;   // linear depth of the camera target
uniform vec2 lineFade;      // lines fade out between these depths behind the focus
uniform vec3 crease;        // x: amount, y: tap radius (px), z: threshold (world units over the radius)
uniform vec2 rimDir;        // screen direction (low-res px) of the rim-lit side
uniform vec3 rimColor;
uniform float rimAmt;
uniform float vignette;
uniform vec3 vignetteColor;
uniform float saturation;
uniform vec3 grade;
uniform vec3 lift;
uniform float contrast;
uniform float bloomAmt;
uniform float haze;
uniform vec3 hazeColor;
uniform float fogOn;
uniform float warmth;       // golden-hour / lantern warmth push

float D(vec2 p) {
  float z = texture2D(tDepth, (p + 0.5) / rtSize).x;
  if (persp < 0.5) return z * depthRange;
  float n = nearFar.x, f = nearFar.y;
  return 2.0 * n * f / (f + n - (z * 2.0 - 1.0) * (f - n));
}

void main() {
  vec2 lp = floor(gl_FragCoord.xy);
  vec4 c4 = texture2D(tColor, (lp + 0.5) / rtSize);
  vec3 col = c4.rgb;
  float cls = c4.a;
  float d = D(lp);
  float dl = D(lp + vec2(-1.0, 0.0));
  float dr = D(lp + vec2(1.0, 0.0));
  float db = D(lp + vec2(0.0, -1.0));
  float dt = D(lp + vec2(0.0, 1.0));
  float sc = persp > 0.5 ? 1.0 / max(d, 0.02) : 1.0;
  // per-axis depth Laplacian: > 0 on the near side of a step
  float gap = max(dl + dr - 2.0 * d, db + dt - 2.0 * d);
  if (lineW > 1.5) gap = max(gap, max(D(lp + vec2(-2.0, 0.0)) + D(lp + vec2(2.0, 0.0)), D(lp + vec2(0.0, -2.0)) + D(lp + vec2(0.0, 2.0))) - 2.0 * d);
  gap *= sc;
  bool actor = cls > 0.6 && cls < 0.9;
  float thr = cls > 0.9 ? 1.0 : actor ? 0.8 : cls > 0.35 ? 2.4 : 1e6;
  float edge = smoothstep(edgeRange.x * thr, edgeRange.y * thr, gap);
  if (crease.x > 0.001 && cls > 0.9) {
    float R = crease.y;
    float wx = D(lp + vec2(-R, 0.0)) + D(lp + vec2(R, 0.0)) - 2.0 * d;
    float wy = D(lp + vec2(0.0, -R)) + D(lp + vec2(0.0, R)) - 2.0 * d;
    float cw = max(wx, wy) * sc;
    edge = max(edge, crease.x * smoothstep(crease.z, crease.z * 1.6, cw) * step(edgeRange.x * 0.12, gap));
  }
  float behind = d - focusDepth;
  edge *= lineAmt * (cls > 0.35 && cls < 0.6 ? 0.7 : 1.0) * (1.0 - smoothstep(lineFade.x, lineFade.y, behind));
  // rim light: the pixel just inside a character's silhouette on the side away from the key
  if (actor && rimAmt > 0.001) {
    vec2 o2 = floor(rimDir * 2.0 * lineW + 0.5);
    float g2 = (D(lp + o2) - d) * sc;
    float rk = smoothstep(edgeRange.x * 0.6, edgeRange.y * 0.6, g2) * (1.0 - step(0.01, edge));
    col += rimColor * rimAmt * rk;
  }
  vec3 bl = texture2D(tBloom, (lp - 0.5) / rtSize).rgb;
  col += bl * bloomAmt;
  if (fogOn > 0.5) {
    vec4 fg = texture2D(tFog, (lp + 0.5) / rtSize);
    col = mix(col, fg.rgb, fg.a);
    edge *= 1.0 - fg.a;
  }
  // grade: clean saturation, a whisper of lift in the darks, warm gain
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, saturation);
  col = col * grade + lift * (1.0 - clamp(l * 1.6, 0.0, 1.0));
  col += warmth * vec3(0.06, 0.025, -0.03) * smoothstep(0.2, 0.9, l);
  col = mix(vec3(0.5), col, contrast);
  col = max(col, 0.0);
  // ink, mixed in sqrt (roughly perceptual) space
  vec3 gs = mix(sqrt(col), sqrt(inkColor), clamp(edge, 0.0, 1.0));
  col = gs * gs;
  vec2 uv = (lp - 0.5) / lowSize;
  // tilt-shift haze towards the top and bottom (miniature diorama feel)
  float ts = smoothstep(0.32, 0.54, abs(uv.y - 0.47));
  col = mix(col, mix(col, hazeColor, 0.3) + bl * 0.35, ts * haze);
  float v = smoothstep(0.95, 0.35, length((uv - 0.5) * vec2(1.0, 0.9)));
  col = mix(col * mix(vignetteColor, vec3(1.0), 0.35), col, mix(1.0 - vignette, 1.0, v));
  gl_FragColor = vec4(col, 1.0);
}
`;

// Screen pass: nearest-neighbour upscale of the composite with the camera's
// sub-pixel offset, then flashes, the iris wipe, dithered fades and letterbox.
const POST_FRAG = /* glsl */ `
uniform sampler2D tComp;
uniform vec2 rtSize;
uniform vec2 subpixel;
uniform float pixelScale;
uniform vec2 screenSize;
uniform float flash;
uniform vec3 flashColor;
uniform vec3 iris;          // x, y (screen px), radius (px); radius < 0 = off
uniform float letterbox;    // 0..1 cinematic bars
uniform float fade;         // 0..1 fade to fadeColor (bayer-dithered in chunky pixels)
uniform vec3 fadeColor;

float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 lp = floor(gl_FragCoord.xy / pixelScale + subpixel) + 1.0;
  vec3 col = texture2D(tComp, (lp + 0.5) / rtSize).rgb;
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
// day, story moods). Anime first: clean saturated colour, shade that is a
// tint rather than a darkening, light ink lines, a soft vignette and only a
// breath of tilt-shift haze.
//   shade: linear tint multiplied into the albedo wherever the key light
//          doesn't reach (materials.js ANIME.kShade)
//   ink / line: outline colour (sRGB) and opacity
//   rim / rimAmt: the characters' rim light (sRGB colour, strength)
export const GRADES = {
  // Human World by day: crisp, bright, cool lavender shade
  human: { saturation: 1.16, grade: [1.02, 1.0, 0.98], lift: [0.004, 0.004, 0.014], contrast: 1.06, vignette: 0.14, vignetteColor: [0.6, 0.52, 0.72], haze: 0.07, hazeColor: [1.0, 0.95, 0.9], warmth: 0.04, bloom: 0.36, shade: [0.72, 0.71, 0.96], ink: [0.11, 0.086, 0.15], line: 0.88, rim: [1.0, 0.96, 0.88], rimAmt: 0.16 },
  // golden hour: warm light, violet shade
  humanDusk: { saturation: 1.18, grade: [1.03, 0.995, 0.97], lift: [0.008, 0.004, 0.024], contrast: 1.07, vignette: 0.16, vignetteColor: [0.6, 0.46, 0.68], haze: 0.07, hazeColor: [1.0, 0.88, 0.8], warmth: 0.1, bloom: 0.46, shade: [0.66, 0.6, 0.94], ink: [0.12, 0.08, 0.15], line: 0.88, rim: [1.0, 0.88, 0.74], rimAmt: 0.18 },
  // night: deep blue shade, lamps carry the colour
  humanNight: { saturation: 1.2, grade: [0.98, 0.99, 1.04], lift: [0.008, 0.01, 0.03], contrast: 1.05, vignette: 0.22, vignetteColor: [0.34, 0.3, 0.56], haze: 0.1, hazeColor: [0.4, 0.42, 0.66], warmth: 0.0, bloom: 0.58, shade: [0.58, 0.62, 0.98], ink: [0.07, 0.06, 0.13], line: 0.84, rim: [0.74, 0.82, 1.0], rimAmt: 0.16 },
  // Spirit Realm: warmer, more saturated, rose-violet shade, golden air
  spirit: { saturation: 1.2, grade: [1.03, 1.0, 0.96], lift: [0.01, 0.004, 0.02], contrast: 1.05, vignette: 0.12, vignetteColor: [0.66, 0.5, 0.68], haze: 0.1, hazeColor: [1.0, 0.9, 0.8], warmth: 0.18, bloom: 0.44, shade: [0.78, 0.66, 0.96], ink: [0.13, 0.08, 0.14], line: 0.86, rim: [1.0, 0.92, 0.76], rimAmt: 0.18 },
  spiritDusk: { saturation: 1.18, grade: [1.05, 0.98, 0.93], lift: [0.014, 0.004, 0.028], contrast: 1.06, vignette: 0.18, vignetteColor: [0.6, 0.4, 0.62], haze: 0.12, hazeColor: [1.0, 0.8, 0.7], warmth: 0.3, bloom: 0.56, shade: [0.7, 0.56, 0.92], ink: [0.13, 0.07, 0.13], line: 0.86, rim: [1.0, 0.84, 0.66], rimAmt: 0.2 },
  // the sad train ride: still clean and readable, a touch quieter and bluer
  melancholy: { saturation: 1.06, grade: [1.0, 1.0, 1.01], lift: [0.008, 0.008, 0.022], contrast: 1.05, vignette: 0.18, vignetteColor: [0.44, 0.42, 0.62], haze: 0.05, hazeColor: [0.9, 0.9, 0.94], warmth: 0.0, bloom: 0.36, shade: [0.66, 0.68, 0.94], ink: [0.1, 0.086, 0.15], line: 0.88, rim: [0.9, 0.94, 1.0], rimAmt: 0.14 },
  // interiors lit by warm bulbs: honey light, cool violet shade
  cozy: { saturation: 1.14, grade: [1.03, 1.0, 0.97], lift: [0.01, 0.006, 0.022], contrast: 1.05, vignette: 0.16, vignetteColor: [0.58, 0.46, 0.62], haze: 0.05, hazeColor: [1.0, 0.9, 0.8], warmth: 0.08, bloom: 0.42, shade: [0.72, 0.64, 0.92], ink: [0.12, 0.08, 0.14], line: 0.88, rim: [1.0, 0.9, 0.76], rimAmt: 0.16 },
};

const _v3 = new THREE.Vector3(), _f3 = new THREE.Vector3(), _r3 = new THREE.Vector3();

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
    // finer (or chunkier) pixels at the same framing: ?px=N or setPixelScale(N)
    // forces N screen pixels per low-res pixel; basePixelScale is what the
    // game is framed for, fine = basePixelScale / pixelScale (the camera
    // divides its world-units-per-pixel by it)
    this.forcePixelScale = Math.max(0, Math.round(+new URLSearchParams(globalThis.location?.search || '').get('px') || 0));
    this.basePixelScale = 2;
    this.fine = 1;
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
      tColor: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tFog: { value: null }, tComp: { value: null },
      rtSize: { value: new THREE.Vector2(1, 1) }, lowSize: { value: new THREE.Vector2(1, 1) }, subpixel: { value: new THREE.Vector2() },
      pixelScale: { value: 2 }, depthRange: { value: 1 }, persp: { value: 0 }, nearFar: { value: new THREE.Vector2(1, 600) },
      // ink lines (see COMP_FRAG)
      edgeRange: { value: new THREE.Vector2(0.08, 0.14) }, lineAmt: { value: 0.7 }, lineW: { value: 1 }, inkColor: { value: new THREE.Color(0.012, 0.008, 0.02) },
      focusDepth: { value: 119 }, lineFade: { value: new THREE.Vector2(8, 30) }, crease: { value: new THREE.Vector3(0, 6, 0.1) },
      rimDir: { value: new THREE.Vector2(1, 0.3) }, rimColor: { value: new THREE.Color(1, 0.95, 0.85) }, rimAmt: { value: 0.2 },
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
    // line knobs outside the grade: zoom fade (setEdges), strong-crease
    // strength, and the key light's direction for the rim side (setKeyLight)
    this.lineZoom = 1;
    this.creaseAmt = 0.5;
    this.keyDir = new THREE.Vector3(-0.4, 0.8, 0.45).normalize();
    this.compPass = mkPass(COMP_FRAG, U, POST_VERT);
    this.compRT = null;
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
    let ps = Math.max(2, Math.round(diag / target));
    if (diag < 900) ps = Math.max(1, Math.round(diag / target)); // tiny windows
    this.basePixelScale = ps;
    this.pixelScale = this.forcePixelScale || ps;
    this.fine = ps / this.pixelScale;
    this._size = [cssW, cssH, dpr];
    this.lowW = Math.ceil(W / this.pixelScale);
    this.lowH = Math.ceil(H / this.pixelScale);
    this.rtW = this.lowW + 2;
    this.rtH = this.lowH + 2;
    if (this.rt) { this.rt.depthTexture.dispose(); this.rt.dispose(); this.bloomA.dispose(); this.bloomB.dispose(); this.compRT.dispose(); }
    const depthTexture = new THREE.DepthTexture(this.rtW, this.rtH);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.minFilter = depthTexture.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(this.rtW, this.rtH, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: true, depthTexture,
    });
    this.compRT = new THREE.WebGLRenderTarget(this.rtW, this.rtH, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false,
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
    u.tComp.value = this.compRT.texture;
    u.rtSize.value.set(this.rtW, this.rtH);
    u.lowSize.value.set(W / this.pixelScale, H / this.pixelScale);
    u.pixelScale.value = this.pixelScale;
    u.screenSize.value.set(W, H);
  }

  // render N screen pixels per low-res pixel (0 = automatic); same framing
  setPixelScale(n = 0) {
    this.forcePixelScale = Math.max(0, Math.round(n));
    if (this._size) this.resize(...this._size);
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
    u.warmth.value = C.warmth;
    this.bloomStrength = C.bloom;
    const sh = ANIME.kShade.value, st = C.shade || GRADES.human.shade;
    sh.x = st[0]; sh.y = st[1]; sh.z = st[2];
    const ink = C.ink || GRADES.human.ink, rim = C.rim || GRADES.human.rim;
    u.inkColor.value.setRGB(ink[0], ink[1], ink[2], THREE.SRGBColorSpace);
    u.rimColor.value.setRGB(rim[0], rim[1], rim[2], THREE.SRGBColorSpace);
    u.rimAmt.value = C.rimAmt ?? 0.2;
    this.lineGrade = C.line ?? 0.7;
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
  // ink thresholds (world-unit depth gaps; relative in perspective), line
  // opacity for this zoom, and how far behind the focus lines fade out
  setEdges(lo, hi, amt = 1, fadeFrom = 8, fadeTo = 30) {
    const u = this.uniforms;
    u.edgeRange.value.set(lo, hi);
    u.lineFade.value.set(fadeFrom, fadeTo);
    this.lineZoom = amt;
  }
  // the key light's direction (towards the light): the rim light goes on the
  // characters' far side from it
  setKeyLight(dir) { this.keyDir.copy(dir); }

  render(scene, cameraRig, time) {
    const r = this.renderer;
    const cam = cameraRig.camera;
    const u = this.uniforms;
    u.subpixel.value.copy(cameraRig.subpixel);
    u.depthRange.value = cam.far - cam.near;
    u.persp.value = cam.isPerspectiveCamera ? 1 : 0;
    u.nearFar.value.set(cam.near, cam.far);
    u.time.value = time;
    // ink: focus depth for the distance fade, crease taps sized in world units,
    // rim side from the key light seen on screen
    const e = cam.matrixWorld.elements;
    _f3.set(-e[8], -e[9], -e[10]); _r3.set(e[0], e[1], e[2]);
    const tgt = cameraRig.pov ? cameraRig.pov.look : cameraRig.target;
    const fd = _v3.copy(tgt).sub(cam.position).dot(_f3);
    u.focusDepth.value = cam.isPerspectiveCamera ? fd : fd - cam.near;
    u.lineAmt.value = (this.lineGrade ?? 0.7) * this.lineZoom;
    u.lineW.value = this.fine >= 1.5 ? 2 : 1;
    if (cam.isPerspectiveCamera) u.crease.value.x = 0;
    else {
      const wupp = (cam.right - cam.left) / this.rtW;
      const R = Math.max(3, Math.min(16, Math.round(0.15 / wupp)));
      u.crease.value.set(this.creaseAmt, R, Math.max(R * wupp * 1.15, 0.12));
    }
    u.rimDir.value.set(this.keyDir.dot(_r3) > 0 ? -1 : 1, 0.45).normalize();
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
    r.setRenderTarget(this.compRT);
    r.render(this.compPass.scene, this.fsCam);
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
