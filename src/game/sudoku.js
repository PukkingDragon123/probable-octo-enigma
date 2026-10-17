// A 6x6 sudoku (boxes of 2 rows x 3 columns): a shuffled valid grid with
// cells removed while the solution stays unique.
//   const P = makeSudoku(seed, 15)  -> { grid: [36] (0 = empty), solution: [36] }
const N = 6;
function rngOf(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const boxOf = (i) => Math.floor(Math.floor(i / N) / 2) * 2 + Math.floor((i % N) / 3);
export function peers(i) {
  const r = Math.floor(i / N), c = i % N, b = boxOf(i), out = [];
  for (let j = 0; j < N * N; j++) if (j !== i && (Math.floor(j / N) === r || j % N === c || boxOf(j) === b)) out.push(j);
  return out;
}
const PEERS = Array.from({ length: N * N }, (_, i) => peers(i));
function countSolutions(g, limit = 2) {
  const i = g.indexOf(0);
  if (i < 0) return 1;
  let n = 0;
  for (let v = 1; v <= N; v++) {
    if (PEERS[i].some((j) => g[j] === v)) continue;
    g[i] = v;
    n += countSolutions(g, limit);
    g[i] = 0;
    if (n >= limit) break;
  }
  return n;
}
export function makeSudoku(seed = 1, givens = 15) {
  const r = rngOf(seed);
  // base pattern, then shuffle digits, rows within bands, bands, columns within stacks, stacks
  const digits = shuffle([1, 2, 3, 4, 5, 6], r);
  const bands = shuffle([0, 1, 2], r).flatMap((b) => shuffle([0, 1], r).map((k) => b * 2 + k));
  const stacks = shuffle([0, 1], r).flatMap((s) => shuffle([0, 1, 2], r).map((k) => s * 3 + k));
  const sol = [];
  for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
    const R = bands[rr], C = stacks[cc];
    sol.push(digits[(3 * (R % 2) + Math.floor(R / 2) + C) % N]);
  }
  const grid = sol.slice();
  const order = shuffle([...Array(N * N).keys()], r);
  let filled = N * N;
  for (const i of order) {
    if (filled <= givens) break;
    const keep = grid[i];
    grid[i] = 0;
    if (countSolutions(grid.slice()) !== 1) grid[i] = keep; else filled--;
  }
  return { grid, solution: sol };
}
// which units (rows / cols / boxes) cell i completes, given the current grid
export function completedUnits(g, i) {
  const r = Math.floor(i / N), c = i % N, b = boxOf(i), out = [];
  const full = (idx) => idx.every((j) => g[j]);
  const row = [...Array(N).keys()].map((k) => r * N + k), col = [...Array(N).keys()].map((k) => k * N + c);
  const box = [...Array(N * N).keys()].filter((j) => boxOf(j) === b);
  if (full(row)) out.push(row); if (full(col)) out.push(col); if (full(box)) out.push(box);
  return out;
}
