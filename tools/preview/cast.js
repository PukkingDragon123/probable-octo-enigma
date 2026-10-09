// Cast turntable: ?ids=mamoru&yaws=0,0.7,1.57,3.14&zoom=0.0045&expr=happy&hood=1&hour=15&ground=grass
import * as THREE from 'three';
import { harness } from './harness.js';
import { Character } from '../../src/entities/rig.js';
import { CHARACTERS, LOCALS } from '../../src/data/characters.js';
import { litMat } from '../../src/core/materials.js';
import { tex } from '../../src/art/textures.js';

const q = new URLSearchParams(location.search);
const H = await harness({ zoom: 0.0045, pitch: 30, cy: 0.5, hour: 15, grade: q.get('grade') || 'human', mode: q.get('mode') || 'human' });
const ground = q.get('ground') || 'grass';
const g = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), litMat({ map: tex(ground === 'wood' ? 'woodFloor' : ground, {}), vertexColors: false }));
const uv = g.geometry.attributes.uv.array; for (let i = 0; i < uv.length; i++) uv[i] *= 30;
g.rotation.x = -Math.PI / 2; g.receiveShadow = true; H.scene.add(g);
const ids = (q.get('ids') || 'mamoru').split(',');
const yaws = (q.get('yaws') || '0').split(',').map(Number);
const items = [];
for (const id of ids) for (const y of yaws) items.push({ id, y });
const gap = +(q.get('gap') || 1.0);
const chars = [];
items.forEach((it, i) => {
  const def = CHARACTERS[it.id] || LOCALS[it.id];
  if (!def) return;
  const c = new Character(def);
  c.setPos((i - (items.length - 1) / 2) * gap, 0);
  c.faceNow(it.y);
  c.idleT = 999;
  if (q.get('expr')) c.setExpr(q.get('expr'), { react: false });
  if (q.has('hood')) c.setHood(q.get('hood') === '1');
  if (q.get('act')) c.play(q.get('act'), { loop: true });
  if (q.get('pose')) c.setPose(q.get('pose'));
  H.scene.add(c.root);
  chars.push(c);
});
H.onUpdate((dt) => { for (const c of chars) c.update(dt); });
window.__chars = chars;
