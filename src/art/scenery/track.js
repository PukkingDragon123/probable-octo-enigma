// The layer right outside the window: catenary masts and wires flicking past,
// the grassy embankment, noise barriers in town, the truss girders of a river
// bridge, tunnels (portal, darkness, lamps streaking by) and, at the end, the
// platform of Kodama-machi station with people waiting.
// Rows: y = 0 at the top; L.hz is the horizon row, L.gy the embankment top.
import { pk, pks, h1, h2, n2, rampPick, emit, win, sprite, fromCanvas, darkenPacked } from './core.js';
import { PixCanvas } from '../../core/pixtex.js';
import { FONT } from '../../ui/fonts.js';

const MAST = pks(['#4a4e58', '#5e636e', '#767c88', '#9aa0aa']);
const WIRE = pk('#2a2c34'), WIRE_L = pk('#4a4c56');
const GRASS = pks(['#2e5a28', '#3c6e30', '#4c8238', '#5e9842', '#78ae4e']);
const CONC = pks(['#8a8a86', '#9a9a94', '#aaa9a2', '#bab8b0', '#cac8c0']);
const TRUSS = pks(['#2e4a44', '#3a5a52', '#4a6c62', '#5e8074']);
const TUN = pks(['#121218', '#18181f', '#1e1e26', '#262630']);
const BLACK = pk('#1e1a22'), WHITE = pk('#f4f2ec');

const MAST_SP = 380;
function mast(B, X, L) {
  const top = L.hz - 92, gy = L.gy;
  // steel H-beam pole with a lattice brace, cantilever arm and insulators
  for (let y = top; y < gy; y++) {
    B.rect(X, y, 12, 1, MAST[1]);
    B.set(X, y, MAST[0]); B.set(X + 1, y, MAST[3]); B.set(X + 2, y, MAST[2]); B.set(X + 10, y, MAST[0]); B.set(X + 11, y, MAST[0]);
    if ((y - top) % 10 < 1) B.hline(X + 3, X + 9, y, MAST[3]);
    const k = (y - top) % 10; B.set(X + 3 + Math.min(6, Math.round(k * 0.7)), y, MAST[2]);
  }
  B.rect(X - 2, gy - 4, 16, 4, CONC[1]);
  // cantilever toward the train (left in view), with insulator stacks
  const ay = L.hz - 66;
  B.rect(X - 60, ay, 60, 3, MAST[1]); B.hline(X - 60, X - 1, ay, MAST[3]);
  for (let k = 0; k < 40; k++) B.set(X - 4 - k, ay - 18 + Math.round(k * 0.45), MAST[2]);
  for (const ix of [X - 8, X - 54]) for (let k = 0; k < 4; k++) { B.rect(ix - 2, ay + 3 + k * 2, 5, 1, pk('#8a6a5a')); B.set(ix, ay + 4 + k * 2, pk('#5a4a40')); }
  B.rect(X + 2, top - 3, 8, 3, MAST[3]);
}
function wires(B, L) {
  // messenger wire sagging between masts, straight contact wire with droppers, a feeder up top
  const mY = L.hz - 60, cY = L.hz - 50, fY = L.hz - 86;
  for (let X = B.x0; X < B.x1; X++) {
    const t = (((X % MAST_SP) + MAST_SP) % MAST_SP) / MAST_SP;
    const sag = Math.round(Math.sin(t * Math.PI) * 7);
    B.set(X, mY + sag, WIRE);
    B.set(X, cY, WIRE); B.set(X, cY - 1, WIRE_L);
    if (X % 24 === 0) B.vline(X, mY + sag, cY, WIRE_L);
  }
}
function embankment(B, L, X, flowers) {
  const gy = L.gy;
  B.col(X, gy, B.H - 1, (x, y) => {
    const d = y - gy;
    if (d < 4) return d === 0 ? CONC[4] : CONC[2 - (x % 9 === 0 ? 1 : 0)]; // cable trough lid
    if (d < 6) return CONC[0];
    let c = rampPick(GRASS, 0.75 - d * 0.012 + (n2(x / 3, y / 2, 501) - 0.5) * 0.7, x, y);
    if (flowers && h2(x >> 1, y >> 1, 502) > 0.94) c = pk(['#f4f0ff', '#ffe060', '#c8a0ff', '#ff9ab0'][(x + y) % 4]);
    return c;
  });
  // tall grass and weeds leaning in the train's wind
  if (h1(X, 503) > 0.55) { const hgt = 4 + Math.floor(h1(X, 504) * 12); for (let k = 0; k < hgt; k++) B.set(X - (k >> 2), gy - k, GRASS[2 + (k % 2)]); }
}
function barrier(B, L, X, k) {
  const gy = L.gy, top = gy - 46;
  B.col(X, top, gy - 1, (x, y) => {
    if (y === top) return CONC[4];
    if (y < top + 3) return CONC[3];
    if ((x % 48) === 0) return CONC[0];
    if (k > 0.5 && y < top + 22 && y > top + 4) return (x % 48) < 2 ? CONC[1] : pk('#9ab8c8'); // clear panels
    return rampPick(CONC, 0.5 + (n2(x / 6, y / 10, 511) - 0.5) * 0.5 - (y - top) * 0.004, x, y);
  });
}
function truss(B, L, X, local) {
  const top = L.hz - 98, bot = L.gy - 6, P = 96;
  const u = ((local % P) + P) % P;
  const deck = (y) => y >= bot - 8;
  B.col(X, top, bot, (x, y) => {
    if (y < top + 9) return TRUSS[y - top < 2 ? 3 : 1];
    if (deck(y)) return y < bot - 5 ? TRUSS[3] : TRUSS[1];
    if (u < 7) return TRUSS[u < 2 ? 3 : u > 5 ? 0 : 2];
    // diagonals
    const d1 = (y - top) / (bot - top) * P;
    if (Math.abs(u - d1) < 3.5) return TRUSS[Math.abs(u - d1) < 1 ? 3 : 2];
    if (Math.abs(u - (P - d1)) < 2.5) return TRUSS[1];
    // rivet strips along the chords
    return 0;
  });
  if (u % 8 === 0) { B.set(X, top + 4, TRUSS[0]); B.set(X, bot - 7, TRUSS[0]); }
}
function tunnelCol(B, L, X, mode, local) {
  // mode 'in': hillside rising to the portal then darkness; 'out': portal then hillside falling away
  const H = B.H;
  const hill = (k) => B.col(X, Math.round(L.gy - k), H - 1, (x, y) => {
    const d = y - (L.gy - k);
    if (d < 2) return GRASS[4];
    return rampPick(GRASS, 0.55 - d * 0.004 + (n2(x / 4, y / 4, 521) - 0.5) * 0.7, x, y);
  });
  const dark = () => B.col(X, 0, H - 1, (x, y) => {
    if (y === L.hz - 20 || y === L.hz - 17) return TUN[3];
    if ((x % 220) < 26 && Math.abs(y - (L.hz - 34)) < 3) return emit(Math.abs(y - (L.hz - 34)) < 2 ? '#fff2c0' : '#ffb050');
    if ((x % 220) < 30 && Math.abs(y - (L.hz - 34)) < 5) return TUN[3];
    return rampPick(TUN, 0.4 + (n2(x / 9, y / 7, 522) - 0.5) * 0.5, x, y);
  });
  const portal = () => B.col(X, 0, H - 1, (x, y) => rampPick(CONC, 0.55 + (n2(x / 2, y / 6, 523) - 0.5) * 0.4, x, y));
  if (mode === 'in') {
    if (local < 90) hill(local * local / 90 * 2.4 + 6);
    else if (local < 104) portal();
    else dark();
  } else {
    if (local < 14) portal();
    else if (local < 110) hill((110 - local) * (110 - local) / 90 * 2.2 + 6);
    else return false;
  }
  return true;
}

// ---- Kodama-machi station platform across the tracks
let NAMEBOARD = null;
function nameBoard() {
  if (NAMEBOARD) return NAMEBOARD;
  const p = new PixCanvas(96, 34, 9);
  p.rect(0, 0, 96, 34, '#f4f4f0'); p.frame(0, 0, 96, 34, '#5a5e66');
  p.text('こだまちょう', 48, 2, { font: `12px ${FONT.ui}`, color: '#1e1e24', align: 'center' });
  p.rect(1, 18, 94, 4, '#2a8a4a');
  p.text('Kodama-machi', 48, 22, { font: `9px ${FONT.small}`, color: '#2a2a30', align: 'center' });
  p.text('木霊町', 48, 11, { font: `7px ${FONT.tiny}`, color: '#5a5a60', align: 'center' });
  NAMEBOARD = fromCanvas(p);
  return NAMEBOARD;
}
const SPECIES = [
  { skin: '#c8915a', ear: 'cat' }, { skin: '#f0e8dc', ear: 'rabbit' }, { skin: '#8a6a4a', ear: 'round' }, { skin: '#d8b070', ear: 'dog' },
  { skin: '#9aa0a8', ear: 'mouse' }, { skin: '#e8a060', ear: 'fox' }, { skin: '#6a5a50', ear: 'round' }, { skin: '#f4f0e8', ear: 'cat' },
];
const CLOTHES = ['#3a4a6a', '#c83a3a', '#e8e0d0', '#4a7a5a', '#2a2a30', '#d8a040', '#8a5aa8', '#5a8ad8', '#f0a0b0', '#7a5a3a'];
export function person(B, X, gy, seed, o = {}) {
  const r = (k) => h1(seed, k);
  const sp = SPECIES[Math.floor(r(1) * SPECIES.length)];
  const skin = pk(sp.skin), skinD = darkenPacked(skin, 0.25);
  const top = pk(CLOTHES[Math.floor(r(2) * CLOTHES.length)]), pants = pk(CLOTHES[Math.floor(r(3) * CLOTHES.length)]);
  const kid = r(4) < 0.18, s = kid ? 0.7 : 1;
  const face = r(5) < 0.5 ? 1 : -1;
  const lh = Math.round(7 * s), bh = Math.round(9 * s), hw = Math.round(9 * s), hh = Math.round(8 * s);
  const y0 = gy - lh;
  // legs, shoes
  B.rect(X - 2, y0, 2, lh, pants); B.rect(X + 1, y0, 2, lh, pants);
  B.rect(X - 3, gy - 1, 3, 1, BLACK); B.rect(X + 1, gy - 1, 3, 1, BLACK);
  // body and arms
  const by = y0 - bh;
  B.rect(X - 4, by, 8, bh, top); B.vline(X + 3, by, y0 - 1, darkenPacked(top, 0.25));
  B.rect(X - 5, by + 1, 1, bh - 3, top); B.rect(X + 4, by + 1, 1, bh - 3, darkenPacked(top, 0.2));
  B.set(X - 5, by + bh - 2, skin); B.set(X + 4, by + bh - 2, skin);
  // head
  const hy = by - hh;
  B.rect(X - Math.floor(hw / 2), hy, hw, hh, skin);
  B.vline(X + Math.ceil(hw / 2) - 1, hy, hy + hh - 1, skinD);
  const ex = X + face * 2;
  B.set(ex - 1, hy + Math.floor(hh / 2), BLACK); B.set(ex + 2 * face - 1 + (face < 0 ? 1 : 0), hy + Math.floor(hh / 2), BLACK);
  B.set(ex + face * 2, hy + Math.floor(hh / 2) + 2, pk('#ff9a9a'));
  // ears
  const ex0 = X - Math.floor(hw / 2), ex1 = X + Math.ceil(hw / 2) - 1;
  if (sp.ear === 'cat' || sp.ear === 'fox') { B.rect(ex0, hy - 2, 2, 2, skin); B.set(ex0, hy - 3, skin); B.rect(ex1 - 1, hy - 2, 2, 2, skinD); B.set(ex1, hy - 3, skinD); }
  else if (sp.ear === 'rabbit') { B.rect(ex0 + 1, hy - 6, 2, 6, skin); B.rect(ex1 - 2, hy - 7, 2, 7, skinD); B.set(ex0 + 1, hy - 4, pk('#ffb0c0')); }
  else if (sp.ear === 'dog') { B.rect(ex0 - 1, hy, 2, 5, skinD); B.rect(ex1, hy, 2, 5, skinD); }
  else if (sp.ear === 'mouse') { B.ellipse(ex0, hy, 2.5, 2.5, skin); B.ellipse(ex1 + 1, hy, 2.5, 2.5, skinD); }
  else { B.ellipse(ex0 + 1, hy, 1.8, 1.8, skin); B.ellipse(ex1, hy, 1.8, 1.8, skinD); }
  // extras: a phone glow, a suitcase, a hat, a paper bag
  const ex2 = r(6);
  if (ex2 < 0.25) { B.set(X + face * 4, by + 2, emit('#a8d8ff')); B.set(X + face * 4, by + 3, emit('#a8d8ff')); }
  else if (ex2 < 0.45) { const sx = X + face * 7 - 3; B.rect(sx, gy - 9, 7, 8, pk(CLOTHES[(seed + 3) % CLOTHES.length])); B.rect(sx + 2, gy - 11, 3, 2, BLACK); B.set(sx + 1, gy, BLACK); B.set(sx + 5, gy, BLACK); }
  else if (ex2 < 0.6) { B.rect(X - Math.floor(hw / 2) - 1, hy - 1, hw + 2, 2, pk(CLOTHES[(seed + 5) % CLOTHES.length])); }
  else if (ex2 < 0.72) { B.rect(X + face * 6 - 2, by + 3, 5, 6, pk('#c8a070')); }
  if (o.wave) { B.set(X - 6, by - 1, skin); B.set(X - 6, by - 2, skin); }
}
function platform(B, L, X, local) {
  const pf = L.gy - 30; // platform surface row
  const roof = L.hz - 100;
  // platform body and surface (the yellow tactile line, the white edge)
  B.col(X, pf, B.H - 1, (x, y) => {
    const d = y - pf;
    if (d === 0) return CONC[4];
    if (d < 3) return pk('#f0c430');
    if (d < 5) return CONC[3];
    if (d < 7) return WHITE;
    if (d < 9) return CONC[2];
    return rampPick(CONC, 0.35 - (d - 9) * 0.01 + (n2(x / 4, y / 3, 531) - 0.5) * 0.3, x, y);
  });
  // the back wall with posters, the roof and its lights
  B.col(X, roof, pf - 1, (x, y) => {
    if (y < roof + 6) return y === roof ? CONC[4] : pk('#7a7e88');
    if (y < roof + 8) return pk('#4a4e58');
    if (y === roof + 8 && x % 30 < 18) return emit('#f8fbff');
    if (y > pf - 50) return (x % 64 < 1) ? CONC[0] : rampPick(pks(['#c8c4ba', '#d4d0c6', '#dedad0']), 0.5 + (n2(x / 9, y / 9, 532) - 0.5) * 0.3, x, y);
    return 0;
  });
  const u = ((local % 200) + 200) % 200;
  if (u < 8) B.col(X, roof + 8, pf, (x, y) => (u < 2 ? CONC[1] : u > 5 ? CONC[0] : CONC[3]));
}
export function paintTrack(B, L) {
  const flowers = true;
  let anyMast = false;
  for (let X = B.x0; X < B.x1; X++) {
    const s = L.segAt(X);
    const local = X - s.x0;
    if (s.b === 'tunnel') { tunnelCol(B, L, X, 'in', local); continue; }
    if (s.a === 'tunnel' && tunnelCol(B, L, X, 'out', local)) continue;
    const seg = s.b;
    if (seg === 'station') { platform(B, L, X, local); continue; }
    embankment(B, L, X, flowers);
    if (seg === 'river' && local > 60) truss(B, L, X, local);
    if ((seg === 'city' && n2(X / 400, 0, 541) > 0.3) || (seg === 'village' && n2(X / 500, 0, 542) > 0.6)) barrier(B, L, X, n2(X / 300, 1, 543));
    anyMast = true;
  }
  if (!anyMast) return;
  wires(B, L);
  B.slots(MAST_SP, 70, 551, (i, sx) => {
    const s = L.segAt(sx);
    if (s.b === 'tunnel' || s.a === 'tunnel' && sx - s.x0 < 120 || s.b === 'station' || (s.b === 'river' && sx - s.x0 > 60)) return;
    mast(B, sx, L);
  });
  // the station: name boards, benches, vending machines and people waiting
  B.slots(200, 120, 561, (i, sx) => {
    const s = L.segAt(sx);
    if (s.b !== 'station') return;
    const pf = L.gy - 30;
    if (i % 3 === 0) { const nb = nameBoard(); B.blit(nb, sx + 40, L.hz - 82); B.vline(sx + 48, L.hz - 92, L.hz - 82, pk('#5a5e66')); B.vline(sx + 128, L.hz - 92, L.hz - 82, pk('#5a5e66')); }
    else if (i % 3 === 1) { // bench and vending machines
      B.rect(sx + 30, pf - 7, 30, 2, pk('#3a9a8a')); B.rect(sx + 30, pf - 12, 30, 2, pk('#3a9a8a')); B.vline(sx + 32, pf - 5, pf - 1, BLACK); B.vline(sx + 57, pf - 5, pf - 1, BLACK);
      for (let k = 0; k < 2; k++) { const vx = sx + 120 + k * 13; B.rect(vx, pf - 26, 12, 26, pk(k ? '#e8403a' : '#2a6ad8')); B.rect(vx + 1, pf - 25, 10, 11, emit('#f4f8ff')); for (let q = 0; q < 4; q++) B.set(vx + 2 + q * 2, pf - 22, emit(['#ff6a5a', '#5ab0ff', '#ffd050', '#7ae07a'][q])); }
    } else { // clock
      B.ellipse(sx + 100, L.hz - 70, 8, 8, WHITE); B.ellipse(sx + 100, L.hz - 70, 6, 6, pk('#f8f8f4')); B.vline(sx + 100, L.hz - 75, L.hz - 70, BLACK); B.hline(sx + 100, sx + 104, L.hz - 70, BLACK);
    }
    for (let k = 0; k < 4; k++) if (h1(i * 4 + k, 562) < 0.75) person(B, sx + 14 + k * 46 + Math.floor(h1(i * 4 + k, 563) * 20), pf, i * 4 + k);
  });
}
