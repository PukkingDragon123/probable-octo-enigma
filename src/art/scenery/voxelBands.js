// The country outside the Kodama's windows in real voxels. Three bands stand
// behind the window wall at different depths and roll past at different
// speeds (the closer, the faster): the railway embankment, the near fields
// with the farm lane and its houses, and the far plain with its hamlets.
// Behind them the painted Scenery keeps the hills, the mountains and the sky.
//
// Each band streams pieces in and out round the camera: ground chunks every
// 2.4 m and props in slots, chosen from the segment (country, farm, village,
// valley, tea, mountain, city) by a hash of the slot, so the strip is endless
// and never needs to be stored. Geometry is built once per variant and
// shared; a piece is just a Mesh. The bands follow the camera with parallax
// and shift down with the camera's pitch so their horizon stays put in the
// windows (like the painted layers do).
//
//   const VB = new VoxelBands({ refZ: -0.8 });  scene.add(VB.group);
//   VB.setSegment('farm');  VB.update(dt, view, { speed, lights, haze });
import * as THREE from 'three';
import { buildGeo, matFor } from '../../vox/kit.js';
import { emitMat } from '../../core/materials.js';
import { h1 } from './core.js';
import * as VP from './voxelProps.js';

const U = 0.01; // metres per voxel
const ALIAS = { river: 'farm', sea: 'valley' };

// ---------------------------------------------------------------- what stands in each band
// a slot returns pieces: [type, variantSeed, dx (m from the slot), dz (voxels), opts]
function nearSlot(seg, i) {
  const r = (k) => h1(i, k), s = i * 3;
  const out = [];
  const lot = VP.NEAR.lotZ - 6, hedgeZ = VP.NEAR.lotZ + 2;
  const vs = (k, n = 5) => (s + k) % n; // variant seeds: a handful per type, shared
  if (seg === 'city') { out.push(['cityBlock', vs(0, 4), 0, lot + 4]); return out; }
  if (seg === 'mountain') {
    if (r(1) < 0.75) out.push(['cedars8', vs(1, 4), 0, lot - 6]);
    else { out.push(['cedars3', vs(2, 4), -0.2, lot - 30]); out.push(['minka', vs(3, 4), 0.3, lot]); }
    return out;
  }
  if (seg === 'tea') {
    if (r(1) < 0.4) out.push(['frostFans', 0, 0, -60]);
    else if (r(1) < 0.7) { out.push(['house2', vs(4), 0, lot]); out.push(['hedge90', vs(5, 3), -0.08, hedgeZ]); out.push(['broadleaf', vs(6, 4), 1.0, lot + 4]); }
    else if (r(1) < 0.82) out.push(['cedars4', vs(7, 4), 0, lot - 6]);
    return out;
  }
  if (seg === 'farm') {
    const k = r(1);
    if (k < 0.42) out.push(['greenhouse', vs(8, 2) + 2, 0, lot + 6]);
    else if (k < 0.6) { out.push(['shed', vs(9, 4), 0, lot]); out.push(['keiTruck', vs(10, 3), 0.7, lot + 16]); }
    else if (k < 0.74) { out.push(['minka', vs(11, 4), 0, lot]); out.push(['persimmon', vs(12, 4), 1.15, lot + 2]); }
    else if (k < 0.84) out.push(['scarecrow', 0, 0.5, -50]);
    if (r(2) < 0.4) out.push(['farmer', vs(13, 2), 0.3 + r(3) * 1.0, -30 - Math.floor(r(4) * 50)]);
    out.push(...poleAt(i));
    return out;
  }
  // country, village, valley
  const dense = seg === 'village', valley = seg === 'valley';
  const k = r(1), pk2 = r(2);
  if (k < (dense ? 0.72 : valley ? 0.45 : 0.55)) {
    if (pk2 < 0.25) out.push(['bamboo', vs(14, 3), 0.12, lot - 26]);
    else if (pk2 < 0.45 && !dense) out.push(['cedars3', vs(15, 4), 0.1, lot - 30]);
    else if (pk2 < 0.6) out.push(['keyaki', vs(16, 3), 0.45, lot - 30]);
    const minka = r(3) < (valley ? 0.6 : 0.3);
    out.push([minka ? 'minka' : 'house2', vs(17), 0, lot]);
    let w = minka ? 1.0 : 0.72;
    if (r(4) < 0.3) { out.push(['kura', vs(18, 3), w + 0.06, lot - 4]); w += 0.5; }
    const g = r(5);
    if (g < 0.35) out.push(['pine', vs(19, 3), w + 0.08, lot + 8]);
    else if (g < 0.6) out.push([valley ? 'persimmon' : 'broadleaf', vs(20, 4), w + 0.1, lot + 8]);
    if (r(6) < 0.6) out.push(['hedge' + (w > 1.1 ? '140' : '90'), vs(21, 3), -0.06, hedgeZ]);
    else out.push(['shrubs', vs(22, 3), 0.02, hedgeZ]);
  } else if (k < 0.55) out.push(['greenhouse', vs(23, 2) + 2, 0, lot + 6]);
  else if (k < 0.66) { out.push(['keyaki', vs(24, 3), 0.1, lot]); out.push(['broadleaf', vs(25, 4), 0.62, lot + 6]); }
  else if (k < 0.72) out.push(['shrine', vs(26, 3), 0, lot]);
  else if (k < 0.77) { out.push(['shed', vs(27, 4), 0, lot]); out.push(['keiTruck', vs(28, 3), 0.62, lot + 16]); }
  else if (k < 0.81) { out.push(['busStop', 0, 0, lot + 14]); out.push(['vending', vs(29, 4), 0.38, lot + 6]); }
  else if (k < 0.84 && !valley) out.push(['fumikiri', 0, 0.3, VP.NEAR.laneZ + 6]);
  else if (k < 0.9) out.push(['bamboo', vs(30, 3), 0, lot - 10]);
  if (r(7) < 0.05) out.push(['jizo', 0, -0.4, VP.NEAR.laneZ + 4]);
  if (r(8) < 0.25) out.push(['farmer', vs(31, 2), 0.3 + r(9) * 1.2, -20 - Math.floor(r(10) * 70)]);
  if (r(11) < 0.12) out.push(['scarecrow', 0, 1.1, -60]);
  out.push(...poleAt(i));
  return out;
}
// utility poles along the lane every few slots, the lines between them
const POLE_EVERY = 2;
function poleAt(i) {
  if (i % POLE_EVERY !== 0 || h1(Math.floor(i / POLE_EVERY), 420) < 0.3) return [];
  const out = [['pole', 0, -0.35, VP.NEAR.laneZ + 3]];
  if (h1(Math.floor(i / POLE_EVERY) + 1, 420) >= 0.3) out.push(['wires', 0, -0.33, VP.NEAR.laneZ + 3]);
  return out;
}
function midSlot(seg, i) {
  const r = (k) => h1(i, k + 70), out = [];
  const lot = VP.MID.lotZ - 4;
  const vs = (k, n = 6) => (i * 7 + k) % n;
  if (seg === 'city') { for (let k = 0; k < 3; k++) out.push(['miniHouse', vs(k, 8), k * 0.26, lot - Math.floor(r(k) * 20)]); return out; }
  if (seg === 'mountain') { if (r(1) < 0.7) out.push(['miniCedars', vs(1, 3), 0, lot - 10]); return out; }
  if (seg === 'tea') { if (r(1) < 0.5) out.push(['miniFans', 0, 0, -40]); else out.push(['miniHouse', vs(2), 0.2, lot]); return out; }
  const n = seg === 'village' ? 4 : r(2) < 0.4 ? 0 : 1 + Math.floor(r(3) * 3);
  if (r(1) < 0.3 || (seg === 'valley' && r(1) < 0.55)) out.push(['copse', vs(4, 4), 0, lot - 10]);
  else if (r(1) < 0.4 || (seg === 'farm' && r(1) < 0.7)) out.push(['miniGreenhouses', vs(5, 3), 0.1, lot + 10]);
  for (let k = 0; k < n; k++) out.push(['miniHouse', vs(6 + k, 8), 0.45 + k * 0.24, lot - Math.floor(r(10 + k) * 16)]);
  return out;
}
function bankSlot() { return []; }

const BANDS = [
  { id: 'bank', z: -0.95, y: 0.56, depth: VP.BANK.depth, v: 3.2, par: 0.9, ground: 'bank', slot: bankSlot, sp: 2.4 },
  { id: 'near', z: -1.3, y: 0.78, depth: VP.NEAR.depth, v: 1.5, par: 0.55, ground: 'near', slot: nearSlot, sp: 1.9, propY: VP.NEAR.lotY },
  { id: 'mid', z: -3.05, y: 1.02, depth: VP.MID.depth, v: 0.45, par: 0.25, ground: 'mid', slot: midSlot, sp: 1.6, propY: VP.MID.lotY },
];

// which voxel-unit y a prop stands on, from its z (the near fields are raked)
function standY(band, dz) {
  if (band.id === 'near') return dz > VP.NEAR.laneZ ? Math.floor(-dz * VP.NEAR.rake) + 1 : dz > VP.NEAR.lotZ ? VP.NEAR.lotY : VP.NEAR.lotY + 1;
  if (band.id === 'mid') return dz > VP.MID.lotZ ? Math.floor(-dz * VP.MID.rake) + 1 : VP.MID.lotY + 1;
  return 0;
}

// ---------------------------------------------------------------- the geometry library
const BUILD = {
  house2: VP.house2, minka: VP.minka, kura: VP.kura, shed: VP.shed,
  greenhouse: (s) => VP.greenhouse(s, s), broadleaf: (s) => VP.broadleaf(s), persimmon: VP.persimmon, keyaki: VP.keyaki,
  pine: VP.gardenPine, cedars3: (s) => VP.cedars(s, 3, 76), cedars4: (s) => VP.cedars(s, 4, 80), cedars8: (s) => VP.cedars(s, 8, 92),
  bamboo: (s) => VP.bamboo(s, 56), hedge90: (s) => VP.hedge(s, 90), hedge140: (s) => VP.hedge(s, 140), shrubs: (s) => VP.shrubs(s, 4),
  pole: () => VP.pole(), wires: () => VP.wires(Math.round((BANDS[1].sp * POLE_EVERY) / U)), vending: (s) => VP.vending(s, 2), busStop: () => VP.busStop(),
  jizo: (s) => VP.jizo(s), keiTruck: VP.keiTruck, farmer: VP.farmer, scarecrow: VP.scarecrow, shrine: VP.shrine, fumikiri: () => VP.fumikiri(),
  frostFans: () => VP.frostFans(3), cityBlock: VP.cityBlock,
  miniHouse: VP.miniHouse, miniGreenhouses: (s) => VP.miniGreenhouses(s, 3), copse: (s) => VP.copse(s, 40 + s * 6), miniCedars: (s) => VP.miniCedars(s, 5), miniFans: () => VP.miniFans(0),
  'g:bank': (s, k) => VP.bankGround(k, s), 'g:near': (s, k) => VP.nearGround(k, s), 'g:mid': (s, k) => VP.midGround(k, s),
};

export class VoxelBands {
  constructor({ refZ = -0.8 } = {}) {
    this.refZ = refZ;
    this.group = new THREE.Group();
    this.lib = new Map();
    this.onU = { value: 0 };
    this.nightMat = emitMat({ vertexColors: true, intensity: 1.5, onU: this.onU, mode: 0 });
    this.nightMat.polygonOffset = true; this.nightMat.polygonOffsetFactor = -2; this.nightMat.polygonOffsetUnits = -2;
    this.signMat = emitMat({ vertexColors: true, intensity: 1.25, mode: 4 });
    this.signMat.polygonOffset = true; this.signMat.polygonOffsetFactor = -2; this.signMat.polygonOffsetUnits = -2;
    this.bands = BANDS.map((cfg) => {
      const g = new THREE.Group();
      this.group.add(g);
      return { ...cfg, g, scroll: 0, ground: cfg.ground, chunks: new Map(), slots: new Map(), changes: [{ x: -1e9, seg: 'country' }], cmax: 0 };
    });
    // atmospheric haze in front of the far plain
    this.hazeMat = new THREE.MeshBasicMaterial({ color: 0xc4ddf4, transparent: true, opacity: 0.16, depthWrite: false });
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(80, 3), this.hazeMat);
    this.haze.position.set(0, 1.2, -3.0);
    this.haze.renderOrder = 2;
    this.group.add(this.haze);
    this.queue = [];
  }
  // ------------------------------------------------------------ geometry
  piece(type, seed, kind = null) {
    const key = kind ? `${type}|${kind}|${seed}` : `${type}|${seed}`;
    let L = this.lib.get(key);
    if (!L) {
      const o = BUILD[type](seed, kind);
      const geo = buildGeo(o.v, [0, 0, 0], U);
      L = { geo, mat: matFor(geo, 0.05), w: o.w * U, n: o.n.vox.size ? o.n.build({ pivot: [0, 0, 0], scale: U, ao: false }) : null, a: o.a.vox.size ? o.a.build({ pivot: [0, 0, 0], scale: U, ao: false }) : null };
      this.lib.set(key, L);
    }
    const m = new THREE.Group();
    const lit = new THREE.Mesh(L.geo, L.mat);
    m.add(lit);
    if (L.n) m.add(new THREE.Mesh(L.n, this.nightMat));
    if (L.a) m.add(new THREE.Mesh(L.a, this.signMat));
    return m;
  }
  // ------------------------------------------------------------ segments
  segAt(B, x) {
    const C = B.changes;
    let k = C.length - 1;
    while (k > 0 && C[k].x > x) k--;
    return C[k].seg;
  }
  setSegment(seg, { now = false } = {}) {
    seg = ALIAS[seg] || seg;
    if (seg === 'tunnel' || seg === 'station') return; // the painted track layer covers the view
    for (const B of this.bands) {
      if (B.changes.at(-1).seg === seg && !now) continue;
      if (now) { B.changes = [{ x: -1e9, seg }]; this.clear(B); }
      else B.changes.push({ x: B.cmax + 0.5, seg });
    }
  }
  clear(B) {
    for (const m of B.chunks.values()) B.g.remove(m);
    for (const s of B.slots.values()) for (const m of s) B.g.remove(m);
    B.chunks.clear(); B.slots.clear();
  }
  // ------------------------------------------------------------ per frame
  update(dt, view, { speed = 1, lights = 0, haze = null, visible = true } = {}) {
    this.group.visible = visible;
    if (!visible) return;
    this.onU.value = lights;
    this.nightMat.visible = lights > 0.03;
    if (haze) this.hazeMat.color.set(haze);
    const cy = Math.cos(view.yaw), ty = Math.tan(view.yaw);
    const drop = Math.tan(view.pitch) * cy;
    for (const B of this.bands) {
      B.scroll += dt * speed * B.v;
      const zc = B.z - B.depth * U * 0.5;
      // parallax: the band slides with the camera by (1 - par); its horizon drops with the pitch
      B.g.position.set(-B.scroll + view.x * (1 - B.par), drop * (zc - this.refZ), 0);
      // the content range in view (the view ray hits the band at rayX; yaw widens it)
      const rayX = view.x + ty * (zc - view.z);
      const half = view.halfW / Math.max(0.3, cy) + Math.abs(ty) * B.depth * U * 0.5 + 1.6;
      const c0 = rayX - half - B.g.position.x, c1 = rayX + half - B.g.position.x;
      B.cmax = c1;
      // ground chunks
      const GL = VP.NEAR.len * U;
      const i0 = Math.floor(c0 / GL) - 1, i1 = Math.floor(c1 / GL) + 1;
      for (const [i, m] of B.chunks) if (i < i0 || i > i1) { B.g.remove(m); B.chunks.delete(i); }
      for (let i = i0; i <= i1; i++) if (!B.chunks.has(i)) {
        const seg = this.segAt(B, i * GL);
        const m = this.piece('g:' + B.ground, (i & 3) + (seg === 'farm' ? 4 : 0), seg);
        m.position.set(i * GL, B.y, B.z);
        B.g.add(m); B.chunks.set(i, m);
      }
      // props in slots
      const s0 = Math.floor((c0 - 2) / B.sp), s1 = Math.floor(c1 / B.sp);
      for (const [i, list] of B.slots) if (i < s0 - 1 || i > s1 + 1) { for (const m of list) B.g.remove(m); B.slots.delete(i); }
      for (let i = s0; i <= s1; i++) if (!B.slots.has(i)) {
        const seg = this.segAt(B, i * B.sp);
        const list = [];
        for (const [type, seed, dx, dz] of B.slot(seg, i)) {
          const m = this.piece(type, seed);
          m.position.set(i * B.sp + dx, B.y + standY(B, dz) * U, B.z + dz * U);
          B.g.add(m); list.push(m);
        }
        B.slots.set(i, list);
      }
    }
    this.haze.position.set(view.x, 1.2 + drop * (-3.0 - this.refZ), -3.0);
  }
}
