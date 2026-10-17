// Pixel-art signs, boards and posters painted with PixCanvas (64 texels/m is
// the house density; pass that to signPlane as width = pc.w / 64). Station
// boards, exit signs, car numbers, vending machine fronts, kiosk boards, and
// posters for the station and the shopping street.
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';

export const SIGN_TPM = 64;
const INK = '#2a1828';

// JR-style station name board: big hiragana, kanji, romaji, line colour strip
// with the previous / next stations
export function stationBoard({ kana = 'こだままち', kanji = '木霊町', romaji = 'Kodama-machi', prev = 'みずはら', prevR = 'Mizuhara', next = '', nextR = '', line = '#1f8a7a', number = 'KD 14' } = {}) {
  const W = 128, H = 52;
  const p = new PixCanvas(W, H, 11);
  p.rect(0, 0, W, H, '#5a5a62');
  p.rect(1, 1, W - 2, H - 2, '#f6f6f2');
  p.rect(1, 1, W - 2, 2, '#ffffff');
  // station number badge
  p.rect(4, 4, 18, 13, line); p.rect(5, 5, 16, 11, '#ffffff');
  p.text(number.split(' ')[0], 13, 5, { font: `7px ${FONT.tiny}`, color: line, align: 'center' });
  p.text(number.split(' ')[1] || '', 13, 10, { font: `7px ${FONT.tiny}`, color: INK, align: 'center' });
  p.text(kana, W / 2 + 6, 3, { font: `16px ${FONT.round}`, color: '#1a1a22', align: 'center' });
  p.text(kanji, W / 2 + 6, 21, { font: `9px ${FONT.ui}`, color: '#2a2a32', align: 'center' });
  p.text(romaji, W / 2 + 6, 31, { font: `7px ${FONT.small}`, color: '#3a3a44', align: 'center' });
  // line strip with arrows
  p.rect(1, 40, W - 2, 6, line);
  p.rect(1, 40, W - 2, 1, lighten(line, 0.3));
  for (let i = 0; i < 3; i++) p.px(W / 2 - 1 + i, 42 + (i % 2), '#ffffff');
  if (prev) { p.poly([[3, 43], [7, 40], [7, 46]], '#ffffff'); p.text(prev, 10, 47, { font: `7px ${FONT.tiny}`, color: INK }); }
  if (next) { p.poly([[W - 4, 43], [W - 8, 40], [W - 8, 46]], '#ffffff'); p.text(next, W - 10, 47, { font: `7px ${FONT.tiny}`, color: INK, align: 'right' }); }
  else p.text('終点 terminus', W - 4, 47, { font: `7px ${FONT.tiny}`, color: '#8a3a2a', align: 'right' });
  if (prevR) p.text(prevR, 38, 47, { font: `7px ${FONT.tiny}`, color: '#6a6a74' });
  p.rect(0, H - 1, W, 1, '#3a3a42');
  return p;
}

// yellow exit / transfer sign with an arrow (dir: -1 left, 1 right, 0 down)
export function exitSign({ ja = '出口', en = 'Exit', sub = '木霊銀座・バス', dir = 1, w = 96 } = {}) {
  const H = 26, W = w;
  const p = new PixCanvas(W, H, 12);
  p.rect(0, 0, W, H, '#2a2a30');
  p.rect(1, 1, W - 2, H - 2, '#ffd23a');
  p.rect(1, 1, W - 2, 1, '#ffe88a');
  // arrow
  const ax = dir < 0 ? 8 : dir > 0 ? W - 10 : W - 10;
  if (dir === 0) { p.rect(ax - 2, 5, 4, 9, INK); p.poly([[ax - 5, 13], [ax + 5, 13], [ax, 19]], INK); }
  else { p.rect(ax - 6 * dir - (dir < 0 ? 0 : 0), 11, 9, 4, INK); p.poly([[ax + 4 * dir, 13], [ax - 1 * dir, 7], [ax - 1 * dir, 19]], INK); }
  const tx0 = dir < 0 ? 20 : 6;
  p.text(ja, tx0, 3, { font: `12px ${FONT.bold}`, color: INK });
  p.text(en, tx0 + 30, 5, { font: `9px ${FONT.ui}`, color: INK });
  if (sub) p.text(sub, tx0, 17, { font: `7px ${FONT.tiny}`, color: '#5a4a1a' });
  return p;
}

// round "car number" plate (号車) or platform number
export function numberPlate(n, { color = '#1f8a7a', label = '号車' } = {}) {
  const p = new PixCanvas(24, 28, 13);
  p.circle(12, 11, 11, '#3a3a42'); p.circle(12, 11, 10, '#ffffff'); p.circle(12, 11, 8, color);
  p.text(String(n), 12, 5, { font: `11px ${FONT.bold}`, color: '#ffffff', align: 'center' });
  p.text(label, 12, 21, { font: `7px ${FONT.tiny}`, color: '#2a2a32', align: 'center' });
  return p;
}

// vending machine front (drink display + buttons + coin slot + flap)
const DRINKS = [
  ['#e8443a', '#ffffff'], ['#3a8ad8', '#ffffff'], ['#f0c040', '#7a4a1a'], ['#6ab04a', '#ffffff'], ['#2a2a30', '#d8a040'],
  ['#f4f0e8', '#3a8ad8'], ['#c87a3a', '#fff0d0'], ['#ff8ab0', '#ffffff'], ['#5a3a2a', '#f0d8a0'], ['#3ac8c8', '#ffffff'],
  ['#8a5ac8', '#ffe060'], ['#e8e0c8', '#4a8a3a'],
];
export function vendingFront({ brand = 'Pocori', color = '#2a7ad8', seed = 1, w = 56, h = 112, hot = 2 } = {}) {
  const p = new PixCanvas(w, h, 40 + seed);
  const body = color, bodyD = darken(color, 0.3), bodyL = lighten(color, 0.25);
  p.rect(0, 0, w, h, bodyD);
  p.rect(1, 1, w - 2, h - 2, body);
  p.rect(1, 1, w - 2, 1, bodyL);
  // brand header
  p.rect(3, 3, w - 6, 9, '#ffffff');
  p.text(brand, w / 2, 4, { font: `8px ${FONT.pop}`, color: body, align: 'center' });
  // display window (glows)
  const dx = 3, dy = 14, dw = w - 6, dh = 58;
  p.rect(dx, dy, dw, dh, '#e8f2f8');
  p.rect(dx, dy, dw, 1, '#ffffff');
  const rows = 3, cols = 6;
  for (let r = 0; r < rows; r++) {
    const ry = dy + 3 + r * 19;
    p.rect(dx + 1, ry + 14, dw - 2, 1, '#9aa8b8');
    for (let c = 0; c < cols; c++) {
      const [can, lab] = DRINKS[(seed * 7 + r * cols + c * 5) % DRINKS.length];
      const cx = dx + 2 + c * Math.floor((dw - 4) / cols);
      const bottle = (r + c + seed) % 3 === 0;
      if (bottle) { p.rect(cx + 2, ry + 1, 2, 2, '#f4f4f4'); p.rect(cx + 1, ry + 3, 4, 10, can); p.rect(cx + 1, ry + 6, 4, 3, lab); p.px(cx + 1, ry + 3, lighten(can, 0.4)); }
      else { p.rect(cx + 1, ry + 4, 5, 9, can); p.rect(cx + 1, ry + 7, 5, 3, lab); p.rect(cx + 1, ry + 4, 5, 1, '#d8dce0'); p.px(cx + 1, ry + 5, lighten(can, 0.5)); }
      // price tag + hot/cold
      const hotOne = r === rows - 1 && c < hot;
      p.rect(cx, ry + 15, 6, 2, hotOne ? '#e8443a' : '#3a8ad8');
      p.px(cx + 5, ry + 16, '#ffffff');
    }
  }
  // buttons strip + coin slot + note slot
  p.rect(3, 74, w - 6, 3, '#d8dce0');
  for (let i = 0; i < 6; i++) p.rect(5 + i * 8, 75, 3, 1, '#4ac84a');
  p.rect(w - 14, 80, 10, 14, '#c8ccd4'); p.rect(w - 12, 82, 2, 4, '#2a2a30'); p.rect(w - 9, 82, 4, 1, '#2a2a30');
  p.rect(w - 12, 89, 6, 2, '#ff6a3a'); // LED price display
  p.text('¥130', w - 12, 88, { font: `7px ${FONT.tiny}`, color: '#ff8a4a' });
  // ad panel
  p.rect(4, 80, w - 20, 14, lighten(color, 0.45));
  p.text('つめた〜い', 5, 81, { font: `7px ${FONT.tiny}`, color: '#2a6ab0' });
  p.text('あったか〜い', 5, 88, { font: `7px ${FONT.tiny}`, color: '#d8443a' });
  // pickup flap
  p.rect(6, h - 16, w - 12, 10, '#1a1a22'); p.rect(6, h - 16, w - 12, 2, '#3a3a44');
  p.text('とりだしぐち', w / 2, h - 13, { font: `7px ${FONT.tiny}`, color: '#8a8a94', align: 'center' });
  return p;
}

// the station kiosk header ("KodaDays")
export function kioskBoard() {
  const p = new PixCanvas(110, 18, 14);
  p.rect(0, 0, 110, 18, '#f6f6f2'); p.rect(0, 15, 110, 3, '#1f8a7a'); p.rect(0, 0, 110, 1, '#ffffff');
  p.text('KodaDays', 8, 2, { font: `12px ${FONT.bold}`, color: '#1f8a7a' });
  p.text('コダデイズ', 102, 4, { font: `7px ${FONT.tiny}`, color: '#3a3a44', align: 'right' });
  return p;
}

// posters: 'travel' (a temple + autumn maple), 'manners' (a cute raccoon dog
// asking you not to rush onto trains), 'festival' (faded Kodama Ginza summer
// festival from years ago), 'gacha' (Kodamaya's old poster)
export function poster(kind = 'travel', seed = 1) {
  const W = 36, H = 50;
  const p = new PixCanvas(W, H, 50 + seed);
  if (kind === 'travel') {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#f8d8a0', '#e88a5a', y / H));
    p.circle(26, 12, 6, '#fff4d8');
    // mountains + temple pagoda
    p.poly([[0, 34], [10, 22], [20, 32], [28, 24], [36, 34], [36, 50], [0, 50]], '#a85a5a');
    p.poly([[0, 40], [14, 32], [36, 42], [36, 50], [0, 50]], '#7a3a4a');
    for (let i = 0; i < 4; i++) { const y = 20 + i * 5, hw = 7 - i; p.rect(14 - hw, y, hw * 2 + 4, 1, '#3a1a28'); p.rect(15 - hw + 2, y + 1, hw * 2, 4, '#c84a3a'); }
    p.rect(15, 14, 2, 6, '#3a1a28');
    for (let i = 0; i < 18; i++) p.px((i * 13) % W, 36 + (i * 7) % 12, i % 2 ? '#e8443a' : '#ff9a3a');
    p.text('秋の京都', W / 2, 2, { font: `9px ${FONT.brush}`, color: '#ffffff', align: 'center', outline: '#7a2a2a' });
    p.text('AUTUMN KYOTO', W / 2, 43, { font: `7px ${FONT.tiny}`, color: '#fff4d8', align: 'center' });
  } else if (kind === 'manners') {
    p.rect(0, 0, W, H, '#e8f4f0'); p.rect(0, 0, W, 8, '#1f8a7a');
    p.text('マナー', W / 2, 1, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
    // tanuki station staff waving "stop"
    p.circle(18, 22, 8, '#8a6a4a'); p.ellipse(18, 25, 6, 4, '#d8c4a8');
    p.ellipse(14, 21, 3, 2.5, '#3a2a20'); p.ellipse(22, 21, 3, 2.5, '#3a2a20');
    p.px(14, 21, '#ffffff'); p.px(22, 21, '#ffffff'); p.px(18, 25, '#2a1a10');
    p.rect(11, 12, 14, 3, '#1f8a7a'); p.rect(13, 10, 10, 2, '#1f8a7a');
    p.rect(12, 30, 12, 9, '#1f8a7a'); p.rect(25, 26, 5, 5, '#ffffff'); p.ring(27, 28, 3, '#e8443a');
    p.text('かけこみ', W / 2, 40, { font: `7px ${FONT.tiny}`, color: '#d8443a', align: 'center' });
    p.text('ダメ!', W / 2, 44, { font: `7px ${FONT.tiny}`, color: '#2a2a32', align: 'center' });
  } else if (kind === 'festival') {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#2a2a5a', '#5a3a6a', y / H));
    for (let i = 0; i < 5; i++) { const cx = 6 + i * 6, cy = 10 + (i % 2) * 3; p.ellipse(cx, cy, 2.5, 3, '#ff8a4a'); p.px(cx, cy - 3, INK); p.hline(cx - 1, cx + 1, cy, '#ffd060'); }
    p.circle(18, 28, 8, '#ff6a8a'); p.circle(18, 28, 5, '#ffd060'); for (let a = 0; a < 12; a++) p.px(18 + Math.round(Math.cos(a / 2) * 11), 28 + Math.round(Math.sin(a / 2) * 11), '#ffe0f0');
    p.text('木霊銀座', W / 2, 38, { font: `9px ${FONT.brush}`, color: '#ffe8c0', align: 'center' });
    p.text('夏祭り', W / 2, 46, { font: `7px ${FONT.tiny}`, color: '#ffd060', align: 'center' });
    // faded / sun-bleached
    p.scatter(0, 0, W, H, '#c8b8a8', 0.12);
  } else {
    p.rect(0, 0, W, H, '#fff3dc'); p.rect(0, 0, W, 10, '#e8443a');
    p.text('ガチャ', W / 2, 1, { font: `9px ${FONT.pop}`, color: '#fff3dc', align: 'center' });
    p.circle(18, 26, 9, '#2a1828'); p.circle(18, 26, 8, '#fff6ea'); p.ellipse(18, 22, 8, 5, '#ff6a5a'); p.rect(10, 25, 17, 1, '#2a1828');
    p.text('木霊屋', W / 2, 38, { font: `9px ${FONT.bold}`, color: '#2a1828', align: 'center' });
  }
  p.frame(0, 0, W, H, '#3a2a30');
  return p;
}

// clock face (hands drawn by the caller each minute)
export function clockFace(h = 3, m = 24) {
  const p = new PixCanvas(24, 24, 60);
  p.circle(12, 12, 11, '#2a2a30'); p.circle(12, 12, 10, '#ffffff');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.px(12 + Math.round(Math.sin(a) * 8.5), 12 - Math.round(Math.cos(a) * 8.5), i % 3 ? '#8a8a94' : '#2a2a30'); }
  const ah = ((h % 12) + m / 60) / 12 * Math.PI * 2, am = m / 60 * Math.PI * 2;
  p.line(12, 12, 12 + Math.round(Math.sin(ah) * 5), 12 - Math.round(Math.cos(ah) * 5), '#2a2a30');
  p.line(12, 12, 12 + Math.round(Math.sin(am) * 8), 12 - Math.round(Math.cos(am) * 8), '#2a2a30');
  p.px(12, 12, '#e8443a');
  return p;
}

// Grandpa's hand-made welcome sign: cardboard, crayon letters, a turtle doodle
export function welcomeSign() {
  const W = 52, H = 34;
  const p = new PixCanvas(W, H, 70);
  p.rect(0, 0, W, H, '#c89a5a');
  p.noiseFill(['#b8884a', '#c89a5a', '#d4a868'], { scale: 0.3 });
  p.frame(0, 0, W, H, '#8a6232');
  // crayon text (slightly wobbly: draw each kana separately)
  const kana = ['ま', 'も', 'る'];
  kana.forEach((k, i) => p.text(k, 7 + i * 12, 3 + (i % 2), { font: `12px ${FONT.cute}`, color: ['#e8443a', '#2a6ab0', '#3a8a3a'][i] }));
  p.text('!!', 43, 4, { font: `11px ${FONT.cute}`, color: '#e8443a' });
  // the turtle doodle
  p.ellipse(16, 25, 7, 4.5, '#3a8a3a'); p.ellipse(16, 24, 5, 3, '#7ac85a');
  p.hline(12, 20, 24, '#3a8a3a'); p.vline(16, 21, 27, '#3a8a3a');
  p.circle(25, 24, 3, '#7ac85a'); p.px(26, 23, '#2a1828');
  p.px(11, 29, '#3a8a3a'); p.px(21, 29, '#3a8a3a');
  // a heart and "welcome"
  p.circle(34, 23, 2, '#ff6a8a'); p.circle(37, 23, 2, '#ff6a8a'); p.poly([[32, 24], [39, 24], [35.5, 28]], '#ff6a8a');
  p.text('ようこそ', 44, 26, { font: `7px ${FONT.tiny}`, color: '#5a3a1a', align: 'center' });
  return p;
}
