// Background folk generator: commuters, students, tourists, grannies, kids
// and shoppers drawn from Japanese animal species (tanuki, shiba, cats,
// rabbits, macaques, foxes, sika deer, bears, otters, cranes...). Deterministic
// per seed so a crowd looks the same every time.
//   const def = makeFolk(12, 'salaryman');  -> a Character definition
//   const prop = folkProp(def)               -> 'briefcase' | 'suitcase' | ...
import { KID_SPECIES } from './characters.js';

const rngOf = (seed) => { let a = (seed * 9301 + 49297) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const SPECIES = [
  ...KID_SPECIES,
  { species: 'cat', skin: 0x8a8a92, light: 0xe8e8ec, earInner: 0xffc0c8, ears: 'cat', tail: 'cat', tailColor: 0x8a8a92 },
  { species: 'cat', skin: 0x2a2a30, light: 0x4a4a52, earInner: 0x8a6a7a, ears: 'cat', tail: 'cat', tailColor: 0x2a2a30, face: { iris: '#d8b020', irisLight: '#ffe060' } },
  { species: 'cat', skin: 0xf4ece0, light: 0xffffff, earInner: 0xffc0c8, ears: 'cat', tail: 'cat', tailColor: 0xe8a04a, tailTip: 0x3a2a20 },
  { species: 'shiba', skin: 0x3a3030, light: 0xe8d8c0, earInner: 0x6a5a58, ears: 'shiba', tail: 'shiba', tailColor: 0x3a3030 },
  { species: 'shiba', skin: 0xf0e8d8, light: 0xffffff, earInner: 0xf8d8c8, ears: 'shiba', tail: 'shiba', tailColor: 0xf0e8d8 },
  { species: 'crane', skin: 0xf4f2ee, ears: 'none', tail: 'none' },
  { species: 'bear', skin: 0x4a3a30, light: 0xa8886a, earInner: 0x8a6a50, ears: 'round', tail: 'stub' },
  { species: 'rabbit', skin: 0xb89a7a, light: 0xf0e0c8, earInner: 0xf0c0b0, ears: 'rabbit', tail: 'rabbit', tailTip: 0xffffff },
];

const SUIT = [0x2e3444, 0x3a3a44, 0x4a4c56, 0x2a3040, 0x5a5a62, 0x3a3428];
const TIE = [0xc83a3a, 0x3a5aa8, 0x2a6a4a, 0x8a3a6a, 0xd8a03a, 0x4a4a5a];
const BRIGHT = [0xe8443a, 0x3a8ad8, 0xf0c040, 0x6ab04a, 0xff8ab0, 0x8a5ac8, 0x3ac8b8, 0xf4f0e8, 0xe87a3a];
const MUTED = [0x8a7a6a, 0x6a7a8a, 0xa89a7a, 0x7a6a8a, 0x5a6a5a, 0xb8a890, 0x9a6a5a];
const KIMONO = [[0x4a5a7a, 0x6a7a9a], [0x7a4a5a, 0x9a6a7a], [0x5a6a4a, 0x7a8a6a], [0x8a7a5a, 0xa89a7a]];

let N = 0;
export function makeFolk(seed, role = null) {
  const r = rngOf(seed + 1);
  role = role || pick(r, ['salaryman', 'salaryman', 'officeLady', 'student', 'tourist', 'granny', 'shopper', 'worker']);
  let sp = pick(r, SPECIES);
  if (role === 'granny' && r() < 0.4) sp = SPECIES.find((s) => s.species === 'crane') || sp;
  const def = {
    id: `folk${seed}_${N++}`, name: '', role,
    ...JSON.parse(JSON.stringify(sp)),
    voice: { pitch: 0.8 + r() * 0.5, kind: 'npc' },
    scale: 0.86 + r() * 0.12,
    face: { eyeStyle: pick(r, ['bead', 'bead', 'dot', 'anime']), ...(sp.face || {}) },
  };
  const girl = r() < 0.5;
  if (girl) def.face.girl = true;
  switch (role) {
    case 'salaryman': {
      const c = pick(r, SUIT);
      Object.assign(def, { outfit: { kind: 'suit', color: c, tie: pick(r, TIE), shirt: 0xf0f0f4 }, sleeve: c, pants: c, shoe: 0x2a2220 });
      if (r() < 0.3) def.glasses = { frame: 0x2a2a2a };
      def.prop = 'briefcase';
      def.idles = ['checkPhone', 'lookAround', 'shift'];
      break;
    }
    case 'officeLady': {
      const c = pick(r, [0x3a3a48, 0xd8ccb8, 0x5a5a6a, 0xf4f0e8, 0x8a5a5a]);
      Object.assign(def, { outfit: { kind: 'suit', color: c, tie: 0xf0f0f4, shirt: 0xf8f4f0 }, sleeve: c, skirt: { color: c, len: 3, flare: 0.6 }, shorts: true, legColor: def.skin, shoe: 0x2a2220 });
      def.face.girl = true;
      def.prop = pick(r, ['shoppingBag', 'briefcase', null]);
      def.idles = ['checkPhone', 'lookAround'];
      break;
    }
    case 'student': {
      if (girl) Object.assign(def, { outfit: { kind: 'sailor', color: 0xf4f2f2, collar: 0x27365e, scarf: pick(r, [0xd8343a, 0x3a5aa8, 0x2a2a30]) }, sleeve: 0xf4f2f2, cuff: 0x27365e, skirt: { color: 0x27365e, len: 3, flare: 1.4, pleats: true }, shorts: true, legColor: def.skin, socks: 0xf4f4f4, shoe: 0x3a2a28 });
      else Object.assign(def, { outfit: { kind: 'suit', color: 0x1e2230, tie: 0x1e2230, shirt: 0x1e2230 }, sleeve: 0x1e2230, pants: 0x1e2230, shoe: 0x2a2220 });
      def.scale = 0.8 + r() * 0.06;
      def.prop = 'backpack';
      def.idles = ['checkPhone', 'lookAround', 'shift'];
      break;
    }
    case 'tourist': {
      const c = pick(r, BRIGHT);
      Object.assign(def, { outfit: { kind: 'tee', color: c, print: r() < 0.5, printCol: pick(r, BRIGHT) }, sleeve: c, sleeveLen: 0.5, pants: pick(r, [0x3a4a6a, 0xc8b898, 0x5a5a62]), shoe: pick(r, [0xf4f0e8, 0xe8443a, 0x3a3a44]) });
      if (r() < 0.5) def.hat = { type: pick(r, ['cap', 'straw', 'beanie']), color: pick(r, BRIGHT) };
      def.prop = pick(r, ['suitcase', 'suitcase', 'backpack']);
      def.idles = ['lookAround', 'lookAround', 'point'];
      break;
    }
    case 'granny': {
      const [c, p] = pick(r, KIMONO);
      if (r() < 0.5) Object.assign(def, { outfit: { kind: 'kimono', color: c, patCol: p, obi: 0x2a2a3a }, sleeve: c, pants: c, feet: 'geta', skirt: { color: c, len: 5, flare: 0.5 } });
      else Object.assign(def, { outfit: { kind: 'cardigan', color: pick(r, MUTED), shirt: 0xf4ece0 }, sleeve: pick(r, MUTED), pants: 0x5a5a62 });
      def.hunch = 0.12 + r() * 0.08; def.scale = 0.84 + r() * 0.06; def.walkSpeed = 0.7;
      def.face.eyeStyle = 'dot'; def.face.brow = '#e8e0d8';
      def.prop = pick(r, ['shoppingBag', null]);
      def.idles = ['stretchSmall', 'lookAround'];
      break;
    }
    case 'kid': {
      const c = pick(r, BRIGHT);
      Object.assign(def, { outfit: { kind: 'tee', color: c, stripes: r() < 0.3, printCol: pick(r, BRIGHT) }, sleeve: c, sleeveLen: 0.5, pants: pick(r, [0x3a4a6a, 0xe8c040, 0x5a8a5a]), shoe: pick(r, BRIGHT) });
      if (r() < 0.4) def.hat = { type: pick(r, ['cap', 'kindergarten']), color: pick(r, [0xf0c040, 0x3a8ad8, 0xe8443a]) };
      def.scale = 0.6 + r() * 0.08; def.face.eyeStyle = 'anime';
      def.idles = ['jump', 'lookAround', 'point'];
      break;
    }
    case 'worker': {
      const c = pick(r, [0x2a3a6a, 0x8a3a2a, 0x3a5a4a]);
      Object.assign(def, { outfit: { kind: 'happi', color: c }, sleeve: c, wideSleeves: true, pants: 0x3a3430, feet: r() < 0.5 ? 'geta' : undefined });
      if (r() < 0.5) def.hat = { type: 'straw' };
      def.prop = null;
      break;
    }
    default: { // shopper
      const c = pick(r, MUTED.concat(BRIGHT));
      Object.assign(def, { outfit: { kind: pick(r, ['cardigan', 'tee', 'dress']), color: c, shirt: 0xf4ece0 }, sleeve: c, pants: pick(r, [0x3a3a44, 0x5a5a62, 0x8a7a6a]) });
      if (def.outfit.kind === 'dress') Object.assign(def, { skirt: { color: c, len: 4, flare: 1.0 }, shorts: true, legColor: def.skin });
      def.prop = pick(r, ['shoppingBag', 'shoppingBag', null]);
    }
  }
  return def;
}
