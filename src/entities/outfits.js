// Clothing / skin / shell texture painters for characters.
//
// Torso canvases are 64 x 32 and wrap around a cylinder: x = 32 is the front
// centre, x = 16 the character's right side, x = 48 its left, x = 0/64 the
// back. y = 0 is the top (shoulders). Sleeve canvases are 32 x 16 (front at
// x = 16). Head canvases are 64 x 32 equirect (front at x = 32).
import { PixCanvas, ramp, mix, darken, lighten, makeTexture, cached } from '../core/pixtex.js';

const TW = 64, TH = 32;

// subtle woven noise so fabric isn't flat
function fabric(p, base, { amt = 0.08, knit = false, denim = false } = {}) {
  const lo = darken(base, amt), hi = lighten(base, amt * 0.7);
  p.fill(base);
  p.each((x, y) => {
    const h = ((x * 7 + y * 13) ^ (x * y)) % 11;
    if (knit) return (x % 2 === 0) ? (y % 3 === 0 ? lo : null) : (h < 2 ? hi : null);
    if (denim) return (x + y) % 3 === 0 ? lo : h < 1 ? hi : null;
    return h === 0 ? lo : h === 5 ? hi : null;
  });
}

// --------------------------------------------------------------- torsos
export const TORSO = {
  hoodie({ color = '#7a8aa8', accent = '#e8e0d0', print = 'wave', hood = true } = {}) {
    const p = new PixCanvas(TW, TH, 11);
    fabric(p, color, { amt: 0.07 });
    const dk = darken(color, 0.22), lt = lighten(color, 0.18);
    // ribbed hem + side seams
    p.rect(0, TH - 3, TW, 3, dk);
    for (let x = 0; x < TW; x += 2) p.vline(x, TH - 3, TH - 1, darken(color, 0.3));
    p.vline(16, 0, TH - 4, darken(color, 0.12)); p.vline(48, 0, TH - 4, darken(color, 0.12));
    // kangaroo pocket
    p.rect(22, 18, 20, 9, darken(color, 0.06));
    p.hline(22, 41, 18, dk); p.line(22, 18, 20, 26, dk); p.line(41, 18, 43, 26, dk);
    p.hline(23, 40, 19, lt);
    // drawstrings + neckline
    p.rect(26, 0, 12, 2, dk);
    p.rect(28, 2, 1, 7, accent); p.rect(35, 2, 1, 6, accent);
    p.px(28, 9, darken(accent, 0.2)); p.px(35, 8, darken(accent, 0.2));
    // tiny chest print
    if (print === 'wave') {
      const c = accent;
      p.px(31, 11, c); p.px(32, 10, c); p.px(33, 10, c); p.px(34, 11, c); p.px(30, 12, c); p.px(35, 12, c); p.px(32, 12, c);
      p.hline(29, 36, 13, mix(color, c, 0.5));
    } else if (print === 'star') {
      p.stamp(['..s..', 'sssss', '.sss.', 's...s'], { s: accent }, 30, 9);
    }
    // hood bunched at the back
    if (hood) {
      p.rect(0, 0, 10, 6, dk); p.rect(54, 0, 10, 6, dk);
      p.rect(0, 0, 9, 5, darken(color, 0.1)); p.rect(55, 0, 9, 5, darken(color, 0.1));
      p.hline(0, 8, 5, darken(color, 0.3)); p.hline(55, 63, 5, darken(color, 0.3));
    }
    return p;
  },
  tee({ color = '#f4f0e8', print = null, printCol = '#e8443a' } = {}) {
    const p = new PixCanvas(TW, TH, 12);
    fabric(p, color, { amt: 0.05 });
    p.rect(27, 0, 10, 2, darken(color, 0.2));
    p.hline(28, 35, 2, darken(color, 0.12));
    p.rect(0, TH - 1, TW, 1, darken(color, 0.12));
    if (print === 'circle') { p.circle(32, 12, 4, printCol); p.circle(32, 12, 2, color); }
    if (print === 'stripe') for (let y = 6; y < TH - 2; y += 4) p.rect(0, y, TW, 2, printCol);
    return p;
  },
  cardigan({ color = '#8a6a4a', shirt = '#e8dcc0', buttons = '#d8b060', knit = true, vest = false } = {}) {
    const p = new PixCanvas(TW, TH, 13);
    fabric(p, color, { knit, amt: 0.1 });
    // open front V with the shirt under it
    p.poly([[27, 0], [37, 0], [33, 16], [31, 16]], shirt);
    p.rect(30, 0, 4, 2, darken(shirt, 0.15));
    p.line(27, 0, 31, 16, darken(color, 0.3)); p.line(37, 0, 33, 16, darken(color, 0.3));
    p.vline(32, 16, TH - 1, darken(color, 0.3));
    for (const y of [18, 23, 28]) { p.px(31, y, buttons); p.px(31, y + 1, darken(buttons, 0.3)); }
    // pockets
    p.frame(20, 20, 7, 6, darken(color, 0.25)); p.frame(37, 20, 7, 6, darken(color, 0.25));
    p.rect(0, TH - 2, TW, 2, darken(color, 0.18));
    if (vest) { p.rect(12, 0, 6, TH, darken(color, 0.08)); p.rect(46, 0, 6, TH, darken(color, 0.08)); }
    return p;
  },
  samue({ color = '#3a4a6a', tie = '#2a3450' } = {}) { // work jacket, kimono-cross collar
    const p = new PixCanvas(TW, TH, 14);
    fabric(p, color, { amt: 0.09 });
    const dk = darken(color, 0.3);
    p.line(26, 0, 36, 18, dk); p.line(27, 0, 37, 18, dk);
    p.line(38, 0, 33, 9, dk);
    p.poly([[27, 0], [37, 0], [33, 8]], darken(color, 0.12));
    p.rect(36, 14, 1, 3, tie); p.rect(37, 15, 3, 1, tie);
    p.rect(0, TH - 2, TW, 2, dk);
    return p;
  },
  kimono({ color = '#c84a3a', pattern = 'asanoha', patCol = '#f0d8a0', obi = '#2a2a48', obiCord = '#e8c060' } = {}) {
    const p = new PixCanvas(TW, TH, 15);
    fabric(p, color, { amt: 0.06 });
    patternFill(p, pattern, patCol, color);
    // collar: left over right
    p.poly([[26, 0], [38, 0], [33, 14], [31, 14]], '#f4ece0');
    p.line(26, 0, 33, 16, darken(color, 0.35)); p.line(27, 0, 34, 16, darken(color, 0.2));
    p.line(38, 0, 33, 10, darken(color, 0.35));
    // obi
    p.rect(0, 18, TW, 8, obi);
    p.hline(0, TW - 1, 18, lighten(obi, 0.2)); p.hline(0, TW - 1, 25, darken(obi, 0.3));
    p.hline(0, TW - 1, 21, obiCord);
    p.rect(0, 16, 8, 12, obi); p.rect(56, 16, 8, 12, obi); // bow at the back
    return p;
  },
  happi({ color = '#2a4a8a', band = '#f4ece0', crest = '木' } = {}) {
    const p = new PixCanvas(TW, TH, 16);
    fabric(p, color, { amt: 0.08 });
    // collar band down the front with characters
    p.poly([[25, 0], [29, 0], [33, TH], [29, TH]], band);
    p.poly([[35, 0], [39, 0], [35, TH], [31, TH]], darken(band, 0.05));
    p.rect(0, TH - 3, TW, 3, band);
    for (let x = 1; x < TW; x += 4) p.rect(x, TH - 2, 2, 1, color);
    // big crest on the back
    p.circle(4, 12, 5, band); p.circle(60, 12, 5, band);
    p.text(crest, 0, 12, { font: '10px Galmuri11', color, baseline: 'middle' });
    return p;
  },
  apron({ base = '#f4f0e8', apron = '#2a3a5a', strap = null, logo = null, logoCol = '#f4ece0' } = {}) {
    const p = TORSO.tee({ color: base });
    p.rrect(22, 4, 20, TH - 4, 2, apron);
    p.hline(22, 41, 4, lighten(apron, 0.15));
    p.line(22, 4, 16, 0, strap || apron); p.line(41, 4, 47, 0, strap || apron);
    p.rect(27, 18, 10, 6, darken(apron, 0.12)); p.hline(27, 36, 18, darken(apron, 0.3));
    if (logo) p.text(logo, 32, 9, { font: '8px Galmuri7', color: logoCol, align: 'center' });
    return p;
  },
  waitress({ dress = '#d8342e', stripe = '#ffffff', apron = '#ffffff', collar = '#ffffff' } = {}) {
    const p = new PixCanvas(TW, TH, 17);
    fabric(p, dress, { amt: 0.05 });
    for (let x = 0; x < TW; x += 6) p.rect(x, 0, 2, TH, mix(dress, stripe, 0.8));
    // white round collar
    p.ellipse(32, 1, 9, 4, collar); p.ellipse(32, 0, 5, 2, darken(dress, 0.2));
    p.hline(24, 40, 4, darken(collar, 0.15));
    // apron bib with frill
    p.rrect(25, 8, 14, TH - 8, 2, apron);
    for (let x = 25; x < 39; x += 2) p.px(x, 8, darken(apron, 0.12));
    p.rect(0, 17, TW, 2, apron); // apron ties around the waist
    p.rect(0, 15, 6, 6, apron); p.rect(58, 15, 6, 6, apron);
    p.px(32, 12, '#e8c040'); // name tag pin
    p.rect(29, 11, 6, 3, '#fff6d8'); p.frame(29, 11, 6, 3, '#c8a050');
    return p;
  },
  sailor({ color = '#f4f0f0', collar = '#2a3a6a', scarf = '#d8343a', stripes = '#f4f0f0' } = {}) {
    const p = new PixCanvas(TW, TH, 18);
    fabric(p, color, { amt: 0.04 });
    // big square collar at the back + lapels in front
    p.rect(0, 0, 14, 11, collar); p.rect(50, 0, 14, 11, collar);
    p.hline(0, 13, 9, stripes); p.hline(50, 63, 9, stripes);
    p.poly([[22, 0], [42, 0], [33, 14], [31, 14]], collar);
    p.poly([[26, 0], [38, 0], [32, 9]], color);
    p.line(22, 0, 31, 13, stripes); p.line(42, 0, 33, 13, stripes);
    // scarf bow
    p.stamp(['rr.rr', 'rrrrr', '.rRr.', '.r.r.', 'r...r'], { r: scarf, R: darken(scarf, 0.25) }, 30, 11);
    p.rect(0, TH - 2, TW, 2, darken(color, 0.1));
    return p;
  },
  suit({ color = '#3a3a48', shirt = '#f0f0f4', tie = '#c83a3a' } = {}) {
    const p = new PixCanvas(TW, TH, 19);
    fabric(p, color, { amt: 0.06 });
    p.poly([[26, 0], [38, 0], [33, 16], [31, 16]], shirt);
    p.rect(31, 1, 3, 14, tie); p.rect(30, 1, 5, 2, darken(tie, 0.2));
    p.line(26, 0, 31, 16, darken(color, 0.3)); p.line(38, 0, 33, 16, darken(color, 0.3));
    p.px(31, 20, '#9a9aa8'); p.px(31, 25, '#9a9aa8');
    return p;
  },
  attendant({ vest = '#e86a8a', shirt = '#ffffff', scarf = '#2a9ab0' } = {}) { // train wagon-service uniform
    const p = new PixCanvas(TW, TH, 20);
    fabric(p, shirt, { amt: 0.04 });
    p.rect(16, 3, 32, TH - 3, vest);
    p.poly([[26, 3], [38, 3], [33, 14], [31, 14]], shirt);
    p.line(26, 3, 31, 14, darken(vest, 0.3)); p.line(38, 3, 33, 14, darken(vest, 0.3));
    p.stamp(['sss.sss', '.sssss.', '..sSs..', '..s.s..'], { s: scarf, S: darken(scarf, 0.3) }, 29, 1);
    p.rect(39, 9, 5, 3, '#fff6d8'); // name badge
    p.rect(0, TH - 2, TW, 2, darken(vest, 0.2));
    return p;
  },
  chef({ color = '#ffffff', scarf = '#d8342e' } = {}) {
    const p = new PixCanvas(TW, TH, 21);
    fabric(p, color, { amt: 0.04 });
    for (const y of [8, 14, 20]) { p.px(28, y, '#c8c0b8'); p.px(36, y, '#c8c0b8'); }
    p.vline(32, 2, TH - 1, '#e0d8d0');
    p.rect(26, 0, 12, 3, scarf); p.rect(30, 3, 4, 3, scarf);
    return p;
  },
  yamabushi({ color = '#f2ece0', pom = '#e8e0d0', pomDark = '#c84a3a' } = {}) { // tengu robe with pompoms
    const p = new PixCanvas(TW, TH, 22);
    fabric(p, color, { amt: 0.05 });
    patternFill(p, 'kikko', darken(color, 0.12), color);
    p.poly([[26, 0], [38, 0], [33, 14], [31, 14]], '#f8f4ec');
    p.line(26, 0, 33, 16, darken(color, 0.3)); p.line(38, 0, 33, 10, darken(color, 0.3));
    // the famous bonbon pompoms down the front
    for (const [x, y] of [[27, 6], [37, 6], [27, 14], [37, 14], [32, 20]]) { p.circle(x, y, 2.5, pomDark); p.px(x - 1, y - 1, lighten(pomDark, 0.3)); }
    p.rect(0, TH - 4, TW, 4, darken(color, 0.15));
    return p;
  },
  dress({ color = '#c84a5a', lace = '#fff4ec', brooch = '#e8c060' } = {}) {
    const p = new PixCanvas(TW, TH, 23);
    fabric(p, color, { amt: 0.05 });
    p.ellipse(32, 1, 10, 5, lace);
    for (let x = 22; x <= 42; x += 2) p.px(x, 5, darken(lace, 0.15));
    p.ellipse(32, 0, 5, 2.5, darken(color, 0.3));
    p.circle(32, 8, 1.5, brooch); p.px(32, 8, '#ffffff');
    p.rect(0, 16, TW, 2, darken(color, 0.2));
    for (let x = 1; x < TW; x += 3) p.px(x, 17, lighten(color, 0.2));
    return p;
  },
  plain({ color = '#a0a0a0', belt = null } = {}) {
    const p = new PixCanvas(TW, TH, 24);
    fabric(p, color, { amt: 0.06 });
    if (belt) p.rect(0, TH - 4, TW, 2, belt);
    return p;
  },
};

export function patternFill(p, kind, col, bg) {
  if (kind === 'asanoha') {
    for (let y = 0; y < TH; y += 8) for (let x = 0; x < TW; x += 8) {
      p.line(x, y, x + 4, y + 4, col); p.line(x + 8, y, x + 4, y + 4, col); p.vline(x + 4, y + 4, y + 7, col);
    }
  } else if (kind === 'seigaiha') {
    for (let y = 0; y < TH + 4; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < TW + 8; x += 8) { p.ring(x, y, 4, col); p.ring(x, y, 2, col); }
  } else if (kind === 'kikko') {
    for (let y = 0; y < TH; y += 6) for (let x = ((y / 6) % 2) * 5; x < TW; x += 10) {
      p.hline(x + 1, x + 4, y, col); p.line(x + 4, y, x + 6, y + 3, col); p.line(x + 6, y + 3, x + 4, y + 6, col);
    }
  } else if (kind === 'polka') {
    for (let y = 2; y < TH; y += 6) for (let x = ((y / 6) % 2) * 3 + 1; x < TW; x += 6) p.rect(x, y, 2, 2, col);
  } else if (kind === 'check') {
    for (let y = 0; y < TH; y += 4) for (let x = 0; x < TW; x += 4) if (((x + y) / 4) % 2) p.rect(x, y, 4, 4, col);
  } else if (kind === 'stripe') {
    for (let y = 0; y < TH; y += 4) p.rect(0, y, TW, 2, col);
  } else if (kind === 'sakura') {
    for (let i = 0; i < 18; i++) {
      const x = (i * 23) % TW, y = (i * 13) % TH;
      p.stamp(['.p.', 'pPp', '.p.'], { p: col, P: lighten(col, 0.4) }, x, y);
    }
  } else if (kind === 'yagasuri') {
    for (let x = 0; x < TW; x += 8) for (let y = (x / 8) % 2 * 4; y < TH; y += 8) { p.poly([[x, y], [x + 4, y + 2], [x + 8, y], [x + 8, y + 4], [x + 4, y + 6], [x, y + 4]], col); }
  }
}

// --------------------------------------------------------------- sleeves / legs
export function sleeve({ color = '#7a8aa8', cuff = null, length = 1, skin = '#8ac070', stripe = null } = {}) {
  const p = new PixCanvas(32, 16, 31);
  fabric(p, color, { amt: 0.07 });
  if (length < 1) p.rect(0, Math.round(16 * length), 32, 16 - Math.round(16 * length), skin);
  if (cuff && length >= 1) p.rect(0, 13, 32, 3, cuff);
  if (stripe) p.rect(0, 6, 32, 2, stripe);
  return p;
}
export function legTex({ color = '#4a5a7a', shorts = false, skin = '#8ac070', socks = null, skirt = false } = {}) {
  const p = new PixCanvas(32, 16, 32);
  fabric(p, color, { amt: 0.07, denim: !shorts && !skirt });
  if (shorts || skirt) p.rect(0, shorts ? 6 : 0, 32, 16, skin);
  if (socks) p.rect(0, 11, 32, 5, socks);
  return p;
}

// --------------------------------------------------------------- skins
// head / limb skin with species markings. Equirect 64x32, front at x = 32.
export function skinTex({ color = '#8ac070', belly = null, mask = null, scales = false, spots = null, cheeks = null, patchy = 0 } = {}) {
  const p = new PixCanvas(64, 32, 41);
  const lo = darken(color, 0.1), hi = lighten(color, 0.08);
  p.fill(color);
  // soft painterly noise
  p.each((x, y) => { const h = ((x * 17 + y * 31) ^ (x * 5)) % 23; return h === 0 ? lo : h === 7 ? hi : null; });
  if (scales) {
    // turtle skin: faint hex scale pattern on top/back of head
    for (let y = 2; y < 18; y += 4) for (let x = ((y / 4) % 2) * 3; x < 64; x += 6) {
      if (x > 18 && x < 46 && y > 4) continue; // keep the face clear
      const sc = mix(color, lo, 0.55);
      p.hline(x, x + 2, y, sc); p.px(x - 1, y + 1, sc); p.px(x + 3, y + 1, sc);
    }
  }
  if (belly) { // lighter muzzle / chin / throat area
    p.ellipse(32, 26, 13, 8, belly);
    p.ellipse(32, 22, 9, 5, belly);
  }
  if (cheeks) { p.ellipse(20, 20, 6, 5, cheeks); p.ellipse(44, 20, 6, 5, cheeks); }
  if (mask) { // tanuki/raccoon-dog eye mask
    p.ellipse(25, 15, 6, 4, mask); p.ellipse(39, 15, 6, 4, mask);
  }
  if (spots) for (let i = 0; i < 14; i++) { const x = (i * 29) % 64, y = 2 + (i * 7) % 12; if (x > 22 && x < 42) continue; p.ellipse(x, y, 1.5, 1, spots); }
  if (patchy) for (let i = 0; i < 6; i++) { const x = 8 + (i * 37) % 48, y = 3 + (i * 11) % 8; p.ellipse(x, y, 2, 1.5, darken(color, 0.18)); } // liver spots
  return p;
}

// --------------------------------------------------------------- turtle shell
// lathe dome, equirect 64 x 24: x around (front at 32 is the belly side - hidden
// by the body), y from the apex (0) to the rim (23).
export function shellTex({ base = '#7a6a3a', seam = '#3e3020', light = '#a89a5a', rim = '#5a4a2a', moss = 0 } = {}) {
  const p = new PixCanvas(64, 24, 51);
  p.fill(base);
  p.each((x, y) => { const h = (x * 11 + y * 7) % 13; return h === 0 ? darken(base, 0.08) : h === 6 ? lighten(base, 0.06) : null; });
  // vertebral scutes along the spine (x = 0 is the back centre)
  const plates = [[0, 2, 6], [0, 9, 7], [64, 2, 6], [64, 9, 7]];
  for (const [x, y, r] of plates) { p.ellipse(x, y + 2, r * 0.9, r * 0.7, light); }
  // hex seams
  for (let y = 0; y < 18; y += 7) for (let x = ((y / 7) % 2) * 8; x < 64; x += 16) {
    p.line(x - 4, y, x + 4, y, seam); p.line(x + 4, y, x + 7, y + 4, seam); p.line(x + 7, y + 4, x + 4, y + 8, seam);
    p.line(x - 4, y, x - 7, y + 4, seam); p.line(x - 7, y + 4, x - 4, y + 8, seam);
    p.px(x, y + 4, lighten(base, 0.15)); p.px(x + 1, y + 3, lighten(base, 0.15));
  }
  // marginal scutes around the rim
  p.rect(0, 18, 64, 6, rim);
  for (let x = 0; x < 64; x += 4) p.vline(x, 18, 23, seam);
  p.hline(0, 63, 18, seam);
  if (moss) for (let i = 0; i < 30 * moss; i++) p.px((i * 37) % 64, (i * 13) % 14, i % 2 ? '#7a9a3a' : '#9aba4a');
  return p;
}

export function texOf(p, repeat = false) { return makeTexture(p.c, { repeat, mips: true }); }
export { cached };
