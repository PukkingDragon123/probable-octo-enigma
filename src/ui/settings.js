// Player settings: music / sound volumes live in the audio engine (which keeps
// them in localStorage itself); text speed and screen shake are kept here.
const KEY = 'kodamaya.settings.v1';

export const TEXT_SPEEDS = [
  { label: 'SLOW', mul: 0.6 },
  { label: 'NORMAL', mul: 1 },
  { label: 'FAST', mul: 1.8 },
  { label: 'INSTANT', mul: 0 },
];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export class Settings {
  constructor(audio) {
    this.audio = audio;
    this.data = { text: 1, shake: true, ...load() };
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage unavailable */ } }
  get textSpeed() { return TEXT_SPEEDS[this.data.text] ?? TEXT_SPEEDS[1]; }
  // typewriter speed multiplier (0 = whole line at once)
  get textMul() { return this.textSpeed.mul; }
  get shake() { return this.data.shake !== false; }
  set(k, v) { this.data[k] = v; this.save(); }
  vol(k) { try { return this.audio?.engine?.getVolumes?.()[k] ?? 0.5; } catch { return 0.5; } }
  setVol(k, v) { this.audio?.setVolume?.({ [k]: v }); }
}
