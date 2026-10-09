// Save state: everything that persists between sessions.
const KEY = 'kodamaya.save.v1';

export function newState() {
  return {
    version: 1,
    chapter: 'train', // story progress marker
    flags: {},
    day: 0, // 0 = arrival day
    hour: 14.5,
    clockRunning: false,
    clockSpeed: 1 / 30, // game hours per real second
    yen: 3200,
    happiness: 0,
    jar: { tier: 0, amount: 0 },
    coins: 0, // gacha coins in the exchange machine float
    machines: [], // [{ slot, series, fill }]
    inventory: {}, // item -> count
    collection: {}, // seriesId -> { variantId: count }
    capsules: {}, // seriesId -> stock count in storage
    spirit: { unlocked: ['home'], dust: 0, hokori: 0, tea: {}, plots: {}, knowledge: [] },
    rel: { yuki: 0, mio: 0, kanako: 0, bendo: 0, genzo: 0, tarobo: 0, kappei: 0 },
    quests: [],
    clean: {}, // cleaned mess ids
    settings: { volume: 0.8, music: 0.7, pixel: 1 },
  };
}
export function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return { ...newState(), ...s };
  } catch { return null; }
}
export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* */ } }
