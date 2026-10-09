// Low-poly modelling kit. Models are assembled in code from a few chunky
// primitives with flat normals and texel-density UVs (TPM texels per metre),
// so a repeat texture lands at the same pixel size on every surface.
//
//   const g = new GeoBuilder();
//   g.box(1, 2, 1, { at: [0, 1, 0], uv: 'world' });
//   g.cyl(0.2, 0.2, 1, 8, { at: [...] });
//   const geo = g.build();              // one BufferGeometry
//
// UV modes:
//   'world'  - box-projected from world-ish positions (repeat textures)
//   'unit'   - each face gets 0..1 (stretched; for painted panels)
//   [u0,v0,u1,v1] - each face mapped into that rectangle of an atlas
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TPM } from './pixtex.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function xform({ at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _p.set(at[0], at[1], at[2]);
  _s.set(scale[0], scale[1], scale[2]);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// Re-map UVs of a non-indexed geometry: per triangle, project positions onto
// the dominant axis plane of its normal; scale by texel density.
export function boxProjectUVs(geo, { density = TPM, texSize = 64, offset = [0, 0], rotate90 = false } = {}) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const k = density / texSize;
  for (let i = 0; i < pos.count; i += 3) {
    // face normal (average of the 3)
    let nx = 0, ny = 0, nz = 0;
    for (let j = 0; j < 3; j++) { nx += nrm.getX(i + j); ny += nrm.getY(i + j); nz += nrm.getZ(i + j); }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let j = 0; j < 3; j++) {
      const x = pos.getX(i + j), y = pos.getY(i + j), z = pos.getZ(i + j);
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = ny > 0 ? -z : z; }
      else if (ax >= az) { u = nx > 0 ? -z : z; v = y; }
      else { u = nz > 0 ? x : -x; v = y; }
      if (rotate90) [u, v] = [v, -u];
      uv[(i + j) * 2] = u * k + offset[0];
      uv[(i + j) * 2 + 1] = v * k + offset[1];
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// non-indexed with flat normals (low-poly facets), or keep the primitive's
// own smooth normals when `smooth` is set
function toFlat(geo, smooth = false) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!smooth || !g.attributes.normal) g.computeVertexNormals();
  return g;
}

// map every triangle pair / face into a uv rect (for atlas panels)
function rectUVs(geo, rect) {
  const [u0, v0, u1, v1] = rect;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geo;
}

function setColor(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// wind weight per vertex (0 = rooted, 1 = sways fully)
function setWind(geo, fn) {
  const pos = geo.attributes.position, n = pos.count;
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = typeof fn === 'function' ? fn(pos.getX(i), pos.getY(i), pos.getZ(i)) : fn;
  geo.setAttribute('aWind', new THREE.BufferAttribute(arr, 1));
  return geo;
}

export class GeoBuilder {
  constructor({ texSize = 64, density = TPM } = {}) {
    this.parts = [];
    this.texSize = texSize;
    this.density = density;
  }
  // core: add a geometry with a transform and options
  add(geo, opts = {}) {
    const g = toFlat(geo, opts.smooth);
    const M = opts.matrix || xform(opts);
    g.applyMatrix4(M);
    const uvMode = opts.uv ?? 'world';
    if (uvMode === 'world') boxProjectUVs(g, { density: opts.density ?? this.density, texSize: opts.texSize ?? this.texSize, offset: opts.uvOffset, rotate90: opts.uvRot });
    else if (Array.isArray(uvMode)) rectUVs(g, uvMode);
    // 'unit' keeps the primitive's own uvs
    setColor(g, opts.color ?? 0xffffff);
    setWind(g, opts.wind ?? 0);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    // keep only the attributes we merge
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aWind'].includes(k)) g.deleteAttribute(k);
    this.parts.push(g);
    return this;
  }
  box(w, h, d, opts = {}) { return this.add(new THREE.BoxGeometry(w, h, d, opts.segs?.[0] || 1, opts.segs?.[1] || 1, opts.segs?.[2] || 1), opts); }
  // box with chamfered vertical edges (8-sided footprint) - softer silhouettes
  cbox(w, h, d, c = 0.04, opts = {}) {
    const hw = w / 2, hd = d / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hw + c, -hd); shape.lineTo(hw - c, -hd); shape.lineTo(hw, -hd + c); shape.lineTo(hw, hd - c);
    shape.lineTo(hw - c, hd); shape.lineTo(-hw + c, hd); shape.lineTo(-hw, hd - c); shape.lineTo(-hw, -hd + c); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); // extrude along +y
    g.translate(0, -h / 2, 0);
    return this.add(g, opts);
  }
  // fully bevelled box (all 12 edges chamfered)
  bbox(w, h, d, b = 0.03, opts = {}) {
    const hw = w / 2 - b, hh = h / 2 - b, hd = d / 2 - b;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hd - 0); shape.lineTo(hw, -hd); shape.lineTo(hw, hd); shape.lineTo(-hw, hd); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: hh * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -hh, 0);
    return this.add(g, opts);
  }
  cyl(rt, rb, h, seg = 8, opts = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, opts.hsegs || 1, !!opts.open, opts.thetaStart || 0, opts.thetaLength || Math.PI * 2), opts); }
  cone(r, h, seg = 8, opts = {}) { return this.add(new THREE.ConeGeometry(r, h, seg, 1, !!opts.open), opts); }
  sphere(r, wseg = 8, hseg = 6, opts = {}) { return this.add(new THREE.SphereGeometry(r, wseg, hseg, 0, Math.PI * 2, opts.phiStart ?? 0, opts.phiLength ?? Math.PI), opts); }
  ico(r, detail = 0, opts = {}) { return this.add(new THREE.IcosahedronGeometry(r, detail), opts); }
  dodeca(r, opts = {}) { return this.add(new THREE.DodecahedronGeometry(r, 0), opts); }
  torus(r, tube, rs = 6, ts = 10, opts = {}) { return this.add(new THREE.TorusGeometry(r, tube, rs, ts, opts.arc ?? Math.PI * 2), opts); }
  plane(w, h, opts = {}) { return this.add(new THREE.PlaneGeometry(w, h), { uv: 'unit', ...opts }); }
  // lathe from a 2D profile [[r, y], ...]
  lathe(profile, seg = 10, opts = {}) { return this.add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg, opts.phiStart || 0, opts.phiLength || Math.PI * 2), opts); }
  // extruded 2D outline [[x, y], ...] (y up), depth along +z then centred
  extrude(outline, depth, opts = {}) {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: !!opts.bevel, bevelThickness: opts.bevel || 0, bevelSize: opts.bevel || 0, bevelSegments: 1, curveSegments: opts.curveSegments || 6 });
    g.translate(0, 0, -depth / 2);
    return this.add(g, opts);
  }
  // a prism along x with an arbitrary cross-section in the y/z plane (roofs, gutters)
  prism(section, len, opts = {}) {
    const shape = new THREE.Shape(section.map(([z, y]) => new THREE.Vector2(z, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-len / 2, 0, 0);
    return this.add(g, opts);
  }
  // merge another builder's parts in (with an extra transform)
  merge(other, opts = {}) {
    const M = xform(opts);
    for (const p of other.parts) this.parts.push(p.clone().applyMatrix4(M));
    return this;
  }
  get empty() { return this.parts.length === 0; }
  build() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

// Builds one mesh per material key: parts are grouped by `mat`, so a whole
// building is a handful of draw calls.
export class ModelBuilder {
  constructor(materials, opts = {}) {
    this.materials = materials; // key -> THREE.Material
    this.groups = new Map();
    this.opts = opts;
  }
  g(key) {
    if (!this.groups.has(key)) this.groups.set(key, new GeoBuilder(this.opts));
    return this.groups.get(key);
  }
  build({ castShadow = true, receiveShadow = true, name = '' } = {}) {
    const root = new THREE.Group();
    root.name = name;
    for (const [key, gb] of this.groups) {
      if (gb.empty) continue;
      const mat = this.materials[key];
      if (!mat) { console.warn('ModelBuilder: missing material', key); continue; }
      const mesh = new THREE.Mesh(gb.build(), mat);
      mesh.name = key;
      mesh.castShadow = castShadow && !mat.userData?.noShadow;
      mesh.receiveShadow = receiveShadow;
      root.add(mesh);
    }
    return root;
  }
}

export { mergeGeometries, mergeVertices };
