// The cast, as voxel-chibi definitions (see entities/rig.js + voxbody.js).
// species: turtle | fox | shiba | otter | tanuki | crab | tengu | kappa |
//          rabbit | cat | bear | deer | monkey | crane
// outfit.kind: hoodie | tee | samue | cardigan | kimono | happi | apron |
//              waitress | sailor | suit | attendant | chef | yamabushi | dress | plain | bare
// Face options are passed to entities/face.js (eyeStyle anime|bead|dot, colours...).

import { design as mamoruDesign } from '../entities/cast/mamoru.js';
import { design as genzoDesign } from '../entities/cast/genzo.js';
import { design as yukiDesign } from '../entities/cast/yuki.js';
import { design as bendoDesign } from '../entities/cast/bendo.js';
import { design as mioDesign } from '../entities/cast/mio.js';
import { design as kanakoDesign } from '../entities/cast/kanako.js';
import { design as taroboDesign } from '../entities/cast/tarobo.js';
import { design as kappeiDesign } from '../entities/cast/kappei.js';
import { design as attendantDesign } from '../entities/cast/attendant.js';

const TURTLE_FACE = { eyeStyle: 'anime', beak: true, nostrils: true, mouthW: 9, mouthY: 33, eyeY: 21, eyeDX: 10, eyeW: 9, eyeH: 10, blushDX: 16, blushY: 28, browY: 12 };

export const CHARACTERS = {
  // ------------------------------------------------------------ the family
  mamoru: {
    id: 'mamoru', name: 'Mamoru', voice: { pitch: 1.05, kind: 'boy' }, scale: 0.84, design: mamoruDesign,
    species: 'turtle', skin: 0x94bf6c, light: 0xd8e2a2, stripe: 0xe0d870,
    shell: { base: 0x8a7046, seam: 0x4a361e, light: 0xb09a5c, rim: 0x6a5230 },
    outfit: { kind: 'hoodie', color: 0xd99a3c, accent: 0xfff2d8 },
    sleeve: 0xd99a3c, cuff: 0xb8782a, pants: 0x3a3a4a, shoe: 0xf2efe8, shoeStripe: 0xd8483a,
    face: { ...TURTLE_FACE, iris: '#2a3a40', irisLight: '#4a7880', brow: '#4a6a38', lash: '#24202a' },
    ears: 'none', tail: 'stub', earbuds: true, hood: true, waddle: 0.05,
    idles: ['lookAround', 'shift', 'checkPhone', 'sigh'],
  },
  genzo: {
    id: 'genzo', name: 'Grandpa Genzō', voice: { pitch: 0.72, kind: 'old' }, scale: 0.92, hunch: 0.1, design: genzoDesign,
    species: 'turtle', skin: 0x7d9258, light: 0xc8cc92, stripe: 0xb8b060,
    shell: { base: 0x6e5a3a, seam: 0x3a2a18, light: 0x8e7a4e, rim: 0x544028, moss: 0.8, r: 5.6 },
    outfit: { kind: 'samue', color: 0x2f3e66, tie: 0xe8dcc0 },
    sleeve: 0x2f3e66, pants: 0x2f3e66, feet: 'geta', shoe: 0xa87a4a,
    face: { eyeStyle: 'bead', beak: true, nostrils: true, iris: '#2a2018', pupil: '#1a120e', brow: '#f4f0e8', browThick: 3, browW: 10, browY: 13, eyeY: 21, eyeDX: 10, eyeW: 7, eyeH: 7, mouthY: 34, mouthW: 9, lash: '#2a2420', blushCol: '#e8907a' },
    glasses: { frame: 0x5a3a24 }, mustache: 0xf4f0e8, hair: { type: 'fringe', color: 0xf4f0e8 },
    ears: 'none', tail: 'stub', waddle: 0.06,
    walkSpeed: 1.15, idles: ['lookAround', 'stretchSmall', 'shift'],
  },
  mom: {
    id: 'mom', name: 'Mom', voice: { pitch: 1.12, kind: 'lady' }, scale: 0.9,
    species: 'turtle', skin: 0x9ac478, light: 0xdce4a8,
    shell: { base: 0x8a7a50, seam: 0x4a3a22, light: 0xb0a060, rim: 0x6a5a34 },
    outfit: { kind: 'cardigan', color: 0xd8a8a0, shirt: 0xf4f0e8 }, sleeve: 0xd8a8a0, pants: 0x5a5a6a, shoe: 0xe8e0d8,
    face: { ...TURTLE_FACE, girl: true, iris: '#3a3020', brow: '#5a6a38' },
    ears: 'none', tail: 'stub',
  },
  // ------------------------------------------------------------ Bendy's
  bendo: {
    id: 'bendo', name: 'Bendo', voice: { pitch: 0.8, kind: 'big' }, scale: 0.98, belly: 1, design: bendoDesign,
    species: 'fox', skin: 0xc8ccd4, light: 0xf4f4f6, nose: 0x2a2228, earInner: 0xf4e8ec, earTip: 0x8a8e98,
    outfit: { kind: 'chef', color: 0xfbfaf6, scarf: 0xd8342e }, sleeve: 0xfbfaf6, pants: 0x3a3a44, shoe: 0x2a2a30,
    face: { eyeStyle: 'bead', iris: '#3a2a20', brow: '#8a8e98', browThick: 3, whiskers: false },
    tail: 'fox', tailColor: 0xc8ccd4, tailTip: 0xffffff,
    mustache: 0x8a8e98, hat: { type: 'chef' },
  },
  yuki: {
    id: 'yuki', name: 'Yuki', voice: { pitch: 1.3, kind: 'girl' }, scale: 0.84, design: yukiDesign,
    species: 'fox', skin: 0xf6f2ee, light: 0xffffff, nose: 0x3a2a30, earInner: 0xffd8e0, earTip: 0xe8dcd8,
    outfit: { kind: 'waitress', dress: 0xd8342e }, sleeve: 0xd8342e, sleeveLen: 0.45, cuff: 0xffffff,
    skirt: { color: 0xd8342e, len: 3, flare: 1.4 }, shorts: true, legColor: 0xf6f2ee, socks: 0xffffff, shoe: 0x2a2228,
    face: { eyeStyle: 'anime', girl: true, iris: '#c8443a', irisLight: '#f08a5a', brow: '#d8c8c8', freckles: true, blushCol: '#ff9aa8' },
    tail: 'fox', tailColor: 0xf6f2ee, tailTip: 0xffffff,
    hat: { type: 'waitress', color: 0xd8342e }, hair: { type: 'braids', color: 0xf0ece8, ribbon: 0xd8342e },
    idles: ['lookAround', 'shift', 'twirl'],
  },
  // ------------------------------------------------------------ romance
  mio: {
    id: 'mio', name: 'Mio', voice: { pitch: 1.35, kind: 'girl' }, scale: 0.82, design: mioDesign,
    species: 'otter', skin: 0x9a6a48, light: 0xe8d0b4, nose: 0x2a1a18, earInner: 0xc89a78,
    outfit: { kind: 'sailor', color: 0xf4f2f2, collar: 0x27365e, scarf: 0xd8343a }, sleeve: 0xf4f2f2, cuff: 0x27365e,
    skirt: { color: 0x27365e, len: 3, flare: 1.6, pleats: true }, shorts: true, legColor: 0x9a6a48, socks: 0xf4f4f4, shoe: 0x3a2a28,
    face: { eyeStyle: 'anime', girl: true, iris: '#3a2418', irisLight: '#8a5a38', brow: '#6a4428', whiskers: true, blushCol: '#ff8aa0' },
    ears: 'otter', tail: 'otter', tailColor: 0x8a5c3c,
    hair: { type: 'bob', color: 0x6a4228 }, hat: { type: 'hairband', color: 0xffd04a },
    clumsy: true,
  },
  kanako: {
    id: 'kanako', name: 'Kanako', voice: { pitch: 1.15, kind: 'lady' }, scale: 0.84, design: kanakoDesign,
    species: 'crab', skin: 0xe8705a, light: 0xf8c0a8,
    outfit: { kind: 'kimono', color: 0xf2e8f0, patCol: 0xe88aa8, obi: 0x5a2a48, cord: 0xe8c060 }, sleeve: 0xf2e8f0, wideSleeves: true,
    skirt: { color: 0xf2e8f0, len: 5, flare: 0.5 }, legColor: 0xe8705a, feet: 'geta', shoe: 0x8a5a3a,
    face: { eyeStyle: 'anime', girl: true, iris: '#5a2440', irisLight: '#a85a7a', brow: '#a8483a', blushCol: '#ffb0b8', eyeH: 9 },
    hands: 'claw', handColor: 0xe8705a,
    ears: 'none', tail: 'none',
    ribbons: [{ color: 0x5a2a48, x: 4, y: 9, z: -2 }],
  },
  // ------------------------------------------------------------ train
  attendant: {
    id: 'attendant', name: 'Haruka', voice: { pitch: 1.25, kind: 'lady' }, scale: 0.9, design: attendantDesign,
    species: 'deer', skin: 0xc08a5a, light: 0xf0dcc0, nose: 0x2a1a1a, earInner: 0xf0c8b0,
    outfit: { kind: 'attendant', vest: 0xe8648a, scarf: 0x2a9ab0 }, sleeve: 0xffffff, cuff: 0xe8648a,
    skirt: { color: 0x3a3a4a, len: 3, flare: 0.8 }, shorts: true, legColor: 0xc08a5a, shoe: 0x2a2a30,
    face: { eyeStyle: 'anime', girl: true, iris: '#3a2418', irisLight: '#7a4a28', brow: '#7a4a2a' },
    ears: 'deer', tail: 'deer', tailTip: 0xffffff,
    hat: { type: 'cap', color: 0xe8648a, brim: 0x2a9ab0 },
  },
  // ------------------------------------------------------------ spirits
  tarobo: {
    id: 'tarobo', name: 'Tarōbō', voice: { pitch: 0.68, kind: 'gruff' }, scale: 1.0, belly: 0.8, spirit: true, design: taroboDesign,
    species: 'tengu', skin: 0xd8463a, noseLen: 7,
    outfit: { kind: 'yamabushi', color: 0xf2ece0, pom: 0x2a6a5a }, sleeve: 0xf2ece0, wideSleeves: true,
    skirt: { color: 0x3a4a7a, len: 3, flare: 1.2, pleats: true }, pants: 0x3a4a7a, feet: 'geta', shoe: 0x7a5a3a,
    face: { eyeStyle: 'anime', iris: '#e8b020', irisLight: '#ffe060', pupil: '#2a1a0a', brow: '#f4f0f0', browThick: 3, browW: 10, eyeW: 8, eyeH: 8, mouthY: 36, blushCol: '#ff5a4a' },
    ears: 'none', tail: 'none',
    walkSpeed: 1.2,
  },
  kappei: {
    id: 'kappei', name: 'Kappei', voice: { pitch: 1.0, kind: 'boy' }, scale: 0.84, spirit: true, design: kappeiDesign,
    species: 'kappa', skin: 0x5aa86a, light: 0xc8e0a0, beak: 0xe8c040, hairColor: 0x2a5a3a,
    shell: { base: 0x4a7a4a, seam: 0x2a4a2a, light: 0x6a9a5a, rim: 0x3a5a3a },
    outfit: { kind: 'bare', color: 0x5aa86a }, sleeve: 0x5aa86a, sleeveLen: 0, pants: 0x5aa86a, shoe: 0x5aa86a,
    face: { eyeStyle: 'anime', iris: '#1a2a20', irisLight: '#3a6a4a', brow: '#2a5a3a', eyeH: 11, eyeW: 9 },
    hands: 'webbed', handColor: 0x5aa86a,
    ears: 'none', tail: 'none',
  },
};

// background folk (shopkeepers, kids, parents)
export const LOCALS = {
  shibata: { id: 'shibata', name: 'Shibata-san', species: 'shiba', skin: 0xd8964a, light: 0xf8ecd8, earInner: 0xf8e0c8, outfit: { kind: 'apron', base: 0xf4f0e8, apron: 0x2a3a5a }, sleeve: 0xf4f0e8, sleeveLen: 0.5, pants: 0x4a4a58, ears: 'shiba', tail: 'shiba', tailColor: 0xd8964a, face: { eyeStyle: 'bead', brow: '#a86a2a' }, scale: 0.94 },
  saru: { id: 'saru', name: 'Saru-san', species: 'monkey', skin: 0xa8826a, light: 0xf0b8a0, earInner: 0xf0b8a0, outfit: { kind: 'cardigan', color: 0x3a5a4a, shirt: 0xf4ece0 }, sleeve: 0x3a5a4a, pants: 0x3a3a3a, ears: 'monkey', tail: 'stub', face: { eyeStyle: 'bead', brow: '#6a4a3a', patch: '#f0b8a0' }, scale: 0.92, glasses: { frame: 0x2a2a2a } },
  usami: { id: 'usami', name: 'Usami-san', species: 'rabbit', skin: 0xe8e0d8, light: 0xffffff, earInner: 0xffc8d0, outfit: { kind: 'kimono', color: 0x6a5a8a, patCol: 0x8a7aa8, obi: 0xe8c060, cord: 0xc84a3a }, sleeve: 0x6a5a8a, pants: 0x6a5a8a, ears: 'rabbit', tail: 'rabbit', tailTip: 0xffffff, face: { eyeStyle: 'bead', iris: '#c84a5a', brow: '#c8c0b8' }, scale: 0.9, hunch: 0.08 },
  anaguma: { id: 'anaguma', name: 'Anaguma-jii', species: 'tanuki', skin: 0x7a7068, light: 0xe8e0d0, earInner: 0xe8e0d0, outfit: { kind: 'happi', color: 0x8a3a2a }, sleeve: 0x8a3a2a, wideSleeves: true, pants: 0x3a3430, ears: 'round', tail: 'stub', face: { eyeStyle: 'dot', brow: '#e8e0d0', browThick: 3, mask: '#3a3430' }, scale: 0.9, hunch: 0.12, hat: { type: 'straw' } },
  ponta: { id: 'ponta', name: 'Ponta', species: 'tanuki', skin: 0x8a6a4a, light: 0xd8c4a8, earInner: 0x2a2018, outfit: { kind: 'apron', base: 0xe8e0d0, apron: 0x3a6a8a }, sleeve: 0xe8e0d0, sleeveLen: 0.5, pants: 0x3a3a3a, shoe: 0x2a2a2a, ears: 'round', tail: 'tanuki', tailColor: 0x8a6a4a, tailTip: 0x3a2a20, face: { eyeStyle: 'dot', brow: '#3a2a20', mask: '#3a2a20' }, scale: 0.98, belly: 0.8 },
  tsuru: { id: 'tsuru', name: 'Tsuru-baa', species: 'crane', skin: 0xf4f2ee, outfit: { kind: 'kimono', color: 0x4a5a6a, patCol: 0x6a7a8a, obi: 0x2a2a3a }, sleeve: 0x4a5a6a, pants: 0x4a5a6a, feet: 'geta', ears: 'none', tail: 'none', face: { eyeStyle: 'dot', brow: '#c8c0b8' }, scale: 0.9, hunch: 0.15 },
};

// species presets for the kids / parents generator
export const KID_SPECIES = [
  { species: 'tanuki', skin: 0x8a6a4a, light: 0xd8c4a8, earInner: 0x2a2018, ears: 'round', tail: 'tanuki', tailColor: 0x8a6a4a, tailTip: 0x3a2a20, face: { mask: '#3a2a20' } },
  { species: 'shiba', skin: 0xd8964a, light: 0xf8ecd8, earInner: 0xf8e0c8, ears: 'shiba', tail: 'shiba', tailColor: 0xd8964a },
  { species: 'cat', skin: 0xe8d8c0, light: 0xffffff, earInner: 0xffc0c8, ears: 'cat', tail: 'cat', tailColor: 0xe8d8c0, tailTip: 0xd89040 },
  { species: 'rabbit', skin: 0xf0ece8, light: 0xffffff, earInner: 0xffc8d0, ears: 'rabbit', tail: 'rabbit', tailTip: 0xffffff },
  { species: 'monkey', skin: 0xa8826a, light: 0xf0b8a0, earInner: 0xf0b8a0, ears: 'monkey', tail: 'stub', face: { patch: '#f0b8a0' } },
  { species: 'fox', skin: 0xe0823a, light: 0xfff4e8, earInner: 0xfff0e0, ears: 'fox', tail: 'fox', tailColor: 0xe0823a, tailTip: 0xffffff },
  { species: 'deer', skin: 0xc08a5a, light: 0xf0dcc0, earInner: 0xf0c8b0, ears: 'deer', tail: 'deer', tailTip: 0xffffff },
  { species: 'bear', skin: 0x7a5a3a, light: 0xc8a880, earInner: 0xc8a880, ears: 'round', tail: 'stub' },
  { species: 'otter', skin: 0x9a6a48, light: 0xe8d0b4, earInner: 0xc89a78, ears: 'otter', tail: 'otter', tailColor: 0x8a5c3c },
];
