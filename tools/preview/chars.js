// Character line-up preview: ?ids=mamoru,genzo&expr=happy&zoom=0.008&action=wave&hour=12
import * as THREE from 'three';
import '../../src/ui/base.css';
import { loadFonts } from '../../src/ui/fonts.js';
import { PixelRenderer } from '../../src/core/renderer.js';
import { CameraRig } from '../../src/core/camera.js';
import { Lighting } from '../../src/world/lighting.js';
import { litMat, WORLD } from '../../src/core/materials.js';
import { tex } from '../../src/art/textures.js';
import { Character } from '../../src/entities/rig.js';
import { CHARACTERS, LOCALS } from '../../src/data/characters.js';
import { EXPRESSION_NAMES } from '../../src/entities/face.js';
import { Particles } from '../../src/core/particles.js';
import { updateSpriteUniforms } from '../../src/core/sprites.js';

const q = new URLSearchParams(location.search);
await loadFonts();
const canvas = document.getElementById('game');
const R = new PixelRenderer(canvas);
const rig = new CameraRig();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2230);
const L = new Lighting(scene);
L.mode = q.get('mode') || 'interior';
const resize = () => { R.resize(innerWidth, innerHeight, Math.min(2, devicePixelRatio || 1)); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; };
addEventListener('resize', resize); resize();
R.setGrade(q.get('grade') || 'cozy', 0);
// floor + wall
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), litMat({ map: tex('woodFloor', {}), vertexColors: false }));
floor.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 6 : 14); });
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), litMat({ map: tex('plaster', {}), vertexColors: false }));
wall.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 3 : 14); });
wall.position.set(0, 1.5, -1.6); wall.receiveShadow = true; scene.add(wall);
const ids = (q.get('ids') || 'mamoru,genzo,yuki,bendo,mio,kanako,attendant,tarobo,kappei').split(',');
const chars = [];
ids.forEach((id, i) => {
  const def = CHARACTERS[id] || LOCALS[id];
  if (!def) return;
  const c = new Character(def);
  c.setPos((i - (ids.length - 1) / 2) * 1.1, 0);
  c.faceNow(q.has('yaw') ? +q.get('yaw') : 0);
  scene.add(c.root);
  chars.push(c);
  if (id === 'mamoru' && q.has('hood')) c.setHood(true);
});
const fx = new Particles(scene);
window.__chars = chars;
const exprs = q.get('exprs');
if (exprs) exprs.split(',').forEach((e, i) => chars[i] && chars[i].setExpr(e));
const expr = q.get('expr');
const action = q.get('action');
if (expr) chars.forEach((c) => c.setExpr(expr));
if (action) chars.forEach((c) => c.play(action, { loop: true }));
const zoom = +(q.get('zoom') || 0.0095);
rig.wupp = rig.wuppGoal = zoom;
rig.pitch = rig.pitchGoal = THREE.MathUtils.degToRad(+(q.get('pitch') || 30));
rig.lookAt(+(q.get('cx') || 0), +(q.get('cz') || 0), true, +(q.get('cy') || 0.45));
let t = 0, last = performance.now(), ei = 0, eT = 0;
const hour = +(q.get('hour') || 13);
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  WORLD.uTime.value = t;
  if (q.has('cycle')) { eT += dt; if (eT > 1.6) { eT = 0; ei = (ei + 1) % EXPRESSION_NAMES.length; chars.forEach((c) => c.setExpr(EXPRESSION_NAMES[ei])); } }
  for (const c of chars) c.update(dt);
  L.camYaw = rig.yaw;
  L.update(hour, new THREE.Vector3(0, 0, 0), dt, t);
  rig.update(dt, R);
  updateSpriteUniforms(rig.camera, { sunDir: L.sunDir() });
  fx.update(dt, t);
  R.updateGrade(dt);
  R.render(scene, rig, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__ready = true;
