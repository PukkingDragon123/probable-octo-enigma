// Low-poly body part builders for the animal-human chibis. Every builder
// returns a THREE.Object3D whose origin is the joint pivot, so the rig can
// rotate it directly. Character "toon" parts are smooth-shaded (clean cel
// look); accessories are faceted.
import * as THREE from 'three';
import { litMat, emitMat, glassMat } from '../core/materials.js';
import { makeTexture, PixCanvas, darken, lighten, mix } from '../core/pixtex.js';

export const RIM = 0xfff0d8;

const _matCache = new Map();
// solid-colour toon material (cached by colour)
export function toon(color, { rim = 0.22, map = null, side = THREE.FrontSide, key = null } = {}) {
  const k = key || (map ? null : `${color}|${rim}|${side}`);
  if (k && _matCache.has(k)) return _matCache.get(k);
  const m = litMat({ color: map ? 0xffffff : color, map, rim: [RIM, rim], vertexColors: false, side });
  if (k) _matCache.set(k, m);
  return m;
}
export function texMat(pc, opts = {}) {
  const t = makeTexture(pc.c, { mips: true, repeat: false });
  return litMat({ map: t, rim: [RIM, opts.rim ?? 0.22], vertexColors: false, side: opts.side || THREE.FrontSide });
}

export function mesh(geo, mat, { cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive; m.name = name;
  return m;
}
// a pivot group with a child mesh offset from it
export function pivot(name, child = null, at = [0, 0, 0]) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(at[0], at[1], at[2]);
  if (child) g.add(child);
  return g;
}

// ---------------------------------------------------------------- geometry
// limb segment hanging down from its pivot (length L), tapered
export function limbGeo(rTop, rBot, L, seg = 7) {
  const g = new THREE.CylinderGeometry(rTop, rBot, L, seg, 1, false, Math.PI);
  g.translate(0, -L / 2, 0);
  // round the ends a little: add spheres
  const capT = new THREE.SphereGeometry(rTop, seg, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const capB = new THREE.SphereGeometry(rBot, seg, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  capB.translate(0, -L, 0);
  return mergeSimple([g, capT, capB]);
}
// merge geometries that share attributes (position/normal/uv)
export function mergeSimple(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}
export function ellipsoid(r, sx = 1, sy = 1, sz = 1, w = 12, h = 9) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.scale(sx, sy, sz);
  return g;
}

// ---------------------------------------------------------------- hands & feet
export function handGeo(kind = 'mitt', r = 0.042) {
  if (kind === 'claw') {
    // crab pincer: two halves (upper moves)
    const a = new THREE.SphereGeometry(r * 1.25, 8, 6); a.scale(1, 0.75, 1.5); a.translate(0, -r * 0.4, r * 0.7);
    return a;
  }
  const palm = new THREE.SphereGeometry(r, 9, 7);
  palm.scale(1, 1.05, 0.9);
  palm.translate(0, -r * 0.6, 0);
  const thumb = new THREE.SphereGeometry(r * 0.45, 6, 5);
  thumb.translate(r * 0.6, -r * 0.35, r * 0.35);
  if (kind === 'webbed') {
    const web = new THREE.SphereGeometry(r * 1.2, 8, 4, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4);
    web.scale(1, 0.5, 0.6); web.translate(0, -r * 1.2, 0);
    return mergeSimple([palm, thumb, web]);
  }
  return mergeSimple([palm, thumb]);
}
// shoe/foot pointing +z, origin at the ankle
export function footGeo(kind = 'sneaker', s = 1) {
  const L = 0.13 * s, W = 0.078 * s, H = 0.055 * s;
  if (kind === 'geta') {
    const top = new THREE.BoxGeometry(W * 1.1, 0.02 * s, L * 1.1); top.translate(0, -0.035 * s, L * 0.25);
    const t1 = new THREE.BoxGeometry(W * 1.05, 0.04 * s, 0.018 * s); t1.translate(0, -0.065 * s, L * 0.0);
    const t2 = t1.clone(); t2.translate(0, 0, L * 0.5);
    const foot = new THREE.SphereGeometry(W * 0.5, 7, 5); foot.scale(1, 0.6, 1.5); foot.translate(0, -0.012 * s, L * 0.25);
    return mergeSimple([top, t1, t2, foot]);
  }
  const g = new THREE.SphereGeometry(0.5, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62);
  g.scale(W, H * 1.6, L);
  g.translate(0, -H * 0.85, L * 0.32);
  const sole = new THREE.CylinderGeometry(0.5, 0.5, 0.012 * s, 10);
  sole.scale(W * 1.02, 1, L * 1.02);
  sole.translate(0, -H * 0.86, L * 0.32);
  return mergeSimple([g, sole]);
}

// ---------------------------------------------------------------- ears
export function earMesh(kind, color, inner, side, s = 1) {
  const g = new THREE.Group();
  if (kind === 'fox' || kind === 'shiba' || kind === 'cat') {
    const h = (kind === 'fox' ? 0.16 : kind === 'cat' ? 0.1 : 0.12) * s, r = (kind === 'fox' ? 0.07 : 0.06) * s;
    const outer = new THREE.ConeGeometry(r, h, 4, 1);
    outer.rotateY(Math.PI / 4);
    outer.scale(1, 1, 0.55);
    outer.translate(0, h / 2, 0);
    g.add(mesh(outer, toon(color)));
    const inn = new THREE.ConeGeometry(r * 0.62, h * 0.72, 4, 1);
    inn.rotateY(Math.PI / 4); inn.scale(1, 1, 0.3); inn.translate(0, h * 0.36, r * 0.18);
    g.add(mesh(inn, toon(inner), { cast: false }));
    if (kind === 'fox') {
      const tip = new THREE.ConeGeometry(r * 0.42, h * 0.32, 4, 1);
      tip.rotateY(Math.PI / 4); tip.scale(1, 1, 0.58); tip.translate(0, h * 0.86, 0);
      g.add(mesh(tip, toon(darken(color, 0.55))));
    }
    g.rotation.z = -side * 0.22;
  } else if (kind === 'round' || kind === 'tanuki' || kind === 'otter' || kind === 'bear' || kind === 'monkey') {
    const r = (kind === 'otter' ? 0.035 : kind === 'monkey' ? 0.05 : 0.055) * s;
    const e = new THREE.SphereGeometry(r, 8, 6); e.scale(1, 0.95, 0.5);
    g.add(mesh(e, toon(color)));
    const i = new THREE.SphereGeometry(r * 0.6, 7, 5); i.scale(1, 1, 0.3); i.translate(0, -r * 0.05, r * 0.25);
    g.add(mesh(i, toon(inner), { cast: false }));
  } else if (kind === 'rabbit') {
    const L = 0.2 * s;
    const e = new THREE.CapsuleGeometry(0.035 * s, L, 3, 8); e.scale(1, 1, 0.5); e.translate(0, L / 2 + 0.02, 0);
    g.add(mesh(e, toon(color)));
    const i = new THREE.CapsuleGeometry(0.02 * s, L * 0.8, 3, 6); i.scale(1, 1, 0.3); i.translate(0, L / 2 + 0.02, 0.012 * s);
    g.add(mesh(i, toon(inner), { cast: false }));
    g.rotation.z = -side * 0.12;
  } else if (kind === 'deer') {
    const e = new THREE.SphereGeometry(0.055 * s, 7, 5); e.scale(1.6, 0.7, 0.5); e.translate(side * 0.05 * s, 0, 0);
    g.add(mesh(e, toon(color)));
    const i = new THREE.SphereGeometry(0.035 * s, 7, 5); i.scale(1.6, 0.6, 0.3); i.translate(side * 0.055 * s, 0, 0.012);
    g.add(mesh(i, toon(inner), { cast: false }));
    g.rotation.z = -side * 0.25;
  }
  return g;
}

// ---------------------------------------------------------------- tails
// returns { root, segs: [Group...] } - segments chained so they can sway
export function tailChain(kind, color, tip, s = 1) {
  const root = new THREE.Group();
  root.name = 'tail';
  const segs = [];
  let parent = root;
  const add = (geo, mat, len) => {
    const p = new THREE.Group();
    p.add(mesh(geo, mat));
    parent.add(p);
    segs.push(p);
    const nx = new THREE.Group();
    nx.position.set(0, 0, -len);
    p.add(nx);
    parent = nx;
  };
  if (kind === 'fox' || kind === 'tanuki') {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const r = (kind === 'fox' ? [0.06, 0.085, 0.09, 0.07] : [0.06, 0.075, 0.075, 0.065])[i] * s;
      const g = new THREE.SphereGeometry(r, 8, 6); g.scale(1, 1, 1.35); g.translate(0, 0, -r * 0.9);
      let col = color;
      if (kind === 'fox' && i === n - 1) col = tip;
      if (kind === 'tanuki' && i % 2 === 1) col = tip;
      add(g, toon(col), r * 1.5);
    }
  } else if (kind === 'otter') {
    for (let i = 0; i < 4; i++) {
      const r = (0.055 - i * 0.011) * s;
      const g = new THREE.SphereGeometry(r, 7, 5); g.scale(1, 0.8, 1.8); g.translate(0, 0, -r * 1.4);
      add(g, toon(color), r * 2.4);
    }
  } else if (kind === 'shiba') {
    const g = new THREE.TorusGeometry(0.05 * s, 0.028 * s, 5, 8, Math.PI * 1.5);
    g.rotateY(Math.PI / 2); g.translate(0, 0.05 * s, -0.02);
    add(g, toon(color), 0.04);
  } else if (kind === 'cat') {
    for (let i = 0; i < 4; i++) {
      const r = 0.022 * s;
      const g = new THREE.CylinderGeometry(r, r, 0.07 * s, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.035 * s);
      add(g, toon(i === 3 ? tip : color), 0.07 * s);
    }
  } else if (kind === 'stub' || kind === 'deer' || kind === 'rabbit') {
    const r = (kind === 'rabbit' ? 0.045 : 0.03) * s;
    const g = new THREE.SphereGeometry(r, 7, 5); g.scale(1, 1, 1.4); g.translate(0, 0, -r);
    add(g, toon(kind === 'stub' ? color : tip), r);
  }
  return { root, segs };
}

// ---------------------------------------------------------------- turtle shell
export function shellMesh(tex, s = 1, { rimCol = '#5a4a2a' } = {}) {
  const g = new THREE.Group();
  // lathe dome: profile from the apex down to the rim
  const prof = [];
  const R = 0.165 * s, H = 0.15 * s;
  for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(Math.sin(t * Math.PI / 2) * R, Math.cos(t * Math.PI / 2) * H)); }
  prof.push(new THREE.Vector2(R * 1.04, -0.01 * s));
  prof.push(new THREE.Vector2(R * 0.9, -0.02 * s));
  const geo = new THREE.LatheGeometry(prof, 12);
  // dome points along +y; tip it so it sits on the back (+y -> -z)
  geo.rotateX(-Math.PI / 2);
  geo.scale(1.0, 1.18, 1);
  g.add(mesh(geo, texMat(tex, { rim: 0.15 })));
  return g;
}

// ---------------------------------------------------------------- accessories
export function glassesMesh(s = 1, { frame = '#3a2a24', lens = 0xd8ecf8, round = true } = {}) {
  const g = new THREE.Group();
  const fm = toon(frame, { rim: 0 });
  for (const side of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.05 * s, 0.007 * s, 4, round ? 12 : 4);
    if (!round) ring.rotateZ(Math.PI / 4);
    ring.translate(side * 0.065 * s, 0, 0);
    g.add(mesh(ring, fm, { cast: false }));
    const lg = new THREE.CircleGeometry(0.048 * s, round ? 12 : 4);
    if (!round) lg.rotateZ(Math.PI / 4);
    lg.translate(side * 0.065 * s, 0, -0.002);
    const lm = glassMat({ color: lens, opacity: 0.28 });
    g.add(mesh(lg, lm, { cast: false, receive: false }));
  }
  const bridge = new THREE.CylinderGeometry(0.005 * s, 0.005 * s, 0.035 * s, 4); bridge.rotateZ(Math.PI / 2); bridge.translate(0, 0.01 * s, 0);
  g.add(mesh(bridge, fm, { cast: false }));
  return g;
}
export function beanieMesh(color, s = 1, { stripe = null, pom = null } = {}) {
  const g = new THREE.Group();
  const pc = new PixCanvas(32, 16, 61);
  pc.fill(color);
  for (let x = 0; x < 32; x += 2) pc.vline(x, 0, 15, darken(color, 0.12));
  pc.rect(0, 11, 32, 5, darken(color, 0.08));
  for (let x = 1; x < 32; x += 2) pc.vline(x, 11, 15, darken(color, 0.22));
  if (stripe) pc.rect(0, 6, 32, 2, stripe);
  const geo = new THREE.SphereGeometry(0.235 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  geo.scale(1.08, 0.82, 1.04);
  g.add(mesh(geo, texMat(pc)));
  if (pom) {
    const pg = new THREE.IcosahedronGeometry(0.05 * s, 1); pg.translate(0, 0.2 * s, 0);
    g.add(mesh(pg, toon(pom)));
  }
  return g;
}
export function capMesh(color, s = 1, { brim = null } = {}) { // flat cap / newsboy
  const g = new THREE.Group();
  const top = new THREE.SphereGeometry(0.24 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
  top.scale(1.1, 0.6, 1.15);
  g.add(mesh(top, toon(color)));
  const b = new THREE.CylinderGeometry(0.12 * s, 0.13 * s, 0.015 * s, 10, 1, false, 0, Math.PI);
  b.rotateY(Math.PI / 2); b.scale(1.3, 1, 0.9); b.translate(0, 0.04 * s, 0.17 * s);
  g.add(mesh(b, toon(brim || darken(color, 0.2))));
  return g;
}
export function strawHatMesh(s = 1) {
  const g = new THREE.Group();
  const pc = new PixCanvas(32, 16, 62);
  pc.fill('#e8c878');
  for (let y = 0; y < 16; y += 2) pc.hline(0, 31, y, '#c8a050');
  for (let x = 0; x < 32; x += 4) pc.vline(x, 0, 15, '#d8b868');
  const crown = new THREE.CylinderGeometry(0.15 * s, 0.17 * s, 0.1 * s, 10); crown.translate(0, 0.05 * s, 0);
  const brim = new THREE.CylinderGeometry(0.34 * s, 0.34 * s, 0.012 * s, 14);
  const band = new THREE.CylinderGeometry(0.172 * s, 0.172 * s, 0.03 * s, 10); band.translate(0, 0.02 * s, 0);
  const m = texMat(pc);
  g.add(mesh(crown, m), mesh(brim, m), mesh(band, toon('#8a3a2a')));
  return g;
}
export function chefHatMesh(s = 1) {
  const g = new THREE.Group();
  const band = new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.07 * s, 10); band.translate(0, 0.035 * s, 0);
  g.add(mesh(band, toon('#f8f6f0')));
  for (const [x, z, r] of [[0, 0, 0.11], [0.07, 0.03, 0.08], [-0.07, 0.03, 0.08], [0, -0.06, 0.08], [0.05, -0.05, 0.07], [-0.05, -0.05, 0.07]]) {
    const pf = new THREE.IcosahedronGeometry(r * s, 1); pf.translate(x * s, 0.13 * s, z * s);
    g.add(mesh(pf, toon('#ffffff')));
  }
  return g;
}
export function mustacheMesh(color, s = 1) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const m = new THREE.SphereGeometry(0.045 * s, 7, 5);
    m.scale(1.3, 0.5, 0.6); m.rotateZ(side * 0.35); m.translate(side * 0.04 * s, 0, 0);
    g.add(mesh(m, toon(color)));
  }
  return g;
}
export function ribbonMesh(color, s = 1) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const w = new THREE.ConeGeometry(0.04 * s, 0.07 * s, 4); w.rotateZ(side * Math.PI / 2); w.scale(1, 1, 0.4); w.translate(side * 0.035 * s, 0, 0);
    g.add(mesh(w, toon(color)));
  }
  const k = new THREE.SphereGeometry(0.018 * s, 6, 4); g.add(mesh(k, toon(darken(color, 0.2))));
  return g;
}
export function earbudsMesh(s = 1) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const b = new THREE.SphereGeometry(0.018 * s, 6, 4); b.translate(side * 0.215 * s, -0.04 * s, 0.02 * s);
    g.add(mesh(b, toon('#f4f4f8', { rim: 0.1 }), { cast: false }));
  }
  return g;
}
// a phone held in the hand (screen can be lit)
export function phoneMesh(s = 1, screenOn = null) {
  const g = new THREE.Group();
  const body = new THREE.BoxGeometry(0.05 * s, 0.09 * s, 0.008 * s);
  g.add(mesh(body, toon('#2a2a38', { rim: 0.05 })));
  const scr = new THREE.PlaneGeometry(0.044 * s, 0.08 * s);
  scr.translate(0, 0, 0.0045 * s);
  const sm = emitMat({ color: 0x9ad0ff, intensity: 1.3, onU: screenOn || { value: 1 } });
  const sMesh = mesh(scr, sm, { cast: false, receive: false });
  sMesh.name = 'screen';
  g.add(sMesh);
  g.userData.screen = sMesh;
  return g;
}
export function wingMesh(color, side, s = 1) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.08, 0.06); shape.lineTo(0.32, 0.04); shape.lineTo(0.28, -0.05); shape.lineTo(0.34, -0.1);
  shape.lineTo(0.26, -0.14); shape.lineTo(0.3, -0.22); shape.lineTo(0.18, -0.2); shape.lineTo(0.16, -0.3); shape.lineTo(0.06, -0.2); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  geo.scale(side * s, s, s);
  g.add(mesh(geo, toon(color, { side: THREE.DoubleSide })));
  return g;
}
