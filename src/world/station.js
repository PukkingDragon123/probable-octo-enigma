// Station furniture for the Shinkansen platform, built to read at a glance and
// reward a close look: a glass waiting room with people inside, a standing
// soba stand with a noren and steaming pots, a hanging LED departure board
// that scrolls, painted I-beam columns with glowing ad light boxes, the
// overhead beam with cable trays, and the small safety kit (extinguisher box,
// AED, emergency-stop post, convex mirror, speakers, cameras).
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, cyl, tone, hash3, rbox, ell, sh, V5, V25 } from './build.js';
import { PixCanvas, makeTexture, mix, darken, lighten } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { FONT } from '../ui/fonts.js';

const INK = '#2a1828';
const grp = (...k) => { const g = new THREE.Group(); for (const c of k) if (c) g.add(c); return g; };
let glassMatCache = null;
export function glassMat() {
  if (glassMatCache) return glassMatCache;
  // faint blue glass with diagonal glare streaks (pixel texture)
  const p = new PixCanvas(64, 64, 9);
  p.fill('rgba(170,210,230,0.16)');
  for (let i = -64; i < 64; i += 22) for (let k = 0; k < 64; k++) { p.px(i + k, 63 - k, 'rgba(255,255,255,0.42)'); p.px(i + k + 1, 63 - k, 'rgba(255,255,255,0.22)'); p.px(i + k + 5, 63 - k, 'rgba(255,255,255,0.18)'); }
  const tex = makeTexture(p.c, { repeat: true, mips: false });
  glassMatCache = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  return glassMatCache;
}
function glassPane(w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv.array; for (let i = 0; i < uv.length; i += 2) { uv[i] *= w; uv[i + 1] *= h; }
  const m = new THREE.Mesh(g, glassMat());
  m.renderOrder = 5;
  return m;
}

// ---------------------------------------------------------------- the glass waiting room (待合室)
// origin at the floor centre of its front edge; extends to -z. Returns the group
// with userData.bench (seat points in local space) and .door (entry point).
export function waitingRoom({ w = 88, d = 30, h = 46, onU = null } = {}) {
  const v = new VoxelModel(), G = new VoxelModel();
  const AL = 0xb8bec8, ALD = 0x8a909c, ALL = 0xd8dce4, FLOOR = 0x9a9488;
  const x0 = -w / 2, x1 = w / 2 - 1, z0 = -d, z1 = -1;
  // floor plinth
  fill(v, x0, x1, 0, 0, z0, z1, (x, y, z) => ((x + z) % 8 === 0 ? sh(FLOOR, 0.94) : FLOOR));
  // aluminium posts + rails (front and back), side frames
  for (const x of [x0, x0 + 1, x1 - 1, x1, -12, -11, 10, 11]) for (let y = 1; y < h; y++) { v.set(x, y, z1, ALL); v.set(x, y, z0, AL); }
  for (const z of [z0, z0 + 1, z1 - 1, z1]) for (let y = 1; y < h; y++) { v.set(x0, y, z, AL); v.set(x1, y, z, ALD); }
  for (let x = x0; x <= x1; x++) for (const y of [1, 2, h - 2, h - 1, 16]) { v.set(x, y, z1, y === 16 ? ALD : ALL); v.set(x, y, z0, AL); }
  for (let z = z0; z <= z1; z++) for (const y of [h - 2, h - 1]) { v.set(x0, y, z, AL); v.set(x1, y, z, ALD); }
  // back wall: solid panel below the window line (ad panels), seats along it
  fill(v, x0 + 2, x1 - 2, 1, 15, z0, z0, (x, y) => (y === 15 ? ALD : (x + 200) % 22 < 1 ? ALD : 0xe8e4dc));
  // bench: a long moulded seat on the back wall
  for (let x = x0 + 4; x <= x1 - 4; x++) { const seat = (x - x0 - 4) % 9 < 8; if (!seat) continue; for (let z = z0 + 1; z <= z0 + 7; z++) v.set(x, 6, z, 0x3a8a9a); for (let y = 7; y <= 13; y++) v.set(x, y, z0 + 1, 0x3a8a9a); }
  for (let x = x0 + 4; x <= x1 - 4; x += 18) for (let y = 1; y <= 5; y++) v.set(x, y, z0 + 4, ALD);
  // AC unit + sign box on the roof edge (back), roof frame only (so you can see inside)
  fill(v, -14, 13, h, h + 5, z0, z0 + 7, (x, y, z) => (y === h + 5 ? 0xd8dce0 : (x + y) % 3 === 0 && z === z0 + 7 ? 0x9aa0a8 : 0xc8ccd4));
  // sliding door (front centre): dark rubber edges, a handle
  for (let y = 3; y < h - 3; y++) { v.set(-11, y, z1 + 1, 0x3a3a42); v.set(10, y, z1 + 1, 0x3a3a42); }
  for (let y = 18; y <= 24; y++) { v.set(-2, y, z1 + 1, ALD); v.set(1, y, z1 + 1, ALD); }
  const g = grp(vm(v, V5));
  // glass: front (2 panes + door), sides, back upper
  const H = (h - 3) * V5, W = w * V5, D = d * V5;
  const front = [[x0 + 2, -12], [-10, 9], [12, x1 - 2]];
  for (const [a, b] of front) { const p = glassPane((b - a + 1) * V5, H); p.position.set(((a + b + 1) / 2) * V5, (h / 2 + 0.5) * V5, z1 * V5 + 0.06); g.add(p); }
  for (const sx of [x0, x1]) { const p = glassPane(D - 0.1, H); p.rotation.y = Math.PI / 2; p.position.set((sx + 0.5) * V5, (h / 2 + 0.5) * V5, -D / 2); g.add(p); }
  const back = glassPane(W - 0.2, (h - 18) * V5); back.position.set(0, (16 + (h - 16) / 2) * V5, z0 * V5 + 0.03); g.add(back);
  // glowing sign over the door
  const sp = new PixCanvas(72, 11, 4);
  sp.fill('#2a5a7a'); sp.frame(0, 0, 72, 11, '#1a3a52');
  sp.text('待合室', 4, 1, { font: `9px ${FONT.small}`, color: '#ffffff' });
  sp.text('Waiting Room', 69, 2, { font: `7px ${FONT.tiny}`, color: '#c8e8f8', align: 'right' });
  const sign = signPlane(sp, 1.05, { emissive: 0.8, onU });
  sign.position.set(0, (h - 4) * V5, z1 * V5 + 0.09);
  g.add(sign);
  // seat points (local) for people inside
  g.userData.seats = [];
  for (let x = x0 + 4; x <= x1 - 12; x += 9) g.userData.seats.push({ x: (x + 4) * V5, z: (z0 + 4) * V5, y: 7 * V5, yaw: 0 });
  g.userData.door = { x: 0, z: z1 * V5 + 0.3 };
  return g;
}

// ---------------------------------------------------------------- standing soba stand (立ち食いそば)
export function sobaStand({ onU = null } = {}) {
  const v = new VoxelModel(), G = new VoxelModel();
  const W = 30, D = 22, H = 46; // x -30..29, z -22..-1 (front at z 0)
  const WOOD = 0xb8844e, WOODD = 0x8e6038, TILE = 0xe8e4da, STEEL = 0xc8ccd4, NAVY = 0x2a3a5a;
  // back + side walls (tiled), counter at the front
  fill(v, -W, W - 1, 0, H - 1, -D, -D + 1, (x, y) => (y % 5 === 0 || (x + 200) % 5 === 0 ? sh(TILE, 0.9) : TILE));
  for (const x of [-W, W - 1]) fill(v, x, x, 0, H - 1, -D, -1, (x2, y, z) => (y > 40 ? NAVY : z % 6 === 0 ? sh(WOOD, 0.85) : WOOD));
  fill(v, -W + 1, W - 2, 0, 17, -3, -1, (x, y, z) => (y >= 16 ? STEEL : y === 0 ? 0x5a5a62 : (x + 200) % 10 === 0 ? WOODD : WOOD));
  fill(v, -W, W - 1, 18, 19, -4, 1, (x, y, z) => (y === 19 ? 0xd8dce2 : STEEL)); // steel counter top with a lip
  // kitchen: a big pot with soup, a boiler, stacked bowls, ladles
  for (const [cx, col] of [[-16, 0xc8a050], [-4, 0x8a5a3a]]) {
    cyl(v, cx, -12, 4.5, 18, 24, (x, y, z) => (y === 24 ? col : STEEL));
    v.set(cx, 25, -12, 0x6a6a72); v.set(cx + 1, 26, -12, 0x6a6a72);
  }
  for (let i = 0; i < 4; i++) { cyl(v, 10, -12, 2.5, 18 + i * 2, 19 + i * 2, i % 2 ? 0xe8443a : 0x2a2228); }
  for (let i = 0; i < 5; i++) cyl(v, 20, -6, 2.2, 20 + i, 20 + i, i % 2 ? 0xf4f0e8 : 0xd8d0c4);
  // menu board on the back wall (pixel plane added below), roof eave at the front
  fill(v, -W - 1, W, H, H + 2, -D - 1, 3, (x, y, z) => (y === H + 2 ? NAVY : z >= 2 ? 0x1e2a44 : NAVY));
  // red lantern (glow) hanging at the corner
  ell(G, -W + 3, H - 8, 2, 2.6, 3.4, 2.6, (x, y, z) => (y === H - 8 ? 0xffd8a0 : 0xe8442e));
  const g = grp(vm(v, V5), glowVm(G, V5, [0, 0, 0], { intensity: 1.3, mode: 3, onU }));
  // menu board (pixel art: bowls with prices)
  const mp = new PixCanvas(72, 30, 8);
  mp.fill('#f4ecd8'); mp.frame(0, 0, 72, 30, '#5a3a24');
  const items = [['かけ', '330', '#c8a050'], ['きつね', '420', '#e8a040'], ['天ぷら', '480', '#e8c070'], ['月見', '400', '#ffe060']];
  items.forEach(([n, pr, c], i) => {
    const x = 4 + i * 17;
    mp.ellipse(x + 6, 9, 6, 3, '#2a2228'); mp.ellipse(x + 6, 8, 5, 2, c);
    if (n === '月見') mp.circle(x + 6, 8, 1.5, '#fff8c0');
    mp.text(n, x + 6, 14, { font: `7px ${FONT.tiny}`, color: INK, align: 'center' });
    mp.text('¥' + pr, x + 6, 21, { font: `7px ${FONT.tiny}`, color: '#c83a2a', align: 'center' });
  });
  const menu = signPlane(mp, 1.5);
  menu.position.set(0, 1.62, -D * V5 + 0.1 + 0.05);
  g.add(menu);
  // noren: four navy cloth strips with そば in white, hanging from the eave
  const np = new PixCanvas(64, 20, 6);
  for (let i = 0; i < 4; i++) { np.rect(i * 16 + 1, 0, 14, 20, '#2a3a6a'); np.rect(i * 16 + 1, 18, 14, 2, '#1e2a50'); }
  np.text('そ', 9, 3, { font: `11px ${FONT.brush}`, color: '#f8f4ec', align: 'center' });
  np.text('ば', 25, 3, { font: `11px ${FONT.brush}`, color: '#f8f4ec', align: 'center' });
  np.text('う', 41, 3, { font: `11px ${FONT.brush}`, color: '#f8f4ec', align: 'center' });
  np.text('どん', 57, 4, { font: `8px ${FONT.brush}`, color: '#f8f4ec', align: 'center' });
  const noren = signPlane(np, 2.6, { double: true });
  noren.position.set(0, (H - 4) * V5, 0.16);
  g.add(noren);
  g.userData.noren = noren;
  // the counter's standing spots and the cook's spot (local space)
  g.userData.spots = [{ x: -0.9, z: 0.45, yaw: Math.PI }, { x: 0.2, z: 0.45, yaw: Math.PI }, { x: 1.1, z: 0.45, yaw: Math.PI }];
  g.userData.cook = { x: -0.4, z: -0.6, yaw: 0 };
  g.userData.steam = [{ x: -16 * V5, y: 1.3, z: -12 * V5 }, { x: -4 * V5, y: 1.3, z: -12 * V5 }];
  return g;
}

// ---------------------------------------------------------------- LED departure board (scrolls)
export function departureBoard({ rows = [['こだま', '742', '16:42', '木霊町', '14']], onU = null } = {}) {
  const W = 128, H = 40;
  const p = new PixCanvas(W, H, 21);
  const tex = makeTexture(p.c, { mips: false });
  const g = new THREE.Group();
  const box = new VoxelModel();
  fill(box, -44, 43, 0, 17, -2, 1, (x, y) => (y === 0 || y === 17 ? 0x3a3a42 : 0x2a2a30));
  for (const x of [-30, 29]) for (let y = 18; y <= 24; y++) box.set(x, y, 0, 0x5a5a62);
  g.add(vm(box, V5, [0, 0, 0]));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), emitMat({ map: tex, intensity: 1.35, onU }));
  scr.position.set(0, 0.45, 0.11);
  g.add(scr);
  let t = 0, scroll = 0;
  const draw = () => {
    p.fill('#0e0a0a');
    for (let x = 0; x < W; x += 2) for (let y = 0; y < H; y += 2) p.px(x, y, '#1a1210');
    rows.forEach(([kind, num, time, dest, track], i) => {
      const y = 1 + i * 12;
      p.text(kind, 2, y, { font: `9px ${FONT.ui}`, color: '#ffa024' });
      p.text(num, 34, y, { font: `9px ${FONT.ui}`, color: '#ffd04a' });
      p.text(time, 56, y, { font: `9px ${FONT.ui}`, color: '#7aff6a' });
      p.text(dest, 88, y, { font: `9px ${FONT.ui}`, color: '#ffa024' });
      p.text(track, 124, y, { font: `9px ${FONT.ui}`, color: '#ffffff', align: 'right' });
    });
    const msg = 'The Kodama for Kodama-machi is arriving on track 14.   Please stand behind the yellow line.   ';
    p.hline(0, W - 1, 27, '#2a1a14');
    const r = p.text(msg, Math.round(W - scroll), 30, { font: `7px ${FONT.tiny}`, color: '#ffd04a' });
    if (scroll > W + (r.w || 400)) scroll = 0;
    tex.needsUpdate = true;
  };
  draw();
  g.userData.update = (dt) => { t += dt; scroll += dt * 26; if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) draw(); };
  return g;
}

// ---------------------------------------------------------------- column: painted I-beam + ad light box
const AD_KINDS = ['gacha', 'travel', 'onsen', 'bento', 'phone'];
export function adPanel(kind = 'gacha', seed = 1) {
  const W = 30, H = 46;
  const p = new PixCanvas(W, H, 30 + seed);
  if (kind === 'gacha') {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#ffe3a8', '#ff8aa8', y / H));
    for (let i = 0; i < 6; i++) { const cx = 6 + (i % 3) * 9, cy = 12 + Math.floor(i / 3) * 10, c = ['#ff6a5a', '#5ac8f0', '#ffd040', '#8ad060', '#c88af0', '#ff9a40'][i]; p.circle(cx, cy, 4, INK); p.circle(cx, cy, 3, '#fff6ea'); p.rect(cx - 3, cy - 3, 7, 3, c); p.rect(cx - 3, cy, 7, 1, INK); }
    p.text('ガチャ', W / 2, 1, { font: `8px ${FONT.pop}`, color: '#e8443a', align: 'center', outline: '#fff6ea' });
    p.text('木霊銀座', W / 2, 34, { font: `7px ${FONT.tiny}`, color: INK, align: 'center' });
    p.text('すぐそこ!', W / 2, 40, { font: `7px ${FONT.tiny}`, color: '#c83a2a', align: 'center' });
  } else if (kind === 'onsen') {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#5a8ac8', '#f0c8a0', y / H));
    p.ellipse(15, 34, 13, 5, '#8ad0f0'); p.ellipse(15, 33, 11, 3, '#c8f0ff');
    for (let i = 0; i < 3; i++) for (let k = 0; k < 8; k++) p.px(9 + i * 6 + Math.round(Math.sin(k + i) * 1.4), 26 - k * 2, '#ffffff');
    p.text('♨', 15, 4, { font: `12px ${FONT.ui}`, color: '#ffffff', align: 'center' });
    p.text('温泉', W / 2, 17, { font: `8px ${FONT.brush}`, color: '#ffffff', align: 'center', outline: '#3a5a8a' });
  } else if (kind === 'bento') {
    p.fill('#f8f0dc'); p.rect(3, 12, 24, 18, '#a8302a'); p.rect(5, 14, 20, 14, '#2a1a1e');
    p.rect(6, 15, 9, 12, '#faf8f0'); p.circle(10, 20, 2, '#d8243a'); p.rect(16, 15, 8, 5, '#ffd84a'); p.rect(16, 21, 8, 6, '#c86a3a');
    p.text('駅弁', W / 2, 1, { font: `9px ${FONT.bold}`, color: '#a8302a', align: 'center' });
    p.text('¥1,200', W / 2, 34, { font: `7px ${FONT.tiny}`, color: INK, align: 'center' });
  } else if (kind === 'phone') {
    p.fill('#2a2a3a'); p.rrect(8, 6, 14, 26, 2, '#e8e8f0'); p.rect(10, 9, 10, 18, '#5a9ae8'); p.circle(15, 29, 1, '#8a8a9a');
    p.text('kodaPhone', W / 2, 35, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
    p.text('NEW', W / 2, 41, { font: `7px ${FONT.tiny}`, color: '#ffd040', align: 'center' });
  } else {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#f8d8a0', '#e88a5a', y / H));
    for (let i = 0; i < 4; i++) { const y = 14 + i * 5, hw = 7 - i; p.rect(14 - hw, y, hw * 2 + 3, 1, '#3a1a28'); p.rect(15 - hw + 1, y + 1, hw * 2, 4, '#c84a3a'); }
    p.text('京都', W / 2, 2, { font: `8px ${FONT.brush}`, color: '#ffffff', align: 'center', outline: '#7a2a2a' });
    p.text('AUTUMN', W / 2, 38, { font: `7px ${FONT.tiny}`, color: '#fff4d8', align: 'center' });
  }
  p.frame(0, 0, W, H, '#3a3a42');
  return p;
}
export function stationColumn({ h = 68, ad = 'gacha', seed = 1, onU = null } = {}) {
  const v = new VoxelModel();
  const P = 0x8a96aa, PD = 0x6e7a8e, PL = 0xa8b2c4, BAND = 0x2e8a7a, BOLT = 0x5a6474;
  // I-beam: flanges front/back, web in the middle
  for (let y = 0; y < h; y++) {
    const band = y >= 22 && y <= 24;
    for (let x = -3; x <= 2; x++) { v.set(x, y, 2, band ? BAND : x === -3 ? PL : P); v.set(x, y, -3, band ? BAND : PD); }
    for (let z = -2; z <= 1; z++) v.set(-1, y, z, band ? BAND : PD), v.set(0, y, z, PD);
  }
  // base plate with bolts, capital where it meets the beam
  fill(v, -5, 4, 0, 1, -5, 4, (x, y, z) => ((x === -4 || x === 3) && (z === -4 || z === 3) && y === 1 ? BOLT : 0x5a6070));
  fill(v, -4, 3, h, h + 1, -4, 3, PD);
  const g = grp(vm(v, V5));
  // glowing ad light box on the front
  if (ad) {
    const box = new VoxelModel();
    fill(box, -9, 8, 0, 25, 0, 2, (x, y, z) => (x === -9 || x === 8 || y === 0 || y === 25 ? 0xc8ccd4 : 0x9aa0a8));
    const b = vm(box, V5); b.position.set(0, 0.55, 2 * V5 + 0.01); g.add(b);
    const pl = signPlane(adPanel(ad, seed), 0.78, { emissive: 0.75, onU });
    pl.position.set(0, 0.55 + 13 * V5, 5 * V5 + 0.012);
    g.add(pl);
  }
  return g;
}

// ---------------------------------------------------------------- overhead beam, cable tray, cross beams
export function overheadBeam(len = 36, { crossEvery = 6, crossBack = 3.4, crossFront = 3.8 } = {}) {
  const v = new VoxelModel();
  const n = Math.round(len / V5 / 2);
  const P = 0x8a96aa, PD = 0x6e7a8e, PL = 0xa8b2c4;
  for (let x = -n; x < n; x++) {
    for (let z = -3; z <= 2; z++) { v.set(x, 0, z, z === 2 ? PL : PD); v.set(x, 7, z, z === 2 ? PL : P); }
    for (let y = 1; y <= 6; y++) v.set(x, y, 0, PD);
    // cable tray on the back side with cables
    for (let z = -8; z <= -5; z++) v.set(x, 3, z, 0x6a6e78);
    v.set(x, 4, -8, 0x6a6e78); v.set(x, 4, -5, 0x6a6e78);
    v.set(x, 4, -7, (x & 7) < 4 ? 0x2a2a30 : 0x3a3a44); v.set(x, 4, -6, 0x1e1e24);
    if (x % 30 === 0) for (let y = 4; y <= 6; y++) v.set(x, y, -6, 0x5a5a62);
  }
  const step = Math.round(crossEvery / V5);
  for (let x = -n + step / 2; x < n; x += step) {
    for (let z = -Math.round(crossBack / V5); z <= Math.round(crossFront / V5); z++) for (let y = 1; y <= 5; y++) if (y === 1 || y === 5 || z % 6 === 0 || y === 3) v.set(x, y + 1, z, y === 5 ? PL : PD);
  }
  return vm(v, V5);
}

// ---------------------------------------------------------------- small safety kit
export function extinguisherBox() {
  const v = new VoxelModel();
  fill(v, -4, 3, 0, 15, 0, 3, (x, y, z) => (x === -4 || x === 3 || y === 0 || y === 15 ? 0xa8241e : z === 3 && y > 2 && y < 13 ? 0xe8e8ec : 0xd8342c));
  for (let y = 4; y <= 10; y++) v.set(-1, y, 4, 0xd8342c), v.set(0, y, 4, 0xd8342c);
  const g = grp(vm(v, V5));
  const p = new PixCanvas(16, 6, 2); p.fill('#d8342c'); p.text('消火器', 8, 0, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  const s = signPlane(p, 0.28); s.position.set(0, 0.86, 0.18); g.add(s);
  return g;
}
export function aedBox() {
  const v = new VoxelModel();
  fill(v, -5, 4, 0, 13, 0, 3, (x, y, z) => (x === -5 || x === 4 || y === 0 || y === 13 ? 0xd8d8dc : z === 3 ? 0xf4f4f6 : 0xe8e8ec));
  const g = grp(vm(v, V5));
  const p = new PixCanvas(18, 14, 3); p.fill('#f4f4f6'); p.rect(0, 0, 18, 5, '#2ab05a'); p.text('AED', 9, 0, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  p.circle(9, 9, 3, '#e8443a'); p.line(7, 9, 8, 7, '#ffffff'); p.line(8, 7, 10, 11, '#ffffff'); p.line(10, 11, 11, 9, '#ffffff');
  const s = signPlane(p, 0.4); s.position.set(0, 0.35, 0.18); g.add(s);
  return g;
}
export function emergencyPost() {
  const v = new VoxelModel();
  for (let y = 0; y < 22; y++) for (let x = -1; x <= 0; x++) for (let z = -1; z <= 0; z++) v.set(x, y, z, Math.floor(y / 2) % 2 ? 0x2a2a30 : 0xf0c430);
  fill(v, -2, 1, 22, 26, -2, 1, 0xd8d8dc);
  v.set(-1, 24, 2, 0xe8302a); v.set(0, 24, 2, 0xe8302a); v.set(-1, 23, 2, 0xe8302a); v.set(0, 23, 2, 0xb8241e);
  return grp(vm(v, V5));
}
export function convexMirror() {
  const v = new VoxelModel(), G = new VoxelModel();
  for (let y = 0; y < 52; y++) v.set(0, y, 0, 0x8a8e96);
  for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; v.set(Math.round(Math.cos(t) * 5), 56 + Math.round(Math.sin(t) * 5), 1, 0xe8642a); }
  ell(G, 0.5, 56.5, 1.5, 4.4, 4.4, 1.2, (x, y, z) => ((x + y) % 5 === 0 ? 0xf8f8ff : 0xb8d0e8));
  return grp(vm(v, V5), glowVm(G, V5, [0, 0, 0], { intensity: 0.55 }));
}
export function speakerCam() {
  const v = new VoxelModel();
  fill(v, -2, 1, 0, 3, 0, 4, (x, y, z) => (z === 4 ? 0x3a3a42 : 0xd8d8dc)); // speaker horn box
  fill(v, 4, 6, 1, 2, 0, 3, 0xf4f4f6); v.set(5, 1, 4, 0x2a2a30); // camera
  return grp(vm(v, V5));
}
export function plantPot({ col = 0xc87a4a } = {}) {
  const v = new VoxelModel();
  cyl(v, 0.5, 0.5, 4, 0, 7, (x, y, z) => (y === 7 ? sh(col, 1.1) : y === 0 ? sh(col, 0.7) : (x + y) % 4 === 0 ? sh(col, 0.9) : col));
  cyl(v, 0.5, 0.5, 3.2, 7, 7, 0x4a3a2a);
  return grp(vm(v, V5));
}

// ---------------------------------------------------------------- floor decals: boarding positions
export function boardingMarker(car = 7, door = 'A') {
  const p = new PixCanvas(40, 22, 40 + car);
  // two queue lanes with arrows + the car number disc, painted (worn) on the floor
  for (const lx of [2, 26]) {
    p.rect(lx, 0, 12, 22, 'rgba(0,0,0,0)');
    p.rect(lx, 0, 1, 22, '#3aa86a'); p.rect(lx + 11, 0, 1, 22, '#3aa86a');
    for (let k = 0; k < 3; k++) { const y = 4 + k * 6; p.poly([[lx + 6, y - 3], [lx + 10, y + 1], [lx + 2, y + 1]], '#3aa86a'); }
  }
  p.circle(20, 11, 6, '#2a6ab0'); p.circle(20, 11, 5, '#3a8ad8');
  p.text(String(car), 20, 7, { font: `8px ${FONT.ui}`, color: '#ffffff', align: 'center' });
  return p;
}
