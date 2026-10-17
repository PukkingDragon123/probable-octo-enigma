// Little things that make a Japanese room in summer feel lived in. Fine voxels
// (0.025 m) unless noted; every builder returns a THREE.Group with its origin
// at the bottom centre, front facing +z. Animated bits expose userData.update.
//   nightView(w, h)     the evening town seen through the window (pixel art)
//   furin()             a glass wind chime with goldfish and a paper strip
//   senpuki()           a pale blue electric fan, blades turning, head swinging
//   katoriButa()        the pig-shaped mosquito-coil holder (smoke via userData.smoke)
//   toyShelf()          Dad's old toys: tin robot, model shinkansen, glove, manga, daruma
//   pendulumClock(), wallCalendar(), heightMarks(), ramma(w)
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, cyl, sh, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';

const grp = (...kids) => { const g = new THREE.Group(); for (const k of kids) if (k) g.add(k); return g; };
const INK = '#2a1828';

// ---------------------------------------------------------------- the view from the window
// twilight over the shotengai: a crescent moon, the first stars, the mountains,
// rooftops with lit windows, a utility pole and its wires, the arcade's glow
export function nightView(w = 106, h = 74, seed = 5) {
  const p = new PixCanvas(w, h, 3100 + seed);
  for (let y = 0; y < h; y++) p.hline(0, w - 1, y, y < h * 0.5 ? mix('#1c1e4a', '#4a3a7a', y / (h * 0.5)) : mix('#4a3a7a', '#e8907a', (y - h * 0.5) / (h * 0.3)));
  for (let i = 0; i < 26; i++) { const x = Math.floor(hash3(i, 1, seed) * w), y = Math.floor(hash3(i, 2, seed) * h * 0.45); p.px(x, y, i % 4 ? '#c8c8f0' : '#fff8d0'); if (i % 7 === 0) { p.px(x - 1, y, '#8a8ac8'); p.px(x + 1, y, '#8a8ac8'); } }
  p.circle(w * 0.78, h * 0.18, 5, '#fff4c8'); p.circle(w * 0.78 + 2, h * 0.18 - 1, 4.5, '#2a2a5a');
  p.ellipse(w * 0.78, h * 0.18, 9, 7, 'rgba(255,244,200,0.08)');
  // mountains, then the town
  p.poly([[0, h * 0.62], [w * 0.2, h * 0.48], [w * 0.38, h * 0.58], [w * 0.6, h * 0.44], [w * 0.85, h * 0.56], [w, h * 0.5], [w, h * 0.7], [0, h * 0.7]], '#3a3060');
  p.poly([[0, h * 0.7], [w * 0.15, h * 0.6], [w * 0.3, h * 0.66], [w * 0.5, h * 0.58], [w * 0.7, h * 0.66], [w, h * 0.6], [w, h * 0.75], [0, h * 0.75]], '#2c2850');
  const roofs = [[-4, 0.7, 30, '#3a3452'], [22, 0.66, 26, '#463a5a'], [44, 0.72, 34, '#3a3452'], [74, 0.68, 36, '#40385a']];
  for (const [x, yy, rw, c] of roofs) {
    const y = Math.round(h * yy);
    p.poly([[x, y + 4], [x + rw / 2, y - 4], [x + rw, y + 4]], c); p.rect(x + 2, y + 4, rw - 4, h - y, darken(c, 0.15));
    for (let k = 0; k < 3; k++) { const wx = x + 5 + k * 9, wy = y + 9; if (wx < x + rw - 6) p.rect(wx, wy, 4, 5, hash3(x, k, seed) < 0.6 ? '#ffd890' : '#3a3450'); }
    p.hline(x, x + rw, y + 4, '#5a5070');
  }
  // the arcade roof below, glowing warm, a pink neon wash from the square
  p.rect(0, h - 10, w, 10, '#5a4a5a'); for (let x = 0; x < w; x += 6) p.vline(x, h - 10, h - 1, '#4a3a4a');
  p.rect(0, h - 11, w, 1, '#ffc880');
  p.ellipse(w * 0.15, h - 12, 14, 3, 'rgba(255,120,200,0.25)');
  // a utility pole and sagging wires
  p.rect(w * 0.6, h * 0.3, 2, h * 0.7, '#2a2438'); p.rect(w * 0.6 - 6, h * 0.34, 14, 1, '#2a2438');
  for (const dy of [0, 3]) for (let x = 0; x < w; x++) { const t = x / w; p.px(x, Math.round(h * 0.35 + dy + Math.sin(t * Math.PI) * 4 - (x > w * 0.6 ? (x - w * 0.6) * 0.1 : 0)), '#1e1a2a'); }
  return p;
}

// ---------------------------------------------------------------- furin
export function furin({ onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  for (let y = 0; y < 7; y++) { const r = Math.round(Math.sqrt(Math.max(0, 36 - (6 - y) ** 2)) * 0.95); for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) { const d = Math.hypot(x, z); if (d > r + 0.4 || d < r - 1.2) continue; const fish = (x === 2 && y === 3 && z > 0) || (x === -3 && y === 4 && z > 0) || (z === 3 && y === 2 && x < 0); gl.set(x, -y - 1, z, fish ? 0xff5a4a : y === 6 ? 0xc8f0ff : 0xa8e0f8); } }
  for (let y = 0; y < 2; y++) v.set(0, y, 0, 0x8a6a4a);
  for (let y = 7; y < 11; y++) v.set(0, -y, 0, 0xe8e0d0);
  v.set(0, -11, 0, 0xc8a050);
  const g = grp(vm(v, V25), glowVm(gl, V25, [0, 0, 0], { intensity: 0.75, mode: 1, onU }));
  const sp = new PixCanvas(8, 30, 3201);
  sp.rect(0, 0, 8, 30, '#f8f0f8'); sp.rect(0, 0, 8, 2, '#e8a0c0');
  sp.text('夏', 4, 4, { font: `7px ${FONT.small}`, color: '#3a5ab0', align: 'center' });
  for (let i = 0; i < 4; i++) sp.px(2 + (i % 2) * 3, 16 + i * 3, '#7ab8e8');
  const strip = signPlane(sp, 0.08, { double: true }); strip.geometry.translate(0, -0.15, 0);
  const sg = grp(strip); sg.position.y = -11 * V25; g.add(sg);
  const ph = Math.random() * 6;
  g.userData.wind = 0.3;
  g.userData.update = (dt, t) => {
    const w = g.userData.wind;
    g.rotation.z = Math.sin(t * 1.7 + ph) * 0.06 * w;
    g.rotation.x = Math.sin(t * 1.3 + ph * 2) * 0.05 * w;
    sg.rotation.x = Math.sin(t * 2.6 + ph) * 0.35 * w;
    sg.rotation.y = Math.sin(t * 1.1) * 0.6 * w;
  };
  return g;
}

// ---------------------------------------------------------------- senpuki
export function senpuki() {
  const v = new VoxelModel();
  const BL = 0x9ad0e0, BD = 0x7ab0c8, WH = 0xf4f4ee;
  cyl(v, 0.5, 0.5, 8, 0, 2, (x, y) => (y === 2 ? BL : BD));
  fill(v, 3, 6, 3, 3, 4, 7, 0xd8d8d0); fill(v, -6, -3, 3, 3, 4, 7, 0xf0a0a0);
  for (let y = 3; y < 24; y++) { v.set(0, y, 0, y > 20 ? BD : 0xd8dce0); v.set(1, y, 0, 0xc8ccd0); }
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  // the head: motor housing, the cage, the blades
  const head = new THREE.Group(); head.position.y = 25 * V25; g.add(head);
  const hv = new VoxelModel();
  ell(hv, 0, 0, -3, 3, 3, 4, BL);
  for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; for (const [r, z] of [[11, 2], [11, 4]]) hv.set(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r), z, WH); }
  for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2; for (let r = 2; r < 11; r++) hv.set(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r), 5, WH); }
  hv.set(0, 0, 5, BD); hv.set(0, 0, 6, BD);
  head.add(vm(hv, V25, [0, 0, 0], { cast: false }));
  const bv = new VoxelModel();
  for (let b = 0; b < 3; b++) { const t0 = (b / 3) * Math.PI * 2; for (let r = 1; r < 10; r++) for (let w = -2; w <= 2; w++) { const t = t0 + (w * 0.09) * (12 - r) / 10; bv.set(Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r), 0, r > 7 ? 0xb8e8f0 : 0xa8dcec); } }
  const blades = vm(bv, V25, [0, 0, 0], { cast: false });
  blades.material = blades.material.clone(); blades.material.transparent = true; blades.material.opacity = 0.75;
  blades.position.z = 3 * V25; head.add(blades);
  g.userData.update = (dt, t) => { blades.rotation.z -= dt * 22; head.rotation.y = Math.sin(t * 0.45) * 0.6; };
  return g;
}

// ---------------------------------------------------------------- katori-buta
export function katoriButa() {
  const v = new VoxelModel();
  const C = 0xe8e0d4, Cd = 0xd0c4b4;
  ell(v, 0, 5, 0, 6, 5, 7, (x, y, z) => (z > 5 ? undefined : (x + y + z) % 5 === 0 ? Cd : C));
  ell(v, 0, 5, 7, 4, 4, 1.2, 0xe89a9a); v.set(-1, 5, 8, 0x8a4a4a); v.set(1, 5, 8, 0x8a4a4a);
  for (let x = -3; x <= 3; x++) for (let y = 2; y <= 8; y++) if (Math.hypot(x, y - 5) < 3) v.set(x, y, 7, (Math.hypot(x, y - 5) | 0) % 2 ? 0x3a6a3a : 0x4a7a3a);
  for (const sx of [-1, 1]) { fill(v, sx * 4, sx * 4, 9, 10, 1, 2, Cd); v.set(sx * 2, 7, 6, 0x2a2a30); }
  for (const [x, z] of [[-3, -4], [3, -4], [-3, 3], [3, 3]]) fill(v, x, x, 0, 1, z, z, Cd);
  ell(v, 0, 6, -7, 1, 1, 1, Cd);
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  g.userData.smoke = { x: 0, y: 8 * V25, z: 8 * V25 };
  return g;
}

// ---------------------------------------------------------------- Dad's toy shelf
export function toyShelf() {
  const v = new VoxelModel();
  const WD = 0x8a5a32, WDD = 0x6a4224;
  fill(v, -24, 23, 0, 1, -8, 7, WDD);
  for (const y of [16, 32]) fill(v, -24, 23, y, y + 1, -8, 7, WD);
  for (const x of [-24, 23]) fill(v, x, x, 0, 33, -8, 7, WDD);
  fill(v, -24, 23, 2, 33, -8, -8, 0x5a3a20);
  // bottom: a stack of manga, a baseball glove with a ball
  const spines = [0xe8402a, 0x3a6ad8, 0xf0c040, 0x3aa860, 0xe86aa0, 0xf4f0e8, 0x8a5ad8, 0xff8a3a];
  for (let i = 0; i < 12; i++) fill(v, -22 + i * 2, -21 + i * 2, 2, 11 + (i % 3), -6, 2, spines[i % spines.length]);
  ell(v, 9, 6, 0, 6, 4, 5, (x, y, z) => ((x + z) % 4 === 0 ? 0x8a4a22 : 0xa85a2a)); fill(v, 5, 13, 4, 4, 4, 5, 0x5a2a12);
  ell(v, 18, 4, 2, 2.6, 2.6, 2.6, 0xf8f8f4); v.set(18, 5, 5, 0xd8302a); v.set(17, 4, 5, 0xd8302a);
  // middle: a tin robot, a red daruma, a few gacha capsules
  fill(v, -20, -14, 18, 26, -3, 2, 0xb8bcc4); fill(v, -19, -15, 27, 30, -2, 1, 0xc8ccd4); v.set(-18, 29, 2, 0xff4a3a); v.set(-16, 29, 2, 0xff4a3a); fill(v, -18, -16, 21, 23, 3, 3, 0xe8402a);
  for (const sx of [-21, -13]) fill(v, sx, sx, 20, 25, -1, 0, 0x9aa0a8); fill(v, -17, -17, 31, 32, 0, 0, 0xf0c040);
  ell(v, -4, 22, 0, 4, 5, 4, (x, y) => (y > 23 ? 0xd8302a : 0xc82820)); fill(v, -6, -2, 22, 25, 4, 4, 0xf8f0e0); v.set(-5, 24, 5, 0x2a2a30); v.set(-3, 24, 5, 0x2a2a30);
  const caps = [0xff6a8a, 0x5ab8f0, 0xf8d040, 0x7ad860];
  caps.forEach((c, i) => { const cx = 6 + i * 4; ell(v, cx, 20, 2, 1.8, 1.8, 1.8, (x, y) => (y > 20 ? c : 0xf8f8f8)); });
  // top: the model shinkansen on a little stand
  fill(v, -18, 16, 34, 34, -2, 2, 0x3a3a40);
  fill(v, -16, 12, 35, 39, -2, 2, (x, y) => (y === 37 ? 0x2a5ab0 : y > 37 ? 0xf8f8f4 : 0xf0f0ec));
  for (let k = 0; k < 6; k++) fill(v, 13 + k, 13 + k, 35, 39 - Math.round(k * 0.7), -2 + (k > 3 ? 1 : 0), 2 - (k > 3 ? 1 : 0), k === 5 ? 0x2a5ab0 : 0xf8f8f4);
  for (let x = -14; x < 10; x += 3) v.set(x, 38, 3, 0x5a7aa8);
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  return g;
}

// ---------------------------------------------------------------- the pendulum clock, the calendar, the marks on the post
export function pendulumClock() {
  const v = new VoxelModel();
  fill(v, -7, 6, 0, 31, -2, 2, (x, y) => (x === -7 || x === 6 || y === 0 || y === 31 || y === 20 ? 0x5a3a20 : 0x7a4a28));
  fill(v, -6, 5, 1, 19, 3, 3, (x, y) => (x === -6 || x === 5 || y === 1 || y === 19 ? 0x5a3a20 : undefined));
  fill(v, -3, 2, 32, 33, -1, 1, 0x5a3a20);
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  const f = new PixCanvas(24, 24, 3301);
  f.circle(11.5, 11.5, 11.5, '#c8a050'); f.circle(11.5, 11.5, 10, '#fbf6e6');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; f.px(11.5 + Math.sin(a) * 8, 11.5 - Math.cos(a) * 8, '#3a2a20'); }
  f.line(11.5, 11.5, 11.5 + 4, 11.5 + 2, '#2a2020'); f.line(11.5, 11.5, 11.5 - 1, 11.5 - 7, '#2a2020');
  const fp = signPlane(f, 0.28); fp.position.set(0, 25.5 * V25, 3 * V25 + 0.006); g.add(fp);
  const pv = new VoxelModel(); for (let y = 0; y < 12; y++) pv.set(0, -y, 0, 0xc8a050); ell(pv, 0, -13, 0, 2, 2, 0.6, 0xe8c060);
  const pend = vm(pv, V25, [0, 0, 0], { cast: false }); pend.position.set(0, 18 * V25, 0.03); g.add(pend);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(10 * V25, 18 * V25), new THREE.MeshBasicMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.18 }));
  gp.position.set(0, 10 * V25, 3.6 * V25); g.add(gp);
  g.userData.update = (dt, t) => { pend.rotation.z = Math.sin(t * Math.PI) * 0.22; };
  return g;
}
export function wallCalendar() {
  const p = new PixCanvas(30, 44, 3302);
  p.rect(0, 0, 30, 44, '#fbfaf4');
  for (let y = 2; y < 20; y++) p.hline(2, 27, y, mix('#5ac0f0', '#bfeaff', (y - 2) / 18));
  p.rect(2, 14, 26, 6, '#3a9ad8'); for (let x = 3; x < 27; x += 4) p.px(x, 14, '#e8f8ff');
  for (let i = 0; i < 5; i++) { const x = 5 + i * 5; p.vline(x, 9, 16, '#3a7a2a'); p.circle(x, 8, 2, '#ffd030'); p.px(x, 8, '#8a5a1a'); }
  p.text('7月', 15, 20, { font: `7px ${FONT.small}`, color: '#d8302a', align: 'center' });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) p.rect(3 + c * 3.5, 29 + r * 3.5, 2, 2, c === 0 ? '#e8806a' : c === 6 ? '#6a8ae8' : '#8a8a94');
  p.ring(3 + 4 * 3.5 + 1, 29 + 2 * 3.5 + 1, 2, '#d8302a');
  p.rect(13, 0, 4, 2, '#8a8a94');
  p.frame(0, 0, 30, 44, '#d8d4c8');
  return p;
}
export function heightMarks() {
  const p = new PixCanvas(10, 80, 3303);
  p.rect(0, 0, 10, 80, 'rgba(0,0,0,0)');
  for (const [y, t] of [[62, '5'], [50, '7'], [38, '9'], [27, '11'], [17, '13']]) { p.hline(0, 7, y, '#3a2a20'); p.text(t, 9, y - 6, { font: `7px ${FONT.tiny}`, color: '#3a2a20', align: 'right' }); }
  return p;
}
// the carved transom (ramma): dark wood fretwork of pine and clouds, light behind the cuts
export function ramma(w = 280, h = 22) {
  const p = new PixCanvas(w, h, 3304);
  p.rect(0, 0, w, h, '#4a2e1c');
  p.rect(0, 0, w, 2, '#6a4428'); p.rect(0, h - 2, w, 2, '#6a4428');
  for (let x = 0; x < w; x += 70) {
    // a cloud scroll cut out, a pine branch
    for (let k = 0; k < 3; k++) { p.ellipse(x + 14 + k * 8, 8 + (k % 2) * 2, 5, 3, '#e8c890'); p.ellipse(x + 14 + k * 8, 8 + (k % 2) * 2, 3, 1.6, '#4a2e1c'); }
    p.line(x + 40, 15, x + 64, 6, '#e8c890', 2);
    for (let k = 0; k < 4; k++) { p.ellipse(x + 44 + k * 5, 7 + (k % 2) * 4, 3, 2, '#d8b878'); p.px(x + 44 + k * 5, 7 + (k % 2) * 4, '#4a2e1c'); }
    p.vline(x + 69, 2, h - 3, '#6a4428');
  }
  return p;
}
