// The Kodama: a 0-series-style bullet train in voxels (0.05 m). Ivory body,
// blue window band and skirt, round nose with a headlight, sliding doors
// (separate meshes), a glowing orange destination LED by each door, a
// pantograph, gangway bellows. Only the platform side (+z) and the roof are
// modelled; the far side is open (never seen).
//
//   const car = shinkansenCar({ nose: true, number: 7 });
//   car.userData.openDoors(k)   // 0 closed .. 1 open
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, tone, hash3, sh, V5 } from './build.js';
import { PixCanvas } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';

export const CAR_LEN = 25; // metres (without the nose)
const IVORY = 0xf2eee2, IVORY_D = 0xd8d2c2, BLUE = 0x1e4a9a, BLUE_D = 0x163a7a, GLASS = 0x2a3448, GLASS_L = 0x5a6a88, GREY = 0x8a8e96, DARK = 0x2a2a30;
const Y0 = -24, YW0 = 22, YW1 = 34, YTOP = 52; // voxel heights (y = 0: platform level)
const ZF = 0; // side face

// side profile: how far the side bulges out at height y (tumblehome) -> z of the surface
const sideZ = (y) => (y < -10 ? -2 : y < 0 ? -1 : y > 44 ? -Math.round((y - 44) ** 1.6 / 5) : 0);

function destLed() {
  const p = new PixCanvas(40, 10, 3);
  p.fill('#120806');
  for (let x = 0; x < 40; x += 2) for (let y = 1; y < 10; y += 2) p.px(x, y, '#241008');
  p.text('こだま', 2, 1, { font: `7px ${FONT.tiny}`, color: '#ff9a2a' });
  p.text('木霊町', 38, 1, { font: `7px ${FONT.tiny}`, color: '#ffd04a', align: 'right' });
  return p;
}
function numberPlate(n) {
  const p = new PixCanvas(14, 9, 4);
  p.fill('#f2eee2');
  p.text(String(n), 7, 0, { font: `9px ${FONT.ui}`, color: '#1e4a9a', align: 'center' });
  return p;
}

export function shinkansenCar({ nose = false, number = 1, panto = false, len = CAR_LEN, onU = null } = {}) {
  const L = Math.round(len / V5); // voxels
  const x0 = -L / 2, x1 = L / 2 - 1;
  const NOSE = nose ? 80 : 0; // nose length (voxels), extends past x1
  const v = new VoxelModel(), glow = new VoxelModel();
  const doorXs = [x0 + 30, x1 - 50]; // door left edges
  const DW = 20, DH = 40;
  const winPitch = 20, winW = 13;
  const isDoor = (x) => doorXs.some((d) => x >= d && x < d + DW);
  const color = (x, y, z) => {
    if (y < -12) return DARK; // underframe
    if (y < 2) { // the blue skirt: louvred vents, a darker lower lip, road grime
      if (y < -9) return sh(BLUE_D, 0.85);
      const lv = ((x - x0) % 60 + 60) % 60;
      if (lv > 6 && lv < 18 && y > -8 && y < -1) return (y & 1) ? sh(BLUE_D, 0.7) : sh(BLUE, 1.12);
      return tone(x, y, z, BLUE, BLUE_D, sh(BLUE, 1.1), 0.05, 0.04);
    }
    if (y >= YW0 - 2 && y <= YW1 + 2) return y === YW0 - 2 ? sh(BLUE, 1.15) : BLUE; // window band, a lit lower edge
    if (y === 4) return sh(BLUE, 1.05); // the pinstripe over the skirt
    // panel joints and seams, grime low down, rain streaks under the windows
    if (((x - x0) % 50 + 50) % 50 === 0 && y > 2 && y < 46) return IVORY_D;
    if (y === 46 || y === 10) return IVORY_D;
    if (y < 9 && hash3(x >> 3, y >> 1, 7) < 0.3) return sh(IVORY, 0.93); // road grime in soft patches
    if (y < YW0 - 2 && y > 12 && ((x - x0) % winPitch + winPitch) % winPitch === 9 && hash3(x, y, 9) < 0.6) return sh(IVORY, 0.94);
    if (y > 46) return tone(x, y, z, IVORY, IVORY_D, 0xfaf8f0, 0.05, 0.05);
    return tone(x, y, z, IVORY, IVORY_D, 0xfaf8f0, 0.04, 0.04);
  };
  // body shell (side surface + roof), length along x
  for (let x = x0; x <= x1; x++) {
    for (let y = Y0; y <= YTOP; y++) {
      const z = sideZ(y);
      // side wall 2 voxels thick
      v.set(x, y, z, color(x, y, z));
      v.set(x, y, z - 1, sh(color(x, y, z), 0.8));
    }
    // roof (curves over the top)
    for (let z = -60; z <= sideZ(YTOP); z++) v.set(x, YTOP + (z < -50 ? 0 : 0), z, tone(x, YTOP, z, 0xb8bcc4, 0x9aa0a8, 0xc8ccd4, 0.12, 0.05));
    for (let y = YTOP - 4; y < YTOP; y++) { const z = sideZ(y); v.set(x, y, z, x % 40 === 0 ? IVORY_D : color(x, y, z)); }
  }
  // windows: rounded glass holding the sky and the green fields going by, a
  // bevelled silver frame (lit top / left, shaded bottom / right)
  for (let wx = x0 + 8; wx + winW < x1 - 6; wx += winPitch) {
    if (doorXs.some((d) => wx + winW > d - 3 && wx < d + DW + 3)) continue;
    for (let x = wx; x < wx + winW; x++) for (let y = YW0; y <= YW1; y++) {
      const ex = x === wx || x === wx + winW - 1, ey = y === YW0 || y === YW1;
      if (ex && ey) continue;
      const k = (y - YW0) / (YW1 - YW0);
      let c = k > 0.72 ? 0x9ab4d0 : k > 0.5 ? 0x6a86a8 : k > 0.3 ? 0x3e5a54 : GLASS;
      if ((x - wx + (YW1 - y)) % 11 < 2) c = 0xc8d8ec;
      v.set(x, y, 0, c);
      v.set(x, y, 1, null);
    }
    for (let x = wx - 1; x <= wx + winW; x++) { v.set(x, YW0 - 1, 1, 0x6a6e76); v.set(x, YW1 + 1, 1, 0xc4c8d0); }
    for (let y = YW0; y <= YW1; y++) { v.set(wx - 1, y, 1, 0xb4b8c0); v.set(wx + winW, y, 1, 0x7a7e86); }
  }
  // door openings (holes; the door leaves are separate meshes)
  for (const d of doorXs) {
    for (let x = d; x < d + DW; x++) for (let y = 0; y < DH; y++) { v.set(x, y, 0, null); v.set(x, y, -1, null); }
    for (let x = d - 1; x <= d + DW; x++) v.set(x, DH, 1, GREY);
    for (let y = 0; y <= DH; y++) { v.set(d - 1, y, 1, GREY); v.set(d + DW, y, 1, GREY); }
    // the dim vestibule inside (floor + back wall)
    for (let x = d; x < d + DW; x++) for (let z = -12; z <= -1; z++) v.set(x, -1, z, 0x5a6070);
    for (let x = d; x < d + DW; x++) for (let y = 0; y < DH; y++) v.set(x, y, -13, y > 26 ? 0xc8c4b8 : 0xb8b4a8);
    // step plate
    for (let x = d; x < d + DW; x++) v.set(x, -1, 1, 0xa8acb4);
  }
  // pantograph + AC boxes on the roof
  if (panto) {
    for (let x = -14; x <= 14; x++) v.set(x, YTOP + 1, -30, DARK);
    for (const ix of [-12, 12]) for (let y = YTOP + 1; y <= YTOP + 4; y++) v.set(ix, y, -30, y & 1 ? 0x8a5a4a : 0xc8a090); // insulators
    for (let k = 0; k <= 14; k++) { v.set(-8 + k, YTOP + 4 + k, -30, GREY); v.set(8 - k, YTOP + 4 + k, -30, GREY); }
    for (let z = -40; z <= -20; z++) v.set(0, YTOP + 18, z, 0x5a5a62);
  }
  for (let ax = x0 + 40; ax < x1 - 40; ax += 120) for (let x = ax; x < ax + 30; x++) for (let z = -44; z <= -16; z++) for (let y = YTOP + 1; y <= YTOP + 4; y++) {
    const grille = y === YTOP + 4 && (x - ax) % 6 > 1 && (z % 6 + 6) % 6 > 1;
    v.set(x, y, z, grille ? 0x6a6e76 : y === YTOP + 4 ? 0xd4d8de : (x - ax) % 10 === 0 ? 0x8a8e96 : 0xa8acb4);
  }
  if (!panto) for (let y = YTOP + 1; y <= YTOP + 6; y++) v.set(x0 + 20, y, -24, 0x4a4a52); // a little antenna
  // underfloor equipment boxes between the bogies (grilles, a darker lid)
  for (let bx = x0 + 60; bx < x1 - 60; bx += 70) for (let x = bx; x < bx + 44; x++) for (let y = Y0 - 4; y < Y0 + 10; y++) {
    if (y > -13) continue;
    v.set(x, y, -3, y === Y0 + 9 || y === -13 ? 0x3a3a42 : ((x - bx) % 4 === 0 && y > Y0) ? 0x2a2a30 : 0x5a5e66);
  }
  // bogies: wheels with lit rims and hubs, springs, a frame
  for (const bx of [x0 + 30, x1 - 30]) {
    for (let x = bx - 16; x <= bx + 16; x++) for (let y = Y0 - 2; y < Y0 + 2; y++) v.set(x, y, -1, (x + y) % 5 === 0 ? 0x4a4a52 : 0x34343c);
    for (const wx of [bx - 9, bx + 9]) for (let x = wx - 6; x <= wx + 6; x++) for (let y = Y0 - 13; y <= Y0 - 1; y++) {
      const d = Math.hypot(x - wx, y - (Y0 - 7));
      if (d > 6.4) continue;
      v.set(x, y, 0, d > 5.4 ? 0x9aa0a8 : d < 1.6 ? 0xa8acb4 : d < 2.6 ? 0x3a3a42 : 0x22222a);
    }
    for (const sx of [bx - 2, bx + 2]) for (let y = Y0 - 6; y < Y0; y++) v.set(sx, y, 1, y & 1 ? 0x7a7e86 : 0x4a4e56);
  }
  // gangway bellows at the ends
  for (const ex of nose ? [x0 - 1] : [x0 - 1, x1 + 1]) for (let y = 0; y <= 46; y++) for (let z = -6; z <= -1; z++) v.set(ex, y, z, y % 3 === 0 ? 0x1a1a20 : DARK);

  // ---- the round nose (0-series): tapers in height and depth, headlight + windshield
  if (nose) {
    for (let i = 1; i <= NOSE; i++) {
      const t = i / NOSE; // 0 at the body joint .. 1 at the tip
      const x = x1 + i;
      const topY = Math.round(YTOP - (YTOP - 8) * Math.pow(t, 1.7));
      const botY = Math.round(Y0 + 4 + 18 * Math.pow(t, 2.6));
      const zIn = Math.round(-60 * Math.pow(t, 2.2)); // side face recedes towards the centre line
      for (let y = botY; y <= topY; y++) {
        const yN = (y - botY) / Math.max(1, topY - botY);
        const z = zIn + sideZ(y) - Math.round(Math.pow(Math.abs(yN - 0.45) * 2, 3) * 6 * t);
        let c = color(x, y, z);
        // windshield on the upper slope, headlight band
        if (t < 0.55 && t > 0.08 && y > topY - 10 && y > YW0) c = (y + i) % 9 < 2 ? 0x6a7a98 : GLASS;
        if (y >= YW0 - 2 && y <= YW1 + 2 && t > 0.08 && !(t < 0.55 && y > topY - 10)) c = BLUE;
        v.set(x, y, z, c);
        v.set(x, y, z - 1, sh(c, 0.8));
        // fill towards the centre line so the top silhouette is solid
        for (let zz = z - 2; zz >= zIn - 60 + Math.round(40 * t) && zz > -62; zz -= 1) { if (y === topY) v.set(x, y, zz, c); }
      }
    }
    // headlight cluster near the tip + the round "hikari" nose cap
    for (let y = 2; y <= 8; y++) for (let x = x1 + NOSE - 10; x <= x1 + NOSE - 4; x++) glow.set(x, y, -50, 0xfff4c8);
  }
  const body = vm(v, V5, [0, 0, 0]);
  const gl = glowVm(glow, V5, [0, 0, 0], { intensity: 1.4 });
  const g = new THREE.Group();
  g.add(body, gl);
  // destination LEDs + car number by the doors
  for (const d of doorXs) {
    const led = signPlane(destLed(), 0.62, { emissive: 1.5, onU });
    led.position.set((d + DW + 8) * V5 + 0.31, (YW1 + 4) * V5, 0.08);
    g.add(led);
    const np = signPlane(numberPlate(number), 0.22);
    np.position.set((d - 6) * V5, (YW1 + 4) * V5, 0.08);
    g.add(np);
  }
  // door leaves (two per door, slide apart)
  const leaves = [];
  for (const d of doorXs) for (const side of [0, 1]) {
    const dv = new VoxelModel();
    for (let x = 0; x < DW / 2; x++) for (let y = 0; y < DH; y++) {
      const win = y > 24 && y < 36 && x > 2 && x < DW / 2 - 2;
      dv.set(x, y, 0, win ? GLASS : y < 2 ? BLUE : x === 0 || x === DW / 2 - 1 ? IVORY_D : IVORY);
      dv.set(x, y, -1, IVORY_D);
    }
    const m = vm(dv, V5, [0, 0, 0]);
    const baseX = (d + side * (DW / 2)) * V5;
    m.position.set(baseX, 0, 0);
    m.userData.baseX = baseX;
    m.userData.dir = side ? 1 : -1;
    g.add(m);
    leaves.push(m);
  }
  g.userData.openDoors = (k) => { for (const m of leaves) { m.position.x = m.userData.baseX + m.userData.dir * k * (DW / 2) * V5 * 0.95; m.position.z = -0.11 * Math.min(1, k * 4); } };
  g.userData.doors = doorXs.map((d) => (d + DW / 2) * V5);
  g.userData.len = len + (nose ? NOSE * V5 : 0);
  return g;
}
