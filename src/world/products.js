// Product art for every shelf in town: cute animal mascots, and the packaging
// they live on — omiyage boxes, ekiben lids, snack bags, drink labels, cup
// noodles, candy — painted in pixels at ~128 texels per metre so a box on a
// shelf reads at gameplay zoom. ProductBatch turns any number of them into
// real little 3D boxes (front faces from one atlas, coloured sides) in one mesh.
//
//   mascot(p, 'tanuki', cx, cy, r)
//   const B = new ProductBatch(); B.box(omiyage('manju'), x, y, z, w, h, d); scene.add(B.build());
import * as THREE from 'three';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';
import { litMat } from '../core/materials.js';

export const PTPM = 128; // texels per metre for product fronts

// ---------------------------------------------------------------- mascots
export const MASCOTS = {
  tanuki: { fur: '#b08050', light: '#f4e0bc', ear: 'round', earIn: '#4a3628', mask: '#5a4030' },
  cat: { fur: '#f4a552', light: '#fff0d4', ear: 'tri', earIn: '#ffb8a8', stripes: '#d8783a' },
  shiba: { fur: '#e8a050', light: '#fff6e4', ear: 'tri', earIn: '#ffd8b8', cheeks: true },
  turtle: { fur: '#94c26c', light: '#dcecaa', ear: 'none', stripe: '#e0d870' },
  chick: { fur: '#ffd848', light: '#fff4a8', ear: 'tuft', beak: '#ff9a2a' },
  bear: { fur: '#8e5e3c', light: '#e0b890', ear: 'round', earIn: '#d8a078' },
  rabbit: { fur: '#fffcf8', light: '#ffe8ee', ear: 'long', earIn: '#ffb8c8' },
  frog: { fur: '#72c450', light: '#d4f4a8', ear: 'frog' },
  fox: { fur: '#f28a3c', light: '#fff4e4', ear: 'tri', earIn: '#3a2a22' },
  panda: { fur: '#ffffff', light: '#ffffff', ear: 'round', earIn: '#2a2a30', patches: '#2a2a30' },
  penguin: { fur: '#2e3e60', light: '#ffffff', ear: 'none', beak: '#ffb030' },
  octopus: { fur: '#ff7a80', light: '#ffc4c4', ear: 'none', tentacles: true },
  seal: { fur: '#e4eaf0', light: '#ffffff', ear: 'none', whisk: true },
  hamster: { fur: '#f0b878', light: '#fff4e0', ear: 'round', earIn: '#ffb8a8', cheeks: true },
};
// a chibi face of radius r centred at (cx, cy); mood: 'smile' | 'wink' | 'open' | 'sleep'
export function mascot(p, kind, cx, cy, r, { mood = 'smile', outline = true } = {}) {
  const M = MASCOTS[kind] || MASCOTS.cat;
  const O = darken(M.fur === '#ffffff' || M.fur === '#fffcf8' ? '#9aa0b0' : M.fur, 0.55);
  const R = Math.max(3, r);
  // ears behind the head
  const ear = (side) => {
    const ex = cx + side * R * 0.62, ey = cy - R * 0.72;
    if (M.ear === 'tri') { p.poly([[ex - R * 0.38, ey + R * 0.28], [ex + R * 0.38, ey + R * 0.28], [ex + side * R * 0.08, ey - R * 0.5]], outline ? O : M.fur); p.poly([[ex - R * 0.26, ey + R * 0.22], [ex + R * 0.26, ey + R * 0.22], [ex + side * R * 0.06, ey - R * 0.34]], M.fur); if (R > 6) p.poly([[ex - R * 0.12, ey + R * 0.16], [ex + R * 0.12, ey + R * 0.16], [ex + side * R * 0.05, ey - R * 0.16]], M.earIn); }
    else if (M.ear === 'round') { p.circle(ex, ey + R * 0.08, R * 0.34 + 1, outline ? O : M.fur); p.circle(ex, ey + R * 0.08, R * 0.34, M.fur); if (R > 5) p.circle(ex, ey + R * 0.1, R * 0.18, M.earIn || M.light); }
    else if (M.ear === 'long') { p.ellipse(ex - side * R * 0.15, ey - R * 0.5, R * 0.22 + 1, R * 0.7 + 1, outline ? O : M.fur); p.ellipse(ex - side * R * 0.15, ey - R * 0.5, R * 0.22, R * 0.7, M.fur); p.ellipse(ex - side * R * 0.15, ey - R * 0.45, R * 0.1, R * 0.5, M.earIn); }
    else if (M.ear === 'tuft' && side > 0) { p.poly([[cx - 1, cy - R + 1], [cx + R * 0.3, cy - R * 1.35], [cx + 1, cy - R * 0.85]], M.fur); }
    else if (M.ear === 'frog') { p.circle(ex * 0.9 + cx * 0.1, cy - R * 0.62, R * 0.36 + 1, outline ? O : M.fur); p.circle(ex * 0.9 + cx * 0.1, cy - R * 0.62, R * 0.36, M.fur); p.circle(ex * 0.9 + cx * 0.1, cy - R * 0.62, R * 0.2, '#ffffff'); p.circle(ex * 0.9 + cx * 0.1 + side, cy - R * 0.6, Math.max(1, R * 0.1), '#1e1820'); }
  };
  ear(-1); ear(1);
  // head
  if (outline) p.ellipse(cx, cy, R + 1, R * 0.9 + 1, O);
  p.ellipse(cx, cy, R, R * 0.9, M.fur);
  // light muzzle / face
  p.ellipse(cx, cy + R * 0.28, R * 0.62, R * 0.46, M.light);
  if (M.mask) { p.ellipse(cx - R * 0.42, cy + R * 0.02, R * 0.3, R * 0.22, M.mask); p.ellipse(cx + R * 0.42, cy + R * 0.02, R * 0.3, R * 0.22, M.mask); }
  if (M.patches) { p.ellipse(cx - R * 0.4, cy, R * 0.24, R * 0.3, M.patches); p.ellipse(cx + R * 0.4, cy, R * 0.24, R * 0.3, M.patches); }
  if (M.stripes) for (const dx of [-0.2, 0, 0.2]) p.rect(cx + dx * R - 0.5, cy - R * 0.86, 1, R * 0.3, M.stripes);
  if (M.stripe) p.ellipse(cx, cy - R * 0.55, R * 0.5, R * 0.12, M.stripe);
  // eyes
  const ey = cy - R * 0.02 + (M.mask ? 0 : 0), es = Math.max(1, Math.round(R * 0.13));
  for (const side of [-1, 1]) {
    const ex = Math.round(cx + side * R * 0.38);
    if (mood === 'sleep' || (mood === 'wink' && side > 0)) { p.rect(ex - es, ey, es * 2 + 1, 1, '#1e1820'); continue; }
    if (M.patches || M.mask) { p.rect(ex - es + 1, ey - es, es * 2 - 1, es * 2, '#1e1820'); p.px(ex, ey - es, '#ffffff'); continue; }
    p.rect(ex - Math.floor(es / 2), ey - es, es + (R > 9 ? 1 : 0), es * 2, '#1e1820');
    if (R > 6) p.px(ex - Math.floor(es / 2), ey - es, '#ffffff');
  }
  // blush
  if (R > 4) for (const side of [-1, 1]) p.rect(cx + side * R * 0.62 - 1, cy + R * 0.22, Math.max(2, R * 0.2), 1, '#ff8a9a');
  // nose / mouth / beak
  if (M.beak) p.poly([[cx - R * 0.18, cy + R * 0.18], [cx + R * 0.18, cy + R * 0.18], [cx, cy + R * 0.42]], M.beak);
  else {
    p.rect(cx - 0.5, cy + R * 0.16, Math.max(1, R * 0.14), 1, '#4a2a2a');
    if (mood === 'open') p.ellipse(cx, cy + R * 0.42, R * 0.16, R * 0.14, '#c8384a');
    else if (R > 6) { p.px(cx - R * 0.14, cy + R * 0.34, '#4a2a2a'); p.px(cx + R * 0.14, cy + R * 0.34, '#4a2a2a'); p.px(cx, cy + R * 0.3, '#4a2a2a'); }
  }
  if (M.whisk) for (const side of [-1, 1]) { p.rect(cx + side * R * 0.5, cy + R * 0.28, R * 0.3, 1, '#9aa0b0'); }
  if (M.tentacles) for (let k = -2; k <= 2; k++) p.ellipse(cx + k * R * 0.32, cy + R * 0.92, R * 0.14, R * 0.2, M.fur);
}

// ---------------------------------------------------------------- helpers
const TXT = (p, s, x, y, size, color, o = {}) => p.text(s, x, y, { font: `${size}px ${o.font || FONT.bold}`, color, align: o.align || 'center', outline: o.outline, maxWidth: o.maxWidth ?? p.w - 4 });
function stripes(p, x, y, w, h, a, b, step = 3) { for (let i = 0; i < w; i++) p.vline(x + i, y, y + h - 1, Math.floor(i / step) % 2 ? a : b); }
function dots(p, x, y, w, h, bg, c, step = 4) { p.rect(x, y, w, h, bg); for (let yy = 0; yy < h; yy += step) for (let xx = (yy / step) % 2 ? step / 2 : 0; xx < w; xx += step) p.px(x + xx, y + yy, c); }
function seigaiha(p, x, y, w, h, bg, c) { p.rect(x, y, w, h, bg); for (let yy = 0; yy < h + 4; yy += 4) for (let xx = (yy / 4) % 2 ? 4 : 0; xx < w + 8; xx += 8) p.ring(x + xx, y + yy, 3, c); }
function frameBox(p, w, h, edge) { p.frame(0, 0, w, h, edge); p.rect(1, 1, w - 2, 1, lighten(edge, 0.5)); }

// ---------------------------------------------------------------- omiyage: souvenir boxes (front faces)
export const OMIYAGE = ['manju', 'sable', 'senbei', 'tea', 'pudding', 'wasabi', 'eel', 'matcha', 'castella', 'mikan'];
export function omiyage(kind = 'manju', seed = 1) {
  const W = 40, H = 26;
  const p = new PixCanvas(W, H, 900 + seed);
  switch (kind) {
    case 'manju': { // こだま饅頭: a tanuki with steamed buns on cream washi
      dots(p, 0, 0, W, H, '#fbf2dc', '#f0dcb4');
      p.rect(0, 0, W, 5, '#c83a32'); p.rect(0, H - 4, W, 4, '#c83a32');
      TXT(p, 'こだま饅頭', W / 2 + 6, 5, 7, '#3a2418', { font: FONT.small });
      for (const [x, y] of [[20, 18], [27, 18], [34, 18]]) { p.ellipse(x, y, 3.4, 2.6, '#e8c890'); p.ellipse(x - 1, y - 1, 1.6, 1, '#fff2d8'); p.px(x, y, '#a8683a'); }
      mascot(p, 'tanuki', 8, 15, 6);
      break;
    }
    case 'sable': { // かめサブレ: turtle-shaped butter cookies, a green box
      p.rect(0, 0, W, H, '#5aa860'); stripes(p, 0, 0, W, 4, '#4a9450', '#68b46c', 2);
      p.rrect(14, 7, 24, 15, 3, '#fff6e0');
      for (const [x, y] of [[20, 14], [30, 14]]) { p.ellipse(x, y, 4, 3, '#d8a04a'); p.ellipse(x, y, 2.6, 2, '#e8b860'); p.px(x + 4, y, '#d8a04a'); }
      TXT(p, 'かめサブレ', 26, 1, 7, '#ffffff', { font: FONT.small, outline: '#2a5a2e' });
      mascot(p, 'turtle', 7, 16, 6, { mood: 'open' });
      break;
    }
    case 'senbei': { // たぬきせんべい: rice crackers, kraft paper and a red seal
      p.rect(0, 0, W, H, '#c8a070'); p.scatter(0, 0, W, H, '#b8905e', 0.15);
      p.rect(24, 0, 10, H, '#2a2a34'); TXT(p, 'せんべい', 29, 2, 6, '#f0d8a0', { font: FONT.tiny });
      for (let k = 0; k < 3; k++) { p.circle(6 + k * 7, 19, 3.6, '#a86a30'); p.circle(6 + k * 7, 19, 2.6, '#c8843a'); p.px(5 + k * 7, 18, '#3a2a20'); }
      p.circle(36, 6, 3, '#d83a32');
      mascot(p, 'tanuki', 12, 8, 5, { mood: 'wink' });
      break;
    }
    case 'tea': { // 静岡茶: a tin with Fuji, tea fields and a cat
      p.rect(0, 0, W, H, '#2a6a44');
      p.poly([[4, 18], [16, 4], [28, 18]], '#5a7ab8'); p.poly([[11, 10], [16, 4], [21, 10]], '#ffffff');
      for (let k = 0; k < 3; k++) p.rect(0, 18 + k * 3, W, 2, k % 2 ? '#7ac050' : '#5aa040');
      p.rect(28, 2, 10, 22, '#f4ecd0'); TXT(p, '静岡茶', 33, 3, 6, '#2a4a2a', { font: FONT.tiny });
      mascot(p, 'cat', 33, 17, 4);
      break;
    }
    case 'pudding': { // 富士山プリン: a chick and a jiggly pudding with a caramel peak
      p.rect(0, 0, W, H, '#fff2a8'); stripes(p, 0, H - 5, W, 5, '#ffd84a', '#fff2a8', 3);
      p.poly([[20, 20], [24, 8], [28, 8], [32, 20]], '#ffe07a'); p.poly([[24, 8], [28, 8], [29, 11], [23, 11]], '#a85a24');
      TXT(p, '富士山プリン', 21, 1, 6, '#d8743a', { font: FONT.small });
      mascot(p, 'chick', 9, 15, 6);
      break;
    }
    case 'wasabi': { // わさび漬け: frog on a bamboo-leaf green
      p.rect(0, 0, W, H, '#e8f0d0'); for (let k = 0; k < 4; k++) p.poly([[k * 11, H], [k * 11 + 5, 10], [k * 11 + 9, H]], '#9ac860');
      p.rect(18, 4, 20, 9, '#ffffff'); TXT(p, 'わさび漬', 28, 5, 6, '#3a6a2a', { font: FONT.tiny });
      mascot(p, 'frog', 9, 12, 6, { mood: 'open' });
      break;
    }
    case 'eel': { // うなぎの夜: a night-blue box with a golden eel pie
      p.rect(0, 0, W, H, '#1e2848'); p.scatter(0, 0, W, 12, '#ffffff', 0.04);
      p.circle(33, 6, 3, '#ffe8a0');
      for (let k = 0; k < 3; k++) p.rrect(14 + k * 8, 14, 7, 9, 1, '#d8a050');
      TXT(p, 'うなぎの夜', 18, 2, 7, '#ffd870', { font: FONT.small });
      mascot(p, 'seal', 6, 17, 5, { mood: 'sleep' });
      break;
    }
    case 'matcha': { // 抹茶チョコ: a panda with matcha chocolate squares
      seigaiha(p, 0, 0, W, H, '#7ab060', '#8ac470');
      p.rect(16, 3, 22, 20, '#fffaf0');
      for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) p.rect(18 + x * 6, 11 + y * 5, 5, 4, (x + y) % 2 ? '#5a9a40' : '#4a8a34');
      TXT(p, '抹茶チョコ', 27, 3, 6, '#3a6a2a', { font: FONT.tiny });
      mascot(p, 'panda', 8, 14, 6);
      break;
    }
    case 'castella': { // カステラ: a bear and a slice of sponge, yellow and brown
      p.rect(0, 0, W, H, '#ffe48a'); p.rect(0, 0, W, 6, '#8a4a2a');
      TXT(p, 'カステラ', 20, 0, 6, '#fff0c0', { font: FONT.tiny });
      p.rect(18, 12, 18, 9, '#f8c850'); p.rect(18, 12, 18, 2, '#8a4a24'); p.rect(18, 20, 18, 1, '#8a4a24');
      mascot(p, 'bear', 9, 16, 6);
      break;
    }
    default: { // みかんゼリー: mandarin jelly with a shiba
      p.rect(0, 0, W, H, '#ffb24a'); dots(p, 0, 0, W, 6, '#ff9a2a', '#ffd08a', 3);
      for (const x of [22, 30]) { p.circle(x, 16, 4.5, '#ff8a1a'); p.circle(x - 1, 15, 1.5, '#ffd08a'); p.rect(x, 11, 2, 1, '#4a8a3a'); }
      TXT(p, 'みかんゼリー', 22, 0, 6, '#ffffff', { font: FONT.tiny, outline: '#c8641a' });
      mascot(p, 'shiba', 8, 16, 6);
    }
  }
  frameBox(p, W, H, '#5a4030');
  return p;
}

// ---------------------------------------------------------------- ekiben: lunch boxes with paper wrappers (lids)
export const BENTOS = ['fuji', 'kodama', 'karaage', 'salmon', 'unagi', 'tai'];
export function bentoLid(kind = 'fuji', seed = 1) {
  const W = 36, H = 26;
  const p = new PixCanvas(W, H, 1000 + seed);
  const band = (bg, fg, title) => { p.rect(0, 9, W, 9, bg); TXT(p, title, W / 2, 10, 6, fg, { font: FONT.tiny }); };
  switch (kind) {
    case 'fuji': p.rect(0, 0, W, H, '#ffe8c8'); p.circle(28, 5, 4, '#e84a3a'); p.poly([[2, 22], [14, 6], [26, 22]], '#4a6ab0'); p.poly([[9, 13], [14, 6], [19, 13]], '#ffffff'); band('#c83a32', '#ffffff', '富士の朝'); break;
    case 'kodama': p.rect(0, 0, W, H, '#e8f0f8'); p.rect(2, 14, 30, 6, '#f4f2ea'); p.rect(2, 16, 30, 2, '#1e4a9a'); p.poly([[32, 14], [36, 18], [32, 20]], '#f4f2ea'); for (let x = 5; x < 30; x += 4) p.rect(x, 15, 2, 1, '#3a4a6a'); band('#1e4a9a', '#ffffff', 'こだま弁当'); p.rect(0, 9, W, 0, '#000'); mascot(p, 'turtle', 30, 5, 4); break;
    case 'karaage': p.rect(0, 0, W, H, '#fff4c0'); for (const [x, y] of [[7, 21], [13, 22], [10, 18]]) { p.circle(x, y, 3, '#c8782a'); p.px(x - 1, y - 1, '#e8a04a'); } band('#ff8a2a', '#ffffff', 'からあげ'); mascot(p, 'chick', 28, 5, 5, { mood: 'open' }); break;
    case 'salmon': p.rect(0, 0, W, H, '#dff0ff'); seigaiha(p, 0, 18, W, 8, '#7ab8e8', '#a8d8ff'); p.ellipse(10, 5, 7, 3, '#ff8a6a'); p.rect(6, 4, 8, 1, '#ffd0c0'); band('#2a6ab0', '#ffffff', 'さけ弁当'); mascot(p, 'bear', 29, 5, 4); break;
    case 'unagi': p.rect(0, 0, W, H, '#2a1e18'); p.rect(4, 19, 28, 5, '#8a4a20'); p.rect(4, 19, 28, 1, '#c8783a'); band('#d8a040', '#2a1e18', 'うなぎ飯'); mascot(p, 'seal', 30, 5, 4, { mood: 'sleep' }); break;
    default: p.rect(0, 0, W, H, '#fff0f0'); p.ellipse(18, 21, 10, 4, '#ff6a6a'); p.poly([[28, 21], [33, 18], [33, 24]], '#ff6a6a'); p.px(12, 20, '#2a2a2a'); band('#d83a5a', '#ffffff', '祝い鯛'); mascot(p, 'cat', 29, 5, 4); break;
  }
  p.rect(16, 0, 4, H, 'rgba(255,255,255,0.0)');
  frameBox(p, W, H, '#3a2a24');
  return p;
}

// ---------------------------------------------------------------- konbini snacks, drinks, cup noodles, candy
export const SNACKS = ['chips', 'pocky', 'umaibo', 'gummy', 'koala', 'onigiri', 'cupnoodle', 'karamucho'];
export function snack(kind = 'chips', seed = 1) {
  const W = 22, H = 28;
  const p = new PixCanvas(W, H, 1100 + seed);
  switch (kind) {
    case 'chips': { // a puffy bag: wavy chips, a hamster mascot, a crimped top
      p.rrect(1, 2, W - 2, H - 3, 3, '#ffd23a'); p.rect(1, 2, W - 2, 3, '#e8a820'); for (let x = 2; x < W - 2; x += 2) p.px(x, 2, '#c8901a');
      TXT(p, 'ポテト', W / 2, 5, 6, '#c83a32', { font: FONT.tiny, outline: '#ffffff' });
      for (const [x, y] of [[6, 22], [11, 23], [16, 21]]) { p.ellipse(x, y, 3, 2, '#f8e090'); p.px(x, y, '#d8a840'); }
      mascot(p, 'hamster', 11, 15, 4.5); break;
    }
    case 'pocky': { // a slim red box, sticks diagonal
      p.rect(3, 0, W - 6, H, '#d8302a'); p.rect(3, 0, W - 6, 4, '#a82420');
      for (let k = 0; k < 4; k++) p.line(5 + k * 3, 24, 9 + k * 3, 8, k % 2 ? '#6a3a1e' : '#e8c070');
      TXT(p, 'ポッキン', W / 2, 1, 5, '#ffffff', { font: FONT.tiny });
      break;
    }
    case 'umaibo': { // a long stick wrapper with a cat-faced character
      p.rect(7, 0, 8, H, '#ffd84a'); p.rect(7, 0, 8, 3, '#c83a3a'); p.rect(7, H - 3, 8, 3, '#c83a3a');
      mascot(p, 'cat', 11, 13, 3.6); TXT(p, 'うま', 11, 19, 5, '#c83a3a', { font: FONT.tiny }); break;
    }
    case 'gummy': { // a stand-up pouch of fruit gummies with a rabbit
      p.rrect(2, 3, W - 4, H - 4, 3, '#ff9ac0'); p.rect(2, 3, W - 4, 4, '#ff70a0');
      for (const [x, y, c] of [[6, 22, '#ff4a6a'], [11, 23, '#ffd040'], [16, 21, '#7ad04a']]) p.circle(x, y, 2.4, c);
      mascot(p, 'rabbit', 11, 14, 4); break;
    }
    case 'koala': { // hexagonal cookie box with a koala-ish bear
      p.rect(2, 4, W - 4, H - 6, '#f4ecd8'); p.rect(2, 4, W - 4, 5, '#3a8a5a');
      TXT(p, 'マーチ', W / 2, 4, 5, '#ffffff', { font: FONT.tiny });
      mascot(p, 'bear', 11, 17, 5); break;
    }
    case 'onigiri': { // a triangle rice ball in its film, nori band, a label
      p.poly([[W / 2, 3], [W - 2, H - 4], [2, H - 4]], '#f8f6f0'); p.rect(7, 14, 8, 10, '#1e2a22');
      p.rect(5, 6, 12, 5, '#e84a3a'); TXT(p, 'しゃけ', W / 2, 6, 5, '#ffffff', { font: FONT.tiny }); break;
    }
    case 'cupnoodle': { // a tall cup with a red band and a penguin
      p.poly([[3, 2], [W - 3, 2], [W - 5, H - 1], [5, H - 1]], '#fbfaf6'); p.rect(4, 8, W - 8, 6, '#d8302a');
      TXT(p, 'ヌードル', W / 2, 8, 5, '#ffffff', { font: FONT.tiny }); mascot(p, 'penguin', 11, 20, 4); break;
    }
    default: { // spicy chips: red-hot bag with an octopus
      p.rrect(1, 2, W - 2, H - 3, 3, '#e8302a'); p.rect(1, 2, W - 2, 3, '#a82018');
      for (let k = 0; k < 5; k++) p.poly([[3 + k * 4, 26], [5 + k * 4, 18], [7 + k * 4, 26]], '#ff8a2a');
      mascot(p, 'octopus', 11, 12, 4.5, { mood: 'open' }); TXT(p, 'からい!', W / 2, 2, 5, '#ffe040', { font: FONT.tiny });
    }
  }
  p.hardAlpha();
  return p;
}
export const DRINKS = ['greentea', 'water', 'cola', 'calpis', 'coffee', 'ramune', 'milktea', 'sports'];
export function drink(kind = 'greentea', seed = 1) {
  const W = 10, H = 26;
  const p = new PixCanvas(W, H, 1200 + seed);
  const bottle = (liquid, cap) => { p.rect(3, 0, 4, 3, cap); p.rect(2, 3, 6, 2, liquid); p.rrect(1, 5, 8, H - 5, 2, liquid); p.rect(2, 6, 1, H - 8, lighten(liquid, 0.4)); };
  const can = (col) => { p.rect(1, 6, 8, H - 6, col); p.rect(1, 6, 8, 1, '#c8ccd4'); p.rect(1, H - 1, 8, 1, '#a8acb4'); p.rect(2, 7, 1, H - 9, lighten(col, 0.4)); };
  switch (kind) {
    case 'greentea': bottle('#c8e090', '#3a8a3a'); p.rect(1, 11, 8, 8, '#2a7a3a'); p.rect(2, 13, 6, 3, '#f4ecd0'); break;
    case 'water': bottle('#d8f0ff', '#3a8ad8'); p.rect(1, 12, 8, 6, '#3a8ad8'); p.px(4, 14, '#ffffff'); p.px(5, 14, '#ffffff'); break;
    case 'cola': can('#d8302a'); p.rect(2, 13, 6, 2, '#ffffff'); break;
    case 'calpis': bottle('#f8f8ff', '#3a6ad8'); for (let y = 10; y < 20; y += 3) for (let x = 2; x < 8; x += 3) p.px(x, y, '#3a6ad8'); break;
    case 'coffee': can('#3a2a20'); p.rect(1, 12, 8, 4, '#d8a040'); p.px(4, 18, '#ffffff'); break;
    case 'ramune': p.rect(3, 0, 4, 3, '#d8302a'); p.rrect(1, 3, 8, H - 3, 3, '#a8e0f8'); p.circle(5, 8, 1.6, '#e8f8ff'); p.rect(1, 14, 8, 6, '#3a8ad8'); break;
    case 'milktea': bottle('#e8c8a0', '#a8583a'); p.rect(1, 11, 8, 8, '#f8f0e0'); mascot(p, 'cat', 5, 15, 2.6, { outline: false }); break;
    default: bottle('#a8d8ff', '#ffffff'); p.rect(1, 11, 8, 7, '#2a5ab0'); p.rect(1, 13, 8, 1, '#ffffff');
  }
  p.hardAlpha();
  return p;
}

// ---------------------------------------------------------------- ProductBatch: real little 3D boxes
// front faces sample a shared atlas; the other faces take a darker side colour.
export class ProductBatch {
  constructor({ tpm = PTPM, atlasW = 512 } = {}) {
    this.tpm = tpm;
    this.items = [];
    this.arts = new Map(); // canvas -> rect
    this.atlasW = atlasW;
  }
  // art: PixCanvas; position = bottom-centre of the box's front face; d = depth (m)
  box(art, x, y, z, { w = null, h = null, d = 0.08, yaw = 0, side = null, cutout = false } = {}) {
    const W = w ?? art.w / this.tpm, H = h ?? art.h / this.tpm;
    this.items.push({ art, x, y, z, w: W, h: H, d, yaw, side, cutout });
    return this;
  }
  build() {
    // pack arts into rows of an atlas
    const list = [...new Set(this.items.map((i) => i.art))];
    let x = 1, y = 1, rowH = 0;
    const AW = this.atlasW;
    for (const a of list) { if (x + a.w + 1 > AW) { x = 1; y += rowH + 1; rowH = 0; } this.arts.set(a, { x, y, w: a.w, h: a.h }); x += a.w + 1; rowH = Math.max(rowH, a.h); }
    const AH = 1 << Math.ceil(Math.log2(y + rowH + 2));
    const atlas = new PixCanvas(AW, AH, 7);
    for (const a of list) { const r = this.arts.get(a); atlas.x.drawImage(a.c, r.x, r.y); }
    const tex = new THREE.CanvasTexture(atlas.c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
    const pos = [], nor = [], uv = [], col = [], idxF = [], idxS = [];
    let vi = 0;
    const quad = (pts, n, uvs, c, into) => {
      for (let k = 0; k < 4; k++) { pos.push(...pts[k]); nor.push(...n); uv.push(...(uvs ? uvs[k] : [0, 0])); col.push(c.r, c.g, c.b); }
      into.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); vi += 4;
    };
    const white = new THREE.Color(1, 1, 1);
    for (const it of this.items) {
      const r = this.arts.get(it.art);
      const u0 = r.x / AW, u1 = (r.x + r.w) / AW, v1 = 1 - r.y / AH, v0 = 1 - (r.y + r.h) / AH;
      const cs = Math.cos(it.yaw), sn = Math.sin(it.yaw);
      const P = (lx, ly, lz) => [it.x + lx * cs + lz * sn, it.y + ly, it.z - lx * sn + lz * cs];
      const N = (nx, ny, nz) => [nx * cs + nz * sn, ny, -nx * sn + nz * cs];
      const hw = it.w / 2, h = it.h, d = it.d;
      // pick a side colour from the art's edge if none given
      let sc = it.side;
      if (sc == null) { const px = it.art.x.getImageData(Math.floor(it.art.w / 2), Math.floor(it.art.h / 2), 1, 1).data; sc = (px[0] << 16) | (px[1] << 8) | px[2]; }
      const side = new THREE.Color(sc).multiplyScalar(0.78), top = new THREE.Color(sc).multiplyScalar(0.95);
      quad([P(-hw, 0, 0), P(hw, 0, 0), P(hw, h, 0), P(-hw, h, 0)], N(0, 0, 1), [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], white, idxF);
      if (it.cutout) continue;
      quad([P(-hw, h, 0), P(hw, h, 0), P(hw, h, -d), P(-hw, h, -d)], N(0, 1, 0), null, top, idxS);
      quad([P(hw, 0, 0), P(hw, 0, -d), P(hw, h, -d), P(hw, h, 0)], N(1, 0, 0), null, side, idxS);
      quad([P(-hw, 0, -d), P(-hw, 0, 0), P(-hw, h, 0), P(-hw, h, -d)], N(-1, 0, 0), null, side, idxS);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex([...idxF, ...idxS]);
    g.addGroup(0, idxF.length, 0); g.addGroup(idxF.length, idxS.length, 1);
    const front = litMat({ map: tex, vertexColors: true, alphaTest: 0.5 });
    const sides = litMat({ vertexColors: true });
    const m = new THREE.Mesh(g, [front, sides]);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.atlas = atlas;
    return m;
  }
}
