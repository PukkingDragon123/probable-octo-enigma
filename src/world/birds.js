// Ambient birds from The Bear Must Eat's pixel bird sprites: sparrows and
// doves that peck, hop and look around on the ground, scatter into the air
// when someone walks close, circle and land again; swallows that dart in
// loops under a roof. One sprite batch for all of them.
import { natureBatch, natureFrames, NATURE_TPU } from '../art/nature.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export class Birds {
  constructor(scene, { max = 64 } = {}) {
    this.batch = natureBatch({ max, castShadow: false });
    this.batch.mesh.renderOrder = 2;
    scene.add(this.batch.mesh);
    this.list = [];
    this.t = 0;
  }
  // kind: 'sparrow' | 'dove' | 'crow' ; area: { x0, x1, z0, z1, y }
  addGround(kind, x, z, area, o = {}) {
    const b = { kind, x, z, y: area.y ?? 0, area, state: 'idle', st: rnd(0, 2), frame: 0, ft: 0, flip: Math.random() < 0.5, vx: 0, vy: 0, vz: 0, scale: o.scale ?? 1 };
    b.i = this.batch.push(`${kind}_idle#0`, x, b.y, z, { scale: b.scale, flip: b.flip });
    this.list.push(b);
    return b;
  }
  // a swallow looping around a centre point (under a roof beam)
  addFlyer(kind, cx, cy, cz, r = 2.5) {
    const b = { kind, flyer: true, cx, cy, cz, r, a: rnd(0, 6.28), sp: rnd(1.2, 1.9), x: cx, y: cy, z: cz, frame: 0, ft: 0 };
    b.i = this.batch.push(`${kind}_fly#0`, cx, cy, cz, { mode: 2, scale: 0.32 });
    this.list.push(b);
    return b;
  }
  update(dt, pushers = []) {
    this.t += dt;
    const B = this.batch;
    for (const b of this.list) {
      b.ft += dt;
      if (b.flyer) {
        b.a += dt * b.sp;
        const wob = Math.sin(this.t * 1.7 + b.cx) * 0.5;
        b.x = b.cx + Math.cos(b.a) * b.r; b.z = b.cz + Math.sin(b.a) * b.r * 0.45; b.y = b.cy + Math.sin(b.a * 2) * 0.35 + wob * 0.2;
        const fr = natureFrames(`${b.kind}_fly`);
        if (b.ft > 0.07) { b.ft = 0; b.frame = (b.frame + 1) % Math.max(1, fr.length); B.setFrame(b.i, `${b.kind}_fly#${b.frame}`); }
        B.setFlip(b.i, Math.sin(b.a) > 0);
        B.setPos(b.i, b.x, b.y, b.z);
        continue;
      }
      // scared by anyone close?
      if (b.state !== 'fly') {
        for (const p of pushers) {
          const dx = b.x - p.x, dz = b.z - p.z;
          if (dx * dx + dz * dz < 1.1) { b.state = 'fly'; b.st = rnd(2.5, 4.5); const d = Math.hypot(dx, dz) || 1; b.vx = (dx / d) * 2.4; b.vz = (dz / d) * 1.4; b.vy = 2.8; b.flip = b.vx < 0; break; }
        }
      }
      b.st -= dt;
      if (b.state === 'fly') {
        b.vy -= dt * 1.6; if (b.vy < 0.4 && b.st > 1) b.vy = 0.4;
        b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
        b.vx += (((b.area.x0 + b.area.x1) / 2 - b.x) * 0.25 - b.vx * 0.2) * dt;
        const fr = natureFrames(`${b.kind}_fly`);
        if (b.ft > 0.08) { b.ft = 0; b.frame = (b.frame + 1) % Math.max(1, fr.length); B.setFrame(b.i, `${b.kind}_fly#${b.frame}`); }
        if (b.st <= 0) {
          // land somewhere in the area
          if (!b.landing) { b.landing = { x: rnd(b.area.x0, b.area.x1), z: rnd(b.area.z0, b.area.z1) }; }
          const L = b.landing;
          b.x += (L.x - b.x) * Math.min(1, dt * 1.5); b.z += (L.z - b.z) * Math.min(1, dt * 1.5);
          b.y += ((b.area.y ?? 0) - b.y) * Math.min(1, dt * 2.5);
          b.flip = L.x < b.x;
          if (Math.abs(b.y - (b.area.y ?? 0)) < 0.03) { b.y = b.area.y ?? 0; b.state = 'idle'; b.st = rnd(1, 3); b.landing = null; }
        }
      } else if (b.state === 'idle' || b.state === 'peck') {
        const anim = b.state;
        const fr = natureFrames(`${b.kind}_${anim}`);
        if (b.ft > (anim === 'peck' ? 0.12 : 0.4)) { b.ft = 0; b.frame = (b.frame + 1) % Math.max(1, fr.length); B.setFrame(b.i, `${b.kind}_${anim}#${b.frame}`); }
        if (b.st <= 0) {
          const r = Math.random();
          if (r < 0.45) { b.state = 'peck'; b.st = rnd(0.8, 2.2); }
          else if (r < 0.85) { b.state = 'hop'; b.st = rnd(0.3, 0.9); b.flip = Math.random() < 0.5; b.hx = b.flip ? -1 : 1; }
          else { b.state = 'idle'; b.st = rnd(1, 3); }
          b.frame = 0;
        }
      } else if (b.state === 'hop') {
        const fr = natureFrames(`${b.kind}_hop`);
        if (b.ft > 0.09) { b.ft = 0; b.frame = (b.frame + 1) % Math.max(1, fr.length); B.setFrame(b.i, `${b.kind}_hop#${b.frame}`); }
        b.x = Math.min(b.area.x1, Math.max(b.area.x0, b.x + b.hx * dt * 0.5));
        b.z += Math.sin(this.t * 3 + b.x) * dt * 0.1;
        if (b.st <= 0) { b.state = 'idle'; b.st = rnd(0.6, 2); b.frame = 0; }
      }
      B.setFlip(b.i, b.flip);
      B.setPos(b.i, b.x, b.y + (b.state === 'hop' ? Math.abs(Math.sin(this.t * 14)) * 0.03 : 0), b.z);
    }
    B.commit();
  }
}
