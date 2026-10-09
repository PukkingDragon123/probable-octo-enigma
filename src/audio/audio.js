// Kodamaya audio facade over the ported engine: SFX by name (with Kodamaya
// aliases), music moods, ambience beds (train, station crowd, street, rain,
// shop hum, nature), character babble voices and train/station announcements
// (Web Speech API in Japanese + English when available, chime + murmur otherwise).
import engine, { addVoice, _engine } from './engine.js';
import './music.js';

// Kodamaya character voices for the babble synth
addVoice('boy', { f0: 250, size: 1.04, rate: 0.95, lp: 0, rough: 0, att: 0.01, breath: 0.03, trim: 1, vow: 'aoueia' });
addVoice('girl', { f0: 380, size: 1.18, rate: 1.05, lp: 0, rough: 0, att: 0.007, breath: 0.025, trim: 0.95, vow: 'iaeoie' });
addVoice('old', { f0: 150, size: 0.92, rate: 0.82, lp: 2600, rough: 0.15, att: 0.016, breath: 0.06, trim: 1.05, vow: 'oauoea' });
addVoice('big', { f0: 120, size: 0.84, rate: 0.95, lp: 2400, rough: 0.05, att: 0.013, breath: 0.03, trim: 1, vow: 'ouanoa' });
addVoice('lady', { f0: 300, size: 1.12, rate: 0.95, lp: 3600, rough: 0, att: 0.01, breath: 0.035, trim: 0.95, vow: 'aeioa' });
addVoice('gruff', { f0: 95, size: 0.78, rate: 0.85, lp: 2200, rough: 0.45, att: 0.02, breath: 0.05, trim: 1.05, vow: 'ouaon' });
addVoice('kid', { f0: 520, size: 1.26, rate: 1.15, lp: 0, rough: 0, att: 0.006, breath: 0.015, trim: 0.9, vow: 'iexaie' });
addVoice('spirit', { f0: 420, size: 1.3, rate: 0.9, lp: 3000, rough: 0, att: 0.02, breath: 0.08, trim: 0.9, vow: 'ououi' });
addVoice('dust', { f0: 700, size: 1.5, rate: 1.4, lp: 0, rough: 0, att: 0.004, breath: 0.1, trim: 0.7, vow: 'iiu' });

// Kodamaya name -> engine name (anything not listed is looked up directly)
const ALIAS = {
  tap: 'click', select: 'click', back: 'close', pop: 'pop_in', levelUp: 'levelup', unlock: 'discover', notify: 'tag',
  coins: 'coins', coinDrop: 'coin', splash: 'splash', waterPour: 'splash', footstepWood: 'footsteps', footstepStone: 'footsteps',
  footstepTatami: 'footsteps', footstepGrass: 'footsteps', paper: 'paper', stamp: 'stampK', heartbeat: 'heartbeat',
  birdFlap: 'whoosh', sparrowChirp: 'bird_chirp', catMeow: 'pet', bicycleBell: 'bell', reveal: 'reveal_common', revealRare: 'reveal_rare',
  revealSecret: 'reveal_legendary', photoShutter: 'tag', laugh: 'fox_laugh', gasp: 'surprise', cry: 'sigh', machineLid: 'drop',
  trashBag: 'grab', windowOpen: 'slidingDoor', plant: 'dig', vendingThunk: 'drop', lampFlicker: 'beep', neonBuzz: 'beep',
  thunder: 'build_cloud', steam: 'whoosh', cupSet: 'chip', capsuleClick: 'tick', tenguHmph: 'angryHuff', fuse: 'poof',
  trainBrake: 'whoosh', shutterDown: 'shutterUp', stairs: 'footsteps', jump: 'jump', drop: 'drop', grab: 'grab',
};

const AMB = {
  // name: { engineAmb: level for the engine's nature beds, beds: [...custom loops] }
  none: { nature: 0, beds: [] },
  spirit: { nature: 0.9, beds: [] },
  onsen: { nature: 0.7, beds: [{ kind: 'water', level: 0.25 }] },
  street: { nature: 0.35, beds: [{ kind: 'city', level: 0.12 }] },
  streetNight: { nature: 0.45, beds: [{ kind: 'city', level: 0.08 }] },
  rain: { nature: 0.1, beds: [{ kind: 'rain', level: 0.45 }, { kind: 'city', level: 0.06 }] },
  train: { nature: 0, beds: [{ kind: 'train', level: 0.5 }] },
  tunnel: { nature: 0, beds: [{ kind: 'train', level: 0.7 }, { kind: 'tunnel', level: 0.3 }] },
  station: { nature: 0, beds: [{ kind: 'crowd', level: 0.35 }, { kind: 'city', level: 0.1 }] },
  shop: { nature: 0.1, beds: [{ kind: 'hum', level: 0.08 }] },
  diner: { nature: 0, beds: [{ kind: 'crowd', level: 0.12 }, { kind: 'hum', level: 0.06 }] },
  room: { nature: 0.15, beds: [] },
};

export class Audio {
  constructor() {
    this.engine = engine;
    this.beds = new Map(); // kind -> { gain, nodes }
    this.ambName = null;
    this.musicName = null;
    this.duckT = 0;
    this.speaking = false;
  }
  unlock() { try { engine.unlock(); this.applyAmbience(); } catch { /* */ } }
  play(name, o = {}) {
    if (!name) return;
    try { engine.play(ALIAS[name] || name, o); } catch { /* never throw */ }
  }
  music(name, o = {}) {
    this.musicName = name ?? null;
    const map = { night: 'nightStreet', title: 'kodamaya', sleep: 'sleep' };
    try { engine.setMusic(name ? map[name] || name : null); } catch { /* */ }
  }
  ambience(name) {
    this.ambName = name ?? 'none';
    this.applyAmbience();
  }
  applyAmbience() {
    const E = _engine();
    const A = AMB[this.ambName || 'none'] || AMB.none;
    try { const v = engine.getVolumes?.(); if (v) engine.setVolumes({ ambience: A.nature > 0 ? Math.max(0.0, A.nature * 0.7) : 0 }); } catch { /* */ }
    if (!E.ctx || !E.rig) return;
    const want = new Map(A.beds.map((b) => [b.kind, b.level]));
    const t = E.ctx.currentTime;
    for (const [kind, bed] of this.beds) {
      const lvl = want.get(kind) ?? 0;
      bed.gain.gain.setTargetAtTime(lvl, t, 0.8);
    }
    for (const [kind, lvl] of want) if (!this.beds.has(kind)) {
      const bed = this.makeBed(kind, E);
      if (!bed) continue;
      this.beds.set(kind, bed);
      bed.gain.gain.setValueAtTime(0, t);
      bed.gain.gain.setTargetAtTime(lvl, t, 0.8);
    }
  }
  makeBed(kind, E) {
    const { ctx, rig, res } = E;
    const gain = ctx.createGain();
    gain.connect(rig.buses.amb.dry);
    const src = (buf = 'pink') => { const s = ctx.createBufferSource(); s.buffer = res.noise[buf] || res.noise.white; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const flt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const lfo = (rate, depth, target) => { const o = ctx.createOscillator(); o.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; };
    if (kind === 'train') {
      // low rumble + rhythmic rail joints (clack-clack) via an amplitude LFO
      const s = src('brown'), lp = flt('lowpass', 260), g2 = ctx.createGain(); g2.gain.value = 0.8;
      s.connect(lp); lp.connect(g2); g2.connect(gain);
      const s2 = src('pink'), bp = flt('bandpass', 900, 1.2), g3 = ctx.createGain(); g3.gain.value = 0.0;
      s2.connect(bp); bp.connect(g3); g3.connect(gain);
      lfo(2.6, 0.22, g3.gain); lfo(0.13, 0.15, g2.gain);
      const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 58; const hg = ctx.createGain(); hg.gain.value = 0.02; const hl = flt('lowpass', 200);
      hum.connect(hl); hl.connect(hg); hg.connect(gain); hum.start();
    } else if (kind === 'tunnel') {
      const s = src('brown'), lp = flt('lowpass', 500); s.connect(lp); lp.connect(gain);
    } else if (kind === 'rain') {
      const s = src('white'), hp = flt('highpass', 1800), lp = flt('lowpass', 7000); s.connect(hp); hp.connect(lp); lp.connect(gain);
      const s2 = src('pink'), bp = flt('bandpass', 500, 0.6), g2 = ctx.createGain(); g2.gain.value = 0.5; s2.connect(bp); bp.connect(g2); g2.connect(gain);
    } else if (kind === 'crowd') {
      // murmur: several band-passed noise voices with slow wobble (formant-ish)
      for (const f of [420, 650, 900, 1300]) {
        const s = src('pink'), bp = flt('bandpass', f, 3), g2 = ctx.createGain(); g2.gain.value = 0.25;
        s.connect(bp); bp.connect(g2); g2.connect(gain); lfo(0.3 + Math.random() * 0.8, 0.18, g2.gain); lfo(0.5 + Math.random(), f * 0.15, bp.frequency);
      }
    } else if (kind === 'city') {
      const s = src('brown'), lp = flt('lowpass', 400); s.connect(lp); lp.connect(gain);
    } else if (kind === 'hum') {
      const o1 = ctx.createOscillator(); o1.frequency.value = 100; o1.type = 'sine'; const g2 = ctx.createGain(); g2.gain.value = 0.15; o1.connect(g2); g2.connect(gain); o1.start();
      const s = src('pink'), lp = flt('lowpass', 300); const g4 = ctx.createGain(); g4.gain.value = 0.4; s.connect(lp); lp.connect(g4); g4.connect(gain);
    } else if (kind === 'water') {
      const s = src('white'), bp = flt('bandpass', 1200, 0.5); s.connect(bp); bp.connect(gain); lfo(0.4, 400, bp.frequency);
    } else return null;
    return { gain };
  }
  // character babble; returns { stop() }
  voice(voiceDef, text, o = {}) {
    const name = typeof voiceDef === 'string' ? voiceDef : voiceDef?.kind || 'boy';
    const pitch = typeof voiceDef === 'object' ? (voiceDef.pitch ?? 1) : 1;
    try { engine.babble(name, text, { pitch: (o.pitch ?? 1) * (pitch > 0 ? 1 + (pitch - 1) * 0.6 : 1), volume: o.volume ?? 0.9, cps: o.cps ?? 30 }); } catch { /* */ }
    return { stop: () => { try { engine.stopBabble?.(name); } catch { /* */ } } };
  }
  // train / station announcement
  announce({ ja = '', en = '' } = {}) {
    this.play('trainChime', { volume: 0.7 });
    return new Promise((resolve) => {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      const fallback = () => setTimeout(resolve, 2200 + (ja.length + en.length) * 25);
      if (!synth || engine.isMuted?.()) { fallback(); return; }
      try {
        const voices = synth.getVoices();
        const say = (text, lang, rate) => new Promise((res) => {
          if (!text) { res(); return; }
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang; u.rate = rate; u.pitch = 1.05; u.volume = 0.75;
          const v = voices.find((x) => x.lang?.startsWith(lang.slice(0, 2)) && /female|kyoko|haruka|ayumi|nanami|google/i.test(x.name)) || voices.find((x) => x.lang?.startsWith(lang.slice(0, 2)));
          if (v) u.voice = v;
          let done = false;
          const fin = () => { if (!done) { done = true; res(); } };
          u.onend = fin; u.onerror = fin;
          setTimeout(fin, 1500 + text.length * 160);
          synth.speak(u);
        });
        setTimeout(async () => {
          this.speaking = true;
          await say(ja, 'ja-JP', 0.95);
          await say(en, 'en-US', 0.95);
          this.speaking = false;
          resolve();
        }, 1500);
      } catch { fallback(); }
    });
  }
  setMuted(m) { try { engine.setMuted(m); } catch { /* */ } }
  isMuted() { try { return engine.isMuted(); } catch { return false; } }
  setVolume(v) { try { engine.setVolumes(v); } catch { /* */ } }
  update() { try { engine.update(); } catch { /* */ } }
}
