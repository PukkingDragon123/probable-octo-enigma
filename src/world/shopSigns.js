// Pixel-art paint for Kodama Ginza: shop fascia boards, vertical signs, noren,
// chalk menu boards, the plastic-food sample case, the fish display on ice,
// Bendy's logo, the arcade gate sign, decorative manhole covers, posters and
// the printed stuff that clutters a real shotengai. 64 texels/m like signs.js.
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';

const INK = '#2a1828';

// ---------------------------------------------------------------- fascia board
// style: 'board' (painted wood / tin), 'lightbox' (white acrylic, glows), 'tin'
// (faded enamel), 'wood' (carved dark wood with gold letters)
export function fasciaSign({ ja = '', en = '', w = 220, h = 34, bg = '#f4ecd8', fg = INK, accent = '#d8443a', style = 'board', font = FONT.bold, size = 18, enFont = FONT.small, icon = null, seed = 1, fade = 0 } = {}) {
  const p = new PixCanvas(w, h, 300 + seed);
  if (style === 'wood') {
    p.rect(0, 0, w, h, '#3a2418');
    p.noiseFill(['#4a2e1e', '#3a2418', '#54362a'], { scale: 0.25, x0: 2, y0: 2, w: w - 4, h: h - 4 });
    for (let x = 6; x < w; x += 23) p.vline(x, 2, h - 3, '#2e1c12');
    p.frame(0, 0, w, h, '#24140c'); p.frame(2, 2, w - 4, h - 4, '#b8903a');
  } else {
    p.rect(0, 0, w, h, darken(bg, 0.35));
    p.rect(1, 1, w - 2, h - 2, bg);
    if (style === 'lightbox') { p.rect(1, 1, w - 2, 2, lighten(bg, 0.5)); p.rect(1, h - 3, w - 2, 2, darken(bg, 0.12)); }
    else { p.rect(1, 1, w - 2, 1, lighten(bg, 0.3)); p.rect(1, h - 2, w - 2, 1, darken(bg, 0.15)); }
    if (style === 'tin') { p.frame(3, 3, w - 6, h - 6, accent); p.scatter(1, 1, w - 2, h - 2, darken(bg, 0.1), 0.08); }
    else p.rect(1, h - 5, w - 2, 2, accent);
  }
  let tx = w / 2;
  if (icon) { const iw = icon(p, 6, Math.floor(h / 2)) || 26; tx = (w + iw + 6) / 2; }
  const jy = en ? Math.round(h * 0.12) : Math.round((h - size) / 2) - 1;
  p.text(ja, tx, jy, { font: `${size}px ${font}`, color: style === 'wood' ? '#f0c860' : fg, align: 'center', shadow: style === 'wood' ? { color: '#1a0c06' } : null, maxWidth: w - 12 - (icon ? 30 : 0) });
  if (en) p.text(en, tx, h - (style === 'wood' ? 12 : 13), { font: `7px ${enFont}`, color: style === 'wood' ? '#d8b878' : mix(fg, bg, 0.25), align: 'center' });
  if (fade > 0) {
    // sun-bleached: lift everything toward a pale tone, then a few paint chips
    p.x.globalAlpha = Math.min(0.6, fade * 2.2); p.rect(0, 0, w, h, mix(bg, '#efe6d4', 0.55)); p.x.globalAlpha = 1;
    for (let i = 0; i < w * h * fade * 0.01; i++) { const x = p.rnd() * w, y = p.rnd() * h; p.rect(x, y, 1 + Math.floor(p.rnd() * 3), 1, mix(bg, '#8a7a6a', 0.4)); }
    p.hardAlpha();
  }
  return p;
}

// vertical sign (tate-kanban): characters stacked top to bottom
export function verticalSign({ ja = '', bg = '#d8443a', fg = '#fff8e8', w = 22, font = FONT.bold, size = 15, frame = '#3a2a2a', seed = 2 } = {}) {
  const chars = [...ja];
  const h = 8 + chars.length * (size + 2);
  const p = new PixCanvas(w, h, 400 + seed);
  p.rect(0, 0, w, h, frame);
  p.rect(1, 1, w - 2, h - 2, bg);
  p.rect(1, 1, w - 2, 1, lighten(bg, 0.3));
  chars.forEach((ch, i) => p.text(ch, w / 2, 4 + i * (size + 2), { font: `${size}px ${font}`, color: fg, align: 'center' }));
  return p;
}

// noren: split cloth curtain over a doorway (panels separated by gaps)
export function noren({ text = '', bg = '#2a3a6a', fg = '#f4f0e8', w = 96, h = 44, panels = 3, font = FONT.brush, size = 16, seed = 3, mark = null } = {}) {
  const p = new PixCanvas(w, h, 500 + seed);
  const pw = Math.floor((w - (panels - 1) * 2) / panels);
  for (let i = 0; i < panels; i++) {
    const x = i * (pw + 2);
    p.rect(x, 0, pw, h, bg);
    p.rect(x, 0, pw, 3, darken(bg, 0.25)); // rod sleeve
    p.vline(x, 0, h - 1, darken(bg, 0.15));
    // hem + a slight wave at the bottom
    for (let k = 0; k < pw; k++) if ((k + i * 3) % 7 === 0) p.px(x + k, h - 1, 'rgba(0,0,0,0)');
  }
  p.x.clearRect(0, h - 1, w, 1);
  for (let i = 0; i < panels; i++) p.rect(i * (pw + 2), h - 2, pw, 1, darken(bg, 0.2));
  if (mark) mark(p, w / 2, h * 0.38);
  if (text) {
    const chars = [...text];
    chars.forEach((ch, i) => {
      const cx = (i + 0.5) * (w / chars.length);
      p.text(ch, cx, h * 0.3, { font: `${size}px ${font}`, color: fg, align: 'center' });
    });
  }
  return p;
}

// chalk A-frame menu board
export function menuBoard({ title = 'MENU', lines = [], w = 36, h = 48, seed = 4, doodle = 'cup' } = {}) {
  const p = new PixCanvas(w, h, 600 + seed);
  p.rect(0, 0, w, h, '#6a4a2a');
  p.rect(2, 2, w - 4, h - 4, '#2a3a32');
  p.scatter(2, 2, w - 4, h - 4, '#34463c', 0.25);
  p.rect(2, 2, w - 4, 1, '#8a6a42');
  p.text(title, w / 2, 4, { font: `8px ${FONT.cute}`, color: '#fff4c8', align: 'center' });
  p.hline(6, w - 7, 14, '#c8d8c8');
  lines.forEach((l, i) => {
    const [a, b] = Array.isArray(l) ? l : [l, ''];
    p.text(a, 4, 16 + i * 7, { font: `7px ${FONT.tiny}`, color: i % 2 ? '#ffd8e8' : '#f4f4e8' });
    if (b) p.text(b, w - 4, 16 + i * 7, { font: `7px ${FONT.tiny}`, color: '#ffe080', align: 'right' });
  });
  if (doodle === 'cup') { p.rect(w - 13, h - 12, 7, 6, '#f4f4e8'); p.ring(w - 5, h - 9, 2, '#f4f4e8'); p.px(w - 11, h - 15, '#c8c8c8'); p.px(w - 9, h - 16, '#c8c8c8'); }
  else if (doodle === 'fish') { p.ellipse(w - 11, h - 9, 5, 2.5, '#9ad8f0'); p.poly([[w - 6, h - 9], [w - 3, h - 12], [w - 3, h - 6]], '#9ad8f0'); p.px(w - 14, h - 10, INK); }
  else if (doodle === 'flower') { for (let a = 0; a < 5; a++) p.circle(w - 10 + Math.cos(a * 1.26) * 3, h - 10 + Math.sin(a * 1.26) * 3, 2, '#ff9ac8'); p.circle(w - 10, h - 10, 1.5, '#ffe060'); }
  return p;
}

// a row of plastic food samples on two shelves (kissaten window case)
export function sampleCase({ w = 120, h = 52, seed = 5 } = {}) {
  const p = new PixCanvas(w, h, 700 + seed);
  p.rect(0, 0, w, h, '#f8f0e0');
  for (let y = 0; y < h; y++) p.hline(0, w - 1, y, mix('#fff8ec', '#f0e4cc', y / h));
  const shelfY = [22, 47];
  for (const sy of shelfY) { p.rect(0, sy, w, 2, '#c8b898'); p.rect(0, sy + 2, w, 1, '#a89878'); }
  const items = [
    (x, y) => { p.ellipse(x, y, 9, 3, '#ffffff'); p.ellipse(x, y - 3, 7, 4, '#f8c838'); p.ellipse(x, y - 5, 5, 2, '#fadc60'); p.line(x - 4, y - 5, x + 3, y - 4, '#d8301a'); p.line(x - 3, y - 4, x + 4, y - 6, '#d8301a'); }, // omurice
    (x, y) => { p.ellipse(x, y, 8, 3, '#ffffff'); for (let k = 0; k < 3; k++) p.ellipse(x, y - 2 - k * 2.2, 6, 2, k % 2 ? '#d8a050' : '#e8b868'); p.rect(x - 2, y - 9, 4, 2, '#fff8c8'); p.px(x + 2, y - 10, '#c86a2a'); }, // pancakes
    (x, y) => { p.rect(x - 3, y - 12, 7, 12, '#58d870'); p.rect(x - 3, y - 12, 7, 2, '#a8f0b0'); p.circle(x, y - 14, 3, '#ffffff'); p.circle(x + 1, y - 17, 1.5, '#e83a3a'); p.vline(x + 3, y - 18, y - 12, '#ff6a8a'); p.rect(x - 4, y, 9, 1, '#d8d8d8'); }, // cream soda
    (x, y) => { p.ellipse(x, y, 9, 3, '#ffffff'); p.ellipse(x, y - 2, 7, 3, '#f0d8a0'); p.ellipse(x - 1, y - 3, 4, 2, '#c8401a'); p.px(x + 3, y - 4, '#3a8a3a'); }, // napolitan
    (x, y) => { p.ellipse(x, y, 9, 3, '#ffffff'); p.ellipse(x - 3, y - 2, 4, 2.5, '#fffaf0'); p.ellipse(x + 3, y - 2, 4, 2.5, '#a8682a'); p.px(x + 2, y - 3, '#d88a3a'); }, // curry rice
    (x, y) => { p.rect(x - 4, y - 8, 9, 8, '#7a4a2a'); p.rect(x - 4, y - 8, 9, 2, '#f4e8d8'); p.rect(x - 3, y - 5, 7, 1, '#f8d8a0'); p.px(x, y - 10, '#e83a3a'); }, // cake
    (x, y) => { p.rect(x - 3, y - 7, 7, 7, '#f4f4f0'); p.rect(x - 3, y - 7, 7, 2, '#5a3020'); p.ring(x + 4, y - 4, 2, '#f4f4f0'); p.ellipse(x, y, 6, 1.5, '#e8e8e8'); }, // coffee
    (x, y) => { p.rect(x - 5, y - 6, 11, 6, '#f8e0a0'); for (let k = 0; k < 3; k++) p.rect(x - 4 + k * 4, y - 6, 2, 6, '#58a838'); p.rect(x - 5, y - 6, 11, 1, '#e8c060'); }, // sandwiches
  ];
  let k = seed;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = 12 + i * 24, y = shelfY[row] - 1;
    items[k++ % items.length](x, y);
    // price card
    p.rect(x - 5, y + 3 - (row ? 0 : 0), 10, 0, '#fff');
    p.rect(x + 4, y - 4, 7, 4, '#ffffff'); p.frame(x + 4, y - 4, 7, 4, '#d8443a');
  }
  p.frame(0, 0, w, h, '#a89878');
  return p;
}

// fish on crushed ice for the fishmonger's slanted display (seen from above-front)
export function fishDisplay({ w = 200, h = 40, seed = 6 } = {}) {
  const p = new PixCanvas(w, h, 800 + seed);
  p.rect(0, 0, w, h, '#e8f4f8');
  p.scatter(0, 0, w, h, '#ffffff', 0.35); p.scatter(0, 0, w, h, '#c8e0ec', 0.2);
  const fish = [
    (x, y) => { p.ellipse(x, y, 11, 3.5, '#5a7a9a'); p.ellipse(x, y + 1, 10, 2, '#d8e4ec'); for (let k = -8; k < 8; k += 3) p.line(x + k, y - 3, x + k + 2, y - 1, '#2a3a5a'); p.poly([[x + 10, y], [x + 15, y - 4], [x + 15, y + 4]], '#4a6a8a'); p.px(x - 8, y - 1, INK); }, // saba
    (x, y) => { p.ellipse(x, y, 10, 5, '#e85a6a'); p.ellipse(x, y + 2, 8, 2.5, '#f8b8b8'); p.poly([[x + 9, y], [x + 14, y - 5], [x + 14, y + 5]], '#d84a5a'); p.px(x - 7, y - 1, INK); p.px(x - 7, y - 2, '#ffffff'); for (let k = -5; k < 6; k += 2) p.px(x + k, y - 3, '#ffd0d0'); }, // tai
    (x, y) => { p.rect(x - 9, y - 4, 18, 8, '#f87848'); for (let k = -8; k < 9; k += 3) p.vline(x + k, y - 4, y + 3, '#ffd0b0'); p.frame(x - 9, y - 4, 18, 8, '#e85a2a'); }, // salmon fillet
    (x, y) => { p.circle(x, y - 1, 5, '#a8486a'); p.circle(x - 1, y - 2, 2, '#c86a8a'); for (let k = 0; k < 6; k++) p.line(x - 5 + k * 2, y + 3, x - 7 + k * 3, y + 7, '#a8486a'); p.px(x - 2, y, '#fff'); }, // octopus
    (x, y) => { p.ellipse(x, y, 4, 9, '#f4f0e8'); p.poly([[x - 4, y - 7], [x, y - 12], [x + 4, y - 7]], '#f4f0e8'); for (let k = 0; k < 4; k++) p.vline(x - 3 + k * 2, y + 8, y + 12, '#e8e0d8'); p.px(x - 2, y + 5, INK); }, // squid
    (x, y) => { for (let k = 0; k < 5; k++) { p.ellipse(x - 8 + k * 4, y + (k % 2), 2.5, 2, '#3a3040'); p.px(x - 8 + k * 4, y - 1 + (k % 2), '#7a6a8a'); } }, // clams
    (x, y) => { p.ellipse(x, y, 12, 3, '#c8d0d8'); p.ellipse(x, y - 1, 11, 1.5, '#3a4a6a'); p.poly([[x + 11, y], [x + 15, y - 3], [x + 15, y + 3]], '#8a9aaa'); p.px(x - 10, y - 1, INK); }, // sanma
    (x, y) => { p.ellipse(x, y, 7, 6, '#e85a2a'); for (let k = 0; k < 4; k++) { p.line(x - 6, y - 2 + k * 2, x - 11, y - 4 + k * 3, '#c84a1a'); p.line(x + 6, y - 2 + k * 2, x + 11, y - 4 + k * 3, '#c84a1a'); } p.px(x - 2, y - 4, INK); p.px(x + 2, y - 4, INK); }, // crab
  ];
  let k = seed;
  for (let x = 16; x < w - 10; x += 26) {
    const y = 14 + ((x * 7) % 9);
    fish[k++ % fish.length](x, y);
    // bamboo leaf garnish + a price card on a pick
    p.poly([[x - 6, y + 9], [x + 2, y + 7], [x - 2, y + 11]], '#4a9a3a');
    p.rect(x + 6, y + 8, 12, 7, '#ffffff'); p.frame(x + 6, y + 8, 12, 7, '#d8443a');
    p.text(String(((x * 13) % 9 + 2) * 100), x + 12, y + 9, { font: `7px ${FONT.tiny}`, color: '#d8301a', align: 'center' });
  }
  return p;
}

// Bendy's: round badge with the white-fox girl (red ribbon braids) + script name
export function bendysLogo({ w = 200, h = 44 } = {}) {
  const p = new PixCanvas(w, h, 901);
  p.rect(0, 0, w, h, '#c8202a');
  p.rect(1, 1, w - 2, h - 2, '#e8303a');
  p.rect(1, 1, w - 2, 2, '#ff6a6a');
  // badge
  const cx = 24, cy = h / 2;
  p.circle(cx, cy, 19, '#ffffff'); p.circle(cx, cy, 17, '#fff4e8');
  // braids with red ribbons
  p.ellipse(cx - 11, cy + 6, 3, 8, '#f4f0ec'); p.ellipse(cx + 11, cy + 6, 3, 8, '#f4f0ec');
  for (const sx of [-11, 11]) { p.rect(cx + sx - 3, cy + 1, 6, 3, '#e8303a'); p.px(cx + sx - 4, cy, '#e8303a'); p.px(cx + sx + 3, cy, '#e8303a'); }
  // face + ears
  p.poly([[cx - 10, cy - 8], [cx - 7, cy - 17], [cx - 3, cy - 9]], '#f8f6f4'); p.poly([[cx + 10, cy - 8], [cx + 7, cy - 17], [cx + 3, cy - 9]], '#f8f6f4');
  p.poly([[cx - 8, cy - 9], [cx - 7, cy - 14], [cx - 5, cy - 9]], '#ffb8c0'); p.poly([[cx + 8, cy - 9], [cx + 7, cy - 14], [cx + 5, cy - 9]], '#ffb8c0');
  p.ellipse(cx, cy - 1, 9, 9, '#fbfaf8');
  p.ellipse(cx, cy - 7, 8, 3, '#e8303a'); // red bangs ribbon headband
  p.ellipse(cx - 4, cy, 1.5, 2, INK); p.ellipse(cx + 4, cy, 1.5, 2, INK);
  p.px(cx - 4, cy - 1, '#ffffff'); p.px(cx + 4, cy - 1, '#ffffff');
  p.px(cx - 7, cy + 3, '#ff9aa8'); p.px(cx + 7, cy + 3, '#ff9aa8');
  p.hline(cx - 1, cx + 1, cy + 4, INK); p.px(cx, cy + 3, '#3a2a2a');
  p.ring(cx, cy, 18, '#c8202a', 1);
  // script name
  p.text("Bendy's", 120, 3, { font: `22px ${FONT.cute}`, color: '#ffffff', align: 'center', outline: '#8a1018' });
  p.text('ベンディーズ · OLD FASHIONED', 120, 31, { font: `7px ${FONT.tiny}`, color: '#ffe0d0', align: 'center' });
  return p;
}

// arcade gate: 木霊銀座 商店街 with the street's mascot (a little kodama spirit)
export function gateSign({ w = 300, h = 54 } = {}) {
  const p = new PixCanvas(w, h, 902);
  p.rect(0, 0, w, h, '#2a3a5a');
  p.rect(2, 2, w - 4, h - 4, '#f4ecd8');
  p.rect(2, 2, w - 4, 3, '#ffffff');
  p.rect(2, h - 9, w - 4, 7, '#c8443a');
  for (let x = 6; x < w - 6; x += 10) p.rect(x, h - 7, 5, 3, '#f4c060');
  p.text('木霊銀座', w / 2 + 10, 6, { font: `26px ${FONT.bold}`, color: '#2a3a5a', align: 'center', shadow: { color: '#c8b898', dx: 1, dy: 1 } });
  p.text('商店街', w - 16, 10, { font: `9px ${FONT.ui}`, color: '#c8443a', align: 'right' });
  p.text('KODAMA GINZA', w - 16, 23, { font: `7px ${FONT.tiny}`, color: '#5a6a8a', align: 'right' });
  // kodama mascot: round white spirit with dot eyes, a leaf on top
  const cx = 30, cy = 25;
  p.ellipse(cx, cy + 2, 12, 13, '#ffffff'); p.ellipse(cx, cy + 2, 12, 13, 'rgba(0,0,0,0)');
  p.ring(cx, cy + 2, 12, '#a8b8c8');
  p.circle(cx - 4, cy, 2, INK); p.circle(cx + 4, cy, 2, INK); p.ellipse(cx, cy + 6, 2, 3, INK);
  p.px(cx - 8, cy + 4, '#ffb0c0'); p.px(cx + 8, cy + 4, '#ffb0c0');
  p.poly([[cx, cy - 11], [cx + 7, cy - 17], [cx + 3, cy - 9]], '#58a838'); p.line(cx, cy - 11, cx + 6, cy - 16, '#3a7a28');
  return p;
}

// decorative manhole cover: koi in a ring of waves, painted
export function manholeCover({ seed = 7 } = {}) {
  const S = 44;
  const p = new PixCanvas(S, S, 903 + seed);
  p.circle(S / 2, S / 2, 21, '#4a4a52'); p.circle(S / 2, S / 2, 19, '#6a6a72');
  p.circle(S / 2, S / 2, 17, '#3a6a9a');
  for (let a = 0; a < 16; a++) { const r = 14, x = S / 2 + Math.cos(a / 16 * Math.PI * 2) * r, y = S / 2 + Math.sin(a / 16 * Math.PI * 2) * r; p.circle(x, y, 2.5, '#5a8ac0'); p.px(x, y - 1, '#9ac8f0'); }
  // two koi
  p.ellipse(S / 2 - 3, S / 2 - 3, 7, 3, '#f4f0e8'); p.ellipse(S / 2 - 5, S / 2 - 4, 3, 2, '#e8443a'); p.poly([[S / 2 + 4, S / 2 - 3], [S / 2 + 8, S / 2 - 6], [S / 2 + 8, S / 2]], '#f4f0e8');
  p.ellipse(S / 2 + 3, S / 2 + 4, 7, 3, '#f0a030'); p.ellipse(S / 2 + 5, S / 2 + 4, 2, 1.5, '#ffffff'); p.poly([[S / 2 - 4, S / 2 + 4], [S / 2 - 8, S / 2 + 1], [S / 2 - 8, S / 2 + 7]], '#f0a030');
  p.px(S / 2 - 9, S / 2 - 4, INK); p.px(S / 2 + 9, S / 2 + 3, INK);
  p.text('木霊町', S / 2, S - 12, { font: `7px ${FONT.tiny}`, color: '#d8e4f0', align: 'center' });
  p.ring(S / 2, S / 2, 21, '#2a2a30');
  p.x.globalCompositeOperation = 'destination-in';
  p.x.beginPath(); p.x.arc(S / 2, S / 2, 21.5, 0, Math.PI * 2); p.x.fill();
  p.x.globalCompositeOperation = 'source-over';
  p.hardAlpha();
  return p;
}

// small printed things taped to shutters and windows
export function shopPoster(kind = 'tenant', seed = 1) {
  if (kind === 'tenant') {
    const p = new PixCanvas(30, 40, 950 + seed);
    p.rect(0, 0, 30, 40, '#fffef6'); p.frame(0, 0, 30, 40, '#c8c0b0');
    p.text('テナント', 15, 3, { font: `7px ${FONT.tiny}`, color: '#d8301a', align: 'center' });
    p.text('募集', 15, 11, { font: `12px ${FONT.bold}`, color: '#d8301a', align: 'center' });
    p.hline(3, 26, 27, '#d8d0c0');
    p.text('木霊不動産', 15, 29, { font: `7px ${FONT.tiny}`, color: '#3a3a44', align: 'center' });
    p.scatter(0, 0, 30, 40, '#e8dcc0', 0.15);
    return p;
  }
  if (kind === 'cat') { // lost cat
    const p = new PixCanvas(28, 38, 960 + seed);
    p.rect(0, 0, 28, 38, '#fff8e8'); p.frame(0, 0, 28, 38, '#d8c8a8');
    p.text('迷い猫', 14, 2, { font: `9px ${FONT.cute}`, color: '#2a2a44', align: 'center' });
    p.circle(14, 20, 7, '#e8a04a'); p.poly([[8, 16], [9, 10], [13, 14]], '#e8a04a'); p.poly([[20, 16], [19, 10], [15, 14]], '#e8a04a');
    p.px(11, 19, INK); p.px(17, 19, INK); p.px(14, 22, '#c86a5a');
    p.text('ミケ', 14, 29, { font: `7px ${FONT.tiny}`, color: '#d8301a', align: 'center' });
    return p;
  }
  if (kind === 'sale') {
    const p = new PixCanvas(40, 30, 970 + seed);
    p.rect(0, 0, 40, 30, '#ffe040'); p.frame(0, 0, 40, 30, '#e8443a');
    p.text('大売出し', 20, 3, { font: `10px ${FONT.bold}`, color: '#e8301a', align: 'center' });
    p.text('全品20%OFF', 20, 17, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' });
    return p;
  }
  if (kind === 'closing') { // 閉店のお知らせ, faded
    const p = new PixCanvas(30, 40, 980 + seed);
    p.rect(0, 0, 30, 40, '#f4f0e4');
    p.text('閉店の', 15, 4, { font: `7px ${FONT.tiny}`, color: '#3a3a44', align: 'center' });
    p.text('お知らせ', 15, 12, { font: `7px ${FONT.tiny}`, color: '#3a3a44', align: 'center' });
    for (let y = 22; y < 36; y += 3) p.hline(4, 25, y, '#b8b0a4');
    p.scatter(0, 0, 30, 40, '#d8d0b8', 0.3);
    return p;
  }
  // tanabata event
  const p = new PixCanvas(30, 42, 990 + seed);
  for (let y = 0; y < 42; y++) p.hline(0, 29, y, mix('#1a2a5a', '#3a2a6a', y / 42));
  for (let i = 0; i < 26; i++) p.px((i * 11) % 30, (i * 7) % 26, i % 3 ? '#ffffff' : '#ffe080');
  p.line(4, 26, 26, 6, '#c8d8ff'); p.line(4, 27, 26, 7, '#8aa8e8');
  p.text('七夕まつり', 15, 29, { font: `7px ${FONT.tiny}`, color: '#ffe8a0', align: 'center' });
  p.text('木霊銀座', 15, 35, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  return p;
}

// shelf-front texture: packed product boxes with yellow POP price tags (drugstore)
export function productShelf({ w = 96, h = 64, rows = 4, seed = 8, pop = true } = {}) {
  const p = new PixCanvas(w, h, 1000 + seed);
  p.rect(0, 0, w, h, '#e8eef0');
  const cols = ['#e8443a', '#3a8ad8', '#f0c040', '#6ab04a', '#ff8ab0', '#8a5ac8', '#3ac8b8', '#f4f0e8', '#e87a3a', '#2a2a34'];
  const rh = Math.floor(h / rows);
  for (let r = 0; r < rows; r++) {
    const y0 = r * rh;
    p.rect(0, y0 + rh - 3, w, 3, '#c8d0d8'); p.hline(0, w - 1, y0 + rh - 3, '#ffffff');
    let x = 1;
    while (x < w - 2) {
      const bw = 3 + Math.floor(p.rnd() * 5), bh = Math.floor(rh * (0.45 + p.rnd() * 0.4));
      const c = cols[Math.floor(p.rnd() * cols.length)];
      p.rect(x, y0 + rh - 3 - bh, bw, bh, c);
      p.rect(x, y0 + rh - 3 - bh, bw, 1, lighten(c, 0.3));
      if (bw > 3) p.rect(x + 1, y0 + rh - 3 - Math.floor(bh * 0.6), bw - 2, 2, '#ffffff');
      x += bw + (p.rnd() < 0.2 ? 1 : 0);
    }
    if (pop) for (let px = 4 + (r * 13) % 20; px < w - 12; px += 26) { p.rect(px, y0 + rh - 9, 11, 6, '#ffe040'); p.frame(px, y0 + rh - 9, 11, 6, '#e8301a'); p.hline(px + 2, px + 8, y0 + rh - 7, '#e8301a'); }
  }
  return p;
}

// book spines for the used-book shop shelves (ochre, faded, a few bright)
export function bookShelf({ w = 80, h = 64, rows = 4, seed = 9 } = {}) {
  const p = new PixCanvas(w, h, 1100 + seed);
  p.rect(0, 0, w, h, '#5a3a24');
  const cols = ['#8a6a4a', '#a8885a', '#6a4a3a', '#c8a878', '#4a5a6a', '#7a3a2a', '#d8c8a0', '#3a4a3a', '#b84a3a', '#e8dcc0'];
  const rh = Math.floor(h / rows);
  for (let r = 0; r < rows; r++) {
    const y0 = r * rh;
    p.rect(0, y0 + rh - 2, w, 2, '#3a2418');
    let x = 1;
    while (x < w - 1) {
      const bw = 2 + Math.floor(p.rnd() * 3), bh = rh - 3 - Math.floor(p.rnd() * 4);
      const c = cols[Math.floor(p.rnd() * cols.length)];
      p.rect(x, y0 + rh - 2 - bh, bw, bh, c);
      p.px(x, y0 + rh - 2 - bh + 2, lighten(c, 0.35));
      if (bh > 6) p.hline(x, x + bw - 1, y0 + rh - 2 - bh + 3, darken(c, 0.3));
      x += bw;
    }
  }
  return p;
}

// curtain behind a 2nd-floor window (pattern by seed)
export function curtain({ w = 20, h = 24, col = '#e8d8b8', seed = 10, open = 0.4 } = {}) {
  const p = new PixCanvas(w, h, 1200 + seed);
  p.rect(0, 0, w, h, '#2a2e3a');
  const cw = Math.round(w * (1 - open) / 2);
  for (const [x0, x1] of [[0, cw], [w - cw, w]]) {
    for (let x = x0; x < x1; x++) p.vline(x, 0, h - 1, (x - x0) % 3 === 0 ? darken(col, 0.15) : col);
    if (seed % 3 === 0) for (let y = 3; y < h; y += 6) for (let x = x0 + 1; x < x1; x += 4) p.px(x, y, darken(col, 0.3));
  }
  return p;
}

// a little striped valance printed with the shop name (front edge of an awning)
export function valance({ text = '', w = 200, h = 12, bg = '#d8443a', fg = '#ffffff', stripe = null, font = FONT.small } = {}) {
  const p = new PixCanvas(w, h, 1300);
  p.rect(0, 0, w, h, bg);
  if (stripe) for (let x = 0; x < w; x += 16) p.rect(x, 0, 8, h, stripe);
  // scalloped bottom edge
  for (let x = 0; x < w; x += 8) { p.x.clearRect(x, h - 1, 1, 1); p.x.clearRect(x + 7, h - 1, 1, 1); }
  if (text) {
    const tw = PixCanvas.measure(text, `8px ${font}`) + 10;
    p.rect(w / 2 - tw / 2, 1, tw, h - 3, bg);
    p.text(text, w / 2, 2, { font: `8px ${font}`, color: fg, align: 'center' });
  }
  return p;
}

// wish strips for the tanabata bamboo (tanzaku), random colours with scribbles
export function tanzakuSheet({ n = 8, seed = 11 } = {}) {
  const w = n * 6, h = 18;
  const p = new PixCanvas(w, h, 1400 + seed);
  const cols = ['#ff8ab0', '#ffe060', '#8ad8ff', '#a8e878', '#ffffff', '#c8a8ff', '#ff9a5a'];
  for (let i = 0; i < n; i++) {
    const c = cols[(i + seed) % cols.length];
    p.rect(i * 6 + 1, 0, 4, h, c);
    for (let y = 3; y < h - 2; y += 3) p.px(i * 6 + 2 + (y % 2), y, darken(c, 0.4));
  }
  return p;
}

// gacha machine header card: a little illustrated series banner
export function gachaCard({ seed = 1, w = 30, h = 12 } = {}) {
  const p = new PixCanvas(w, h, 1500 + seed);
  const themes = [
    ['#ff8ab0', '#fff0f6', 'ねこ'], ['#58b0e8', '#eef8ff', 'カッパ'], ['#f0c040', '#fffbe8', 'たまご'], ['#6ab04a', '#f0fff0', 'きゅうり'],
    ['#8a5ac8', '#f6f0ff', 'ようかい'], ['#e8443a', '#fff4f0', 'すし'], ['#3ac8b8', '#eefffc', 'さかな'], ['#e87a3a', '#fff6ee', 'たぬき'],
  ];
  const [c, bg, t] = themes[seed % themes.length];
  p.rect(0, 0, w, h, c); p.rect(1, 1, w - 2, h - 2, bg);
  p.rect(1, 1, w - 2, 3, c);
  p.text(t, w / 2, 0, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  // three tiny mascots
  for (let i = 0; i < 3; i++) { const x = 6 + i * 9, y = 8; p.circle(x, y, 2.5, i === 1 ? c : lighten(c, 0.3)); p.px(x - 1, y - 1, INK); p.px(x + 1, y - 1, INK); }
  p.text('¥200', w - 3, 6, { font: `7px ${FONT.tiny}`, color: INK, align: 'right' });
  return p;
}
