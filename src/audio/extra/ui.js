// Menu sounds for the kinetic UI (title, pause, settings, cards): short,
// bright and punchy so every cursor move and confirm has a "snap" to it.
// Loaded by engine.js through import.meta.glob('./extra/*.js').
const r = (a, b) => a + Math.random() * (b - a);

function fx(fn, max = 3, gap = 0.03, g = 1) { return { fn, max, gap, g }; }

// cursor move: a crisp tick with a little chirp on top
function uiMove(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.04, 0.03);
  v.tone({ type: 'square', f: r(1750, 1850), f2: 1250, gl: 0.025, a: 0.001, rel: 0.035, peak: 0.07, lp: 4200 });
  v.tone({ type: 'triangle', f: 2600, f2: 3100, gl: 0.02, a: 0.001, rel: 0.03, peak: 0.08 });
  v.noise({ ft: 'highpass', f: 5200, a: 0.001, rel: 0.012, peak: 0.16 });
  return v.end;
}
// confirm: a two-step rising "shing" with a bell ring
function uiConfirm(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.12, 0.01);
  v.noise({ ft: 'bandpass', f: 1800, f2: 5200, gl: 0.08, q: 0.9, a: 0.004, rel: 0.09, peak: 0.32 });
  v.tone({ type: 'square', f: 880, a: 0.001, hold: 0.03, rel: 0.04, peak: 0.07, lp: 3600 });
  v.tone({ t: 0.05, type: 'square', f: 1318.5, a: 0.001, hold: 0.04, rel: 0.12, peak: 0.08, lp: 4200 });
  v.bell({ t: 0.05, f: 2637, peak: 0.12, rel: 0.5, parts: k.GLOCK });
  return v.end;
}
// back / cancel: a falling blip
function uiBack(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.05, 0.02);
  v.tone({ type: 'square', f: 1100, f2: 520, gl: 0.08, a: 0.001, rel: 0.09, peak: 0.07, lp: 3000 });
  v.noise({ ft: 'bandpass', f: 2600, f2: 900, gl: 0.08, q: 1, a: 0.002, rel: 0.07, peak: 0.2 });
  return v.end;
}
// menu opens: a quick swish up and a hard slap
function uiOpen(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.1, 0.02);
  v.noise({ buf: 'pink', ft: 'bandpass', f: 600, f2: 4200, gl: 0.12, q: 0.9, a: 0.03, rel: 0.06, peak: 0.45 });
  v.noise({ t: 0.12, ft: 'lowpass', f: 1400, a: 0.001, rel: 0.07, peak: 0.55, buf: 'pink' });
  v.tone({ t: 0.12, type: 'triangle', f: 180, f2: 70, gl: 0.08, a: 0.001, rel: 0.1, peak: 0.45 });
  v.tone({ t: 0.13, type: 'square', f: 1568, a: 0.001, rel: 0.08, peak: 0.05, lp: 4000 });
  return v.end;
}
// menu closes: the swish in reverse
function uiClose(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.08, 0.02);
  v.noise({ buf: 'pink', ft: 'bandpass', f: 3800, f2: 500, gl: 0.12, q: 0.9, a: 0.01, rel: 0.1, peak: 0.4 });
  v.tone({ t: 0.03, type: 'triangle', f: 600, f2: 160, gl: 0.1, a: 0.002, rel: 0.1, peak: 0.25 });
  return v.end;
}
// a card / banner slamming onto the screen: thump, paper crack and a glint
function uiSlam(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.16, 0.02);
  v.noise({ buf: 'pink', ft: 'bandpass', f: 900, f2: 3000, gl: 0.1, q: 0.8, a: 0.05, rel: 0.03, peak: 0.3 });
  v.tone({ t: 0.08, type: 'sine', f: 120, f2: 48, gl: 0.16, a: 0.001, rel: 0.22, peak: 0.8 });
  v.noise({ t: 0.08, ft: 'highpass', f: 1800, a: 0.001, rel: 0.06, peak: 0.5 });
  v.noise({ t: 0.08, ft: 'lowpass', f: 600, a: 0.001, rel: 0.14, peak: 0.6, buf: 'brown' });
  v.bell({ t: 0.12, f: 3136, peak: 0.07, rel: 0.6, parts: k.GLOCK });
  return v.end;
}
// value nudged (slider step / option flip)
function uiTick(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.02, 0.04);
  v.tone({ type: 'triangle', f: r(1300, 1400), f2: 1000, gl: 0.02, a: 0.001, rel: 0.03, peak: 0.16 });
  v.noise({ ft: 'bandpass', f: 4200, q: 2, a: 0.001, rel: 0.01, peak: 0.14 });
  return v.end;
}
// the big title-screen confirm: a rising sweep into a bright chord
function uiStart(ctx, dest, o, k) {
  const v = new k.Voice(ctx, dest, o, 0.22, 0);
  v.noise({ buf: 'pink', ft: 'bandpass', f: 400, f2: 6000, gl: 0.4, q: 0.8, a: 0.3, rel: 0.12, peak: 0.35 });
  for (const [i, f] of [[0, 523.25], [1, 659.25], [2, 783.99], [3, 1046.5]]) v.tone({ t: 0.32 + i * 0.045, type: 'square', f, a: 0.002, hold: 0.06, rel: 0.4, peak: 0.05, lp: 3200 });
  v.bell({ t: 0.36, f: 2093, peak: 0.16, rel: 1.2, parts: k.GLOCK });
  v.tone({ t: 0.32, type: 'sine', f: 110, f2: 55, gl: 0.3, a: 0.002, rel: 0.35, peak: 0.5 });
  return v.end;
}

export const EXTRA_SFX = {
  uiMove: fx(uiMove, 4, 0.025, 2.2),
  uiConfirm: fx(uiConfirm, 2, 0.05, 1.8),
  uiBack: fx(uiBack, 2, 0.05, 2.2),
  uiOpen: fx(uiOpen, 2, 0.08, 1.6),
  uiClose: fx(uiClose, 2, 0.08, 1.6),
  uiSlam: fx(uiSlam, 2, 0.1, 1.3),
  uiTick: fx(uiTick, 4, 0.02, 2.2),
  uiStart: fx(uiStart, 1, 0.5, 1.4),
};
