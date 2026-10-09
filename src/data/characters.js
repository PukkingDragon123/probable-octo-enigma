// The cast. Each entry is a rig definition (see entities/rig.js). Species are
// real Japanese animals; outfits are painted by entities/outfits.js.
import { TORSO } from '../entities/outfits.js';

const TURTLE_FACE = { eyeStyle: 'anime', beak: true, nostrils: true, mouthW: 9, mouthY: 30, eyeY: 19, eyeDX: 10, eyeW: 9, eyeH: 11, blushDX: 16, blushY: 26, browY: 9 };

export const CHARACTERS = {
  // ------------------------------------------------------------ the family
  mamoru: {
    id: 'mamoru', name: 'Mamoru', voice: { pitch: 1.05, kind: 'boy' },
    skin: '#94bf6c', skinMarks: { scales: true, belly: '#d4dc9a' },
    shell: { base: '#8a7046', seam: '#4a361e', light: '#ae965a', rim: '#6a5230' },
    torso: TORSO.hoodie({ color: '#4c5b84', accent: '#efe6d2', print: 'wave' }),
    sleeve: '#4c5b84', cuff: '#3c4868', pants: '#3a3a4a', shoe: '#f2efe8', shoeStripe: '#d8483a',
    face: { ...TURTLE_FACE, iris: '#2a3a40', irisLight: '#4a7078', brow: '#4a6a38', browY: 11, browW: 7, skin: '#94bf6c', lash: '#24202a' },
    ears: 'none', tail: 'stub', tailColor: '#94bf6c',
    earbuds: true, hood: true, waddle: 0.05,
    idles: ['lookAround', 'shift', 'checkPhone', 'sigh'],
  },
  genzo: {
    id: 'genzo', name: 'Grandpa Genzō', voice: { pitch: 0.72, kind: 'old' },
    scale: 1.1, hunch: 0.1,
    skin: '#7d9258', skinMarks: { scales: true, belly: '#c8c890', patchy: 1 },
    shell: { base: '#6e5a3a', seam: '#3a2a18', light: '#8e7a4e', rim: '#544028', moss: 0.7, scale: 1.05 },
    torso: TORSO.samue({ color: '#2f3e66', tie: '#e8dcc0' }),
    sleeve: '#2f3e66', pants: '#2f3e66', feet: 'geta', shoe: '#a87a4a',
    face: { eyeStyle: 'bead', beak: true, nostrils: true, iris: '#2a2018', pupil: '#1a120e', brow: '#f4f0e8', browThick: 3, browW: 9, browY: 12, eyeY: 21, eyeDX: 9, eyeW: 7, eyeH: 7, mouthY: 32, mouthW: 9, skin: '#7d9258', lash: '#2a2420', blushCol: '#e8907a' },
    glasses: { frame: '#5a3a24', round: true }, mustache: '#f4f0e8',
    ears: 'none', tail: 'stub', tailColor: '#7d9258', waddle: 0.06,
    hat: null,
    walkSpeed: 1.15, idles: ['lookAround', 'stretchSmall', 'shift'],
  },
  // ------------------------------------------------------------ Bendy's
  bendo: {
    id: 'bendo', name: 'Bendo', voice: { pitch: 0.8, kind: 'big' },
    scale: 1.22, belly: 1.0,
    skin: '#c8ccd4', skinMarks: { belly: '#f4f4f6' },
    torso: TORSO.chef({ color: '#fbfaf6', scarf: '#d8342e' }), sleeve: '#fbfaf6', pants: '#3a3a44', shoe: '#2a2a30',
    face: { eyeStyle: 'bead', iris: '#3a2a20', brow: '#8a8e98', browThick: 3, mouthY: 33, skin: '#c8ccd4', whiskers: true },
    ears: 'fox', earInner: '#f4e8ec', tail: 'fox', tailColor: '#c8ccd4', tailTip: '#ffffff',
    snout: { r: 0.06, sx: 1.1, sy: 0.7, sz: 1.0, color: '#f4f4f6', nose: '#2a2228', y: -0.05 },
    mustache: '#8a8e98', hat: { type: 'chef' },
  },
  yuki: {
    id: 'yuki', name: 'Yuki', voice: { pitch: 1.3, kind: 'girl' },
    scale: 1.0,
    skin: '#f6f2ee', skinMarks: { belly: '#ffffff' },
    torso: TORSO.waitress({ dress: '#d8342e', stripe: '#ffffff' }), sleeve: '#d8342e', sleeveLen: 0.45, cuff: '#ffffff',
    skirt: { color: '#d8342e', len: 0.12, flare: 1.7 }, pants: '#f6f2ee', shorts: true, socks: '#ffffff', shoe: '#2a2228',
    face: { eyeStyle: 'anime', girl: true, iris: '#c8443a', irisLight: '#f08a5a', brow: '#d8c8c8', skin: '#f6f2ee', freckles: true, blushCol: '#ff9aa8', mouthY: 33 },
    ears: 'fox', earInner: '#ffd8e0', tail: 'fox', tailColor: '#f6f2ee', tailTip: '#ffffff',
    snout: { r: 0.05, sx: 1.05, sy: 0.65, sz: 0.9, color: '#ffffff', nose: '#3a2a30', y: -0.055 },
    hat: { type: 'waitress', color: '#d8342e' },
    ribbons: [{ color: '#d8342e', x: 0.19, y: -0.02, z: -0.06, rz: 0.4 }, { color: '#d8342e', x: -0.19, y: -0.02, z: -0.06, rz: -0.4 }],
  },
  // ------------------------------------------------------------ romance
  mio: {
    id: 'mio', name: 'Mio', voice: { pitch: 1.35, kind: 'girl' },
    skin: '#9a6a48', skinMarks: { belly: '#e8d0b4' },
    torso: TORSO.sailor({ color: '#f4f2f2', collar: '#27365e', scarf: '#d8343a' }), sleeve: '#f4f2f2', cuff: '#27365e',
    skirt: { color: '#27365e', len: 0.13, flare: 1.75 }, pants: '#9a6a48', shorts: true, socks: '#f4f4f4', shoe: '#3a2a28',
    face: { eyeStyle: 'anime', girl: true, iris: '#3a2418', irisLight: '#8a5a38', brow: '#6a4428', skin: '#9a6a48', whiskers: true, blushCol: '#ff8aa0', mouthY: 32 },
    ears: 'otter', earInner: '#c89a78', tail: 'otter', tailColor: '#8a5c3c',
    snout: { r: 0.055, sx: 1.25, sy: 0.7, sz: 0.85, color: '#e8d0b4', nose: '#2a1a18', y: -0.06 },
    hair: { type: 'bob', color: '#6a4228' }, hat: { type: 'hairband', color: '#ffd04a' },
    clumsy: true,
  },
  kanako: {
    id: 'kanako', name: 'Kanako', voice: { pitch: 1.15, kind: 'lady' },
    skin: '#e8705a', skinMarks: { belly: '#f8c0a8' },
    torso: TORSO.kimono({ color: '#f2e8f0', pattern: 'sakura', patCol: '#e88aa8', obi: '#5a2a48', obiCord: '#e8c060' }), sleeve: '#f2e8f0', wideSleeves: true,
    skirt: { color: '#f2e8f0', len: 0.2, flare: 1.05 }, pants: '#f2e8f0', shoe: '#e8e0d8', feet: 'geta',
    face: { eyeStyle: 'anime', girl: true, iris: '#5a2440', irisLight: '#a85a7a', brow: '#a8483a', skin: '#e8705a', blushCol: '#ffb0b8', mouthY: 32, eyeH: 9 },
    hands: 'claw', handColor: '#e8705a', clawTip: '#f8d0c0',
    crabHead: true, headScale: [1.25, 0.88, 1.0],
    ears: 'none', tail: 'none',
    ribbons: [{ color: '#5a2a48', x: 0.12, y: 0.16, z: -0.02, rz: 0.3, scale: 1.2 }],
  },
  // ------------------------------------------------------------ train
  attendant: {
    id: 'attendant', name: 'Attendant', voice: { pitch: 1.25, kind: 'lady' },
    skin: '#c08a5a', skinMarks: { belly: '#f0dcc0', spots: '#f4e8d8' },
    torso: TORSO.attendant({ vest: '#e8648a', scarf: '#2a9ab0' }), sleeve: '#ffffff', cuff: '#e8648a',
    skirt: { color: '#3a3a4a', len: 0.13, flare: 1.25 }, pants: '#c08a5a', shorts: true, shoe: '#2a2a30',
    face: { eyeStyle: 'anime', girl: true, iris: '#3a2418', irisLight: '#7a4a28', brow: '#7a4a2a', skin: '#c08a5a', mouthY: 33 },
    ears: 'deer', earInner: '#f0c8b0', tail: 'deer', tailTip: '#ffffff',
    snout: { r: 0.055, sx: 1.0, sy: 0.75, sz: 1.1, color: '#e8c8a0', nose: '#2a1a1a', y: -0.06 },
    hat: { type: 'cap', color: '#e8648a', brim: '#2a9ab0' },
  },
  mom: {
    id: 'mom', name: 'Mom', voice: { pitch: 1.12, kind: 'lady' },
    scale: 1.08, skin: '#9ac478', skinMarks: { scales: true, belly: '#dce4a8' },
    shell: { base: '#8a7a50', seam: '#4a3a22', light: '#b0a060', rim: '#6a5a34' },
    torso: TORSO.cardigan({ color: '#d8a8a0', shirt: '#f4f0e8' }), sleeve: '#d8a8a0', pants: '#5a5a6a', shoe: '#e8e0d8',
    face: { ...TURTLE_FACE, girl: true, iris: '#3a3020', brow: '#5a6a38', skin: '#9ac478' },
    ears: 'none', tail: 'stub',
  },
  // ------------------------------------------------------------ spirits
  tarobo: {
    id: 'tarobo', name: 'Tarōbō', voice: { pitch: 0.68, kind: 'gruff' },
    scale: 1.3, belly: 0.8,
    skin: '#d8463a', skinMarks: { belly: '#e86a5a' },
    torso: TORSO.yamabushi({ color: '#f2ece0', pomDark: '#2a6a5a' }), sleeve: '#f2ece0', wideSleeves: true,
    skirt: { color: '#3a4a7a', len: 0.16, flare: 1.4 }, pants: '#3a4a7a', feet: 'geta', shoe: '#7a5a3a', footScale: 1.1,
    face: { eyeStyle: 'anime', iris: '#e8b020', irisLight: '#ffe060', pupil: '#2a1a0a', brow: '#f4f0f0', browThick: 3, browW: 9, eyeW: 8, eyeH: 8, skin: '#d8463a', mouthY: 34, blushCol: '#ff5a4a' },
    longNose: { len: 0.24, base: 0.045, tip: 0.02, droop: -0.1 },
    hair: { type: 'mane', color: '#f4f2f0', beard: true }, hat: { type: 'tokin' },
    wings: '#22222e', ears: 'none', tail: 'none',
    walkSpeed: 1.2,
  },
  kappei: {
    id: 'kappei', name: 'Kappei', voice: { pitch: 1.0, kind: 'boy' },
    scale: 0.98,
    skin: '#5aa86a', skinMarks: { belly: '#c8e0a0', spots: '#4a9a5a' },
    shell: { base: '#4a7a4a', seam: '#2a4a2a', light: '#6a9a5a', rim: '#3a5a3a' },
    torso: TORSO.plain({ color: '#5aa86a', belt: '#e8c060' }), sleeve: '#5aa86a', sleeveLen: 0.0, pants: '#5aa86a',
    feet: 'sneaker', shoe: '#5aa86a',
    face: { eyeStyle: 'anime', iris: '#1a2a20', irisLight: '#3a6a4a', brow: '#2a5a3a', skin: '#5aa86a', mouthY: 34, eyeH: 11, eyeW: 9 },
    beak: { color: '#e8c040' }, dish: true, hairColor: '#2a5a3a',
    hands: 'webbed', handColor: '#5aa86a',
    ears: 'none', tail: 'none',
  },
};

// background folk (shopkeepers, kids, parents). Kids are scale ~0.78.
export const LOCALS = {
  shibata: { id: 'shibata', name: 'Shibata-san', skin: '#d8964a', skinMarks: { belly: '#f8ecd8' }, torso: TORSO.apron({ base: '#f4f0e8', apron: '#2a3a5a', logo: 'モーニング' }), sleeve: '#f4f0e8', sleeveLen: 0.5, pants: '#4a4a58', ears: 'shiba', earInner: '#f8e0c8', tail: 'shiba', snout: { r: 0.06, color: '#f8ecd8', nose: '#2a2020' }, face: { eyeStyle: 'bead', brow: '#a86a2a', skin: '#d8964a' }, scale: 1.1 },
  saru: { id: 'saru', name: 'Saru-san', skin: '#a8826a', skinMarks: { belly: '#f0b8a0' }, torso: TORSO.cardigan({ color: '#3a5a4a', shirt: '#f4ece0' }), sleeve: '#3a5a4a', pants: '#3a3a3a', ears: 'monkey', earInner: '#f0b8a0', tail: 'stub', face: { eyeStyle: 'bead', brow: '#6a4a3a', skin: '#a8826a' }, scale: 1.08, glasses: { frame: '#2a2a2a', round: false } },
  usami: { id: 'usami', name: 'Usami-san', skin: '#e8e0d8', skinMarks: { belly: '#ffffff' }, torso: TORSO.kimono({ color: '#6a5a8a', pattern: 'yagasuri', patCol: '#8a7aa8', obi: '#e8c060', obiCord: '#c84a3a' }), sleeve: '#6a5a8a', pants: '#6a5a8a', ears: 'rabbit', earInner: '#ffc8d0', tail: 'rabbit', tailTip: '#ffffff', face: { eyeStyle: 'bead', iris: '#c84a5a', brow: '#c8c0b8', skin: '#e8e0d8' }, scale: 1.04, hunch: 0.08 },
  anaguma: { id: 'anaguma', name: 'Anaguma-jii', skin: '#7a7068', skinMarks: { belly: '#e8e0d0', mask: '#3a3430' }, torso: TORSO.happi({ color: '#8a3a2a', crest: '芋' }), sleeve: '#8a3a2a', wideSleeves: true, pants: '#3a3430', ears: 'round', earInner: '#e8e0d0', tail: 'stub', snout: { r: 0.06, color: '#e8e0d0', nose: '#1a1818' }, face: { eyeStyle: 'dot', brow: '#e8e0d0', browThick: 3, skin: '#7a7068' }, scale: 1.05, hunch: 0.12, hat: { type: 'straw' } },
  ponta: { id: 'ponta', name: 'Ponta', skin: '#8a6a4a', skinMarks: { belly: '#d8c4a8', mask: '#3a2a20' }, torso: TORSO.apron({ base: '#e8e0d0', apron: '#3a6a8a', logo: '魚' }), sleeve: '#e8e0d0', sleeveLen: 0.5, pants: '#3a3a3a', feet: 'sneaker', shoe: '#2a2a2a', ears: 'tanuki', earInner: '#2a2018', tail: 'tanuki', tailTip: '#3a2a20', snout: { r: 0.065, color: '#d8c4a8', nose: '#1a1410' }, face: { eyeStyle: 'dot', brow: '#3a2a20', skin: '#8a6a4a' }, scale: 1.12, belly: 0.8 },
  tsuru: { id: 'tsuru', name: 'Tsuru-baa', skin: '#f4f2ee', skinMarks: { belly: '#ffffff' }, torso: TORSO.kimono({ color: '#4a5a6a', pattern: 'seigaiha', patCol: '#6a7a8a', obi: '#2a2a3a' }), sleeve: '#4a5a6a', pants: '#4a5a6a', feet: 'geta', ears: 'none', tail: 'none', face: { eyeStyle: 'dot', brow: '#c8c0b8', skin: '#f4f2ee' }, snout: { r: 0.05, sx: 0.7, sy: 0.6, sz: 1.6, color: '#3a3a3a', y: -0.03 }, hat: { type: 'hairband', color: '#d8342e' }, scale: 1.0, hunch: 0.15 },
};

// procedurally varied kids / parents for the shop
export const KID_SPECIES = [
  { kind: 'tanuki', skin: '#8a6a4a', marks: { belly: '#d8c4a8', mask: '#3a2a20' }, ears: 'tanuki', earInner: '#2a2018', tail: 'tanuki', tailTip: '#3a2a20', snout: '#d8c4a8', nose: '#1a1410' },
  { kind: 'shiba', skin: '#d8964a', marks: { belly: '#f8ecd8' }, ears: 'shiba', earInner: '#f8e0c8', tail: 'shiba', snout: '#f8ecd8', nose: '#2a2020' },
  { kind: 'kitten', skin: '#e8d8c0', marks: { belly: '#ffffff', spots: '#d89040' }, ears: 'cat', earInner: '#ffc0c8', tail: 'cat', tailTip: '#d89040', snout: null, nose: '#ff8a9a' },
  { kind: 'rabbit', skin: '#f0ece8', marks: { belly: '#ffffff' }, ears: 'rabbit', earInner: '#ffc8d0', tail: 'rabbit', tailTip: '#ffffff', snout: null, nose: '#ff9aa8' },
  { kind: 'macaque', skin: '#a8826a', marks: { belly: '#f0b8a0' }, ears: 'monkey', earInner: '#f0b8a0', tail: 'stub', snout: null, nose: null },
  { kind: 'raccoon dog', skin: '#9a8a7a', marks: { belly: '#e8e0d8', mask: '#4a3a30' }, ears: 'tanuki', earInner: '#3a2a20', tail: 'tanuki', tailTip: '#4a3a30', snout: '#e8e0d8', nose: '#1a1410' },
  { kind: 'fox', skin: '#e0823a', marks: { belly: '#fff4e8' }, ears: 'fox', earInner: '#fff0e0', tail: 'fox', tailTip: '#ffffff', snout: '#fff4e8', nose: '#2a1a18' },
  { kind: 'deer', skin: '#c08a5a', marks: { belly: '#f0dcc0', spots: '#f4e8d8' }, ears: 'deer', earInner: '#f0c8b0', tail: 'deer', tailTip: '#ffffff', snout: '#e8c8a0', nose: '#2a1a1a' },
  { kind: 'bear cub', skin: '#7a5a3a', marks: { belly: '#c8a880' }, ears: 'bear', earInner: '#c8a880', tail: 'stub', snout: '#c8a880', nose: '#1a1010' },
];
