// Ambient crowds: background folk with small behaviours so a place feels
// packed and alive. Each person is a Character built from the folk generator
// (or any definition) plus a behaviour:
//   stand  - idle at a spot (phone / hands behind back / looking around)
//   queue  - waiting in a boarding line, shuffling, glancing at the board
//   sit    - on a bench or seat
//   chat   - in a group facing its centre; members take turns talking, with
//            mouth flaps, head bobs, gestures and the odd emote
//   walk   - strolls a loop of waypoints with pauses (luggage in hand)
//   kid    - orbits a parent, hops, points
//   eat    - at a counter slurping
//   photo  - holds a phone up at a target
//   still  - no behaviour (scripted by a cutscene)
import * as THREE from 'three';
import { Character } from '../entities/rig.js';
import { makeFolk } from '../data/folk.js';
import { suitcase, briefcase, shoppingBag, backpack, duffel } from './props.js';
import { phoneMesh } from '../entities/parts.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const LUGGAGE_COLS = [0xc84a3a, 0x3a6ab0, 0x4a4a5a, 0x2e8a6a, 0xd8a03a, 0x8a5ac8, 0xe8e0d0];

export class Crowd {
  constructor(game, location) {
    this.g = game;
    this.L = location;
    this.people = [];
    this.groups = [];
    this.t = 0;
  }
  // spawn one person: def (or { seed, role }), position, behaviour
  add(defOrSeed, o = {}) {
    const def = typeof defOrSeed === 'object' && defOrSeed.species ? defOrSeed : makeFolk(defOrSeed?.seed ?? defOrSeed ?? Math.floor(Math.random() * 1e6), defOrSeed?.role ?? o.role);
    const c = new Character(def);
    this.L.add(c);
    c.setPos(o.x ?? 0, o.z ?? 0, o.y ?? 0);
    c.faceNow(o.yaw ?? 0);
    c.idleT = rnd(1, 8);
    const p = { c, mode: o.mode || 'stand', home: { x: o.x ?? 0, z: o.z ?? 0, yaw: o.yaw ?? 0 }, t: rnd(0, 5), o, prop: null };
    if (o.prop !== false) this.equip(p, o.prop ?? def.prop);
    this.setMode(p, p.mode, o);
    this.people.push(p);
    return p;
  }
  equip(p, kind) {
    const c = p.c;
    if (!kind) return;
    let obj = null, where = 'R';
    switch (kind) {
      case 'briefcase': obj = briefcase(); break;
      case 'suitcase': obj = suitcase(pick(LUGGAGE_COLS)); obj.scale.setScalar(0.85); where = 'L'; break;
      case 'shoppingBag': obj = shoppingBag(pick([0xf4f0e8, 0xe8d8b8, 0xd8e8f0]), pick([0xe8443a, 0x2a8a5a, 0x3a6ab0])); break;
      case 'duffel': obj = duffel(pick(LUGGAGE_COLS)); break;
      case 'backpack': {
        obj = backpack(pick([0x4a7a5a, 0x3a5a8a, 0xc84a3a, 0x2a2a34, 0xe8a03a]));
        obj.position.set(0, 0.2, -0.22);
        c.j.spine.add(obj);
        p.prop = obj;
        return;
      }
      case 'phone': obj = phoneMesh(); break;
      default: return;
    }
    c.hold(obj, where);
    if (kind === 'suitcase') { obj.position.set(0, -0.04, 0.05); }
    p.prop = obj; p.propKind = kind;
  }
  setMode(p, mode, o = {}) {
    const c = p.c;
    p.mode = mode;
    c.stopAction();
    c.setPose('stand');
    if (mode === 'sit') { c.setPose('sit'); c.idleT = 999; if (o.seatY != null) c.y = o.seatY - c.dims.hipY * 0.05 * c.scale + 0.03; else if (o.y != null) c.y = o.y; if (o.act) { if (o.act === 'phone' && !c.held.R) c.hold(phoneMesh(), 'R'); c.play(o.act, { loop: true }); } }
    else if (mode === 'queue') { c.idleT = rnd(3, 9); if (o.act) { if (o.act === 'phone' && !c.held.R) c.hold(phoneMesh(), 'R'); c.play(o.act, { loop: true }); c.idleT = 999; } }
    else if (mode === 'eat') { c.play('eat', { loop: true }); c.setExpr('delicious', { react: false }); c.idleT = 999; }
    else if (mode === 'photo') { if (!c.held.R) c.hold(phoneMesh(), 'R'); c.play('phone', { loop: true }); c.idleT = 999; }
    else if (mode === 'stand' && o.act) { if (o.act === 'phone' && !c.held.R) c.hold(phoneMesh(), 'R'); c.play(o.act, { loop: true }); c.idleT = 999; }
    if (o.expr) c.setExpr(o.expr, { react: false });
    if (mode === 'walk') { p.path = o.path || [{ x: p.home.x, z: p.home.z }]; p.wi = o.start ?? 0; p.pause = rnd(0, 2); }
    if (mode === 'kid') { p.parent = o.parent; p.ang = rnd(0, 6.28); }
  }
  // a chatting group: people in a ring facing the centre
  group(defs, { x, z, r = 0.55, a0 = 0, mood = 'happy' } = {}) {
    const members = defs.map((d, i) => {
      const a = a0 + (i / defs.length) * Math.PI * 2;
      const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      const p = this.add(d, { x: px, z: pz, yaw: Math.atan2(x - px, z - pz), mode: 'chat', prop: d.prop });
      return p;
    });
    const G = { members, speaker: 0, t: 0, next: rnd(1.5, 3.5), mood };
    for (const m of members) m.group = G;
    this.groups.push(G);
    return G;
  }
  // make room around a spot (cutscenes): standing / walking folk inside r drift
  // out to the edge of the circle and wait there; seated and scripted ones stay
  clearAround(x, z, r = 2, nav = null) {
    for (const p of this.people) {
      if (p.mode === 'sit' || p.mode === 'eat' || p.mode === 'still') continue;
      const dx = p.c.x - x, dz = p.c.z - z, d = Math.hypot(dx, dz);
      if (d > r) continue;
      const k = (r + 0.4) / (d || 1);
      p.mode = 'stand'; p.home = { x: x + dx * k, z: z + dz * k, yaw: Math.atan2(x - p.c.x, z - p.c.z) };
      p.c.walkTo(p.home.x, p.home.z, { nav }).then(() => p.c.faceYaw(p.home.yaw));
    }
  }
  // keep walkers out of a circle (a cutscene's stage): their loops turn back at
  // its edge instead of passing through. keepOut(null) lifts it.
  keepOut(x, z, r = 2) {
    this.keep = x == null ? null : { x, z, r };
    if (!this.keep) return;
    for (const p of this.people) {
      if (p.mode !== 'walk' || !p.c.moving || !p.cur) continue;
      const hit = this.edgeHit(p.c.x, p.c.z, p.cur.x, p.cur.z);
      if (hit) { p.cur = hit; p.c.walkTo(hit.x, hit.z, { nav: p.o.nav ?? null }); }
    }
  }
  // first point on the segment a->b just outside the keep-out circle, or null
  edgeHit(ax, az, bx, bz) {
    const K = this.keep;
    if (!K || Math.hypot(ax - K.x, az - K.z) < K.r) return null; // already inside: let them leave
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.2));
    let px = ax, pz = az;
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
      if (Math.hypot(x - K.x, z - K.z) < K.r) return { x: px, z: pz, pause: 0.3 };
      px = x; pz = z;
    }
    return null;
  }
  remove(p) { this.L.remove(p.c); this.people = this.people.filter((q) => q !== p); }
  clear() { for (const p of this.people) this.L.remove(p.c); this.people = []; this.groups = []; }

  update(dt) {
    this.t += dt;
    // chatting groups: turns, mouth flaps, gestures, reactions
    for (const G of this.groups) {
      G.t += dt;
      const sp = G.members[G.speaker];
      if (sp && G.t < G.next) {
        sp.talkT = (sp.talkT || 0) - dt;
        if (sp.talkT <= 0) { sp.talkT = 0.09 + Math.random() * 0.08; sp.c.talk(pick(['a', 'e', 'o', 'i', 'm', 'u', 'k'])); }
      } else {
        // turn over: a listener reacts, the next one speaks
        G.t = 0; G.next = rnd(1.8, 4.2);
        const prev = G.speaker;
        G.speaker = (G.speaker + 1 + Math.floor(Math.random() * Math.max(1, G.members.length - 1))) % G.members.length;
        const s = G.members[G.speaker];
        if (s && Math.random() < 0.55) s.c.play(pick(['point', 'nod', 'shrug', 'headTilt', 'clap', 'scratchHead']));
        for (const m of G.members) if (m !== s) m.c.lookAt(s.c.root, 0.8);
        if (s) s.c.lookAt(G.members[prev]?.c.root || null, 0.7);
        if (Math.random() < 0.35) {
          const who = pick(G.members);
          const e = pick(['note', 'heart', 'sweat', 'dots', 'idea', 'excl']);
          this.g.emotes?.show(who.c, e);
          if (e === 'heart' || e === 'note') who.c.setExpr('happy', { react: false });
          else if (e === 'sweat') who.c.setExpr('awkward', { react: false });
          setTimeout(() => who.c.setExpr(G.mood === 'happy' ? 'smile' : 'neutral', { react: false }), 1800);
        }
      }
    }
    for (const p of this.people) {
      const c = p.c;
      p.t += dt;
      switch (p.mode) {
        case 'queue':
        case 'stand': {
          // little glances and weight shifts are the rig's idles; occasionally turn a bit
          if (p.t > 6 + (p.o.calm ? 6 : 0) && !c.moving && !p.o.act) {
            p.t = rnd(0, 3);
            if (Math.random() < 0.5) c.faceYaw(p.home.yaw + rnd(-0.6, 0.6));
            if (Math.random() < 0.15) this.g.emotes?.show(c, pick(['dots', 'note', 'zzz']));
          }
          break;
        }
        case 'walk': {
          if (c.moving) break;
          p.pause -= dt;
          if (p.pause > 0) break;
          let w = p.path[p.wi % p.path.length];
          p.wi++;
          w = this.edgeHit(c.x, c.z, w.x, w.z) || w;
          p.cur = w;
          p.pause = w.pause ?? rnd(0.2, 2.5);
          if (Math.hypot(w.x - c.x, w.z - c.z) < 0.05) break;
          c.walkTo(w.x, w.z, { nav: p.o.nav ?? null }).then(() => { if (w.yaw != null) c.faceYaw(w.yaw); if (w.act) c.play(w.act); });
          break;
        }
        case 'kid': {
          const par = p.parent?.c;
          if (!par || c.moving) break;
          p.pause = (p.pause ?? 0) - dt;
          if (p.pause > 0) break;
          p.ang += rnd(0.8, 2.2);
          const r = rnd(0.6, 1.3);
          c.walkTo(par.x + Math.sin(p.ang) * r, par.z + Math.cos(p.ang) * r, { run: Math.random() < 0.6 }).then(() => {
            c.faceTo(par.x, par.z);
            if (Math.random() < 0.4) c.play(pick(['jump', 'point', 'wave', 'cheer']));
          });
          p.pause = rnd(0.8, 2.8);
          break;
        }
        default: break;
      }
    }
  }
}
