// The Spirit Realm: Grandpa's island in the clouds. It's always golden
// afternoon here when it's night at home. A floating island of grass and old
// stone: the minka with its engawa and wind chime, the torii the basement door
// opens onto, a koi pond spilling off the edge in a long waterfall, a little
// tea field, sakura and bamboo, dragonflies over the water. Far off, other
// islands wait behind banks of cloud until Tarōbō blows them away.
//   L.revealIslands(dur)   the cloud banks roll away (Kappa Island, the Tengu's peak)
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { islandShape, islandMesh, oldHouse, toriiPortal, stoneLantern, pondWater, koi, waterfall, cloudPuff, cloudSea, seaShadow, kappaIsland, tenguPeak } from '../world/spiritIsland.js';
import { natureBatch, natureFrames } from '../art/nature.js';
import { VoxelModel, vm, fill, V5 } from '../world/build.js';
import { HokoriFlock } from '../entities/hokori.js';

export const POND = { x: 3.9, z: 3.0, rx: 1.45, rz: 0.95 };

export class SpiritLocation extends Location {
  constructor(game) {
    super(game, 'spirit', { bg: 0x9ec8f0, lightMode: 'spirit', grade: 'spirit', ambience: 'spirit' });
    this.camCfg = { wupp: 0.0145, pitch: 32, yaw: 0, follow: true, minWupp: 0.007, maxWupp: 0.03, followY: 0.8, bounds: { minX: -5.2, maxX: 5.2, minZ: -0.6, maxZ: 3.4 } };
    this.shadowSize = 16;
    this.clock = false;
    this.hourOverride = 22.6;
    this.sky = true;
    // golden spirit afternoon: warm low sun, peach sky, lilac shade
    this.lightOverride = { sun: 0xffe0b0, sunI: 2.2, hemiI: 1.45, sky: 0xe8d8f0, gnd: 0x7a7a48, top: 0x7ab0e8, bot: 0xffe0c0 };
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 1 };
    this.updaters = [];
    const shape = (this.shape = islandShape());
    S.add(islandMesh(shape, { pond: POND }));
    // ---- the house, the portal, lanterns
    const house = (this.house = oldHouse({ onU: this.onU })); house.position.set(1.0, 0, -0.85); S.add(house); this.updaters.push(house.userData.update);
    const torii = (this.torii = toriiPortal({ onU: this.onU })); torii.position.set(-5.5, 0, 3.2); S.add(torii); this.updaters.push(torii.userData.update);
    this.lanterns = [];
    for (const [lx, lz] of [[-3.7, 3.4], [-1.6, 2.1], [2.6, 1.35], [-6.4, 1.6]]) { const l = stoneLantern({ onU: this.onU }); l.position.set(lx, 0, lz); S.add(l); this.lanterns.push(l); }
    // ---- the pond (water, koi, the channel to the edge and the waterfall)
    const water = pondWater(POND.rx * 0.98, POND.rz * 0.98); water.position.set(POND.x, -0.12, POND.z); S.add(water); this.updaters.push(water.userData.update);
    this.koi = [0xf08a30, 0xffffff, 0xe8443a].map((c, i) => { const k = koi(c); S.add(k); return { m: k, a: i * 2.1, r: 0.55 + i * 0.22, sp: 0.4 + i * 0.12 }; });
    let ez = POND.z; while (shape.inside(POND.x + 0.6, ez + 0.05) && ez < 12) ez += 0.05;
    const chan = pondWater(0.22, (ez - POND.z - POND.rz) / 2 + 0.1); chan.position.set(POND.x + 0.6, -0.11, (POND.z + POND.rz + ez) / 2); S.add(chan);
    const fall = waterfall(6.5); fall.position.set(POND.x + 0.6, -0.1, ez + 0.02); S.add(fall); this.updaters.push(fall.userData.update);
    this.fallFoot = { x: POND.x + 0.6, y: -6.4, z: ez + 0.1 };
    // ---- clouds: the sea below, puffs drifting round the island, banks hiding the far islands
    const sea = cloudSea(260); sea.position.y = -8.2; S.add(sea);
    const ssh = seaShadow(shape.rx * 1.1, shape.rz * 1.2); ssh.position.set(shape.cx - 2.5, -8.15, shape.cz - 3.0); S.add(ssh); this.updaters.push(sea.userData.update);
    this.puffs = [];
    const puffAt = [[-12, -3.5, 2, 18], [12.5, -4, 3, 20], [-9, -6.5, 6.5, 22], [8.5, -6.8, 7, 24], [0, -7.4, 10, 28], [-17, 4.5, -3, 15], [15, 2.4, -6, 16], [4, 4.2, -10, 13], [-5, 4.6, -11, 14]];
    puffAt.forEach(([x, y, z, r], i) => { const p = cloudPuff(i + 1, { r }); p.position.set(x, y, z); S.add(p); this.puffs.push({ m: p, x0: x, ph: i * 1.3 }); });
    // far islands (miniatures, hazy) and the banks in front of them
    this.kappa = kappaIsland(); this.kappa.position.set(11.5, -0.6, -11); this.kappa.scale.setScalar(0.7); S.add(this.kappa);
    this.peak = tenguPeak(); this.peak.position.set(-12.5, -1.0, -13); this.peak.scale.setScalar(0.6); S.add(this.peak);
    this.banks = [];
    for (const [x, y, z, r] of [[11.5, 0.6, -8.5, 30], [8.5, -0.6, -8, 24], [14.5, 1.4, -9.5, 26], [-12.5, 2.5, -10.5, 30], [-9.5, 0.2, -10, 26], [-15.5, 4, -11.5, 24], [-12.5, 6.2, -11.5, 22]]) {
      const b = cloudPuff(Math.round(x * 7), { r }); b.position.set(x, y, z); S.add(b); this.banks.push({ m: b, x0: x, y0: y });
    }
    // ---- plants: trees, the tea field, flowers, ferns, rocks, susuki at the rim, lily pads
    const nb = (this.plants = natureBatch({ max: 700, castShadow: true }));
    S.add(nb.mesh);
    for (const [n, x, z, sc] of [['sakura_0', -6.2, -1.4, 1.0], ['sakura_1', -4.2, -2.6, 0.9], ['momiji_0', 5.4, -2.6, 0.9], ['pine_0', 7.4, -0.8, 0.8], ['sakura_small', -2.9, 0.6, 0.8], ['camphor_1', -8.0, 0.6, 0.7]]) nb.push(n, x, 0, z, { sway: 0.2, scale: sc });
    for (let i = 0; i < 9; i++) nb.push(i % 2 ? 'bamboo_0' : 'bamboo_1', -8.3 + (i % 3) * 0.45, 0, 2.2 + Math.floor(i / 3) * 0.5, { sway: 0.4, scale: 0.85 });
    this.teaSpots = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const x = 5.0 + c * 0.55, z = 0.2 + r * 0.6; if (!shape.inside(x + 0.3, z + 0.3)) continue; nb.push((r + c) % 3 === 0 ? 'teabush_ripe' : (r + c) % 2 ? 'teabush_0' : 'teabush_1', x, 0, z, { sway: 0.25, scale: 0.75 }); this.teaSpots.push({ x, z }); }
    const flowers = ['hydrangea_blue', 'hydrangea_pink', 'hydrangea_violet', 'azalea', 'higanbana', 'daisy', 'aster', 'fern_0', 'fern_1', 'tuft_2'];
    for (let i = 0; i < 7; i++) nb.push(flowers[i % 3], -1.4 + i * 0.7, 0, 0.0 + (i % 2) * 0.12, { sway: 0.35, scale: 0.7 }); // along the engawa
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      let x = shape.cx + Math.cos(a) * shape.rx, z = shape.cz + Math.sin(a) * shape.rz;
      for (let t = 0; t < 40 && !shape.inside(x, z); t++) { x -= Math.cos(a) * 0.06; z -= Math.sin(a) * 0.06; }
      x -= Math.cos(a) * (0.15 + (i % 3) * 0.18); z -= Math.sin(a) * (0.15 + (i % 3) * 0.18);
      if (Math.hypot(x - POND.x - 0.6, z - 6) < 0.6) continue;
      const n = ['susuki', 'tuft_0', 'fern_1', 'tallgrass_0', 'tuft_1', flowers[i % flowers.length], 'tuft_3'][i % 7];
      nb.push(n, x, 0, z, { sway: 0.45, scale: 0.6 + (i % 4) * 0.08 });
    }
    for (const [n, x, z] of [['mossrock', -7.2, -0.2], ['rock_1', 6.8, 3.6], ['rock_0', -4.6, 4.6], ['boulder_0', 7.6, 2.0], ['riverrock_1', 2.5, 3.6], ['riverrock_0', 5.3, 2.5]]) nb.push(n, x, 0, z, { scale: 0.7 });
    for (const [x, z] of [[3.3, 2.8], [4.5, 3.4], [4.0, 2.4], [3.6, 3.5]]) nb.push(Math.random() < 0.5 ? 'lilypad_0' : 'lilypad_1', x, -0.1, z, { scale: 0.6 });
    nb.push('lilyflower_pink', 4.3, -0.08, 2.75, { scale: 0.6 });
    nb.push('turtle_sun', 2.55, 0.1, 3.55, { scale: 0.55 });
    // the stepping-stone path from the torii to the engawa step
    const path = [[-5.5, 4.0], [-4.9, 3.85], [-4.3, 3.55], [-3.2, 3.0], [-2.6, 2.7], [-2.0, 2.45], [-1.2, 2.1], [-0.5, 1.75], [0.2, 1.45], [0.9, 1.2]];
    path.forEach(([x, z], i) => nb.push(`steppingstone_${i % 3}`, x, 0.01, z, { scale: 0.75 }));
    nb.commit();
    // dragonflies over the pond, butterflies by the flowers (sprite flyers)
    this.flyers = [];
    for (const [k, cx, cz, r, y] of [['dragonfly', POND.x, POND.z, 1.2, 0.6], ['dragonfly', POND.x - 0.4, POND.z + 0.3, 0.8, 0.9], ['monarch', -1.0, 0.6, 1.4, 0.7], ['bluebutterfly', 5.8, 0.8, 1.0, 0.8], ['monarch', -6.0, 1.0, 1.1, 1.2]]) {
      const fr = natureFrames(k);
      const i = nb.push(`${k}#0`, cx, y, cz, { mode: 2, scale: 0.35 });
      this.flyers.push({ i, k, n: Math.max(1, fr.length), cx, cz, r, y, a: Math.random() * 6, sp: 0.6 + Math.random() * 0.6, f: 0, ft: 0 });
    }
    // ---- nav: the island top minus the house, pond, lanterns, trees, tea field
    const nav = this.makeNav('island', { minX: shape.cx - shape.rx, minZ: shape.cz - shape.rz, w: shape.rx * 2, d: shape.rz * 2, cell: 0.2 });
    for (let j = 0; j < nav.nz; j++) for (let i = 0; i < nav.nx; i++) {
      const x = nav.cx(i), z = nav.cz(j);
      const ok = shape.inside(x, z) && shape.k(x, z) > 0.07;
      if (!ok) nav.walk[j * nav.nx + i] = 0;
    }
    nav.block(-1.7, -4.2, 3.9, -0.1); // house + engawa
    nav.block(-0.4, -0.1, 2.4, 0.15, 0); // engawa step edge
    for (let j = 0; j < nav.nz; j++) for (let i = 0; i < nav.nx; i++) { const x = nav.cx(i), z = nav.cz(j); if (((x - POND.x) / (POND.rx + 0.1)) ** 2 + ((z - POND.z) / (POND.rz + 0.1)) ** 2 < 1) nav.walk[j * nav.nx + i] = 0; }
    for (const l of this.lanterns) nav.blockCircle(l.position.x, l.position.z, 0.3);
    nav.block(-6.0, 2.95, -5.0, 3.45); nav.blockCircle(-6.47, 3.2, 0.2); nav.blockCircle(-4.53, 3.2, 0.2);
    nav.block(4.8, 0.0, 7.8, 2.4); // tea field
    for (const [x, z] of [[-6.2, -1.4], [-4.2, -2.6], [5.4, -2.6], [7.4, -0.8], [-2.9, 0.6], [-8.0, 0.6]]) nav.blockCircle(x, z, 0.35);
    nav.block(-8.6, 2.0, -7.2, 3.4); // bamboo
    this.navs.island = nav;
    this.arrive = { x: -5.5, z: 3.75 };
    // Hokori milling about the garden (hidden until they're summoned in the story)
    this.hokori = new HokoriFlock(this.game, S, { n: 6, area: { x0: -2.5, x1: 3.5, z0: 1.0, z1: 3.6 }, nav });
    this.setHokori(false);
  }
  setHokori(on) { for (const f of this.hokori.list) f.h.root.visible = on; this.hokoriOn = on; }
  // Tarōbō's gust: the cloud banks roll apart and sink, revealing the far islands
  revealIslands(dur = 3.0) {
    const g = this.game;
    return g.director.tween((k) => {
      for (const b of this.banks) { const dir = Math.sign(b.x0 - (b.x0 > 0 ? 11.5 : -12.5)) || (b.x0 > 0 ? 1 : -1); b.m.position.x = b.x0 + dir * k * 14; b.m.position.y = b.y0 - k * 9; b.m.scale.setScalar(1 - k * 0.5); }
    }, dur);
  }
  async enter() {
    const g = this.game;
    g.rig.setFollow(null);
    g.rig.play({ x: -2, y: 0.8, z: 2.2, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: 0, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    if (this.hokoriOn) this.hokori.update(dt);
    for (const k of this.koi) { k.a += dt * k.sp; k.m.position.set(POND.x + Math.cos(k.a) * k.r, -0.15, POND.z + Math.sin(k.a) * k.r * 0.6); k.m.rotation.y = -k.a - Math.PI / 2; }
    for (const p of this.puffs) p.m.position.x = p.x0 + Math.sin(t * 0.05 + p.ph) * 1.2;
    const B = this.plants;
    for (const f of this.flyers) {
      f.a += dt * f.sp; f.ft += dt;
      const x = f.cx + Math.cos(f.a) * f.r + Math.sin(f.a * 2.3) * 0.2, z = f.cz + Math.sin(f.a) * f.r * 0.6, y = f.y + Math.sin(f.a * 3.1) * 0.15;
      if (f.ft > 0.06) { f.ft = 0; f.f = (f.f + 1) % f.n; B.setFrame(f.i, `${f.k}#${f.f}`); }
      B.setPos(f.i, x, y, z); B.setFlip(f.i, Math.cos(f.a) > 0);
    }
    B.commit?.();
    // mist at the foot of the waterfall
    if ((this._mistT = (this._mistT || 0) - dt) <= 0) {
      this._mistT = 0.3;
      this.game.particles?.emit('steam', { x: this.fallFoot.x + (Math.random() - 0.5) * 0.4, y: this.fallFoot.y, z: this.fallFoot.z, n: 1 });
    }
  }
}
