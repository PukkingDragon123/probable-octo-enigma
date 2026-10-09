// Grid navigation: a walkable mask over a rectangle of the floor, A* with
// diagonal moves (no corner cutting) and line-of-sight path smoothing.
// Each walkable area (a room, a floor of a building, a street) has its own grid.
export class NavGrid {
  constructor({ minX = 0, minZ = 0, w = 10, d = 10, cell = 0.25, y = 0 } = {}) {
    this.minX = minX; this.minZ = minZ; this.cell = cell; this.y = y;
    this.nx = Math.max(1, Math.ceil(w / cell));
    this.nz = Math.max(1, Math.ceil(d / cell));
    this.walk = new Uint8Array(this.nx * this.nz).fill(1);
    this.cost = new Float32Array(this.nx * this.nz).fill(1);
  }
  ix(x) { return Math.floor((x - this.minX) / this.cell); }
  iz(z) { return Math.floor((z - this.minZ) / this.cell); }
  cx(i) { return this.minX + (i + 0.5) * this.cell; }
  cz(j) { return this.minZ + (j + 0.5) * this.cell; }
  inb(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz; }
  ok(i, j) { return this.inb(i, j) && this.walk[j * this.nx + i] === 1; }
  okXZ(x, z) { return this.ok(this.ix(x), this.iz(z)); }
  // block / unblock an axis-aligned rect (world units), optional padding
  setRect(x0, z0, x1, z1, v = 0, pad = 0) {
    const i0 = this.ix(Math.min(x0, x1) - pad), i1 = this.ix(Math.max(x0, x1) + pad - 1e-6);
    const j0 = this.iz(Math.min(z0, z1) - pad), j1 = this.iz(Math.max(z0, z1) + pad - 1e-6);
    for (let j = Math.max(0, j0); j <= Math.min(this.nz - 1, j1); j++)
      for (let i = Math.max(0, i0); i <= Math.min(this.nx - 1, i1); i++) this.walk[j * this.nx + i] = v;
    return this;
  }
  block(x0, z0, x1, z1, pad = 0) { return this.setRect(x0, z0, x1, z1, 0, pad); }
  open(x0, z0, x1, z1) { return this.setRect(x0, z0, x1, z1, 1, 0); }
  blockCircle(x, z, r) {
    for (let j = this.iz(z - r); j <= this.iz(z + r); j++)
      for (let i = this.ix(x - r); i <= this.ix(x + r); i++) {
        if (!this.inb(i, j)) continue;
        if (Math.hypot(this.cx(i) - x, this.cz(j) - z) <= r) this.walk[j * this.nx + i] = 0;
      }
    return this;
  }
  // rotated rect (centre, half sizes, yaw)
  blockOBB(x, z, hw, hd, yaw, pad = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), R = Math.hypot(hw, hd) + pad;
    for (let j = this.iz(z - R); j <= this.iz(z + R); j++)
      for (let i = this.ix(x - R); i <= this.ix(x + R); i++) {
        if (!this.inb(i, j)) continue;
        const dx = this.cx(i) - x, dz = this.cz(j) - z;
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) <= hw + pad && Math.abs(lz) <= hd + pad) this.walk[j * this.nx + i] = 0;
      }
    return this;
  }
  nearest(x, z, maxR = 40) {
    const i0 = this.ix(x), j0 = this.iz(z);
    if (this.ok(i0, j0)) return { x, z };
    for (let r = 1; r < maxR; r++) {
      let best = null, bd = Infinity;
      for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || !this.ok(i, j)) continue;
        const d = Math.hypot(this.cx(i) - x, this.cz(j) - z);
        if (d < bd) { bd = d; best = { x: this.cx(i), z: this.cz(j) }; }
      }
      if (best) return best;
    }
    return null;
  }
  // straight walkable line between two points (supercover-ish sampling)
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / (this.cell * 0.35)) + 1;
    const r = this.cell * 0.3; // a little body width
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (!this.okXZ(x, z) || !this.okXZ(x + r, z) || !this.okXZ(x - r, z) || !this.okXZ(x, z + r) || !this.okXZ(x, z - r)) return false;
    }
    return true;
  }
  path(ax, az, bx, bz) {
    const s = this.nearest(ax, az), g = this.nearest(bx, bz);
    if (!s || !g) return null;
    if (this.los(s.x, s.z, g.x, g.z)) return [{ x: g.x, z: g.z }];
    const nx = this.nx, N = nx * this.nz;
    const si = this.ix(s.x) + this.iz(s.z) * nx, gi = this.ix(g.x) + this.iz(g.z) * nx;
    const gS = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    // binary heap of [f, idx]
    const heap = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const gx = gi % nx, gz = (gi / nx) | 0;
    const h = (i) => { const x = i % nx, z = (i / nx) | 0, dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    gS[si] = 0; push(h(si), si);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false, guard = 0;
    while (heap.length && guard++ < 60000) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      if (cur === gi) { found = true; break; }
      closed[cur] = 1;
      const cx = cur % nx, cz = (cur / nx) | 0;
      for (const [dx, dz, w] of D) {
        const x = cx + dx, z = cz + dz;
        if (!this.ok(x, z)) continue;
        if (dx && dz && (!this.ok(cx + dx, cz) || !this.ok(cx, cz + dz))) continue;
        const ni = z * nx + x;
        if (closed[ni]) continue;
        const ng = gS[cur] + w * this.cost[ni];
        if (ng < gS[ni]) { gS[ni] = ng; from[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = gi; c !== -1 && c !== si; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: this.cx(c % nx), z: this.cz((c / nx) | 0) }));
    if (pts.length) pts[pts.length - 1] = { x: g.x, z: g.z };
    // string pulling
    const out = [];
    let ax0 = s.x, az0 = s.z, k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (this.los(ax0, az0, pts[m].x, pts[m].z)) { far = m; break; }
      out.push(pts[far]);
      ax0 = pts[far].x; az0 = pts[far].z;
      k = far + 1;
    }
    return out;
  }
  // debug: ascii dump
  dump() {
    let s = '';
    for (let j = 0; j < this.nz; j++) { for (let i = 0; i < this.nx; i++) s += this.walk[j * this.nx + i] ? '.' : '#'; s += '\n'; }
    return s;
  }
}
