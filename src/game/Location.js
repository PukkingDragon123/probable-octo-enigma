// A Location is one playable place (train car, station, street, shop
// interior, Spirit Realm...). It owns a THREE.Scene, navigation grids, the
// characters standing in it and its interactables. The Game swaps locations
// with transitions; the player character moves between them.
import * as THREE from 'three';
import { NavGrid } from '../core/nav.js';

const _ray = new THREE.Raycaster();
const _v = new THREE.Vector3();

export class Location {
  constructor(game, id, o = {}) {
    this.game = game;
    this.id = id;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(o.bg ?? 0x1b1420);
    this.lightMode = o.lightMode || 'human';
    this.grade = o.grade || 'human';
    this.music = o.music ?? null;
    this.ambience = o.ambience ?? null;
    this.chars = new Set();
    this.navs = {}; // name -> NavGrid
    this.nav = null; // current walkable grid for the player
    this.interactables = [];
    this.built = false;
    this.camCfg = { wupp: 0.0125, pitch: 38, yaw: 0, follow: true, bounds: null };
    this.shadowSize = 12;
    this.clock = o.clock ?? true; // does game time run here
    this.groundY = 0;
  }
  // override: create everything (called once, lazily)
  async build() {}
  // override: called after the location becomes active
  async enter(opts = {}) {}
  exit() {}
  update(dt, t) {}
  // characters
  add(c) { this.chars.add(c); this.scene.add(c.root); return c; }
  remove(c) { this.chars.delete(c); if (c.root.parent === this.scene) this.scene.remove(c.root); }
  // interactables: { id, obj, use: {x,z,yaw}|fn, label, enabled(): bool, onUse(game): Promise, hint: bool|fn, radius }
  addInteract(it) { this.interactables.push({ enabled: () => true, ...it }); return it; }
  removeInteract(id) { this.interactables = this.interactables.filter((i) => i.id !== id); }
  getInteract(id) { return this.interactables.find((i) => i.id === id); }
  // pick the closest enabled interactable under a screen point
  pick(cssX, cssY) {
    const g = this.game;
    const ray = g.rig.screenRay(cssX, cssY, g.renderer);
    _ray.ray.copy(ray);
    _ray.near = 0; _ray.far = 1000;
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      if (!it.obj || !it.enabled()) continue;
      if (it.obj.visible === false) continue;
      const hits = _ray.intersectObject(it.obj, true);
      for (const h of hits) {
        if (!h.object.visible) continue;
        if (h.distance < bd) { bd = h.distance; best = it; }
        break;
      }
    }
    // characters with talk handlers
    for (const c of this.chars) {
      if (!c.onTalk || c === g.player) continue;
      const hits = _ray.intersectObject(c.root, true);
      if (hits.length && hits[0].distance < bd) { bd = hits[0].distance; best = { id: 'char:' + c.id, char: c, use: null, onUse: () => c.onTalk(g) }; }
    }
    return best;
  }
  // ground point under a screen point (on the current floor height)
  groundPoint(cssX, cssY, out = new THREE.Vector3()) {
    const g = this.game;
    return g.rig.screenToGround(cssX, cssY, g.renderer, this.nav?.y ?? this.groundY, out);
  }
  makeNav(name, o) { const n = new NavGrid(o); this.navs[name] = n; if (!this.nav) this.nav = n; return n; }
  useNav(name) { this.nav = this.navs[name] || this.nav; }
  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
  }
}
export { _v };
