// Street furniture and clutter for Kodama Ginza (fine voxels unless noted).
// Every builder returns a THREE.Group with its origin at the bottom centre,
// front facing +z. Animated bits expose userData.update(dt, t).
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, cyl, sh, mixc, tone, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { gachaCard, gateSign, menuBoard } from './shopSigns.js';
import { glassPane } from './station.js';
import { FONT } from '../ui/fonts.js';

const grp = (...kids) => { const g = new THREE.Group(); for (const k of kids) if (k) g.add(k); return g; };

// ---------------------------------------------------------------- paper lantern (chochin)
// red (or white) lantern with black rims; lit ones glow. text: one kanji painted on
export function lantern({ col = 0xe8402a, lit = true, onU = null, text = '祭', r = 5, h = 14 } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  for (let y = 0; y < h; y++) {
    const k = Math.sin(((y + 0.5) / h) * Math.PI);
    const rr = 2 + (r - 2) * k;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (x * x + z * z > rr * rr) continue;
      if (x * x + z * z < (rr - 1.2) ** 2) continue;
      const rib = y % 3 === 0;
      (lit ? gl : v).set(x, y, z, rib ? sh(col, 0.82) : col);
    }
  }
  for (const y of [-1, h]) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x * x + z * z <= 5) v.set(x, y, z, 0x2a2228);
  v.set(0, h + 1, 0, 0x2a2228);
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  if (lit) g.add(glowVm(gl, V25, [0.5, 0, 0.5], { intensity: 1.05, mode: 3, onU }));
  if (text) {
    const p = new PixCanvas(10, 12, 33);
    p.text(text, 5, 1, { font: `9px ${FONT.brush}`, color: '#1a0e10', align: 'center' });
    const t = signPlane(p, 0.16);
    t.position.set(0, (h / 2) * V25, r * V25 + 0.004);
    g.add(t);
  }
  g.userData.height = (h + 2) * V25;
  return g;
}
// a string of lanterns hanging along a catenary between two points (local x)
export function lanternString(len, { n = 6, cols = [0xe8402a, 0xf4f0e8], onU = null, sag = 0.25, texts = ['祭', '銀', '座'] } = {}) {
  const g = grp();
  const pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(t * len - len / 2, -Math.sin(t * Math.PI) * sag, 0)); }
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2228 }));
  g.add(wire);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const L = lantern({ col: cols[i % cols.length], onU, text: texts[i % texts.length], r: 4, h: 11 });
    L.position.set(t * len - len / 2, -Math.sin(t * Math.PI) * sag - L.userData.height, 0);
    L.userData.phase = i * 1.3;
    g.add(L);
  }
  g.userData.update = (dt, time) => { for (const c of g.children) if (c.userData.phase != null) c.rotation.z = Math.sin(time * 1.3 + c.userData.phase) * 0.05; };
  return g;
}

// ---------------------------------------------------------------- tanabata streamer (fukinagashi)
// a paper kusudama ball with long coloured streamers that sway
export function streamer({ seed = 1, len = 34, cols = null } = {}) {
  const C = cols || [[0xff6a8a, 0xffd0e0], [0x5ab8f0, 0xd8f0ff], [0xf8d040, 0xfff4c0], [0x7ad860, 0xe0ffd0], [0xb88af0, 0xf0e4ff]][seed % 5];
  const g = grp();
  const bv = new VoxelModel();
  ell(bv, 0.5, 0, 0.5, 6, 6, 6, (x, y, z) => { const h = hash3(x, y, z + seed); return h < 0.3 ? C[1] : h < 0.4 ? 0xffffff : C[0]; });
  // paper flowers on the ball
  for (let i = 0; i < 14; i++) { const a = i * 2.4, b = (i / 14) * Math.PI; const x = Math.round(Math.cos(a) * Math.sin(b) * 6.5), y = Math.round(Math.cos(b) * 6.5), z = Math.round(Math.sin(a) * Math.sin(b) * 6.5); bv.set(x, y, z, 0xffffff); }
  fill(bv, 0, 0, 7, 16, 0, 0, 0x6a6a72);
  const ball = vm(bv, V25, [0.5, 0, 0.5]);
  g.add(ball);
  // streamers: thin strips around a ring, each its own little mesh so they sway separately
  const strips = [];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const sv = new VoxelModel();
    const L2 = len - Math.floor(hash3(i, seed, 1) * 8);
    const c = i % 2 ? C[0] : C[1];
    for (let y = 0; y < L2; y++) { sv.set(0, -y, 0, y % 9 === 0 ? sh(c, 0.85) : c); if (y % 5 === 0 && hash3(y, i, seed) < 0.4) sv.set(1, -y, 0, 0xffffff); }
    const m = vm(sv, V25, [0.5, 0, 0.5], { cast: true });
    const piv = grp(m);
    piv.position.set(Math.cos(a) * 5.5 * V25, -4 * V25, Math.sin(a) * 5.5 * V25);
    piv.scale.y = 2; // long strips: stretch fine voxels vertically
    piv.userData = { a, ph: hash3(i, seed, 2) * 6 };
    g.add(piv);
    strips.push(piv);
  }
  g.userData.update = (dt, t) => {
    for (const s of strips) { s.rotation.z = Math.sin(t * 1.1 + s.userData.ph) * 0.07; s.rotation.x = Math.sin(t * 0.8 + s.userData.ph * 1.7) * 0.05; }
    ball.rotation.y = Math.sin(t * 0.4 + seed) * 0.2;
  };
  return g;
}

// ---------------------------------------------------------------- bicycle (mamachari with a front basket)
export function bicycle({ col = 0xe8e0d0, seed = 1, kick = true } = {}) {
  const v = new VoxelModel();
  const tyre = 0x2a2a30, rim = 0xb8bcc4, frame = col;
  const wheel = (cx) => { for (let x = -9; x <= 9; x++) for (let y = -9; y <= 9; y++) { const d = Math.hypot(x, y); if (d <= 9 && d > 7.6) v.set(cx + x, 10 + y, 0, tyre); else if (d <= 7.6 && d > 6.8) v.set(cx + x, 10 + y, 0, rim); else if (d < 1.2) v.set(cx + x, 10 + y, 0, rim); else if (d < 6.8 && (x === 0 || y === 0 || x === y || x === -y)) v.set(cx + x, 10 + y, 0, 0xd8dce0); } };
  wheel(-14); wheel(15);
  const line = (x0, y0, x1, y1, c, z = 0) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) v.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), z, c); };
  line(-14, 10, -2, 10, frame); line(-2, 10, -5, 22, frame); line(-5, 22, 11, 20, frame); line(-2, 10, 11, 20, frame); line(11, 20, 15, 10, frame); line(-14, 10, -5, 22, frame);
  line(11, 20, 12, 27, frame); fill(v, 9, 15, 27, 27, -3, 3, 0x3a3a40); fill(v, 9, 9, 27, 27, -4, -4, 0x2a2a30); fill(v, 15, 15, 27, 27, 4, 4, 0x2a2a30);
  fill(v, -8, -3, 23, 24, -1, 1, 0x3a2a28); line(-5, 22, -5, 23, frame);
  // basket
  for (let x = 13; x <= 21; x++) for (let y = 18; y <= 24; y++) for (let z = -3; z <= 3; z++) { const edge = x === 13 || x === 21 || z === -3 || z === 3 || y === 18; if (edge && ((x + y + z) % 2 === 0 || y === 24 || y === 18)) v.set(x, y, z, 0x8a8e96); }
  // mudguards, chain guard, rear carrier, bell
  for (let a = 0.3; a < 2.8; a += 0.12) { v.set(-14 + Math.round(Math.cos(a) * 10), 10 + Math.round(Math.sin(a) * 10), 0, frame); v.set(15 + Math.round(Math.cos(a) * 10), 10 + Math.round(Math.sin(a) * 10), 0, frame); }
  fill(v, -12, -2, 9, 11, 1, 1, sh(frame, 0.85));
  fill(v, -18, -9, 21, 21, -2, 2, 0x6a6a72);
  v.set(12, 28, 2, 0xe8c040);
  if (kick) line(-12, 8, -16, 0, 0x6a6a72, 1);
  if (seed % 3 === 0) fill(v, 15, 19, 21, 23, -2, 2, [0xe8443a, 0x3a6ab0, 0xf4f0e8][seed % 3]); // a bag in the basket
  const m = vm(v, V25, [0, 0, 0]);
  const g = grp(m);
  m.rotation.z = kick ? 0.04 : 0;
  return g;
}

// ---------------------------------------------------------------- planter box with flowers (nature sprites go on top)
export function planter({ w = 24, col = 0xa8a49a } = {}) {
  const v = new VoxelModel();
  fill(v, -w / 2, w / 2 - 1, 0, 9, -5, 4, (x, y, z) => (y === 9 ? sh(col, 1.1) : (x === -w / 2 || z === 4) && y % 4 === 0 ? sh(col, 0.9) : tone(x, y, z, col, sh(col, 0.92), sh(col, 1.05))));
  fill(v, -w / 2 + 1, w / 2 - 2, 9, 9, -4, 3, (x, y, z) => (hash3(x, y, z) < 0.5 ? 0x5a4030 : 0x6a4a36));
  const g = grp(vm(v, V5));
  g.userData.soilY = 10 * V5;
  return g;
}
// wooden street bench (slats on cast legs)
export function streetBench({ len = 30, col = 0x9a6a3a } = {}) {
  const v = new VoxelModel();
  for (let x = -len / 2; x < len / 2; x++) for (const z of [-3, -1, 1]) v.set(x, 8, z, z === 1 ? sh(col, 1.1) : col);
  for (let x = -len / 2; x < len / 2; x++) for (const y of [11, 13]) v.set(x, y, -4, sh(col, y === 13 ? 1.08 : 0.95));
  for (const x of [-len / 2 + 2, len / 2 - 3]) { fill(v, x, x, 0, 7, 0, 0, 0x3a3a40); fill(v, x, x, 0, 7, -3, -3, 0x3a3a40); fill(v, x, x, 8, 13, -5, -5, 0x3a3a40); fill(v, x, x, 0, 0, -4, 1, 0x3a3a40); }
  const g = grp(vm(v, V5));
  g.userData.seats = [];
  for (let x = -len / 2 + 7; x < len / 2 - 4; x += 12) g.userData.seats.push({ x: x * V5, z: 0, y: 9 * V5 });
  return g;
}
// red felt bench (with a big red parasol) in front of a sweets shop
export function redBench({ len = 34 } = {}) {
  const v = new VoxelModel();
  fill(v, -len / 2, len / 2 - 1, 8, 9, -6, 5, (x, y) => (y === 9 ? 0xd8302a : 0x8a5a3a));
  for (let x = -len / 2; x < len / 2; x++) if (hash3(x, 9, 1) < 0.15) v.set(x, 9, 5, 0xe84a3a);
  for (const x of [-len / 2 + 1, len / 2 - 2]) for (const z of [-5, 4]) fill(v, x, x, 0, 7, z, z, 0x6a4a2a);
  const g = grp(vm(v, V5));
  g.userData.seats = [{ x: -0.5, z: 0, y: 10 * V5 }, { x: 0.5, z: 0, y: 10 * V5 }];
  return g;
}
export function parasol({ col = 0xd8302a } = {}) {
  const v = new VoxelModel();
  fill(v, 0, 0, 0, 44, 0, 0, 0x8a6a4a);
  for (let y = 0; y < 8; y++) { const r = 22 - y * 2.6; for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r); z <= r; z++) { const d = Math.hypot(x, z); if (d <= r && d > r - 2.6) v.set(x, 44 + y, z, (Math.floor(Math.atan2(z, x) * 4) % 2 === 0) ? col : sh(col, 0.9)); } }
  for (let a = 0; a < 16; a++) { const x = Math.round(Math.cos(a / 16 * Math.PI * 2) * 21), z = Math.round(Math.sin(a / 16 * Math.PI * 2) * 21); v.set(x, 43, z, 0xf4f0e8); }
  return grp(vm(v, V5, [0.5, 0, 0.5]));
}

// ---------------------------------------------------------------- gachapon machine (2-tier stand)
// each machine: clear dome window full of capsules, a header card, crank, coin
// slot, capsule door. Returns the stack; userData.slots = [{x, y, card}] (local)
export function gachaMachine({ seed = 1, body = 0xf4f2ec, dust = 0 } = {}) {
  const v = new VoxelModel();
  const capsM = [new VoxelModel(), new VoxelModel()]; // the capsule piles (scaled by stock)
  const W = 16, Hh = 18; // V25 voxels: 0.4 m wide, 0.45 m per machine
  const caps = [0xff6a8a, 0x5ab8f0, 0xf8d040, 0x7ad860, 0xb88af0, 0xff9a4a, 0xffffff];
  const tier = (y0, s) => {
    // display box (window carved; capsules piled inside the lower 70%)
    fill(v, 0, W - 1, y0 + 8, y0 + Hh - 1, 0, 9, (x, y, z) => (y === y0 + Hh - 1 ? sh(body, 1.05) : x === 0 || x === W - 1 ? sh(body, 0.9) : body));
    carve(v, 1, W - 2, y0 + 9, y0 + Hh - 3, 2, 9);
    const cm = capsM[y0 ? 1 : 0];
    for (let x = 1; x <= W - 2; x++) for (let z = 2; z <= 8; z++) {
      const fillH = y0 + 9 + Math.floor(4 + hash3(x, s, z) * 3);
      for (let y = y0 + 9; y < fillH; y++) { const c = caps[Math.floor(hash3(x >> 1, y >> 1, (z >> 1) + s) * caps.length)]; cm.set(x, y, z, ((x + y + z) % 2 === 0) ? 0xf8f8f8 : c); }
    }
    // lower body: coin slot + crank + capsule door
    fill(v, 0, W - 1, y0, y0 + 7, 0, 9, (x, y) => (y === y0 + 7 ? 0xd8d8d4 : sh(body, 0.95)));
    for (let x = 4; x <= 9; x++) for (let y = y0 + 1; y <= y0 + 6; y++) { const d = Math.hypot(x - 6.5, y - (y0 + 3.5)); if (d < 3) v.set(x, y, 10, d < 1 ? 0x8a8e96 : 0xc8ccd4); }
    fill(v, 6, 7, y0 + 3, y0 + 4, 11, 11, 0xe8e8ec); // crank handle
    fill(v, 11, 13, y0 + 4, y0 + 6, 10, 10, 0x6a6e76); v.set(12, y0 + 5, 10, 0x2a2a30); // coin slot
    fill(v, 11, 14, y0 + 1, y0 + 2, 10, 10, 0x3a3a40); // capsule door
  };
  tier(0, seed); tier(Hh, seed + 1);
  fill(v, -1, W, -4, -1, -1, 10, 0x8a8e96); // stand
  fill(v, -1, W, 2 * Hh, 2 * Hh + 1, -1, 10, 0xd8302a); // top header bar
  const g = grp(vm(v, V25, [W / 2, 0, 5]));
  g.position.y = 0;
  g.children[0].position.y = 4 * V25;
  const piles = capsM.map((cm, t) => { const m = vm(cm, V25, [W / 2, t * Hh + 9, 5]); m.position.y = (4 + t * Hh + 9) * V25; g.add(m); return m; });
  g.userData.stock = 1;
  // stock 0..1: the capsule piles sink as the machine empties (lower tier empties last)
  g.userData.setStock = (k) => {
    g.userData.stock = k = Math.max(0, Math.min(1, k));
    const up = Math.max(0, k * 2 - 1), lo = Math.min(1, k * 2);
    piles[1].scale.y = Math.max(0.001, up); piles[1].visible = up > 0.02;
    piles[0].scale.y = Math.max(0.001, lo); piles[0].visible = lo > 0.02;
  };
  // where the capsule pops out (local) and where a customer stands to play
  g.userData.tray = { x: 0.31 * 0 + 12.5 * V25 - (W / 2) * V25, y: (4 + 1.5) * V25, z: 6 * V25 };
  g.userData.crank = { x: (6.5 - W / 2) * V25, y: (4 + 3.5) * V25, z: 6 * V25 };
  // glass fronts + header cards
  for (let t = 0; t < 2; t++) {
    const gp = glassPane((W - 2) * V25, (Hh - 11) * V25);
    gp.position.set(0, (4 + t * Hh + 9 + (Hh - 11) / 2) * V25, (10 - 5) * V25 + 0.004);
    g.add(gp);
    const card = signPlane(gachaCard({ seed: seed * 2 + t }), (W - 2) * V25);
    card.position.set(0, (4 + t * Hh + Hh - 2.2) * V25, 5 * V25 + 0.006);
    g.add(card);
    if (dust > 0) { const dp = new PixCanvas(16, 8, 99 + t); dp.scatter(0, 0, 16, 8, 'rgba(200,190,170,0.55)', dust); const dm = signPlane(dp, (W - 2) * V25); dm.position.copy(gp.position); dm.position.z += 0.002; dm.scale.y = (Hh - 11) / 7; dm.material.transparent = true; dm.material.alphaTest = 0.1; g.add(dm); }
  }
  g.userData.w = W * V25;
  return g;
}
// a row of machines under a little tin eave (outside Kodamaya)
export function gachaRow(n = 5, { seed = 1, dust = 0.25 } = {}) {
  const g = grp();
  const bodies = [0xf4f2ec, 0xf8e8e0, 0xe8f0f4, 0xfff4d8, 0xf0f0f0];
  for (let i = 0; i < n; i++) { const m = gachaMachine({ seed: seed + i * 3, body: bodies[(seed + i) % bodies.length], dust }); m.position.x = (i - (n - 1) / 2) * 0.42; g.add(m); }
  // eave
  const v = new VoxelModel();
  const half = Math.ceil(n * 0.42 / 2 / V5) + 2;
  for (let x = -half; x < half; x++) for (let z = -2; z < 14; z++) v.set(x, 0, z, (x + 400) % 3 === 0 ? 0x5a7a6a : 0x6a8a7a);
  const em = vm(v, V5); em.position.set(0, 1.18, -0.1); em.rotation.x = 0.12; g.add(em);
  return g;
}

// ---------------------------------------------------------------- yaki-imo cart (stone-baked sweet potatoes)
export function yakiimoCart({ onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  // cart bed + wheels + handles
  fill(v, -14, 13, 8, 9, -8, 7, 0x8a5a32);
  for (const x of [-14, 13]) for (const z of [-8, 7]) fill(v, x, x, 10, 22, z, z, 0x6a4224);
  for (const sx of [-9, 8]) for (let a = 0; a < 24; a++) { v.set(sx + Math.round(Math.cos(a / 24 * Math.PI * 2) * 5), 5 + Math.round(Math.sin(a / 24 * Math.PI * 2) * 5), 8, 0x3a2a20); }
  fill(v, 14, 26, 14, 14, -6, -6, 0x6a4224); fill(v, 14, 26, 14, 14, 5, 5, 0x6a4224);
  // the stone oven drum (black iron, a window of glowing stones)
  for (let x = -11; x <= 6; x++) for (let y = 10; y <= 22; y++) for (let z = -6; z <= 5; z++) { const d = Math.hypot(y - 16, z + 0.5); if (d < 6.5) v.set(x, y, z, d > 5.5 ? 0x2a2a30 : 0x3a3a42); }
  for (let x = -8; x <= 3; x++) for (let y = 13; y <= 18; y++) { v.set(x, y, 6, null); gl.set(x, y, 5, (x + y) % 3 === 0 ? 0xffd060 : (x * y) % 5 === 0 ? 0xff7a20 : 0xe8501a); }
  // chimney
  fill(v, 4, 5, 22, 36, -1, 0, 0x2a2a30); fill(v, 3, 6, 37, 37, -2, 1, 0x3a3a42);
  // roof canopy + flag pole
  fill(v, -16, 15, 40, 40, -10, 9, (x) => ((x + 40) % 4 < 2 ? 0x2a3a6a : 0xf4f0e8));
  for (const x of [-15, 14]) for (const z of [-9, 8]) fill(v, x, x, 23, 39, z, z, 0x6a4224);
  const g = grp(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.2, mode: 3, onU }));
  // the flag: 石焼きいも
  const p = new PixCanvas(18, 56, 41);
  p.rect(0, 0, 18, 56, '#f4f0e0'); p.rect(0, 0, 3, 56, '#c8302a');
  [...'石焼きいも'].forEach((ch, i) => p.text(ch, 10, 2 + i * 10, { font: `9px ${FONT.brush}`, color: '#1a1a2a', align: 'center' }));
  const flag = signPlane(p, 0.26, { double: true });
  flag.position.set(-0.85, 2.6, 0.3); g.add(flag);
  const pole = new VoxelModel(); fill(pole, 0, 0, 0, 72, 0, 0, 0x8a6a4a);
  const pm = vm(pole, V5); pm.position.set(-1.0, 0.4, 0.3); g.add(pm);
  g.userData.chimney = { x: 4.5 * V5, y: 38 * V5, z: -0.5 * V5 };
  g.userData.flag = flag;
  g.userData.update = (dt, t) => { flag.rotation.y = Math.sin(t * 1.7) * 0.18; };
  return g;
}

// ---------------------------------------------------------------- shrine corner: hokora, torii, stone foxes
export function shrineCorner({ onU = null } = {}) {
  const g = grp();
  const v = new VoxelModel();
  // stone base
  fill(v, -12, 11, 0, 11, -10, 9, (x, y, z) => tone(x, y, z, 0x8a8a82, 0x7a7a72, 0x9a9a92, 0.2, 0.15));
  fill(v, -13, 12, 12, 13, -11, 10, 0x9a9a92);
  // wooden hokora (little shrine house)
  fill(v, -8, 7, 14, 30, -7, 5, (x, y, z) => (z === 5 && x > -6 && x < 5 && y > 15 && y < 28 ? ((x + 100) % 3 === 0 ? 0x4a2e1e : 0x2a1a12) : (x + 100) % 4 === 0 ? 0x6a4a2e : 0x8a5e3a));
  for (let k = 0; k < 7; k++) fill(v, -11 + k, 10 - k, 31 + k, 31 + k, -10, 8, (x, y, z) => (z === 8 || z === -10 ? 0x3a3a42 : 0x4a4a52));
  fill(v, -1, 0, 38, 40, -10, 8, 0xb8903a);
  // offerings: sake bottles, a little mirror, white paper shide
  fill(v, -6, -5, 14, 18, 7, 8, 0xf4f4f0); fill(v, 4, 5, 14, 18, 7, 8, 0xf4f4f0);
  fill(v, -1, 0, 14, 15, 7, 8, 0xd8a03a);
  g.add(vm(v, V5));
  // torii in front
  const t = new VoxelModel();
  const red = 0xd8402a;
  for (const x of [-16, 15]) fill(t, x, x + 1, 0, 50, 20, 21, red);
  fill(t, -20, 19, 45, 46, 19, 22, red); fill(t, -22, 21, 51, 53, 18, 23, (x, y) => (y === 53 ? 0x2a2228 : red));
  fill(t, -1, 0, 46, 50, 20, 21, red);
  for (const x of [-16, 15]) fill(t, x - 1, x + 2, 0, 3, 19, 22, 0x2a2228);
  g.add(vm(t, V5));
  // stone foxes (kitsune) on pedestals, each with a red bib
  for (const sx of [-1, 1]) {
    const f = new VoxelModel();
    fill(f, -3, 2, 0, 7, -3, 2, 0x8a8a82);
    ell(f, 0, 12, 0, 3.5, 5, 3, 0xb8b4a8); ell(f, 0, 19, 1, 3, 3, 3, 0xc0bcb0);
    f.set(-2, 22, 1, 0xb8b4a8); f.set(-2, 23, 1, 0xb8b4a8); f.set(1, 22, 1, 0xb8b4a8); f.set(1, 23, 1, 0xb8b4a8);
    fill(f, -2, 1, 15, 16, 3, 3, 0xd8302a);
    ell(f, sx * 3, 11, -3, 2, 6, 2, 0xb0aca0);
    const fm = vm(f, V5, [0.5, 0, 0.5]); fm.position.set(sx * 0.62, 0, 0.62); fm.rotation.y = -sx * 0.35; g.add(fm);
  }
  // lit stone lantern glow (tōrō) on the base
  const gl = new VoxelModel(); fill(gl, -1, 0, 14, 16, 6, 6, 0xffd070);
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.0, mode: 3, onU }));
  return g;
}

// ---------------------------------------------------------------- arcade gate (west end)
// two steel pillars and a big lit sign beam spanning the street (only the far
// pillar + beam are built; the near pillar sits in the cut-away)
export function arcadeGate(span = 8, { onU = null } = {}) {
  const g = grp();
  const v = new VoxelModel();
  const H = 100, Z = Math.round(span / V5);
  for (const z0 of [0]) fill(v, -3, 2, 0, H, z0 - 3, z0 + 2, (x, y, z) => (y < 4 ? 0x5a5a62 : y % 20 === 0 ? 0xb8903a : 0x3a4a6a));
  fill(v, -4, 3, H, H + 18, -4, Z, (x, y, z) => (y === H || y === H + 18 ? 0xb8903a : 0x2a3a5a));
  g.add(vm(v, V5));
  const sign = signPlane(gateSign(), 4.6, { emissive: 0.75, onU });
  sign.position.set(0, (H + 9) * V5, span * 0.62);
  sign.rotation.y = 0; // faces the camera
  g.add(sign);
  // a row of lanterns under the beam
  for (let i = 0; i < 6; i++) { const L = lantern({ col: i % 2 ? 0xf4f0e8 : 0xe8402a, onU, text: ['木', '霊', '銀', '座', '祭', '夏'][i], r: 4, h: 11 }); L.position.set(0, H * V5 - L.userData.height - 0.05, 0.9 + i * 1.15); g.add(L); }
  return g;
}

// ---------------------------------------------------------------- roof shadow caster
// the arcade roof isn't drawn (it would hide the street) but its ribs and
// panel frames still cast striped shadows: a shadow-only mesh
export function roofShadow(x0, x1, z0, z1, y, { every = 3.2, rib = 0.18 } = {}) {
  const geo = [];
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const g = grp();
  for (let x = x0; x <= x1; x += every) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(rib, 0.08, z1 - z0), mat);
    m.position.set(x, y, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = false;
    g.add(m);
  }
  for (const z of [z0 + 0.6, (z0 + z1) / 2, z1 - 0.6]) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.12), mat); m.position.set((x0 + x1) / 2, y, z); m.castShadow = true; g.add(m); }
  void geo;
  return g;
}

// ---------------------------------------------------------------- crates, boxes, buckets, racks
export function crate({ col = 0xb8884a, w = 10, h = 7, d = 8, label = false } = {}) {
  const v = new VoxelModel();
  fill(v, -w / 2, w / 2 - 1, 0, h - 1, -d / 2, d / 2 - 1, (x, y, z) => ((y === 0 || y === h - 1 || x === -w / 2 || x === w / 2 - 1) ? sh(col, 0.82) : y % 3 === 0 ? sh(col, 0.9) : col));
  carve(v, -w / 2 + 1, w / 2 - 2, 1, h - 1, -d / 2 + 1, d / 2 - 2);
  if (label) fill(v, -2, 1, 2, 4, d / 2, d / 2, 0xe8443a);
  return grp(vm(v, V5));
}
export function styroBox({ w = 12, h = 6, d = 8, label = 0x3a6ab0 } = {}) {
  const v = new VoxelModel();
  fill(v, -w / 2, w / 2 - 1, 0, h - 1, -d / 2, d / 2 - 1, (x, y, z) => (y === h - 1 ? 0xf8f8f4 : z === d / 2 - 1 && y >= 2 && y <= 3 && x > -3 && x < 3 ? label : 0xecece6));
  return grp(vm(v, V5));
}
export function bucket({ col = 0xa8b0b8 } = {}) {
  const v = new VoxelModel();
  for (let y = 0; y < 8; y++) { const r = 3 + y * 0.18; for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) { const d = Math.hypot(x, z); if (d <= r && (d > r - 1.2 || y === 0)) v.set(x, y, z, y === 7 ? sh(col, 1.15) : (x + y) % 5 === 0 ? sh(col, 0.9) : col); } }
  const g = grp(vm(v, V5, [0.5, 0, 0.5]));
  g.userData.top = 8 * V5;
  return g;
}
// clothes rack: a rail with hanging shirts / coats in a run of colours
export function clothesRack({ len = 28, seed = 1 } = {}) {
  const v = new VoxelModel();
  for (const x of [-len / 2, len / 2 - 1]) { fill(v, x, x, 0, 34, 0, 0, 0xb8bcc4); fill(v, x, x, 0, 0, -4, 4, 0x8a8e96); }
  fill(v, -len / 2, len / 2 - 1, 34, 34, 0, 0, 0xd8dce0);
  const cols = [0xe8443a, 0x3a6ab0, 0xf4f0e8, 0x2a2a34, 0xf0c040, 0x6a8a5a, 0xc87a9a, 0x8a6a4a, 0x5ab8c8];
  for (let x = -len / 2 + 2; x < len / 2 - 2; x += 2) {
    const c = cols[Math.floor(hash3(x, seed, 1) * cols.length)];
    const L = 14 + Math.floor(hash3(x, seed, 2) * 10);
    fill(v, x, x + 1, 33 - L, 32, -3, 3, (xx, y, z) => (Math.abs(z) === 3 && y < 30 ? undefined : y === 32 ? sh(c, 1.1) : (y + z) % 7 === 0 ? sh(c, 0.88) : c));
    v.set(x, 33, 0, 0x8a8e96);
  }
  return grp(vm(v, V5));
}
// 100-yen book cart (wagon of paperbacks)
export function bookCart({ len = 26, seed = 1 } = {}) {
  const v = new VoxelModel();
  fill(v, -len / 2, len / 2 - 1, 10, 11, -6, 5, 0x6a4a2e);
  for (const x of [-len / 2 + 1, len / 2 - 2]) for (const z of [-5, 4]) fill(v, x, x, 0, 9, z, z, 0x5a3a24);
  const cols = [0x8a6a4a, 0xa8885a, 0x6a4a3a, 0xc8a878, 0x4a5a6a, 0x7a3a2a, 0xd8c8a0, 0xb84a3a];
  for (let x = -len / 2 + 1; x < len / 2 - 1; x++) for (let z = -5; z <= 4; z += 3) {
    const h = 4 + Math.floor(hash3(x, z, seed) * 3);
    fill(v, x, x, 12, 11 + h, z, z + 2, cols[Math.floor(hash3(x, z + 9, seed) * cols.length)]);
  }
  const g = grp(vm(v, V5));
  const p = new PixCanvas(28, 12, 44); p.rect(0, 0, 28, 12, '#fff8e0'); p.frame(0, 0, 28, 12, '#c8302a'); p.text('1冊100円', 14, 2, { font: `7px ${FONT.tiny}`, color: '#c8302a', align: 'center' });
  const s = signPlane(p, 0.42); s.position.set(0, 0.42, 6 * V5 + 0.01); g.add(s);
  return g;
}
// A-frame chalkboard on the street
export function aFrame({ title, lines, doodle, seed = 1 } = {}) {
  const v = new VoxelModel();
  for (let y = 0; y < 18; y++) { const z = Math.round(y * 0.22); fill(v, -6, 5, y, y, 3 - z, 3 - z, 0x6a4a2a); fill(v, -6, 5, y, y, -3 + z, -3 + z, 0x6a4a2a); }
  const g = grp(vm(v, V5));
  const b = signPlane(menuBoard({ title, lines, doodle, seed }), 0.5);
  b.position.set(0, 0.47, 0.11); b.rotation.x = -0.2; g.add(b);
  return g;
}
// a curled-up cat sleeping on something (tail flicks)
export function sleepingCat({ col = 0xe8a04a, stripe = 0xc87a2a } = {}) {
  const v = new VoxelModel();
  ell(v, 0.5, 3, 0.5, 6, 3.5, 4.5, (x, y, z) => ((x + 20) % 3 === 0 ? stripe : col));
  ell(v, 5, 4, 2, 3, 2.6, 2.6, col);
  v.set(6, 7, 1, col); v.set(6, 7, 3, col); v.set(7, 4, 4, 0x2a2228); v.set(7, 4, 2, 0x2a2228);
  const g = grp(vm(v, V25, [0.5, 0, 0.5]));
  const tv = new VoxelModel(); for (let i = 0; i < 9; i++) tv.set(-i, 0, Math.round(Math.sin(i * 0.5) * 2), i % 3 === 0 ? stripe : col);
  const tail = vm(tv, V25); tail.position.set(-5 * V25, 1 * V25, 3 * V25); g.add(tail);
  g.userData.update = (dt, t) => { tail.rotation.y = Math.sin(t * 0.9) * 0.25 + (Math.sin(t * 0.23) > 0.92 ? Math.sin(t * 14) * 0.3 : 0); g.children[0].scale.y = 1 + Math.sin(t * 1.4) * 0.03; };
  return g;
}

// bamboo street broom (takebōki), held in a hand: origin at the grip
export function broom() {
  const v = new VoxelModel();
  fill(v, 0, 0, -10, 30, 0, 0, 0xc8a050);
  for (let i = 0; i < 9; i++) for (let y = -22; y < -10; y++) { const x = Math.round((i - 4) * (1 + (-10 - y) * 0.08)); v.set(x, y, (i % 3) - 1, (i + y) % 3 === 0 ? 0x8a7a3a : 0xa89448); }
  fill(v, -2, 2, -11, -10, -1, 1, 0x6a5a2a);
  return vm(v, V25, [0.5, 0, 0.5]);
}

// the arcade's front edge over the shops: a steel gutter beam on brackets with
// a row of little downlights (only this edge is drawn; the roof is cut away)
export function arcadeEdge(len, { onU = null, every = 4.8 } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const n = Math.round(len / V5);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < 4; y++) v.set(x, y, 0, y === 0 ? 0x4a5060 : y === 3 ? 0x8a92a0 : 0x6a7282);
    v.set(x, 3, -1, 0x8a92a0); v.set(x, 0, 1, 0x3a4050);
    if (x % 32 === 16) { gl.set(x, -1, 0, 0xfff0d0); gl.set(x + 1, -1, 0, 0xfff0d0); v.set(x - 1, -1, 0, 0x3a4050); v.set(x + 2, -1, 0, 0x3a4050); }
  }
  const step = Math.round(every / V5);
  for (let x = 4; x < n; x += step) {
    for (let z = -18; z <= 0; z++) { v.set(x, 1, z, 0x5a6272); v.set(x + 1, 1, z, 0x5a6272); }
    for (let k = 0; k < 12; k++) v.set(x, 1 + k, -18 + k, 0x5a6272); // diagonal strut up toward the roof
  }
  const g = grp(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.4, onU }));
  return g;
}

// nobori: a tall vertical banner on a pole outside a shop, swaying a little
export function nobori({ text = '営業中', bg = '#e8302a', fg = '#ffffff', edge = '#ffffff', font = FONT.brush, seed = 1 } = {}) {
  const chars = [...text];
  const W = 22, H = 18 + chars.length * 17;
  const p = new PixCanvas(W, H, 1700 + seed);
  p.rect(0, 0, W, H, bg);
  p.rect(0, 0, 3, H, edge); p.rect(0, 0, W, 3, edge);
  for (let y = 6; y < H; y += 10) p.px(1, y, bg);
  chars.forEach((ch, i) => p.text(ch, W / 2 + 1, 8 + i * 17, { font: `14px ${font}`, color: fg, align: 'center' }));
  const g = grp();
  const pole = new VoxelModel();
  const PH = Math.round((H / 64) * 1.5 / V5) + 14;
  fill(pole, 0, 0, 0, PH, 0, 0, 0xc8ccd4);
  fill(pole, -2, 2, 0, 1, -2, 2, 0x3a3a40);
  g.add(vm(pole, V5, [0.5, 0, 0.5]));
  const FS = 1.5; // flags are big: ~0.5 m wide
  const flag = signPlane(p, (W / 64) * FS, { double: true });
  const piv = new THREE.Group();
  flag.position.set((W / 128) * FS + 0.03, -(H / 128) * FS, 0);
  piv.add(flag);
  piv.position.set(0, (PH - 2) * V5, 0);
  g.add(piv);
  // the little top bar the flag hangs from
  const bar = new VoxelModel(); fill(bar, 0, Math.round((W / 64) * FS / V5) + 1, 0, 0, 0, 0, 0xc8ccd4);
  const bm = vm(bar, V5); bm.position.set(0, piv.position.y + 0.02, 0); g.add(bm);
  const ph = seed * 1.7;
  g.userData.update = (dt, t) => { piv.rotation.y = Math.sin(t * 1.1 + ph) * 0.22; flag.rotation.z = Math.sin(t * 1.7 + ph) * 0.02; };
  return g;
}
