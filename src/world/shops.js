// The shops of Kodama Ginza. makeShop(kind) builds the facade (shotengai.js)
// with that shop's signs, awning and front, then dresses the inside and the
// pavement in front of it. Returns the group with userData:
//   width, stage, keeper {x,z,yaw} (shopkeeper spot), browse [{x,z,yaw}]
//   (where customers stop), seats [{x,z,y,yaw}], flowers [[name,x,y,z]]
//   (nature sprites to place), pools [{x,z,w,d}] (warm light spill), shutter
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, sh, tone, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas } from '../core/pixtex.js';
import { shopFacade, pottedPlant, H1 } from './shotengai.js';
import { fasciaSign, verticalSign, noren, sampleCase, fishDisplay, bendysLogo, shopPoster, productShelf, bookShelf } from './shopSigns.js';
import { lantern, crate, styroBox, bucket, clothesRack, bookCart, aFrame, redBench, parasol, gachaRow, sleepingCat, bicycle } from './streetProps.js';
import { glassPane } from './station.js';
import { FONT } from '../ui/fonts.js';

const at = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };

export const SHOPS = {
  cafe: { w: 100, name: 'Morning Shibata' },
  florist: { w: 96, name: 'Hana no Hana' },
  shutterA: { w: 84, name: '' },
  fish: { w: 112, name: 'Uo-Ponta' },
  wagashi: { w: 96, name: 'Tsukimi-dō' },
  thrift: { w: 112, name: 'Usagi Recycle' },
  drug: { w: 120, name: 'Kusuri no Kodama' },
  shutterB: { w: 84, name: '' },
  bendys: { w: 128, name: "Bendy's" },
  books: { w: 92, name: 'Fukurō Shobō' },
  kodamaya: { w: 120, name: 'Kodamaya' },
  tabako: { w: 84, name: '' },
};

export function makeShop(kind, { onU = null, seed = 1 } = {}) {
  const S = SHOPS[kind];
  let g;
  const U = { keeper: null, browse: [], seats: [], flowers: [], pools: [] };
  const W = S.w * V5;
  switch (kind) {
    // ------------------------------------------------ kissaten "Morning Shibata"
    case 'cafe': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xd8c4a0, wallKind: 'brick', front: 'glass', bays: 4, doorBay: 3, frame: 0x6a4a2e,
        awning: { a: 0x8a4a2a, b: 0xf0d8b0, depth: 20, drop: 6, text: 'COFFEE · TOAST · MORNING SET' },
        sign: fasciaSign({ ja: '喫茶 モーニング柴田', en: 'KISSATEN  MORNING SHIBATA  since 1968', w: 300, h: 34, bg: '#3a2418', style: 'wood', size: 16, seed, icon: cupIcon }),
        vsign: verticalSign({ ja: '珈琲', bg: '#f4ecd8', fg: '#5a2a1a', frame: '#5a2a1a' }), vsignGlow: 0.7,
        upper: 'flush', windowKind: 'curtain', curtain: '#e8c8a0', floor: 0x8a5a3a, inWall: 0xe8d4b0, litChance: 0.7,
      });
      const st = g.userData.stage;
      // the sample case in the left bay: a cabinet with the plastic food behind glass
      const cab = new VoxelModel();
      fill(cab, -14, 13, 0, 17, -4, 3, (x, y) => (y === 17 ? 0x5a3a24 : 0x6a4a2e));
      const cm = vm(cab, V5); at(cm, -W / 2 + 0.95, 0, 0.32); g.add(cm);
      const sc = signPlane(sampleCase({ seed }), 1.32); at(sc, -W / 2 + 0.95, 0.62 + 0.29, 0.52); g.add(sc);
      const sg = glassPane(1.38, 0.62); at(sg, -W / 2 + 0.95, 0.62 + 0.29, 0.53); g.add(sg);
      // inside: tables, chairs, counter with siphons, retro lamps
      interiorTables(g, st, { col: 0x6a3a22, seat: 0xc84a3a, n: 3 });
      counter(g, st, { col: 0x5a3a24, top: 0xd8c8a8, siphons: true, onU });
      for (let i = 0; i < 3; i++) { const L = pendant(0xffc870, onU); at(L, st.x0 + 0.8 + i * 1.6, 2.1, st.z0 + 1.2); g.add(L); }
      const af = aFrame({ title: 'モーニング', lines: [['トースト', '350'], ['ゆで卵', 'つき'], ['珈琲', '400'], ['ナポリタン', '780'], ['クリームソーダ', '550']], doodle: 'cup', seed });
      at(af, W / 2 - 0.6, 0, 0.75, -0.3); g.add(af);
      const pp = pottedPlant(seed, { big: true }); at(pp, -W / 2 + 0.25, 0, 0.45); g.add(pp);
      U.keeper = { x: W / 2 - 1.3, z: 0.45, yaw: 0.3 };
      U.browse.push({ x: -W / 2 + 1.0, z: 1.15, yaw: Math.PI });
      U.pools.push({ x: 0, z: 1.2, w: W * 0.9, d: 2.2 });
      break;
    }
    // ------------------------------------------------ florist "花のはな"
    case 'florist': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xf0ece0, wallKind: 'mortar', front: 'open',
        awning: { a: 0x3a8a5a, b: 0xf4f0e0, depth: 24, drop: 7, text: 'FLOWERS & PLANTS' },
        sign: fasciaSign({ ja: '花のはな', en: 'HANA NO HANA  florist', w: 220, h: 34, bg: '#f8f4e8', fg: '#2a6a42', accent: '#e86a8a', font: FONT.cute, size: 20, seed, icon: flowerIcon }),
        upper: 'balcony', rail: 0xe8e4dc, floor: 0x8a8a82, inWall: 0xd8e4d0, litChance: 0.4,
      });
      // tiered stand of zinc buckets spilling out onto the pavement, each with flowers
      const kinds = ['sunflower', 'hydrangea_blue', 'rose', 'lupine_pink', 'hydrangea_pink', 'daisy', 'azalea', 'aster', 'hydrangea_violet', 'lupine_purple', 'susan', 'sunflower'];
      const stand = new VoxelModel();
      for (let t = 0; t < 3; t++) fill(stand, -40, 39, t * 6, t * 6 + 1, -18 + t * 8, -11 + t * 8, 0x8a6a4a);
      for (const x of [-40, 39]) fill(stand, x, x, 0, 17, -18, 13, 0x6a4a2e);
      const sm = vm(stand, V5); at(sm, 0, 0, 0.6); g.add(sm);
      let k = seed;
      for (let t = 0; t < 3; t++) for (let i = 0; i < 7; i++) {
        const b = bucket({ col: [0xa8b0b8, 0x8a9aa8, 0xc8ccd0][(i + t) % 3] });
        const x = -1.75 + i * 0.58, y = (t * 6 + 2) * V5, z = 0.6 + (-14.5 + t * 8) * V5;
        at(b, x, y, z); g.add(b);
        U.flowers.push([kinds[k++ % kinds.length], x, y + b.userData.top - 0.05, z + 0.02, 0.62]);
      }
      // more pots on the ground in front + hanging baskets
      for (let i = 0; i < 6; i++) { const pp = pottedPlant(seed + i * 5, { big: i % 2 === 0, pot: [0xc87a4a, 0x3a6a8a, 0xe8e0d0][i % 3], leaf: [0x4a8a3a, 0x6aa84a, 0x3a7a4a][i % 3] }); at(pp, -2.0 + i * 0.8, 0, 1.55 + (i % 2) * 0.15); g.add(pp); }
      for (const x of [-1.6, 1.6]) { const hb = hangingBasket(seed + x); at(hb, x, 2.05, 1.1); g.add(hb); }
      const af = aFrame({ title: 'きょうの花', lines: [['ひまわり', '300'], ['あじさい', '1200'], ['コスモス', '250']], doodle: 'flower', seed });
      at(af, W / 2 - 0.5, 0, 1.4, -0.4); g.add(af);
      U.keeper = { x: -1.2, z: 0.0, yaw: 0.2 };
      U.browse.push({ x: -0.6, z: 1.7, yaw: Math.PI }, { x: 0.9, z: 1.75, yaw: Math.PI + 0.3 });
      U.pools.push({ x: 0, z: 1.4, w: W * 0.8, d: 2.0 });
      break;
    }
    // ------------------------------------------------ fishmonger "魚ぽん太"
    case 'fish': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xc8d4dc, wallKind: 'metal', front: 'open',
        sign: fasciaSign({ ja: '鮮魚 魚ぽん太', en: 'UO-PONTA  fresh fish', w: 300, h: 34, bg: '#f4f8fc', fg: '#1a3a6a', accent: '#d8302a', font: FONT.chunky, size: 20, seed, icon: fishIcon }),
        signGlow: 0.35,
        vsign: verticalSign({ ja: '朝獲れ', bg: '#d8302a', fg: '#ffffff' }),
        upper: 'flush', windowKind: 'blinds', floor: 0x9aa4a8, inWall: 0xe4ecec, litChance: 0.6, fascia: 0x1a3a6a,
      });
      // slanted ice display table across the front
      const t = new VoxelModel();
      fill(t, -46, 45, 0, 14, -10, 9, (x, y, z) => (y === 14 ? 0x9aa4ac : z === 9 && y % 4 === 0 ? 0xc8d0d8 : z === 9 ? 0xe8ecf0 : 0xd8dee4));
      fill(t, -46, 45, 15, 22, -12, -11, 0xc8d0d8); // back lip the ice leans on
      const tm = vm(t, V5); at(tm, 0, 0, 0.62); g.add(tm);
      const fd = signPlane(fishDisplay({ seed, w: 288, h: 64 }), 4.5); fd.rotation.x = -Math.PI / 2 + 0.42; at(fd, 0, 0.98, 0.6); g.add(fd);
      // styrofoam boxes stacked, a hose, rubber boots, a scale, hanging bulbs
      for (let i = 0; i < 4; i++) { const b = styroBox({ label: [0x3a6ab0, 0xd8302a][i % 2] }); at(b, W / 2 - 0.55, i * 0.3, -0.6 + (i % 2) * 0.05); g.add(b); }
      for (let i = 0; i < 3; i++) { const b = styroBox(); at(b, -W / 2 + 0.6, i * 0.3, -0.9); g.add(b); }
      for (let i = 0; i < 5; i++) { const L = bulb(onU); at(L, -2.0 + i * 1.0, 2.25, 0.5); g.add(L); }
      // back: a big fridge case with glowing shelves
      const fv = new VoxelModel(), fg = new VoxelModel();
      fill(fv, -40, 39, 0, 36, -6, 0, (x, y) => (y === 36 ? 0xd8dce0 : 0xc8ccd0));
      for (let x = -38; x <= 37; x++) for (let y = 4; y <= 33; y++) fg.set(x, y, 1, y % 8 === 0 ? 0xc8e0e8 : ((x * 3 + y * 7) % 11 === 0 ? 0xf0a090 : 0xe0f0f4));
      const fgrp = new THREE.Group(); fgrp.add(vm(fv, V5), glowVm(fg, V5, [0, 0, 0], { intensity: 0.9, mode: 1, onU }));
      at(fgrp, 0, 0, g.userData.stage.z0 + 0.3); g.add(fgrp);
      // banner flags 鮮魚 on the pillars
      const p = new PixCanvas(16, 50, 51); p.rect(0, 0, 16, 50, '#d8302a'); p.rect(0, 0, 2, 50, '#f4f0e8'); [...'大漁'].forEach((c, i) => p.text(c, 9, 4 + i * 16, { font: `12px ${FONT.brush}`, color: '#ffffff', align: 'center' }));
      for (const sx of [-1, 1]) { const fl = signPlane(p, 0.24); at(fl, sx * (W / 2 - 0.12), 1.65, 0.12); g.add(fl); }
      U.keeper = { x: 0.6, z: -0.1, yaw: 0 };
      U.browse.push({ x: -1.4, z: 1.55, yaw: Math.PI }, { x: 0.2, z: 1.6, yaw: Math.PI - 0.2 }, { x: 1.6, z: 1.5, yaw: Math.PI + 0.2 });
      U.pools.push({ x: 0, z: 1.3, w: W * 0.95, d: 2.2 });
      break;
    }
    // ------------------------------------------------ wagashi "つきみ堂"
    case 'wagashi': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0x6a4a32, wallKind: 'wood', front: 'koshi', bays: 3, doorBay: 1, frame: 0x3a2418,
        sign: fasciaSign({ ja: '和菓子 つきみ堂', en: 'TSUKIMI-DŌ  japanese sweets', w: 260, h: 34, style: 'wood', size: 16, seed }),
        upper: 'flush', windowKind: 'shoji', winFrame: 0x3a2418, litChance: 0.6, fascia: 0x3a2418, pillar: 0x3a2418, floor: 0x8a7a62, inWall: 0xe8dcc0,
      });
      // noren over the door
      const nr = signPlane(noren({ text: 'つきみ', bg: '#5a2a6a', fg: '#f8f0e0', w: 70, h: 40, panels: 3, mark: moonMark }), 1.1, { double: true });
      at(nr, 0, 2.05, 0.08); g.add(nr); g.userData.noren = nr;
      // red bench + parasol outside, a glass case of mochi on a stand
      const rb = redBench(); at(rb, -1.25, 0, 1.25); g.add(rb);
      const ps = parasol(); at(ps, -1.95, 0, 1.05); g.add(ps);
      const case_ = new VoxelModel(); fill(case_, -10, 9, 0, 15, -5, 4, 0x5a3a24); fill(case_, -10, 9, 16, 16, -5, 4, 0x3a2418);
      const cm = vm(case_, V5); at(cm, 1.55, 0, 0.6); g.add(cm);
      const sp = new PixCanvas(60, 24, 61); sp.rect(0, 0, 60, 24, '#f8f0e0');
      for (let i = 0; i < 6; i++) { const x = 6 + i * 9; sp.circle(x, 8, 3.5, ['#f8f8f0', '#f8c8d0', '#a8d898'][i % 3]); sp.circle(x, 17, 3.5, ['#8a5a3a', '#f8f8f0', '#f0d080'][i % 3]); }
      for (let i = 0; i < 3; i++) { sp.vline(10 + i * 18, 2, 22, '#c8a878'); for (let k = 0; k < 3; k++) sp.circle(10 + i * 18, 5 + k * 6, 2.5, ['#f8c8d0', '#f8f8f0', '#a8d898'][k]); }
      const cs = signPlane(sp, 0.9); at(cs, 1.55, 0.6, 0.9); cs.rotation.x = -0.6; g.add(cs);
      const cg = glassPane(0.98, 0.3); at(cg, 1.55, 0.95, 0.85); g.add(cg);
      for (const sx of [-1, 1]) { const L = lantern({ col: 0xf4f0e8, onU, text: '甘' }); at(L, sx * (W / 2 - 0.35), 1.85, 0.25); g.add(L); }
      U.seats.push(...rb.userData.seats.map((s) => ({ x: s.x - 1.25, z: 1.25, y: s.y, yaw: 0 })));
      U.keeper = { x: 0.9, z: -0.4, yaw: 0 };
      U.browse.push({ x: 1.55, z: 1.55, yaw: Math.PI });
      U.pools.push({ x: 0.3, z: 1.2, w: W * 0.7, d: 1.8 });
      break;
    }
    // ------------------------------------------------ thrift "うさぎリサイクル"
    case 'thrift': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xe8d8a8, wallKind: 'tile', front: 'open',
        awning: { a: 0xd86a9a, b: 0xfff0f4, depth: 18, drop: 5, text: 'USED CLOTHES · TOYS · RECORDS' },
        sign: fasciaSign({ ja: 'うさぎリサイクル', en: 'USAGI RECYCLE  buy & sell', w: 300, h: 34, bg: '#fff4f8', fg: '#c83a6a', accent: '#3a8ad8', font: FONT.pop, size: 18, seed, icon: rabbitIcon }),
        upper: 'balcony', rail: 0x8a5a6a, floor: 0xa89a82, inWall: 0xf0e8d8, litChance: 0.5,
      });
      for (let i = 0; i < 3; i++) { const r = clothesRack({ seed: seed + i }); at(r, -1.9 + i * 1.6, 0, 0.95 + (i % 2) * 0.15); g.add(r); }
      const st = g.userData.stage;
      for (let i = 0; i < 2; i++) { const r = clothesRack({ seed: seed + 9 + i, len: 34 }); at(r, -1.2 + i * 2.4, 0, st.z0 + 0.6); g.add(r); }
      // bins of stuff, a mannequin, stacked boxes, a record crate, a 100-yen sign
      for (let i = 0; i < 3; i++) { const c = crate({ col: [0x3a6ab0, 0xe8a03a, 0x6aa84a][i], label: true }); at(c, W / 2 - 0.6, i * 0.35, 0.45); g.add(c); }
      const mq = mannequin(0xe8443a); at(mq, -W / 2 + 0.55, 0, 0.5); g.add(mq);
      const p = new PixCanvas(40, 24, 71); p.rect(0, 0, 40, 24, '#ffe040'); p.frame(0, 0, 40, 24, '#c83a6a'); p.text('全品', 20, 2, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' }); p.text('100円〜', 20, 10, { font: `10px ${FONT.bold}`, color: '#c8302a', align: 'center' });
      const ps = signPlane(p, 0.5); at(ps, W / 2 - 0.6, 1.25, 0.66); g.add(ps);
      const cat = sleepingCat({ col: 0x8a8a92, stripe: 0x5a5a62 }); at(cat, W / 2 - 0.62, 1.05, 0.45); g.add(cat); g.userData.cat = cat;
      U.keeper = { x: 1.4, z: -0.5, yaw: 0 };
      U.browse.push({ x: -1.9, z: 1.6, yaw: Math.PI }, { x: -0.3, z: 1.75, yaw: Math.PI + 0.2 }, { x: 1.3, z: 1.6, yaw: Math.PI - 0.3 });
      U.pools.push({ x: 0, z: 1.2, w: W * 0.8, d: 1.8 });
      break;
    }
    // ------------------------------------------------ drugstore "くすりのコダマ"
    case 'drug': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xf4f4f0, wallKind: 'tile', front: 'open',
        sign: fasciaSign({ ja: 'くすりのコダマ', en: 'KUSURI NO KODAMA  drugstore', w: 320, h: 34, bg: '#ffe040', fg: '#1a3a8a', accent: '#e8301a', style: 'lightbox', font: FONT.bold, size: 20, seed }),
        signGlow: 0.9, signMode: 1,
        vsign: verticalSign({ ja: '薬', bg: '#1a3a8a', fg: '#ffe040', size: 18 }), vsignGlow: 0.9,
        upper: 'flush', windowKind: 'blinds', floor: 0xe8e8e4, inWall: 0xf8f8f4, litChance: 0.8, fascia: 0xffe040,
      });
      // product shelves spilling onto the pavement (bright, packed, POP tags everywhere)
      for (let i = 0; i < 3; i++) {
        // an open gondola: back panel, side frames, shelves; the products are a painted plane on the back panel
        const sv = new VoxelModel();
        fill(sv, -14, 13, 0, 27, -5, -4, 0xe8ecf0);
        for (const x of [-14, 13]) fill(sv, x, x, 0, 27, -5, 4, 0xc8ccd0);
        for (const y of [0, 7, 14, 21]) fill(sv, -13, 12, y, y, -3, 4, (xx, yy, z) => (z === 4 ? 0xb8bcc4 : 0xd8dce0));
        fill(sv, -14, 13, 28, 31, -5, 4, (x, y) => (y === 28 ? 0xc8201a : 0xffe040)); // POP header
        // packed products on every shelf (boxes, bottles, bags) + yellow POP tags on the edges
        const PC = [0xe8443a, 0x3a8ad8, 0xf0c040, 0x6ab04a, 0xff8ab0, 0x8a5ac8, 0x3ac8b8, 0xf4f0e8, 0xe87a3a, 0x2a2a34, 0xffffff];
        for (const y of [1, 8, 15, 22]) {
          let x = -13;
          while (x < 12) {
            const bw = 1 + Math.floor(hash3(x, y, seed + i) * 2), bh = 2 + Math.floor(hash3(y, x, seed + i) * 4), c = PC[Math.floor(hash3(x * 3, y, i + seed) * PC.length)];
            for (let z = -3; z <= 3; z++) fill(sv, x, Math.min(12, x + bw - 1), y, Math.min(y + 5, y + bh - 1 - (z === 3 && bh > 3 ? 1 : 0)), z, z, (xx, yy) => (yy === y + bh - 1 ? sh(c, 1.15) : z === 3 && yy === y + 1 && bh > 2 ? 0xffffff : c));
            x += bw;
          }
          for (let tx2 = -12; tx2 < 12; tx2 += 7) fill(sv, tx2, tx2 + 2, y - 1, y, 5, 5, (xx, yy) => (yy === y ? 0xffe040 : 0xe8301a));
        }
        const sm = vm(sv, V5); at(sm, -2.1 + i * 2.1, 0, 1.0); g.add(sm);
      }
      const st = g.userData.stage;
      for (let i = 0; i < 2; i++) { const tex = signPlane(productShelf({ seed: seed * 5 + i, w: 140, h: 96, rows: 5 }), 2.4, { emissive: 0.35, onU }); at(tex, -1.5 + i * 3, 1.0, st.z0 + 0.05); g.add(tex); }
      // shopping baskets stacked, a big POP board
      const bv = new VoxelModel(); for (let k = 0; k < 4; k++) fill(bv, -5, 4, k * 2, k * 2 + 1, -4, 3, (x, y, z) => ((x + z) % 2 === 0 ? 0xe8301a : 0xc8201a));
      const bm = vm(bv, V5); at(bm, W / 2 - 0.4, 0, 0.6); g.add(bm);
      const pop = new PixCanvas(44, 30, 81); pop.rect(0, 0, 44, 30, '#e8301a'); pop.rect(2, 2, 40, 26, '#ffe040'); pop.text('本日', 22, 3, { font: `7px ${FONT.tiny}`, color: '#e8301a', align: 'center' }); pop.text('ポイント5倍', 22, 12, { font: `9px ${FONT.bold}`, color: '#1a3a8a', align: 'center' });
      const pm = signPlane(pop, 0.55); at(pm, -W / 2 + 0.45, 1.5, 0.15); g.add(pm);
      U.keeper = { x: W / 2 - 0.9, z: 0.3, yaw: 0.2 };
      U.browse.push({ x: -2.1, z: 1.65, yaw: Math.PI }, { x: 0, z: 1.7, yaw: Math.PI + 0.25 }, { x: 2.1, z: 1.65, yaw: Math.PI - 0.2 });
      U.pools.push({ x: 0, z: 1.4, w: W, d: 2.6, col: 0xfff4d8 });
      break;
    }
    // ------------------------------------------------ Bendy's (family restaurant)
    case 'bendys': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xf4ece0, wallKind: 'mortar', front: 'glass', bays: 5, doorBay: 4, frame: 0xc8202a,
        awning: { a: 0xe8303a, b: 0xffffff, depth: 22, drop: 7, text: "BENDY'S · OMURICE · BURGERS · PARFAIT" },
        sign: bendysLogo(), signGlow: 0.95, signW: 88,
        upper: 'flush', windowKind: 'curtain', curtain: '#f0c8c8', floor: 0xd8c8b0, inWall: 0xfff0e0, litChance: 0.9, fascia: 0xc8202a,
      });
      const st = g.userData.stage;
      // booths with red seats along the window, warm pendant lamps, a counter
      for (let i = 0; i < 4; i++) {
        const bx = st.x0 + 0.75 + i * 1.3;
        const bv = new VoxelModel();
        fill(bv, -10, 9, 0, 7, -3, 3, 0x5a3a2a); fill(bv, -10, 9, 8, 9, -6, 6, 0xf4f0e8); // table
        for (const z of [-12, 12]) { fill(bv, -12, 11, 0, 8, z - 3, z + 2, 0xc8302a); fill(bv, -12, 11, 9, 20, z + (z < 0 ? -3 : 2), z + (z < 0 ? -3 : 2), 0xd8403a); }
        const bm = vm(bv, V5); at(bm, bx, 0, st.z1 - 0.9, Math.PI / 2); g.add(bm);
        const L = pendant(0xffb060, onU); at(L, bx, 2.0, st.z1 - 0.9); g.add(L);
      }
      counter(g, { ...st, z0: st.z0 }, { col: 0xc8202a, top: 0xf4f0e8, onU });
      const af = aFrame({ title: 'おすすめ', lines: [['オムライス', '890'], ['ハンバーグ', '980'], ['パフェ', '650'], ['キッズセット', '500']], doodle: 'cup', seed: seed + 3 });
      at(af, -W / 2 + 0.6, 0, 0.7, 0.3); g.add(af);
      U.seats = [];
      for (let i = 0; i < 4; i++) for (const dz of [-0.6, 0.6]) U.seats.push({ x: st.x0 + 0.75 + i * 1.3 + dz * 0, z: st.z1 - 0.9 + dz, y: 9 * V5, yaw: dz > 0 ? Math.PI : 0, booth: i });
      U.keeper = { x: 2.0, z: -1.5, yaw: 0 };
      U.browse.push({ x: -W / 2 + 0.9, z: 1.4, yaw: Math.PI - 0.3 });
      U.pools.push({ x: 0, z: 1.4, w: W, d: 2.6, col: 0xffd8a0 });
      break;
    }
    // ------------------------------------------------ used books "ふくろう書房"
    case 'books': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0xa8987a, wallKind: 'wood', front: 'open',
        sign: fasciaSign({ ja: '古本 ふくろう書房', en: 'FUKURŌ SHOBŌ  used books', w: 260, h: 34, bg: '#e8dcc0', fg: '#3a2a1a', accent: '#5a7a4a', style: 'tin', font: FONT.round, size: 16, seed, icon: owlIcon, fade: 0.05 }),
        upper: 'flush', windowKind: 'curtain', curtain: '#c8b898', floor: 0x7a6a5a, inWall: 0x6a4a32, litChance: 0.3, pillar: 0x4a3424,
      });
      const st = g.userData.stage;
      for (const sx of [-1, 1]) { const sv = new VoxelModel(); fill(sv, -3, 2, 0, 46, -20, 19, 0x5a3a24); const sm = vm(sv, V5); at(sm, sx * (W / 2 - 0.35), 0, st.z0 + 1.1); g.add(sm); const bt = signPlane(bookShelf({ seed: seed + sx * 3, w: 120, h: 140, rows: 6 }), 1.9); bt.rotation.y = -sx * Math.PI / 2; at(bt, sx * (W / 2 - 0.35) - sx * 3.2 * V5, 1.15, st.z0 + 1.1); g.add(bt); }
      const back = signPlane(bookShelf({ seed: seed + 7, w: 150, h: 140, rows: 6 }), 2.4); at(back, 0, 1.15, st.z0 + 0.04); g.add(back);
      for (let i = 0; i < 2; i++) { const bc = bookCart({ seed: seed + i }); at(bc, -1.0 + i * 2.0, 0, 0.75); g.add(bc); }
      // tall stacks on the floor, a sleeping owl figurine, a hanging bulb
      const stk = new VoxelModel(); for (let s = 0; s < 4; s++) { let y = 0; while (y < 18 + s * 4) { const h = 1 + Math.floor(hash3(s, y, seed) * 2); fill(stk, s * 8, s * 8 + 5 + Math.floor(hash3(y, s, 1) * 2), y, y + h - 1, 0, 4, [0x8a6a4a, 0xa8885a, 0xd8c8a0, 0x6a4a3a, 0x4a5a6a][Math.floor(hash3(s, y, 2) * 5)]); y += h; } }
      const sk = vm(stk, V5); at(sk, -0.8, 0, st.z0 + 0.6); g.add(sk);
      const L = bulb(onU); at(L, 0, 2.2, -0.6); g.add(L);
      U.keeper = { x: 0.9, z: st.z0 + 0.9, yaw: 0, sit: true };
      U.browse.push({ x: -1.0, z: 1.5, yaw: Math.PI }, { x: 1.0, z: 1.55, yaw: Math.PI });
      U.pools.push({ x: 0, z: 1.0, w: W * 0.6, d: 1.6 });
      break;
    }
    // ------------------------------------------------ Kodamaya (Grandpa's gachapon shop)
    case 'kodamaya': {
      g = shopFacade({
        w: S.w, seed, onU, wall: 0x5a4030, wallKind: 'wood', front: 'shutter', shutterCol: 0x7a9a8a, rusty: true, posters: [],
        sign: fasciaSign({ ja: '木霊屋', en: 'KODAMAYA  ガチャガチャ  since 1961', w: 260, h: 34, style: 'wood', size: 20, seed, fade: 0.06 }),
        vsign: verticalSign({ ja: 'ガチャ', bg: '#e8d8b8', fg: '#c8302a', frame: '#4a3424', size: 14 }),
        upper: 'flush', windowKind: 'shoji', winFrame: 0x3a2418, litChance: 0.0, fascia: 0x3a2418, pillar: 0x3a2418, h2: 60,
      });
      // a tiled eave (kawara) between the floors
      const ev = new VoxelModel();
      for (let k = 0; k < 9; k++) for (let x = -S.w / 2 - 1; x < S.w / 2 + 1; x++) ev.set(x, -Math.floor(k * 0.55), k, (x + 400) % 4 === 0 ? 0x3a4250 : k === 8 ? 0x2a3240 : 0x4a5262);
      const em = vm(ev, V5); at(em, 0, (H1 + 12 + 2) * V5, 0.08); g.add(em);
      // faded painted letters on the shutter
      const sp = new PixCanvas(160, 40, 91); sp.text('木霊屋', 80, 4, { font: `22px ${FONT.brush}`, color: 'rgba(240,232,214,0.85)', align: 'center' }); sp.text('ガチャガチャ・おもちゃ', 80, 28, { font: `7px ${FONT.tiny}`, color: 'rgba(240,232,214,0.7)', align: 'center' }); sp.scatter(0, 0, 160, 40, 'rgba(0,0,0,0)', 0.0);
      const sl = signPlane(sp, 2.5); sl.position.set(0, 1.35 - (H1 - 5) * V5, 1 * V5 + 0.006); g.userData.shutter.add(sl);
      // the gacha machines out front, a little dusty, and the maneki-neko on a stool
      const row = gachaRow(5, { seed, dust: 0.3 }); at(row, -0.75, 0, 0.42); g.add(row);
      g.userData.gacha = row;
      const mn = manekiNeko(); at(mn, W / 2 - 0.62, 0.42, 0.55); g.add(mn); g.userData.maneki = mn;
      const stool = new VoxelModel(); fill(stool, -4, 3, 0, 7, -4, 3, 0x8a6a4a); const stm = vm(stool, V5); at(stm, W / 2 - 0.62, 0, 0.55); g.add(stm);
      const bk = bicycle({ col: 0x3a5a4a, seed: 3 }); at(bk, -W / 2 + 0.2, 0, 1.25, 0.2); g.add(bk);
      U.keeper = { x: 0.6, z: 1.0, yaw: Math.PI };
      U.browse.push({ x: -1.6, z: 1.2, yaw: Math.PI }, { x: -0.9, z: 1.3, yaw: Math.PI }, { x: -0.2, z: 1.25, yaw: Math.PI });
      break;
    }
    // ------------------------------------------------ closed shops
    case 'shutterA':
    case 'shutterB':
    case 'tabako': {
      const tab = kind === 'tabako';
      g = shopFacade({
        w: S.w, seed, onU, wall: kind === 'shutterA' ? 0xb8c8c0 : tab ? 0xe8e0d0 : 0xd8c8b8, wallKind: kind === 'shutterB' ? 'metal' : 'mortar', front: 'shutter',
        shutterCol: kind === 'shutterA' ? 0x8aa0b8 : 0xa8a8a8, rusty: kind === 'shutterB',
        posters: kind === 'shutterA' ? ['tenant', 'closing'] : tab ? ['cat', 'tanabata'] : ['tenant', 'sale'],
        sign: tab ? fasciaSign({ ja: 'たばこ', en: 'TOBACCO · SALT · STAMPS', w: 200, h: 34, bg: '#c8302a', fg: '#ffffff', style: 'tin', font: FONT.bold, size: 18, seed, fade: 0.08 })
          : fasciaSign({ ja: kind === 'shutterA' ? 'おもちゃのマツダ' : 'カメラのイシイ', en: kind === 'shutterA' ? 'MATSUDA TOYS' : 'ISHII CAMERA', w: 220, h: 34, bg: '#e8e0d0', fg: '#5a5a62', style: 'tin', font: FONT.round, size: 16, seed, fade: 0.14 }),
        upper: kind === 'shutterB' ? 'balcony' : 'flush', litChance: 0.15, laundry: kind !== 'shutterA',
      });
      if (tab) { // the little tobacco window with a red phone beside it
        const ph = new VoxelModel(); fill(ph, -3, 2, 0, 22, -2, 2, 0x3a3a40); fill(ph, -4, 3, 23, 34, -3, 3, 0xd8302a); fill(ph, -2, 1, 26, 30, 4, 4, 0x2a2a30);
        const pm = vm(ph, V5); at(pm, W / 2 - 0.45, 0, 0.5); g.add(pm);
      }
      // weeds in the shutter rail, an old bicycle left here
      U.flowers.push(['tuft_1', -W / 2 + 0.3, 0, 0.12, 0.6], ['tuft_2', W / 2 - 0.4, 0, 0.12, 0.5]);
      if (kind === 'shutterB') { const bk = bicycle({ col: 0x8a3a3a, seed: 6, kick: true }); at(bk, 0.3, 0, 0.6, -0.1); g.add(bk); }
      U.browse.push({ x: 0, z: 1.4, yaw: Math.PI });
      break;
    }
    default: throw new Error('unknown shop ' + kind);
  }
  Object.assign(g.userData, U, { kind, name: S.name });
  return g;
}

// ---------------------------------------------------------------- interior helpers
function interiorTables(g, st, { col = 0x6a3a22, seat = 0xc84a3a, n = 3 } = {}) {
  for (let i = 0; i < n; i++) {
    const v = new VoxelModel();
    fill(v, -6, 5, 13, 14, -6, 5, col); fill(v, -1, 0, 0, 12, -1, 0, 0x2a2a30); fill(v, -4, 3, 0, 0, -4, 3, 0x2a2a30);
    for (const z of [-11, 11]) { fill(v, -4, 3, 8, 9, z - 2, z + 1, seat); fill(v, -1, 0, 0, 7, z, z, 0x2a2a30); }
    const m = vm(v, V5); at(m, st.x0 + 0.9 + i * 1.5, 0.05, (st.z0 + st.z1) / 2 + 0.2, Math.PI / 2); g.add(m);
  }
}
function counter(g, st, { col = 0x5a3a24, top = 0xd8c8a8, siphons = false, onU = null } = {}) {
  const v = new VoxelModel();
  const len = Math.round((st.x1 - st.x0) / V5 * 0.45);
  fill(v, -len / 2, len / 2 - 1, 0, 19, -4, 4, (x, y) => (y === 19 ? top : y % 5 === 0 ? sh(col, 0.85) : col));
  if (siphons) for (let i = 0; i < 3; i++) { const x = -len / 2 + 6 + i * 7; fill(v, x, x + 1, 20, 21, -1, 0, 0x3a3a40); ell(v, x + 1, 25, 0, 2.2, 3, 2.2, 0xb8d8e8); ell(v, x + 1, 23, 0, 2, 1.5, 2, 0x5a3020); }
  const m = vm(v, V5); at(m, st.x1 - len / 2 * V5 - 0.2, 0.05, st.z0 + 0.55); g.add(m);
}
function pendant(col = 0xffc870, onU = null) {
  const v = new VoxelModel(), gl = new VoxelModel();
  fill(v, 0, 0, 4, 14, 0, 0, 0x2a2a30);
  for (let y = 0; y < 4; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const r = 1.5 + y * 0.6; const d = Math.hypot(x, z); if (d <= r && d > r - 1.1) v.set(x, 3 - y, z, 0x3a5a4a); }
  gl.set(0, 0, 0, col); gl.set(-1, 0, 0, col); gl.set(0, 0, -1, col); gl.set(-1, 0, -1, col);
  const g = new THREE.Group(); g.add(vm(v, V25, [0, 14, 0]), glowVm(gl, V25, [0, 14, 0], { intensity: 1.3, onU }));
  return g;
}
function bulb(onU = null) {
  const v = new VoxelModel(), gl = new VoxelModel();
  fill(v, 0, 0, 3, 12, 0, 0, 0x2a2a30); fill(v, -1, 0, 3, 3, -1, 0, 0x6a6a72);
  ell(gl, 0, 1.5, 0, 1.6, 1.8, 1.6, 0xfff0c0);
  const g = new THREE.Group(); g.add(vm(v, V25, [0, 12, 0]), glowVm(gl, V25, [0, 12, 0], { intensity: 1.5, mode: 3, onU }));
  return g;
}
function hangingBasket(seed = 1) {
  const v = new VoxelModel();
  for (let y = 0; y < 5; y++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) { const r = 2 + y; const d = Math.hypot(x, z); if (d <= r && (d > r - 1.2 || y === 0)) v.set(x, y, z, 0x8a6a4a); }
  ell(v, 0.5, 6, 0.5, 6, 3.5, 6, (x, y, z) => { const h = hash3(x, y, z + seed * 10); return h < 0.12 ? 0xff8ab0 : h < 0.2 ? 0xffffff : h < 0.5 ? 0x3a7a3a : 0x5a9a4a; });
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4 + (i % 3); k++) v.set(-5 + i * 2, -k, (i % 2) * 4 - 2, 0x4a8a3a);
  fill(v, 0, 0, 6, 18, 0, 0, 0x6a6a72);
  return vm(v, V25, [0.5, 18, 0.5]);
}
function mannequin(col = 0xe8443a) {
  const v = new VoxelModel();
  fill(v, -1, 0, 0, 1, -3, 2, 0x5a5a62); fill(v, 0, 0, 2, 20, 0, 0, 0x5a5a62);
  ell(v, 0.5, 30, 0.5, 6, 10, 4, (x, y) => (y < 24 ? sh(col, 0.85) : col));
  ell(v, 0.5, 43, 0.5, 3, 3.5, 3, 0xe8dcc8);
  for (const sx of [-7, 6]) fill(v, sx, sx + 1, 26, 37, -1, 0, col);
  return vm(v, V25, [0.5, 0, 0.5]);
}
export function manekiNeko() {
  const v = new VoxelModel();
  const W2 = 0xfaf6ee, R = 0xd8302a, G = 0xd8a830;
  ell(v, 0.5, 6, 0.5, 6, 6, 5, W2); // body
  ell(v, 0.5, 15, 0.5, 5.5, 5, 4.5, W2); // head
  for (const sx of [-4, 3]) { v.set(sx, 20, 0, W2); v.set(sx, 21, 0, W2); v.set(sx + (sx < 0 ? 1 : 0), 20, 1, 0xf0a0a8); }
  fill(v, -4, 4, 10, 10, -3, 4, R); v.set(0, 9, 5, G); v.set(0, 8, 5, G); // collar + bell
  v.set(-2, 15, 5, 0x2a2228); v.set(2, 15, 5, 0x2a2228); v.set(0, 13, 5, 0xf0a0a8);
  fill(v, -2, -1, 14, 14, 5, 5, undefined);
  ell(v, 2, 7, 3, 3, 3, 2, G); // koban coin
  const body = vm(v, V25, [0.5, 0, 0.5]);
  const av = new VoxelModel(); fill(av, -1, 1, 0, 6, -1, 1, W2); fill(av, -1, 1, 7, 8, -1, 1, 0xf0e8e0);
  const arm = vm(av, V25, [0, 0, 0]);
  const pivot = new THREE.Group(); pivot.add(arm); pivot.position.set(-5 * V25, 12 * V25, 1 * V25);
  const g = new THREE.Group(); g.add(body, pivot);
  g.userData.arm = pivot;
  g.userData.awake = false;
  g.userData.update = (dt, t) => { pivot.rotation.x = g.userData.awake ? -0.4 + Math.sin(t * 5) * 0.5 : -0.2 + Math.sin(t * 0.6) * 0.02; };
  return g;
}

// ---------------------------------------------------------------- sign icons (drawn into fascia signs)
function cupIcon(p, x, cy) { p.rect(x + 2, cy - 5, 12, 10, '#f4ecd8'); p.ring(x + 16, cy, 3, '#f4ecd8'); p.rect(x + 3, cy - 4, 10, 2, '#6a3a1a'); for (let i = 0; i < 3; i++) p.vline(x + 4 + i * 4, cy - 10 - (i % 2), cy - 7, '#d8c8a8'); return 24; }
function flowerIcon(p, x, cy) { for (let a = 0; a < 5; a++) p.circle(x + 10 + Math.cos(a * 1.26) * 5, cy - 2 + Math.sin(a * 1.26) * 5, 3.5, '#ff8ab0'); p.circle(x + 10, cy - 2, 3, '#ffd040'); p.vline(x + 10, cy + 4, cy + 12, '#3a8a4a'); return 24; }
function fishIcon(p, x, cy) { p.ellipse(x + 10, cy, 9, 5, '#3a6ab0'); p.ellipse(x + 10, cy + 2, 7, 2, '#c8e0f0'); p.poly([[x + 18, cy], [x + 24, cy - 6], [x + 24, cy + 6]], '#3a6ab0'); p.px(x + 5, cy - 1, '#ffffff'); return 28; }
function rabbitIcon(p, x, cy) { p.circle(x + 10, cy + 2, 7, '#ffffff'); p.ellipse(x + 7, cy - 8, 2, 5, '#ffffff'); p.ellipse(x + 13, cy - 8, 2, 5, '#ffffff'); p.ellipse(x + 7, cy - 8, 1, 3, '#ffb0c8'); p.ellipse(x + 13, cy - 8, 1, 3, '#ffb0c8'); p.px(x + 7, cy + 1, '#2a1828'); p.px(x + 13, cy + 1, '#2a1828'); p.ring(x + 10, cy + 2, 7, '#c83a6a'); return 24; }
function owlIcon(p, x, cy) { p.ellipse(x + 10, cy + 1, 8, 9, '#8a6a4a'); p.circle(x + 7, cy - 1, 3, '#f4ecd8'); p.circle(x + 13, cy - 1, 3, '#f4ecd8'); p.px(x + 7, cy - 1, '#2a1828'); p.px(x + 13, cy - 1, '#2a1828'); p.poly([[x + 9, cy + 2], [x + 11, cy + 2], [x + 10, cy + 4]], '#e8a030'); return 24; }
function moonMark(p, cx, cy) { p.circle(cx, cy, 7, '#f8e8b0'); p.circle(cx + 3, cy - 2, 6, '#5a2a6a'); }
