// Sky backdrop (port of The Bear Must Eat's): a full-screen gradient drawn
// first (no depth), with twinkling pixel stars at night. Colours come from
// the lighting keys (src/world/lighting.js) every frame.
import * as THREE from 'three';

const skyVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;
const skyFrag = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uNight;
uniform float uTime;
uniform float uYaw;
uniform float uBand;
varying vec2 vUv;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  float y = vUv.y;
  // banded gradient (chunky pixel steps with an ordered dither between bands)
  float g = smoothstep(0.05, 0.95, y);
  float steps = uBand;
  float gb = floor(g * steps + bayer4(gl_FragCoord.xy * 0.5) * 0.999) / steps;
  vec3 col = mix(uBottom, uTop, mix(g, gb, step(1.0, steps)));
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float h = h21(cell + vec2(floor(uYaw * 40.0), 0.0));
  float tw = 0.55 + 0.45 * sin(uTime * 2.3 + h * 91.0);
  col += step(0.9975, h) * uNight * tw * vec3(0.9, 0.95, 1.0) * smoothstep(0.25, 0.7, y);
  col += step(0.99935, h) * uNight * vec3(0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color(0x62a4ea) },
      uBottom: { value: new THREE.Color(0xcfe8f8) },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uYaw: { value: 0 },
      uBand: { value: 14 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, uniforms: this.uniforms, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.name = 'sky';
  }
}
