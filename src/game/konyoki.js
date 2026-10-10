// Konyoki (魂容器): the little soul-toys the spirits make for the machines.
// A series is a set of variants (and a secret); each variant has a voxel
// figure. Kodamaya keeps one of each in the display cabinet: missing ones
// are dark silhouettes, the secret a "?" until someone pulls it.
//   SERIES.kyuriOffice.variants -> [{ id, name, ja, rarity }]
//   konyokiFigure(seriesId, variantId, { silhouette }) -> Group (origin at its feet)
//   displayCabinet() -> Group; userData.slots [{ x, y, z }] (local), setSlot(i, mesh)
//   konyokiBanner(series) -> glowing header card for a machine
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, ell, sh, hash3, V25, V5 } from '../world/build.js';
import { PixCanvas, mix, lighten, darken } from '../core/pixtex.js';
import { glassPane } from '../world/station.js';
import { FONT } from '../ui/fonts.js';

export const SERIES = {
  kyuriOffice: {
    id: 'kyuriOffice', name: 'Kyūri Office', ja: 'きゅうりオフィス', by: 'Kappei', color: '#5aae3c',
    variants: [
      { id: 'shinjin', name: 'New Hire', ja: 'しんじん', rarity: 'common' },
      { id: 'eigyo', name: 'Salesman', ja: 'えいぎょう', rarity: 'common' },
      { id: 'ol', name: 'Office Lady', ja: 'OL', rarity: 'common' },
      { id: 'zangyo', name: 'Overtime', ja: 'ざんぎょう', rarity: 'uncommon' },
      { id: 'kacho', name: 'Section Chief', ja: 'かちょう', rarity: 'rare' },
      { id: 'shacho', name: 'Golden President', ja: 'しゃちょう', rarity: 'secret' },
    ],
  },
};
// pull odds: commons often, the secret very rarely
export function rollVariant(seriesId, luck = 0) {
  const vs = SERIES[seriesId].variants;
  const w = { common: 30, uncommon: 16, rare: 7, secret: 1.6 + luck };
  const tot = vs.reduce((a, v) => a + w[v.rarity], 0);
  let r = Math.random() * tot;
  for (const v of vs) { r -= w[v.rarity]; if (r <= 0) return v; }
  return vs[0];
}

// ---------------------------------------------------------------- the cucumber figures (V25)
function kyuri(id, sil) {
  const v = new VoxelModel();
  const gold = id === 'shacho';
  const G = gold ? 0xf0c030 : 0x4a9a3a, GL = gold ? 0xfff0a0 : 0x7ac04a, GD = gold ? 0xb88a18 : 0x2e6a26;
  const S = (c) => (sil ? 0x2a2230 : c);
  // body: a tall cucumber capsule, bumpy, stripes, a stem nub
  for (let y = 0; y < 16; y++) {
    const r = y < 2 ? 1.6 + y * 0.7 : y > 13 ? 3 - (y - 13) * 0.8 : 3;
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      if (x * x + z * z > r * r) continue;
      const stripe = Math.floor(Math.atan2(z, x) * 2.2 + 10) % 2 === 0;
      const bump = hash3(x, y, z) < 0.07;
      v.set(x, y, z, S(bump ? GL : stripe ? G : sh(G, 0.9)));
    }
  }
  v.set(0, 16, 0, S(GD)); v.set(0, 17, 0, S(GD)); v.set(1, 17, 0, S(GD));
  // face: dot eyes + a little mouth on the front (z+)
  if (!sil) {
    v.set(-1, 11, 3, 0x1a1420); v.set(1, 11, 3, 0x1a1420);
    v.set(-2, 10, 3, 0xff9a9a); v.set(2, 10, 3, 0xff9a9a);
    v.set(0, 9, 3, id === 'zangyo' ? 0x1a1420 : 0xd8504a);
  }
  // white shirt collar + tie (colour by role)
  const tie = { shinjin: 0x3a6ad8, eigyo: 0x2a8a5a, ol: null, zangyo: 0x6a6a72, kacho: 0xd83a3a, shacho: 0x7a3ac8 }[id];
  for (let x = -2; x <= 2; x++) v.set(x, 8, 3, S(0xf4f4f0));
  if (tie) { v.set(0, 7, 4, S(tie)); v.set(0, 6, 4, S(tie)); v.set(0, 5, 4, S(sh(tie, 0.85))); }
  // stubby arms + feet
  for (const sx of [-4, 4]) { v.set(sx, 7, 0, S(G)); v.set(sx, 6, 1, S(G)); }
  for (const sx of [-2, 1]) { v.set(sx, -1, 0, S(0x2a2a30)); v.set(sx + 1, -1, 0, S(0x2a2a30)); v.set(sx, -1, 1, S(0x2a2a30)); }
  // role props
  if (id === 'eigyo') { fill(v, 5, 7, 3, 6, -1, 1, S(0x5a3a24)); v.set(6, 7, 0, S(0x2a1a14)); } // briefcase
  if (id === 'ol') { fill(v, -2, 2, 15, 15, -1, 1, S(0xff8ab0)); v.set(-3, 15, 0, S(0xff8ab0)); v.set(3, 15, 0, S(0xff8ab0)); v.set(0, 6, 4, S(0xff8ab0)); } // ribbon + bow
  if (id === 'zangyo') { fill(v, 4, 6, 4, 7, 1, 3, S(0xf4f0e8)); fill(v, 4, 6, 7, 7, 1, 3, S(0x5a3020)); if (!sil) { v.set(-1, 12, 3, 0x6a4a8a); v.set(1, 12, 3, 0x6a4a8a); } } // coffee + eye bags
  if (id === 'kacho') { for (const sx of [-2, 1]) { v.set(sx, 11, 4, S(0x2a2a30)); v.set(sx + 1, 11, 4, S(0x2a2a30)); } v.set(0, 11, 4, S(0x2a2a30)); fill(v, -3, 3, 14, 14, -3, 3, S(0x3a3a44)); } // glasses + combover
  if (id === 'shacho') { fill(v, -2, 2, 17, 21, -2, 2, S(0x2a2a30)); fill(v, -3, 3, 17, 17, -3, 3, S(0x2a2a30)); fill(v, -2, 2, 18, 18, -2, 2, S(0xd83a3a)); fill(v, -5, -5, 6, 12, 1, 1, S(0x8a6a3a)); v.set(-5, 13, 1, S(0xf0c030)); } // top hat + cane
  return v;
}

export function konyokiFigure(seriesId, variantId, { silhouette = false } = {}) {
  const g = new THREE.Group();
  if (seriesId === 'kyuriOffice') {
    const m = vm(kyuri(variantId, silhouette), V25, [0.5, -1, 0.5]);
    g.add(m);
    if (variantId === 'shacho' && !silhouette) {
      // a sparkle halo for the secret
      const h = new VoxelModel(); for (let a = 0; a < 16; a++) h.set(Math.round(Math.cos(a / 16 * Math.PI * 2) * 6), 8 + Math.round(Math.sin(a / 16 * Math.PI * 2) * 6), -3, a % 2 ? 0xfff4b0 : 0xffd040);
      const hm = glowVm(h, V25, [0.5, -1, 0.5], { intensity: 1.2 }); g.add(hm);
      g.userData.halo = hm;
    }
  }
  g.userData.height = 18 * V25;
  return g;
}
// "?" plate for an undiscovered secret
function secretPlate() {
  const p = new PixCanvas(12, 16, 3301);
  p.ellipse(6, 8, 5.5, 7.5, '#2a2230');
  p.text('?', 6, 3, { font: `9px ${FONT.bold}`, color: '#ffd040', align: 'center' });
  return signPlane(p, 0.16, { alphaTest: 0.5 });
}

// ---------------------------------------------------------------- the glowing machine banner
export function konyokiBanner(seriesId) {
  const S = SERIES[seriesId];
  const p = new PixCanvas(76, 22, 3401);
  p.rect(0, 0, 76, 22, darken(S.color, 0.35));
  p.rect(1, 1, 74, 20, S.color);
  p.rect(1, 1, 74, 2, lighten(S.color, 0.4));
  for (let i = 0; i < 3; i++) { const x = 6 + i * 3; p.ellipse(x, 11, 1.4, 5, '#2e6a26'); p.px(x, 7, '#ffffff'); }
  p.text(S.ja, 44, 2, { font: `9px ${FONT.pop}`, color: '#ffffff', align: 'center', outline: darken(S.color, 0.45), maxWidth: 58 });
  p.rect(28, 13, 32, 7, '#ffe040'); p.text('NEW!', 44, 13, { font: `7px ${FONT.bold}`, color: '#d8301a', align: 'center' });
  return signPlane(p, 0.8, { emissive: 1.0, mode: 4 });
}

// ---------------------------------------------------------------- the display cabinet
// glass-fronted wooden cabinet, 3 shelves x 4 slots, a little brass plate per row
export function displayCabinet({ rows = 3, cols = 4 } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const W = 28, H = 46, D = 9;
  fill(v, -W / 2, W / 2 - 1, 0, H - 1, -D, 0, (x, y, z) => {
    const edge = x <= -W / 2 + 1 || x >= W / 2 - 2 || y <= 2 || y >= H - 2 || z === -D;
    return edge ? ((x + y) % 7 === 0 ? 0x5a3420 : 0x6a4428) : null;
  });
  const shelfY = [];
  for (let r = 0; r < rows; r++) { const y = 4 + r * 13; shelfY.push(y); fill(v, -W / 2 + 2, W / 2 - 3, y - 1, y - 1, -D + 1, -1, 0xb8885a); fill(gl, -W / 2 + 2, W / 2 - 3, y + 11, y + 11, -D + 1, -D + 1, 0xfff0c8); }
  fill(v, -W / 2 - 1, W / 2, H, H + 1, -D - 1, 1, 0x4a2e1e); // crown
  const g = new THREE.Group();
  g.add(vm(v, V5, [0, 0, 0]), glowVm(gl, V5, [0, 0, 0], { intensity: 0.9 }));
  const gp = glassPane((W - 4) * V5, (H - 4) * V5); gp.position.set(-0.5 * V5, (H / 2) * V5, 0.3 * V5); g.add(gp);
  // little title plate on the crown
  const p = new PixCanvas(40, 8, 3501); p.rect(0, 0, 40, 8, '#c8a050'); p.frame(0, 0, 40, 8, '#6a4a20'); p.text('コレクション', 20, 0, { font: `7px ${FONT.tiny}`, color: '#3a2418', align: 'center' });
  const pl = signPlane(p, 0.5); pl.position.set(-0.5 * V5, (H + 0.8) * V5, 1.5 * V5 + 0.01); g.add(pl);
  const slots = [];
  for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) slots.push({ x: (-W / 2 + 4 + (c + 0.5) * ((W - 8) / cols)) * V5, y: shelfY[r] * V5, z: (-D / 2) * V5, mesh: null });
  g.userData.slots = slots;
  g.userData.setSlot = (i, mesh) => {
    const s = slots[i]; if (!s) return;
    if (s.mesh) g.remove(s.mesh);
    s.mesh = mesh; if (!mesh) return;
    mesh.position.set(s.x, s.y, s.z); g.add(mesh);
  };
  g.userData.secretPlate = secretPlate;
  return g;
}
// lay out a series in the cabinet (owned -> figure, missing -> silhouette, unseen secret -> "?")
export function fillCabinet(cab, seriesId, owned, start = 0) {
  SERIES[seriesId].variants.forEach((v, i) => {
    let m;
    if (owned.has(v.id)) m = konyokiFigure(seriesId, v.id);
    else if (v.rarity === 'secret') { m = new THREE.Group(); const sp = cab.userData.secretPlate(); sp.position.y = 0.2; m.add(sp); }
    else m = konyokiFigure(seriesId, v.id, { silhouette: true });
    cab.userData.setSlot(start + i, m);
  });
}
