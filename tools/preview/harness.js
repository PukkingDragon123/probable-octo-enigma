// Shared preview harness for tools/preview/*.html pages: renderer, camera,
// lighting, particles, sprite uniforms, colour grade and a frame loop, so a
// preview only has to build its content.
//
//   import { harness } from './harness.js';
//   const H = await harness({ mode: 'human', hour: 14, grade: 'human', zoom: 0.014, pitch: 38 });
//   H.scene.add(myThing);
//   H.onUpdate((dt, t) => { ... });
//
// URL params override: ?hour=20&zoom=0.01&pitch=30&yaw=20&cx=0&cz=0&cy=0&grade=spirit&mode=spirit&wet=1&rain=1
// Mouse: drag = rotate yaw, wheel = zoom, shift+drag = pan. window.__H exposes it.
import * as THREE from 'three';
import '../../src/ui/base.css';
import { loadFonts } from '../../src/ui/fonts.js';
import { PixelRenderer } from '../../src/core/renderer.js';
import { CameraRig } from '../../src/core/camera.js';
import { Lighting } from '../../src/world/lighting.js';
import { WORLD } from '../../src/core/materials.js';
import { Particles } from '../../src/core/particles.js';
import { updateSpriteUniforms } from '../../src/core/sprites.js';

export async function harness(o = {}) {
  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) ? +q.get(k) : d);
  await loadFonts();
  let canvas = document.getElementById('game');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game'; document.body.appendChild(canvas); }
  const R = new PixelRenderer(canvas);
  const rig = new CameraRig();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.bg ?? 0x1b1420);
  const L = new Lighting(scene);
  L.mode = q.get('mode') || o.mode || 'human';
  const resize = () => { R.resize(innerWidth, innerHeight, Math.min(2, devicePixelRatio || 1)); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; };
  addEventListener('resize', resize); resize();
  R.setGrade(q.get('grade') || o.grade || 'human', 0);
  const fx = new Particles(scene);
  rig.wupp = rig.wuppGoal = num('zoom', o.zoom ?? 0.014);
  rig.pitch = rig.pitchGoal = THREE.MathUtils.degToRad(num('pitch', o.pitch ?? 38));
  rig.yaw = rig.yawGoal = THREE.MathUtils.degToRad(num('yaw', o.yaw ?? 0));
  rig.lookAt(num('cx', o.cx ?? 0), num('cz', o.cz ?? 0), true, num('cy', o.cy ?? 0));
  WORLD.uWet.value = num('wet', o.wet ?? 0);
  WORLD.uRain.value = num('rain', o.rain ?? 0);
  const H = { R, rig, scene, L, fx, q, hour: num('hour', o.hour ?? 13), t: 0, updaters: [], focus: new THREE.Vector3(), paused: false };
  H.onUpdate = (fn) => H.updaters.push(fn);
  // mouse controls
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, shift: e.shiftKey }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.shift) rig.panPixels(dx, dy, R);
    else { rig.yawGoal -= dx * 0.01; rig.pitchGoal = Math.max(0.15, Math.min(1.45, rig.pitchGoal + dy * 0.005)); }
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  let last = performance.now();
  const step = (dt) => {
    H.t += dt;
    WORLD.uTime.value = H.t;
    for (const f of H.updaters) f(dt, H.t);
    L.camYaw = rig.yaw;
    L.update(H.hour, H.focus.set(rig.target.x, 0, rig.target.z), dt, H.t);
    rig.update(dt, R);
    updateSpriteUniforms(rig.camera, { sunDir: L.sunDir(), pushers: H.pushers });
    fx.update(dt, H.t);
    R.updateGrade(dt);
  };
  H.step = (sec, dt = 1 / 30) => { for (let s = 0; s < sec; s += dt) step(dt); R.render(scene, rig, H.t); };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!H.paused) step(dt);
    R.render(scene, rig, H.t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__H = H;
  setTimeout(() => { window.__ready = true; }, 50);
  return H;
}
