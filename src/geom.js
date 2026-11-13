// Shared geometry helpers for the Paulo models (all units mm).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;

// ---------------------------------------------------------------- geometry helpers

export function prep(g) {
  const n = g.index ? g.toNonIndexed() : g;
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2));
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  n.morphAttributes = {};
  return n;
}
export function merge(list) {
  return mergeGeometries(list.map(prep), false);
}
export function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
// axis-aligned box from min/max corners
export function bmm(x0, x1, y0, y1, z0, z1) {
  return box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
// geometry built along +Y, centred on origin → placed between a and b
export function orientTo(g, a, b) {
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize());
  g.applyQuaternion(q);
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}
export function rod(a, b, r, seg = 12) {
  return orientTo(new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg, 1), a, b);
}
export function sq(a, b, s, t = s) {
  return orientTo(new THREE.BoxGeometry(s, a.distanceTo(b), t), a, b);
}
// ribbed reinforcing bar (used as trim and handles all over the Paulo)
export function rebar(a, b, r = 6, pitch = 13) {
  const L = a.distanceTo(b);
  const parts = [new THREE.CylinderGeometry(r, r, L, 10, 1)];
  const n = Math.floor(L / pitch);
  for (let i = 0; i < n; i++) {
    const t = new THREE.TorusGeometry(r, r * 0.24, 4, 10);
    t.rotateX(PI / 2);
    t.rotateZ(i % 2 ? 0.4 : -0.4);
    t.translate(0, -L / 2 + pitch * (i + 0.5), 0);
    parts.push(t);
  }
  return orientTo(merge(parts), a, b);
}
// polyline of rods (bent round bar)
export function bentRod(points, r, seg = 10) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) out.push(rod(points[i], points[i + 1], r, seg));
  for (let i = 1; i < points.length - 1; i++) {
    const s = new THREE.SphereGeometry(r, seg, 6);
    s.translate(points[i].x, points[i].y, points[i].z);
    out.push(s);
  }
  return merge(out);
}
export function curveRod(points, r, segs = 48, closed = false) {
  const c = new THREE.CatmullRomCurve3(points, closed);
  return new THREE.TubeGeometry(c, segs, r, 8, closed);
}
// expanded-metal sheet in the XZ plane, centred on the origin
export function expandedMesh(w, d, { sx = 58, sz = 26, strand = 4.5, t = 3 } = {}) {
  const parts = [];
  const k = sz / sx;
  for (const s of [1, -1]) {
    const cmax = d / 2 + k * w / 2;
    for (let c = -cmax; c <= cmax + 1e-6; c += sz) {
      const pts = [];
      for (const x of [-w / 2, w / 2]) {
        const z = s * k * x + c;
        if (z >= -d / 2 - 1e-6 && z <= d / 2 + 1e-6) pts.push([x, z]);
      }
      for (const z of [-d / 2, d / 2]) {
        const x = (z - c) / (s * k);
        if (x > -w / 2 && x < w / 2) pts.push([x, z]);
      }
      if (pts.length < 2) continue;
      pts.sort((p, q) => p[0] - q[0]);
      const [x0, z0] = pts[0], [x1, z1] = pts[pts.length - 1];
      const L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 3) continue;
      const g = new THREE.BoxGeometry(L, t, strand);
      g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
      g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      parts.push(g);
    }
  }
  return merge(parts);
}
// framed expanded-metal panel (XZ plane), frame in flat bar
export function meshPanel(w, d, { bar = 20, barT = 5, ...o } = {}) {
  return {
    mesh: expandedMesh(w - 4, d - 4, o),
    frame: merge([
      box(w, bar, barT, 0, -bar / 2 + 3, d / 2 - barT / 2),
      box(w, bar, barT, 0, -bar / 2 + 3, -d / 2 + barT / 2),
      box(barT, bar, d, w / 2 - barT / 2, -bar / 2 + 3, 0),
      box(barT, bar, d, -w / 2 + barT / 2, -bar / 2 + 3, 0),
    ]),
  };
}

// deterministic pseudo-random for brick shading
let seed = 7;
export const resetSeed = (v = 7) => { seed = v; };
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Firebrick lining in the XY plane: x∈[-w/2,w/2], y∈[0,h], z∈[0,t] (face at z=t).
// Optional top(x) clips the wall to a sloped top edge (must be linear in x).
export function brickWall(B, w, h, xf, { bw = 230, bh = 114, t = 25, gap = 3.5, bond = true, top = null } = {}) {
  const topAt = top || (() => h);
  if (top) {
    const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, top(w / 2)), new THREE.Vector2(-w / 2, top(-w / 2))]);
    B.add('mortar', xf(new THREE.ExtrudeGeometry(sh, { depth: t - 2, bevelEnabled: false })));
  } else B.add('mortar', xf(bmm(-w / 2, w / 2, 0, h, 0, t - 2)));
  const hMax = top ? Math.max(top(-w / 2), top(w / 2)) : h;
  let row = 0;
  for (let y = 0; y < hMax - 1; y += bh, row++) {
    const off = bond && row % 2 ? bw / 2 : 0;
    for (let x = -w / 2 - off; x < w / 2 - 1; x += bw) {
      const xa = Math.max(x, -w / 2), xb = Math.min(x + bw, w / 2);
      if (xb - xa < 8) continue;
      const y1 = Math.min(y + bh, topAt(xa), topAt(xb));
      if (y1 - y < 12) continue;
      const g = bmm(xa + gap / 2, xb - gap / 2, y + gap / 2, y1 - gap / 2, 0, t);
      B.add('brick' + Math.floor(rnd() * 3), xf(g));
    }
  }
}

// collects geometry per material, then emits one mesh per material
export class Part {
  constructor(name) { this.name = name; this.geos = {}; }
  add(mat, g) { (this.geos[mat] ||= []).push(g); return this; }
  build(M) {
    const grp = new THREE.Group();
    grp.name = this.name;
    for (const [mat, list] of Object.entries(this.geos)) {
      const g = mergeVertices(merge(list), 1e-3);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, M[mat]);
      mesh.name = `${this.name}:${mat}`;
      mesh.castShadow = mat !== 'fabric';
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}
export const mx = (m) => (g) => g.applyMatrix4(m);
export const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
export const R = (ax, ay, az) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(ax, ay, az));
export const TR = (x, y, z, ax = 0, ay = 0, az = 0) => T(x, y, z).multiply(R(ax, ay, az));

