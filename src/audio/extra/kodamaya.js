// Kodamaya sound effects, synthesised with the engine kit (loaded by
// engine.js through import.meta.glob('./extra/*.js')).
const r = (a, b) => a + Math.random() * (b - a);
const MT = (m) => 440 * Math.pow(2, (m - 69) / 12);

function fx(fn, max = 3, gap = 0.04, g = 1) { return { fn, max, gap, g }; }

// ---- gacha machine
function crankTick(ctx, dest, o, k) { // ratchet click of the turning handle
  const v = new k.Voice(ctx, dest, o, 0.05, 0.06);
  v.noise({ ft: 'bandpass', f: r(2600, 3200), q: 2.2, a: 0.001, rel: 0.03, peak: 0.55 });
  v.tone({ type: 'square', f: r(900, 1100), f2: 500, gl: 0.02, a: 0.001, rel: 0.025, peak: 0.08, lp: 3000 });
  return v.end;
}
function crankTurn(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.04);
  for (let i = 0; i < 4; i++) { v.noise({ t: i * 0.11, ft: 'bandpass', f: r(2400, 3100), q: 2.4, a: 0.001, rel: 0.03, peak: 0.5 }); v.tone({ t: i * 0.11, type: 'square', f: 1000 - i * 60, f2: 520, gl: 0.02, a: 0.001, rel: 0.025, peak: 0.06, lp: 2800 }); }
  v.noise({ t: 0.46, ft: 'lowpass', f: 900, a: 0.002, rel: 0.12, peak: 0.35, buf: 'pink' });
  return v.end;
}
function capsuleDrop(ctx, dest, o, k) { // hollow plastic thunk down the chute, a couple of bounces
  const v = new k.Voice(ctx, dest, o, 0.1, 0.06);
  const hit = (t, p) => { v.tone({ t, type: 'triangle', f: r(330, 380), f2: 190, gl: 0.06, a: 0.001, rel: 0.08, peak: p }); v.noise({ t, ft: 'bandpass', f: 1600, q: 1.2, a: 0.001, rel: 0.04, peak: p * 0.6 }); };
  hit(0, 0.6); hit(0.16, 0.35); hit(0.26, 0.2); hit(0.32, 0.1);
  return v.end;
}
function capsuleRoll(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.04, 0.05);
  v.rustle({ dur: 0.5, f: 900, f2: 600, q: 0.8, n: 26, peak: 0.25, peakAt: 0.2, flicker: 0.6, buf: 'pink' });
  return v.end;
}
function capsuleOpen(ctx, dest, o, k) { // twist creak then a bright plastic pop
  const v = new k.Voice(ctx, dest, o, 0.12, 0.05);
  v.rustle({ dur: 0.18, f: 2200, f2: 3200, q: 1.4, n: 14, peak: 0.25, peakAt: 0.6, flicker: 0.3 });
  v.tone({ t: 0.2, type: 'sine', f: 620, f2: 1300, gl: 0.03, a: 0.001, rel: 0.09, peak: 0.55 });
  v.noise({ t: 0.2, ft: 'highpass', f: 2600, a: 0.001, rel: 0.05, peak: 0.45 });
  return v.end;
}
function coinInsert(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.04);
  v.bell({ f: r(2400, 2700), peak: 0.22, rel: 0.25, parts: k.COINP });
  v.noise({ t: 0.05, ft: 'bandpass', f: 3000, q: 3, a: 0.001, rel: 0.05, peak: 0.25 });
  v.tone({ t: 0.18, type: 'triangle', f: 700, f2: 300, gl: 0.08, a: 0.002, rel: 0.12, peak: 0.18 });
  return v.end;
}
function cashRegister(ctx, dest, o, k) { // mechanical clunk + bell "ka-ching"
  const v = new k.Voice(ctx, dest, o, 0.12, 0.03);
  v.noise({ ft: 'lowpass', f: 700, a: 0.001, rel: 0.08, peak: 0.6, buf: 'pink' });
  v.noise({ t: 0.06, ft: 'bandpass', f: 1800, q: 1.5, a: 0.001, rel: 0.06, peak: 0.4 });
  v.bell({ t: 0.14, f: 1975, peak: 0.35, rel: 0.9, parts: k.BELL });
  v.bell({ t: 0.14, f: 2637, peak: 0.2, rel: 0.7, parts: k.BELL });
  v.rustle({ t: 0.2, dur: 0.3, f: 3200, f2: 5200, q: 0.8, n: 20, peak: 0.18, peakAt: 0.2, flicker: 0.7 });
  return v.end;
}
function exchange(ctx, dest, o, k) { // bill feeder whirr + coins
  const v = new k.Voice(ctx, dest, o, 0.08, 0.03);
  v.tone({ type: 'sawtooth', f: 180, f2: 220, gl: 0.5, a: 0.02, hold: 0.4, rel: 0.08, peak: 0.08, lp: 900 });
  v.noise({ ft: 'bandpass', f: 1200, q: 1, a: 0.02, hold: 0.4, rel: 0.08, peak: 0.12 });
  for (let i = 0; i < 6; i++) v.bell({ t: 0.6 + i * r(0.04, 0.07), f: r(2300, 3100), peak: 0.13, rel: 0.2, parts: k.COINP });
  return v.end;
}
function restockPour(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.03);
  for (let i = 0; i < 18; i++) { const t = i * r(0.03, 0.07); v.tone({ t, type: 'triangle', f: r(280, 520), f2: r(180, 260), gl: 0.05, a: 0.001, rel: 0.05, peak: r(0.12, 0.25) }); }
  v.rustle({ dur: 1.0, f: 1100, f2: 700, q: 0.7, n: 30, peak: 0.2, peakAt: 0.3, flicker: 0.6, buf: 'pink' });
  return v.end;
}
// ---- shop / house
function doorbell(ctx, dest, o, k) { // little shop chime (two notes)
  const v = new k.Voice(ctx, dest, o, 0.25, 0.01);
  v.bell({ f: MT(88), peak: 0.3, rel: 1.4, parts: k.GLOCK });
  v.bell({ t: 0.16, f: MT(84), peak: 0.28, rel: 1.6, parts: k.GLOCK });
  return v.end;
}
function shutterUp(ctx, dest, o, k) { // metal rolling shutter rattle
  const v = new k.Voice(ctx, dest, o, 0.1, 0.02);
  const D = o.down ? 1.1 : 1.5;
  v.rustle({ dur: D, f: 700, f2: 1600, q: 0.9, n: 60, peak: 0.6, peakAt: 0.4, flicker: 0.9, buf: 'white' });
  for (let i = 0; i < 26; i++) v.noise({ t: i * (D / 26) + r(0, 0.02), ft: 'bandpass', f: r(1500, 2600), q: 4, a: 0.001, rel: 0.03, peak: r(0.08, 0.2) });
  v.noise({ t: D, ft: 'lowpass', f: 400, a: 0.002, rel: 0.25, peak: 0.6, buf: 'pink' });
  return v.end;
}
function slidingDoor(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.05);
  v.rustle({ dur: 0.45, f: 500, f2: 900, q: 0.8, n: 20, peak: 0.35, peakAt: 0.5, flicker: 0.3, buf: 'brown' });
  v.noise({ t: 0.45, ft: 'lowpass', f: 600, a: 0.002, rel: 0.12, peak: 0.4, buf: 'pink' });
  return v.end;
}
function doorCreak(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.15, 0.08);
  v.tone({ type: 'sawtooth', f: 160, f2: 240, gl: 0.9, a: 0.05, hold: 0.6, rel: 0.2, peak: 0.12, lp: 1100, vr: 22, vc: 60 });
  v.tone({ type: 'sawtooth', f: 330, f2: 280, gl: 0.9, a: 0.05, hold: 0.5, rel: 0.2, peak: 0.05, lp: 1800, vr: 17, vc: 80 });
  return v.end;
}
function keyTurn(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.06, 0.04);
  v.noise({ ft: 'bandpass', f: 3500, q: 3, a: 0.001, rel: 0.04, peak: 0.35 });
  v.noise({ t: 0.12, ft: 'bandpass', f: 2200, q: 2, a: 0.001, rel: 0.06, peak: 0.5 });
  v.tone({ t: 0.12, type: 'triangle', f: 600, f2: 400, gl: 0.05, a: 0.001, rel: 0.06, peak: 0.2 });
  return v.end;
}
// ---- cleaning
function sweep(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.03, 0.1);
  v.rustle({ dur: r(0.28, 0.36), f: 2400, f2: 1400, q: 0.6, n: 26, peak: 0.42, peakAt: 0.35, flicker: 0.7, buf: 'white' });
  return v.end;
}
function wipe(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.03, 0.1);
  v.rustle({ dur: 0.3, f: 1400, f2: 2200, q: 0.9, n: 18, peak: 0.3, peakAt: 0.5, flicker: 0.4, buf: 'pink' });
  if (Math.random() < 0.4) v.tone({ t: 0.12, type: 'sine', f: r(1600, 2200), f2: r(2400, 2800), gl: 0.06, a: 0.005, rel: 0.05, peak: 0.08 });
  return v.end;
}
function dustPuff(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.1);
  v.noise({ ft: 'lowpass', f: 1300, f2: 500, a: 0.01, rel: 0.25, peak: 0.45, buf: 'pink' });
  return v.end;
}
function boxLift(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.08);
  v.rustle({ dur: 0.22, f: 900, f2: 700, q: 0.7, n: 12, peak: 0.35, peakAt: 0.3, flicker: 0.5, buf: 'brown' });
  v.tone({ type: 'triangle', f: 140, f2: 110, gl: 0.1, a: 0.005, rel: 0.12, peak: 0.25 });
  return v.end;
}
function boxDrop(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.06, 0.08);
  v.noise({ ft: 'lowpass', f: 380, a: 0.002, rel: 0.16, peak: 0.75, buf: 'brown' });
  v.tone({ type: 'sine', f: 95, f2: 60, gl: 0.1, a: 0.002, rel: 0.14, peak: 0.5 });
  v.noise({ t: 0.02, ft: 'bandpass', f: 1200, q: 0.8, a: 0.001, rel: 0.05, peak: 0.2 });
  return v.end;
}
function cobweb(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.1);
  v.rustle({ dur: 0.35, f: 5000, f2: 7000, q: 0.8, n: 20, peak: 0.18, peakAt: 0.4, flicker: 0.6 });
  return v.end;
}
// ---- Happiness
function happyPop(ctx, dest, o, k) { // konpeito pops out of a happy kid
  const v = new k.Voice(ctx, dest, o, 0.3, 0.06);
  v.tone({ type: 'sine', f: r(900, 1100), f2: r(1800, 2200), gl: 0.06, a: 0.002, rel: 0.12, peak: 0.35 });
  v.bell({ t: 0.04, f: r(2000, 2600), peak: 0.16, rel: 0.4, parts: k.CELESTA });
  return v.end;
}
function happyCollect(ctx, dest, o, k) { // swiped: bright rising blip (chain with opts.pitch)
  const v = new k.Voice(ctx, dest, o, 0.3, 0.01);
  v.bell({ f: MT(84), peak: 0.22, rel: 0.5, parts: k.GLOCK });
  v.tone({ type: 'triangle', f: MT(96), a: 0.002, rel: 0.12, peak: 0.08 });
  return v.end;
}
function jarClink(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.2, 0.08);
  v.bell({ f: r(3200, 3900), peak: 0.18, rel: 0.35, parts: k.BELL });
  return v.end;
}
function jarFull(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.3, 0.01);
  [72, 76, 79, 84].forEach((m, i) => v.bell({ t: i * 0.09, f: MT(m), peak: 0.2, rel: 0.8, parts: k.GLOCK }));
  return v.end;
}
function manekiAwaken(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.45, 0.01);
  v.bell({ f: MT(81), peak: 0.35, rel: 2.2, parts: k.BELL });
  [84, 88, 91, 96, 100].forEach((m, i) => v.bell({ t: 0.3 + i * 0.1, f: MT(m), peak: 0.16, rel: 1.2, parts: k.CELESTA }));
  v.noise({ t: 0.3, ft: 'highpass', f: 6000, a: 0.3, rel: 1.2, peak: 0.05 });
  return v.end;
}
// ---- travel
function trainChime(ctx, dest, o, k) { // an original gentle 5-note arrival chime
  const v = new k.Voice(ctx, dest, o, 0.35, 0);
  [[79, 0], [84, 0.28], [88, 0.56], [86, 0.84], [91, 1.12]].forEach(([m, t]) => { v.bell({ t, f: MT(m), peak: 0.22, rel: 1.4, parts: k.SOFT }); v.tone({ t, type: 'sine', f: MT(m - 12), a: 0.01, rel: 0.9, peak: 0.06 }); });
  return v.end;
}
function trainDoor(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.02);
  v.noise({ ft: 'lowpass', f: 900, a: 0.02, hold: 0.25, rel: 0.2, peak: 0.25, buf: 'pink' });
  v.tone({ t: 0.0, type: 'sine', f: 1046, a: 0.01, hold: 0.1, rel: 0.1, peak: 0.08 });
  v.tone({ t: 0.25, type: 'sine', f: 784, a: 0.01, hold: 0.1, rel: 0.1, peak: 0.08 });
  return v.end;
}
function gateBeep(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0);
  v.tone({ type: 'square', f: 1760, a: 0.002, hold: 0.06, rel: 0.02, peak: 0.08, lp: 4000 });
  v.tone({ t: 0.1, type: 'square', f: 1760, a: 0.002, hold: 0.06, rel: 0.02, peak: 0.08, lp: 4000 });
  return v.end;
}
function notification(ctx, dest, o, k) { // phone buzz + soft tone
  const v = new k.Voice(ctx, dest, o, 0.05, 0);
  v.tone({ type: 'sawtooth', f: 140, a: 0.005, hold: 0.18, rel: 0.03, peak: 0.12, lp: 300 });
  v.tone({ t: 0.26, type: 'sawtooth', f: 140, a: 0.005, hold: 0.18, rel: 0.03, peak: 0.12, lp: 300 });
  v.bell({ t: 0.05, f: MT(88), peak: 0.1, rel: 0.4, parts: k.GLOCK });
  return v.end;
}
function phoneTap(ctx, dest, o, k) { const v = new k.Voice(ctx, dest, o, 0.02, 0.1); v.tone({ type: 'sine', f: 1800, a: 0.001, rel: 0.02, peak: 0.08 }); return v.end; }
// ---- spirit realm
function poof(ctx, dest, o, k) { // Hokori teleport puff
  const v = new k.Voice(ctx, dest, o, 0.2, 0.12);
  v.noise({ ft: 'lowpass', f: 2200, f2: 400, gl: 0.2, a: 0.005, rel: 0.28, peak: 0.5, buf: 'pink' });
  v.tone({ type: 'sine', f: 520, f2: 980, gl: 0.08, a: 0.002, rel: 0.08, peak: 0.15 });
  return v.end;
}
function hokoriSqueak(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.15);
  v.tone({ type: 'sine', f: r(1300, 1700), f2: r(1900, 2400), gl: 0.07, a: 0.003, rel: 0.06, peak: 0.2, vr: 30, vc: 60, vd: 0.01 });
  return v.end;
}
function windGust(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.2, 0.05);
  v.noise({ ft: 'bandpass', f: 400, f2: 1600, gl: 0.6, q: 0.8, a: 0.25, hold: 0.3, rel: 0.7, peak: 0.6, buf: 'pink' });
  v.noise({ ft: 'highpass', f: 3000, a: 0.3, rel: 0.6, peak: 0.12 });
  return v.end;
}
function cloudPuff(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.3, 0.1);
  v.noise({ ft: 'lowpass', f: 900, f2: 300, a: 0.04, rel: 0.6, peak: 0.45, buf: 'brown' });
  v.bell({ t: 0.1, f: r(1500, 1900), peak: 0.06, rel: 0.6, parts: k.CELESTA });
  return v.end;
}
function caw(ctx, dest, o, k) { // crow
  const v = new k.Voice(ctx, dest, o, 0.15, 0.06);
  for (let i = 0; i < (o.n || 2); i++) {
    v.tone({ t: i * 0.3, type: 'sawtooth', f: 620, f2: 460, gl: 0.18, a: 0.01, hold: 0.06, rel: 0.12, peak: 0.25, lp: 1800, vr: 40, vc: 90, vd: 0.01 });
    v.noise({ t: i * 0.3, ft: 'bandpass', f: 1400, q: 1.5, a: 0.01, hold: 0.06, rel: 0.12, peak: 0.12 });
  }
  return v.end;
}
function portalOpen(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.5, 0);
  v.tone({ type: 'sine', f: 110, f2: 440, gl: 1.6, a: 0.4, hold: 0.8, rel: 1.2, peak: 0.2 });
  v.noise({ ft: 'bandpass', f: 300, f2: 2400, gl: 1.8, q: 1.2, a: 0.6, hold: 0.6, rel: 1.0, peak: 0.35, buf: 'pink' });
  [72, 76, 79, 83, 84, 88, 91, 95].forEach((m, i) => v.bell({ t: 0.8 + i * 0.12, f: MT(m), peak: 0.12, rel: 1.4, parts: k.CELESTA }));
  return v.end;
}
function portalWhoosh(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.3, 0.05);
  v.noise({ ft: 'bandpass', f: 300, f2: 3000, gl: 0.7, q: 0.7, a: 0.2, rel: 0.6, peak: 0.6, buf: 'pink' });
  return v.end;
}
function manifest(ctx, dest, o, k) { // Konyoki manifesting shimmer
  const v = new k.Voice(ctx, dest, o, 0.5, 0.02);
  for (let i = 0; i < 10; i++) v.bell({ t: i * 0.08, f: MT(84 + [0, 4, 7, 11, 12, 16, 19, 23, 24, 28][i]), peak: 0.1, rel: 1.0, parts: k.CELESTA });
  v.noise({ ft: 'highpass', f: 5000, a: 0.3, hold: 0.4, rel: 0.6, peak: 0.06 });
  return v.end;
}
function grow(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.3, 0.05);
  v.tone({ type: 'sine', f: 300, f2: 900, gl: 0.4, a: 0.05, rel: 0.3, peak: 0.15 });
  [79, 84, 88].forEach((m, i) => v.bell({ t: 0.15 + i * 0.08, f: MT(m), peak: 0.1, rel: 0.6, parts: k.GLOCK }));
  return v.end;
}
function branchGrow(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.3, 0.05);
  v.tone({ type: 'sawtooth', f: 90, f2: 140, gl: 0.8, a: 0.1, hold: 0.4, rel: 0.4, peak: 0.12, lp: 600, vr: 9, vc: 40 });
  v.rustle({ dur: 1.0, f: 600, f2: 1200, q: 0.6, n: 30, peak: 0.25, peakAt: 0.6, flicker: 0.5, buf: 'brown' });
  [76, 79, 84, 88, 91].forEach((m, i) => v.bell({ t: 0.7 + i * 0.09, f: MT(m), peak: 0.12, rel: 0.9, parts: k.CELESTA }));
  return v.end;
}
function harvestPluck(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.1);
  v.noise({ ft: 'bandpass', f: 2500, q: 1, a: 0.002, rel: 0.05, peak: 0.3 });
  v.tone({ type: 'sine', f: 700, f2: 1100, gl: 0.04, a: 0.001, rel: 0.06, peak: 0.2 });
  return v.end;
}
// ---- tea & food
function pourTea(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.03);
  v.noise({ ft: 'bandpass', f: 1500, f2: 900, gl: 1.2, q: 1.2, a: 0.08, hold: 0.9, rel: 0.25, peak: 0.35, buf: 'white' });
  v.rustle({ dur: 1.2, f: 2500, f2: 1800, q: 1.5, n: 40, peak: 0.12, peakAt: 0.5, flicker: 0.6 });
  return v.end;
}
function kettleWhistle(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.15, 0.02);
  v.tone({ type: 'sine', f: 1600, f2: 2100, gl: 1.0, a: 0.4, hold: 0.8, rel: 0.4, peak: 0.14, vr: 6, vc: 20 });
  v.noise({ ft: 'bandpass', f: 2000, q: 4, a: 0.3, hold: 0.8, rel: 0.4, peak: 0.08 });
  return v.end;
}
function boil(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.05);
  for (let i = 0; i < 14; i++) v.tone({ t: i * r(0.05, 0.12), type: 'sine', f: r(300, 700), f2: r(700, 1200), gl: 0.03, a: 0.002, rel: 0.04, peak: r(0.05, 0.12) });
  return v.end;
}
function whisk(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.05);
  for (let i = 0; i < 8; i++) v.rustle({ t: i * 0.09, dur: 0.08, f: 3000, f2: 4200, q: 0.9, n: 8, peak: 0.2, peakAt: 0.5, flicker: 0.4 });
  return v.end;
}
function grind(ctx, dest, o, k) { // stone mill
  const v = new k.Voice(ctx, dest, o, 0.06, 0.05);
  v.rustle({ dur: 0.9, f: 300, f2: 500, q: 0.6, n: 40, peak: 0.45, peakAt: 0.5, flicker: 0.8, buf: 'brown' });
  v.tone({ type: 'sawtooth', f: 55, a: 0.1, hold: 0.6, rel: 0.2, peak: 0.08, lp: 300 });
  return v.end;
}
function slurp(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.1);
  v.noise({ ft: 'bandpass', f: 1200, f2: 2600, gl: 0.3, q: 2, a: 0.03, hold: 0.15, rel: 0.1, peak: 0.25, buf: 'pink' });
  return v.end;
}
function munch(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.03, 0.12);
  for (let i = 0; i < 3; i++) v.noise({ t: i * 0.11, ft: 'bandpass', f: r(800, 1400), q: 1.2, a: 0.004, rel: 0.05, peak: 0.25, buf: 'pink' });
  return v.end;
}
function ketchup(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.08);
  v.noise({ ft: 'lowpass', f: 600, f2: 300, a: 0.01, rel: 0.2, peak: 0.4, buf: 'brown' });
  v.tone({ type: 'sine', f: 180, f2: 90, gl: 0.15, a: 0.005, rel: 0.12, peak: 0.25 });
  return v.end;
}
function bentoOpen(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.06, 0.05);
  v.rustle({ dur: 0.25, f: 1800, f2: 2600, q: 0.8, n: 16, peak: 0.25, peakAt: 0.4, flicker: 0.5 });
  v.tone({ t: 0.25, type: 'triangle', f: 420, f2: 300, gl: 0.06, a: 0.002, rel: 0.08, peak: 0.2 });
  return v.end;
}
function chopsticks(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.04, 0.1);
  v.tone({ type: 'triangle', f: 2400, a: 0.001, rel: 0.03, peak: 0.15 });
  v.tone({ t: 0.07, type: 'triangle', f: 2600, a: 0.001, rel: 0.03, peak: 0.12 });
  return v.end;
}
function sighSfx(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.05);
  v.noise({ ft: 'bandpass', f: 700, f2: 400, gl: 0.9, q: 0.9, a: 0.15, hold: 0.3, rel: 0.5, peak: 0.3, buf: 'pink' });
  return v.end;
}
function hug(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.2, 0.02);
  v.rustle({ dur: 0.5, f: 700, f2: 500, q: 0.6, n: 18, peak: 0.25, peakAt: 0.3, flicker: 0.3, buf: 'brown' });
  [60, 64, 67].forEach((m, i) => v.tone({ t: 0.25 + i * 0.03, type: 'sine', f: MT(m), a: 0.2, hold: 0.4, rel: 1.0, peak: 0.07 }));
  return v.end;
}
function embarrassed(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.05);
  v.tone({ type: 'sine', f: 400, f2: 900, gl: 0.12, a: 0.005, rel: 0.1, peak: 0.25 });
  v.tone({ t: 0.12, type: 'sine', f: 900, f2: 500, gl: 0.15, a: 0.005, rel: 0.12, peak: 0.2 });
  return v.end;
}
function surprise(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.15, 0.03);
  v.tone({ type: 'square', f: 500, f2: 1300, gl: 0.08, a: 0.002, rel: 0.12, peak: 0.12, lp: 3000 });
  v.bell({ t: 0.05, f: MT(91), peak: 0.15, rel: 0.4, parts: k.GLOCK });
  return v.end;
}
function angryHuff(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.06);
  v.noise({ ft: 'bandpass', f: 600, q: 0.8, a: 0.01, rel: 0.2, peak: 0.45, buf: 'pink' });
  v.tone({ type: 'sawtooth', f: 160, f2: 110, gl: 0.15, a: 0.005, rel: 0.12, peak: 0.12, lp: 900 });
  return v.end;
}
function sparkleSfx(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.35, 0.03);
  [88, 91, 96].forEach((m, i) => v.bell({ t: i * 0.05, f: MT(m), peak: 0.12, rel: 0.5, parts: k.CELESTA }));
  return v.end;
}
function bubbleSfx(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.08);
  v.tone({ type: 'sine', f: 700, f2: 1100, gl: 0.05, a: 0.002, rel: 0.05, peak: 0.12 });
  return v.end;
}
function textBlip(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.0, 0.08);
  v.tone({ type: 'square', f: 600, a: 0.001, rel: 0.02, peak: 0.05, lp: 2000 });
  return v.end;
}
function fusuma(ctx, dest, o, k) { return slidingDoor(ctx, dest, o, k); }
function stamp(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.05);
  v.noise({ ft: 'lowpass', f: 500, a: 0.001, rel: 0.12, peak: 0.7, buf: 'brown' });
  v.tone({ type: 'sine', f: 140, f2: 70, gl: 0.1, a: 0.001, rel: 0.1, peak: 0.5 });
  return v.end;
}

export const EXTRA_SFX = {
  crankTick: fx(crankTick, 4, 0.03), crankTurn: fx(crankTurn, 2, 0.1), capsuleDrop: fx(capsuleDrop, 3, 0.05), capsuleRoll: fx(capsuleRoll, 3, 0.1),
  capsuleOpen: fx(capsuleOpen, 3, 0.05), coinInsert: fx(coinInsert, 3, 0.05), cashRegister: fx(cashRegister, 1, 0.3), exchange: fx(exchange, 1, 0.3),
  restockPour: fx(restockPour, 1, 0.3), doorbell: fx(doorbell, 1, 0.4), shutterUp: fx(shutterUp, 1, 0.5), slidingDoor: fx(slidingDoor, 2, 0.2),
  doorCreak: fx(doorCreak, 1, 0.3), keyTurn: fx(keyTurn, 1, 0.2), sweep: fx(sweep, 3, 0.08), wipe: fx(wipe, 3, 0.08), dustPuff: fx(dustPuff, 4, 0.05),
  boxLift: fx(boxLift, 2, 0.1), boxDrop: fx(boxDrop, 2, 0.1), cobweb: fx(cobweb, 2, 0.1), happyPop: fx(happyPop, 6, 0.03), happyCollect: fx(happyCollect, 8, 0.02),
  jarClink: fx(jarClink, 6, 0.03), jarFull: fx(jarFull, 1, 0.5), manekiAwaken: fx(manekiAwaken, 1, 1), trainChime: fx(trainChime, 1, 1), trainDoor: fx(trainDoor, 1, 0.5),
  gateBeep: fx(gateBeep, 3, 0.1), notification: fx(notification, 1, 0.3), phoneTap: fx(phoneTap, 3, 0.03), poof: fx(poof, 4, 0.05), hokoriSqueak: fx(hokoriSqueak, 4, 0.05),
  windGust: fx(windGust, 2, 0.3), cloudPuff: fx(cloudPuff, 4, 0.1), caw: fx(caw, 2, 0.3), portalOpen: fx(portalOpen, 1, 1), portalWhoosh: fx(portalWhoosh, 1, 0.3),
  manifest: fx(manifest, 2, 0.2), grow: fx(grow, 3, 0.1), branchGrow: fx(branchGrow, 1, 0.5), harvestPluck: fx(harvestPluck, 4, 0.05), pourTea: fx(pourTea, 1, 0.5),
  kettleWhistle: fx(kettleWhistle, 1, 0.5), boil: fx(boil, 2, 0.3), whisk: fx(whisk, 1, 0.3), grind: fx(grind, 1, 0.3), slurp: fx(slurp, 2, 0.2), munch: fx(munch, 3, 0.1),
  ketchup: fx(ketchup, 1, 0.2), bentoOpen: fx(bentoOpen, 1, 0.3), chopsticks: fx(chopsticks, 2, 0.1), sigh: fx(sighSfx, 2, 0.4), hug: fx(hug, 1, 0.5),
  embarrassed: fx(embarrassed, 2, 0.2), surprise: fx(surprise, 2, 0.15), angryHuff: fx(angryHuff, 2, 0.2), sparkle: fx(sparkleSfx, 4, 0.06),
  bubble: fx(bubbleSfx, 4, 0.04), textBlip: fx(textBlip, 2, 0.02), fusuma: fx(fusuma, 1, 0.3), stampK: fx(stamp, 1, 0.2),
};
