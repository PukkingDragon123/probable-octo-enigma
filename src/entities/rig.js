// Character rig: low-poly animal-human chibi with an animated pixel face.
//
// Skeleton (all Groups, character faces +z, ground at y = 0):
//   root (position, yaw)
//     body (squash & stretch pivot at the feet, bob)
//       pelvis
//         hipL/hipR -> thigh -> kneeL/kneeR -> shin -> footL/footR
//         tail
//         spine (lean / twist / roll)
//           torso mesh, shell, wings, carry anchor
//           chest -> shoulderL/R -> upper arm -> elbowL/R -> forearm -> handL/R
//                 -> neck -> head (turn / nod / tilt): head mesh, face decal, ears, hats
//
// Animation is procedural and layered every frame: base pose (stand, sit,
// seiza, floor, lie, crouch) + locomotion (walk / run cycles) + body language
// from the current expression + idle breathing + look-at + the active action
// (sweep, carry, hug, crank, ...) + secondary springs (ears, tail, squash).
import * as THREE from 'three';
import { Face, makeFaceDecal, visemeFor } from './face.js';
import { TORSO, sleeve, legTex, skinTex, shellTex } from './outfits.js';
import * as P from './parts.js';
import { blobShadowMat } from '../core/materials.js';
import { clamp, lerp, damp, dampAngle, angleDiff, smooth, EASE, spring } from '../core/util.js';
import { darken, lighten } from '../core/pixtex.js';

const JOINTS = ['hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'tail', 'earL', 'earR'];

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function zeroPose() {
  const o = {};
  for (const j of JOINTS) o[j] = [0, 0, 0];
  o.root = { y: 0, yaw: 0, x: 0, z: 0 };
  return o;
}

// default body proportions (metres, before def.scale)
const BODY = {
  headR: 0.2, headScale: [1.1, 0.93, 1.0], neckY: 0.03,
  torsoH: 0.25, torsoTop: 0.115, torsoBot: 0.14, torsoDepth: 0.82,
  hipY: 0.19, hipX: 0.062, thigh: 0.1, shin: 0.095, legR: 0.045,
  shoulderX: 0.13, upperArm: 0.11, foreArm: 0.1, armR: 0.036, handR: 0.04,
};

export class Character {
  constructor(def) {
    this.def = def;
    this.id = def.id || 'npc';
    this.name = def.name || '';
    const b = (this.b = { ...BODY, ...(def.body || {}) });
    if (def.headScale) b.headScale = def.headScale;
    const S = (this.scale = def.scale ?? 1);
    this.root = new THREE.Group();
    this.root.name = 'char:' + this.id;
    this.root.userData.character = this;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.body.scale.setScalar(S);
    // state
    this.x = 0; this.z = 0; this.y = 0;
    this.yaw = 0; this.yawGoal = 0;
    this.speed = 0; this.moveSpeed = def.walkSpeed ?? 1.35; this.runSpeed = def.runSpeed ?? 2.6;
    this.phase = 0;
    this.path = null; this.pathResolve = null; this.running = false;
    this.pose = 'stand'; this.poseW = {}; this.poseTarget = 'stand';
    this.poseBlend = 1;
    this.action = null;
    this.lookTarget = null; this.lookW = 0;
    this.expr = 'neutral';
    this.sq = { x: 0, v: 0 };
    this.t = Math.random() * 10;
    this.talking = 0;
    this.held = { L: null, R: null, both: null, head: null };
    this.cur = zeroPose();
    this.idleT = 3 + Math.random() * 5;
    this.idleAnim = null;
    this.visible = true;
    this.springs = { tail: { x: 0, v: 0 }, tailY: { x: 0, v: 0 }, earL: { x: 0, v: 0 }, earR: { x: 0, v: 0 } };
    this._lastX = 0; this._lastZ = 0; this._vel = new THREE.Vector2();
    this.build();
  }

  // ------------------------------------------------------------ construction
  build() {
    const d = this.def, b = this.b;
    const skin = d.skin || '#8ac070';
    const J = (this.j = {});
    const pelvis = (J.pelvis = P.pivot('pelvis', null, [0, b.hipY, 0]));
    this.body.add(pelvis);
    // legs
    const legPc = legTex({ color: d.pants || skin, shorts: d.shorts, skin, socks: d.socks, skirt: !!d.skirt });
    const legMat = P.texMat(legPc);
    const footKind = d.feet || 'sneaker';
    const footMat = d.shoeTex ? P.texMat(d.shoeTex) : P.toon(d.shoe || '#f4f0e8');
    for (const side of [-1, 1]) {
      const s = side < 0 ? 'R' : 'L'; // character's right is -x
      const hip = (J['hip' + s] = P.pivot('hip' + s, null, [side * b.hipX, 0, 0]));
      pelvis.add(hip);
      hip.add(P.mesh(P.limbGeo(b.legR * 1.08, b.legR, b.thigh), legMat));
      const knee = (J['knee' + s] = P.pivot('knee' + s, null, [0, -b.thigh, 0]));
      hip.add(knee);
      knee.add(P.mesh(P.limbGeo(b.legR, b.legR * 0.92, b.shin), legMat));
      const foot = (J['foot' + s] = P.pivot('foot' + s, null, [0, -b.shin, 0]));
      knee.add(foot);
      foot.add(P.mesh(P.footGeo(footKind, (d.footScale ?? 1)), footMat));
      if (d.shoeStripe) {
        const st = P.footGeo(footKind, (d.footScale ?? 1) * 1.01);
        st.scale(1.02, 0.35, 1.0); st.translate(0, -0.012, 0);
        foot.add(P.mesh(st, P.toon(d.shoeStripe), { cast: false }));
      }
    }
    // skirt / hakama / robe skirt
    if (d.skirt) {
      const sk = d.skirt;
      const g = new THREE.CylinderGeometry(b.torsoBot * 0.95, b.torsoBot * (sk.flare ?? 1.6), sk.len ?? 0.14, 10, 1, true);
      g.translate(0, -(sk.len ?? 0.14) / 2 + 0.03, 0);
      const m = P.mesh(g, sk.tex ? P.texMat(sk.tex, { side: THREE.DoubleSide }) : P.toon(sk.color, { side: THREE.DoubleSide }));
      pelvis.add(m);
      this.skirtMesh = m;
    }
    // tail
    if (d.tail && d.tail !== 'none') {
      const t = P.tailChain(d.tail, d.tailColor || skin, d.tailTip || lighten(skin, 0.5), d.tailScale ?? 1);
      t.root.position.set(0, 0.02, -b.torsoBot * 0.8);
      t.root.rotation.x = d.tail === 'otter' ? 0.9 : d.tail === 'shiba' ? 0 : 0.5;
      J.tail = t.root;
      this.tailSegs = t.segs;
      pelvis.add(t.root);
    }
    // spine + torso
    const spine = (J.spine = P.pivot('spine'));
    pelvis.add(spine);
    const torsoTex = d.torso || TORSO.plain({ color: skin });
    const tg = new THREE.CylinderGeometry(b.torsoTop, b.torsoBot, b.torsoH, 12, 2, false, Math.PI);
    // round the shoulders: pull the top ring in & up
    const pos = tg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > b.torsoH * 0.49) pos.setXYZ(i, pos.getX(i) * 0.82, y + 0.012, pos.getZ(i) * 0.82);
    }
    tg.computeVertexNormals();
    tg.scale(1, 1, b.torsoDepth);
    tg.translate(0, b.torsoH / 2, 0);
    const torso = P.mesh(tg, P.texMat(torsoTex));
    torso.name = 'torso';
    spine.add(torso);
    this.torsoMesh = torso;
    // belly bulge (big characters)
    if (d.belly) {
      const bg = P.ellipsoid(b.torsoBot * 0.95, 1, 0.9, 0.8 * d.belly);
      bg.translate(0, b.torsoH * 0.32, b.torsoBot * 0.25 * d.belly);
      spine.add(P.mesh(bg, P.texMat(torsoTex)));
    }
    // carry anchor (boxes held in front of the chest)
    J.carry = P.pivot('carry', null, [0, b.torsoH * 0.62, b.torsoBot + 0.11]);
    spine.add(J.carry);
    // chest
    const chest = (J.chest = P.pivot('chest', null, [0, b.torsoH, 0]));
    spine.add(chest);
    // shell
    if (d.shell) {
      const sh = P.shellMesh(shellTex(d.shell), d.shell.scale ?? 1, { rimCol: d.shell.rim });
      sh.position.set(0, b.torsoH * 0.5, -b.torsoBot * b.torsoDepth * 0.72);
      sh.scale.set(1.05, 1, 0.82);
      spine.add(sh);
      this.shell = sh;
    }
    // wings
    if (d.wings) {
      this.wings = [];
      for (const side of [-1, 1]) {
        const w = P.wingMesh(d.wings, side, 1);
        const pv = P.pivot('wing', w, [side * 0.05, b.torsoH * 0.8, -b.torsoBot * 0.7]);
        pv.rotation.y = side * 0.5;
        spine.add(pv);
        this.wings.push(pv);
      }
    }
    // arms
    const slTex = sleeve({ color: d.sleeve || d.shirt || skin, cuff: d.cuff, length: d.sleeveLen ?? 1, skin, stripe: d.sleeveStripe });
    const slMat = P.texMat(slTex);
    const handMat = P.toon(d.handColor || skin);
    for (const side of [-1, 1]) {
      const s = side < 0 ? 'R' : 'L';
      const sh = (J['shoulder' + s] = P.pivot('shoulder' + s, null, [side * b.shoulderX, -0.035, 0]));
      chest.add(sh);
      sh.add(P.mesh(P.limbGeo(b.armR * 1.15, b.armR, b.upperArm), slMat));
      // wide kimono / happi sleeves
      if (d.wideSleeves) {
        const ws = new THREE.BoxGeometry(0.035, 0.16, 0.16);
        ws.translate(side * 0.025, -0.1, 0);
        sh.add(P.mesh(ws, slMat));
      }
      const el = (J['elbow' + s] = P.pivot('elbow' + s, null, [0, -b.upperArm, 0]));
      sh.add(el);
      const foreLen = (d.sleeveLen ?? 1) < 0.6 ? b.foreArm : b.foreArm;
      el.add(P.mesh(P.limbGeo(b.armR, b.armR * 0.95, foreLen), (d.sleeveLen ?? 1) < 0.6 ? handMat : slMat));
      const hand = (J['hand' + s] = P.pivot('hand' + s, null, [0, -foreLen, 0]));
      el.add(hand);
      const hk = d.hands || 'mitt';
      const hm = P.mesh(P.handGeo(hk, b.handR), handMat);
      hand.add(hm);
      if (hk === 'claw') {
        const up = new THREE.SphereGeometry(b.handR * 1.1, 7, 5); up.scale(0.8, 0.55, 1.3); up.translate(0, 0, b.handR * 0.9);
        const pin = P.pivot('pincer', P.mesh(up, P.toon(d.clawTip || darken(d.handColor || skin, 0.1))), [0, b.handR * 0.4, 0]);
        hand.add(pin);
        this['pincer' + s] = pin;
      }
      // grip point for held props
      J['grip' + s] = P.pivot('grip' + s, null, [0, -b.handR * 0.9, b.handR * 0.25]);
      hand.add(J['grip' + s]);
    }
    // neck + head
    const neck = (J.neck = P.pivot('neck', null, [0, b.neckY, 0]));
    chest.add(neck);
    const head = (J.head = P.pivot('head'));
    neck.add(head);
    const hr = b.headR, hs = b.headScale;
    const headY = hr * hs[1] * 0.92;
    this.headY = headY;
    const hg = new THREE.SphereGeometry(hr, 18, 13);
    hg.rotateY(-Math.PI / 2); // texture front (u = 0.5) faces +z
    hg.scale(hs[0], hs[1], hs[2]);
    hg.translate(0, headY, 0);
    const headSkin = skinTex({ color: skin, ...(d.skinMarks || {}) });
    const hm = P.mesh(hg, P.texMat(headSkin));
    hm.name = 'headMesh';
    head.add(hm);
    // face
    const fs = { skin, ...(d.face || {}) };
    this.face = new Face(fs);
    const decal = makeFaceDecal(this.face, { r: hr, scale: hs, azi: d.faceAzi ?? 1.1, elevLo: d.faceLo ?? -0.45, elevHi: d.faceHi ?? 1.15 });
    decal.position.y = headY;
    head.add(decal);
    this.decal = decal;
    // ears
    if (d.ears && d.ears !== 'none') {
      const ek = d.ears;
      const earY = headY + hr * hs[1] * (ek === 'monkey' || ek === 'deer' ? 0.1 : 0.62);
      const earX = hr * hs[0] * (ek === 'monkey' ? 1.0 : ek === 'deer' ? 0.82 : ek === 'otter' ? 0.72 : 0.58);
      for (const side of [-1, 1]) {
        const s = side < 0 ? 'R' : 'L';
        const em = P.earMesh(ek, d.earColor || skin, d.earInner || lighten(skin, 0.35), side, d.earScale ?? 1);
        const ep = (J['ear' + s] = P.pivot('ear' + s, em, [side * earX, earY, -0.01]));
        if (ek === 'otter' || ek === 'round' || ek === 'tanuki' || ek === 'bear') ep.rotation.z = -side * 0.5;
        head.add(ep);
      }
    }
    // snout / beak / nose
    if (d.snout) {
      const sn = d.snout;
      const g = P.ellipsoid(sn.r ?? 0.07, sn.sx ?? 1.1, sn.sy ?? 0.75, sn.sz ?? 1.0, 9, 7);
      g.translate(0, headY + (sn.y ?? -0.06), hr * hs[2] * 0.88 + (sn.z ?? 0));
      head.add(P.mesh(g, P.toon(sn.color || lighten(skin, 0.3))));
      if (sn.nose) {
        const ng = P.ellipsoid(sn.noseR ?? 0.022, 1.2, 0.8, 0.9, 7, 5);
        ng.translate(0, headY + (sn.y ?? -0.06) + (sn.r ?? 0.07) * 0.45, hr * hs[2] * 0.88 + (sn.z ?? 0) + (sn.r ?? 0.07) * (sn.sz ?? 1) * 0.85);
        head.add(P.mesh(ng, P.toon(sn.nose, { rim: 0.4 })));
      }
    }
    if (d.longNose) { // tengu
      const ln = d.longNose;
      const g = new THREE.CylinderGeometry(ln.tip ?? 0.018, ln.base ?? 0.04, ln.len ?? 0.2, 8);
      g.rotateX(Math.PI / 2 + (ln.droop ?? -0.15));
      g.translate(0, headY - 0.02, hr * hs[2] + (ln.len ?? 0.2) * 0.42);
      head.add(P.mesh(g, P.toon(ln.color || skin)));
    }
    if (d.beak) { // kappa
      const bk = d.beak;
      const g = P.ellipsoid(0.065, 1.25, 0.55, 1.0, 9, 6);
      g.translate(0, headY - 0.07, hr * hs[2] * 0.86);
      head.add(P.mesh(g, P.toon(bk.color || '#e8c040')));
    }
    if (d.dish) { // kappa head dish with water
      const rim = new THREE.CylinderGeometry(0.1, 0.085, 0.025, 12); rim.translate(0, headY + hr * hs[1] * 0.97, 0);
      head.add(P.mesh(rim, P.toon('#f0ece0')));
      const w = new THREE.CircleGeometry(0.085, 12); w.rotateX(-Math.PI / 2); w.translate(0, headY + hr * hs[1] * 0.97 + 0.013, 0);
      const wm = P.mesh(w, P.toon('#8ad0f0', { rim: 0.5 }), { cast: false });
      head.add(wm);
      // hair fringe
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const hgf = new THREE.ConeGeometry(0.035, 0.08, 4); hgf.rotateX(Math.PI); hgf.rotateZ(Math.cos(a) * 0.6); hgf.rotateX(-Math.sin(a) * 0.6);
        hgf.translate(Math.cos(a) * 0.115, headY + hr * hs[1] * 0.82, Math.sin(a) * 0.115);
        head.add(P.mesh(hgf, P.toon(d.hairColor || '#3a6a4a')));
      }
    }
    if (d.crabHead) { // carapace rim + eyestalks
      const cr = new THREE.TorusGeometry(hr * 1.02, 0.025, 4, 14, Math.PI); cr.rotateZ(Math.PI); cr.rotateX(Math.PI / 2 - 0.25); cr.scale(hs[0], 1, hs[2]); cr.translate(0, headY + 0.02, 0);
      head.add(P.mesh(cr, P.toon(darken(skin, 0.15))));
      for (const side of [-1, 1]) {
        const st = new THREE.CylinderGeometry(0.012, 0.015, 0.09, 6); st.translate(side * 0.07, headY + hr * hs[1] + 0.03, 0.04);
        head.add(P.mesh(st, P.toon(skin)));
        const bead = new THREE.SphereGeometry(0.024, 8, 6); bead.translate(side * 0.07, headY + hr * hs[1] + 0.085, 0.04);
        head.add(P.mesh(bead, P.toon('#2a1a24', { rim: 0.6 })));
      }
    }
    if (d.cheekFluff) {
      for (const side of [-1, 1]) {
        const g = new THREE.ConeGeometry(0.05, 0.1, 4); g.rotateZ(side * Math.PI / 2); g.scale(1, 1, 0.5);
        g.translate(side * hr * hs[0] * 0.98, headY - hr * 0.3, 0.02);
        head.add(P.mesh(g, P.toon(d.cheekFluff)));
      }
    }
    if (d.hair) this.addHair(d.hair, head, headY);
    if (d.mustache) {
      const m = P.mustacheMesh(d.mustache, 1);
      m.position.set(0, headY - hr * 0.42, hr * hs[2] * 0.97);
      head.add(m);
    }
    if (d.glasses) {
      const g = P.glassesMesh(1, d.glasses === true ? {} : d.glasses);
      g.position.set(0, headY + hr * 0.05, hr * hs[2] * 1.04);
      head.add(g);
      this.glasses = g;
    }
    if (d.hat) this.addHat(d.hat, head, headY);
    if (d.ribbons) for (const r of d.ribbons) {
      const rb = P.ribbonMesh(r.color || '#d8342e', r.scale ?? 1);
      rb.position.set(r.x ?? 0, headY + (r.y ?? 0.15), r.z ?? 0);
      rb.rotation.set(r.rx ?? 0, r.ry ?? 0, r.rz ?? 0);
      head.add(rb);
    }
    if (d.earbuds) { const eb = P.earbudsMesh(1); eb.position.y = headY; head.add(eb); }
    if (d.hood) {
      // hood up: a soft shell over the top/back of the head, open at the face
      const g = new THREE.SphereGeometry(hr * 1.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.78);
      g.rotateX(-0.55);
      g.scale(hs[0], hs[1], hs[2] * 1.02);
      // open the face: drop the front verts back
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (z > hr * 0.45 && y < hr * 0.75) p.setZ(i, hr * 0.45 + (z - hr * 0.45) * 0.15); }
      g.computeVertexNormals();
      g.translate(0, headY + 0.01, -0.012);
      const col = d.hoodColor || d.sleeve || '#4c5b84';
      const hood = P.mesh(g, P.toon(col, { side: THREE.DoubleSide }));
      hood.visible = false;
      head.add(hood);
      this.hoodMesh = hood;
    }
    if (d.scarf) {
      const g = new THREE.TorusGeometry(b.torsoTop * 0.92, 0.03, 5, 12); g.rotateX(Math.PI / 2); g.scale(1, 1, b.torsoDepth);
      const sm = P.mesh(g, P.toon(d.scarf));
      sm.position.y = 0.0;
      chest.add(sm);
    }
    // blob shadow
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), blobShadowMat(0.3));
    bs.rotation.x = -Math.PI / 2;
    bs.position.y = 0.012;
    bs.renderOrder = 1;
    bs.scale.setScalar((b.torsoBot * 2.6) * this.scale / 0.5);
    this.blob = bs;
    this.root.add(bs);
    // height for bubbles etc.
    this.height = (b.hipY + b.torsoH + b.neckY + headY + hr * hs[1]) * this.scale;
    this.root.traverse((o) => { if (o.isMesh) o.userData.character = this; });
  }

  addHair(h, head, headY) {
    const hr = this.b.headR, hs = this.b.headScale;
    const col = h.color || '#3a2a2a';
    if (h.type === 'bob') {
      const g = new THREE.SphereGeometry(hr * 1.07, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62);
      g.scale(hs[0], hs[1] * 1.02, hs[2] * 1.02);
      // cut the fringe: push front-bottom verts up
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (z > hr * 0.55 && y < hr * 0.45) p.setY(i, Math.max(y, hr * 0.42 + (z - hr) * 0.4)); }
      g.computeVertexNormals();
      g.translate(0, headY + 0.008, -0.005);
      head.add(P.mesh(g, P.toon(col)));
    } else if (h.type === 'tuft') {
      for (let i = 0; i < 3; i++) {
        const g = new THREE.ConeGeometry(0.035, 0.09, 4); g.rotateZ((i - 1) * 0.4); g.translate((i - 1) * 0.035, headY + hr * hs[1] + 0.03, 0.04);
        head.add(P.mesh(g, P.toon(col)));
      }
    } else if (h.type === 'fringe') { // white side fringe (grandpa)
      for (const side of [-1, 1]) {
        const g = P.ellipsoid(0.07, 0.6, 1.0, 1.2, 7, 5); g.translate(side * hr * hs[0] * 0.95, headY + 0.0, -0.03);
        head.add(P.mesh(g, P.toon(col)));
      }
    } else if (h.type === 'mane') { // tengu: big white mane
      const g = new THREE.IcosahedronGeometry(hr * 1.25, 1); g.scale(1.1, 0.9, 1.0); g.translate(0, headY + 0.02, -0.07);
      head.add(P.mesh(g, P.toon(col)));
      if (h.beard) {
        const bd = new THREE.ConeGeometry(0.1, 0.2, 6); bd.rotateX(Math.PI); bd.translate(0, headY - hr * 0.95, hr * 0.55);
        head.add(P.mesh(bd, P.toon(col)));
      }
    }
  }
  addHat(h, head, headY) {
    const hr = this.b.headR, hs = this.b.headScale;
    let m = null;
    if (h.type === 'beanie') m = P.beanieMesh(h.color, 1, h);
    else if (h.type === 'cap') m = P.capMesh(h.color, 1, h);
    else if (h.type === 'straw') m = P.strawHatMesh(1);
    else if (h.type === 'chef') m = P.chefHatMesh(1);
    else if (h.type === 'tokin') { // tiny black yamabushi cap
      const g = new THREE.CylinderGeometry(0.03, 0.07, 0.07, 6); m = new THREE.Group(); m.add(P.mesh(g, P.toon('#1a1a22')));
    } else if (h.type === 'waitress') {
      const g = new THREE.BoxGeometry(0.2, 0.05, 0.06); g.translate(0, 0.02, 0); m = new THREE.Group(); m.add(P.mesh(g, P.toon('#ffffff')));
      const st = new THREE.BoxGeometry(0.205, 0.015, 0.062); st.translate(0, 0.03, 0); m.add(P.mesh(st, P.toon(h.color || '#d8342e')));
    } else if (h.type === 'hairband') {
      const g = new THREE.TorusGeometry(hr * 1.02, 0.012, 4, 14, Math.PI); g.rotateY(Math.PI / 2); g.rotateZ(Math.PI / 2); m = new THREE.Group(); m.add(P.mesh(g, P.toon(h.color)));
      m.scale.set(hs[0], hs[1], hs[2]);
    }
    if (!m) return;
    m.position.set(0, headY + hr * hs[1] * (h.type === 'tokin' ? 0.92 : h.type === 'waitress' ? 0.85 : h.type === 'hairband' ? 0.1 : 0.42), h.type === 'tokin' ? 0.06 : 0);
    if (h.tilt) m.rotation.x = h.tilt;
    if (h.roll) m.rotation.z = h.roll;
    head.add(m);
    this.hat = m;
  }

  // ------------------------------------------------------------ placement
  get object3d() { return this.root; }
  setPos(x, z, y = this.y) { this.x = x; this.z = z; this.y = y; this.root.position.set(x, y, z); this._lastX = x; this._lastZ = z; return this; }
  face(yaw) { this.yawGoal = yaw; return this; }
  faceTo(x, z) { this.yawGoal = Math.atan2(x - this.x, z - this.z); return this; }
  faceNow(yaw) { this.yaw = this.yawGoal = yaw; this.root.rotation.y = yaw; return this; }
  setExpr(name, { react = true } = {}) {
    if (name === this.expr) return this;
    const prev = this.expr;
    this.expr = name;
    this.face.set(name);
    if (react) {
      // physical reactions to a change of heart
      if (['surprised', 'shocked', 'scared'].includes(name)) this.squash(-0.18);
      else if (['happy', 'joy', 'excited', 'love'].includes(name) && !['happy', 'joy', 'excited'].includes(prev)) this.squash(-0.12);
      else if (['angry', 'furious'].includes(name)) this.squash(0.1);
      else if (['embarrassed', 'flustered'].includes(name)) this.squash(0.12);
    }
    return this;
  }
  lookAt(target, w = 1) { this.lookTarget = target; this.lookW = w; return this; }
  squash(k) { this.sq.v += k * 14; return this; }
  setHood(up) { if (this.hoodMesh) this.hoodMesh.visible = !!up; return this; }
  setPose(p) { this.poseTarget = p; return this; }

  // ------------------------------------------------------------ movement
  walkTo(x, z, { nav = null, run = false, face = null } = {}) {
    let pts = [{ x, z }];
    if (nav) { const p = nav.path(this.x, this.z, x, z); if (p && p.length) pts = p; }
    this.path = pts;
    this.running = run;
    this.faceOnArrive = face;
    if (this.pathResolve) this.pathResolve(false);
    return new Promise((res) => { this.pathResolve = res; });
  }
  stop() { this.path = null; if (this.pathResolve) { const r = this.pathResolve; this.pathResolve = null; r(false); } }
  get moving() { return !!this.path; }

  // ------------------------------------------------------------ props
  hold(obj, where = 'R') {
    this.drop(where);
    const anchor = where === 'both' ? this.j.carry : where === 'head' ? this.j.head : where === 'L' ? this.j.gripL : this.j.gripR;
    anchor.add(obj);
    this.held[where] = obj;
    return obj;
  }
  drop(where = 'R') {
    const o = this.held[where];
    if (o && o.parent) o.parent.remove(o);
    this.held[where] = null;
    return o;
  }
  // world position of a hand grip / carry anchor
  anchorPos(where = 'R', out = new THREE.Vector3()) {
    const a = where === 'both' ? this.j.carry : where === 'head' ? this.j.head : where === 'L' ? this.j.gripL : this.j.gripR;
    this.root.updateMatrixWorld(true);
    return a.getWorldPosition(out);
  }
  headPos(out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    this.j.head.getWorldPosition(out);
    out.y += (this.headY + this.b.headR) * this.scale;
    return out;
  }

  // ------------------------------------------------------------ actions
  // play a procedural action; resolves when done (or immediately for loops,
  // which run until stopAction()). opts are passed to the action.
  play(name, opts = {}) {
    const fn = ACTIONS[name];
    if (!fn) { console.warn('no action', name); return Promise.resolve(); }
    if (this.action && this.action.resolve) this.action.resolve();
    return new Promise((resolve) => {
      this.action = { name, fn, t: 0, opts, resolve, w: 0, dur: opts.dur ?? fn.dur ?? 1, loop: opts.loop ?? fn.loop ?? false, fired: {} };
    });
  }
  stopAction() { if (this.action) { const r = this.action.resolve; this.action.ending = true; this.action.endT = 0; r && r(); } }
  get busy() { return !!this.action && !this.action.ending; }

  // say: mouth flaps for a line of text (the dialogue system calls talk() per character)
  talk(ch) {
    const v = visemeFor(ch);
    if (v) { this.face.talk(v); this.talking = 0.12; }
  }

  // ------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    const d = this.def, b = this.b;
    // --- path following
    let targetSpeed = 0;
    if (this.path && this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - this.x, dz = tgt.z - this.z;
      const dist = Math.hypot(dx, dz);
      const maxV = this.running ? this.runSpeed : this.moveSpeed;
      if (dist < 0.06) {
        this.path.shift();
        if (!this.path.length) {
          this.path = null;
          if (this.faceOnArrive != null) this.yawGoal = this.faceOnArrive;
          const r = this.pathResolve; this.pathResolve = null; r && r(true);
        }
      } else {
        const want = Math.atan2(dx, dz);
        this.yawGoal = want;
        const turnOk = Math.abs(angleDiff(this.yaw, want)) < 1.2 ? 1 : 0.35;
        targetSpeed = maxV * turnOk * (this.path.length === 1 ? clamp(dist / 0.35, 0.35, 1) : 1);
        const step = Math.min(dist, this.speed * dt);
        this.x += (dx / dist) * step;
        this.z += (dz / dist) * step;
      }
    }
    this.speed = damp(this.speed, targetSpeed, targetSpeed > this.speed ? 10 : 14, dt);
    this.yaw = dampAngle(this.yaw, this.yawGoal, 12, dt);
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    const mvx = (this.x - this._lastX) / Math.max(dt, 1e-4), mvz = (this.z - this._lastZ) / Math.max(dt, 1e-4);
    this._lastX = this.x; this._lastZ = this.z;
    this._vel.set(mvx, mvz);

    // --- pose targets
    const T = zeroPose();
    const spd = this.speed;
    const runK = clamp((spd - this.moveSpeed) / Math.max(0.1, this.runSpeed - this.moveSpeed), 0, 1);
    const walkK = clamp(spd / 0.3, 0, 1);
    this.phase += dt * (spd / (0.34 * this.scale)) * Math.PI;
    const ph = this.phase;
    // base pose
    this.applyBasePose(T, this.poseTarget);
    // locomotion
    if (walkK > 0.001) {
      const A = lerp(0.55, 0.95, runK) * walkK;
      const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
      T.hipL[0] += -sL * A; T.hipR[0] += -sR * A;
      T.kneeL[0] += Math.max(0, Math.cos(ph)) * (0.9 + runK * 0.6) * walkK;
      T.kneeR[0] += Math.max(0, Math.cos(ph + Math.PI)) * (0.9 + runK * 0.6) * walkK;
      T.footL[0] += sL * 0.25 * walkK; T.footR[0] += sR * 0.25 * walkK;
      const armA = lerp(0.5, 1.0, runK) * walkK;
      T.shoulderL[0] += sL * armA; T.shoulderR[0] += sR * armA;
      T.elbowL[0] += -(0.25 + runK * 0.9) * walkK; T.elbowR[0] += -(0.25 + runK * 0.9) * walkK;
      T.spine[0] += (0.05 + runK * 0.22) * walkK;
      T.spine[1] += Math.sin(ph) * 0.1 * walkK;
      T.spine[2] += Math.sin(ph) * (d.waddle ?? 0.04) * walkK;
      T.head[1] += -Math.sin(ph) * 0.06 * walkK;
      T.root.y += Math.abs(Math.cos(ph)) * (0.025 + runK * 0.04) * walkK * this.scale;
      T.tail[1] += Math.sin(ph) * 0.3 * walkK;
    }
    // faces tilt a touch up towards the (high) camera so they read
    T.head[0] -= this.def.faceUp ?? 0.12;
    // idle: breathing + weight shift + occasional fidget
    const br = Math.sin(this.t * 1.9);
    T.spine[0] += br * 0.015;
    T.chest[0] += -br * 0.02;
    T.shoulderL[2] += 0.08 + br * 0.015; T.shoulderR[2] += -0.08 - br * 0.015;
    T.head[0] += br * 0.015;
    if (walkK < 0.2 && this.poseTarget === 'stand') {
      const ws = Math.sin(this.t * 0.35) * 0.04;
      T.spine[2] += ws; T.head[2] -= ws * 0.6;
      T.hipL[2] += ws * 0.3; T.hipR[2] += ws * 0.3;
    }
    // body language from expression
    this.applyMood(T, walkK);
    // talking: little head bobs
    if (this.talking > 0) {
      this.talking -= dt;
      T.head[0] += Math.sin(this.t * 18) * 0.03;
      T.head[2] += Math.sin(this.t * 7) * 0.02;
      if (this.talking <= 0) this.face.talk(null);
    }
    // look-at
    if (this.lookTarget && this.lookW > 0) {
      const lt = typeof this.lookTarget === 'function' ? this.lookTarget() : this.lookTarget;
      const tp = lt.isObject3D ? lt.getWorldPosition(_v) : _v.set(lt.x, lt.y ?? 1, lt.z);
      if (lt.isCharacter || lt.root) { /* handled by caller */ }
      const hx = tp.x - this.x, hz = tp.z - this.z;
      const yawRel = angleDiff(this.yaw, Math.atan2(hx, hz));
      const hy = (tp.y ?? 1) - (this.y + this.height * 0.8);
      const pitch = -Math.atan2(hy, Math.hypot(hx, hz));
      const turn = clamp(yawRel, -1.1, 1.1) * this.lookW;
      T.head[1] += turn * 0.75; T.neck[1] += turn * 0.25;
      T.head[0] += clamp(pitch, -0.5, 0.6) * this.lookW;
      this.face.look(clamp((yawRel - turn) * 1.5, -1, 1), clamp(pitch * 1.5, -1, 1));
      // turn the body if the target is far behind
      if (Math.abs(yawRel) > 1.5 && !this.path && !this.action && this.lookW >= 1) this.yawGoal = this.yaw + yawRel;
    }
    // action
    const A = this.action;
    if (A) {
      A.t += dt;
      const fn = A.fn;
      const blendIn = fn.blend ?? 0.18;
      if (A.ending) { A.endT += dt; A.w = Math.max(0, 1 - A.endT / blendIn); }
      else A.w = Math.min(1, A.t / blendIn);
      const u = A.loop ? A.t : clamp(A.t / A.dur, 0, 1);
      const out = zeroPose();
      fn(this, u, A, out, dt);
      const w = smooth(A.w);
      const mask = fn.mask || JOINTS;
      for (const j of mask) {
        const o = out[j];
        if (!o) continue;
        if (fn.additive) { T[j][0] += o[0] * w; T[j][1] += o[1] * w; T[j][2] += o[2] * w; }
        else { T[j][0] = lerp(T[j][0], o[0], w); T[j][1] = lerp(T[j][1], o[1], w); T[j][2] = lerp(T[j][2], o[2], w); }
      }
      T.root.y += out.root.y * w;
      T.root.yaw += out.root.yaw * w;
      if (!A.loop && !A.ending && A.t >= A.dur) {
        A.ending = true; A.endT = 0;
        const r = A.resolve; A.resolve = null; r && r();
      }
      if (A.ending && A.endT >= blendIn) this.action = null;
    } else if (walkK < 0.1 && this.poseTarget === 'stand' && !this.lookTarget) {
      // idle fidgets
      this.idleT -= dt;
      if (this.idleT <= 0) {
        this.idleT = 4 + Math.random() * 7;
        const pool = d.idles || ['lookAround', 'stretchSmall', 'shift'];
        const name = pool[Math.floor(Math.random() * pool.length)];
        if (ACTIONS[name]) this.play(name);
      }
    }
    // --- apply with damping
    const k = 1 - Math.exp(-(A && A.fn.snap ? 26 : 16) * dt);
    const C = this.cur;
    for (const j of JOINTS) {
      const c = C[j], t = T[j];
      c[0] += (t[0] - c[0]) * k; c[1] += (t[1] - c[1]) * k; c[2] += (t[2] - c[2]) * k;
      const g = this.j[j];
      if (g) g.rotation.set(c[0], c[1], c[2]);
    }
    C.root.y += (T.root.y - C.root.y) * k;
    // squash & stretch spring
    const sq = spring(this.sq, 0, 220, 0.32, dt);
    const sy = 1 + clamp(-sq, -0.35, 0.45), sxz = 1 / Math.sqrt(Math.max(0.4, sy));
    this.body.scale.set(this.scale * sxz, this.scale * sy, this.scale * sxz);
    this.body.position.y = C.root.y;
    this.body.rotation.y = T.root.yaw;
    // secondary: ears + tail springs react to motion
    const accel = this._vel.length();
    const ts = spring(this.springs.tail, clamp(accel * 0.15, 0, 0.5), 60, 0.25, dt);
    if (this.tailSegs) this.tailSegs.forEach((s, i) => {
      s.rotation.x = (i ? 0.15 : 0) + ts * 0.3 * (i + 1) * 0.5 + Math.sin(this.t * 2 + i) * 0.04;
      s.rotation.y = Math.sin(this.t * 1.6 + i * 0.6) * 0.12 * (i + 1) * 0.5 + C.tail[1] * (i + 1) * 0.3;
    });
    const eb = spring(this.springs.earL, clamp(accel * 0.1, 0, 0.4) + (this.squashEars ?? 0), 90, 0.2, dt);
    if (this.j.earL) this.j.earL.rotation.x = -eb * 0.5 + C.earL[0];
    if (this.j.earR) this.j.earR.rotation.x = -eb * 0.5 + C.earR[0];
    // wings idle flutter
    if (this.wings) this.wings.forEach((w, i) => { const s = i ? 1 : -1; w.rotation.y = s * (0.45 + (this.flap || 0) * Math.sin(this.t * 14) * 0.6) + s * Math.sin(this.t * 1.3) * 0.03; });
    // face
    this.face.update(dt);
    // blob shadow follows the ground under the body
    this.blob.visible = this.visible;
  }

  // standing / sitting / kneeling bases
  applyBasePose(T, pose) {
    switch (pose) {
      case 'sit': // on a chair (seat ~0.25 above the feet's ground)
        T.hipL[0] = T.hipR[0] = -1.45; T.kneeL[0] = T.kneeR[0] = 1.45;
        T.root.y = -0.02;
        T.shoulderL[0] = T.shoulderR[0] = -0.25; T.elbowL[0] = T.elbowR[0] = -0.6;
        break;
      case 'seiza': // kneeling on tatami
        T.hipL[0] = T.hipR[0] = -0.2; T.kneeL[0] = T.kneeR[0] = 2.6;
        T.footL[0] = T.footR[0] = 0.9;
        T.root.y = -(this.b.thigh + this.b.shin) * 0.82 * this.scale;
        T.shoulderL[0] = T.shoulderR[0] = -0.35; T.elbowL[0] = T.elbowR[0] = -0.7;
        T.shoulderL[2] = 0.15; T.shoulderR[2] = -0.15;
        break;
      case 'floor': // sitting on the floor, legs forward
        T.hipL[0] = T.hipR[0] = -1.5; T.hipL[2] = 0.2; T.hipR[2] = -0.2;
        T.kneeL[0] = T.kneeR[0] = 0.2;
        T.root.y = -this.b.hipY * 0.9 * this.scale;
        T.spine[0] = -0.1;
        T.shoulderL[0] = T.shoulderR[0] = 0.3; T.shoulderL[2] = 0.3; T.shoulderR[2] = -0.3;
        break;
      case 'crouch':
        T.hipL[0] = T.hipR[0] = -1.4; T.kneeL[0] = T.kneeR[0] = 2.2; T.footL[0] = T.footR[0] = -0.6;
        T.root.y = -this.b.hipY * 0.62 * this.scale; T.spine[0] = 0.45; T.head[0] = -0.3;
        break;
      case 'lie': // on a futon, on the back
        T.root.y = 0.0;
        T.spine[0] = 0; T.hipL[0] = T.hipR[0] = 0;
        break;
      case 'hunch': // old folks
        T.spine[0] = 0.18; T.head[0] = -0.15; T.kneeL[0] = T.kneeR[0] = 0.12; T.hipL[0] = T.hipR[0] = -0.1;
        break;
      default: break;
    }
    if (this.def.hunch && pose === 'stand') { T.spine[0] += this.def.hunch; T.head[0] -= this.def.hunch * 0.8; }
  }

  // expression-driven body language
  applyMood(T, walkK) {
    const e = this.expr;
    const t = this.t;
    switch (e) {
      case 'sad': case 'verySad': case 'hollow': case 'tired': case 'left_out':
        T.head[0] += e === 'verySad' ? 0.38 : 0.24; T.spine[0] += 0.1;
        T.shoulderL[2] -= 0.06; T.shoulderR[2] += 0.06; T.shoulderL[0] -= 0.08; T.shoulderR[0] -= 0.08;
        T.earL[0] += 0.5; T.earR[0] += 0.5; T.tail[0] += 0.3;
        break;
      case 'crying':
        T.head[0] += 0.3; T.spine[0] += 0.15;
        T.shoulderL[0] = -1.9; T.shoulderR[0] = -1.9; T.elbowL[0] = -1.6; T.elbowR[0] = -1.6;
        T.shoulderL[2] = 0.35; T.shoulderR[2] = -0.35;
        T.root.y += Math.abs(Math.sin(t * 9)) * 0.008;
        break;
      case 'happy': case 'joy': case 'excited':
        T.head[2] += Math.sin(t * 2.2) * 0.08; T.spine[0] -= 0.04;
        if (e === 'excited' && walkK < 0.2) { T.root.y += Math.abs(Math.sin(t * 7)) * 0.04 * this.scale; T.shoulderL[2] += 0.6; T.shoulderR[2] -= 0.6; }
        T.tail[1] += Math.sin(t * 9) * 0.5;
        break;
      case 'angry': case 'furious': case 'grumpy': case 'annoyed':
        T.spine[0] += 0.12; T.head[0] -= 0.08;
        T.elbowL[0] -= 1.0; T.elbowR[0] -= 1.0; T.shoulderL[0] -= 0.25; T.shoulderR[0] -= 0.25;
        if (e === 'furious') { T.root.y += Math.abs(Math.sin(t * 25)) * 0.01; T.spine[2] += Math.sin(t * 30) * 0.03; }
        T.earL[0] -= 0.4; T.earR[0] -= 0.4;
        break;
      case 'embarrassed': case 'shy': case 'flustered':
        T.head[0] += 0.22; T.head[2] += 0.15; T.spine[2] += Math.sin(t * 2.5) * 0.05;
        T.shoulderL[0] += 0.3; T.shoulderR[0] += 0.3; T.elbowL[0] -= 0.4; T.elbowR[0] -= 0.4;
        T.shoulderL[2] -= 0.15; T.shoulderR[2] += 0.15;
        T.earL[0] += 0.4; T.earR[0] += 0.4;
        break;
      case 'surprised': case 'shocked': case 'scared':
        T.spine[0] -= 0.12; T.head[0] -= 0.1;
        T.shoulderL[2] += 0.35; T.shoulderR[2] -= 0.35; T.elbowL[0] -= 0.7; T.elbowR[0] -= 0.7;
        if (e === 'scared') T.root.y += Math.sin(t * 40) * 0.004;
        T.earL[0] -= 0.3; T.earR[0] -= 0.3;
        break;
      case 'proud': case 'smug':
        T.spine[0] -= 0.1; T.head[0] -= 0.12;
        T.shoulderL[2] += 0.25; T.shoulderR[2] -= 0.25; T.elbowL[0] -= 1.3; T.elbowR[0] -= 1.3;
        T.elbowL[1] = -0.6; T.elbowR[1] = 0.6;
        break;
      case 'thinking':
        T.head[2] += 0.15; T.head[0] -= 0.08;
        T.shoulderR[0] = -1.1; T.elbowR[0] = -2.0; T.shoulderR[2] = 0.2;
        break;
      case 'awkward': case 'confused':
        T.head[2] += 0.12;
        T.shoulderR[0] = -2.4; T.elbowR[0] = -1.7; T.shoulderR[2] = -0.5;
        T.handR[0] = Math.sin(t * 10) * 0.3;
        break;
      case 'sleepy': case 'asleep':
        T.head[0] += 0.3 + Math.sin(t * 0.8) * 0.05; T.spine[0] += 0.08;
        break;
      case 'love': case 'dreamy':
        T.head[2] += Math.sin(t * 1.5) * 0.1; T.spine[2] += Math.sin(t * 1.5) * 0.04;
        T.shoulderL[0] -= 0.6; T.shoulderR[0] -= 0.6; T.elbowL[0] -= 1.2; T.elbowR[0] -= 1.2; T.shoulderL[2] -= 0.3; T.shoulderR[2] += 0.3;
        break;
      default: break;
    }
  }

  dispose() { this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
}

// ===================================================================== actions
// fn(rig, u, A, out, dt): u = normalised time (0..1), or seconds for loops.
// Write joint targets into `out` (absolute, unless fn.additive).
const ACTIONS = {};
function def(name, fn, props = {}) { Object.assign(fn, props); ACTIONS[name] = fn; }
const sin = Math.sin, cos = Math.cos, PI = Math.PI;
const hump = (u, a, b) => (u <= a || u >= b ? 0 : sin(((u - a) / (b - a)) * PI));

def('wave', (r, u, A, o) => {
  const s = A.opts.hand === 'L' ? 'L' : 'R';
  o['shoulder' + s] = [-0.4, 0, s === 'R' ? -2.5 : 2.5];
  o['elbow' + s] = [-0.3, 0, 0];
  o['hand' + s] = [0, 0, sin(u * PI * 8) * 0.5];
  o.head = [0, 0, s === 'R' ? 0.12 : -0.12];
}, { dur: 1.4, mask: ['shoulderR', 'elbowR', 'handR', 'shoulderL', 'elbowL', 'handL', 'head'] });

def('bow', (r, u, A, o) => {
  const k = hump(u, 0, 1) > 0 ? Math.min(1, u / 0.25) * Math.min(1, (1 - u) / 0.3) : 0;
  const deep = A.opts.deep ? 0.9 : 0.55;
  o.spine = [deep * k, 0, 0]; o.head = [0.3 * k, 0, 0];
  o.shoulderL = [0.15 * k, 0, 0.05]; o.shoulderR = [0.15 * k, 0, -0.05];
  o.hipL = [-0.15 * k, 0, 0]; o.hipR = [-0.15 * k, 0, 0];
}, { dur: 1.3, mask: ['spine', 'head', 'shoulderL', 'shoulderR', 'hipL', 'hipR'] });

def('nod', (r, u, A, o) => { o.head = [sin(u * PI * 4) * 0.22, 0, 0]; }, { dur: 0.7, additive: true, mask: ['head'] });
def('shake', (r, u, A, o) => { o.head = [0, sin(u * PI * 6) * 0.35, 0]; }, { dur: 0.8, additive: true, mask: ['head'] });
def('headTilt', (r, u, A, o) => { const k = hump(u, 0, 1); o.head = [0, 0, (A.opts.side ?? 1) * 0.35 * Math.min(1, k * 2)]; }, { dur: 1.2, additive: true, mask: ['head'] });

def('lookAround', (r, u, A, o) => {
  o.head = [0, sin(u * PI * 2) * 0.6, 0]; o.neck = [0, sin(u * PI * 2) * 0.2, 0];
}, { dur: 2.4, additive: true, mask: ['head', 'neck'] });
def('stretchSmall', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderL = [-2.6 * k, 0, 0.3 * k]; o.shoulderR = [-2.6 * k, 0, -0.3 * k];
  o.spine = [-0.15 * k, 0, 0]; o.head = [-0.25 * k, 0, 0];
}, { dur: 1.8, additive: true, mask: ['shoulderL', 'shoulderR', 'spine', 'head'] });
def('shift', (r, u, A, o) => { const k = hump(u, 0, 1); o.spine = [0, 0, 0.08 * k]; o.hipL = [0, 0, 0.08 * k]; }, { dur: 1.2, additive: true, mask: ['spine', 'hipL'] });
def('checkPhone', (r, u, A, o) => {
  const k = Math.min(1, u * 5) * Math.min(1, (1 - u) * 5);
  o.shoulderR = [-1.0 * k, 0, 0.25 * k]; o.elbowR = [-1.3 * k, 0, 0]; o.head = [0.35 * k, 0, 0];
}, { dur: 3, additive: true, mask: ['shoulderR', 'elbowR', 'head'] });

// holding the phone up in front of the face (loop)
def('phone', (r, u, A, o) => {
  o.shoulderR = [-0.95, 0.2, 0.15]; o.elbowR = [-1.55, 0, 0]; o.handR = [-0.2, 0, 0];
  o.shoulderL = [-0.5, 0, 0.05]; o.elbowL = [-1.3, 0, 0];
  o.head = [0.42, 0, 0];
  if (A.opts.scroll) o.handR = [-0.2 + Math.sin(u * 3) * 0.05, 0, 0];
}, { loop: true, mask: ['shoulderR', 'elbowR', 'handR', 'shoulderL', 'elbowL', 'head'] });

// carrying something with both arms (loop)
def('carry', (r, u, A, o) => {
  const hi = A.opts.high ? 1 : 0;
  o.shoulderL = [-1.05 - hi * 0.6, 0, 0.3]; o.shoulderR = [-1.05 - hi * 0.6, 0, -0.3];
  o.elbowL = [-0.75, 0.25, 0]; o.elbowR = [-0.75, -0.25, 0];
  o.spine = [-0.06, 0, 0];
}, { loop: true, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'spine'] });

// holding a single item in front (loop): bento, cup, capsule
def('holdOut', (r, u, A, o) => {
  const s = A.opts.hand === 'L' ? 'L' : 'R';
  o['shoulder' + s] = [-0.9, 0, s === 'R' ? 0.25 : -0.25]; o['elbow' + s] = [-1.0, 0, 0];
}, { loop: true, mask: ['shoulderR', 'elbowR', 'shoulderL', 'elbowL'] });

def('pickup', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.spine = [0.75 * k, 0, 0]; o.head = [0.2 * k, 0, 0];
  o.hipL = [-0.55 * k, 0, 0]; o.hipR = [-0.55 * k, 0, 0]; o.kneeL = [1.0 * k, 0, 0]; o.kneeR = [1.0 * k, 0, 0];
  o.shoulderL = [-1.2 * k, 0, 0.15]; o.shoulderR = [-1.2 * k, 0, -0.15];
  o.root.y = -0.07 * k * r.scale;
  if (u > 0.5 && !A.fired.grab) { A.fired.grab = true; A.opts.onGrab && A.opts.onGrab(); }
}, { dur: 0.8 });

def('putdown', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.spine = [0.6 * k, 0, 0]; o.hipL = [-0.45 * k, 0, 0]; o.hipR = [-0.45 * k, 0, 0]; o.kneeL = [0.8 * k, 0, 0]; o.kneeR = [0.8 * k, 0, 0];
  o.shoulderL = [-1.1, 0, 0.3]; o.shoulderR = [-1.1, 0, -0.3]; o.elbowL = [-0.5, 0, 0]; o.elbowR = [-0.5, 0, 0];
  o.root.y = -0.06 * k * r.scale;
  if (u > 0.5 && !A.fired.rel) { A.fired.rel = true; A.opts.onRelease && A.opts.onRelease(); }
}, { dur: 0.8 });

// sweeping with a broom (held in both hands): loop, strokes left/right
def('sweep', (r, u, A, o) => {
  const s = sin(u * 7);
  o.spine = [0.3, s * 0.25, 0]; o.head = [0.25, -s * 0.15, 0];
  o.shoulderR = [-0.6 + s * 0.3, 0, -0.15]; o.elbowR = [-0.7, 0, 0];
  o.shoulderL = [-1.0 + s * 0.3, 0, 0.5]; o.elbowL = [-0.9, 0, 0];
  o.hipL = [-0.15, 0, 0]; o.hipR = [-0.15, 0, 0]; o.kneeL = [0.25, 0, 0]; o.kneeR = [0.25, 0, 0];
  o.root.y = -0.01;
  if (A.opts.onStroke) { const st = Math.floor(u * 7 / PI); if (st !== A.fired.st) { A.fired.st = st; A.opts.onStroke(st); } }
}, { loop: true });

// wiping a surface in circles with the right hand: loop
def('wipe', (r, u, A, o) => {
  const h = A.opts.height ?? 0.5; // 0 floor .. 1 head height
  const c = cos(u * 9), s = sin(u * 9);
  o.shoulderR = [-0.9 - h * 0.9 + s * 0.2, c * 0.2, -0.1 + c * 0.15]; o.elbowR = [-0.4 - s * 0.3, 0, 0];
  o.shoulderL = [-0.2, 0, 0.25]; o.elbowL = [-0.3, 0, 0];
  o.spine = [h < 0.3 ? 0.6 : 0.12, s * 0.06, 0]; o.head = [0.2, 0, 0];
  if (h < 0.3) { o.hipL = [-0.6, 0, 0]; o.hipR = [-0.6, 0, 0]; o.kneeL = [1.2, 0, 0]; o.kneeR = [1.2, 0, 0]; o.root.y = -0.07 * r.scale; }
}, { loop: true });

// hug: arms around something in front (loop until stopped)
def('hug', (r, u, A, o) => {
  const sq = A.opts.squeeze ? sin(u * 6) * 0.05 : 0;
  o.shoulderL = [-1.3, -0.9, 0.2]; o.shoulderR = [-1.3, 0.9, -0.2];
  o.elbowL = [-1.0 - sq, 0, 0]; o.elbowR = [-1.0 - sq, 0, 0];
  o.spine = [0.08, 0, 0]; o.head = [0.12, 0, A.opts.tilt ?? 0.2];
}, { loop: true, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'spine', 'head'] });

// limp arms being hugged -> slowly hugging back (opts.back 0..1 set externally)
def('beHugged', (r, u, A, o) => {
  const k = A.opts.back ?? 0;
  o.shoulderL = [lerp(0.1, -1.2, k), lerp(0, -0.8, k), lerp(0.05, 0.25, k)];
  o.shoulderR = [lerp(0.1, -1.2, k), lerp(0, 0.8, k), lerp(-0.05, -0.25, k)];
  o.elbowL = [lerp(0, -0.8, k), 0, 0]; o.elbowR = [lerp(0, -0.8, k), 0, 0];
  o.head = [0.15, 0, -0.15];
}, { loop: true, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'head'] });

// turning a gacha handle with the right hand (opts.turns)
def('crank', (r, u, A, o) => {
  const turns = A.opts.turns ?? 1;
  const a = u * turns * PI * 2;
  o.shoulderR = [-1.1 + sin(a) * 0.25, 0, -0.1 + cos(a) * 0.12]; o.elbowR = [-0.6 + cos(a) * 0.25, 0, 0];
  o.handR = [0, 0, -a * 0.25];
  o.shoulderL = [-0.4, 0, 0.3]; o.elbowL = [-0.5, 0, 0];
  o.spine = [0.18, 0.1, 0]; o.head = [0.15, 0.1, 0];
  const st = Math.floor(u * turns * 4);
  if (st !== A.fired.st) { A.fired.st = st; A.opts.onClick && A.opts.onClick(st); }
}, { dur: 1.4, snap: true });

def('insertCoin', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderR = [-1.35 * k, 0, -0.1]; o.elbowR = [-0.4 * k, 0, 0]; o.handR = [0, 0, -0.3 * k];
  o.spine = [0.1 * k, 0, 0]; o.head = [0.12 * k, 0, 0];
  if (u > 0.55 && !A.fired.c) { A.fired.c = true; A.opts.onInsert && A.opts.onInsert(); }
}, { dur: 0.7, mask: ['shoulderR', 'elbowR', 'handR', 'spine', 'head'] });

def('give', (r, u, A, o) => {
  const k = Math.min(1, u * 3) * Math.min(1, (1 - u) * 3);
  const s = A.opts.hand === 'L' ? 'L' : 'R';
  o['shoulder' + s] = [-1.3 * k, 0, 0]; o['elbow' + s] = [-0.25 * k, 0, 0];
  o.spine = [0.15 * k, 0, 0];
  if (u > 0.5 && !A.fired.g) { A.fired.g = true; A.opts.onGive && A.opts.onGive(); }
}, { dur: 0.9, mask: ['shoulderR', 'elbowR', 'shoulderL', 'elbowL', 'spine'] });

def('openCapsule', (r, u, A, o) => {
  const tw = u < 0.6 ? sin(u * 30) * 0.3 : 0;
  const pull = u > 0.6 ? Math.min(1, (u - 0.6) / 0.12) : 0;
  o.shoulderL = [-1.0, 0, 0.25 + pull * 0.35]; o.shoulderR = [-1.0, 0, -0.25 - pull * 0.35];
  o.elbowL = [-1.1, 0, 0]; o.elbowR = [-1.1, 0, 0];
  o.handR = [0, 0, tw]; o.head = [0.35, 0, 0];
  if (u > 0.62 && !A.fired.p) { A.fired.p = true; A.opts.onPop && A.opts.onPop(); }
}, { dur: 1.6 });

def('cheer', (r, u, A, o) => {
  const k = Math.min(1, u * 4) * Math.min(1, (1 - u) * 4);
  const b = Math.abs(sin(u * PI * 3));
  o.shoulderL = [-2.8 * k, 0, 0.3]; o.shoulderR = [-2.8 * k, 0, -0.3]; o.elbowL = [-0.2, 0, 0]; o.elbowR = [-0.2, 0, 0];
  o.root.y = b * 0.12 * k * r.scale; o.head = [-0.2 * k, 0, 0];
  o.kneeL = [0.3 * (1 - b), 0, 0]; o.kneeR = [0.3 * (1 - b), 0, 0];
  if (b > 0.98 && !A.fired['b' + Math.floor(u * 3)]) { A.fired['b' + Math.floor(u * 3)] = true; }
}, { dur: 1.4 });

def('jump', (r, u, A, o) => {
  const air = hump(u, 0.25, 0.85);
  const crouch = hump(u, 0, 0.3) + hump(u, 0.8, 1);
  o.root.y = air * (A.opts.h ?? 0.25) * r.scale - crouch * 0.04;
  o.kneeL = [crouch * 0.9 + air * 0.4, 0, 0]; o.kneeR = [crouch * 0.9 + air * 0.4, 0, 0];
  o.hipL = [-crouch * 0.5, 0, 0]; o.hipR = [-crouch * 0.5, 0, 0];
  o.shoulderL = [-air * 1.5, 0, 0.4 * air]; o.shoulderR = [-air * 1.5, 0, -0.4 * air];
  if (u > 0.3 && !A.fired.up) { A.fired.up = true; r.squash(-0.2); }
  if (u > 0.85 && !A.fired.land) { A.fired.land = true; r.squash(0.22); A.opts.onLand && A.opts.onLand(); }
}, { dur: 0.75 });

def('trip', (r, u, A, o) => { // clumsy otter
  const fall = smooth(u / 0.35);
  const up = smooth((u - 0.65) / 0.3);
  const k = fall * (1 - up);
  o.spine = [1.2 * k, 0, 0.2 * k]; o.head = [-0.4 * k, 0, 0];
  o.shoulderL = [-2.4 * k, 0, 0.5 * k]; o.shoulderR = [-2.4 * k, 0, -0.5 * k];
  o.hipL = [0.6 * k, 0, 0]; o.hipR = [-0.3 * k, 0, 0]; o.kneeL = [0.4 * k, 0, 0];
  o.root.y = -0.3 * k * r.scale;
  if (u > 0.33 && !A.fired.hit) { A.fired.hit = true; r.squash(0.3); A.opts.onHit && A.opts.onHit(); }
}, { dur: 1.8 });

def('scratchHead', (r, u, A, o) => {
  o.shoulderR = [-2.5, 0, -0.5]; o.elbowR = [-1.7, 0, 0]; o.handR = [sin(u * 40) * 0.3, 0, 0];
  o.head = [0.05, 0, 0.15];
}, { dur: 1.5, mask: ['shoulderR', 'elbowR', 'handR', 'head'] });

def('facepalm', (r, u, A, o) => {
  o.shoulderR = [-1.9, 0.3, -0.1]; o.elbowR = [-2.0, 0, 0]; o.head = [0.45, 0, 0];
}, { dur: 1.5, mask: ['shoulderR', 'elbowR', 'head'] });

def('shrug', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderL = [-0.3 * k, 0, 0.6 * k]; o.shoulderR = [-0.3 * k, 0, -0.6 * k];
  o.elbowL = [-1.4 * k, 0, 0]; o.elbowR = [-1.4 * k, 0, 0]; o.elbowL[1] = -0.8 * k; o.elbowR[1] = 0.8 * k;
  o.head = [0, 0, 0.25 * k]; o.chest = [0, 0, 0];
  o.root.y = 0.015 * k;
}, { dur: 1.2, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'head'] });

def('sigh', (r, u, A, o) => {
  const inh = hump(u, 0, 0.45), exh = hump(u, 0.4, 1);
  o.spine = [-0.08 * inh + 0.2 * exh, 0, 0]; o.head = [-0.15 * inh + 0.35 * exh, 0, 0];
  o.shoulderL = [0, 0, 0.18 * inh - 0.05 * exh]; o.shoulderR = [0, 0, -0.18 * inh + 0.05 * exh];
}, { dur: 2.0, additive: true, mask: ['spine', 'head', 'shoulderL', 'shoulderR'] });

def('point', (r, u, A, o) => {
  const k = Math.min(1, u * 5) * Math.min(1, (1 - u) * 4);
  const s = A.opts.hand === 'L' ? 'L' : 'R';
  o['shoulder' + s] = [-1.5 * k, (s === 'R' ? 0.2 : -0.2) * k, 0]; o['elbow' + s] = [-0.1, 0, 0];
}, { dur: 1.4, mask: ['shoulderR', 'elbowR', 'shoulderL', 'elbowL'] });

def('clap', (r, u, A, o) => {
  const c = Math.abs(sin(u * PI * 6));
  o.shoulderL = [-1.2, -0.5 * c, 0.1]; o.shoulderR = [-1.2, 0.5 * c, -0.1];
  o.elbowL = [-0.9, -0.3 + 0.3 * c, 0]; o.elbowR = [-0.9, 0.3 - 0.3 * c, 0];
}, { dur: 1.2, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR'] });

def('eat', (r, u, A, o) => { // spoon to mouth, chew (loop)
  const c = (u * 1.2) % 1;
  const lift = hump(c, 0.0, 0.5);
  o.shoulderR = [-0.8 - lift * 0.9, 0.3, 0.1]; o.elbowR = [-1.2 - lift * 0.7, 0, 0];
  o.shoulderL = [-0.5, 0, 0.1]; o.elbowL = [-1.2, 0, 0];
  o.head = [0.25 - lift * 0.15, 0, 0];
  if (c > 0.45 && c < 0.6 && !A.fired['b' + Math.floor(u * 1.2)]) { A.fired['b' + Math.floor(u * 1.2)] = true; A.opts.onBite && A.opts.onBite(); }
}, { loop: true });

def('drink', (r, u, A, o) => { // sip tea from a cup in both hands (loop)
  const c = (u * 0.5) % 1;
  const lift = hump(c, 0.0, 0.45);
  o.shoulderR = [-0.8 - lift * 0.7, 0.4, 0.1]; o.elbowR = [-1.4 - lift * 0.3, 0, 0];
  o.shoulderL = [-0.8 - lift * 0.7, -0.4, -0.1]; o.elbowL = [-1.4 - lift * 0.3, 0, 0];
  o.head = [0.15 - lift * 0.4, 0, 0];
}, { loop: true });

def('sob', (r, u, A, o) => {
  o.shoulderL = [-1.9, -0.2, 0.3]; o.shoulderR = [-1.9, 0.2, -0.3]; o.elbowL = [-1.7, 0, 0]; o.elbowR = [-1.7, 0, 0];
  o.head = [0.4, 0, 0]; o.spine = [0.2 + Math.abs(sin(u * 8)) * 0.05, 0, 0];
}, { loop: true });

def('sleep', (r, u, A, o) => {
  o.head = [0.35 + sin(u * 0.9) * 0.04, 0, 0.2]; o.spine = [0.1, 0, 0];
}, { loop: true, additive: false, mask: ['head', 'spine'] });

def('yawn', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderL = [-2.4 * k, 0, 0.5 * k]; o.shoulderR = [-2.4 * k, 0, -0.5 * k]; o.elbowL = [-0.8 * k, 0, 0]; o.elbowR = [-0.8 * k, 0, 0];
  o.head = [-0.4 * k, 0, 0]; o.spine = [-0.12 * k, 0, 0];
}, { dur: 2.2, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'head', 'spine'] });

def('push', (r, u, A, o) => { // pushing something heavy (loop) e.g. the dust grinder
  const s = sin(u * 4);
  o.shoulderL = [-1.5, 0, 0.2]; o.shoulderR = [-1.5, 0, -0.2]; o.elbowL = [-0.3, 0, 0]; o.elbowR = [-0.3, 0, 0];
  o.spine = [0.5, 0, 0]; o.head = [-0.2, 0, 0];
  o.hipL = [-0.4 + s * 0.4, 0, 0]; o.hipR = [-0.4 - s * 0.4, 0, 0]; o.kneeL = [0.6 + Math.max(0, s) * 0.5, 0, 0]; o.kneeR = [0.6 + Math.max(0, -s) * 0.5, 0, 0];
}, { loop: true });

def('grind', (r, u, A, o) => { // turning a big crank handle at waist height (loop)
  const a = u * 3.5;
  o.shoulderR = [-1.0 + sin(a) * 0.4, 0, -0.15 + cos(a) * 0.15]; o.elbowR = [-0.8 + cos(a) * 0.3, 0, 0];
  o.shoulderL = [-1.0 + sin(a) * 0.4, 0, 0.15 - cos(a) * 0.15]; o.elbowL = [-0.8 + cos(a) * 0.3, 0, 0];
  o.spine = [0.2 + sin(a) * 0.08, 0, 0];
  if (A.opts.onTurn) { const st = Math.floor(a / (PI * 2)); if (st !== A.fired.st) { A.fired.st = st; A.opts.onTurn(st); } }
}, { loop: true });

def('whisk', (r, u, A, o) => { // matcha whisking (loop)
  const w = sin(u * 28);
  o.shoulderR = [-0.9, 0.2, -0.05]; o.elbowR = [-1.2, w * 0.15, 0]; o.handR = [0, 0, w * 0.5];
  o.shoulderL = [-0.7, -0.3, 0.1]; o.elbowL = [-1.2, 0, 0]; o.head = [0.4, 0, 0];
}, { loop: true });

def('pour', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderR = [-1.0, 0.2, -0.1]; o.elbowR = [-1.0, 0, 0]; o.handR = [0, 0, -1.1 * Math.min(1, k * 1.6)];
  o.shoulderL = [-0.6, 0, 0.2]; o.elbowL = [-1.1, 0, 0]; o.head = [0.3, 0, 0];
}, { dur: 2.0 });

def('water', (r, u, A, o) => { // watering can (loop)
  o.shoulderR = [-1.0, 0, -0.15]; o.elbowR = [-0.4, 0, 0]; o.handR = [0, 0, -0.6 + sin(u * 3) * 0.1];
  o.spine = [0.15, 0, 0]; o.head = [0.35, 0, 0];
}, { loop: true });

def('harvest', (r, u, A, o) => { // reach, pinch, pull (loop)
  const c = (u * 1.4) % 1;
  const reach = hump(c, 0, 0.6);
  o.shoulderR = [-1.0 - reach * 0.6, 0, -0.1]; o.elbowR = [-0.5 + reach * 0.3, 0, 0];
  o.shoulderL = [-0.9 + reach * 0.2, 0, 0.2]; o.elbowL = [-0.8, 0, 0];
  o.spine = [0.35 + reach * 0.15, 0, 0]; o.head = [0.25, 0, 0];
  const n = Math.floor(u * 1.4);
  if (c > 0.55 && A.fired.n !== n) { A.fired.n = n; A.opts.onPick && A.opts.onPick(n); }
}, { loop: true });

def('flail', (r, u, A, o) => { // panicking arms
  o.shoulderL = [-1.5 + sin(u * 30) * 0.8, 0, 0.6]; o.shoulderR = [-1.5 + cos(u * 30) * 0.8, 0, -0.6];
  o.elbowL = [-0.4, 0, 0]; o.elbowR = [-0.4, 0, 0];
  o.root.y = Math.abs(sin(u * 15)) * 0.03;
}, { loop: true });

def('hipsHands', (r, u, A, o) => { // hands on hips (loop)
  o.shoulderL = [0.1, 0, 0.55]; o.shoulderR = [0.1, 0, -0.55]; o.elbowL = [-1.5, -0.9, 0]; o.elbowR = [-1.5, 0.9, 0];
  o.spine = [-0.08, 0, 0];
}, { loop: true, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'spine'] });

def('handsBack', (r, u, A, o) => { // shy, hands behind the back (loop)
  o.shoulderL = [0.5, 0, 0.12]; o.shoulderR = [0.5, 0, -0.12]; o.elbowL = [-0.6, 0.6, 0]; o.elbowR = [-0.6, -0.6, 0];
  o.spine = [0.03, 0, sin(u * 2) * 0.04];
}, { loop: true, mask: ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'spine'] });

def('fan', (r, u, A, o) => { // tengu fan swing
  const k = u < 0.4 ? -smooth(u / 0.4) : smooth((u - 0.4) / 0.2) * 2 - 1;
  o.shoulderR = [-1.2 - k * 0.8, 0, -0.6 - k * 0.4]; o.elbowR = [-0.5, 0, 0]; o.handR = [0, 0, k * 0.8];
  o.spine = [0.1, -k * 0.3, 0];
  if (u > 0.45 && !A.fired.f) { A.fired.f = true; A.opts.onSwing && A.opts.onSwing(); }
}, { dur: 1.2, snap: true });

def('keyTurn', (r, u, A, o) => {
  const k = hump(u, 0, 1);
  o.shoulderR = [-1.2 * Math.min(1, u * 4), 0, -0.1]; o.elbowR = [-0.4, 0, 0]; o.handR = [0, 0, -1.4 * smooth((u - 0.4) / 0.3)];
  o.spine = [0.1 * k, 0, 0];
  if (u > 0.65 && !A.fired.k) { A.fired.k = true; A.opts.onTurn && A.opts.onTurn(); }
}, { dur: 1.3, mask: ['shoulderR', 'elbowR', 'handR', 'spine'] });

def('rollShutter', (r, u, A, o) => { // reaching up and pushing a shutter up
  const k = smooth(u / 0.25);
  const up = smooth((u - 0.3) / 0.5);
  o.shoulderL = [-1.2 - up * 1.6, 0, 0.3]; o.shoulderR = [-1.2 - up * 1.6, 0, -0.3];
  o.elbowL = [-1.2 * (1 - up), 0, 0]; o.elbowR = [-1.2 * (1 - up), 0, 0];
  o.spine = [0.4 * k * (1 - up) - 0.1 * up, 0, 0];
  o.kneeL = [0.6 * k * (1 - up), 0, 0]; o.kneeR = [0.6 * k * (1 - up), 0, 0]; o.hipL = [-0.3 * k * (1 - up), 0, 0]; o.hipR = [-0.3 * k * (1 - up), 0, 0];
  o.root.y = up * 0.03;
}, { dur: 2.2 });

export { ACTIONS };
