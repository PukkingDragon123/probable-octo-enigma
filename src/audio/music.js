// Kodamaya's music moods, built on the ported engine's instruments and theory
// helpers. Each mood is a 16-step-per-bar generator (chords, melody, bass,
// drums, sparkles) described by a small config, so the soundtrack shares a
// family sound: plucked koto/shamisen-like Karplus-Strong strings, Japanese
// yo / in scales, warm pads, soft percussion.
import { addMood, MUSIC_KIT as K } from './engine.js';

const { INS, triad, makeProg, makeMelody, rr, pick, chance } = K;

// Japanese scales (semitones from the tonic)
export const SCALES = {
  yo: [0, 2, 5, 7, 9], // bright folk pentatonic
  in: [0, 1, 5, 7, 8], // miyako-bushi: wistful, traditional
  majP: [0, 2, 4, 7, 9],
  minP: [0, 3, 5, 7, 10],
  ryukyu: [0, 4, 5, 7, 11],
};
const DIATONIC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
function range(keyPc, steps, lo, hi) { const out = []; for (let m = lo; m <= hi; m++) if (steps.includes((((m - keyPc) % 12) + 12) % 12)) out.push(m); return out; }

/**
 * cfg = {
 *   key (midi of the chord root octave), harm ('major'|'minor'|'lydian'|'dorian'), prog: [[deg...]...],
 *   bpm, swing (0..0.3), mel: { scale, lo, hi, center, ins, vol, rhythms, prob, wet, oct },
 *   chords: { ins: 'pad'|'epiano'|'vibes'|'pluckArp'|'stab'|'brass', vol, every (bars), arp: [steps] },
 *   bass: { ins: 'bass'|'walk'|'synthbass'|'tuba'|'pizz', vol, pat: [[step, degreeOffset(0 root, 4 fifth, 7 oct), len]] },
 *   drums: { kick: [steps], snare: [steps], rim: [steps], hat: [steps], shaker: [steps], clap: [steps], vol, crackle },
 *   sparkle: { ins: 'glock'|'celesta'|'musicbox'|'bloop', prob, vol },
 *   timp: [steps], echo: [stepsDelay, feedback, lp, level]
 * }
 */
function makeMood(cfg) {
  return (ctx, out) => {
    const H = DIATONIC[cfg.harm || 'major'];
    const sd = 60 / cfg.bpm / 4;
    const prog = makeProg(cfg.prog);
    const M = cfg.mel || null;
    const scale = M ? range(cfg.key % 12, SCALES[M.scale] || SCALES.majP, M.lo, M.hi) : [];
    const mel = M ? makeMelody(scale, M.center) : null;
    const echo = cfg.echo ? K.makeEcho(ctx, out, sd * cfg.echo[0], cfg.echo[1], cfg.echo[2], cfg.echo[3]) : null;
    let evs = {}, chord = [cfg.key, cfg.key + 4, cfg.key + 7], bar = 0, sparkleAt = -1, arpI = 0;
    const sw = (s, t) => (cfg.swing && s % 2 === 1 ? t + sd * cfg.swing : t);
    const sends = echo ? [[echo.in, 0.35]] : undefined;
    return {
      stepDur: sd,
      nodes: echo ? echo.nodes : [],
      step(i, t) {
        const s = i & 15;
        const C = cfg.chords || {};
        if (s === 0) {
          if (bar % (C.every || 1) === 0) {
            const deg = prog.next();
            chord = triad(cfg.key, H, deg, 4);
            const v = C.vol ?? 0.4;
            if (C.ins === 'pad') INS.pad(ctx, out, t, chord.slice(0, 3).concat(chord[0] + 12), sd * 16 * (C.every || 1), v, { wet: 0.6, att: C.att ?? 1.0, rel: 1.8, lp: C.lp ?? 1100 });
            if (C.ins === 'brass') INS.brass(ctx, out, t, chord.slice(0, 3), sd * 6, v);
            if (C.low) INS.pad(ctx, out, t, [chord[0] - 12], sd * 16 * (C.every || 1), C.low, { wet: 0.3, att: 1.2, rel: 1.6, lp: 360 });
          }
          evs = {};
          if (mel && chance(M.prob ?? 0.85)) {
            const pcs = chord.map((m) => m % 12);
            const list = mel.bar(pick(M.rhythms), pcs, { reuse: M.reuse ?? 0.45, endPcs: bar % 4 === 3 ? [cfg.key % 12] : null });
            for (const e of list) evs[e.s] = e;
          }
          sparkleAt = cfg.sparkle && chance(cfg.sparkle.prob ?? 0.35) ? pick([2, 6, 10, 14]) : -1;
          bar++;
        }
        // chord comping
        const C2 = cfg.chords || {};
        if (C2.ins === 'epiano' && (C2.hits || [0, 8]).includes(s)) for (const m of chord.slice(0, 4)) INS.epiano(ctx, out, sw(s, t) + rr(0, 0.01), m + (C2.oct || 0), sd * (C2.len || 7), (C2.vol ?? 0.3) * 0.5, { wet: 0.4 });
        if (C2.ins === 'vibes' && (C2.hits || [0, 6, 8, 14]).includes(s)) for (const m of chord.slice(0, 3)) INS.vibes(ctx, out, sw(s, t), m + 12 + (C2.oct || 0), (C2.vol ?? 0.25) * 0.55, { sends });
        if (C2.ins === 'stab' && (C2.hits || [4, 12]).includes(s)) INS.stab(ctx, out, sw(s, t), chord.slice(0, 3).map((m) => m + 12), C2.vol ?? 0.25);
        if (C2.ins === 'pluckArp' && (C2.arp || [0, 2, 4, 6, 8, 10, 12, 14]).includes(s)) {
          const m = chord[arpI++ % 3] + 12 + (C2.oct || 0);
          INS.pluck(ctx, out, sw(s, t), m, sd * 6, C2.vol ?? 0.25, { wet: 0.45, lp: C2.lp ?? 2600, pan: rr(-0.3, 0.3), sends });
        }
        if (C2.ins === 'celestaArp' && (C2.arp || [0, 3, 6, 9, 12]).includes(s)) INS.celesta(ctx, out, sw(s, t), chord[arpI++ % 3] + 24, C2.vol ?? 0.14, { sends, pan: rr(-0.4, 0.4) });
        // melody
        const e = evs[s];
        if (e && M) {
          const tt = sw(s, t), m = e.m + (M.oct || 0), len = Math.min(e.len * sd, M.maxLen ?? 2.2), v = (M.vol ?? 0.45) * rr(0.85, 1.05);
          if (M.ins === 'pluck') INS.pluck(ctx, out, tt, m, len, v, { wet: M.wet ?? 0.45, lp: M.lp ?? 3200, sends, pan: rr(-0.15, 0.15) });
          else if (M.ins === 'epiano') INS.epiano(ctx, out, tt, m, len, v, { wet: 0.4 });
          else if (M.ins === 'musicbox') INS.musicbox(ctx, out, tt, m, v, { sends });
          else if (M.ins === 'vibes') INS.vibes(ctx, out, tt, m, v, { sends });
          else if (M.ins === 'glock') INS.glock(ctx, out, tt, m, v, { sends });
          else if (M.ins === 'celesta') INS.celesta(ctx, out, tt, m, v, { sends });
          else if (M.ins === 'lead') INS.lead(ctx, out, tt, m, len, v);
          else if (M.ins === 'theremin') INS.theremin(ctx, out, tt, m, len, v, {});
          else if (M.ins === 'pizz') INS.pizz(ctx, out, tt, m, v, { sends });
          else if (M.ins === 'horn') INS.horn(ctx, out, tt, m, len, v);
          if (M.double) INS.pluck(ctx, out, tt + 0.006, m + 12, len, v * 0.25, { wet: 0.5, lp: 4200 });
        }
        // bass
        const B = cfg.bass;
        if (B) for (const [ps, off, len] of B.pat) if (ps === s) {
          const m = chord[0] - 12 + off, d = sd * (len || 4), v = B.vol ?? 0.4, tt = sw(s, t);
          if (B.ins === 'walk') INS.walk(ctx, out, tt, m, d, v);
          else if (B.ins === 'synthbass') INS.synthbass(ctx, out, tt, m, d, v);
          else if (B.ins === 'tuba') INS.tuba(ctx, out, tt, m, d, v);
          else if (B.ins === 'pizz') INS.pizz(ctx, out, tt, m + 12, v, {});
          else INS.bass(ctx, out, tt, m, d, v);
        }
        // drums
        const Dr = cfg.drums;
        if (Dr) {
          const dv = Dr.vol ?? 1;
          if (Dr.kick?.includes(s)) INS.kick(ctx, out, t, 0.5 * dv * rr(0.9, 1.05));
          if (Dr.snare?.includes(s)) INS.snare(ctx, out, sw(s, t), 0.3 * dv * rr(0.85, 1.05));
          if (Dr.rim?.includes(s)) INS.rim(ctx, out, sw(s, t), 0.28 * dv * rr(0.8, 1.1));
          if (Dr.clap?.includes(s)) INS.clap(ctx, out, sw(s, t), 0.26 * dv);
          if (Dr.hat?.includes(s)) INS.hat(ctx, out, sw(s, t), 0.12 * dv * rr(0.7, 1.1), Dr.openHat?.includes(s));
          if (Dr.shaker?.includes(s)) INS.shaker(ctx, out, sw(s, t), 0.12 * dv * rr(0.7, 1.1));
          if (Dr.crackle && s % 4 === 0) INS.crackle(ctx, out, t, Dr.crackle);
        }
        if (cfg.timp?.includes(s) && chance(0.7)) INS.timp(ctx, out, t, chord[0] - 12, 0.35);
        if (s === sparkleAt) {
          const S = cfg.sparkle, m = pick(scale.length ? scale : chord) + 12;
          if (S.ins === 'bloop') INS.bloop(ctx, out, t, S.vol ?? 0.2);
          else if (S.ins === 'musicbox') INS.musicbox(ctx, out, t, m, S.vol ?? 0.14, { sends });
          else if (S.ins === 'celesta') INS.celesta(ctx, out, t, m, S.vol ?? 0.14, { sends });
          else INS.glock(ctx, out, t, m, S.vol ?? 0.14, { sends, pan: rr(-0.4, 0.4) });
        }
      },
    };
  };
}

const R_SLOW = [[0, 6, 10], [0, 8], [2, 8, 12], [0, 4, 8, 12], [4, 10], [0, 6, 8, 14], [0, 10, 12]];
const R_MID = [[0, 4, 6, 8, 12], [0, 3, 6, 8, 10, 12], [0, 2, 4, 8, 11, 14], [2, 6, 8, 12], [0, 6, 8, 14], [0, 4, 8, 10, 12]];
const R_BUSY = [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 7, 8, 11, 12], [0, 2, 3, 6, 8, 10, 12], [0, 4, 6, 8, 12, 14]];
const P_MAJ = [[0, 5, 3, 4], [0, 4, 5, 3], [0, 3, 0, 4], [3, 4, 2, 5], [0, 2, 3, 4]];
const P_MIN = [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 6], [0, 5, 3, 4], [0, 3, 4, 0]];
const P_SAD = [[5, 3, 0, 4], [0, 5, 3, 4], [3, 4, 2, 5], [5, 4, 3, 0]];

export const KODAMAYA_MOODS = {
  // Mamo's earbuds on the train: slow, sad lo-fi
  phoneSad: [makeMood({
    key: 57, harm: 'minor', prog: P_SAD.map((p) => p.map((d) => d)), bpm: 72, swing: 0.18,
    chords: { ins: 'epiano', vol: 0.36, hits: [0, 7], len: 9 },
    mel: { scale: 'minP', lo: 64, hi: 81, center: 72, ins: 'musicbox', vol: 0.3, rhythms: R_SLOW, prob: 0.7, reuse: 0.6 },
    bass: { ins: 'synthbass', vol: 0.32, pat: [[0, 0, 6], [10, 0, 4]] },
    drums: { kick: [0, 10], rim: [8], hat: [2, 6, 10, 14], vol: 0.8, crackle: 0.05 },
    echo: [3, 0.38, 2200, 0.45],
  }), 1.5],
  // the sleepy shotengai in daytime: shamisen-ish plucks, walking bass
  street: [makeMood({
    key: 50, harm: 'major', prog: P_MAJ, bpm: 84, swing: 0.12,
    chords: { ins: 'pad', vol: 0.32, every: 1, lp: 1300, low: 0.2 },
    mel: { scale: 'yo', lo: 62, hi: 86, center: 72, ins: 'pluck', vol: 0.5, rhythms: R_MID, double: false },
    bass: { ins: 'walk', vol: 0.36, pat: [[0, 0, 3], [4, 7, 3], [8, 4, 3], [12, 7, 3]] },
    drums: { shaker: [2, 6, 10, 14], rim: [4, 12], vol: 0.7 },
    sparkle: { ins: 'glock', prob: 0.25 },
    echo: [3, 0.3, 2600, 0.35],
  }), 1.0],
  // the gachapon shop: cozy, bouncy, toy-ish
  shop: [makeMood({
    key: 53, harm: 'major', prog: P_MAJ, bpm: 100,
    chords: { ins: 'vibes', vol: 0.22, hits: [0, 6, 10] },
    mel: { scale: 'majP', lo: 65, hi: 89, center: 76, ins: 'glock', vol: 0.32, rhythms: R_MID },
    bass: { ins: 'pizz', vol: 0.42, pat: [[0, 0], [6, 7], [8, 0], [12, 4]] },
    drums: { kick: [0, 8], hat: [4, 12], shaker: [2, 6, 10, 14], vol: 0.65 },
    sparkle: { ins: 'bloop', prob: 0.4, vol: 0.18 },
    echo: [3, 0.25, 3000, 0.3],
  }), 0.95],
  // Bendy's jukebox: swingy diner jazz
  bendys: [makeMood({
    key: 46, harm: 'major', prog: [[1, 4, 0, 0], [0, 5, 1, 4], [2, 5, 1, 4], [0, 3, 1, 4]], bpm: 112, swing: 0.28,
    chords: { ins: 'epiano', vol: 0.3, hits: [0, 6, 10], len: 3 },
    mel: { scale: 'majP', lo: 65, hi: 84, center: 74, ins: 'vibes', vol: 0.36, rhythms: R_BUSY, prob: 0.75 },
    bass: { ins: 'walk', vol: 0.42, pat: [[0, 0, 3], [4, 4, 3], [8, 7, 3], [12, 9, 3]] },
    drums: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], openHat: [6, 14], vol: 0.55 },
  }), 1.0],
  // Human-world night: sparse, gentle
  nightStreet: [makeMood({
    key: 52, harm: 'major', prog: P_MAJ, bpm: 66,
    chords: { ins: 'pad', vol: 0.35, lp: 900, low: 0.22 },
    mel: { scale: 'yo', lo: 64, hi: 84, center: 72, ins: 'epiano', vol: 0.3, rhythms: R_SLOW, prob: 0.6 },
    sparkle: { ins: 'celesta', prob: 0.3 },
    echo: [4, 0.35, 2000, 0.4],
  }), 1.5],
  // Spirit Realm daytime: Ghibli-ish strings, harp arpeggios, flute
  spirit: [makeMood({
    key: 55, harm: 'lydian', prog: [[0, 1, 0, 4], [0, 1, 5, 4], [0, 4, 5, 1], [0, 5, 1, 4]], bpm: 78,
    chords: { ins: 'pad', vol: 0.42, lp: 1500, low: 0.24, att: 1.4 },
    mel: { scale: 'yo', lo: 67, hi: 91, center: 79, ins: 'theremin', vol: 0.22, rhythms: R_SLOW, prob: 0.7, maxLen: 1.6 },
    sparkle: { ins: 'celesta', prob: 0.55, vol: 0.16 },
    bass: { ins: 'bass', vol: 0.22, pat: [[0, 0, 12]] },
    timp: [0],
    echo: [3, 0.42, 2800, 0.45],
  }), 1.4],
  spiritHarp: [makeMood({
    key: 55, harm: 'major', prog: P_MAJ, bpm: 80,
    chords: { ins: 'pluckArp', vol: 0.22, arp: [0, 2, 4, 6, 8, 10, 12, 14], oct: 0, lp: 3000 },
    mel: { scale: 'yo', lo: 67, hi: 88, center: 76, ins: 'celesta', vol: 0.2, rhythms: R_SLOW, prob: 0.6 },
    bass: { ins: 'bass', vol: 0.22, pat: [[0, 0, 12]] },
    echo: [3, 0.4, 2600, 0.4],
  }), 1.3],
  // tea on tatami: koto, very calm, a little sad and warm (in-scale)
  teatime: [makeMood({
    key: 52, harm: 'minor', prog: [[0, 5, 3, 0], [0, 3, 5, 4], [5, 3, 0, 0]], bpm: 62,
    chords: { ins: 'pad', vol: 0.3, lp: 900, low: 0.18, att: 1.8 },
    mel: { scale: 'in', lo: 64, hi: 84, center: 71, ins: 'pluck', vol: 0.5, rhythms: R_SLOW, prob: 0.8, lp: 2400, wet: 0.6 },
    sparkle: { ins: 'musicbox', prob: 0.2, vol: 0.1 },
    echo: [4, 0.42, 2000, 0.45],
  }), 1.5],
  // Tarōbō: pompous, comic, brassy with taiko
  tengu: [makeMood({
    key: 48, harm: 'minor', prog: [[0, 5, 6, 0], [0, 3, 4, 0], [0, 6, 5, 4]], bpm: 96,
    chords: { ins: 'brass', vol: 0.3 },
    mel: { scale: 'in', lo: 60, hi: 79, center: 67, ins: 'horn', vol: 0.32, rhythms: R_MID, prob: 0.7 },
    bass: { ins: 'tuba', vol: 0.45, pat: [[0, 0, 3], [6, 7, 2], [8, 0, 3], [12, 5, 2]] },
    drums: { kick: [0, 6, 8], clap: [12], vol: 0.8 },
    timp: [0, 8],
  }), 1.0],
  // Kappei: bouncy, watery, silly
  kappa: [makeMood({
    key: 57, harm: 'major', prog: P_MAJ, bpm: 120,
    chords: { ins: 'stab', vol: 0.18, hits: [4, 12] },
    mel: { scale: 'majP', lo: 69, hi: 88, center: 78, ins: 'pizz', vol: 0.42, rhythms: R_BUSY, prob: 0.8 },
    bass: { ins: 'bass', vol: 0.4, pat: [[0, 0, 2], [6, 7, 2], [8, 0, 2], [14, 4, 2]] },
    drums: { kick: [0, 8], shaker: [2, 6, 10, 14], vol: 0.6 },
    sparkle: { ins: 'bloop', prob: 0.6, vol: 0.22 },
  }), 0.9],
  // the station: light city-pop
  station: [makeMood({
    key: 55, harm: 'major', prog: [[0, 4, 5, 3], [3, 4, 2, 5], [0, 5, 3, 4]], bpm: 104,
    chords: { ins: 'epiano', vol: 0.28, hits: [0, 3, 8, 11], len: 3 },
    mel: { scale: 'majP', lo: 67, hi: 86, center: 76, ins: 'vibes', vol: 0.28, rhythms: R_MID, prob: 0.65 },
    bass: { ins: 'synthbass', vol: 0.36, pat: [[0, 0, 3], [3, 0, 2], [8, 7, 3], [11, 5, 2]] },
    drums: { kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], vol: 0.55 },
  }), 0.95],
  // Konyoki reveal: suspense loop
  reveal: [makeMood({
    key: 53, harm: 'major', prog: [[0, 0, 4, 4], [3, 3, 4, 4]], bpm: 90,
    chords: { ins: 'pad', vol: 0.35, lp: 1800, att: 0.4 },
    sparkle: { ins: 'celesta', prob: 0.9, vol: 0.14 },
    timp: [0, 4, 8, 12],
    drums: { shaker: [0, 2, 4, 6, 8, 10, 12, 14], vol: 0.6 },
  }), 1.1],
  // title: the Kodamaya theme (yo scale, koto + glock over a warm pad)
  kodamaya: [makeMood({
    key: 50, harm: 'major', prog: [[0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4]], bpm: 70,
    chords: { ins: 'pad', vol: 0.45, lp: 1100, low: 0.3, att: 1.2 },
    mel: { scale: 'yo', lo: 62, hi: 86, center: 74, ins: 'pluck', vol: 0.55, rhythms: R_SLOW, prob: 0.9, reuse: 0.55, wet: 0.55 },
    sparkle: { ins: 'glock', prob: 0.35, vol: 0.14 },
    echo: [3, 0.4, 2600, 0.5],
  }), 1.5],
};
for (const [name, [fn, lvl]] of Object.entries(KODAMAYA_MOODS)) addMood(name, fn, lvl);
