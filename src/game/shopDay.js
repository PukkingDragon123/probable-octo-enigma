// A day at Kodamaya: the gachapon loop.
//   - machines have stock (the capsule piles sink as they empty)
//   - Mamo fetches capsule bags from the toy box and pours them into machines
//   - customers wander in from the street, change money, pick a machine, put a
//     coin in, turn the crank; a capsule rolls out; they twist it open and react
//   - happy kids burst with Happiness: glowing konpeito stars that bounce on
//     the floor. Tap them, or swipe across them, and they fly into the jar.
//     Uncollected ones fade after a while.
//   - every play rings ¥200 into the register (its little green display)
// Everything is physical; the only numbers are on the register display.
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { makeFolk } from '../data/folk.js';
import { VoxelModel, vm, glowVm, signPlane, fill, ell, hash3, V25, V5 } from '../world/build.js';
import { PixCanvas } from '../core/pixtex.js';
import { FONT } from '../ui/fonts.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CAP_COLS = [0xff6a8a, 0x5ab8f0, 0xf8d040, 0x7ad860, 0xb88af0, 0xff9a4a];
const STAR_COLS = [0xff8ab8, 0xffe060, 0x8ae0ff, 0xb0f080, 0xd0a8ff, 0xffb070, 0xffffff];

// ---------------------------------------------------------------- little meshes
export function capsuleMesh(col) {
  const top = new VoxelModel(), bot = new VoxelModel();
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) {
    if (x * x + y * y + z * z > 10) continue;
    (y >= 0 ? top : bot).set(x, y, z, y >= 0 ? ((x + z) % 3 === 0 ? 0xffffff : 0xf0f6fa) : col);
  }
  const g = new THREE.Group();
  const t = vm(top, V25, [0.5, 0, 0.5]); const b = vm(bot, V25, [0.5, 0, 0.5]);
  g.add(t, b);
  g.userData.top = t; g.userData.bot = b;
  return g;
}
// the tiny toy inside: a little voxel figure in the series' colours
export function toyMesh(seed) {
  const v = new VoxelModel();
  const c = CAP_COLS[seed % CAP_COLS.length];
  ell(v, 0.5, 2, 0.5, 2.2, 2.2, 2, c);
  ell(v, 0.5, 5, 0.5, 2, 1.8, 1.8, 0xfff4e8);
  v.set(-1, 5, 2, 0x2a1828); v.set(1, 5, 2, 0x2a1828);
  v.set(-1, 7, 0, c); v.set(1, 7, 0, c);
  return vm(v, V25, [0.5, 0, 0.5]);
}
export function starMesh(col) {
  const v = new VoxelModel();
  // a chunky little konpeito star: core + spikes
  ell(v, 0.5, 0.5, 0.5, 1.6, 1.6, 1.6, col);
  for (const [x, y, z] of [[2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, 2], [0, 0, -2], [1, 1, 1], [-1, 1, -1]]) v.set(x, y, z, col);
  v.set(0, 1, 1, 0xffffff);
  return glowVm(v, V25, [0.5, 0.5, 0.5], { intensity: 1.35 });
}
// capsule bag Mamo carries from the toy box
function bagMesh() {
  const v = new VoxelModel();
  ell(v, 0.5, 4, 0.5, 4, 4.5, 3, (x, y, z) => (hash3(x, y, z) < 0.35 ? CAP_COLS[Math.floor(hash3(z, x, y) * CAP_COLS.length)] : 0xe8f0f4));
  fill(v, -1, 1, 8, 9, -1, 1, 0xd8a040);
  return vm(v, V25, [0.5, 0, 0.5]);
}
// the toy box (storage): a big wooden chest overflowing with capsule bags
export function toyBox() {
  const v = new VoxelModel();
  fill(v, -12, 11, 0, 13, -7, 6, (x, y, z) => (y === 13 || x === -12 || x === 11 || z === 6 && y % 5 === 0 ? 0x7a4e2c : (x + 40) % 4 === 0 ? 0x8a5a32 : 0x9a6a3c));
  fill(v, -13, 12, 14, 15, -8, -6, 0x6a4224); // lid propped open at the back
  fill(v, -12, 11, 16, 26, -9, -8, 0x8a5a32);
  for (let i = 0; i < 9; i++) ell(v, -8 + (i % 5) * 4 + 0.5, 15 + (i > 4 ? 2 : 0), -3 + (i % 3) * 3, 2.4, 2.4, 2.4, (x, y, z) => (hash3(x, y, z) < 0.4 ? CAP_COLS[(i + Math.floor(hash3(x, z, i) * 3)) % CAP_COLS.length] : 0xe8f0f4));
  fill(v, -3, 2, 6, 9, 7, 7, 0xe8c050); // brass plate
  const g = new THREE.Group(); g.add(vm(v, V5));
  const p = new PixCanvas(24, 8, 5001); p.rect(0, 0, 24, 8, '#e8c050'); p.text('ストック', 12, 0, { font: `7px ${FONT.tiny}`, color: '#3a2418', align: 'center' });
  const s = signPlane(p, 0.28); s.position.set(-0.025, 0.38, 7.2 * V5); g.add(s);
  return g;
}

// ---------------------------------------------------------------- the day
export class ShopDay {
  constructor(game, L, { jar, register } = {}) {
    this.g = game; this.L = L;
    this.machines = L.machines.filter((m) => !m.sheet || !m.sheet.visible);
    for (const m of this.machines) { m.stock = m.obj.userData.stock ?? 1; m.queue = null; m.series = Math.floor(hash3(m.x * 10, m.z * 10, 3) * 8); }
    this.jar = jar || L.jar;
    this.yen = 0;
    this.happiness = 0;
    this.stars = [];
    this.capsules = [];
    this.customers = [];
    this.spawnT = 3;
    this.open = false;
    this.served = 0;
    this.carrying = null; // capsule bag in Mamo's hands
    this.onEvent = null; // (name, data) hooks for the tutorial script
    this.t = 0;
    this.maxCustomers = 4;
  }
  emit(name, data) { this.onEvent?.(name, data); }
  // ------------------------------------------------ register + jar
  addYen(n) {
    this.yen += n;
    this.L.setYen?.(this.yen);
    this.g.audio?.play?.('coin', { volume: 0.35 });
  }
  addHappiness(n = 1) {
    this.happiness += n;
    const cap = this.jar.userData.capacity || 100;
    this.jar.userData.setFill?.(Math.min(1, this.happiness / cap));
    this.emit('happiness', this.happiness);
  }
  // ------------------------------------------------ stock
  setStock(m, k) { m.stock = Math.max(0, Math.min(1, k)); m.obj.userData.setStock(m.stock); }
  empty() { return this.machines.filter((m) => m.stock < 0.08); }
  // Mamo grabs a bag from the toy box
  async takeBag() {
    const P = this.g.player;
    if (this.carrying) return;
    P.play('pickup', { dur: 0.8 });
    await this.g.director.wait(0.4);
    this.carrying = bagMesh();
    P.hold(this.carrying, 'both');
    this.carrying.position.set(0, -0.28, 0.05);
    P.play('carry', { loop: true });
    this.g.audio?.play?.('capsuleBag', { volume: 0.5 });
    this.emit('bag');
  }
  async refill(m) {
    const P = this.g.player;
    if (!this.carrying) { this.g.bubbles.say(P, '(Need capsules from the stock box first.)', { kind: 'thought', silent: true, auto: 1.2 }); return; }
    P.stopAction();
    P.play('pour', { dur: 1.4 });
    this.g.audio?.play?.('capsulePour', { volume: 0.6 });
    const from = m.stock;
    await this.g.director.tween((k) => this.setStock(m, from + (1 - from) * k), 1.2);
    P.drop('both'); this.carrying = null;
    P.stopAction();
    this.g.particles?.emit('sparkle', { x: m.x, y: 1.0, z: m.z + 0.2, n: 6 });
    this.emit('refill', m);
  }
  // ------------------------------------------------ Happiness stars
  burst(c, n) {
    const head = c.headPos ? c.headPos(new THREE.Vector3()) : new THREE.Vector3(c.x, 1, c.z);
    for (let i = 0; i < n; i++) {
      const m = starMesh(pick(STAR_COLS));
      this.L.scene.add(m);
      const a = rnd(0, Math.PI * 2), sp = rnd(0.6, 1.4);
      const s = { m, x: head.x, y: head.y + 0.1, z: head.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp * 0.7 + 0.25, vy: rnd(2.2, 3.4), life: 0, state: 'fly', ph: rnd(0, 6), bounce: 0 };
      this.stars.push(s);
    }
    this.g.audio?.play?.('sparkle', { volume: 0.4 });
    this.emit('burst', { c, n });
  }
  collect(s) {
    if (s.state === 'collect' || s.state === 'gone') return;
    s.state = 'collect'; s.t = 0;
    s.from = new THREE.Vector3(s.x, s.y, s.z);
    this.g.audio?.play?.('pop', { volume: 0.3, pitch: 1.2 + Math.random() * 0.5 });
  }
  // screen-space pick: tap or swipe within r pixels of a star
  pickStars(cssX, cssY, r = 34) {
    const rig = this.g.rig, R = this.g.renderer;
    const out = this._sp || (this._sp = { x: 0, y: 0 });
    let hit = 0;
    for (const s of this.stars) {
      if (s.state === 'collect' || s.state === 'gone') continue;
      rig.worldToScreen(s.m.position, R, out);
      if (Math.hypot(out.x - cssX, out.y - cssY) < r) { this.collect(s); hit++; }
    }
    return hit;
  }
  // ------------------------------------------------ customers
  spawnCustomer(o = {}) {
    const L = this.L;
    const role = o.role || pick(['kid', 'kid', 'kid', 'student', 'shopper']);
    const def = makeFolk(Math.floor(Math.random() * 1e6), role);
    const c = new Character(def);
    L.add(c);
    const x = o.x ?? rnd(-1.5, 1.5);
    c.setPos(x, 3.6); c.faceNow(Math.PI);
    const cu = { c, role, state: 'enter', plays: o.plays ?? (role === 'kid' ? 1 + Math.floor(Math.random() * 2) : 1), t: 0, mood: 0 };
    this.customers.push(cu);
    this.think(cu);
    return cu;
  }
  async think(cu) {
    const c = cu.c, L = this.L, D = this.g.director;
    try {
      await c.walkTo(c.x, 2.3, { nav: null });
      while (cu.plays > 0) {
        // pick a stocked machine nobody is using (favourite colours first)
        const free = this.machines.filter((m) => !m.queue && m.stock > 0.08);
        const any = this.machines.filter((m) => !m.queue);
        const m = free.length ? pick(free) : any.length ? pick(any) : null;
        if (!m) { await D.wait(1.0); continue; }
        m.queue = cu;
        await c.walkTo(m.x, m.z + 0.48, { nav: L.nav });
        c.faceYaw(Math.PI);
        await D.wait(0.3);
        if (m.stock < 0.08) {
          // empty! a sad little look, maybe try another
          c.setExpr('sad'); this.g.emotes?.show(c, 'sweat');
          this.emit('empty', { m, cu });
          await D.wait(1.4);
          m.queue = null;
          cu.plays--; cu.mood -= 1;
          continue;
        }
        c.play('insertCoin', { onInsert: () => this.addYen(200) });
        await D.wait(0.8);
        c.play('crank', { turns: 1, dur: 1.4, onClick: () => this.g.audio?.play?.('crankTick', { volume: 0.4 }) });
        this.emit('crank', { m, cu });
        await D.wait(1.4);
        // the capsule tumbles into the tray
        const col = pick(CAP_COLS);
        const cap = capsuleMesh(col);
        const tray = m.obj.userData.tray;
        L.scene.add(cap);
        cap.position.set(m.x + tray.x, tray.y + 0.25, m.z + tray.z + 0.02);
        this.g.audio?.play?.('capsuleDrop', { volume: 0.5 });
        await D.tween((k) => { cap.position.y = tray.y + 0.25 * (1 - k) + Math.abs(Math.sin(k * 9)) * 0.03 * (1 - k); cap.rotation.z = k * 4; }, 0.5, (x) => x);
        this.setStock(m, m.stock - 1 / 18);
        m.queue = null;
        c.play('pickup', { dur: 0.8 });
        await D.wait(0.4);
        L.scene.remove(cap);
        c.hold(cap, 'R'); cap.position.set(0, -0.02, 0.05); cap.rotation.set(0, 0, 0);
        await c.walkTo(m.x + rnd(-0.4, 0.4), m.z + 0.95, { nav: L.nav });
        c.faceYaw(rnd(-0.4, 0.4));
        // twist it open
        let toy = null;
        c.play('openCapsule', { onPop: () => {
          this.g.audio?.play?.('capsulePop', { volume: 0.55 });
          cap.userData.top.position.y = 0.06; cap.userData.top.rotation.z = 0.8;
          toy = toyMesh(m.series + Math.floor(Math.random() * 3));
          L.scene.add(toy);
          const hp = c.headPos(new THREE.Vector3());
          toy.position.set(hp.x, hp.y + 0.05, hp.z + 0.1);
        } });
        await D.wait(1.7);
        // the reaction: most are happy, some ecstatic (rare!), a few meh
        const roll = Math.random();
        const rare = roll < 0.15, meh = roll > 0.85;
        if (meh) { c.setExpr('pout'); this.g.emotes?.show(c, 'dots'); }
        else { c.setExpr(rare ? 'excited' : 'happy'); this.g.emotes?.show(c, rare ? 'bigheart' : 'heart'); c.play(rare ? 'jump' : 'cheer'); }
        if (!meh) this.burst(c, rare ? 6 : 2 + Math.floor(Math.random() * 3));
        cu.mood += meh ? 0 : 1;
        this.served++;
        this.emit('opened', { m, cu, rare, meh });
        await D.wait(1.6);
        if (toy) L.scene.remove(toy);
        c.drop('R');
        cu.plays--;
      }
      // leave
      c.setExpr(cu.mood > 0 ? 'smile' : 'sad');
      if (cu.mood > 0 && Math.random() < 0.5) { c.faceYaw(0); c.play('wave'); await D.wait(0.8); }
      await c.walkTo(rnd(-1.8, 1.8), 2.6, { nav: L.nav });
      await c.walkTo(c.x, 3.8, { nav: null });
    } catch (e) { console.warn('customer', e); }
    L.remove(c);
    this.customers = this.customers.filter((q) => q !== cu);
  }
  // ------------------------------------------------ frame
  update(dt) {
    this.t += dt;
    if (this.open && this.customers.length < this.maxCustomers) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = rnd(5, 10); this.spawnCustomer(); }
    }
    const jp = this.jar.getWorldPosition(this._jp || (this._jp = new THREE.Vector3()));
    for (const s of this.stars) {
      s.life += dt;
      if (s.state === 'fly') {
        s.vy -= 9 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        if (s.y < 0.07) { s.y = 0.07; s.vy = -s.vy * 0.45; s.vx *= 0.6; s.vz *= 0.6; if (++s.bounce > 2) s.state = 'rest'; }
        s.m.rotation.y += dt * 6;
      } else if (s.state === 'rest') {
        s.m.rotation.y += dt * 2;
        s.y = 0.1 + Math.abs(Math.sin(this.t * 2.4 + s.ph)) * 0.05;
        if (s.life > 14) { s.state = 'fade'; s.t = 0; }
      } else if (s.state === 'fade') {
        s.t += dt; s.m.scale.setScalar(Math.max(0.01, 1 - s.t)); if (s.t >= 1) s.state = 'gone';
      } else if (s.state === 'collect') {
        s.t += dt * 1.6;
        const k = Math.min(1, s.t), e = k * k * (3 - 2 * k);
        s.x = s.from.x + (jp.x - s.from.x) * e; s.z = s.from.z + (jp.z - s.from.z) * e;
        s.y = s.from.y + (jp.y + 0.2 - s.from.y) * e + Math.sin(k * Math.PI) * 0.8;
        s.m.scale.setScalar(1 - k * 0.5);
        if (k >= 1) { s.state = 'gone'; this.addHappiness(1); this.g.particles?.emit('sparkle', { x: jp.x, y: jp.y + 0.2, z: jp.z, n: 2 }); }
      }
      if (s.state === 'gone') { this.L.scene.remove(s.m); continue; }
      s.m.position.set(s.x, s.y, s.z);
    }
    this.stars = this.stars.filter((s) => s.state !== 'gone');
  }
  waiting() { return this.stars.filter((s) => s.state === 'rest' || s.state === 'fly'); }
}
