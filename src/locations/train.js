// The Shinkansen car (Kodama service): a voxel cut-away diorama — far wall
// with real window openings (sunlight and passing pole shadows sweep through
// them), seat rows with white headrest covers, luggage racks, an LED ticker
// over the door — and the live pixel-art panorama behind the windows.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { VoxelModel } from '../vox/voxel.js';
import { rbox, tone, hash3, buildGeo, matFor } from '../vox/kit.js';
import { Panorama } from '../art/panorama.js';
import { PixCanvas, makeTexture } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { Character } from '../entities/rig.js';
import { CHARACTERS, LOCALS } from '../data/characters.js';

const V1 = 0.1, V5 = 0.05;
function vmesh(model, scale, pivot = [0, 0, 0], { cast = true, receive = true } = {}) {
  const g = buildGeo(model, pivot, scale);
  const m = new THREE.Mesh(g, matFor(g, 0.07));
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// car interior, 0.1 m voxels. x: -70..69, z: -16..14 (far wall at z = -16), floor top y = 0
const CAR = { x0: -70, x1: 69, zWall: -16, zNear: 14, winY0: 9, winY1: 16, pitch: 14, winW: 10 };
export const SEAT_PITCH = 1.05; // metres between rows

function carShell() {
  const v = new VoxelModel();
  const wallC = 0xe6e1d4, wallD = 0xcfc8b8, frame = 0x9aa0a8, carpet = 0x55647e, carpetL = 0x627290, kick = 0x7a8090;
  // floor (carpet with a subtle diamond pattern, aisle strip)
  for (let x = CAR.x0; x <= CAR.x1; x++) for (let z = CAR.zWall; z <= CAR.zNear; z++) {
    const aisle = z >= -2 && z <= 3;
    const pat = (x + z) % 6 === 0 || (x - z) % 6 === 0;
    v.set(x, -1, z, aisle ? (pat ? 0x4a5874 : 0x506080) : pat ? carpetL : carpet);
  }
  // far wall with windows
  for (let x = CAR.x0; x <= CAR.x1; x++) {
    const k = ((x - CAR.x0) % CAR.pitch + CAR.pitch) % CAR.pitch;
    const isWin = k >= 2 && k < 2 + CAR.winW;
    for (let y = 0; y <= 27; y++) {
      if (isWin && y >= CAR.winY0 && y <= CAR.winY1) continue;
      let c = y < 2 ? kick : y < CAR.winY0 ? wallD : wallC;
      if (isWin && (y === CAR.winY0 - 1 || y === CAR.winY1 + 1)) c = frame;
      if (!isWin && (k === 1 || k === 2 + CAR.winW) && y >= CAR.winY0 - 1 && y <= CAR.winY1 + 1) c = frame;
      if (y === 6) c = 0xb8b0a0; // heater strip
      v.set(x, y, CAR.zWall, c);
      if (y < CAR.winY0 - 1 || y > CAR.winY1 + 1) v.set(x, y, CAR.zWall - 1, 0xf4f4f6); // outer skin
    }
    // window sill (interior ledge)
    if (isWin) { v.set(x, CAR.winY0 - 1, CAR.zWall + 1, 0xd8d2c4); }
    // luggage rack above the windows
    v.set(x, 20, CAR.zWall + 1, 0x8a9098); v.set(x, 20, CAR.zWall + 2, 0xa8b0b8); v.set(x, 20, CAR.zWall + 3, 0xa8b0b8); v.set(x, 20, CAR.zWall + 4, 0x8a9098);
    if (x % 3 === 0) v.set(x, 19, CAR.zWall + 4, 0x7a8088);
    // ceiling edge cove with the light strip
    for (let z = CAR.zWall + 1; z <= CAR.zWall + 3; z++) v.set(x, 27, z, wallC);
  }
  // end walls (front with door, back plain) — kept low at the near side so they don't hide the scene
  for (const [ex, front] of [[CAR.x1 + 1, true], [CAR.x0 - 1, false]]) {
    for (let z = CAR.zWall; z <= 4; z++) for (let y = 0; y <= 27; y++) {
      const door = front && z >= -4 && z <= 1 && y <= 20;
      if (door) { v.set(ex, y, z, z === -4 || z === 1 || y === 20 ? 0x8a9098 : y > 12 && y < 19 && z > -3 && z < 0 ? 0x9ac0d0 : 0xb8bcc4); continue; }
      v.set(ex, y, z, y < 2 ? kick : wallC);
    }
  }
  return v;
}

// one 2-seat row (0.05 voxels), facing +x; origin at the floor under the seat centre
function seatRow(seed = 1) {
  const v = new VoxelModel();
  const fab = 0x4a70b0, fabD = 0x3a5c96, fabL = 0x5a82c0, cover = 0xf6f4ee, arm = 0x6a7280, leg = 0x5a606a;
  for (let s = 0; s < 2; s++) {
    const z0 = -10 + s * 10;
    // cushion
    rbox(v, -4, 4, 3, 5, z0, z0 + 8, 1.2, (x, y, z) => tone(x, y, z, fab, fabD, fabL, 0.12, 0.06));
    // backrest (leans back a little), headrest cover
    for (let y = 6; y <= 21; y++) {
      const lean = Math.floor((y - 6) / 6);
      for (let z = z0; z <= z0 + 8; z++) for (let x = -6 - lean; x <= -4 - lean; x++) {
        const edge = z === z0 || z === z0 + 8;
        let c = y >= 17 && x === -4 - lean ? cover : edge ? fabD : tone(x, y, z, fab, fabD, fabL, 0.1, 0.05);
        if (y >= 17 && x !== -4 - lean && !edge) c = fab;
        v.set(x, y, z, c);
      }
    }
    // white headrest cloth hanging over the top
    for (let z = z0 + 1; z <= z0 + 7; z++) { v.set(-6, 22, z, cover); v.set(-5, 22, z, cover); v.set(-4, 22, z, cover); }
    // tray table on the back of the seat (faces the row behind)
    for (let z = z0 + 2; z <= z0 + 6; z++) for (let y = 10; y <= 15; y++) v.set(-7, y, z, y === 10 || y === 15 ? 0x9aa0a8 : 0xb8bcc4);
  }
  // armrests
  for (const z of [-11, -1, 10]) for (let x = -3; x <= 4; x++) { v.set(x, 8, z, arm); v.set(x, 7, z, arm); }
  // legs
  for (const z of [-9, 8]) for (let y = 0; y <= 2; y++) { v.set(-2, y, z, leg); v.set(2, y, z, leg); }
  return v;
}

function bag(kind, c) {
  const v = new VoxelModel();
  if (kind === 'suitcase') { rbox(v, -4, 3, 0, 5, -2, 1, 0.8, (x, y, z) => tone(x, y, z, c, c, c, 0, 0)); for (let x = -1; x <= 0; x++) v.set(x, 6, 0, 0x2a2a30); }
  else if (kind === 'paper') { rbox(v, -3, 2, 0, 6, -2, 1, 0.3, 0xc8a070); v.set(-1, 7, -2, 0x8a6a40); v.set(0, 7, 1, 0x8a6a40); }
  else { rbox(v, -3, 3, 0, 4, -2, 2, 1.5, c); v.set(0, 5, 0, 0x2a2a30); }
  return v;
}

function ledTexture() {
  const p = new PixCanvas(160, 14);
  return { p, tex: makeTexture(p.c, { mips: false }) };
}

export class TrainLocation extends Location {
  constructor(game) {
    super(game, 'train', { bg: 0x101018, lightMode: 'interior', grade: 'melancholy', music: undefined, ambience: 'train' });
    this.camCfg = { wupp: 0.0085, pitch: 18, yaw: 58 };
    this.clock = false;
    this.speed = 1;
    this.speedGoal = 1;
    this.shadowSize = 9;
    this.hourOverride = 15.5;
    this.tickerText = '';
    this.tickerX = 0;
  }
  async build() {
    const S = this.scene;
    // shell
    const shell = vmesh(carShell(), V1, [0, 0, 0]);
    S.add(shell);
    // seat rows along the far side, facing +x
    this.rows = [];
    const rowM = seatRow();
    for (let i = -6; i <= 6; i++) {
      if (i === 1) continue; // the row in front of Mamo is empty (keeps his face in view)
      const m = vmesh(rowM, V5, [0, 0, 0]);
      m.position.set(i * SEAT_PITCH, 0, -1.0);
      S.add(m);
      this.rows.push(m);
    }
    // near-side rows only far from the focus (depth cue at the edges)
    for (const i of [-6, -5, 5, 6]) {
      const m = vmesh(rowM, V5, [0, 0, 0]);
      m.position.set(i * SEAT_PITCH, 0, 0.75);
      S.add(m);
    }
    // luggage on the racks
    const bags = [[-5.6, 'suitcase', 0xc84a3a], [-3.2, 'paper', 0], [-1.1, 'duffel', 0x3a6a5a], [1.8, 'suitcase', 0x4a4a5a], [4.1, 'paper', 0], [5.5, 'duffel', 0x8a5a9a]];
    for (const [x, k, c] of bags) { const m = vmesh(bag(k, c), V5); m.position.set(x, 2.05, -1.38); S.add(m); }
    // Mamo's own bag on the seat next to him
    this.seatBag = vmesh(bag('duffel', 0x4c5b84), V5);
    this.seatBag.position.set(0.05, 0.27, -0.5);
    S.add(this.seatBag);
    // panorama behind the windows
    this.pano = new Panorama(896, 256);
    this.panoTex = makeTexture(this.pano.c, { mips: false });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshBasicMaterial({ map: this.panoTex }));
    pm.position.set(0, 1.25, -1.82);
    S.add(pm);
    this.panoMesh = pm;
    // LED ticker over the front door
    this.led = ledTexture();
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), emitMat({ map: this.led.tex, intensity: 1.6 }));
    lm.rotation.y = -Math.PI / 2;
    lm.position.set(CAR.x1 * V1 + 0.04, 2.25, -0.15);
    S.add(lm);
    // ceiling light strip (glow)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 0.12), emitMat({ color: 0xfff6e0, intensity: 1.2 }));
    strip.position.set(0, 2.66, -1.38);
    S.add(strip);
    // moving shadow casters outside the windows (catenary poles) - invisible, shadows only
    this.poles = [];
    const pg = new THREE.BoxGeometry(0.12, 4, 0.12);
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(pg, shadowOnly);
      m.castShadow = true;
      m.position.set(-8 + i * 5, 1.5, -2.6);
      S.add(m);
      this.poles.push(m);
    }
    // passengers
    this.passengers = [];
    const seat = (def, x, z, expr, act) => {
      const c = new Character(def);
      c.setPos(x, z, 0.0); c.faceNow(Math.PI / 2); c.setPose('sit');
      c.idleT = 999;
      if (expr) c.setExpr(expr, { react: false });
      this.add(c);
      if (act) c.play(act, { loop: true });
      this.passengers.push(c);
      return c;
    };
    seat({ ...LOCALS.ponta, id: 'sleeper' }, -2 * SEAT_PITCH + 0.1, -1.25, 'asleep', 'sleep');
    seat(LOCALS.saru, 3 * SEAT_PITCH + 0.1, -0.75, 'neutral');
    seat({ ...LOCALS.usami, id: 'granny' }, -4 * SEAT_PITCH + 0.1, -1.25, 'calm');
    this.seats = { mamoru: { x: 0.1, y: 0, z: -1.25, yaw: Math.PI / 2 }, aisle: { x: 0.1, z: -0.5 } };
    this.aisleZ = 0.25;
    this.navs.car = this.makeNav('car', { minX: -7, minZ: -0.2, w: 14, d: 1.2 });
  }
  async enter(opts = {}) {
    const g = this.game, P = g.player;
    g.place(P, this.seats.mamoru.x, this.seats.mamoru.z, this.seats.mamoru.yaw, 0);
    P.setPose('sit');
    P.idleT = 999;
    const c = this.camCfg;
    g.rig.setFollow(null);
    g.rig.play({ x: 0.2, y: 0.9, z: -0.6, wupp: c.wupp, pitch: c.pitch, yaw: c.yaw, dur: 0 });
    g.lighting.override = { elev: 0.55 };
    g.lighting.sunAzimuth = Math.PI + 0.5; // sun outside, behind the far wall
  }
  exit() { this.game.lighting.override = null; this.game.lighting.sunAzimuth = 0.6; }
  setTicker(text) { this.tickerText = text; this.tickerX = 160; }
  drawTicker(dt) {
    const p = this.led.p;
    p.fill('#120806');
    for (let x = 0; x < 160; x += 2) for (let y = 1; y < 14; y += 2) p.px(x, y, '#2a120c');
    if (this.tickerText) {
      this.tickerX -= dt * 34;
      const r = p.text(this.tickerText, Math.round(this.tickerX), 2, { font: '10px Galmuri9', color: '#ff9a2a' });
      if (this.tickerX < -r.w - 20) this.tickerX = 160;
    }
    this.led.tex.needsUpdate = true;
  }
  update(dt, t) {
    this.speed += (this.speedGoal - this.speed) * Math.min(1, dt * 0.6);
    this.pano.update(dt, this.speed);
    this.panoTex.needsUpdate = true;
    this.drawTicker(dt);
    // poles sweep past, casting shadows through the windows
    for (const m of this.poles) {
      m.position.x -= dt * this.speed * 26;
      if (m.position.x < -9) m.position.x += 20;
      m.visible = this.pano.seg !== 'tunnel' && this.speed > 0.05;
    }
    // gentle train sway on the camera + characters bob
    this.game.rig.sway = 0.25 + this.speed * 0.4;
    const bob = Math.sin(t * 13) * 0.004 * this.speed;
    for (const c of this.chars) c.y = bob;
    // tunnels: lights strobe, interior darkens
    const L = this.game.lighting;
    if (this.pano.seg === 'tunnel') { L.override = { elev: 0.55, sunI: 0.05, hemiI: 0.55 }; }
    else {
      const look = this.pano.look();
      L.override = { elev: 0.42, sunI: 2.6, sun: parseInt(look.sun.slice(1), 16), hemiI: 1.45, sky: 0xf4ece4, gnd: 0x9a8a80 };
    }
  }
}
