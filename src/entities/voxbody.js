// Voxel body parts for the chibi cast, in The Bear Must Eat's style: 0.05 m
// voxels, rounded boxes, per-voxel colour noise ("tone"), grain shading and
// a 2D pixel face on a flat plane at the front of a big voxel head.
//
// Units here are voxels (VS = 0.05 m). Every part is built around its joint
// pivot (limbs hang down along -y from y = 0), character facing +z.
import * as THREE from 'three';
import { VS, VoxelModel, rbox, ell, tone, hash3, buildGeo, matFor } from '../vox/kit.js';

export { VS };
const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const sh = (c, f) => { c = hex(c); const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f)); return (r << 16) | (g << 8) | b; };
const mixc = (a, b, t) => { a = hex(a); b = hex(b); const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t), g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t); return (r << 16) | (g << 8) | bl; };
export { hex, sh, mixc, rbox as rboxFn };
// textured colour: base with a few darker / lighter voxels
const tx = (base, d = 0.12, l = 0.08) => { const B = hex(base), D = sh(B, 0.86), L = sh(B, 1.12); return (x, y, z) => tone(x, y, z, B, D, L, d, l); };

// ---------------------------------------------------------------- dimensions
// (voxels) — kept in one place so the rig can place joints
export const DIM = {
  head: { x0: -6, x1: 5, y0: 0, y1: 10, z0: -5, z1: 5, r: 2.2 },
  torso: { x0: -4, x1: 3, y0: 0, y1: 6, z0: -3, z1: 2, r: 1.6 },
  pelvis: { x0: -4, x1: 3, y0: -2, y1: 0, z0: -3, z1: 2 },
  hipY: 6.5, hipX: 2, thigh: 3, shin: 3.5, shoulderX: 4.6, shoulderY: 5.6, upper: 3, fore: 3, neckY: 7,
};

// ---------------------------------------------------------------- species heads
// returns { model, faceZ, snoutZ (front of the snout, for the mouth plane), mouthY, ears: [{model, at:[x,y,z], side}] }
export function buildHead(def) {
  const H = DIM.head, v = new VoxelModel();
  const sp = def.species || 'turtle';
  const skin = hex(def.skin || 0x8ac070), skinF = tx(skin, 0.14, 0.08);
  const lightC = hex(def.light ?? sh(skin, 1.25));
  const out = { model: v, faceZ: H.z1 + 1, snout: null, ears: [], extras: [] };
  let x0 = H.x0, x1 = H.x1, y0 = H.y0, y1 = H.y1, z0 = H.z0, z1 = H.z1, r = H.r;
  if (sp === 'crab') { x0 = -7; x1 = 6; y1 = 8; r = 2.6; }
  if (sp === 'tengu' || sp === 'bear' || sp === 'tanuki') { x0 -= 0; }
  if (sp === 'crane') { y1 = 11; x0 = -5; x1 = 4; }
  out.box = { x0, x1, y0, y1, z0, z1 };
  // base head with species colouring
  rbox(v, x0, x1, y0, y1, z0, z1, r, (x, y, z) => {
    const front = z >= z1 - 1;
    const low = y <= y0 + 3;
    switch (sp) {
      case 'turtle': {
        // pond turtle: lighter jaw/throat, yellow stripes along the sides of the head, faint scales on top
        if (low && z >= z0 + 3) return tone(x, y, z, lightC, sh(lightC, 0.92), sh(lightC, 1.06), 0.1, 0.06);
        if ((x <= x0 + 0.5 || x >= x1 - 0.5) && (y === 4 || y === 6) && z < z1 - 1) return hex(def.stripe ?? 0xd8d070);
        if (y >= y1 - 1 && (x + z) % 3 === 0) return sh(skin, 0.9);
        return skinF(x, y, z);
      }
      case 'fox': case 'shiba': {
        const muzzle = hex(def.light ?? 0xfff4e8);
        if (low && z >= z1 - 3 && Math.abs(x + 0.5) < 4.5) return muzzle; // white cheeks / chin
        if (y >= y1 - 1 && Math.abs(x + 0.5) < 2) return sh(skin, 0.92);
        return skinF(x, y, z);
      }
      case 'otter': {
        if (low && z >= z1 - 4 && Math.abs(x + 0.5) < 5) return hex(def.light ?? 0xe8d0b4);
        return skinF(x, y, z);
      }
      case 'tanuki': {
        if (low && z >= z1 - 3 && Math.abs(x + 0.5) < 4) return hex(def.light ?? 0xe8dcc8);
        return skinF(x, y, z);
      }
      case 'crab': {
        if (y >= y1 - 1 && hash3(x, y, z) < 0.18) return sh(skin, 1.15); // speckles on the carapace
        if (y <= y0 + 1 && z >= z0 + 2) return hex(def.light ?? 0xf8c0a8);
        return skinF(x, y, z);
      }
      case 'tengu': return skinF(x, y, z);
      case 'kappa': {
        if (low && z >= z1 - 2) return hex(def.light ?? 0xc8e0a0);
        return skinF(x, y, z);
      }
      case 'rabbit': case 'cat': case 'bear': case 'deer': case 'monkey': case 'crane': default: {
        if (def.light != null && low && z >= z1 - 2 && Math.abs(x + 0.5) < 4) return hex(def.light);
        return skinF(x, y, z);
      }
    }
  });
  const cz = z1; // front surface row
  // ---- snouts / beaks / noses
  const snout = (w, h, d, yb, col, noseCol) => {
    const xa = -Math.ceil(w / 2), xb = Math.floor(w / 2) - 1;
    rbox(v, xa, xb, yb, yb + h - 1, cz + 1, cz + d, 0.8, tx(col, 0.06, 0.06));
    if (noseCol != null) { v.set(-1, yb + h - 1, cz + d + 1, hex(noseCol)); v.set(0, yb + h - 1, cz + d + 1, sh(hex(noseCol), 1.35)); }
    out.snout = { z: cz + d + 1, y: yb, h };
  };
  switch (sp) {
    case 'fox': snout(6, 3, 3, 1, def.light ?? 0xfff4e8, def.nose ?? 0x2a1a20); break;
    case 'shiba': snout(6, 3, 2, 1, def.light ?? 0xfff4e8, def.nose ?? 0x2a1a20); break;
    case 'otter': snout(7, 3, 2, 1, def.light ?? 0xe8d0b4, def.nose ?? 0x2a1a18); break;
    case 'tanuki': snout(6, 3, 2, 1, def.light ?? 0xe8dcc8, def.nose ?? 0x1a1410); break;
    case 'deer': snout(6, 3, 3, 1, def.light ?? 0xe8c8a0, def.nose ?? 0x2a1a1a); break;
    case 'bear': snout(6, 3, 2, 1, def.light ?? 0xc8a880, def.nose ?? 0x1a1010); break;
    case 'kappa': { // yellow beak
      const bk = hex(def.beak ?? 0xe8c040);
      rbox(v, -3, 2, 1, 3, cz + 1, cz + 3, 0.9, (x, y, z) => (y === 1 ? sh(bk, 0.85) : bk));
      v.set(-1, 3, cz + 3, sh(bk, 1.1)); v.set(0, 3, cz + 3, sh(bk, 1.1));
      out.snout = { z: cz + 4, y: 1, h: 3, beak: true };
      break;
    }
    case 'tengu': { // the long red nose
      const nc = hex(def.noseCol ?? sh(skin, 1.05));
      for (let k = 1; k <= (def.noseLen ?? 7); k++) {
        const w = k < 3 ? 1 : 0;
        for (let x = -1 - w; x <= w; x++) for (let y = 4 - w; y <= 5 + (k < 2 ? 1 : 0); y++) v.set(x, y - Math.floor(k / 4), cz + k, k === (def.noseLen ?? 7) ? sh(nc, 1.12) : tone(x, y, k, nc, sh(nc, 0.9), sh(nc, 1.1), 0.1, 0.1));
      }
      break;
    }
    case 'crane': { // long beak + red crown
      for (let k = 1; k <= 5; k++) { v.set(-1, 3, cz + k, 0x3a3a3a); v.set(0, 3, cz + k, 0x4a4a4a); if (k < 4) { v.set(-1, 4, cz + k, 0x3a3a3a); v.set(0, 4, cz + k, 0x3a3a3a); } }
      for (let x = -2; x <= 1; x++) for (let z = -1; z <= 2; z++) v.set(x, y1 + 1, z, 0xe8443a);
      break;
    }
    default: break;
  }
  // ---- species extras on the head
  if (sp === 'kappa') { // head dish with water + hair fringe
    const top = y1 + 1;
    for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d <= 4.2) v.set(x, top, z, d > 3.2 ? 0xf0ece0 : 0x8ad0f0);
      if (d > 3.2 && d <= 4.2) v.set(x, top + 1, z, 0xf0ece0);
    }
    const hair = hex(def.hairColor ?? 0x2a5a3a);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d > 4.2 && d < 7 && (x + z) % 2 === 0) for (let y = y1 - 2; y <= y1 + (hash3(x, 1, z) > 0.5 ? 1 : 0); y++) if (!(z >= z1 - 1 && y < y1)) v.set(x, y, z, hash3(x, y, z) > 0.6 ? sh(hair, 1.2) : hair);
    }
  }
  if (sp === 'tengu') { // tokin cap + big white mane + beard
    const hair = hex(def.hairColor ?? 0xf4f2f0);
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let y = y0 - 1; y <= y1 + 1; y++) for (let z = z0 - 2; z <= z1 - 3; z++) {
      if (v.has(x, y, z)) continue;
      const dx = (x + 0.5) / 8, dy = (y - 5) / 7.5, dz = (z + 1.5) / 7;
      if (dx * dx + dy * dy + dz * dz <= 1 && hash3(x, y, z) < 0.92) v.set(x, y, z, hash3(x, y, z) > 0.7 ? sh(hair, 0.9) : hair);
    }
    for (let x = -4; x <= 3; x++) for (let y = -4; y <= 1; y++) { const w = 4 - Math.max(0, -y) * 0.6; if (Math.abs(x + 0.5) < w) v.set(x, y, cz - 1, (x + y) % 3 === 0 ? sh(hair, 0.9) : hair); }
    for (let x = -2; x <= 1; x++) for (let z = 0; z <= 3; z++) { v.set(x, y1 + 1, z, 0x1a1a22); if (Math.abs(x + 0.5) < 1 && z > 0 && z < 3) v.set(x, y1 + 2, z, 0x2a2a34); }
  }
  if (sp === 'crab') { // eye stalks + bead tips
    for (const sx of [-4, 3]) { v.set(sx, y1 + 1, cz - 2, sh(skin, 1.05)); v.set(sx, y1 + 2, cz - 2, sh(skin, 1.05)); v.set(sx, y1 + 3, cz - 2, 0x2a1a24); v.set(sx, y1 + 3, cz - 1, 0x3a2a34); }
    for (let x = x0; x <= x1; x++) v.set(x, y0 + 4, z0, sh(skin, 0.8));
  }
  // ---- ears
  const ear = (kind) => {
    const L = new VoxelModel();
    const ec = hex(def.earColor ?? skin), ei = hex(def.earInner ?? sh(skin, 1.3));
    if (kind === 'fox' || kind === 'shiba' || kind === 'cat') {
      const hgt = kind === 'fox' ? 6 : kind === 'cat' ? 4 : 5, w = kind === 'fox' ? 3 : 3;
      for (let y = 0; y < hgt; y++) {
        const ww = Math.max(0, Math.round(w * (1 - y / hgt)));
        for (let x = -ww; x <= ww; x++) for (let z = 0; z <= 1; z++) {
          const inner = z === 1 && Math.abs(x) < ww && y < hgt - 2;
          const tip = kind === 'fox' && y >= hgt - 2;
          L.set(x, y, z, tip ? hex(def.earTip ?? 0x2a2028) : inner ? ei : ec);
        }
      }
    } else if (kind === 'rabbit') {
      for (let y = 0; y < 9; y++) for (let x = -1; x <= 1; x++) for (let z = 0; z <= 1; z++) L.set(x, y, z, z === 1 && x === 0 && y > 0 && y < 8 ? ei : ec);
    } else if (kind === 'deer') {
      for (let x = 0; x < 4; x++) for (let y = -1; y <= 1; y++) if (Math.abs(y) < 2 - x * 0.3) { L.set(x, y, 0, ec); L.set(x, y, 1, x > 0 && y === 0 ? ei : ec); }
    } else { // round (otter, tanuki, bear, monkey)
      const R = kind === 'otter' ? 1.3 : kind === 'monkey' ? 1.6 : 1.8;
      ell(L, 0, 0, 0, R + 0.5, R + 0.5, 1, ec);
      ell(L, 0, 0, 1, R - 0.3, R - 0.3, 0.6, ei);
    }
    return L;
  };
  const ek = def.ears || 'none';
  if (ek !== 'none') {
    const ex = ek === 'monkey' || ek === 'deer' ? x1 + 1 : ek === 'otter' ? x1 - 1 : x1 - 2;
    const ey = ek === 'monkey' || ek === 'deer' ? 6 : y1 - (ek === 'otter' ? 0 : 1);
    for (const side of [1, -1]) {
      let m = ear(ek);
      if (side < 0 && (ek === 'deer')) { const mm = new VoxelModel(); for (const [k, c] of m.vox) { const x = (k & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = ((k >> 20) & 1023) - 512; mm.set(-x - 1, y, z, c); } m = mm; }
      out.ears.push({ model: m, at: [side > 0 ? ex + 0.5 : -(ex + 0.5), ey, -1], side, kind: ek });
    }
  }
  return out;
}

// ---------------------------------------------------------------- outfits
// Painter for the torso: (x, y, z) -> colour; the torso box is DIM.torso
// (front at z = 2, back at z = -3, x from -4..3, y from 0 (waist) .. 6 (shoulders)).
const T = DIM.torso;
const isFront = (z) => z >= T.z1;
const isBack = (z) => z <= T.z0;
export const OUTFITS = {
  hoodie: (o) => {
    const c = hex(o.color ?? 0x4c5b84), cd = sh(c, 0.82), ac = hex(o.accent ?? 0xefe6d2);
    return (x, y, z) => {
      if (y === 0) return cd; // ribbed hem
      if (isFront(z) && y >= 1 && y <= 2 && x >= -3 && x <= 2) return y === 2 ? sh(c, 0.9) : sh(c, 0.94); // kangaroo pocket
      if (isFront(z) && y >= 4 && y <= 5 && (x === -2 || x === 1)) return ac; // drawstrings
      if (isFront(z) && y === 3 && (x === -1 || x === 0)) return ac; // tiny chest print
      if (isBack(z) && y >= 4) return sh(c, 0.88); // hood bunched at the back
      if (y === 6 && Math.abs(x + 0.5) < 2) return cd; // neckline
      return tone(x, y, z, c, sh(c, 0.94), sh(c, 1.05), 0.12, 0.06);
    };
  },
  tee: (o) => {
    const c = hex(o.color ?? 0xf4f0e8), p = hex(o.printCol ?? 0xe8443a);
    return (x, y, z) => {
      if (y === 6 && Math.abs(x + 0.5) < 2 && z >= 0) return sh(c, 0.85);
      if (o.stripes && y % 2 === 0) return p;
      if (o.print && isFront(z) && y >= 2 && y <= 4 && x >= -2 && x <= 1) return (x + y) % 2 ? p : sh(p, 1.15);
      return tone(x, y, z, c, sh(c, 0.95), c, 0.1, 0);
    };
  },
  samue: (o) => { // indigo work jacket, crossed collar
    const c = hex(o.color ?? 0x2f3e66), tie = hex(o.tie ?? 0xe8dcc0);
    return (x, y, z) => {
      if (isFront(z) && y >= 2 && (x === Math.round(6 - y) - 3 || x === Math.round(y - 6) + 2)) return sh(c, 0.7); // collar edges
      if (isFront(z) && y === 3 && x === 2) return tie;
      if (y === 0) return sh(c, 0.8);
      return tone(x, y, z, c, sh(c, 0.9), sh(c, 1.1), 0.18, 0.08);
    };
  },
  cardigan: (o) => {
    const c = hex(o.color ?? 0x8a6a4a), s = hex(o.shirt ?? 0xe8dcc0), b = hex(o.buttons ?? 0xd8b060);
    return (x, y, z) => {
      if (isFront(z) && (x === -1 || x === 0) && y >= 3) return s;
      if (isFront(z) && x === -1 && y < 3 && y % 2 === 1) return b;
      if (y === 0) return sh(c, 0.85);
      return (x + 20) % 2 === 0 ? sh(c, 0.94) : c; // knit ribs
    };
  },
  kimono: (o) => {
    const c = hex(o.color ?? 0xc84a3a), pc = hex(o.patCol ?? 0xf0d8a0), obi = hex(o.obi ?? 0x2a2a48), cord = hex(o.cord ?? 0xe8c060);
    return (x, y, z) => {
      if (y >= 1 && y <= 2) return y === 2 && isFront(z) ? cord : obi;
      if (isBack(z) && y >= 1 && y <= 3 && Math.abs(x + 0.5) < 3) return obi; // bow
      if (isFront(z) && y >= 3 && (x === Math.round((y - 6) * 0.8) || x === -Math.round((y - 6) * 0.8) - 1)) return 0xf4ece0; // white collar V
      if ((x * 3 + y * 5 + z * 7) % 9 === 0) return pc; // pattern flecks
      return tone(x, y, z, c, sh(c, 0.92), sh(c, 1.06), 0.1, 0.05);
    };
  },
  happi: (o) => {
    const c = hex(o.color ?? 0x2a4a8a), band = hex(o.band ?? 0xf4ece0);
    return (x, y, z) => {
      if (isFront(z) && (x === -2 || x === 1)) return band;
      if (y === 0) return band;
      if (isBack(z) && y >= 2 && y <= 5 && Math.abs(x + 0.5) < 2.5) return (x + y) % 2 ? band : sh(band, 0.9); // crest
      return tone(x, y, z, c, sh(c, 0.9), sh(c, 1.08), 0.1, 0.05);
    };
  },
  apron: (o) => {
    const base = OUTFITS.tee({ color: o.base ?? 0xf4f0e8 });
    const a = hex(o.apron ?? 0x2a3a5a);
    return (x, y, z) => {
      if (isFront(z) && Math.abs(x + 0.5) < 3.2) return y === 2 && Math.abs(x + 0.5) < 2 ? sh(a, 0.85) : a;
      if (y === 1) return a; // tie strings around
      return base(x, y, z);
    };
  },
  waitress: (o) => {
    const d = hex(o.dress ?? 0xd8342e), w = 0xffffff;
    return (x, y, z) => {
      if (y === 6 && z >= -1) return w; // round collar
      if (isFront(z) && Math.abs(x + 0.5) < 2.5 && y <= 5) return y === 4 && x === 1 ? 0xe8c040 : w; // apron bib + name pin
      if (y === 1) return w; // apron ties
      if (isBack(z) && y === 1 && Math.abs(x + 0.5) < 2) return w;
      return (x + 20) % 3 === 0 ? sh(d, 1.15) : d; // candy stripes
    };
  },
  sailor: (o) => {
    const c = hex(o.color ?? 0xf4f2f2), col = hex(o.collar ?? 0x27365e), sc = hex(o.scarf ?? 0xd8343a);
    return (x, y, z) => {
      if (isBack(z) && y >= 3) return y === 3 ? c : col; // big square collar at the back
      if (isFront(z) && y >= 4 && (Math.abs(x + 0.5) > 5.5 - y * 0.5)) return col;
      if (isFront(z) && y >= 2 && y <= 4 && Math.abs(x + 0.5) < 1.5) return sc; // scarf
      if (y === 0) return sh(c, 0.9);
      return c;
    };
  },
  suit: (o) => {
    const c = hex(o.color ?? 0x3a3a48), s = hex(o.shirt ?? 0xf0f0f4), t = hex(o.tie ?? 0xc83a3a);
    return (x, y, z) => {
      if (isFront(z) && Math.abs(x + 0.5) < (y - 1) * 0.45) return Math.abs(x + 0.5) < 0.6 ? t : s;
      return tone(x, y, z, c, sh(c, 0.92), c, 0.1, 0);
    };
  },
  attendant: (o) => {
    const v = hex(o.vest ?? 0xe8648a), s = 0xffffff, sc = hex(o.scarf ?? 0x2a9ab0);
    return (x, y, z) => {
      if (isFront(z) && Math.abs(x + 0.5) < (y - 2) * 0.5) return y >= 5 ? sc : s;
      if (y === 6 && isFront(z)) return sc;
      if (isFront(z) && y === 4 && x === 2) return 0xfff6d8; // name badge
      return v;
    };
  },
  chef: (o) => {
    const c = hex(o.color ?? 0xfbfaf6), sc = hex(o.scarf ?? 0xd8342e);
    return (x, y, z) => {
      if (y === 6) return sc;
      if (isFront(z) && (x === -2 || x === 1) && y % 2 === 1) return 0xc8c0b8; // buttons
      return tone(x, y, z, c, sh(c, 0.96), c, 0.1, 0);
    };
  },
  yamabushi: (o) => {
    const c = hex(o.color ?? 0xf2ece0), pom = hex(o.pom ?? 0x2a6a5a);
    return (x, y, z) => {
      if (isFront(z) && (x === -3 || x === 2) && (y === 2 || y === 4)) return pom; // bonbon pompoms
      if (isFront(z) && Math.abs(x + 0.5) < 0.6 && y === 1) return pom;
      if ((x + y * 2 + z) % 4 === 0) return sh(c, 0.9);
      return c;
    };
  },
  dress: (o) => {
    const c = hex(o.color ?? 0xc84a5a), lace = hex(o.lace ?? 0xfff4ec);
    return (x, y, z) => {
      if (y === 6 || (y === 5 && isFront(z) && Math.abs(x + 0.5) < 2)) return lace;
      if (isFront(z) && y === 4 && Math.abs(x + 0.5) < 0.6) return 0xe8c060;
      return c;
    };
  },
  plain: (o) => { const c = hex(o.color ?? 0xa0a0a0); return (x, y, z) => (o.belt && y === 0 ? hex(o.belt) : tone(x, y, z, c, sh(c, 0.92), sh(c, 1.06), 0.12, 0.06)); },
  bare: (o) => tx(o.color ?? 0x8ac070),
};

function shirtFn(def) {
  const o = def.outfit || { kind: 'plain', color: def.skin };
  const fn = (OUTFITS[o.kind] || OUTFITS.plain)(o);
  return fn;
}

// ---------------------------------------------------------------- body parts
export function buildTorso(def) {
  const v = new VoxelModel();
  const fn = shirtFn(def);
  const belly = def.belly || 0;
  rbox(v, T.x0, T.x1, T.y0, T.y1, T.z0, T.z1, T.r, fn);
  if (belly) ell(v, -0.0, 2.8, 2.2, 4.0, 3.2, 1.6 + belly * 1.6, (x, y, z) => fn(x, y, Math.max(z, T.z1)));
  return v;
}
export function buildPelvis(def) {
  const v = new VoxelModel();
  const p = hex(def.pants ?? def.skin ?? 0x3a3a4a);
  rbox(v, T.x0, T.x1, -2, 0, T.z0, T.z1, 1.2, tx(p, 0.1, 0.05));
  if (def.skirt) {
    const sk = def.skirt, c = hex(sk.color ?? 0x27365e), L = sk.len ?? 4, fl = sk.flare ?? 1.5;
    for (let y = -L; y <= 0; y++) {
      const t = (0 - y) / L, rx = 4.2 + t * fl, rz = 3.2 + t * fl * 0.8;
      for (let x = -Math.ceil(rx) - 1; x <= Math.ceil(rx); x++) for (let z = -Math.ceil(rz) - 1; z <= Math.ceil(rz); z++) {
        const d = ((x + 0.5) / rx) ** 2 + ((z + 0.5) / rz) ** 2;
        if (d <= 1 && d > 0.45) v.set(x, y, z, sk.pleats && (x + 20) % 2 === 0 ? sh(c, 0.85) : y === -L ? sh(c, 0.85) : c);
      }
    }
  }
  return v;
}
export function buildUpperArm(def) {
  const v = new VoxelModel();
  const c = def.sleeveLen === 0 ? hex(def.skin) : hex(def.sleeve ?? def.skin);
  rbox(v, -1, 1, -DIM.upper, 0, -1, 1, 0.8, tx(c, 0.1, 0.05));
  if (def.wideSleeves) rbox(v, -2, 2, -DIM.upper - 2, -1, -2, 1, 0.6, (x, y, z) => tone(x, y, z, hex(def.sleeve), sh(hex(def.sleeve), 0.9), hex(def.sleeve), 0.08, 0));
  return v;
}
export function buildForeArm(def) {
  const v = new VoxelModel();
  const short = (def.sleeveLen ?? 1) < 0.6;
  const c = short ? hex(def.skin) : hex(def.sleeve ?? def.skin);
  rbox(v, -1, 1, -DIM.fore, 0, -1, 1, 0.8, (x, y, z) => (!short && def.cuff != null && y <= -DIM.fore + 1 ? hex(def.cuff) : tx(c, 0.1, 0.05)(x, y, z)));
  return v;
}
export function buildHand(def, side) {
  const v = new VoxelModel();
  const c = hex(def.handColor ?? def.skin);
  if (def.hands === 'claw') {
    rbox(v, -2, 1, -3, 0, -1, 2, 0.8, tx(c, 0.08, 0.1));
    for (let z = 2; z <= 4; z++) { v.set(-2, -2, z, c); v.set(-1, -2, z, c); v.set(0, -1, z, sh(c, 1.1)); v.set(1, -1, z, sh(c, 1.1)); }
    v.set(-1, -3, 4, sh(c, 0.85)); v.set(0, 0, 4, sh(c, 1.2));
    return v;
  }
  rbox(v, -1, 1, -2, 0, -1, 1, 0.9, c);
  v.set(side > 0 ? -2 : 2, -1, 1, c); // thumb
  if (def.hands === 'webbed') { v.set(0, -3, 0, sh(c, 1.15)); v.set(-1, -3, 1, sh(c, 1.15)); v.set(1, -3, 1, sh(c, 1.15)); }
  return v;
}
export function buildThigh(def) {
  const v = new VoxelModel();
  const c = def.shorts || def.skirt ? hex(def.legColor ?? def.skin) : hex(def.pants ?? def.skin);
  rbox(v, -1, 1, -2, 0, -1, 1, 0.8, tx(c, 0.1, 0.05));
  return v;
}
export function buildShin(def) {
  const v = new VoxelModel();
  const leg = def.shorts || def.skirt ? hex(def.legColor ?? def.skin) : hex(def.pants ?? def.skin);
  const S = 2;
  rbox(v, -1, 1, -S + 1, 0, -1, 1, 0.7, (x, y, z) => (def.socks != null && y <= -S + 3 ? hex(def.socks) : tx(leg, 0.1, 0.05)(x, y, z)));
  // feet / shoes
  const sc = hex(def.shoe ?? 0xf2efe8);
  const feet = def.feet || 'sneaker';
  if (feet === 'geta') {
    const wood = hex(def.shoe ?? 0xa87a4a);
    rbox(v, -1, 1, -S - 1, -S, -1, 2, 0.4, hex(def.legColor ?? def.skin));
    for (let x = -2; x <= 1; x++) for (let z = -2; z <= 3; z++) v.set(x, -S - 2, z, wood);
    for (let x = -2; x <= 1; x++) { v.set(x, -S - 3, -1, sh(wood, 0.8)); v.set(x, -S - 3, 2, sh(wood, 0.8)); }
    v.set(0, -S - 1, 2, 0xc83a3a); // hanao strap
  } else {
    rbox(v, -2, 1, -S - 2, -S, -2, 3, 0.8, (x, y, z) => (y === -S - 2 ? (feet === 'sneaker' ? 0xf8f4ec : sh(sc, 0.7)) : def.shoeStripe != null && y === -S - 1 && z < 3 ? hex(def.shoeStripe) : sc));
  }
  return v;
}
export function buildShell(def) {
  const s = def.shell;
  const v = new VoxelModel();
  const base = hex(s.base ?? 0x8a7046), seam = hex(s.seam ?? 0x4a361e), light = hex(s.light ?? 0xae965a), rim = hex(s.rim ?? 0x6a5230);
  const CZ = 0, CY = 3.5;
  const cell = (x, y, z) => { const ring = Math.floor((y + 3) / 3.6); const th = Math.atan2(x + 0.5, -(z + 0.5 - CZ)) * (2.2 / Math.PI) + (ring % 2) * 0.5; return ring * 100 + Math.floor(th + 10); };
  const col = (x, y, z) => {
    if (y <= -2) return rim;
    const c0 = cell(x, y, z);
    if (cell(x + 1, y, z) !== c0 || cell(x, y + 1, z) !== c0 || cell(x, y, z - 1) !== c0) return seam;
    if (s.moss && y >= 6 && hash3(x, y, z) < s.moss * 0.7) return hash3(x, 2, z) > 0.5 ? 0x7aa040 : 0x5a8a3a;
    return tone(x, y, z, base, sh(base, 0.88), light, 0.14, 0.12);
  };
  const R = s.r ?? 5.2;
  ell(v, 0, CY, CZ, R + 0.4, R + 1.2, R * 0.85, (x, y, z) => (z <= 0 && y >= -2 ? col(x, y, z) : null));
  if (s.moss) for (let x = -4; x <= 3; x++) for (let z = -4; z <= 0; z++) { const h = hash3(x, 9, z); if (h > 0.9) { let top = -1; for (let y = 12; y >= 0; y--) if (v.has(x, y, z)) { top = y; break; } if (top > 4) v.set(x, top + 1, z, h > 0.96 ? 0xf8f0f0 : 0x8ac85a); } }
  return v;
}
// tails: list of voxel segments (each pivots at its base, extends towards -z)
export function buildTail(def) {
  const kind = def.tail || 'none';
  if (kind === 'none') return [];
  const c = hex(def.tailColor ?? def.skin), tip = hex(def.tailTip ?? 0xffffff);
  const segs = [];
  const seg = (fn) => { const v = new VoxelModel(); fn(v); segs.push(v); };
  if (kind === 'fox' || kind === 'tanuki') {
    const R = [2.2, 3.0, 3.0, 2.4];
    R.forEach((r, i) => seg((v) => ell(v, 0, 0, -r, r, r, r + 0.8, (x, y, z) => (kind === 'fox' && i === 3 ? tip : kind === 'tanuki' && i % 2 === 1 ? sh(c, 0.6) : tone(x, y, z, c, sh(c, 0.92), sh(c, 1.08), 0.12, 0.08)))));
  } else if (kind === 'otter') {
    [2, 1.6, 1.2, 0.9].forEach((r) => seg((v) => ell(v, 0, 0, -r * 1.5, r + 0.3, r * 0.8, r * 1.6, tx(c, 0.1, 0.05))));
  } else if (kind === 'shiba') {
    seg((v) => { for (let a = 0; a < 7; a++) { const th = a / 6 * Math.PI * 1.3; v.set(0, Math.round(Math.sin(th) * 2.5) + 1, -Math.round(Math.cos(th) * 2.5) - 1, a === 6 ? tip : c); v.set(-1, Math.round(Math.sin(th) * 2.5) + 1, -Math.round(Math.cos(th) * 2.5) - 1, c); } });
  } else if (kind === 'cat') {
    for (let i = 0; i < 4; i++) seg((v) => { for (let z = 0; z >= -2; z--) v.set(0, 0, z, i === 3 ? tip : c); });
  } else { // stub / deer / rabbit puff
    seg((v) => ell(v, 0, 0, -0.8, 1.2, 1.2, 1.4, kind === 'stub' ? c : tip));
  }
  return segs;
}
export function buildEar(def, e) { return e.model; }

// ---------------------------------------------------------------- accessories (head space: head box coords)
export function buildHat(def, box) {
  const h = def.hat;
  if (!h) return null;
  const v = new VoxelModel();
  const top = box.y1 + 1;
  if (h.type === 'beanie') {
    const c = hex(h.color);
    for (let y = top - 3; y <= top + 2; y++) for (let x = box.x0 - 1; x <= box.x1 + 1; x++) for (let z = box.z0 - 1; z <= box.z1 - 1; z++) {
      const dx = (x + 0.5) / 6.6, dz = (z + 0.5) / 6, dy = (y - (top - 3)) / 5.5;
      if (dx * dx + dz * dz + Math.max(0, dy) ** 2 * 1.4 <= 1.05 && !(z >= box.z1 - 2 && y < top)) v.set(x, y, z, y <= top - 2 ? sh(c, 0.85) : (x + 20) % 2 ? sh(c, 0.92) : c);
    }
    if (h.pom) ell(v, 0, top + 3.2, 0, 1.6, 1.6, 1.6, hex(h.pom));
  } else if (h.type === 'cap') {
    const c = hex(h.color), b = hex(h.brim ?? sh(c, 0.8));
    for (let x = box.x0; x <= box.x1; x++) for (let z = box.z0; z <= box.z1; z++) for (let y = top; y <= top + 1; y++) { const d = ((x + 0.5) / 6.2) ** 2 + ((z + 0.5) / 5.8) ** 2; if (d <= 1) v.set(x, y, z, c); }
    for (let x = -3; x <= 2; x++) for (let z = box.z1; z <= box.z1 + 3; z++) v.set(x, top, z, b);
  } else if (h.type === 'straw') {
    const c = 0xe8c878;
    for (let x = -9; x <= 8; x++) for (let z = -9; z <= 8; z++) { const d = Math.hypot(x + 0.5, z + 0.5); if (d <= 9) v.set(x, top, z, d < 6 ? 0x8a3a2a : (x + z) % 2 ? c : 0xd8b060); }
    for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) for (let y = top + 1; y <= top + 3; y++) if (Math.hypot(x + 0.5, z + 0.5) <= 5 - (y - top - 1) * 0.6) v.set(x, y, z, (x + y) % 2 ? c : 0xd8b060);
  } else if (h.type === 'chef') {
    for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) for (let y = top; y <= top + 1; y++) if (Math.hypot(x + 0.5, z + 0.5) <= 5) v.set(x, y, z, 0xf8f6f0);
    ell(v, 0, top + 3.6, 0, 6, 2.4, 5.5, (x, y, z) => ((x + y + z) % 4 === 0 ? 0xeeeae2 : 0xffffff));
  } else if (h.type === 'waitress') {
    for (let x = -5; x <= 4; x++) for (let y = top; y <= top + 1; y++) v.set(x, y, 2, y === top + 1 && (x + 20) % 2 ? 0xffffff : hex(h.color ?? 0xd8342e));
  } else if (h.type === 'hairband') {
    for (let x = box.x0; x <= box.x1; x++) v.set(x, top, 1, hex(h.color));
    for (const x of [box.x0 - 1, box.x1 + 1]) for (let y = top - 3; y <= top - 1; y++) v.set(x, y, 1, hex(h.color));
  } else if (h.type === 'kindergarten') {
    const c = hex(h.color ?? 0xffd040);
    for (let x = box.x0; x <= box.x1; x++) for (let z = box.z0; z <= box.z1; z++) for (let y = top; y <= top + 2; y++) { const d = ((x + 0.5) / 6.5) ** 2 + ((z + 0.5) / 6) ** 2; if (d <= 1 - (y - top) * 0.25) v.set(x, y, z, c); }
    for (let x = -7; x <= 6; x++) for (let z = -7; z <= 6; z++) if (Math.hypot(x + 0.5, z + 0.5) <= 7 && Math.hypot(x + 0.5, z + 0.5) > 5.5) v.set(x, top, z, c);
  }
  return v;
}
export function buildHair(def, box) {
  const h = def.hair;
  if (!h) return null;
  const v = new VoxelModel();
  const c = hex(h.color ?? 0x3a2a2a);
  if (h.type === 'bob') {
    for (let x = box.x0 - 1; x <= box.x1 + 1; x++) for (let y = 2; y <= box.y1 + 1; y++) for (let z = box.z0 - 1; z <= box.z1; z++) {
      const inside = x >= box.x0 && x <= box.x1 && y <= box.y1 && z >= box.z0 && z <= box.z1;
      if (inside) continue;
      if (z >= box.z1 - 1 && y < box.y1 - 1) continue; // keep the face clear
      v.set(x, y, z, hash3(x, y, z) > 0.8 ? sh(c, 1.15) : c);
    }
    for (let x = box.x0 + 1; x <= box.x1 - 1; x++) v.set(x, box.y1, box.z1 + 1, x % 3 === 0 ? sh(c, 1.15) : c); // fringe
  } else if (h.type === 'fringe') { // grandpa: white tufts above the ears
    for (const sx of [box.x0 - 1, box.x1 + 1]) for (let y = 4; y <= 7; y++) for (let z = -3; z <= 1; z++) if (hash3(sx, y, z) < 0.8) v.set(sx, y, z, c);
  } else if (h.type === 'tuft') {
    for (let i = -1; i <= 1; i++) for (let y = 0; y < 3 - Math.abs(i); y++) v.set(i, box.y1 + 1 + y, 2, c);
  } else if (h.type === 'braids') { // two braids with ribbons (yuki)
    for (const s of [-1, 1]) {
      const bx = s > 0 ? box.x1 + 1 : box.x0 - 1;
      for (let y = 1; y <= 6; y++) v.set(bx, y, -2, (y % 2 ? c : sh(c, 0.9)));
      v.set(bx, 0, -2, hex(h.ribbon ?? 0xd8342e)); v.set(bx + s, 0, -2, hex(h.ribbon ?? 0xd8342e)); v.set(bx - s * 0, -1, -2, hex(h.ribbon ?? 0xd8342e));
    }
  }
  return v;
}
// glasses are drawn by the face painter (thin pixel frames), only the temple arms are voxels
export function buildGlasses(def, faceZ) {
  const g = def.glasses;
  if (!g) return null;
  const v = new VoxelModel();
  const fc = hex(g.frame ?? 0x5a3a24);
  for (const sx of [DIM.head.x0 - 1, DIM.head.x1 + 1]) for (let z = faceZ - 4; z <= faceZ - 1; z++) v.set(sx, 5, z, fc);
  return v;
}
export function buildMustache(def, faceZ) {
  if (!def.mustache) return null;
  const v = new VoxelModel();
  const c = hex(def.mustache);
  for (let x = -4; x <= 3; x++) { const y = 2 + Math.round(Math.abs(x + 0.5) * 0.25); v.set(x, y, faceZ, c); if (Math.abs(x + 0.5) < 3) v.set(x, y + 1, faceZ, c); }
  return v;
}

// meshing helpers
export function geo(model, pivot = [0, 0, 0], scale = VS) { return buildGeo(model, pivot, scale); }
export function vmesh(model, pivot, { shadow = true, scale = VS } = {}) {
  const g = geo(model, pivot, scale);
  const m = new THREE.Mesh(g, matFor(g));
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- generic design (crowds)
// Packs the parametric builders above into the design format the rig reads
// (see entities/craft.js). Limbs are 3 voxels wide (centred with a 0.5 pivot).
export function genericDesign(def) {
  const C = [0.5, 0, 0.5];
  const H = buildHead(def);
  const hb = H.box;
  const extras = [];
  const hair = buildHair(def, hb); if (hair) extras.push({ joint: 'head', model: hair, name: 'hair' });
  const hat = buildHat(def, hb); if (hat) extras.push({ joint: 'head', model: hat, name: 'hat', rot: def.hat?.tilt ? [def.hat.tilt, 0, 0] : null });
  const gl = buildGlasses(def, H.faceZ + 0.6); if (gl) extras.push({ joint: 'head', model: gl, name: 'glasses', shadow: false });
  const mu = buildMustache(def, H.faceZ + (H.snout ? 0 : 0.4)); if (mu) extras.push({ joint: 'head', model: mu, name: 'mustache', shadow: false });
  if (def.earbuds) { const e = new VoxelModel(); e.set(0, 0, 0, 0xf4f4f8); e.set(0, -1, 0, 0xf4f4f8); extras.push({ joint: 'head', model: e, at: [hb.x1 + 1, 4, 0], shadow: false }, { joint: 'head', model: e, at: [hb.x0 - 1, 4, 0], shadow: false }); }
  if (def.ribbons) for (const r of def.ribbons) {
    const rm = new VoxelModel(); const c = hex(r.color ?? 0xd8342e);
    rm.set(-2, 0, 0, c); rm.set(-1, 0, 0, c); rm.set(-2, 1, 0, c); rm.set(-2, -1, 0, c); rm.set(0, 0, 0, sh(c, 0.8)); rm.set(1, 0, 0, c); rm.set(2, 0, 0, c); rm.set(2, 1, 0, c); rm.set(2, -1, 0, c);
    extras.push({ joint: 'head', model: rm, at: [r.x ?? 0, r.y ?? hb.y1, r.z ?? 0], rot: [r.rx ?? 0, r.ry ?? 0, r.rz ?? 0] });
  }
  let hood = null;
  if (def.hood) {
    const hm = new VoxelModel();
    const c = hex(def.hoodColor ?? def.sleeve ?? 0x4c5b84), lin = sh(c, 0.62);
    rbox(hm, hb.x0 - 1, hb.x1 + 1, hb.y0 + 2, hb.y1 + 2, hb.z0 - 1, hb.z1, 2.6, (x, y, z) => {
      if (x >= hb.x0 && x <= hb.x1 && y <= hb.y1 && z >= hb.z0) return null;
      if (y > hb.y1 + 1) return null;
      return z >= hb.z1 ? lin : (x + y * 2 + z) % 9 === 0 ? sh(c, 0.86) : c;
    });
    hood = hm;
  }
  const hands = {};
  for (const k of ['relax']) hands[k] = [{ model: buildHand(def, 1), pivot: C }, { model: buildHand(def, -1), pivot: C }];
  return {
    dims: { hipY: def.feet === 'geta' ? 7 : 6, hipX: DIM.hipX, thigh: 2, chestY: 6.5, shoulderX: DIM.shoulderX, shoulderY: -1.2, upper: 2.2, fore: 2.2, neckY: 0.4, tail: [-0.5, DIM.torso.z0 - 0.5], carry: [3.5, DIM.torso.z1 + 3], shellAt: [0, 1.2, DIM.torso.z0 + 0.2], tailTilt: def.tail === 'otter' ? 0.9 : 0.4 },
    pelvis: buildPelvis(def), torso: buildTorso(def),
    thigh: { model: buildThigh(def), pivot: C }, shin: { model: buildShin(def), pivot: C },
    upper: { model: buildUpperArm(def), pivot: C }, fore: { model: buildForeArm(def), pivot: C },
    hands,
    head: H.model,
    ears: H.ears.map((e) => ({ ...e, pivot: [0.5, 0, 0.5], tilt: (e.kind === 'fox' || e.kind === 'shiba' || e.kind === 'cat') ? -e.side * 0.18 : 0 })),
    tail: buildTail(def),
    shell: def.shell ? buildShell(def) : null,
    hood,
    extras,
    face: {
      box: hb, faceZ: H.faceZ,
      snout: H.snout ? { z: H.snout.z, y: H.snout.y, h: 3, w: 6, beak: H.snout.beak, my: H.snout.beak ? 4 : 5, x: 0 } : null,
      cfg: { ...(def.glasses ? { glasses: { color: '#' + hex(def.glasses.frame ?? 0x5a3a24).toString(16).padStart(6, '0') } } : {}), ...(def.face || {}) },
    },
  };
}
