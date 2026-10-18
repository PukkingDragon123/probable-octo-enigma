// Crafted builder for everyone who isn't hand-made: Kodama Ginza's locals,
// shop customers, kids, commuters. Same craft as the main cast (rounded voxel
// heads with sculpted muzzles, ears and tails per species, 3-tone palettes,
// outfits with collars, buttons, prints and hems, hats and glasses), driven
// by a definition:
//   { species, skin, light, earInner, tailColor, tailTip, outfit: { kind, color, ... },
//     sleeve, pants, shoe, feet: 'geta'|'sneaker'|'loafer', skirt, shorts, legColor, socks,
//     hat: { type, color }, glasses, hunch, belly, kid, face: {...} }
import { VoxelModel, rbox, ell, tone, hash3, mirror, hand, roundGlasses, strawHat, FV, sh, mixc, line3 } from '../craft.js';

const hex = (c, d = 0x888888) => (c == null ? d : typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const R3 = (c) => ({ b: c, d: mixc(sh(c, 0.86), 0x3a2450, 0.08), dd: mixc(sh(c, 0.7), 0x3a2450, 0.16), l: mixc(sh(c, 1.08), 0xfff0c8, 0.1) });
const T3 = (R, pd = 0.07, pl = 0.05) => (x, y, z) => tone(x, y, z, R.b, R.d, R.l, pd, pl);

// ------------------------------------------------------------------ species heads
// returns { model, ears: [...], snout, face (cfg extras), extras: [...] }
function speciesHead(def) {
  const sp = def.species || 'shiba';
  const SK = R3(hex(def.skin, 0xc8945e));
  const LT = R3(hex(def.light, mixc(SK.b, 0xffffff, 0.7)));
  const v = new VoxelModel();
  const out = { model: v, ears: [], snout: null, extras: [], face: {} };
  const skin = T3(SK);
  const lightZone = (x, y, z) => {
    switch (sp) {
      case 'shiba': case 'fox': return (y + Math.max(0, 2 - z) * 0.9 <= 5.2 && (x <= -4 || x >= 3 || z < 5) && (z >= 0 || y <= 1)) || (y <= 2 && z >= -3);
      case 'tanuki': case 'bear': case 'deer': case 'otter': return y <= 2 && z >= -1;
      case 'cat': return y <= 3 && z >= 2 && Math.abs(x + 0.5) < 4;
      case 'rabbit': return y <= 2 && z >= 0;
      case 'monkey': return z >= 3 && y <= 8 && Math.abs(x + 0.5) < 5.5 - Math.max(0, y - 6);
      case 'turtle': return y <= 2 && z >= -2;
      default: return false;
    }
  };
  const r = sp === 'cat' || sp === 'rabbit' ? 3.0 : 2.6;
  rbox(v, -7, 6, 0, 11, -6, 5, r, (x, y, z) => (lightZone(x, y, z) ? T3(LT, 0.05, 0)(x, y, z) : skin(x, y, z)));
  const nose = hex(def.nose, 0x2a1c1a);
  const muzzle = (x0, x1, y0, y1, z1, col) => {
    for (let z = 6; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (z === z1 && y === y1 && (x === x0 || x === x1)) continue;
      v.set(x, y, z, y === y1 && z < z1 && sp !== 'otter' ? skin(x, y, z) : col(x, y, z));
    }
    out.snout = { x: -0.5, z: z1 + 1, y: y0, h: y1 - y0 + 1, w: x1 - x0 + 1, my: 1 };
  };
  switch (sp) {
    case 'shiba': case 'fox':
      muzzle(-3, 2, 0, 2, 8, T3(LT, 0.05, 0));
      v.set(-1, 2, 9, nose); v.set(0, 2, 9, nose); v.set(-1, 1, 9, nose); v.set(0, 1, 9, sh(nose, 1.6));
      break;
    case 'tanuki':
      muzzle(-3, 2, 0, 2, 7, T3(LT, 0.05, 0));
      v.set(-1, 2, 8, nose); v.set(0, 2, 8, nose); v.set(-1, 1, 8, nose); v.set(0, 1, 8, nose);
      out.face.mask = '#3a2a22';
      break;
    case 'bear':
      muzzle(-3, 2, 0, 3, 7, T3(LT, 0.05, 0));
      for (let x = -2; x <= 1; x++) v.set(x, 3, 8, nose); v.set(-1, 2, 8, nose); v.set(0, 2, 8, nose);
      break;
    case 'deer':
      muzzle(-3, 2, 0, 3, 7, (x, y, z) => (y <= 1 ? T3(LT, 0.05, 0)(x, y, z) : skin(x, y, z)));
      for (let x = -2; x <= 1; x++) v.set(x, 3, 8, nose); v.set(-1, 2, 8, nose); v.set(0, 2, 8, nose);
      break;
    case 'otter':
      muzzle(-4, 3, 0, 2, 7, T3(LT, 0.05, 0));
      for (let x = -2; x <= 1; x++) v.set(x, 2, 8, nose); v.set(-1, 1, 8, nose); v.set(0, 1, 8, nose);
      break;
    case 'cat':
      v.set(-1, 3, 6, 0xf0909c); v.set(0, 3, 6, 0xf0909c); v.set(-1, 2, 6, LT.b); v.set(0, 2, 6, LT.b);
      out.whiskers = true;
      break;
    case 'rabbit':
      v.set(-1, 3, 6, 0xf0909c); v.set(0, 3, 6, 0xf090a0); v.set(-1, 2, 6, LT.b); v.set(0, 2, 6, LT.b);
      break;
    case 'turtle':
      rbox(v, -3, 2, 1, 4, 6, 7, 1.0, (x, y, z) => (y <= 2 ? T3(LT)(x, y, z) : T3(SK)(x, y, z)));
      v.set(-1, 4, 8, SK.dd); v.set(0, 4, 8, SK.dd);
      out.snout = { x: -0.5, z: 8, y: 1, h: 4, w: 6, beak: true, my: 7 };
      break;
    case 'crane': {
      // white head, red crown patch, a long dark beak, black throat
      for (let x = -3; x <= 2; x++) for (let z = -2; z <= 3; z++) v.set(x, 11, z, 0xd8343a);
      for (let z = 6; z <= 11; z++) { v.set(-1, 4, z, 0x4a4a52); v.set(0, 4, z, 0x5a5a62); if (z < 10) { v.set(-1, 3, z, 0x3a3a42); v.set(0, 3, z, 0x3a3a42); } }
      for (let x = -7; x <= 6; x++) for (let z = -6; z <= 5; z++) if (v.has(x, 0, z)) v.set(x, 0, z, 0x2a2a32);
      break;
    }
    default: break;
  }
  // ---- ears
  const ei = hex(def.earInner, mixc(SK.b, 0xffc8d0, 0.6));
  const earModel = (kind, side) => {
    const e = new VoxelModel();
    if (kind === 'shiba' || kind === 'fox' || kind === 'cat') {
      const rows = kind === 'cat' ? [[-2, 1], [-2, 1], [-1, 1], [-1, 0], [0, 0]] : kind === 'fox' ? [[-2, 1], [-2, 1], [-2, 1], [-1, 1], [-1, 1], [0, 1], [0, 0]] : [[-2, 1], [-2, 1], [-1, 1], [-1, 1], [0, 1], [0, 0]];
      rows.forEach(([a, b], y) => {
        for (let x = a; x <= b; x++) for (let z = -2; z <= 0; z++) {
          if (z === -2 && (y > 2 || x === a || x === b)) continue;
          let c = skin(x, y, z);
          if (kind === 'fox' && y >= 5) c = hex(def.earTip, 0x2a2028);
          else if (z === 0 && x > a && x < b && y <= rows.length - 3) c = ei;
          e.set(side < 0 ? -1 - x : x, y, z, c);
        }
      });
    } else if (kind === 'rabbit') {
      for (let y = 0; y < 9; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 0; z++) {
        if (y === 8 && x !== 0) continue;
        e.set(x, y, z, z === 0 && x === 0 && y > 0 && y < 8 ? ei : skin(x, y, z));
      }
    } else if (kind === 'deer') {
      for (let x = 0; x <= 4; x++) for (let y = -1; y <= 1; y++) { if (Math.abs(y) > 1.6 - Math.abs(x - 2) * 0.4) continue; e.set(x, y, 0, skin(x, y, 0)); e.set(x, y, 1, x > 0 && x < 4 && y === 0 ? ei : SK.l); }
      if (side < 0) return mirror(e);
    } else if (kind === 'monkey') {
      ell(e, 0, 0, 0, 1.4, 2.0, 1, (x, y, z) => (z >= 1 ? ei : skin(x, y, z)));
    } else { // round: tanuki, bear, otter
      const R = kind === 'otter' ? 1.5 : kind === 'bear' ? 2.0 : 1.8;
      ell(e, 0, 0, 0, R + 0.4, R + 0.2, 1, (x, y, z) => (z >= 1 && y <= 0 ? ei : kind === 'tanuki' ? SK.dd : skin(x, y, z)));
    }
    return e;
  };
  const ek = def.ears || ({ shiba: 'shiba', fox: 'fox', cat: 'cat', rabbit: 'rabbit', deer: 'deer', monkey: 'monkey', tanuki: 'round', bear: 'round', otter: 'otter' }[sp] || 'none');
  if (ek !== 'none') {
    const tall = ek === 'shiba' || ek === 'fox' || ek === 'cat' || ek === 'rabbit';
    const side = ek === 'deer' || ek === 'monkey';
    for (const s of [1, -1]) {
      const at = side ? [s > 0 ? 6.6 : -7.6, 7.5, -0.5] : tall ? [s * 3.6 - (s < 0 ? 0 : 0), 11, -1.2] : [s > 0 ? 4.6 : -5.6, 10.6, -1.5];
      out.ears.push({ model: earModel(ek === 'round' ? (sp === 'bear' ? 'bear' : 'tanuki') : ek, s), at, side: s, kind: ek, tilt: tall && ek !== 'rabbit' ? -s * 0.2 : ek === 'rabbit' ? -s * 0.08 : side ? -s * 0.2 : 0 });
    }
  }
  return out;
}

// ------------------------------------------------------------------ tails
function tailFor(def) {
  const kind = def.tail || 'none';
  if (kind === 'none') return [];
  const c = R3(hex(def.tailColor ?? def.skin, 0x8a6a4a)), tip = hex(def.tailTip, 0xf8f6f0);
  const seg = (fn) => { const v = new VoxelModel(); fn(v); return v; };
  if (kind === 'fox' || kind === 'tanuki') return [1.8, 2.4, 2.4, 1.9].map((r, i) => seg((v) => ell(v, 0, 0, -r, r, r * 0.92, r + 0.7, (x, y, z) => (kind === 'fox' && i === 3 ? tip : kind === 'tanuki' && i % 2 === 1 ? c.dd : y > r * 0.3 ? c.l : T3(c)(x, y, z)))));
  if (kind === 'shiba') return [seg((v) => { for (let a = 0; a <= 8; a++) { const th = (a / 8) * Math.PI * 1.4; const y = Math.round(Math.sin(th) * 2.4) + 1, z = -Math.round(Math.cos(th) * 2.4) - 1; for (let x = -1; x <= 0; x++) { v.set(x, y, z, a >= 7 ? tip : c.b); v.set(x, y, z - 1, c.d); } } })];
  if (kind === 'cat') return [0, 1, 2, 3].map((i) => seg((v) => { for (let z = 0; z >= -2; z--) { v.set(0, 0, z, i === 3 && z < -1 ? tip : c.b); v.set(-1, 0, z, c.d); } }));
  if (kind === 'otter') return [2, 1.6, 1.2, 0.9].map((r) => seg((v) => ell(v, 0, 0, -r * 1.5, r + 0.3, r * 0.8, r * 1.6, T3(c))));
  return [seg((v) => ell(v, 0, 0, -0.8, 1.3, 1.3, 1.4, kind === 'stub' ? c.b : tip))];
}

// ------------------------------------------------------------------ outfits (torso painters)
// torso box x -5..4, y -3..5, z -3..3 (front surface at z 4)
function outfitTorso(def) {
  const o = def.outfit || { kind: 'tee' };
  const C = R3(hex(o.color, 0xa0a0a0));
  const v = new VoxelModel();
  const base = T3(C);
  const belly = def.belly || 0;
  rbox(v, -5, 4, -3, 5, -3, 3, 1.8, (x, y, z) => (y >= 5 ? C.l : base(x, y, z)));
  if (belly) ell(v, -0.5, 1.4, 2.4, 4.6, 3.8, 1.8 + belly * 1.2, base);
  const front = (x, y, c) => v.set(x, y, 4 + (belly && y < 4 && y > -2 && Math.abs(x + 0.5) < 3 ? 1 : 0), c);
  switch (o.kind) {
    case 'tee': {
      for (let x = -2; x <= 1; x++) v.set(x, 5, 3, C.dd); // neckline
      if (o.print) { const P = R3(hex(o.printCol, 0xe8443a)); for (let x = -2; x <= 1; x++) for (let y = 1; y <= 3; y++) front(x, y, (x + y) % 3 === 0 ? P.l : P.b); }
      if (o.stripes) { const P = hex(o.printCol, 0xffffff); for (let x = -5; x <= 4; x++) for (let y = -2; y <= 4; y += 2) for (let z = -3; z <= 3; z++) if (v.has(x, y, z) && (z === 3 || z === -3 || x === -5 || x === 4)) v.set(x, y, z, P); }
      break;
    }
    case 'suit': {
      const S = hex(o.shirt, 0xf0f0f4), Ti = R3(hex(o.tie, 0xc83a3a));
      for (let y = 0; y <= 5; y++) { const w = Math.max(0, Math.round((y - 0) * 0.45)); for (let x = -1 - w; x <= w; x++) front(x, y, x === -1 || x === 0 ? (y >= 1 ? Ti.b : Ti.d) : S); }
      for (let y = -1; y <= 5; y++) for (const sx of [-1, 1]) front(Math.round(-0.5 + sx * (1.6 + Math.max(0, y) * 0.45)), y, C.dd); // lapels
      front(-1, -1, C.dd); front(-1, -2, 0xd8c070); // button
      v.set(3, 3, 4, S); // pocket square
      break;
    }
    case 'cardigan': {
      const S = hex(o.shirt, 0xf4ece0);
      for (let y = -2; y <= 5; y++) { front(-1, y, S); front(0, y, S); }
      for (const y of [-1, 1, 3]) front(1, y, 0xd8c8a8);
      for (let x = -5; x <= 4; x++) v.set(x, -3, 3, C.d); // ribbed hem
      break;
    }
    case 'kimono': {
      const P = hex(o.patCol, sh(C.b, 1.25)), OB = R3(hex(o.obi, 0xe8c060));
      for (let y = 0; y <= 5; y++) { const xe = Math.round(-0.5 + (y - 5) * 0.9 + 2); front(xe, y, 0xf8f4ec); front(xe + 1, y, C.dd); }
      for (const [x, y] of [[-4, 3], [2, 1], [-2, -1], [3, 4], [-3, 0]]) front(x, y, P);
      for (let x = -6; x <= 5; x++) for (let z = -4; z <= 4; z++) for (let y = -3; y <= -1; y++) { const d = ((x + 0.5) / 6) ** 2 + ((z + 0.5) / 4.3) ** 2; if (d <= 1.02 && d > 0.6) v.set(x, y, z, y === -2 && z >= 2 && o.cord != null ? hex(o.cord) : OB.b); }
      break;
    }
    case 'happi': {
      for (let y = -3; y <= 5; y++) { front(-2, y, 0x2a2a30); front(1, y, 0x2a2a30); } // dark collar band down the front
      for (let y = -3; y <= 0; y++) { front(-1, y, 0xf4f0e8); front(0, y, 0xf4f0e8); }
      for (let x = -4; x <= 3; x++) v.set(x, 2, -4, x % 2 ? 0xf4f0e8 : C.b); // a crest stripe on the back
      v.set(-1, 3, -4, 0xf4f0e8); v.set(0, 3, -4, 0xf4f0e8);
      break;
    }
    case 'apron': {
      const A = R3(hex(o.apron, 0x2a3a5a)), B = hex(o.base, 0xf4f0e8);
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 5; y++) for (let z = -3; z <= 3; z++) if (v.has(x, y, z)) v.set(x, y, z, T3(R3(B))(x, y, z));
      for (let x = -3; x <= 2; x++) for (let y = -3; y <= 3; y++) front(x, y, y === 3 ? A.l : A.b);
      for (const x of [-3, 2]) for (let y = 4; y <= 5; y++) front(x, y, A.d);
      for (let x = -2; x <= 1; x++) front(x, -1, A.d); // pocket
      break;
    }
    case 'sailor': {
      const N = R3(hex(o.collar, 0x27365e)), SC = hex(o.scarf, 0xd8343a);
      for (let y = 1; y <= 5; y++) for (const s of [-1, 1]) { const xe = Math.round(-0.5 + s * (1 + (y - 1) * 0.8)); front(xe, y, N.b); front(xe + s, y, y < 5 ? 0xffffff : N.b); }
      for (let x = -5; x <= 4; x++) for (let y = 1; y <= 5; y++) v.set(x, y, -4, x === -4 || x === 3 || y === 2 ? 0xffffff : N.b);
      for (let x = -2; x <= 1; x++) front(x, 2, SC); front(-1, 1, SC); front(0, 1, SC);
      break;
    }
    case 'dress': {
      const L = hex(o.lace, 0xfff4ec);
      for (let x = -3; x <= 2; x++) v.set(x, 5, 3, L);
      front(-1, 4, L); front(0, 4, L); front(-1, 1, 0xe8c060);
      break;
    }
    case 'hoodie': {
      for (let x = -3; x <= 2; x++) for (let y = -2; y <= 0; y++) front(x, y, y === 0 ? C.dd : C.d);
      for (const x of [-2, 1]) for (let y = 2; y <= 4; y++) front(x, y, 0xf4f0e8);
      rbox(v, -5, 4, 4, 7, -6, -3, 1.4, (x, y, z) => (y === 7 ? C.l : C.b)); // hood at the back
      break;
    }
    default: break;
  }
  return v;
}
function outfitPelvis(def) {
  const v = new VoxelModel();
  const P = R3(hex(def.pants ?? def.outfit?.color, 0x3a3a4a));
  rbox(v, -4, 3, -3, 0, -3, 2, 1.2, (x, y, z) => (y === 0 ? P.d : T3(P)(x, y, z)));
  if (def.skirt) {
    const S = R3(hex(def.skirt.color, 0x27365e)), L = def.skirt.len ?? 3, fl = (def.skirt.flare ?? 1) * 0.35;
    for (let y = -L; y <= 0; y++) {
      const f = -y * fl;
      for (let x = Math.floor(-5 - f); x <= Math.ceil(4 + f); x++) for (let z = Math.floor(-4 - f * 0.8); z <= Math.ceil(3 + f * 0.8); z++) {
        const dx = (x + 0.5) / (5 + f), dz = (z + 0.5) / (3.6 + f * 0.8), d = dx * dx + dz * dz;
        if (d > 1.05 || (d < 0.55 && y > -L)) continue;
        v.set(x, y, z, y === -L ? S.d : def.skirt.pleats && (Math.round(Math.atan2(dz, dx) * 4) & 1) ? S.d : S.b);
      }
    }
  }
  return v;
}
function legs(def) {
  const legC = R3(hex(def.shorts || def.skirt ? (def.legColor ?? def.skin) : (def.pants ?? def.outfit?.color), 0x3a3a4a));
  const thigh = new VoxelModel();
  rbox(thigh, -1, 1, -3, 0, -1, 1, 0.8, T3(legC));
  const shin = new VoxelModel();
  rbox(shin, -1, 0, -2, 0, -1, 0, 0.5, (x, y, z) => (def.socks != null && y <= -1 ? hex(def.socks) : T3(legC)(x, y, z)));
  const feet = def.feet || 'sneaker';
  const SH = R3(hex(def.shoe, feet === 'sneaker' ? 0xf4f0e8 : 0x3a2a24));
  if (feet === 'geta') {
    for (let x = -1; x <= 0; x++) for (let z = -1; z <= 1; z++) shin.set(x, -2, z, 0xf4f2ec);
    for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) shin.set(x, -3, z, z === 3 ? 0xc89a68 : 0xb88a58);
    for (let x = -2; x <= 1; x++) { shin.set(x, -4, -1, 0x8e6640); shin.set(x, -4, 2, 0x8e6640); }
    shin.set(-1, -2, 2, 0xc83a32); shin.set(0, -2, 2, 0xc83a32);
  } else {
    for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) { shin.set(x, -3, z, feet === 'sneaker' ? (z === 3 ? SH.d : 0xe8e0d4) : SH.d); if (z < 3) shin.set(x, -2, z, SH.b); }
    if (feet === 'sneaker' && def.shoeStripe != null) for (const x of [-2, 1]) shin.set(x, -2, 0, hex(def.shoeStripe));
  }
  return { thigh, shin, hipY: feet === 'geta' ? 7 : 6 };
}
function arms(def) {
  const S = R3(hex(def.sleeve ?? def.outfit?.color, 0xa0a0a0)), SK = R3(hex(def.skin, 0xc8945e));
  const len = def.sleeveLen ?? 1;
  const wide = def.wideSleeves;
  const upper = new VoxelModel();
  rbox(upper, -1, 1, -3, 1, -1, 1, 0.9, (x, y, z) => (len <= 0 ? T3(SK)(x, y, z) : y >= 0 ? S.l : T3(S)(x, y, z)));
  if (wide) rbox(upper, -2, 2, -5, -1, -2, 3, 1.1, (x, y, z) => (y === -5 ? S.d : T3(S)(x, y, z)));
  const fore = new VoxelModel();
  rbox(fore, -1, 1, -3, 0, -1, 1, 0.8, (x, y, z) => (len >= 0.9 ? (y === -3 ? hex(def.cuff, S.d) : T3(S)(x, y, z)) : T3(SK)(x, y, z)));
  return { upper, fore };
}
function hatModel(h) {
  if (!h) return null;
  const v = new VoxelModel();
  const c = hex(h.color, 0x3a6ab0);
  if (h.type === 'cap') {
    for (let x = -6; x <= 5; x++) for (let z = -5; z <= 4; z++) { const d = ((x + 0.5) / 6) ** 2 + ((z + 0.5) / 5.2) ** 2; if (d > 1) continue; v.set(x, 0, z, c); v.set(x, 1, z, d < 0.7 ? sh(c, 1.08) : c); if (d < 0.4) v.set(x, 2, z, sh(c, 1.1)); }
    for (let x = -4; x <= 3; x++) for (let z = 5; z <= 7; z++) v.set(x, 0, z, hex(h.brim, sh(c, 0.8)));
    v.set(-1, 3, 0, sh(c, 0.85)); v.set(0, 3, 0, sh(c, 0.85));
  } else if (h.type === 'straw') return strawHat({ R: 8, h: 4, band: hex(h.band, 0x8a3a2a) });
  else if (h.type === 'beanie') {
    for (let x = -6; x <= 5; x++) for (let z = -5; z <= 4; z++) for (let y = -1; y <= 3; y++) { const d = ((x + 0.5) / 6.4) ** 2 + ((z + 0.5) / 5.6) ** 2 + Math.max(0, y) ** 2 / 14; if (d > 1) continue; if (d < 0.75 && y < 3) continue; v.set(x, y, z, y <= 0 ? sh(c, 0.85) : (x & 1) ? sh(c, 0.94) : c); }
    ell(v, -0.5, 4.2, -0.5, 1.6, 1.4, 1.6, hex(h.pom, 0xf8f4ec));
  } else if (h.type === 'kindergarten') {
    for (let x = -7; x <= 6; x++) for (let z = -7; z <= 6; z++) { const d = Math.hypot(x + 0.5, z + 0.5); if (d <= 7) v.set(x, 0, z, c); if (d <= 5) { v.set(x, 1, z, c); v.set(x, 2, z, sh(c, 1.08)); } }
  } else if (h.type === 'kerchief') {
    for (let x = -7; x <= 6; x++) for (let z = -6; z <= 5; z++) { const d = ((x + 0.5) / 7) ** 2 + ((z + 0.5) / 6.2) ** 2; if (d <= 1) v.set(x, 0, z, (x + z) % 4 === 0 ? 0xf8f4ec : c); }
    v.set(-1, -1, -7, c); v.set(0, -2, -7, c);
  } else if (h.type === 'hairband') {
    for (let x = -7; x <= 6; x++) v.set(x, 0, 0, c);
  }
  return v;
}

// ------------------------------------------------------------------ the design
export function folkDesign(def) {
  const C = [0.5, 0, 0.5];
  const H = speciesHead(def);
  const L = legs(def);
  const A = arms(def);
  const SK = R3(hex(def.skin, 0xc8945e));
  const hands = {};
  for (const k of ['relax', 'fist', 'open', 'point']) hands[k] = [1, -1].map((s) => ({ model: hand(k, s, T3(SK), { w: 1, pad: SK.dd }), pivot: C }));
  const extras = [];
  const hat = hatModel(def.hat);
  if (hat) extras.push({ joint: 'head', model: hat, at: [0, def.hat.type === 'straw' ? 11.4 : 11.6, def.hat.type === 'kerchief' ? -0.5 : 0], rot: [-0.06, 0, 0], name: 'hat' });
  if (def.glasses) extras.push({ joint: 'head', model: roundGlasses({ frame: hex(def.glasses.frame, 0x2a2a2a), dx: 6.5, r: 4.5, temples: 12 }), scale: FV, at: [0, 6.35, 6.6], name: 'glasses', shadow: false });
  if (H.whiskers) { const w = new VoxelModel(); for (const s of [-1, 1]) for (const dy of [0, -2]) line3(w, [s * 5, dy, 0], [s * 10, dy + (dy === 0 ? 1 : -1), -1], 0xe8e0d8); extras.push({ joint: 'head', model: w, scale: FV, at: [-0.5, 2.6, 6.4], name: 'whiskers', shadow: false }); }
  const kid = def.kid || (def.scale ?? 1) < 0.72;
  return {
    dims: { hipY: L.hipY, hipX: 1.8, thigh: 3, chestY: 6, shoulderX: 5.2, shoulderY: -1.5, upper: 3, fore: 3, grip: 2.4, neckY: 0.2, neckZ: 0.2, headScale: kid ? 1.22 : 1.06, tail: [-2.5, -3.2], tailTilt: def.tail === 'fox' || def.tail === 'tanuki' ? 0.7 : def.tail === 'cat' ? 0.9 : 0.4, carry: [3, 6], blob: 0.62 + (def.belly ? 0.1 : 0) },
    pelvis: outfitPelvis(def), torso: outfitTorso(def),
    thigh: { model: L.thigh, pivot: C }, shin: L.shin,
    upper: { model: A.upper, pivot: C }, fore: { model: A.fore, pivot: C },
    hands,
    head: H.model,
    ears: H.ears,
    tail: tailFor(def),
    extras,
    face: {
      box: { x0: -7, x1: 6, y0: 0, y1: 11 }, faceZ: 6, lift: 0.2,
      snout: H.snout,
      cfg: {
        eyeStyle: 'gloss', eyeW: kid ? 6 : 5, eyeH: kid ? 7 : 6, eyeY: 21, eyeDX: 13,
        iris: '#2a1c14', irisLight: '#8a5a34', pupil: '#160c10', lash: '#24161a', lid: '#24161a',
        brow: '#' + sh(SK.b, 0.6).toString(16).padStart(6, '0'), browY: 12, browW: 5, browThick: 1,
        blushCol: '#ff8a96', blushY: 29, blushDX: 17,
        mouthCol: '#3a1a1a', mouthW: 8, mouthY: 33,
        ...(H.face || {}),
        ...(def.face || {}),
        eyeStyle: (def.face?.eyeStyle && def.face.eyeStyle !== 'anime' && def.face.eyeStyle !== 'bead' && def.face.eyeStyle !== 'dot') ? def.face.eyeStyle : 'gloss',
      },
    },
  };
}
