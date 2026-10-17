// Ekimae (駅前): the square in front of Kodama-machi station, west of the
// Kodama Ginza arcade gate, and the little road you cross between the two.
// Same side-on conventions as the shop kit: every builder returns a
// THREE.Group with its origin at the bottom centre of its front, the street
// is +z and buildings extend to -z. Animated bits expose userData.update(dt, t).
//
//   stationHouse   the station: a tiled two-storey front under a hipped kawara
//                  roof, glass doors with the ticket gates glowing inside, a
//                  canopy, coin lockers, the souvenir window and a big clock
//   koban          the police box with its red lamp
//   konbini        Kodama Mart: a bright glass front, shelves of mascot snacks,
//                  the drinks fridge, the hot-snack case and oden at the till
//   gameCenter     neon game centre: UFO catchers full of plushies, a purikura
//                  booth, an LED screen and the karaoke sign
//   ramenShop, bakery, lotteryKiosk
//   kodamaStatue   the town mascot in painted resin, wearing a knitted red bib
//   treeRing, clockPost, suzuranLamp, busStop, phoneBooth, postBox, sideStreet
//   taxi, keiCar   green-and-cream taxis with lace seat covers; a little kei car
//   carSignal, pedSignal   the crossing's lights (state set by the location)
//   plazaTexture, roadTexture, mosaic
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, cyl, sh, mixc, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas, makeTexture, mix, darken, lighten } from '../core/pixtex.js';
import { shopFacade, pottedPlant } from './shotengai.js';
import { fasciaSign, verticalSign, noren } from './shopSigns.js';
import { lantern, aFrame, gachaMachine, bicycle } from './streetProps.js';
import { glassPane } from './station.js';
import { bins } from './props.js';
import { ProductBatch, mascot, snack, drink, omiyage, SNACKS, DRINKS, OMIYAGE } from './products.js';
import { FONT } from '../ui/fonts.js';

const grp = (...kids) => { const g = new THREE.Group(); for (const k of kids) if (k) g.add(k); return g; };
const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const INK = '#2a1828';
const TEAL = 0x1f8a7a;

// ---------------------------------------------------------------- shared pixel art
// a window seen from outside: lit (warm room, lamp, shelf, curtains or blinds) or dark
function winTex(w, h, seed, { lit = true, col = '#ffd890', kind = 'curtain', curtain = '#e8d8b8' } = {}) {
  const p = new PixCanvas(w, h, 4000 + seed);
  if (!lit) { for (let y = 0; y < h; y++) p.hline(0, w - 1, y, mix('#56607a', '#2c3244', y / h)); p.line(2, h - 4, w - 5, 3, 'rgba(255,255,255,0.22)'); return p; }
  for (let y = 0; y < h; y++) p.hline(0, w - 1, y, mix(lighten(col, 0.22), darken(col, 0.32), y / h));
  p.rect(Math.floor(w * 0.55), Math.floor(h * 0.12), 4, 3, '#fffbe8');
  p.rect(2, Math.floor(h * 0.64), w - 4, 2, darken(col, 0.45));
  for (let x = 4; x < w - 4; x += 5) p.rect(x, Math.floor(h * 0.64) - 3 - (x % 3), 3, 3 + (x % 3), [darken(col, 0.3), '#c86a4a', '#5a8ac8', '#e8c860'][x % 4]);
  if (seed % 3 === 0) { p.rect(w - 7, h - 10, 4, 6, '#3a7a3a'); p.rect(w - 8, h - 5, 6, 4, '#b8603a'); }
  if (kind === 'curtain') {
    const cw = Math.max(2, Math.floor(w * 0.22));
    p.rect(0, 0, cw, h, curtain); p.rect(w - cw, 0, cw, h, curtain);
    for (let y = 0; y < h; y += 2) { p.px(cw - 1, y, darken(curtain, 0.18)); p.px(w - cw, y, darken(curtain, 0.18)); p.px(Math.floor(cw / 2), y + 1, darken(curtain, 0.1)); }
    p.rect(0, 0, w, 2, darken(curtain, 0.25));
  } else if (kind === 'blinds') for (let y = 1; y < h * 0.5; y += 3) p.hline(0, w - 1, y, 'rgba(244,240,226,0.9)');
  return p;
}
// a big clock face (default 5:40, dusk)
function bigClock(S = 96, h = 5, m = 40) {
  const p = new PixCanvas(S, S, 61);
  const c = S / 2 - 0.5;
  p.circle(c, c, S / 2 - 0.5, '#2a3a38'); p.circle(c, c, S / 2 - 3, '#d8c070'); p.circle(c, c, S / 2 - 5, '#fbf8ee');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, r0 = S / 2 - (big ? 13 : 9), r1 = S / 2 - 7;
    p.line(c + Math.sin(a) * r0, c - Math.cos(a) * r0, c + Math.sin(a) * r1, c - Math.cos(a) * r1, big ? '#2a2a30' : '#9a9aa4', big ? 2 : 1);
  }
  for (const [n, a] of [['12', 0], ['3', 0.25], ['6', 0.5], ['9', 0.75]]) p.text(n, c + Math.sin(a * Math.PI * 2) * (S / 2 - 21), c - Math.cos(a * Math.PI * 2) * (S / 2 - 21) - 5, { font: `11px ${FONT.ui}`, color: '#2a2a30', align: 'center' });
  const ah = (((h % 12) + m / 60) / 12) * Math.PI * 2, am = (m / 60) * Math.PI * 2;
  p.line(c, c, c + Math.sin(ah) * S * 0.22, c - Math.cos(ah) * S * 0.22, '#1e1e24', 3);
  p.line(c, c, c + Math.sin(am) * S * 0.36, c - Math.cos(am) * S * 0.36, '#1e1e24', 2);
  p.circle(c, c, 3, '#d8402a'); p.circle(c, c, 1, '#ffd8a0');
  return p;
}
// the town mascot's face, for signs and posters
function kodamaKun(p, cx, cy, r) {
  p.ellipse(cx, cy, r + 1, r * 0.92 + 1, '#5a6a5a');
  p.ellipse(cx, cy, r, r * 0.92, '#fbf8f0');
  p.ellipse(cx - r * 0.2, cy - r * 0.35, r * 0.4, r * 0.2, '#ffffff');
  const e = Math.max(1, Math.round(r * 0.14));
  p.rect(cx - r * 0.38 - e / 2, cy - e, e, e * 2, '#2a2a30'); p.rect(cx + r * 0.38 - e / 2, cy - e, e, e * 2, '#2a2a30');
  p.rect(cx - r * 0.62, cy + r * 0.22, Math.max(1, r * 0.22), Math.max(1, r * 0.12), '#ffa0b4'); p.rect(cx + r * 0.42, cy + r * 0.22, Math.max(1, r * 0.22), Math.max(1, r * 0.12), '#ffa0b4');
  p.hline(cx - r * 0.12, cx + r * 0.12, cy + r * 0.3, '#2a2a30');
  // the sprout
  p.vline(cx, cy - r - r * 0.5, cy - r * 0.85, '#4a9a3a');
  p.ellipse(cx - r * 0.3, cy - r * 1.35, r * 0.32, r * 0.16, '#7ad050'); p.ellipse(cx + r * 0.3, cy - r * 1.45, r * 0.32, r * 0.16, '#8ae060');
}

// ---------------------------------------------------------------- the station
function stationNameSign() {
  const W = 384, H = 44;
  const p = new PixCanvas(W, H, 71);
  p.rect(0, 0, W, H, '#1f8a7a'); p.rect(0, 0, W, 2, '#5ac8b8'); p.rect(0, H - 2, W, 2, '#156a5e');
  p.rrect(8, 6, 34, 32, 3, '#ffffff'); p.text('KD', 25, 9, { font: `9px ${FONT.ui}`, color: '#1f8a7a', align: 'center' }); p.text('14', 25, 21, { font: `11px ${FONT.bold}`, color: INK, align: 'center' });
  p.text('木霊町駅', 150, 5, { font: `26px ${FONT.bold}`, color: '#ffffff', align: 'center', shadow: '#145a50' });
  p.text('こだままち', 268, 6, { font: `11px ${FONT.ui}`, color: '#d8fff4' });
  p.text('KODAMA-MACHI STA.', 268, 22, { font: `9px ${FONT.ui}`, color: '#ffffff' });
  kodamaKun(p, 360, 26, 9);
  return p;
}
function welcomeBand() {
  const W = 420, H = 18;
  const p = new PixCanvas(W, H, 72);
  p.rect(0, 0, W, H, '#fbfaf4'); p.rect(0, H - 2, W, 2, '#1f8a7a');
  p.text('ようこそ 木霊町へ', 120, 2, { font: `12px ${FONT.ui}`, color: '#1f6a5e', align: 'center' });
  p.text('WELCOME TO KODAMA-MACHI', 300, 4, { font: `9px ${FONT.ui}`, color: '#d8502a', align: 'center' });
  for (const x of [14, 214, 406]) kodamaKun(p, x, 10, 4);
  return p;
}
function welcomePoster() {
  const W = 128, H = 64;
  const p = new PixCanvas(W, H, 73);
  for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#8ad0f0', '#fff0c8', y / H));
  // mountains, the onsen town, a train on a viaduct, cherry trees
  p.poly([[0, 40], [22, 18], [40, 30], [64, 10], [92, 32], [112, 22], [128, 34], [128, 46], [0, 46]], '#6a9ac8');
  p.poly([[50, 18], [64, 10], [78, 18], [70, 16], [64, 19], [58, 16]], '#ffffff');
  p.rect(0, 42, W, 22, '#7ab860');
  for (let i = 0; i < 9; i++) { const x = 8 + i * 14; p.circle(x, 44 + (i % 2) * 3, 5, i % 3 ? '#ffb8d0' : '#ff9ac0'); p.vline(x, 48, 52, '#6a4a3a'); }
  p.rect(0, 36, W, 3, '#c8c8d0'); for (let x = 4; x < W; x += 12) p.vline(x, 39, 45, '#a8a8b0');
  p.rect(70, 31, 40, 5, '#f4f4f0'); p.rect(70, 33, 40, 1, '#1f8a7a'); for (let x = 73; x < 108; x += 5) p.rect(x, 32, 3, 1, '#5a7a9a');
  for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) p.px(30 + k * 6 + Math.round(Math.sin(i + k) * 1.2), 50 - i * 2, '#ffffff');
  p.ellipse(36, 56, 14, 4, '#9ad8f0');
  p.text('ようこそ', 6, 4, { font: `12px ${FONT.round}`, color: '#ffffff', outline: '#1f6a5e' });
  p.text('木霊町へ', 6, 20, { font: `12px ${FONT.round}`, color: '#ffe060', outline: '#8a3a2a' });
  kodamaKun(p, 108, 52, 8);
  p.frame(0, 0, W, H, '#3a3a42'); p.frame(1, 1, W - 2, H - 2, '#d8c070');
  return p;
}
function fareBoard() {
  const W = 200, H = 64;
  const p = new PixCanvas(W, H, 74);
  p.rect(0, 0, W, H, '#f8f8f4'); p.rect(0, 0, W, 9, '#1f8a7a');
  p.text('きっぷ運賃表  FARES', W / 2, 1, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  // a line map: stations as circles along a gently curving route with fares
  const st = [['木霊町', 0], ['みずはら', 170], ['あさぎり', 230], ['いなほ', 310], ['ひかわ', 420], ['ちよだ', 560], ['とうきょう', 1980]];
  p.line(14, 36, W - 14, 36, '#1f8a7a', 3);
  st.forEach(([n, f], i) => {
    const x = 14 + i * ((W - 28) / (st.length - 1));
    p.circle(x, 36, 4, '#1f8a7a'); p.circle(x, 36, 2, i ? '#ffffff' : '#ffd040');
    p.text(n, x, 16 + (i % 2) * 6, { font: `7px ${FONT.small}`, color: INK, align: 'center' });
    if (i) p.text(String(f), x, 44, { font: `7px ${FONT.tiny}`, color: '#d8402a', align: 'center' });
  });
  p.text('現在地 YOU ARE HERE', 14, 54, { font: `7px ${FONT.small}`, color: '#3a3a44' });
  return p;
}
function lockerSign() {
  const p = new PixCanvas(96, 14, 75);
  p.rect(0, 0, 96, 14, '#2a5ab0'); p.text('コインロッカー  LOCKERS', 48, 2, { font: `9px ${FONT.ui}`, color: '#ffffff', align: 'center' });
  return p;
}
function omiyageSign() {
  const p = new PixCanvas(120, 18, 76);
  p.rect(0, 0, 120, 18, '#7a2a22'); p.rect(0, 0, 120, 2, '#c8a050'); p.rect(0, 16, 120, 2, '#c8a050');
  p.text('おみやげ 木霊堂', 60, 3, { font: `11px ${FONT.ui}`, color: '#fff4d8', align: 'center' });
  return p;
}

export function stationHouse({ onU = null } = {}) {
  const W = 240, D = 92, G1 = 68, FB = 12, G2 = 46;
  const x0 = -W / 2, x1 = W / 2 - 1;
  const yF = G1, y2 = G1 + FB, top = y2 + G2;
  const v = new VoxelModel(), gl = new VoxelModel();
  const g = grp();
  const TILE = (x, y) => (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0 ? 0xdcd0b6 : hash3(x >> 2, y >> 2, 3) < 0.14 ? 0xf8f0de : 0xf0e6cc);
  // granite plinth, the shell, front walls
  fill(v, x0 - 1, x1 + 1, 0, 3, -6, 1, (x, y) => (y === 3 ? 0xa8a49c : x % 12 === 0 ? 0x6e6a64 : 0x84807a));
  fill(v, x0, x0 + 1, 4, top - 1, -D, 0, TILE); fill(v, x1 - 1, x1, 4, top - 1, -D, 0, TILE);
  fill(v, x0, x1, 4, top - 1, -D, -D, 0xd8ccb0);
  fill(v, x0, x1, 4, G1 - 1, -1, 0, TILE);
  fill(v, x0, x1, y2, top - 1, -1, 0, TILE);
  for (const px of [x0, -60, 58, x1 - 2]) fill(v, px, px + 2, 4, top - 1, -1, 1, (x, y) => (y % 5 === 0 ? 0xc8bca0 : 0xe8dcc0));
  // teal fascia band with the station name
  fill(v, x0, x1, yF, yF + FB - 1, -1, 2, (x, y) => (y === yF || y === yF + FB - 1 ? 0xf4f4ee : TEAL));
  const name = signPlane(stationNameSign(), 6.0, { emissive: 0.85, onU });
  at(name, 0, (yF + FB / 2) * V5, 3 * V5 + 0.012); g.add(name);

  // ---- the entrance: glass doors, the concourse with glowing ticket gates behind
  const ex0 = -54, ex1 = 53, eh = 56, ZB = -64;
  carve(v, ex0, ex1, 1, eh - 1, -1, 1);
  fill(v, ex0, ex1, 0, 0, ZB, 1, (x, y, z) => (((x >> 3) + (z >> 3)) & 1 ? 0xe0dcd2 : 0xd0ccc2));
  carve(v, ex0, ex1, 1, 3, ZB, -2);
  fill(v, ex0, ex1, 1, eh + 4, ZB, ZB, (x, y) => (y >= 38 && y <= 41 ? TEAL : 0xeef2f2));
  fill(v, ex0, ex1, eh, eh + 3, ZB, -2, 0xd8dcdc);
  for (let x = ex0 + 8; x < ex1; x += 16) for (const z of [-14, -34, -54]) { gl.set(x, eh - 1, z, 0xfff8e8); gl.set(x + 1, eh - 1, z, 0xfff8e8); }
  for (let i = 0; i < 5; i++) {
    const gx = ex0 + 10 + i * 20;
    fill(v, gx, gx + 5, 1, 19, -44, -30, (x, y) => (y === 19 ? 0xc8d0d4 : x === gx || x === gx + 5 ? 0x8a949c : 0xa8b0b8));
    fill(gl, gx + 1, gx + 4, 20, 20, -33, -31, i % 2 ? 0x40e0c0 : 0x40c8ff);
    fill(gl, gx + 2, gx + 3, 16, 17, -29, -29, 0x60ff90);
  }
  const fb = signPlane(fareBoard(), 3.1, { emissive: 0.8, onU }); at(fb, 0, 2.05, ZB * V5 + 0.06); g.add(fb);
  for (const tx of [-44, 38]) { fill(v, tx, tx + 9, 1, 30, ZB + 1, ZB + 7, 0xd8dce4); fill(gl, tx + 2, tx + 7, 18, 25, ZB + 8, ZB + 8, 0x7ab8f0); fill(gl, tx + 2, tx + 7, 12, 13, ZB + 8, ZB + 8, 0xffd060); }
  // aluminium frames, glass, door handles
  const posts = [ex0, -27, 0, 26, ex1];
  for (const px of posts) fill(v, px - 1, px + 1, 0, eh - 1, 0, 1, 0xb8bcc4);
  fill(v, ex0 - 1, ex1 + 1, eh - 4, eh - 1, 0, 1, 0xb8bcc4);
  fill(v, ex0, ex1, 0, 0, 1, 2, 0x8a8e96);
  for (let b = 0; b < 4; b++) {
    const bx0 = posts[b] + 2, bx1 = posts[b + 1] - 2;
    const gp = glassPane((bx1 - bx0 + 1) * V5, (eh - 5) * V5); at(gp, ((bx0 + bx1 + 1) / 2) * V5, ((eh - 5) / 2) * V5, 1.6 * V5); g.add(gp);
  }
  for (const hx of [-24, -3, 2, 23]) fill(v, hx, hx, 18, 34, 2, 2, 0xe8ecf0);
  // the canopy over the doors on two round columns, the welcome band on its lip
  const cy = eh + 2, cz1 = 32;
  fill(v, -66, 65, cy, cy + 2, 1, cz1, (x, y, z) => (y === cy + 2 ? (z % 6 === 0 ? 0xb4b8bc : 0xc8ccd0) : 0xa8acb0));
  fill(v, -66, 65, cy - 2, cy + 3, cz1 + 1, cz1 + 2, (x, y) => (y === cy + 3 ? 0xffffff : y === cy - 2 ? TEAL : 0xf4f4ee));
  for (const cx of [-60, 59]) cyl(v, cx, cz1 - 4, 2.6, 0, cy - 1, (x, y) => (y < 3 ? 0x6e6a64 : y % 20 === 10 ? TEAL : 0xf0e8d4));
  const wb = signPlane(welcomeBand(), 6.56); at(wb, 0, (cy + 0.5) * V5, (cz1 + 3) * V5 + 0.012); g.add(wb);

  // ---- left wing: coin lockers under a sign, the welcome poster above
  const lx0 = -112, lx1 = -66;
  fill(v, lx0 - 1, lx1 + 1, 0, 45, 1, 12, (x, y, z) => {
    if (z < 12) return 0xd8dce0;
    if (y < 2 || y > 43 || x === lx0 - 1 || x === lx1 + 1) return 0xc8ccd2;
    const big = y < 18, ry = big ? (y - 2) % 16 : (y - 18) % 9, rx = (x - lx0) % (big ? 12 : 9);
    if (ry === 0 || rx === 0) return 0xb0b6be;
    if (!big && rx === 2 && ry === 6) return 0xf0c030;
    if (big && rx === 2 && ry === 12) return 0xf0c030;
    if (rx === 5 && ry === (big ? 13 : 7)) return 0xffffff;
    return ((x - lx0) / (big ? 12 : 9) | 0) % 2 ? 0x7ab8e8 : 0x8ac4f0;
  });
  fill(gl, -74, -69, 22, 27, 13, 13, 0x8af0c0);
  const ls = signPlane(lockerSign(), 1.5); at(ls, (lx0 + lx1) / 2 * V5, 47.5 * V5, 6 * V5); ls.rotation.x = 0; g.add(ls);
  const wp = signPlane(welcomePoster(), 2.0); at(wp, (lx0 + lx1) / 2 * V5, 3.0, 1.2 * V5); g.add(wp);
  fill(v, lx0 + 2, lx1 - 2, 49, 50, 0, 1, 0x5a5048); fill(v, lx0 + 2, lx1 - 2, 71 - 5, 71 - 4, 0, 1, 0x5a5048);
  // ---- right wing: the souvenir window full of omiyage boxes
  const sx0 = 66, sx1 = 112, sy0 = 10, sy1 = 52;
  carve(v, sx0, sx1, sy0, sy1, -1, 0);
  fill(v, sx0, sx1, sy0 - 1, sy0 - 1, -18, 1, 0x8a5a3a);
  fill(v, sx0, sx1, sy0, sy1, -18, -18, 0xf4e4c4);
  for (const y of [sy0 + 10, sy0 + 22]) fill(v, sx0, sx1, y, y, -18, -8, 0x9a6a42);
  fill(v, sx0 - 1, sx1 + 1, sy1 + 1, sy1 + 1, -1, 1, 0x7a4a2a); fill(v, sx0 - 1, sx1 + 1, sy0 - 2, sy0 - 2, -1, 2, 0x7a4a2a);
  for (const x of [sx0 - 1, sx1 + 1]) fill(v, x, x, sy0 - 1, sy1, -1, 1, 0x7a4a2a);
  fill(gl, sx0 + 2, sx1 - 2, sy1 - 1, sy1 - 1, -16, -16, 0xfff0d0);
  const sg = glassPane((sx1 - sx0 + 1) * V5, (sy1 - sy0 + 1) * V5); at(sg, ((sx0 + sx1 + 1) / 2) * V5, ((sy0 + sy1 + 1) / 2) * V5, 0.3 * V5); g.add(sg);
  const PB = new ProductBatch();
  let oi = 0;
  for (const [y, n] of [[sy0, 9], [sy0 + 10, 8], [sy0 + 22, 8]]) for (let i = 0; i < n; i++) {
    const art = omiyage(OMIYAGE[(oi++) % OMIYAGE.length], oi);
    PB.box(art, (sx0 + 3 + (i + 0.5) * ((sx1 - sx0 - 6) / n)) * V5, (y + 1) * V5, -10 * V5, { d: 0.12 });
  }
  g.add(PB.build());
  const os = signPlane(omiyageSign(), 1.86); at(os, ((sx0 + sx1 + 1) / 2) * V5, (sy1 + 7) * V5, 1.4 * V5); g.add(os);

  // ---- upstairs: six windows (offices, some lit) and the big clock between them
  for (const wx of [-96, -64, -32, 32, 64, 96]) {
    const wx0 = wx - 10, wx1 = wx + 9, wy0 = y2 + 10, wy1 = y2 + 33;
    carve(v, wx0, wx1, wy0, wy1, -1, 0);
    fill(v, wx0 - 1, wx1 + 1, wy0 - 1, wy1 + 1, 0, 0, (x, y) => (x >= wx0 && x <= wx1 && y >= wy0 && y <= wy1 ? (x === wx ? 0xc8ccd0 : undefined) : 0xc8ccd0));
    fill(v, wx0 - 2, wx1 + 2, wy0 - 2, wy0 - 2, 0, 2, 0xd8d0bc);
    const lit = hash3(wx, 3, 1) < 0.7;
    const pl = signPlane(winTex(64, 77, wx + 200, { lit, kind: wx % 64 === 0 ? 'blinds' : 'curtain', col: '#fff0c0' }), 20 * V5, lit ? { emissive: 0.8, onU } : {});
    at(pl, (wx0 + 10) * V5, ((wy0 + wy1 + 1) / 2) * V5, -1 * V5 + 0.004); g.add(pl);
  }
  const ccx = 0, ccy = y2 + 22;
  for (let x = -15; x <= 15; x++) for (let y = -15; y <= 15; y++) { const d = Math.hypot(x, y); if (d <= 15 && d > 12.6) fill(v, ccx + x, ccx + x, ccy + y, ccy + y, 1, 2, d > 14 ? 0x2a3a38 : 0xb8a050); }
  const ck = signPlane(bigClock(), 1.28); at(ck, ccx * V5, (ccy + 0.5) * V5, 1 * V5 + 0.01); g.add(ck);
  // cornice
  fill(v, x0 - 2, x1 + 2, top, top + 3, -D - 1, 3, (x, y) => (y === top + 3 ? 0xf8f4ea : y === top ? 0xb8ac94 : 0xe8dcc4));
  // ---- the hipped kawara roof: blue-grey tile rows, a dark ridge with onigawara ends
  const yR = top + 4, RX0 = x0 - 5, RX1 = x1 + 5, RZ0 = -D - 6, RZ1 = 8;
  for (let k = 0; ; k++) {
    const ax0 = RX0 + k * 2, ax1 = RX1 - k * 2, az0 = RZ0 + k * 2, az1 = RZ1 - k * 2;
    if (az1 - az0 < 4) { fill(v, ax0 + 2, ax1 - 2, yR + k, yR + k + 1, az0, az1, 0x2e3446); for (const ex of [ax0 + 2, ax1 - 5]) fill(v, ex, ex + 3, yR + k, yR + k + 4, az0 - 1, az1 + 1, 0x262c3a); break; }
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      if (!(x <= ax0 + 1 || x >= ax1 - 1 || z <= az0 + 1 || z >= az1 - 1)) continue;
      const hip = (x <= ax0 + 1 || x >= ax1 - 1) && (z <= az0 + 1 || z >= az1 - 1);
      v.set(x, yR + k, z, k === 0 ? 0x6e788c : hip ? 0x3a4256 : x % 4 === 0 ? 0x3e4660 : k % 2 ? 0x4c5670 : hash3(x, k, z) < 0.08 ? 0x5e6884 : 0x46506a);
    }
  }
  g.add(vm(v, V5));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.1, mode: 1, onU }));
  // potted plants either side of the doors
  for (const px of [-64, 63]) { const pp = pottedPlant(px, { big: true, pot: 0x8a8e96, leaf: 0x3a7a4a }); at(pp, px * V5, 0, 0.45); g.add(pp); }
  g.userData = { width: W * V5, door: { x: 0, z: 0.6 }, lockers: { x: (lx0 + lx1) / 2 * V5, z: 0.9 }, souvenir: { x: (sx0 + sx1) / 2 * V5, z: 0.6 }, depth: D * V5, canopy: { x0: -66 * V5, x1: 65 * V5, z: cz1 * V5 } };
  return g;
}

// ---------------------------------------------------------------- the police box
function kobanPlate() {
  const W = 166, H = 32;
  const p = new PixCanvas(W, H, 81);
  p.rect(0, 0, W, H, '#24346a'); p.rect(0, 0, W, 2, '#4a5a9a');
  // the badge: a gold sun with a white rim
  for (let a = 0; a < 10; a++) { const t = (a / 10) * Math.PI * 2; p.line(20, 16, 20 + Math.cos(t) * 12, 16 + Math.sin(t) * 12, '#e8c050', 2); }
  p.circle(20, 16, 8, '#f8e078'); p.circle(20, 16, 5, '#d8a830'); p.circle(20, 16, 2, '#ffffff');
  p.text('交番', 70, 4, { font: `22px ${FONT.bold}`, color: '#ffffff', align: 'center' });
  p.text('KOBAN', 132, 5, { font: `11px ${FONT.ui}`, color: '#ffffff', align: 'center' });
  p.text('POLICE BOX', 132, 19, { font: `7px ${FONT.small}`, color: '#c8d4ff', align: 'center' });
  return p;
}
function noticeBoard(seed = 1) {
  const W = 56, H = 54;
  const p = new PixCanvas(W, H, 82 + seed);
  p.rect(0, 0, W, H, '#6a4a2e'); p.rect(2, 2, W - 4, H - 4, '#c89a64'); p.scatter(2, 2, W - 4, H - 4, '#b88a54', 0.3);
  // 交通安全 (road safety), a lost cat, a wanted face, the emergency number
  p.rect(4, 4, 24, 22, '#ffffff'); p.rect(4, 4, 24, 6, '#2a8a3a'); p.text('交通安全', 16, 4, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  p.poly([[16, 12], [25, 24], [7, 24]], '#ffe040'); p.poly([[16, 14], [23, 23], [9, 23]], '#2a2a30'); p.rect(14, 17, 4, 4, '#ffe040');
  p.rect(30, 5, 22, 26, '#fff6e0'); p.text('迷い猫', 41, 5, { font: `7px ${FONT.small}`, color: '#d8302a', align: 'center' });
  p.circle(41, 20, 6, '#f0f0ec'); p.circle(39, 21, 3, '#e8a04a'); p.px(39, 19, INK); p.px(43, 19, INK);
  p.rect(5, 29, 22, 21, '#f0f0ec'); p.circle(16, 37, 5, '#c8a888'); p.rect(11, 42, 10, 6, '#3a4a6a'); p.text('情報を', 16, 44, { font: `7px ${FONT.small}`, color: INK, align: 'center' });
  p.rect(30, 34, 22, 16, '#d8302a'); p.text('110', 41, 36, { font: `11px ${FONT.bold}`, color: '#ffffff', align: 'center' });
  for (const [x, y] of [[15, 4], [41, 5], [16, 29], [41, 34]]) p.px(x, y, '#e83a3a');
  return p;
}
function townMap() {
  const p = new PixCanvas(64, 44, 83);
  p.rect(0, 0, 64, 44, '#f4f0e0'); p.frame(0, 0, 64, 44, '#3a3a44');
  p.rect(4, 20, 56, 4, '#e8d8b0'); p.rect(30, 4, 4, 36, '#e8d8b0'); p.rect(4, 8, 22, 3, '#a8a8b0');
  p.rect(36, 26, 20, 8, '#ffd0a0'); p.circle(10, 30, 4, '#8ad070'); p.rect(40, 8, 14, 8, '#b8e0f8');
  p.circle(31, 21, 2, '#d8302a');
  return p;
}
export function koban({ onU = null } = {}) {
  const W = 64, D = 56, H = 56;
  const x0 = -W / 2, x1 = W / 2 - 1;
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  fill(v, x0 - 2, x1 + 2, 0, 2, -D - 2, 4, (x, y) => (y === 2 ? 0xb0aca4 : 0x8a867e));
  const wallC = (x, y) => (y < 22 ? ((y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) ? 0x6a3a2e : 0x8a4a38) : y === 22 ? 0xd8d4cc : 0xf4f2ec);
  fill(v, x0, x1, 3, H - 1, -1, 0, wallC);
  fill(v, x0, x0 + 1, 3, H - 1, -D, 0, wallC); fill(v, x1 - 1, x1, 3, H - 1, -D, 0, wallC); fill(v, x0, x1, 3, H - 1, -D, -D, 0xe8e6e0);
  // sliding glass door, the desk and lamp inside, the town map on the back wall
  carve(v, -12, 11, 3, 44, -1, 0);
  fill(v, -13, 12, 3, 45, 1, 1, (x, y) => (x === -13 || x === 12 || y === 45 ? 0x5a6068 : undefined));
  fill(v, -1, 0, 3, 44, 1, 1, 0x5a6068);
  const gp = glassPane(24 * V5, 41 * V5); at(gp, 0, (3 + 20.5) * V5, 0.6 * V5); g.add(gp);
  fill(v, -12, 11, 2, 2, -D + 1, -2, 0x9a9ea4);
  fill(v, -10, 9, 3, 17, -26, -16, (x, y) => (y === 17 ? 0x8a6a4a : 0x6a7078));
  fill(v, 4, 4, 18, 23, -21, -21, 0x3a3a40); fill(gl, 2, 6, 24, 25, -23, -19, 0xfff2c8);
  const mp = signPlane(townMap(), 1.0); at(mp, 0, 1.55, (-D + 1) * V5 + 0.01); g.add(mp);
  // a window with blinds, lit
  carve(v, 16, 28, 20, 42, -1, 0);
  fill(v, 15, 29, 19, 43, 1, 1, (x, y) => (x === 15 || x === 29 || y === 19 || y === 43 ? 0x5a6068 : undefined));
  const wt = signPlane(winTex(42, 74, 9, { kind: 'blinds', col: '#fff4d0' }), 13 * V5, { emissive: 0.75, onU }); at(wt, 22.5 * V5, 31.5 * V5, -0.9 * V5); g.add(wt);
  // the KOBAN plate and the red lamp on its bracket
  const pl = signPlane(kobanPlate(), 2.6, { emissive: 0.35, onU }); at(pl, 0, 51 * V5, 1 * V5 + 0.012); g.add(pl);
  fill(v, -1, 0, H + 1, H + 3, 1, 7, 0x3a3a40);
  ell(gl, 0, H + 3, 9, 3.4, 3.4, 3.4, (x, y) => (y > H + 4 ? 0xff7a6a : 0xff2a1a));
  // a shallow slate pyramid roof with a deep overhang
  for (let k = 0; k < 11; k++) {
    const ax0 = x0 - 6 + k * 3, ax1 = x1 + 6 - k * 3, az0 = -D - 6 + k * 3, az1 = 6 - k * 3;
    if (az1 - az0 < 3) break;
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) if (k === 10 || x <= ax0 + 2 || x >= ax1 - 2 || z <= az0 + 2 || z >= az1 - 2) v.set(x, H + k, z, k === 0 ? 0x5a6678 : (x + k) % 3 === 0 ? 0x3a4658 : 0x46526a);
  }
  // the notice board on the left of the door
  const nb = signPlane(noticeBoard(), 0.8); at(nb, -21.5 * V5, 26 * V5, 2 * V5 + 0.01); g.add(nb);
  fill(v, -30, -13, 11, 41, 1, 1, 0x4a3a2a);
  g.add(vm(v, V5));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.3, mode: 1, onU }));
  g.userData = { width: W * V5, door: { x: 0, z: 0.5 }, officer: { x: 0.95, z: 0.42 } };
  return g;
}

// ---------------------------------------------------------------- Kodama Mart
function konbiniSign() {
  const W = 288, H = 34;
  const p = new PixCanvas(W, H, 91);
  p.rect(0, 0, W, H, '#ffffff');
  p.rect(0, 0, W, 6, '#ff8a1a'); p.rect(0, 6, W, 2, '#ffffff'); p.rect(0, H - 7, W, 7, '#1fa050'); p.rect(0, H - 9, W, 2, '#ffffff');
  mascot(p, 'chick', 20, 17, 9, { mood: 'open' });
  p.text('KODAMA', 112, 9, { font: `16px ${FONT.bold}`, color: '#e8302a', align: 'center' });
  p.text('MART', 186, 9, { font: `16px ${FONT.bold}`, color: '#1fa050', align: 'center' });
  p.text('コダマート  24h', 250, 11, { font: `9px ${FONT.ui}`, color: '#ff7a1a', align: 'center' });
  return p;
}
function konbiniPoster(kind = 'hiyashi', seed = 1) {
  const W = 40, H = 52;
  const p = new PixCanvas(W, H, 92 + seed);
  if (kind === 'hiyashi') {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#5ac8f0', '#c8f0ff', y / H));
    p.text('冷やし', W / 2, 2, { font: `9px ${FONT.ui}`, color: '#ffffff', align: 'center', outline: '#d8302a' });
    p.text('中華', W / 2, 13, { font: `11px ${FONT.bold}`, color: '#d8302a', align: 'center', outline: '#ffffff' });
    p.ellipse(20, 36, 16, 7, '#ffffff'); p.ellipse(20, 35, 13, 5, '#ffe080');
    for (let k = -10; k < 10; k += 3) p.line(20 + k, 33, 22 + k, 37, '#f0c848');
    p.rect(11, 32, 6, 2, '#e8302a'); p.rect(21, 31, 6, 2, '#4ab04a'); p.rect(16, 36, 7, 2, '#f8f0c0');
    p.text('はじめました', W / 2, 45, { font: `7px ${FONT.small}`, color: '#1a3a6a', align: 'center' });
  } else if (kind === 'onigiri') {
    p.fill('#fff4d8');
    p.text('おにぎり', W / 2, 2, { font: `9px ${FONT.ui}`, color: '#2a2a30', align: 'center' });
    for (const [x, y] of [[11, 26], [29, 26], [20, 34]]) { p.poly([[x, y - 8], [x + 8, y + 5], [x - 8, y + 5]], '#ffffff'); p.rect(x - 3, y, 6, 5, '#1e2a22'); }
    p.rect(2, 41, W - 4, 10, '#e8302a'); p.text('100円', W / 2, 42, { font: `9px ${FONT.bold}`, color: '#ffe040', align: 'center' });
    mascot(p, 'tanuki', 33, 14, 5);
  } else {
    p.fill('#ffe85a');
    p.text('からあげ', W / 2, 2, { font: `9px ${FONT.ui}`, color: '#d8302a', align: 'center' });
    for (const [x, y] of [[10, 30], [18, 34], [27, 29], [14, 24], [24, 22]]) { p.circle(x, y, 5, '#b8642a'); p.circle(x - 1, y - 1, 3, '#e89a4a'); p.px(x - 2, y - 2, '#ffd890'); }
    mascot(p, 'chick', 31, 15, 6, { mood: 'open' });
    p.rect(2, 41, W - 4, 10, '#ffffff'); p.text('アツアツ!', W / 2, 42, { font: `7px ${FONT.small}`, color: '#d8302a', align: 'center' });
  }
  p.frame(0, 0, W, H, '#ffffff');
  return p;
}
function fridgeWall(w, h) {
  const p = new PixCanvas(w, h, 93);
  p.rect(0, 0, w, h, '#e8eef2');
  const doorW = 30;
  for (let x = 0; x < w; x += doorW) {
    p.rect(x, 0, doorW, h, '#dfe8ee'); p.rect(x, 0, 2, h, '#a8b0b8'); p.rect(x + doorW - 4, h * 0.35, 1, h * 0.3, '#c8d0d8');
    for (let r = 0; r < 4; r++) {
      const y = 8 + r * Math.floor((h - 12) / 4);
      p.rect(x + 3, y + 22, doorW - 6, 2, '#c8d4dc');
      for (let k = 0; k < 4; k++) { const kind = DRINKS[(x / doorW + r * 3 + k) % DRINKS.length]; const d = drink(kind, x + r + k); p.x.drawImage(d.c, 0, 0, d.w, d.h, x + 4 + k * 6, y + 2, 5, 20); }
    }
    p.rect(x + 2, 1, doorW - 4, 1, '#ffffff');
  }
  p.rect(0, 0, w, 6, '#1fa050'); p.text('つめた〜い COLD DRINKS', w / 2, -1, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  return p;
}
export function konbini({ onU = null, seed = 41 } = {}) {
  const Wv = 150;
  const g = shopFacade({ w: Wv, seed, onU, wall: 0xf4f4f0, wallKind: 'tile', front: 'glass', bays: 5, doorBay: 3, frame: 0xc0c4cc, sign: konbiniSign(), signGlow: 1.05, upper: 'flush', windowKind: 'blinds', litChance: 0.75, floor: 0xe4e8e8, inWall: 0xf6f8f8, fascia: 0xf4f4f0 });
  g.userData.pools = [];
  const W = Wv * V5, st = g.userData.stage;
  const sv = new VoxelModel(), gl = new VoxelModel();
  // bright tubes across the ceiling
  for (const z of [-12, -30, -48]) fill(gl, Math.round(st.x0 / V5) + 4, Math.round(st.x1 / V5) - 4, 49, 49, z, z + 1, 0xf8fcff);
  // the back wall: a lit drinks fridge
  const fw = Math.round((st.x1 - st.x0) * 64);
  const fr = signPlane(fridgeWall(fw, 112), st.x1 - st.x0, { emissive: 0.75, onU }); at(fr, (st.x0 + st.x1) / 2, 0.98, st.z0 + 0.04); g.add(fr);
  // two gondolas of snacks and drinks, products as real little boxes
  const PB = new ProductBatch();
  const gx0 = Math.round(st.x0 / V5) + 6, gx1 = Math.round(st.x1 / V5) - 38;
  const gond = (gz) => {
    fill(sv, gx0, gx1, 0, 2, gz - 6, gz, 0xd0d4da);
    for (const y of [12, 22, 32]) fill(sv, gx0, gx1, y, y, gz - 6, gz + 1, 0xf2f4f6);
    fill(sv, gx0, gx1, 3, 36, gz - 7, gz - 6, 0xe2e6ea);
    for (const x of [gx0, gx1]) fill(sv, x, x, 0, 36, gz - 7, gz + 1, 0xb8bec6);
    fill(sv, gx0, gx1, 2, 2, gz + 1, gz + 1, 0xffe040);
  };
  gond(-16); gond(-36);
  let k = seed;
  for (const [gz, y0, kinds] of [[-16, 3, 'snack'], [-16, 13, 'snack'], [-16, 23, 'drink'], [-16, 33, 'snack'], [-36, 13, 'drink'], [-36, 23, 'snack'], [-36, 33, 'drink']]) {
    let x = (gx0 + 2) * V5;
    while (x < (gx1 - 2) * V5) {
      const art = kinds === 'snack' ? snack(SNACKS[(k++) % SNACKS.length], k) : drink(DRINKS[(k++) % DRINKS.length], k);
      const w = art.w / 128;
      if (x + w > (gx1 - 1) * V5) break;
      PB.box(art, x + w / 2, (y0 + 1) * V5, (gz - 1) * V5, { d: kinds === 'snack' ? 0.1 : 0.07 });
      x += w + 0.012;
    }
  }
  g.add(PB.build());
  // the till: counter, register, the hot-snack case, the oden pot, a coffee machine
  const cx0 = Math.round(st.x1 / V5) - 32, cx1 = Math.round(st.x1 / V5) - 3;
  fill(sv, cx0, cx1, 0, 18, -20, -10, (x, y, z) => (y === 18 ? 0xf4f4f0 : z === -10 ? 0xd8302a : 0xe8e8ec));
  fill(sv, cx1 - 6, cx1 - 2, 19, 23, -18, -14, 0x3a3a44); fill(gl, cx1 - 5, cx1 - 3, 22, 23, -13, -13, 0x7af0a0);
  fill(sv, cx0 + 2, cx0 + 11, 19, 27, -19, -13, (x, y, z) => (y === 19 || y === 27 || x === cx0 + 2 || x === cx0 + 11 ? 0xc8ccd0 : undefined));
  fill(gl, cx0 + 3, cx0 + 10, 20, 21, -18, -14, 0xffa040);
  for (const [x, z, c] of [[cx0 + 4, -16, 0xc8743a], [cx0 + 6, -15, 0xe89a4a], [cx0 + 8, -17, 0xb8642a], [cx0 + 5, -18, 0xd88a3a]]) sv.set(x, 22, z, c);
  fill(sv, cx0 + 13, cx0 + 21, 19, 20, -19, -12, 0xa8acb4);
  for (let x = cx0 + 14; x <= cx0 + 20; x++) for (let z = -18; z <= -13; z++) sv.set(x, 20, z, (x === cx0 + 17 || z === -15) ? 0xc8ccd0 : [0xf0e8c8, 0xb89a5a, 0xf8f0e0, 0x4a6a3a][(x + z * 3) & 3]);
  fill(sv, cx1 - 12, cx1 - 8, 19, 26, -19, -15, 0x2a2a34); fill(gl, cx1 - 11, cx1 - 9, 24, 25, -14, -14, 0x8ad0ff);
  g.userData.oden = { x: (cx0 + 17) * V5, y: 21 * V5, z: -15.5 * V5 };
  // posters on the glass
  const bays = 5, bw = (st.x1 - st.x0) / bays;
  [['hiyashi', 0], ['onigiri', 1], ['karaage', 2]].forEach(([kind, b]) => { const pp = signPlane(konbiniPoster(kind, b), 0.56); at(pp, st.x0 + bw * (b + 0.5), 1.42, 0.06); g.add(pp); });
  const atm = new PixCanvas(30, 12, 94); atm.rect(0, 0, 30, 12, '#1a5ab0'); atm.text('ATM', 15, 1, { font: `9px ${FONT.bold}`, color: '#ffffff', align: 'center' });
  const ap = signPlane(atm, 0.42); at(ap, st.x0 + bw * 4.5, 1.95, 0.06); g.add(ap);
  g.add(vm(sv, V5));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.15, mode: 1, onU }));
  // outside: bins, a gacha bank, the ice chest
  const b = bins(); at(b, -W / 2 + 0.75, 0, 0.42); g.add(b);
  for (let i = 0; i < 4; i++) { const m = gachaMachine({ seed: 70 + i * 3, body: [0xfff4f8, 0xf0f8ff, 0xfffbe8, 0xf4fff0][i], dust: 0 }); at(m, W / 2 - 1.85 + i * 0.42, 0, 0.32); g.add(m); }
  const ic = new VoxelModel();
  fill(ic, -9, 8, 0, 14, -5, 5, (x, y) => (y === 14 ? 0xe8f0f8 : y < 2 ? 0x8a8e96 : 0xf8fafc));
  fill(ic, -8, 7, 15, 15, -4, 4, 0xb8d8f0);
  const icm = vm(ic, V5); at(icm, -W / 2 + 1.55, 0, 0.42); g.add(icm);
  const it = new PixCanvas(36, 10, 95); it.rect(0, 0, 36, 10, '#3a8ad8'); it.text('アイス ICE', 18, 0, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  const itp = signPlane(it, 0.8); at(itp, -W / 2 + 1.55, 0.45, 0.42 + 6 * V5 + 0.01); g.add(itp);
  g.userData.browse = [{ x: W / 2 - 1.4, z: 0.95, yaw: Math.PI }, { x: W / 2 - 0.6, z: 1.0, yaw: Math.PI - 0.3 }];
  g.userData.readers = [{ x: st.x0 + bw * 0.6, z: -0.32, yaw: 0 }, { x: st.x0 + bw * 1.5, z: -0.32, yaw: 0 }];
  g.userData.keeper = { x: (cx0 + 17) * V5, z: -1.3, yaw: 0 };
  g.userData.pools.push({ x: 0, z: 1.3, w: W * 0.95, d: 2.4, col: 0xd8f0ff });
  return g;
}

// ---------------------------------------------------------------- the game centre
function gameSign() {
  const W = 260, H = 34;
  const p = new PixCanvas(W, H, 101);
  p.rect(0, 0, W, H, '#1a1030');
  for (let x = 0; x < W; x += 6) { p.px(x, 1, '#ff5ab8'); p.px(x + 3, H - 2, '#40e8ff'); }
  p.text('GAME', 52, 6, { font: `18px ${FONT.pop}`, color: '#ffe040', align: 'center', outline: '#ff3a8a' });
  p.text('こだまランド', 160, 7, { font: `16px ${FONT.round}`, color: '#ffffff', align: 'center', outline: '#2ab8f0' });
  for (const [x, c] of [[100, '#ff5ab8'], [228, '#40e8ff'], [244, '#ffe040']]) { p.poly([[x, 12], [x + 2, 16], [x + 6, 16], [x + 3, 19], [x + 4, 23], [x, 20], [x - 4, 23], [x - 3, 19], [x - 6, 16], [x - 2, 16]], c); }
  return p;
}
const LED_FRAMES = [
  (p, t) => { // NEW PRIZE with a big plush bear
    for (let y = 0; y < p.h; y++) p.hline(0, p.w - 1, y, mix('#ff8ac8', '#ffd0e8', y / p.h));
    for (let i = 0; i < 14; i++) { const x = (i * 37 + t * 20) % p.w, y = (i * 23) % p.h; p.px(x, y, '#ffffff'); p.px(x + 1, y, '#fff0a0'); }
    mascot(p, 'bear', 40, 46, 24, { mood: 'open' });
    p.text('NEW', 112, 10, { font: `18px ${FONT.pop}`, color: '#ffffff', align: 'center', outline: '#e8307a' });
    p.text('PRIZE!', 112, 34, { font: `18px ${FONT.pop}`, color: '#ffe040', align: 'center', outline: '#e8307a' });
    p.text('もふもふクマ', 112, 60, { font: `9px ${FONT.ui}`, color: '#7a1a4a', align: 'center' });
  },
  (p, t) => { // karaoke, 30 minutes 100 yen
    for (let y = 0; y < p.h; y++) p.hline(0, p.w - 1, y, mix('#3a1a7a', '#1a8ab8', y / p.h));
    for (let i = 0; i < 6; i++) { const x = 14 + i * 24, y = 14 + Math.sin(t * 3 + i) * 5; p.text('♪', x, y, { font: `12px ${FONT.ui}`, color: ['#ffe040', '#ff8ac8', '#8af0ff'][i % 3], align: 'center' }); }
    p.text('カラオケ', 80, 26, { font: `18px ${FONT.round}`, color: '#ffffff', align: 'center', outline: '#ff3a8a' });
    p.text('30分 ¥100', 80, 52, { font: `11px ${FONT.bold}`, color: '#ffe040', align: 'center' });
  },
  (p, t) => { // UFO catcher: the claw coming down on a capsule
    p.fill('#ffe050');
    for (let x = 0; x < p.w; x += 16) p.rect(x, 0, 8, p.h, '#ffd030');
    const cy = 16 + Math.abs(Math.sin(t * 1.4)) * 22;
    p.vline(80, 0, cy, '#6a6a74'); p.rect(74, cy, 13, 4, '#8a8a94'); p.line(74, cy + 4, 70, cy + 12, '#8a8a94', 2); p.line(86, cy + 4, 90, cy + 12, '#8a8a94', 2);
    p.circle(80, 62, 9, '#ff5a7a'); p.rect(71, 62, 19, 9, '#ffffff'); p.circle(80, 62, 9, 'rgba(0,0,0,0)');
    p.text('UFO', 30, 18, { font: `16px ${FONT.pop}`, color: '#e8302a', align: 'center', outline: '#ffffff' });
    p.text('CATCHER', 130, 52, { font: `11px ${FONT.pop}`, color: '#2a5ab0', align: 'center', outline: '#ffffff' });
  },
];
function ufoHeader(seed) {
  const p = new PixCanvas(56, 16, 102 + seed);
  const c = ['#ff5ab8', '#40c8ff', '#ffd040'][seed % 3];
  p.rect(0, 0, 56, 16, c); p.rect(0, 0, 56, 2, '#ffffff');
  p.text('UFO', 28, 2, { font: `11px ${FONT.pop}`, color: '#ffffff', align: 'center', outline: darken(c, 0.4) });
  for (let x = 3; x < 56; x += 7) p.px(x, 13, '#ffffff');
  return p;
}
const PLUSH = ['#f4a552', '#fffcf8', '#94c26c', '#ffd848', '#8e5e3c', '#ff9ac0', '#a8d8ff', '#e8e0ff'];
function ufoCatcher({ body = 0xff7ab0, seed = 1, onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const W = 36, Dp = 24, x0 = -W / 2, x1 = W / 2 - 1, z0 = -Dp / 2, z1 = Dp / 2 - 1;
  fill(v, x0, x1, 0, 33, z0, z1, (x, y, z) => (y < 2 ? 0x2a2a30 : y === 33 ? 0xf0f0f4 : (z === z1 && (x === x0 + 2 || x === x1 - 2)) ? sh(body, 1.25) : body));
  fill(v, x0 + 4, x1 - 4, 26, 29, z1 + 1, z1 + 5, 0x3a3a48);
  v.set(-5, 30, z1 + 3, 0x2a2a30); v.set(-5, 31, z1 + 3, 0x2a2a30); v.set(-5, 32, z1 + 3, 0xff3a3a);
  gl.set(3, 30, z1 + 3, 0x40ff80); gl.set(7, 30, z1 + 3, 0xffd040);
  fill(v, x0 + 3, x0 + 12, 6, 17, z1 + 1, z1 + 1, 0x1a1a22); fill(v, x0 + 3, x0 + 12, 6, 6, z1 + 1, z1 + 3, sh(body, 0.8));
  fill(gl, x0 + 15, x1 - 3, 8, 9, z1 + 1, z1 + 1, 0xffffff);
  for (const [px, pz] of [[x0, z0], [x1 - 1, z0], [x0, z1 - 1], [x1 - 1, z1 - 1]]) fill(v, px, px + 1, 34, 75, pz, pz + 1, sh(body, 0.85));
  for (const px of [x0, x1 - 1]) fill(gl, px, px + 1, 36, 73, z1 + 1, z1 + 1, sh(body, 1.3));
  fill(v, x0, x1, 34, 34, z0, z1, 0xe8e8f0);
  fill(v, x0 + 2, x0 + 11, 34, 34, z1 - 10, z1 - 2, 0x1a1a22);
  fill(v, x0 + 12, x0 + 12, 35, 44, z1 - 10, z1 - 1, 0xd8f0ff);
  for (let i = 0; i < 16; i++) {
    const cx = x0 + 15 + ((i * 7) % 18), cz = z0 + 3 + ((i * 5) % 16), cy = 38 + (i % 3) * 3, c = parseInt(PLUSH[(i + seed) % PLUSH.length].slice(1), 16);
    ell(v, cx, cy, cz, 3.2, 2.8, 3.2, c);
    v.set(cx - 1, cy, cz + 3, 0x1e1e24); v.set(cx + 1, cy, cz + 3, 0x1e1e24); v.set(cx - 2, cy + 2, cz, c); v.set(cx + 2, cy + 2, cz, c);
  }
  fill(v, x0, x1, 76, 77, z0, z1, sh(body, 0.75));
  fill(gl, x0 + 1, x1 - 1, 78, 87, z1 - 2, z1, (x, y) => (y === 78 || y === 87 ? 0xffffff : sh(body, 1.15)));
  fill(v, x0 + 2, x1 - 2, 74, 74, -1, 0, 0x9a9aa4);
  const g = grp(vm(v, V25), glowVm(gl, V25, [0, 0, 0], { intensity: 1.2, mode: 1, onU }));
  const hd = signPlane(ufoHeader(seed), 0.86, { emissive: 1.0, onU }); at(hd, 0, 82.5 * V25, (z1 + 1) * V25 + 0.012); g.add(hd);
  const gp = glassPane((W - 4) * V25, 40 * V25); at(gp, 0, 55 * V25, (z1 + 0.6) * V25); g.add(gp);
  // the claw: a little gantry that wanders, dips and rises
  const cv = new VoxelModel();
  for (let y = 0; y < 14; y++) cv.set(0, -y, 0, 0x8a8a94);
  fill(cv, -2, 2, -16, -14, -2, 2, 0xb8bcc4);
  for (const [dx, dz] of [[-3, 0], [3, 0], [0, 3]]) for (let y = 0; y < 5; y++) cv.set(dx + Math.sign(dx) * (y > 2 ? -1 : 0), -17 - y, dz + Math.sign(dz) * (y > 2 ? -1 : 0), 0xc8ccd4);
  const claw = vm(cv, V25, [0, 0, 0], { cast: false }); claw.position.set(0, 74 * V25, 0); g.add(claw);
  const ph = seed * 1.7;
  g.userData.update = (dt, t) => {
    const s = (t * 0.35 + ph) % 6;
    claw.position.x = Math.sin(t * 0.5 + ph) * 0.18 + 0.06;
    claw.position.z = Math.cos(t * 0.37 + ph) * 0.1;
    claw.position.y = 74 * V25 - (s > 4 && s < 5 ? Math.sin((s - 4) * Math.PI) * 0.3 : 0);
  };
  return g;
}
function purikura({ onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  fill(v, -14, 13, 0, 44, -16, 0, (x, y) => (y === 44 ? 0xff9ac8 : 0xfff0f6));
  fill(v, -14, 13, 45, 47, -17, 1, 0xff6aa8);
  g.add(vm(v, V5));
  const p = new PixCanvas(84, 120, 103);
  for (let y = 0; y < 120; y++) p.hline(0, 83, y, mix('#ffd0e8', '#c8a0ff', y / 120));
  for (let i = 0; i < 24; i++) { const x = (i * 29) % 84, y = (i * 47) % 120; p.px(x, y, '#ffffff'); p.px(x + 1, y + 1, '#fff4a0'); }
  mascot(p, 'rabbit', 42, 58, 26, { mood: 'wink' });
  p.text('PURI', 42, 6, { font: `16px ${FONT.pop}`, color: '#ffffff', align: 'center', outline: '#ff3a8a' });
  p.text('☆★☆', 42, 24, { font: `9px ${FONT.ui}`, color: '#ffe040', align: 'center' });
  p.text('かわいく', 42, 92, { font: `11px ${FONT.round}`, color: '#ff3a8a', align: 'center', outline: '#ffffff' });
  p.text('盛れる!', 42, 106, { font: `9px ${FONT.ui}`, color: '#7a2a9a', align: 'center' });
  const c = signPlane(p, 1.3, { emissive: 0.55, onU }); at(c, 0, 1.15, 1 * V5 + 0.015); g.add(c);
  return g;
}
export function gameCenter({ onU = null, seed = 53 } = {}) {
  const Wv = 136;
  const g = shopFacade({ w: Wv, seed, onU, wall: 0x2e2a44, wallKind: 'metal', front: 'open', upper: 'flush', windows: 0, ac: false, fascia: 0x1a1628,
    sign: gameSign(), signGlow: 1.25, vsign: verticalSign({ ja: 'カラオケ', bg: '#2a1040', fg: '#ff6ac8', frame: '#ff6ac8' }), vsignGlow: 1.3, vsignSide: 1, floor: 0x2a2438, inWall: 0x4a2a6a });
  g.userData.pools = [];
  const W = Wv * V5;
  // the LED screen on the upper wall, cycling its ads, framed in neon
  const led = new PixCanvas(160, 80, 104);
  LED_FRAMES[0](led, 0);
  const scr = signPlane(led, 2.5, { emissive: 1.0, onU }); at(scr, -0.4, 4.1, 0.1); g.add(scr);
  const nv = new VoxelModel();
  for (let x = -34; x <= 25; x++) for (const y of [56 + 12, 56 + 39]) nv.set(x, y + 0, 2, ((x + 400) >> 2) & 1 ? 0xff5ab8 : 0x40e8ff);
  for (let y = 68; y <= 95; y++) for (const x of [-34, 25]) nv.set(x, y, 2, ((y) >> 2) & 1 ? 0xff5ab8 : 0x40e8ff);
  for (let x = -40; x <= 34; x += 3) nv.set(x, 101, 1, [0xffe040, 0xff5ab8, 0x40e8ff][(x + 60) % 3]);
  g.add(glowVm(nv, V5, [0, 0, 0], { intensity: 1.35, mode: 1, onU }));
  let fi = 0, ft = 0;
  // UFO catchers along the front, the purikura booth to the right
  const ufos = [0xff7ab0, 0x5ab8f0, 0xffc83a].map((c, i) => { const u = ufoCatcher({ body: c, seed: seed + i, onU }); at(u, -2.55 + i * 0.98, 0, -0.62); g.add(u); return u; });
  const pk = purikura({ onU }); at(pk, 2.05, 0, -1.1); g.add(pk);
  // glowing cabinets at the back (medal games), neon strips on the floor edge
  const bk = new VoxelModel(), bg2 = new VoxelModel();
  for (let i = 0; i < 4; i++) { const bx = -60 + i * 22; fill(bk, bx, bx + 16, 0, 30, -58, -50, 0x3a2a5a); fill(bg2, bx + 2, bx + 14, 18, 28, -49, -49, [0x40e8ff, 0xff5ab8, 0xffe040, 0x8aff8a][i]); }
  fill(bg2, -62, 61, 0, 0, 1, 1, 0xff5ab8);
  g.add(vm(bk, V5)); g.add(glowVm(bg2, V5, [0, 0, 0], { intensity: 1.1, mode: 1, onU }));
  g.userData.update = (dt, t) => {
    for (const u of ufos) u.userData.update(dt, t);
    ft += dt;
    if (ft > 0.12) {
      ft = 0;
      const idx = Math.floor(t / 4) % LED_FRAMES.length;
      led.clear(); LED_FRAMES[idx](led, t);
      for (let y = 1; y < led.h; y += 2) led.rect(0, y, led.w, 1, 'rgba(0,0,0,0.16)');
      scr.userData.tex.needsUpdate = true;
      fi = idx;
    }
  };
  void fi;
  g.userData.browse = [{ x: -2.55, z: 0.05, yaw: Math.PI }, { x: -1.57, z: 0.08, yaw: Math.PI }, { x: -0.6, z: 0.05, yaw: Math.PI }];
  g.userData.pools.push({ x: -1, z: 1.0, w: W * 0.6, d: 2.0, col: 0xff6ac8 }, { x: 1.6, z: 1.2, w: W * 0.4, d: 1.8, col: 0x40c8ff });
  return g;
}

// ---------------------------------------------------------------- ramen, bakery, lottery
function ticketMachine({ onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  fill(v, -5, 4, 0, 27, -3, 3, (x, y) => (y === 27 ? 0xd8d4c8 : y < 2 ? 0x5a5a62 : 0xf0ece0));
  fill(v, -4, 3, 6, 7, 4, 4, 0x2a2a30);
  g.add(vm(v, V5));
  const p = new PixCanvas(28, 36, 111);
  p.rect(0, 0, 28, 36, '#f8f4e8'); p.text('食券', 14, 0, { font: `7px ${FONT.small}`, color: '#d8302a', align: 'center' });
  const items = ['#ffd8a0', '#f8e8b0', '#ffc8a0', '#e8f0c8', '#ffe0e0', '#d8e8ff'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { p.rect(2 + c * 8, 9 + r * 6, 7, 5, items[(r * 3 + c) % items.length]); p.px(3 + c * 8, 10 + r * 6, '#d8302a'); }
  p.rect(9, 33, 10, 2, '#2a2a30');
  const s = signPlane(p, 0.44, { emissive: 0.7, onU }); at(s, 0, 0.92, 4 * V5 + 0.01); g.add(s);
  return g;
}
function okamochiBike() {
  const b = bicycle({ col: 0xf4f0e8, seed: 77 });
  const v = new VoxelModel();
  fill(v, -4, 4, 0, 7, -3, 3, (x, y) => (y === 7 ? 0xd8dce0 : y === 3 ? 0x8a8e96 : 0xc0c4cc));
  fill(v, -1, 1, 8, 9, 0, 0, 0x8a8e96);
  const m = vm(v, V5); m.position.set(0, 0.42, -0.42); b.add(m);
  return b;
}
export function ramenShop({ onU = null, seed = 61 } = {}) {
  const Wv = 104;
  const g = shopFacade({ w: Wv, seed, onU, wall: 0x7a5236, wallKind: 'wood', front: 'koshi', bays: 3, doorBay: 1, frame: 0x3a2418,
    sign: fasciaSign({ ja: '麺屋 こだま', en: 'RAMEN · GYOZA  since 1979', w: 200, h: 34, bg: '#2a1a12', fg: '#f4e8c8', accent: '#d8402a', style: 'wood', font: FONT.brush, size: 18, seed }),
    signGlow: 0.45, upper: 'flush', windowKind: 'blinds', litChance: 0.5, floor: 0x5a4a3a, inWall: 0xe8d8b8 });
  g.userData.pools = [];
  const W = Wv * V5, door = g.userData.door;
  const nr = signPlane(noren({ text: 'らーめん', bg: '#c8302a', fg: '#fff4e0', w: 64, h: 40, panels: 4, size: 14, seed }), 1.0, { double: true }); at(nr, door.x, 2.18, 0.08); g.add(nr);
  g.userData.noren = nr;
  const lan = lantern({ col: 0xe8402a, text: 'ら', r: 7, h: 18, onU }); at(lan, door.x + 0.78, 1.66, 0.3); g.add(lan);
  const tm = ticketMachine({ onU }); at(tm, door.x - 0.78, 0, 0.25); g.add(tm);
  const af = aFrame({ title: 'ラーメン', lines: [['醤油', '780'], ['味噌', '850'], ['塩', '780'], ['餃子', '400']], doodle: 'cup', seed });
  at(af, W / 2 - 0.45, 0, 0.75, -0.25); g.add(af);
  const bk = okamochiBike(); at(bk, -W / 2 + 0.7, 0, 0.75, 0.7); g.add(bk);
  g.userData.vent = { x: -W / 2 + 0.5, y: 3.2, z: 0.3 };
  g.userData.browse = [{ x: door.x - 0.78, z: 0.75, yaw: Math.PI }];
  g.userData.pools.push({ x: 0, z: 1.0, w: W * 0.8, d: 1.8, col: 0xffa860 });
  return g;
}
function breadShelf(w, h) {
  const p = new PixCanvas(w, h, 121);
  for (let y = 0; y < h; y++) p.hline(0, w - 1, y, mix('#fff0d0', '#f0d0a0', y / h));
  const rows = 3, rh = Math.floor(h / rows);
  const bread = [
    (x, y) => { p.ellipse(x, y - 4, 7, 5, '#e8b850'); for (let k = -5; k < 6; k += 3) { p.line(x + k, y - 8, x + k + 3, y - 1, '#d09a38'); p.line(x + k + 3, y - 8, x + k, y - 1, '#d09a38'); } p.ellipse(x - 2, y - 7, 3, 1, '#f8d880'); },
    (x, y) => { p.ellipse(x, y - 3, 8, 3, '#c8782a'); p.ellipse(x - 5, y - 2, 3, 2, '#b8682a'); p.ellipse(x + 5, y - 2, 3, 2, '#b8682a'); p.hline(x - 4, x + 4, y - 5, '#e8a04a'); },
    (x, y) => { p.ellipse(x, y - 4, 6, 4, '#a8582a'); p.px(x, y - 7, '#f8f0e0'); p.px(x - 1, y - 6, '#2a1a12'); p.ellipse(x - 2, y - 6, 2, 1, '#c8783a'); },
    (x, y) => { p.ellipse(x, y - 4, 8, 4, '#d8a040'); for (let k = 0; k < 8; k++) p.px(x - 6 + (k * 5) % 12, y - 6 + (k * 3) % 4, '#f8d070'); },
    (x, y) => { p.rect(x - 7, y - 10, 14, 10, '#f4e4c0'); p.rect(x - 7, y - 11, 14, 3, '#c8883a'); p.ellipse(x, y - 11, 7, 2, '#b87a2a'); },
    (x, y) => { p.line(x - 9, y - 2, x + 9, y - 6, '#d8984a', 4); for (let k = -6; k < 8; k += 4) p.line(x + k, y - 3 - (k + 9) * 0.2, x + k + 2, y - 5 - (k + 9) * 0.2, '#f0c070'); },
  ];
  for (let r = 0; r < rows; r++) {
    const y = (r + 1) * rh - 3;
    p.rect(0, y, w, 3, '#9a6a3a'); p.hline(0, w - 1, y, '#c89a5a');
    for (let x = 12, i = r * 2; x < w - 8; x += 22, i++) {
      p.ellipse(x, y - 1, 10, 3, '#c8a060'); p.hline(x - 9, x + 9, y - 2, '#e0bc80');
      bread[i % bread.length](x, y - 2);
      p.rect(x - 5, y - 1, 10, 4, '#ffffff'); p.px(x - 3, y, '#d8302a'); p.px(x - 1, y, '#3a3a44'); p.px(x + 1, y, '#3a3a44');
    }
  }
  return p;
}
export function bakery({ onU = null, seed = 71 } = {}) {
  const Wv = 88;
  const g = shopFacade({ w: Wv, seed, onU, wall: 0xf4e0c4, wallKind: 'brick', front: 'glass', bays: 3, doorBay: 2, frame: 0x8a5a3a,
    awning: { a: 0xe8a838, b: 0xfff4e0, depth: 20, drop: 6, text: 'BAKERY · FRESH BREAD' },
    sign: fasciaSign({ ja: 'パン工房 こむぎ', en: 'KOMUGI  bakery', w: 200, h: 34, bg: '#fff4e0', fg: '#8a4a2a', accent: '#e8a838', font: FONT.cute, size: 18, seed }),
    upper: 'balcony', floor: 0xc8a888, inWall: 0xf8e8d0, litChance: 0.8, curtain: '#f8d8c8' });
  g.userData.pools = [];
  const W = Wv * V5, st = g.userData.stage;
  const bs = signPlane(breadShelf(Math.round((st.x1 - st.x0) * 64), 84), st.x1 - st.x0, { emissive: 0.55, onU }); at(bs, (st.x0 + st.x1) / 2, 0.8, -0.55); g.add(bs);
  const af = aFrame({ title: 'きょうのパン', lines: [['メロンパン', '180'], ['カレーパン', '220'], ['あんぱん', '160']], doodle: 'flower', seed });
  at(af, -W / 2 + 0.5, 0, 0.8, 0.3); g.add(af);
  const pp = pottedPlant(seed, { big: true, pot: 0xc87a4a, leaf: 0x5a9a3a }); at(pp, W / 2 - 0.35, 0, 0.45); g.add(pp);
  g.userData.browse = [{ x: -0.4, z: 0.9, yaw: Math.PI }];
  g.userData.pools.push({ x: 0, z: 1.1, w: W * 0.85, d: 2.0, col: 0xffc070 });
  return g;
}
function lotteryArt() {
  const p = new PixCanvas(140, 30, 131);
  p.rect(0, 0, 140, 30, '#e8302a'); p.rect(0, 0, 140, 3, '#ffe040'); p.rect(0, 27, 140, 3, '#ffe040');
  p.text('宝くじ', 44, 4, { font: `20px ${FONT.bold}`, color: '#ffe040', align: 'center', outline: '#8a1a10' });
  p.text('ジャンボ', 108, 4, { font: `11px ${FONT.ui}`, color: '#ffffff', align: 'center' });
  p.text('7億円!', 108, 16, { font: `9px ${FONT.bold}`, color: '#ffe040', align: 'center' });
  for (const x of [8, 82, 132]) { p.circle(x, 15, 4, '#f8d040'); p.circle(x, 15, 2, '#e8b020'); }
  return p;
}
export function lotteryKiosk({ onU = null } = {}) {
  const W = 44, D = 34, H = 50;
  const x0 = -W / 2, x1 = W / 2 - 1;
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  fill(v, x0, x1, 0, H - 1, -D, 0, (x, y, z) => (y < 3 ? 0x6a6a72 : y > H - 10 ? 0xe8302a : (x + y) % 9 === 0 ? 0xf0c020 : 0xf8d030));
  carve(v, x0 + 5, x1 - 5, 14, 34, -6, 0);
  fill(v, x0 + 5, x1 - 5, 13, 13, -6, 3, 0xd8d8d0);
  fill(gl, x0 + 5, x1 - 5, 14, 34, -7, -7, (x, y) => (y > 30 ? 0xfff4d0 : 0xffe8b0));
  fill(v, x0 - 3, x1 + 3, H, H + 2, -D - 2, 5, (x, y) => (y === H + 2 ? 0xff5a4a : 0xc8201a));
  ell(v, x1 - 10, 17, -2, 2.4, 2.6, 2, 0xfffcf4); v.set(x1 - 11, 18, 0, 0x2a2a30); v.set(x1 - 9, 18, 0, 0x2a2a30); v.set(x1 - 8, 20, -2, 0xfffcf4);
  g.add(vm(v, V5));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 0.9, mode: 1, onU }));
  const s = signPlane(lotteryArt(), 2.1, { emissive: 0.55, onU }); at(s, 0, (H - 5) * V5, 1 * V5 + 0.012); g.add(s);
  g.userData = { width: W * V5 };
  return g;
}

// ---------------------------------------------------------------- the plaza: the statue, trees, lamps, the bus stop
function plaque() {
  const p = new PixCanvas(40, 22, 141);
  p.rect(0, 0, 40, 22, '#8a6a3a'); p.rect(1, 1, 38, 20, '#c8a050'); p.rect(2, 2, 36, 18, '#a88038');
  p.text('こだまくん', 20, 3, { font: `9px ${FONT.ui}`, color: '#3a2810', align: 'center' });
  p.text('まちの まもりがみ', 20, 13, { font: `7px ${FONT.small}`, color: '#4a3418', align: 'center' });
  return p;
}
export function kodamaStatue() {
  const v = new VoxelModel(), g = grp();
  // the granite pedestal with a polished top edge
  fill(v, -16, 15, 0, 27, -12, 11, (x, y, z) => (y === 27 ? 0xb8b4ac : y < 3 ? 0x7a766e : (x + z) % 7 === 0 ? 0x9a968e : 0xa8a49c));
  fill(v, -18, 17, 0, 2, -14, 13, 0x8a867e);
  // Kodama-kun: round head, little body, a sprout, rosy cheeks, a knitted red bib
  const W = 0xfbf8f0, Wd = 0xe8e4d8;
  ell(v, 0, 40, 0, 9, 10, 8, (x, y) => (y < 34 ? Wd : W));
  ell(v, 0, 60, 0, 14, 12.5, 12, (x, y, z) => (y > 66 && z < 4 ? 0xffffff : W));
  for (const sx of [-1, 1]) { ell(v, sx * 5, 29, 1, 3.5, 2.5, 4, Wd); }
  ell(v, -10, 42, 1, 3, 4, 3, W); ell(v, 10, 50, 1, 3, 4.5, 3, W);
  fill(v, -9, 9, 46, 49, -9, 9, (x, y, z) => { const d = Math.hypot(x / 9.5, z / 9.5); if (d > 1 || (z < 6 && d < 0.85)) return undefined; return (x + y) % 2 ? 0xd8302a : 0xe8463a; });
  ell(v, 0, 43, 8, 7, 4, 2, (x, y) => (y > 44 ? 0xe8463a : (x + y) % 2 ? 0xd8302a : 0xc82820));
  for (const sx of [-1, 1]) { fill(v, sx * 5 - 1, sx * 5, 59, 61, 11, 12, 0x2a2a30); v.set(sx * 5 - (sx > 0 ? 1 : 0), 61, 12, 0xffffff); fill(v, sx * 8 - 1, sx * 8 + 1, 56, 56, 10, 11, 0xffa0b4); }
  fill(v, -1, 1, 55, 55, 12, 12, 0x2a2a30);
  for (let y = 72; y < 78; y++) v.set(0, y, 0, 0x4a9a3a);
  ell(v, -4, 78, 0, 4, 1.4, 2.2, 0x7ad050); ell(v, 4, 80, 0, 4, 1.4, 2.2, 0x8ae060);
  g.add(vm(v, V25));
  const pq = signPlane(plaque(), 0.5); at(pq, 0, 0.42, 12 * V25 + 0.01); g.add(pq);
  g.userData = { r: 0.45, h: 2.0 };
  return g;
}
function mosaicArt(S = 192) {
  const p = new PixCanvas(S, S, 151);
  const c = S / 2 - 0.5;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (r > S / 2 - 1) continue;
    let col;
    if (r > S / 2 - 6) col = '#8a8680';
    else if (r > S / 2 - 18) col = ((Math.floor(a * 12 / Math.PI) & 1) ? '#e8e0d0' : '#d8c8b0');
    else if (r > S / 2 - 22) col = '#c8684a';
    else if (r > 30) col = (Math.floor(r / 8) + Math.floor(a * 8 / Math.PI)) & 1 ? '#d4d0c6' : '#c8c4ba';
    else col = '#e8dcc0';
    p.px(x, y, col);
  }
  // a ring of leaves and an eight-point star
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, x = c + Math.cos(a) * (S / 2 - 30), y = c + Math.sin(a) * (S / 2 - 30); p.ellipse(x, y, 5, 3, i % 2 ? '#6aa84a' : '#4a8a3a'); p.px(x, y, '#a8d878'); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = a + Math.PI / 8, bb = a - Math.PI / 8; p.poly([[c, c], [c + Math.cos(bb) * 12, c + Math.sin(bb) * 12], [c + Math.cos(a) * 28, c + Math.sin(a) * 28], [c + Math.cos(b) * 12, c + Math.sin(b) * 12]], i % 2 ? '#e8c060' : '#c8684a'); }
  p.circle(c, c, 6, '#f8f0d8');
  return p;
}
export function mosaic(d = 3.0) {
  const m = signPlane(mosaicArt(), d);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}
export function treeRing() {
  const v = new VoxelModel();
  for (let x = -23; x <= 23; x++) for (let z = -23; z <= 23; z++) {
    const d = Math.hypot(x, z);
    if (d > 22.5) continue;
    if (d > 16) { for (let y = 0; y < 8; y++) v.set(x, y, z, y === 7 ? 0xb4b0a8 : (y + Math.round(Math.atan2(z, x) * 8)) % 5 === 0 ? 0x8a867e : 0x9e9a92); v.set(x, 8, z, Math.round(Math.atan2(z, x) * 30) % 3 === 0 ? 0x8a5a32 : 0xb07a48); }
    else v.set(x, 6, z, hash3(x, 1, z) < 0.3 ? 0x4a6a32 : 0x5a4030);
  }
  const g = grp(vm(v, V5));
  g.userData.seats = [];
  for (const a of [Math.PI / 2 - 0.55, Math.PI / 2 + 0.55]) g.userData.seats.push({ x: Math.cos(a) * 19.5 * V5, z: Math.sin(a) * 19.5 * V5, y: 9 * V5, yaw: Math.atan2(Math.cos(a), Math.sin(a)) });
  g.userData.r = 1.15;
  return g;
}
export function clockPost({ onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  fill(v, -3, 3, 0, 2, -3, 3, 0x6a6e66);
  cyl(v, 0.5, 0.5, 1.6, 3, 63, (x, y) => (y % 16 === 0 ? 0x8a9a7a : 0x3a5a4a));
  fill(v, -9, 9, 64, 82, -3, 3, 0x2e4a3e); fill(v, -10, 10, 83, 84, -4, 4, 0x3a5a4a); fill(v, -2, 2, 85, 87, -2, 2, 0xc8a050);
  for (const sx of [-1, 1]) { for (let k = 0; k < 8; k++) v.set(sx * (2 + k), 60 + Math.round(Math.sin(k / 7 * Math.PI) * 2), 0, 0x3a5a4a); }
  g.add(vm(v, V5));
  const ck = signPlane(bigClock(48), 0.78, { emissive: 0.4, onU }); at(ck, 0, 73.5 * V5, 4 * V5 + 0.01); g.add(ck);
  for (const sx of [-1, 1]) {
    const b = new VoxelModel();
    ell(b, 0, 0, 0, 4, 3, 4, (x, y) => (y > 0 ? 0x4a8a3a : 0x6a4a2e));
    for (let k = 0; k < 9; k++) b.set(Math.round(Math.cos(k) * 3.5), 2 + (k % 2), Math.round(Math.sin(k) * 3.5), [0xff8ab0, 0xffe060, 0xffffff, 0xb08aff][k % 4]);
    const bm = vm(b, V5); bm.position.set(sx * 0.48, 2.88, 0); g.add(bm);
  }
  return g;
}
// suzuran-tō: the lily-of-the-valley street lamp, bells of frosted glass on curled arms
export function suzuranLamp({ onU = null, banner = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  fill(v, -2, 2, 0, 1, -2, 2, 0x3a3a40);
  for (let y = 2; y < 74; y++) { v.set(0, y, 0, y % 18 === 0 ? 0xb8903a : 0x2e3a46); if (y < 8) { v.set(1, y, 0, 0x2e3a46); v.set(-1, y, 0, 0x2e3a46); } }
  const bells = [];
  for (const sx of [-1, 1]) {
    for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI; v.set(sx * Math.round(1 + (1 - Math.cos(a)) * 5), 66 + Math.round(Math.sin(a) * 6), 0, 0x2e3a46); }
    bells.push([sx * 11, 63]);
  }
  bells.push([0, 76]);
  for (const [bx, by] of bells) {
    v.set(bx, by + 2, 0, 0xb8903a);
    for (let y = 0; y < 5; y++) { const r = 1 + Math.round(y * 0.6); for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r + 0.5) gl.set(bx + x, by + 1 - y, z, y === 4 ? 0xffe8c0 : 0xfff4dc); }
  }
  g.add(vm(v, V5));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.45, mode: 3, onU }));
  if (banner) { const b = signPlane(banner, 0.3, { double: true }); at(b, 0.18, 2.6, 0.03); g.add(b); }
  return g;
}
export function townBanner(seed = 1) {
  const p = new PixCanvas(20, 60, 161 + seed);
  p.rect(0, 0, 20, 60, seed % 2 ? '#e8402a' : '#1f8a7a');
  p.rect(0, 0, 20, 3, '#ffe060');
  ['木', '霊', '町'].forEach((ch, i) => p.text(ch, 10, 6 + i * 13, { font: `11px ${FONT.ui}`, color: '#ffffff', align: 'center' }));
  kodamaKun(p, 10, 50, 5);
  return p;
}
function busSign() {
  const p = new PixCanvas(40, 40, 171);
  p.circle(19.5, 19.5, 19.5, '#2a3a8a'); p.circle(19.5, 19.5, 17, '#ffffff');
  p.rect(9, 9, 22, 11, '#2a6ad8'); p.rect(11, 11, 6, 4, '#c8e8ff'); p.rect(19, 11, 6, 4, '#c8e8ff'); p.circle(13, 20, 2, '#2a2a30'); p.circle(27, 20, 2, '#2a2a30');
  p.text('バス', 20, 23, { font: `7px ${FONT.small}`, color: '#2a3a8a', align: 'center' });
  p.text('駅前', 20, 30, { font: `7px ${FONT.small}`, color: INK, align: 'center' });
  return p;
}
function timetable() {
  const p = new PixCanvas(22, 30, 172);
  p.rect(0, 0, 22, 30, '#f8f8f4'); p.rect(0, 0, 22, 5, '#2a6ad8');
  for (let r = 0; r < 6; r++) { p.text(String(7 + r * 2), 2, 6 + r * 4, { font: `7px ${FONT.tiny}`, color: INK }); for (let k = 0; k < 3; k++) p.rect(9 + k * 4, 8 + r * 4, 2, 1, '#5a5a62'); }
  return p;
}
export function busStop({ onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  cyl(v, 0.5, 0.5, 4, 0, 2, 0x9a968e);
  for (let y = 3; y < 46; y++) v.set(0, y, 0, 0xc8ccd0);
  fill(v, -3, 3, 22, 34, 1, 1, 0x2a6ad8);
  g.add(vm(v, V5));
  const s = signPlane(busSign(), 0.62, { double: true }); at(s, 0, 2.55, 0.03); g.add(s);
  const tt = signPlane(timetable(), 0.3, { emissive: 0.3, onU }); at(tt, 0, 1.4, 2 * V5 + 0.01); g.add(tt);
  return g;
}
export function phoneBooth({ onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  fill(v, -9, 8, 0, 1, -9, 8, 0x8a8e96);
  for (const [x, z] of [[-9, -9], [8, -9], [-9, 8], [8, 8]]) fill(v, x, x, 2, 44, z, z, 0xa8b0b8);
  fill(v, -9, 8, 45, 48, -9, 8, (x, y) => (y === 48 ? 0xd8dce0 : 0x3a8a5a));
  fill(v, -2, 3, 18, 30, -8, -6, 0x2a9a5a); fill(v, -1, 2, 26, 29, -5, -5, 0x1a1a22); fill(v, -1, 2, 20, 23, -5, -5, 0xd8dce0);
  fill(v, -6, 5, 14, 15, -8, -4, 0xb8bcc4);
  fill(gl, -8, 7, 44, 44, -8, 7, 0xf8fff8);
  g.add(vm(v, V5)); g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.0, mode: 1, onU }));
  const gp = glassPane(17 * V5, 42 * V5); at(gp, 0, 23 * V5, 8.6 * V5); g.add(gp);
  const p = new PixCanvas(56, 10, 181); p.rect(0, 0, 56, 10, '#3a8a5a'); p.text('公衆電話', 28, 0, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  const s = signPlane(p, 0.86, { emissive: 0.6, onU }); at(s, 0, 46.5 * V5, 9 * V5 + 0.012); g.add(s);
  return g;
}
export function postBox() {
  const v = new VoxelModel(), g = grp();
  fill(v, -4, 4, 0, 1, -4, 4, 0x6a6a72);
  for (let y = 2; y < 50; y++) for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (x * x + z * z <= 64) v.set(x, y, z, y > 46 ? 0xb8241c : (x + y) % 11 === 0 ? 0xc8281e : 0xd8302a);
  for (let y = 50; y < 55; y++) { const r = 8 - (y - 49) * 1.5; for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (x * x + z * z <= r * r) v.set(x, y, z, 0xc8281e); }
  fill(v, -4, 4, 36, 37, 8, 8, 0x2a2a30);
  g.add(vm(v, V25));
  const p = new PixCanvas(14, 18, 191); p.rect(0, 0, 14, 18, '#ffffff'); p.text('〒', 7, 1, { font: `11px ${FONT.ui}`, color: '#d8302a', align: 'center' }); p.text('POST', 7, 12, { font: `7px ${FONT.tiny}`, color: '#d8302a', align: 'center' });
  const s = signPlane(p, 0.2); at(s, 0, 0.62, 9 * V25 + 0.01); g.add(s);
  return g;
}

// ---------------------------------------------------------------- cars
// front is +z. taxi: lower body green, a red pinstripe, cream upper, lace seat
// covers in the windows, fender mirrors, the lit roof lamp
export function taxi({ body = 0x2a8a5a, top = 0xf4ecd0, stripe = 0xe8402a, onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  const WH = [[-28, 6], [27, 6]];
  const arch = (y, z) => WH.some(([wz]) => (y - 6) ** 2 + (z - wz) ** 2 < 60);
  fill(v, -17, 16, 4, 14, -44, 43, (x, y, z) => {
    if ((x <= -16 || x >= 15) && y < 13 && arch(y, z)) return undefined;
    const edge = x === -17 || x === 16;
    if (edge && (z === -4 || z === 13) && y > 5) return sh(body, 0.75);
    if (edge && y === 12 && (z === 6 || z === -12)) return 0xd8dce0;
    return y < 11 ? body : y === 11 ? stripe : top;
  });
  for (const [wz] of WH) for (const sx of [-1, 1]) for (let y = 0; y <= 12; y++) for (let z = wz - 6; z <= wz + 6; z++) {
    const d = Math.hypot(y - 6, z - wz);
    if (d > 6.3) continue;
    for (let x = 12; x <= 16; x++) v.set(sx > 0 ? x : -x - 1, y, z, d < 2.6 && (x === 16) ? 0xc8ccd4 : 0x1e1e24);
  }
  fill(v, -17, 16, 5, 8, 44, 45, 0xc8ccd0); fill(v, -17, 16, 5, 8, -46, -45, 0xc8ccd0);
  fill(v, -3, 2, 6, 8, 46, 46, 0xf8f8f0); fill(v, -3, 2, 6, 8, -47, -47, 0xf8f8f0);
  fill(v, -16, 15, 15, 15, 20, 43, top); fill(v, -16, 15, 15, 15, -44, -28, top);
  fill(v, -16, 15, 15, 24, -27, 19, (x, y, z) => {
    const side = x === -16 || x === 15, front = z === 19, back = z === -27;
    const pillar = (z >= 17 && z <= 19) || (z >= -4 && z <= -3) || (z >= -27 && z <= -25);
    if (y === 15 || y === 24) return top;
    if ((side && !pillar) || ((front || back) && x > -15 && x < 14)) {
      const lace = side && ((z >= 1 && z <= 6) || (z >= -21 && z <= -16)) && y >= 18 && y <= 22;
      if (lace) return (y + z) % 2 ? 0xf8f8f2 : 0xe8e8e0;
      return (z + y * 2) % 13 === 0 ? 0x8aa0b8 : 0x3a4a5e;
    }
    return top;
  });
  fill(v, -15, 14, 25, 25, -25, 17, top);
  fill(gl, -5, 4, 26, 29, -4, 2, (x, y) => (y === 29 ? 0xffd080 : 0xffa030));
  fill(v, -6, 5, 26, 26, -5, 3, 0x2a2a30);
  for (const sx of [-1, 1]) { fill(v, sx > 0 ? 16 : -18, sx > 0 ? 17 : -17, 15, 16, 36, 36, 0x1e1e24); v.set(sx > 0 ? 18 : -19, 17, 36, 0x1e1e24); }
  for (const sx of [-1, 1]) { fill(gl, sx > 0 ? 9 : -14, sx > 0 ? 13 : -10, 9, 11, 44, 44, 0xfff8e0); fill(gl, sx > 0 ? 10 : -14, sx > 0 ? 14 : -11, 9, 11, -45, -45, 0xff3030); }
  fill(gl, 9, 13, 17, 18, 16, 16, 0xff3030);
  g.add(vm(v, V5)); g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.2, mode: 1, onU }));
  const p = new PixCanvas(20, 8, 201); p.rect(0, 0, 20, 8, '#ffb040'); p.text('TAXI', 10, -1, { font: `7px ${FONT.small}`, color: '#2a1a10', align: 'center' });
  for (const sx of [-1, 1]) { const s = signPlane(p, 0.5, { emissive: 0.9, onU }); s.rotation.y = sx * Math.PI / 2; at(s, sx * 5.6 * V5, 27.5 * V5, -1 * V5); s.rotation.y = sx * Math.PI / 2; g.add(s); }
  g.userData = { len: 4.4, w: 1.7 };
  return g;
}
// a pastel kei car (yellow plates), seen nose-on as it waits at the crossing
export function keiCar({ body = 0xa8dcd0, onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel(), g = grp();
  fill(v, -14, 13, 3, 16, -32, 33, (x, y, z) => (y === 16 ? sh(body, 1.08) : body));
  fill(v, -13, 12, 17, 32, -30, 18, (x, y, z) => {
    const side = x === -13 || x === 12, front = z === 18, back = z === -30;
    if (y === 32) return 0xf8f8f4;
    if ((side && y > 18 && y < 31 && z > -28 && z < 16 && z !== -6) || ((front || back) && y > 18 && y < 31 && x > -12 && x < 11)) return (x + y * 2 + z) % 11 === 0 ? 0x9ab0c8 : 0x3a4a60;
    return body;
  });
  for (const wz of [-20, 22]) for (const sx of [-1, 1]) for (let y = 0; y <= 9; y++) for (let z = wz - 5; z <= wz + 5; z++) { const d = Math.hypot(y - 5, z - wz); if (d > 5.2) continue; for (let x = 11; x <= 14; x++) v.set(sx > 0 ? x : -x - 1, y, z, d < 2 && x === 14 ? 0xc8ccd4 : 0x1e1e24); }
  fill(v, -14, 13, 4, 7, 34, 34, 0xd8dce0);
  fill(v, -4, 3, 8, 11, 34, 34, 0xffe040); fill(v, -3, 2, 9, 10, 35, 35, 0x2a6a3a);
  for (const sx of [-1, 1]) { const cx = sx > 0 ? 9 : -10; ell(gl, cx, 12, 34, 2.6, 2.6, 0.6, 0xfff8e0); }
  for (const sx of [-1, 1]) fill(gl, sx > 0 ? 9 : -12, sx > 0 ? 11 : -10, 10, 13, -33, -33, 0xff3030);
  for (const sx of [-1, 1]) fill(v, sx > 0 ? 13 : -15, sx > 0 ? 14 : -14, 21, 23, 14, 15, 0x1e1e24);
  g.add(vm(v, V5)); g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 1.25, mode: 1, onU }));
  g.userData = { len: 3.3 };
  return g;
}

// ---------------------------------------------------------------- the crossing's lights
const lampMat = (c, onU) => new THREE.MeshBasicMaterial({ color: c });
// a horizontal three-lamp car signal on a cantilever (faces +z); setState('go'|'slow'|'stop')
export function carSignal({ arm = 2.4, onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  for (let y = 0; y < 100; y++) for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v.set(x, y, z, y < 3 ? 0x5a5a62 : 0x8a8e96);
  const A = Math.round(arm / V5);
  for (let x = -A; x <= 0; x++) { v.set(x, 92, 0, 0x8a8e96); v.set(x, 93, 0, 0x8a8e96); }
  for (let x = -A + 4; x <= -A + 20; x++) { const k = Math.round((x + A - 4) * 0.4); v.set(x, 93 + Math.min(6, k), 0, 0x8a8e96); }
  const hx = -A + 2;
  fill(v, hx - 10, hx + 10, 84, 91, -2, 1, 0x2a2e36);
  fill(v, hx - 11, hx + 11, 91, 91, -2, 4, 0x2a2e36);
  // a red inverted-triangle 止まれ sign lower on the pole
  g.add(vm(v, V5));
  const lamps = {};
  [['go', -7, 0x30e0a8], ['slow', 0, 0xffc030], ['stop', 7, 0xff3a2a]].forEach(([k, dx, c]) => {
    const on = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), lampMat(c, onU));
    const off = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshBasicMaterial({ color: 0x3a3e46 }));
    for (const m of [on, off]) { m.position.set((hx + dx) * V5, 87.5 * V5, 2.2 * V5); g.add(m); }
    on.visible = false;
    lamps[k] = { on, off };
  });
  const stop = new PixCanvas(26, 23, 211);
  stop.poly([[0, 0], [25, 0], [12.5, 22]], '#ffffff'); stop.poly([[2, 1], [23, 1], [12.5, 20]], '#d8302a');
  stop.text('止まれ', 13, 2, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
  const ss = signPlane(stop, 0.62, { double: true }); at(ss, 0.03, 2.3, 2 * V5 + 0.015); g.add(ss);
  g.userData.setState = (s) => { for (const [k, l] of Object.entries(lamps)) { l.on.visible = k === s; l.off.visible = k !== s; } };
  g.userData.setState('stop');
  return g;
}
// a pedestrian signal: red standing figure over a green walking figure
function pedFace(kind, on) {
  const p = new PixCanvas(16, 16, 220 + (kind === 'go' ? 1 : 0) + (on ? 2 : 0));
  p.rect(0, 0, 16, 16, '#1a1a20');
  const c = on ? (kind === 'go' ? '#40f0b0' : '#ff3a2a') : '#3a3a42';
  p.circle(8, 3, 2, c);
  if (kind === 'stop') { p.rect(6, 6, 5, 6, c); p.rect(6, 12, 2, 3, c); p.rect(9, 12, 2, 3, c); p.rect(5, 6, 1, 4, c); p.rect(11, 6, 1, 4, c); }
  else { p.rect(7, 6, 3, 5, c); p.line(7, 11, 5, 15, c); p.line(9, 11, 11, 15, c); p.line(7, 7, 4, 10, c); p.line(9, 7, 12, 9, c); }
  return p;
}
export function pedSignal({ onU = null } = {}) {
  const v = new VoxelModel(), g = grp();
  for (let y = 0; y < 50; y++) for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v.set(x, y, z, y < 3 ? 0x5a5a62 : 0x8a8e96);
  fill(v, -3, 4, 50, 66, -2, 3, 0x2a2e36);
  fill(v, -4, 5, 67, 67, -3, 5, 0x2a2e36);
  g.add(vm(v, V5));
  const faces = {};
  for (const [k, y] of [['stop', 62], ['go', 54]]) {
    const on = signPlane(pedFace(k, true), 0.32, { emissive: 1.3, onU }); at(on, 0.5 * V5, y * V5, 4 * V5 + 0.014);
    const off = signPlane(pedFace(k, false), 0.32); at(off, 0.5 * V5, y * V5, 4 * V5 + 0.01);
    g.add(on, off); faces[k] = { on, off };
  }
  g.userData.setState = (s, blink = false) => { faces.stop.on.visible = s === 'stop'; faces.go.on.visible = s === 'go' && !blink; faces.stop.off.visible = !faces.stop.on.visible; faces.go.off.visible = !faces.go.on.visible; };
  g.userData.setState('stop');
  return g;
}

// ---------------------------------------------------------------- the side street running away from the crossing
// house walls lining both sides (their roofs are what you see), utility poles
// with sagging wires, a convex mirror, and a little house at the far end
export function sideStreet({ onU = null, x0 = -46.0, x1 = -31.2, rx0 = -41.5, rx1 = -36.5, z1 = -15 } = {}) {
  const cx = (rx0 + rx1) / 2;
  const g = grp();
  g.position.x = cx;
  const v = new VoxelModel(), gl = new VoxelModel();
  const X = (m) => Math.round((m - cx) / V5), Z = (m) => Math.round(m / V5);
  // a gable roof running along z (slopes to either side)
  const roof = (ax0, ax1, az0, az1, y0, col) => {
    const K = Math.min(12, Math.floor((ax1 - ax0) / 2));
    for (let k = 0; k <= K; k++) for (let x = ax0 + k; x <= ax1 - k; x++) for (let z = az0; z <= az1; z++) if (x <= ax0 + k + 1 || x >= ax1 - k - 1 || k === K) v.set(x, y0 + k, z, z % 3 === 0 ? sh(col, 0.85) : (x + z) % 7 === 0 ? sh(col, 1.1) : col);
  };
  // left: two houses side-on, only the walls you can see (the one on the road, the front) and the roofs
  for (const [ax0, ax1, az0, az1, rc, wc] of [[X(x0), X(rx0) - 1, Z(-3.3) - 1, Z(-9), 0x6a7484, 0xe8dcc4], [X(x0), X(rx0) - 1, Z(-9) - 2, Z(z1) + 1, 0x8a4a3a, 0xd8ccb0]]) {
    fill(v, ax1, ax1, 0, 95, az1, az0, (x, y, z) => (y < 4 ? 0x6a6a72 : wc));
    fill(v, ax0, ax1, 0, 95, az0, az0, wc);
    roof(ax0 - 2, ax1 + 2, az1 - 2, az0 + 2, 96, rc);
    for (let z = az1 + 6; z < az0 - 6; z += 20) fill(gl, ax1 + 1, ax1 + 1, 36, 62, z + 5, z + 13, hash3(z, 1, 1) < 0.6 ? 0xffe0a0 : 0x4a5a70);
  }
  // right: a long storehouse behind the lottery kiosk
  const sx0 = X(rx1) + 1, sx1 = X(x1), sz0 = Z(-2.0), sz1 = Z(z1) + 1;
  fill(v, sx0, sx0, 0, 80, sz1, sz0, (x, y, z) => (y < 8 ? 0x5a5a62 : (z + y) % 23 === 0 ? 0xd8d0c0 : 0xf0ece0));
  fill(v, sx0, sx1, 0, 80, sz0, sz0, (x, y) => (y < 8 ? 0x5a5a62 : y % 16 === 0 ? 0x2a2a30 : 0xf0ece0));
  roof(sx0 - 2, sx1 + 2, sz1 - 1, sz0 + 2, 81, 0x3a4250);
  // the house at the end of the street, facing us: lit windows, a vending machine
  const hz = Z(z1) - 2, hx0 = X(rx0) - 20, hx1 = X(rx1) + 20;
  fill(v, hx0, hx1, 0, 100, hz, hz, (x, y) => (y < 4 ? 0x6a6a72 : y === 50 || y === 51 ? 0x8a6a4a : 0xeae0cc));
  for (const wx of [X(rx0) + 6, X(rx1) - 22]) for (const wy of [16, 62]) fill(gl, wx, wx + 16, wy, wy + 22, hz + 1, hz + 1, (x, y) => ((x + y) % 7 === 0 ? 0xe8c890 : hash3(wx, wy, 2) < 0.55 ? 0xffdca0 : 0x4a5a70));
  for (let k = 0; k < 14; k++) for (let x = hx0 - 2; x <= hx1 + 2; x++) for (const z of [hz + 3 - k * 2, hz + 2 - k * 2]) v.set(x, 101 + k, z, x % 4 === 0 ? 0x3e4658 : 0x4a5466);
  fill(gl, X(cx) - 8, X(cx) + 8, 2, 36, hz + 1, hz + 1, (x, y) => (y > 24 ? 0xe8f4ff : (x + y) % 4 === 0 ? 0xff7a5a : 0x7ac8ff));
  // utility poles with wires across, a convex mirror on the corner
  const poles = [[rx1 - 0.25, -5.5], [rx0 + 0.25, -11.5]];
  for (const [px, pz] of poles) {
    for (let y = 0; y < 170; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v.set(X(px) + dx, y, Z(pz) + dz, y % 30 === 0 ? 0x8a8a84 : 0xa8a49c);
    fill(v, X(px) - 10, X(px) + 11, 160, 161, Z(pz), Z(pz) + 1, 0x7a7670);
    fill(v, X(px) - 3, X(px) + 4, 132, 144, Z(pz) - 4, Z(pz) - 1, 0x8a8e96);
  }
  g.add(vm(v, V5, [0, 0, 0], { cast: false }));
  g.add(glowVm(gl, V5, [0, 0, 0], { intensity: 0.9, mode: 1, onU }));
  const [[ax, az], [bx, bz]] = poles;
  const pts = [];
  for (const dy of [0, -0.25, 0.25]) for (let i = 0; i < 16; i++) {
    const P = (t) => [ax - cx + (bx - ax) * t, 8.05 + dy * 0.6 - Math.sin(t * Math.PI) * 0.45, az + (bz - az) * t];
    pts.push(...P(i / 16), ...P((i + 1) / 16));
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2a2a30 })));
  const mv = new VoxelModel();
  for (let y = 0; y < 52; y++) mv.set(0, y, 0, 0xe8a030);
  ell(mv, 0, 52, 2, 5, 5, 1.2, (x, y, z) => (z > 2 ? 0xd8e8f0 : 0xe8a030));
  const mm = vm(mv, V5); mm.position.set(rx0 - 0.4 - cx, 0, -0.5); mm.rotation.y = 0.5; g.add(mm);
  return g;
}

// ---------------------------------------------------------------- ground textures (64 texels per metre)
// the plaza: granite pavers in a running bond with terracotta bands, a dark
// band by the buildings with a drain line, a tactile line, the curb, and the
// station road with its taxi bay. depth in metres from z = 0.
export function plazaTexture(depth = 10.6) {
  const W = 512, H = Math.round(depth * 64);
  const p = new PixCanvas(W, H, 241);
  const zc = Math.round(6.9 * 64);
  const stones = ['#d6d2c8', '#ccc8be', '#dedad0', '#c6c2b8', '#d2cabe', '#dcd4c8'];
  for (let y = 40; y < zc; y += 16) {
    const off = ((y / 16) % 2) * 16;
    for (let x = -32; x < W; x += 32) {
      const band = ((x + off + 512) % 256) < 32;
      const c = band ? ['#cfa090', '#c4968a', '#d6aa98'][Math.floor(hash3(x, y, 2) * 3)] : stones[Math.floor(hash3(x + off, y, 1) * stones.length)];
      p.rect(x + off, y, 32, 16, c);
      p.hline(x + off, x + off + 31, y, darken(c, 0.1)); p.vline(x + off, y, y + 15, darken(c, 0.12));
      p.hline(x + off + 1, x + off + 30, y + 1, lighten(c, 0.06));
      for (let k = 0; k < 4; k++) p.px(x + off + 2 + Math.floor(hash3(x, y, k) * 28), y + 2 + Math.floor(hash3(y, x, k) * 12), darken(c, 0.18));
    }
  }
  p.rect(0, 0, W, 40, '#8e8a84');
  for (let x = 0; x < W; x += 20) { p.vline(x, 0, 39, '#7a7670'); p.px(x + 7, 12, '#a29e98'); p.px(x + 13, 26, '#a29e98'); }
  p.rect(0, 28, W, 6, '#4a4a52'); for (let x = 0; x < W; x += 4) p.vline(x, 29, 32, '#26262c');
  // a yellow tactile path, a curb, the road with a white edge line and a taxi bay
  const ty = Math.round(6.15 * 64);
  p.rect(0, ty, W, 14, '#e8c040'); for (let x = 2; x < W; x += 8) p.rect(x, ty + 2, 5, 10, '#f4d468');
  p.rect(0, zc, W, 8, '#d8d4cc'); p.rect(0, zc + 8, W, 3, '#9a968e');
  p.rect(0, zc + 11, W, H - zc - 11, '#4e4e58');
  for (let i = 0; i < 1400; i++) p.px(Math.floor(hash3(i, 1, 9) * W), zc + 11 + Math.floor(hash3(i, 2, 9) * (H - zc - 11)), hash3(i, 3, 9) < 0.5 ? '#5a5a64' : '#44444c');
  p.rect(0, zc + 18, W, 3, '#f0f0ea');
  for (let x = 40; x < W; x += 256) { p.rect(x, zc + 30, 150, 3, '#f0c040'); p.rect(x, zc + 30, 3, 60, '#f0c040'); p.rect(x + 147, zc + 30, 3, 60, '#f0c040'); p.text('タクシー', x + 75, zc + 46, { font: `16px ${FONT.ui}`, color: '#f0f0ea', align: 'center' }); }
  p.rect(0, H - 40, W, 40, '#bcb8b0'); p.rect(0, H - 40, W, 3, '#8a867e');
  for (let x = 0; x < W; x += 48) p.vline(x, H - 40, H - 1, '#9a968e');
  return p;
}
// the crossing road from z = -zFar to z = depth: asphalt, a centre line,
// zebra bars, a stop line and 止まれ, the ◇ crossing-ahead marking
export function roadTexture(w = 5, zFar = 15, depth = 10.6) {
  const W = Math.round(w * 64), H = Math.round((zFar + depth) * 64);
  const p = new PixCanvas(W, H, 251);
  const Y = (z) => Math.round((z + zFar) * 64);
  p.rect(0, 0, W, H, '#4c4c56');
  for (let i = 0; i < 2600; i++) p.px(Math.floor(hash3(i, 1, 7) * W), Math.floor(hash3(i, 2, 7) * H), hash3(i, 3, 7) < 0.5 ? '#585862' : '#42424a');
  for (let i = 0; i < 6; i++) { let x = hash3(i, 4, 7) * W, y = hash3(i, 5, 7) * H; for (let k = 0; k < 20; k++) { p.px(x, y, '#3a3a42'); x += hash3(i, k, 1) < 0.5 ? 1 : -1; y += 1; } }
  p.rect(6, 0, 3, H, '#f0f0ea'); p.rect(W - 9, 0, 3, H, '#f0f0ea');
  for (let y = 0; y < Y(-1.4); y += 64) p.rect(W / 2 - 2, y, 4, 40, '#f0f0ea');
  for (let z = 0.85; z < 8.1; z += 0.9) p.rect(14, Y(z), W - 28, Math.round(0.45 * 64), '#f4f4ee');
  p.rect(W / 2 + 2, Y(-0.75), W / 2 - 12, 10, '#f4f4ee');
  p.text('止まれ', W * 0.75, Y(-3.6), { font: `22px ${FONT.ui}`, color: '#f4f4ee', align: 'center' });
  const dz = Y(-8.5), dx = W * 0.75;
  for (let t = 0; t < 3; t++) p.poly([[dx, dz - 40 + t], [dx + 22 - t, dz], [dx, dz + 40 - t], [dx - 22 + t, dz]], t === 2 ? '#4c4c56' : '#f4f4ee');
  return p;
}
export function groundPlane(pc, w, d, { repeat = 1 } = {}) {
  const tex = makeTexture(pc.c, { repeat: repeat !== 1, mips: false });
  if (repeat !== 1) tex.repeat.set(repeat, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- a taller block standing back from the square
// (a business hotel / offices): window grid, some lit, a vertical sign, a water tank on the roof
export function officeBlock({ w = 4.6, floors = 4, onU = null, seed = 1, wall = 0xc8c0b0, sign = null } = {}) {
  const W = Math.round(w / V5), FH = 30, H = floors * FH + 8, x0 = -Math.floor(W / 2), x1 = x0 + W - 1;
  const v = new VoxelModel(), g = grp();
  fill(v, x0, x1, 0, H, -1, 0, (x, y) => (y % FH === 0 ? sh(wall, 0.84) : (x + y) % 13 === 0 ? sh(wall, 0.94) : wall));
  fill(v, x0 - 1, x1 + 1, H + 1, H + 3, -50, 1, sh(wall, 0.76));
  const n = Math.max(1, Math.floor((W - 6) / 18));
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const cx = Math.round(x0 + 3 + (i + 0.5) * ((W - 6) / n)), wy0 = f * FH + 8, wy1 = wy0 + 16;
    carve(v, cx - 6, cx + 5, wy0, wy1, -1, 0);
    fill(v, cx - 7, cx + 6, wy0 - 1, wy0 - 1, 0, 1, sh(wall, 0.8));
    const lit = hash3(f, i, seed) < 0.55;
    const pl = signPlane(winTex(38, 54, seed * 31 + f * 7 + i, { lit, kind: (f + i) % 2 ? 'blinds' : 'curtain', col: '#fff0c8' }), 12 * V5, lit ? { emissive: 0.75, onU } : {});
    at(pl, (cx - 0.5) * V5 + 0.025, ((wy0 + wy1 + 1) / 2) * V5, -1 * V5 + 0.004); g.add(pl);
  }
  // the roof: a water tank on legs and an antenna
  cyl(v, x1 - 14, -20, 6, H + 12, H + 26, (x, y) => (y === H + 26 ? 0xb8bcc4 : 0xd8dce0));
  for (const [dx, dz] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) fill(v, x1 - 14 + dx, x1 - 14 + dx, H + 4, H + 11, -20 + dz, -20 + dz, 0x6a6e76);
  for (let y = H + 4; y < H + 40; y++) v.set(x0 + 8, y, -30, 0x8a8e96);
  fill(v, x0 + 4, x0 + 12, H + 32, H + 32, -30, -30, 0x8a8e96);
  g.add(vm(v, V5));
  if (sign) {
    const s = signPlane(sign, sign.w / 64, { emissive: 1.0, onU, mode: 4 });
    at(s, (x0 + 4) * V5, H * V5 - (sign.h / 64) / 2 - 0.2, 4 * V5); g.add(s);
    const bv = new VoxelModel(); fill(bv, 0, 1, 0, 2, -3, -1, 0x6a6a72); fill(bv, 0, 1, Math.round((sign.h / 64) / V5) - 3, Math.round((sign.h / 64) / V5) - 1, -3, -1, 0x6a6a72);
    const bm = vm(bv, V5); bm.position.set((x0 + 4) * V5, H * V5 - sign.h / 64 - 0.2, 3 * V5); g.add(bm);
  }
  g.userData = { width: W * V5, height: H * V5 };
  return g;
}
export function hotelSign() {
  const p = new PixCanvas(26, 92, 261);
  p.rect(0, 0, 26, 92, '#f8f4ec'); p.frame(0, 0, 26, 92, '#2a6ad8'); p.frame(1, 1, 24, 90, '#2a6ad8');
  ['ホ', 'テ', 'ル', 'こ', 'だ', 'ま'].forEach((ch, i) => p.text(ch, 13, 4 + i * 14, { font: `12px ${FONT.ui}`, color: i < 3 ? '#2a6ad8' : '#d8302a', align: 'center' }));
  return p;
}
export function izakayaSign() {
  const p = new PixCanvas(26, 92, 262);
  p.rect(0, 0, 26, 92, '#2a1a12'); p.frame(0, 0, 26, 92, '#e8b040');
  ['居', '酒', '屋', 'た', 'ぬ', 'き'].forEach((ch, i) => p.text(ch, 13, 4 + i * 14, { font: `12px ${FONT.ui}`, color: i < 3 ? '#ffe8b0' : '#ff8a5a', align: 'center' }));
  return p;
}
