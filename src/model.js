// Paulo Braai XL: procedural 3D model of the extended, lidded variant.
// All dimensions in millimetres; the root group is scaled to metres (glTF convention).
// Axes: X = length (wheels on -X, potjie boom / rotisserie motors on +X),
//       Y = up, Z = depth (+Z is the front, where the fold-up table hinges).
//
// The original Paulo was proportioned from the maker's photos. This variant drops the
// fixed firebox, grows the braai box to 1520 x 720 and adds a brick-lined two-piece
// lid, so the sizes here are design proposals rather than measurements.

import * as THREE from 'three';
import { V, PI, box, bmm, rod, sq, rebar, bentRod, curveRod, expandedMesh, meshPanel, brickWall, Part, mx, T, TR, resetSeed } from './geom.js';

// ---------------------------------------------------------------- materials

export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    frame: std({ color: 0x5f6366, metalness: 0.85, roughness: 0.42, name: 'frame' }),
    zinc: std({ color: 0xb4b8bb, metalness: 0.9, roughness: 0.32, name: 'zinc-plated' }),
    galv: std({ color: 0xc7cbcd, metalness: 0.8, roughness: 0.38, name: 'galvanised' }),
    stainless: std({ color: 0xd3d6d8, metalness: 1.0, roughness: 0.22, name: 'stainless' }),
    brick0: std({ color: 0xc58a65, roughness: 0.95, name: 'firebrick-a' }),
    brick1: std({ color: 0xb87957, roughness: 0.95, name: 'firebrick-b' }),
    brick2: std({ color: 0xd29d7a, roughness: 0.95, name: 'firebrick-c' }),
    mortar: std({ color: 0x5a4a40, roughness: 1.0, name: 'mortar' }),
    castiron: std({ color: 0x1b1b1c, metalness: 0.55, roughness: 0.7, name: 'cast-iron' }),
    wood: std({ color: 0xc08a47, roughness: 0.6, name: 'wood' }),
    plastic: std({ color: 0x1e1f21, roughness: 0.55, name: 'motor-housing' }),
    plate: std({ color: 0x2c2d2f, metalness: 0.75, roughness: 0.4, name: 'seasoned-steel-plate' }),
    dial: std({ color: 0xf2f1ec, roughness: 0.5, name: 'thermometer-face' }),
    needle: std({ color: 0xc8261c, roughness: 0.5, name: 'thermometer-needle' }),
    fabric: std({ color: 0x2b302b, roughness: 0.95, name: 'cover-fabric', side: THREE.DoubleSide }),
  };
}

export const FINISHES = {
  raw: { label: 'Raw steel', color: 0x5f6366, metalness: 0.85, roughness: 0.42 },
  black: { label: 'Black powder coat', color: 0x131415, metalness: 0.3, roughness: 0.58 },
};

export function applyFinish(M, key) {
  const f = FINISHES[key];
  M.frame.color.setHex(f.color);
  M.frame.metalness = f.metalness;
  M.frame.roughness = f.roughness;
}

// ---------------------------------------------------------------- key dimensions

export const DIM = {
  box: { x0: -760, x1: 760, z0: -360, z1: 360, base: 640, top: 1000 },
  sideT: 40,            // hollow end columns
  floorTop: 676,        // top of floor firebricks
  clearZ: 329,          // half the clear depth between front and back brick faces
  rails: [746, 796, 846, 896, 946],  // the five notch heights a cooking surface can sit at
  legX: 700, legZ: 320,
  wheelR: 148,
  half: { w: 646, d: 640, cx: 345, pinX: 200 }, // half-length attachments, their centre, support pins
  spitZ: [-165, 165], spitY: 1076,
  lid: { H: 260, skirt: 150, run: 170 },
  rimY: 1006, hingeZ: -375,
};

// ---------------------------------------------------------------- body

function cart(M) {
  const B = new Part('Cart frame');
  const { legX: lx, legZ: lz, wheelR } = DIM, { x0, x1, base } = DIM.box;
  const s = 40, yTop = base - 20;
  for (const z of [-lz, lz]) {
    B.add('frame', sq(V(-lx, wheelR - 20, z), V(-lx, yTop + 20, z), s));
    B.add('frame', sq(V(lx, 28, z), V(lx, yTop + 20, z), s));
    B.add('frame', rod(V(lx, 10, z), V(lx, 30, z), 9));
    const pad = new THREE.CylinderGeometry(38, 45, 10, 24); pad.translate(lx, 5, z);
    B.add('frame', pad);
    // top rails run past the right legs as push handles
    B.add('frame', sq(V(x0, yTop, z), V(x1 + 150, yTop, z), s));
  }
  for (const x of [x0 + 20, -lx, -235, 235, lx, x1 - 20]) B.add('frame', sq(V(x, yTop, -lz + 20), V(x, yTop, lz - 20), s));
  const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(90, 0), new THREE.Vector2(0, -90)]);
  for (const x of [-lx, lx]) for (const z of [-lz, lz]) {
    const g = new THREE.ExtrudeGeometry(tri, { depth: 4, bevelEnabled: false });
    const dirX = x < 0 ? 1 : -1;
    g.scale(dirX, 1, 1);
    g.translate(x + dirX * 20, yTop - 20, z + (z > 0 ? 20 : -24));
    B.add('frame', g);
  }
  // lower shelf
  const ly = 230;
  for (const z of [-lz, lz]) B.add('frame', sq(V(-lx, ly, z), V(lx, ly, z), 30));
  for (const x of [-lx, -235, 235, lx]) B.add('frame', sq(V(x, ly, -lz), V(x, ly, lz), 30, 30));
  B.add('frame', meshPanel(2 * lx - 30, 2 * lz - 30, { bar: 4, barT: 4 }).mesh.translate(0, ly + 16, 0));
  // axle + wheels
  B.add('frame', rod(V(-lx, wheelR, -lz - 65), V(-lx, wheelR, lz + 65), 11));
  for (const z of [-lz - 42, lz + 42]) {
    const prof = [[wheelR - 5, -20], [wheelR, -20], [wheelR, 20], [wheelR - 5, 20], [wheelR - 5, -20]].map(([r, y]) => new THREE.Vector2(r, y));
    const rim = new THREE.LatheGeometry(prof, 48);
    rim.rotateX(PI / 2); rim.translate(-lx, wheelR, z);
    B.add('frame', rim);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      B.add('frame', rod(V(-lx + 24 * Math.cos(a), wheelR + 24 * Math.sin(a), z), V(-lx + (wheelR - 4) * Math.cos(a), wheelR + (wheelR - 4) * Math.sin(a), z), 6, 8));
    }
    const hub = new THREE.CylinderGeometry(26, 26, 56, 20); hub.rotateX(PI / 2); hub.translate(-lx, wheelR, z);
    B.add('frame', hub);
    const cap = new THREE.CylinderGeometry(12, 12, 62, 12); cap.rotateX(PI / 2); cap.translate(-lx, wheelR, z);
    B.add('zinc', cap);
  }
  // hook for the ash shovel, and a tool rail on the left end wall
  B.add('frame', bentRod([V(-600, yTop - 20, lz + 20), V(-600, yTop - 50, lz + 20), V(-600, yTop - 65, lz + 40), V(-600, yTop - 45, lz + 52)], 4));
  B.add('frame', rod(V(x0 - 45, 930, -285), V(x0 - 45, 930, -65), 7));
  for (const z of [-282, -70]) B.add('frame', bmm(x0 - 50, x0, 925, 935, z - 3, z + 3));
  return B.build(M);
}

function braaiBox(M) {
  const B = new Part('Braai box (fully brick-lined)');
  const { x0, x1, z0, z1, base, top } = DIM.box;
  const t = 6, st = DIM.sideT, ft = DIM.floorTop, cz = DIM.clearZ;
  B.add('frame', bmm(x0, x1, base, base + t, z0, z1));                 // floor plate
  for (const s of [-1, 1]) {
    const zo = s > 0 ? z1 : z0;
    B.add('frame', bmm(x0 + st, x1 - st, base + t, top, zo, zo - s * t));     // full-height front / back wall
    B.add('frame', bmm(x0 + st, x1 - st, top, top + 6, zo + s * 3, zo - s * 34)); // rim flat the lid seats on
  }
  // hollow end columns
  for (const sgn of [-1, 1]) {
    const xo = sgn > 0 ? x1 : x0, xi = xo - sgn * st;
    B.add('frame', bmm(xo, xo - sgn * t, base, top, z0, z1));
    B.add('frame', bmm(xi, xi + sgn * 4, base, top, z0, z1));
    B.add('frame', bmm(xo + sgn * 3, xi - sgn * 3, top, top + 6, z0 - 3, z1 + 3));
    for (const z of [z0, z1 - 6]) B.add('frame', bmm(xo, xi, base, top + 6, z, z + 6));
    // potjie boom socket, centred on each end wall (between the two spits)
    const sock = new THREE.CylinderGeometry(24, 24, 220, 20, 1, true);
    sock.translate(xo + sgn * 26, top - 110, 0);
    B.add('frame', sock);
    B.add('frame', bmm(xo, xo + sgn * 6, top - 200, top - 20, -15, 15));
    B.add('zinc', rod(V(xo + sgn * 50, top - 70, 0), V(xo + sgn * 80, top - 70, 0), 6));
    B.add('zinc', rod(V(xo + sgn * 80, top - 70, -30), V(xo + sgn * 80, top - 70, 30), 5));
  }
  B.add('frame', rebar(V(x0 + st, top - 14, z1 + 5), V(x1 - st, top - 14, z1 + 5), 6));
  B.add('frame', rebar(V(x0 + st, base + 10, z1 + 5), V(x1 - st, base + 10, z1 + 5), 6));
  // lid hinge lugs on the back wall
  for (const x of [-631, -131, 131, 631]) B.add('frame', bmm(x - 30, x + 30, top - 45, top + 4, z0 - 24, z0));

  // firebrick on every inside face
  const inX = x1 - st;
  brickWall(B, 2 * inX, 2 * (z1 - t), mx(TR(0, base + t, z1 - t, -PI / 2, 0, 0)), { t: ft - base - t });   // floor
  brickWall(B, 2 * inX, top - ft, mx(T(0, ft, z0 + t)));                                                    // back
  brickWall(B, 2 * inX, top - ft, mx(TR(0, ft, z1 - t, 0, PI, 0)));                                          // front
  for (const sgn of [-1, 1]) brickWall(B, 2 * cz, top - ft, mx(TR(sgn * inX, ft, 0, 0, -sgn * PI / 2, 0))); // ends

  // sockets for the removable upper shelf, outside the back corners
  for (const sgn of [-1, 1]) B.add('frame', bmm(sgn * 760, sgn * 812, 770, top, -357, -303));

  // Height adjustment with no moving parts: notched comb plates on the front and back
  // walls. A surface's four pins drop down the open channel, then the surface slides
  // 26 mm sideways so the pins sit in the notches at the chosen height.
  for (const hs of [-1, 1]) for (const px of [-1, 1]) for (const zs of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(combShape(hs), { depth: 6, bevelEnabled: false });
    g.translate(hs * DIM.half.cx + px * DIM.half.pinX, COMB.y0, zs > 0 ? cz - 6 : -cz);
    B.add('zinc', g);
  }
  return B.build(M);
}

const COMB = { y0: 726, h: 266 };
function combShape(hs) {
  // x = 0 is where a seated pin rests; the channel is 26 mm toward the end wall
  const pts = [[-22, 0], [48, 0], [48, COMB.h], [34, COMB.h]];
  const notch = DIM.rails.map((y) => y + 4 - COMB.y0);
  pts.push([34, notch[0]]);
  notch.forEach((n, i) => {
    pts.push([-8, n], [-8, n + 16], [18, n + 16]);
    pts.push([18, i < notch.length - 1 ? notch[i + 1] : COMB.h]);
  });
  pts.push([-22, COMB.h]);
  return new THREE.Shape((hs < 0 ? pts.map(([x, y]) => [-x, y]).reverse() : pts).map(([x, y]) => new THREE.Vector2(x, y)));
}

function airVents(M) {
  // low sliding intakes on the front wall, one per half, so each zone gets its own draught
  const B = new Part('Air intake vent (sliding damper)');
  const { z1 } = DIM.box, ft = DIM.floorTop, cz = DIM.clearZ;
  for (const cx of [-DIM.half.cx, DIM.half.cx]) {
    B.add('frame', bmm(cx - 125, cx + 125, ft + 8, ft + 84, z1, z1 + 4));
    for (let i = 0; i < 5; i++) B.add('castiron', bmm(cx - 104 + i * 44, cx - 80 + i * 44, ft + 20, ft + 72, z1 + 4, z1 + 5));
    for (const y of [ft + 4, ft + 84]) B.add('frame', bmm(cx - 135, cx + 135, y, y + 7, z1, z1 + 13));
    // shutter, shown half open
    B.add('zinc', bmm(cx - 20, cx + 125, ft + 12, ft + 83, z1 + 6, z1 + 9));
    B.add('zinc', rod(V(cx + 100, ft + 47, z1 + 9), V(cx + 100, ft + 47, z1 + 38), 5));
    const knob = new THREE.SphereGeometry(13, 14, 10); knob.translate(cx + 100, ft + 47, z1 + 44);
    B.add('wood', knob);
    B.add('castiron', bmm(cx - 104, cx + 96, ft + 20, ft + 72, cz - 2, cz));   // port on the brick face
  }
  return B.build(M);
}

// ---------------------------------------------------------------- carried over from the original Paulo

function sHook(x, yRail, z, len = 140, r = 3.5) {
  // S-hook: top loop over the rail, shank, bottom loop
  const a = 13, pts = [];
  for (let k = 0; k <= 8; k++) { const t = PI * (k / 8); pts.push(V(x, yRail + a * Math.sin(t), z + a * Math.cos(t))); }
  for (let k = 0; k <= 8; k++) { const t = PI * (k / 8); pts.push(V(x, yRail - len - a * Math.sin(t), z - a * Math.cos(t))); }
  pts.push(V(x, yRail - len + 10, z + a - 2));
  return curveRod(pts, r, 48);
}

function potjieBoom(M) {
  // galvanised boom pole, swings in the side socket. Pivot group is returned so it can rotate.
  const pivot = new THREE.Group();
  pivot.name = 'Potjie boom';
  const B = new Part('Potjie boom pole');
  const H = 1600, arm = 380;
  B.add('galv', rod(V(0, DIM.box.top - 230, 0), V(0, H, 0), 16.8, 18));
  const cap = new THREE.SphereGeometry(17, 12, 8, 0, PI * 2, 0, PI / 2); cap.translate(0, H, 0);
  B.add('galv', cap);
  B.add('galv', rod(V(0, H - 20, 0), V(-arm, H - 20, 0), 8));
  B.add('galv', rod(V(-14, H - 230, 0), V(-arm + 40, H - 26, 0), 7));
  // chain
  const L = 13, links = 11;
  for (let i = 0; i < links; i++) {
    const tor = new THREE.TorusGeometry(11, 3.4, 6, 14); tor.scale(1, 1.7, 1);
    if (i % 2) tor.rotateY(PI / 2);
    tor.translate(-arm + 20, H - 40 - i * 2 * L, 0);
    B.add('galv', tor);
  }
  const hy = H - 40 - links * 2 * L;
  // triple potjie hook
  B.add('galv', rod(V(-arm + 20, hy + 8, 0), V(-arm + 20, hy - 40, 0), 5));
  for (const ang of [0, (2 * PI) / 3, (4 * PI) / 3]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, r = 6 + 34 * t;
      pts.push(V(-arm + 20 + r * Math.cos(ang), hy - 40 - 20 * Math.sin(PI * t) + 20 * t, r * Math.sin(ang)));
    }
    B.add('galv', curveRod(pts, 4, 16));
  }
  pivot.add(B.build(M));
  pivot.userData.hookPoint = V(-arm + 20, hy - 40, 0);
  return pivot;
}

function potjiePot(M, size = 3) {
  // three-legged cast-iron potjie, #3 (~7.5 L)
  const B = new Part(`Potjie pot #${size}`);
  const R0 = 140, H = 200;
  const prof = [];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const r = 40 + (R0 - 40) * Math.sin(Math.min(1, t * 1.7) * PI / 2) - (t > 0.75 ? (t - 0.75) * 120 : 0);
    prof.push(new THREE.Vector2(r, t * H));
  }
  prof.push(new THREE.Vector2(prof.at(-1).x + 8, H), new THREE.Vector2(prof.at(-1).x + 8, H + 10), new THREE.Vector2(prof.at(-1).x - 2, H + 10));
  B.add('castiron', new THREE.LatheGeometry(prof, 36));
  const lid = new THREE.LatheGeometry([new THREE.Vector2(118, 0), new THREE.Vector2(110, 18), new THREE.Vector2(70, 34), new THREE.Vector2(0, 38)], 36);
  lid.translate(0, H + 8, 0);
  B.add('castiron', lid);
  B.add('castiron', bentRod([V(-28, H + 46, 0), V(-28, H + 62, 0), V(28, H + 62, 0), V(28, H + 46, 0)], 6));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + PI / 6;
    B.add('castiron', rod(V(55 * Math.cos(a), 10, 55 * Math.sin(a)), V(70 * Math.cos(a), -55, 70 * Math.sin(a)), 9, 8));
  }
  // lugs + wire bail
  for (const s of [-1, 1]) {
    const lug = new THREE.TorusGeometry(14, 5, 6, 12); lug.rotateY(PI / 2); lug.translate(s * (R0 - 22), H - 18, 0);
    B.add('castiron', lug);
  }
  const bail = [];
  for (let k = 0; k <= 16; k++) { const t = PI * (k / 16); bail.push(V(-(R0 - 22) * Math.cos(t), H - 18 + 175 * Math.sin(t), 0)); }
  B.add('castiron', curveRod(bail, 4, 32));
  const g = B.build(M);
  g.userData.bailTop = V(0, H - 18 + 175, 0);
  return g;
}

function hingedGrid(M, name, w, d, handleLen) {
  // classic South African "toeklap" double grid with long handles
  const B = new Part(name);
  for (const y of [0, 30]) {
    const p = meshPanel(w, d, { bar: 14, barT: 5, sx: 36, sz: 18, strand: 3.2, t: 2.5 });
    B.add('zinc', p.frame.translate(0, y, 0));
    B.add('zinc', p.mesh.translate(0, y, 0));
  }
  for (const s of [-1, 1]) {
    B.add('zinc', bentRod([V(s * 40, 0, d / 2), V(s * 40, 0, d / 2 + handleLen), V(s * 20, 15, d / 2 + handleLen + 30)], 5));
    B.add('zinc', bentRod([V(s * 40, 30, d / 2), V(s * 40, 30, d / 2 + handleLen), V(s * 20, 15, d / 2 + handleLen + 30)], 5));
  }
  const ring = new THREE.TorusGeometry(16, 4, 6, 14); ring.rotateX(PI / 2); ring.translate(0, 15, d / 2 + handleLen + 45);
  B.add('zinc', ring);
  return B.build(M);
}

function ribStand(M) {
  // "staan rib stand": V-cradles that hang off the back wall, height-adjustable on a T-rod
  const B = new Part('Rib stand (V-cradle)');
  const zs = [-240, -195, -150, -105];
  for (const z of zs) {
    B.add('zinc', bentRod([V(-150, 130, z), V(-55, 10, z), V(55, 10, z), V(150, 130, z)], 5));
  }
  B.add('zinc', rod(V(-55, 10, zs[0]), V(-55, 10, zs.at(-1)), 5));
  B.add('zinc', rod(V(55, 10, zs[0]), V(55, 10, zs.at(-1)), 5));
  B.add('zinc', rod(V(0, 10, zs[0]), V(0, 10, zs.at(-1)), 5));
  B.add('zinc', rod(V(0, 10, zs[0] - 10), V(0, 300, zs[0] - 10), 7));
  B.add('zinc', rod(V(-50, 300, zs[0] - 10), V(50, 300, zs[0] - 10), 6));
  // clamp bracket over the back wall
  B.add('zinc', bmm(-25, 25, 190, 205, -300, -238));
  B.add('zinc', bmm(-25, 25, 130, 205, -306, -300));
  const g = B.build(M);
  g.position.set(-230, DIM.floorTop + 50, 0);
  return g;
}

function breadClamp(M) {
  const g = hingedGrid(M, 'Bread & coal clamp', 240, 420, 260);
  // stands up, leaning on the back wall
  g.rotation.set(-PI / 2 + 0.28, 0, 0);
  g.position.set(210, DIM.floorTop + 230, -150);
  return g;
}

function lidHolder(M) {
  // the rack in the accessory line-up photo; interpreted as the potjie lid holder / grid stand
  const B = new Part('Potjie lid holder');
  const w = 380, h = 560;
  B.add('frame', bentRod([V(-w / 2, 0, 0), V(-w / 2, h, 0), V(w / 2, h, 0), V(w / 2, 0, 0)], 6));
  B.add('frame', rod(V(-w / 2, 0, 0), V(w / 2, 0, 0), 6));
  for (const x of [-60, 60]) B.add('frame', rod(V(x, 0, 0), V(x, h, 0), 5));
  B.add('frame', bentRod([V(-90, h, 0), V(-90, h + 180, -20), V(90, h + 180, -20), V(90, h, 0)], 6));
  const g = B.build(M);
  // leaning against the right-hand legs
  g.rotation.set(0, PI / 2, 0);
  g.rotateX(-0.2);
  g.position.set(DIM.legX + 150, 0, 0);
  return g;
}

// ---------------------------------------------------------------- oven lid

function lid(M, sgn) {
  // One half of the brick-insulated hood. Hinged on the back rim and counterweighted,
  // so it lifts with one hand. Origin = hinge axis.
  const pivot = new THREE.Group();
  pivot.name = sgn < 0 ? 'Oven lid, left half' : 'Oven lid, right half';
  const B = new Part(pivot.name);
  const { x0, x1, z1 } = DIM.box, { H, skirt, run } = DIM.lid;
  const xa = sgn < 0 ? x0 + 2 : 2, xb = sgn < 0 ? -2 : x1 - 2;
  const xc = (xa + xb) / 2, w = xb - xa, D = z1 + 6 - DIM.hingeZ, t = 4, zb = 12;
  const L = Math.hypot(run, H - skirt);

  // steel shell: back, top, sloped front panel, front skirt, outer end plate
  B.add('frame', bmm(xa, xb, 0, H, zb, zb + t));
  B.add('frame', bmm(xa, xb, H - t, H, zb, D - run));
  B.add('frame', bmm(xa, xb, 0, skirt, D - t, D));
  const slope = new THREE.BoxGeometry(w, t, L);
  slope.rotateX(Math.atan2(H - skirt, run)); slope.translate(xc, (H + skirt) / 2 - 2, D - run / 2);
  B.add('frame', slope);
  const sh = new THREE.Shape();
  sh.moveTo(zb, 0);
  for (const sz of DIM.spitZ) {            // slots that drop over the spit rods
    const c = sz - DIM.hingeZ;
    sh.lineTo(c - 17, 0); sh.lineTo(c - 17, 78); sh.absarc(c, 78, 17, PI, 0, true); sh.lineTo(c + 17, 0);
  }
  sh.lineTo(D, 0); sh.lineTo(D, skirt); sh.lineTo(D - run, H); sh.lineTo(zb, H); sh.closePath();
  const end = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 8 });
  end.rotateY(-PI / 2);
  end.translate(sgn < 0 ? xa + t : xb, 0, 0);
  B.add('frame', end);
  if (sgn > 0) {                           // overlap strip that seals the centre joint
    B.add('frame', bmm(-24, 2, H, H + 3, zb, D - run));
    B.add('frame', bmm(-24, 2, 0, skirt, D, D + 3));
  }

  // firebrick lining
  const wi = w - 2 * t - 2;
  brickWall(B, wi, D - run - zb - t - 25, mx(TR(xc, H - t, zb + t + 25, PI / 2, 0, 0)));
  brickWall(B, wi, H - t - 8, mx(T(xc, 6, zb + t)));
  brickWall(B, wi, skirt - 10, mx(TR(xc, 6, D - t, 0, PI, 0)));
  brickWall(B, wi, L - 34, mx(TR(xc, H - t - 4, D - run - 4, Math.atan2(run, -(H - skirt)), 0, 0)));
  brickWall(B, D - run - zb - 40, H - 136, mx(TR(sgn < 0 ? xa + t : xb - t, 100, (zb + 30 + D - run) / 2, 0, -sgn * PI / 2, 0)));

  // handle
  for (const dx of [-160, 160]) B.add('zinc', rod(V(xc + dx, 80, D), V(xc + dx, 80, D + 75), 6));
  B.add('wood', rod(V(xc - 185, 80, D + 75), V(xc + 185, 80, D + 75), 15, 16));

  // dial thermometer on the sloped panel
  const tm = mx(TR(xc, (H + skirt) / 2 + 1, D - run / 2 + 1, -Math.atan2(run, H - skirt), 0, 0));
  const disc = (r, h, z) => { const g = new THREE.CylinderGeometry(r, r, h, 36); g.rotateX(PI / 2); g.translate(0, 0, z); return tm(g); };
  B.add('stainless', disc(52, 16, 8));
  B.add('dial', disc(45, 2, 16.5));
  for (let i = 0; i <= 10; i++) {
    const a = PI * 1.25 - (i / 10) * PI * 1.5;
    const g = box(i % 5 ? 2 : 3.5, i % 5 ? 7 : 12, 1.2);
    g.rotateZ(a - PI / 2); g.translate(37 * Math.cos(a), 37 * Math.sin(a), 18);
    B.add('castiron', tm(g));
  }
  const nd = box(3, 40, 1.5, 0, 14, 19.5); nd.rotateZ(-0.7);
  B.add('needle', tm(nd));
  B.add('castiron', disc(5, 4, 20));

  // exhaust stack with screw-down cap, at the back outer corner: air enters low at the
  // front, crosses the fire and the food, and leaves high at the back
  const sx = xc + sgn * 190, sz = 125;
  const cyl = (r, h, y, open = false) => { const g = new THREE.CylinderGeometry(r, r, h, 28, 1, open); g.translate(sx, y, sz); return g; };
  B.add('frame', cyl(50, 130, H + 65, true));
  B.add('frame', cyl(64, 5, H + 2));
  B.add('frame', cyl(74, 5, H + 152));
  B.add('frame', bmm(sx - 50, sx + 50, H + 70, H + 76, sz - 5, sz + 5));
  B.add('zinc', rod(V(sx, H + 70, sz), V(sx, H + 185, sz), 5));
  B.add('zinc', rod(V(sx - 28, H + 185, sz), V(sx + 28, H + 185, sz), 5));

  // hinge and counterweight
  B.add('zinc', rod(V(xa + 30, 0, 0), V(xb - 30, 0, 0), 9));
  for (const dx of [-250, 250]) {
    B.add('frame', bmm(xc + dx - 22, xc + dx + 22, -8, 50, -8, zb + 2));
    B.add('frame', sq(V(xc + dx, 8, 0), V(xc + dx, 95, -230), 12, 36));
  }
  B.add('frame', rod(V(xc - 275, 95, -230), V(xc + 275, 95, -230), 42, 24));

  pivot.add(B.build(M));
  pivot.position.set(0, DIM.rimY, DIM.hingeZ);
  return pivot;
}

// ---------------------------------------------------------------- new accessories

function fireboxSled(M) {
  // Mobile firebox: a V-shaped fire basket on sled runners. Wood burns in the cradle,
  // coals fall through onto the brick floor; hook an end ring with the poker to drag it.
  const B = new Part('Mobile firebox (sled fire basket)');
  for (const z of [-115, 115]) {
    B.add('frame', bmm(-205, 205, 0, 6, z - 16, z + 16));
    for (const s of [-1, 1]) {
      B.add('frame', sq(V(s * 205, 3, z), V(s * 240, 30, z), 6, 32));
      B.add('frame', sq(V(s * 170, 6, z), V(s * 170, 85, z), 20));
    }
  }
  for (let x = -180; x <= 180; x += 45) B.add('frame', bentRod([V(x, 180, -140), V(x, 85, -40), V(x, 85, 40), V(x, 180, 140)], 7));
  for (const [y, z] of [[180, -140], [180, 140], [78, -40], [78, 40], [78, -115], [78, 115]]) B.add('frame', rebar(V(-190, y, z), V(190, y, z), 6));
  for (const s of [-1, 1]) {
    B.add('frame', bmm(s * 190, s * 194, 78, 180, -140, 140));       // end heat shields
    const ring = new THREE.TorusGeometry(17, 5, 6, 16); ring.translate(s * 192, 197, 0);
    B.add('frame', ring);
  }
  const g = B.build(M);
  g.position.set(0, DIM.floorTop, 0);
  return g;
}

function halfFrame(B, mat, hgt = 25) {
  const { w, d } = DIM.half;
  for (const s of [-1, 1]) {
    B.add(mat, bmm(-w / 2, w / 2, 0, hgt, s * d / 2, s * (d / 2 - 5)));
    B.add(mat, bmm(s * w / 2, s * (w / 2 - 5), 0, hgt, -d / 2, d / 2));
  }
  supportPins(B);
}
function supportPins(B) {
  const { d, pinX } = DIM.half;
  for (const x of [-pinX, pinX]) for (const s of [-1, 1]) B.add('stainless', rod(V(x, 10, s * (d / 2 - 4)), V(x, 10, s * (d / 2 + 7)), 6));
}
function liftHandles(B, mat, y, zs, half = 70) {
  for (const z of zs) B.add(mat, bentRod([V(-half, y, z), V(-half, y + 48, z), V(half, y + 48, z), V(half, y, z)], 6));
}

function barGrid(M) {
  const B = new Part('Half grid: stainless round bar');
  const { w, d } = DIM.half;
  halfFrame(B, 'stainless');
  for (let x = -w / 2 + 14; x <= w / 2 - 14; x += 15.25) B.add('stainless', rod(V(x, 21, -d / 2 + 3), V(x, 21, d / 2 - 3), 4, 6));
  for (const z of [-d / 6, d / 6]) B.add('stainless', bmm(-w / 2, w / 2, 2, 17, z - 2.5, z + 2.5));
  liftHandles(B, 'stainless', 25, [-d / 2 + 3, d / 2 - 3]);
  return B.build(M);
}

function vGrid(M) {
  const B = new Part('Half grid: V-channel with drip trough');
  const { w, d } = DIM.half;
  halfFrame(B, 'zinc');
  for (let x = -w / 2 + 18; x <= w / 2 - 18; x += 26) {
    for (const s of [-1, 1]) {
      const g = box(15, 2, d - 58); g.rotateZ(s * 0.62); g.translate(x + s * 5.8, 17, -19);
      B.add('zinc', g);
    }
  }
  // channels drain into a trough across the front
  B.add('zinc', bmm(-w / 2 + 5, w / 2 - 5, 1, 3, d / 2 - 44, d / 2 - 5));
  B.add('zinc', bmm(-w / 2 + 5, w / 2 - 5, 1, 12, d / 2 - 46, d / 2 - 44));
  liftHandles(B, 'zinc', 25, [-d / 2 + 3, d / 2 - 3]);
  return B.build(M);
}

function plancha(M) {
  const B = new Part('Plancha (half length)');
  const { w, d } = DIM.half;
  for (const s of [-1, 1]) B.add('plate', bmm(-w / 2, w / 2, 0, 12, s * d / 2, s * (d / 2 - 30)));
  supportPins(B);
  B.add('plate', bmm(-w / 2, w / 2, 12, 22, -d / 2, d / 2 - 46));           // 10 mm cooking plate
  B.add('plate', bmm(-w / 2, w / 2, 22, 58, -d / 2, -d / 2 + 5));           // back splash
  for (const s of [-1, 1]) B.add('plate', bmm(s * w / 2, s * (w / 2 - 5), 22, 44, -d / 2, d / 2 - 46));
  // grease trough across the front
  B.add('plate', bmm(-w / 2, w / 2, 0, 3, d / 2 - 46, d / 2));
  B.add('plate', bmm(-w / 2, w / 2, 0, 30, d / 2 - 4, d / 2));
  for (const s of [-1, 1]) B.add('plate', bmm(s * w / 2, s * (w / 2 - 4), 0, 30, d / 2 - 46, d / 2));
  liftHandles(B, 'zinc', 58, [-d / 2 + 3]);
  liftHandles(B, 'zinc', 30, [d / 2 - 2]);
  return B.build(M);
}

function sandwichPress(M) {
  const grp = new THREE.Group(); grp.name = 'Sandwich press (half length)';
  const { w, d } = DIM.half;
  const B = new Part('Sandwich press: ribbed base plate');
  for (const s of [-1, 1]) B.add('plate', bmm(-w / 2, w / 2, 0, 12, s * d / 2, s * (d / 2 - 30)));
  supportPins(B);
  B.add('plate', bmm(-w / 2, w / 2, 12, 22, -d / 2, d / 2));
  for (let x = -w / 2 + 60; x <= w / 2 - 60; x += 28) B.add('plate', bmm(x - 3, x + 3, 22, 26, -d / 2 + 75, d / 2 - 95));
  for (const s of [-1, 1]) B.add('plate', bmm(s * (w / 2 - 50), s * (w / 2 - 62), 22, 46, -d / 2 + 32, -d / 2 + 58));
  grp.add(B.build(M));
  // weighted top plate, hinged at the back
  const top = new THREE.Group(); top.name = 'Sandwich press: top plate';
  const P = new Part('Sandwich press: weighted top plate');
  P.add('plate', bmm(-w / 2 + 45, w / 2 - 45, -6, 6, 20, d - 150));
  for (let x = -w / 2 + 60; x <= w / 2 - 60; x += 28) P.add('plate', bmm(x - 3, x + 3, -10, -6, 32, d - 162));
  for (const z of [140, d - 260]) P.add('plate', bmm(-w / 2 + 70, w / 2 - 70, 6, 24, z - 18, z + 18));    // press weights
  P.add('zinc', rod(V(-w / 2 + 40, 0, 0), V(w / 2 - 40, 0, 0), 7));
  for (const s of [-1, 1]) {
    P.add('plate', bmm(s * (w / 2 - 80), s * (w / 2 - 92), -6, 6, 0, 30));
    P.add('zinc', rod(V(s * 150, 6, d - 170), V(s * 150, 62, d - 62), 7));
  }
  P.add('wood', rod(V(-175, 62, d - 62), V(175, 62, d - 62), 15, 16));
  top.add(P.build(M));
  top.position.set(0, 36, -d / 2 + 45);
  grp.add(top);
  grp.userData.top = top;
  return grp;
}

function rotisserie(M, i) {
  // Self-contained unit: the motor bracket hangs on two studs on the right end wall,
  // the roller bracket on the left; lift both off and the spit comes with them.
  const grp = new THREE.Group(); grp.name = `Rotisserie ${i + 1}`;
  const z = DIM.spitZ[i], y = DIM.spitY, { x0, x1, top } = DIM.box;
  const K = new Part(`Rotisserie ${i + 1}: motor and roller brackets`);
  K.add('zinc', bmm(x1, x1 + 6, top - 130, y + 28, z - 48, z + 48));
  K.add('plastic', box(72, 130, 112, x1 + 44, y - 18, z));
  K.add('plastic', box(76, 18, 116, x1 + 44, y + 40, z));
  K.add('zinc', bmm(x0 - 6, x0, top - 130, y - 4, z - 42, z + 42));
  for (const dz of [-30, 30]) for (const [xa, xb] of [[x1, x1 + 12], [x0 - 12, x0]]) K.add('zinc', rod(V(xa, top - 100, z + dz), V(xb, top - 100, z + dz), 7));
  for (const dz of [-16, 16]) K.add('zinc', rod(V(x0 - 16, y - 9, z + dz), V(x0 + 2, y - 9, z + dz), 11, 14));
  grp.add(K.build(M));
  const spit = new THREE.Group(); spit.name = `Spit rod ${i + 1}`;
  const S = new Part(`Spit rod ${i + 1}`);
  S.add('stainless', box(1650, 10, 10, -25, 0, 0));
  S.add('wood', rod(V(-950, 0, 0), V(-850, 0, 0), 14, 16));
  for (const [fx, dirn] of [[-520, 1], [-190, -1], [190, 1], [520, -1]]) {
    S.add('stainless', box(40, 26, 26, fx, 0, 0));
    S.add('stainless', rod(V(fx, 13, 0), V(fx, 40, 0), 4));
    S.add('stainless', rod(V(fx - 15, 40, 0), V(fx + 15, 40, 0), 4));
    for (const s of [-1, 1]) S.add('stainless', bentRod([V(fx, 0, s * 8), V(fx + dirn * 30, 0, s * 26), V(fx + dirn * 150, 0, s * 26)], 3));
  }
  spit.add(S.build(M));
  spit.position.set(0, y, z);
  grp.add(spit);
  grp.userData.spit = spit;
  return grp;
}

function upperShelf(M) {
  // Lift-off shelf: two posts drop into the sockets outside the back corners. It sits just
  // in front of the open lids, so it comes off before a lid is closed.
  const B = new Part('Upper shelf (lifts off)');
  const y = 1330;
  for (const sgn of [-1, 1]) B.add('frame', sq(V(sgn * 786, 785, -330), V(sgn * 786, y - 4, -330), 40));
  B.add('frame', sq(V(-806, y - 20, -330), V(806, y - 20, -330), 40, 40));
  const p = meshPanel(1612, 210, { bar: 22, barT: 5 });
  B.add('frame', p.frame.translate(0, y, -255));
  B.add('frame', p.mesh.translate(0, y, -255));
  B.add('frame', rebar(V(-806, y + 4, -146), V(806, y + 4, -146), 6));
  return B.build(M);
}

function poker(M) {
  const B = new Part('Rebar poker (moves the firebox)');
  const ring = new THREE.TorusGeometry(18, 4.5, 6, 16); ring.translate(0, -16, 0);
  B.add('frame', ring);
  for (let i = 0; i < 4; i++) {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, rad = 22 * Math.sin(PI * u), ang = (i / 4) * PI * 2 + u * PI * 0.9;
      pts.push(V(rad * Math.cos(ang), -36 - 134 * u, rad * Math.sin(ang)));
    }
    B.add('frame', curveRod(pts, 4, 30));
  }
  B.add('frame', rebar(V(0, -170, 0), V(0, -720, 0), 6, 9));
  B.add('frame', bentRod([V(0, -720, 0), V(0, -760, 0), V(0, -778, -38), V(0, -748, -55)], 6));
  const g = B.build(M);
  g.position.set(DIM.box.x0 - 45, 930, -265);
  return g;
}

function toolHooks(M) {
  const B = new Part('Tool hooks (S-hooks)');
  [-225, -195, -165, -135, -105].forEach((z, i) => {
    const g = sHook(0, 0, 0, 125 + (i % 2) * 22);
    g.rotateY(PI / 2); g.translate(DIM.box.x0 - 45, 930, z);
    B.add('zinc', g);
  });
  return B.build(M);
}

function ashShovel(M) {
  const B = new Part('Ash shovel');
  const w = 150, l = 190;
  B.add('frame', bmm(-w / 2, w / 2, 0, 3, 0, l));
  for (const s of [-1, 1]) B.add('frame', bmm(s * w / 2 - s * 3, s * w / 2, 0, 30, 0, l));
  B.add('frame', bmm(-w / 2, w / 2, 0, 30, 0, 3));
  B.add('frame', rebar(V(0, 15, 0), V(0, 15, -320), 6, 9));
  const loop = new THREE.TorusGeometry(18, 4, 6, 14); loop.rotateY(PI / 2); loop.translate(0, 15, -340);
  B.add('frame', loop);
  const g = B.build(M);
  g.rotation.set(PI / 2, 0, 0);          // hangs from the hook under the front rail
  g.position.set(-600, 215, DIM.legZ + 46);
  return g;
}

function foldTable(M) {
  const pivot = new THREE.Group(); pivot.name = 'Fold-up stainless table';
  const B = new Part('Fold-up stainless table');
  const w = 1420, d = 320, t = 2.5, lip = 25;
  B.add('stainless', bmm(-w / 2, w / 2, -t, 0, 0, d));
  B.add('stainless', bmm(-w / 2, w / 2, -lip, 0, d - t, d));
  for (const s of [-1, 1]) B.add('stainless', bmm(s * w / 2, s * (w / 2 - t), -lip, 0, 0, d));
  B.add('frame', rod(V(-w / 2, -6, 6), V(w / 2, -6, 6), 7));
  for (const x of [-620, 0, 620]) B.add('frame', sq(V(x, -lip - 4, 10), V(x, -lip - 4, d - 30), 20, 12));
  pivot.add(B.build(M));
  pivot.position.set(0, DIM.box.base, DIM.box.z1 + 3);
  return pivot;
}

const CAGE = { w: 1100, h: 400, d: 120, y0: 260 };
function storageCage(M) {
  const B = new Part('Grid & accessory storage cage (back)');
  const { w, h, d, y0 } = CAGE, zb = -DIM.legZ - 22;
  const back = expandedMesh(w, h); back.rotateX(PI / 2); back.translate(0, y0 + h / 2, zb - d);
  B.add('frame', back);
  B.add('frame', expandedMesh(w, d).translate(0, y0, zb - d / 2));
  for (const s of [-1, 1]) {
    const side = expandedMesh(d, h); side.rotateX(PI / 2); side.rotateY(PI / 2); side.translate(s * w / 2, y0 + h / 2, zb - d / 2);
    B.add('frame', side);
    for (const z of [zb - d, zb]) B.add('frame', sq(V(s * w / 2, y0, z), V(s * w / 2, y0 + h, z), 20));
  }
  B.add('frame', rebar(V(-w / 2, y0 + h, zb - d), V(w / 2, y0 + h, zb - d), 6));
  B.add('frame', sq(V(-w / 2, y0, zb - d), V(w / 2, y0, zb - d), 20));
  for (const x of [-420, -140, 140, 420]) {
    const pts = [];
    for (let k = 0; k <= 24; k++) { const a = (k / 24) * PI * 3; pts.push(V(x + 12 * Math.cos(a), y0 - 10 - k * 2.2, zb - d - 12 + 12 * Math.sin(a))); }
    B.add('frame', curveRod(pts, 3.5, 48));
  }
  for (const s of [-1, 1]) B.add('frame', bmm(s * 450 - 15, s * 450 + 15, y0 + h - 10, y0 + h + 12, zb - d, zb + 30));
  return B.build(M);
}

function storedGrids(M) {
  const grp = new THREE.Group(); grp.name = 'Grids in storage';
  const zb = -DIM.legZ - 22;
  const big = hingedGrid(M, 'Large zinc-plated grid', 480, 340, 200);
  big.rotation.set(PI / 2, 0, 0);
  big.position.set(-260, CAGE.y0 + 230, zb - 75);
  const small = hingedGrid(M, 'Small zinc-plated grid', 330, 250, 180);
  small.rotation.set(PI / 2, 0, 0.06);
  small.position.set(240, CAGE.y0 + 190, zb - 45);
  grp.add(big, small);
  return grp;
}

function cover(M) {
  const B = new Part('Heavy-duty waterproof cover');
  const g = new THREE.BoxGeometry(1780, 1480, 1110, 16, 12, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const sag = (y > 700 ? 0 : 1) * 12 * Math.sin(x / 120) * Math.sin(y / 140);
    p.setXYZ(i, x * (1 + 0.012 * Math.sin(y / 90)), y, z + Math.sign(z) * sag);
  }
  g.computeVertexNormals();
  g.translate(55, 742, -130);
  B.add('fabric', g);
  return B.build(M);
}

// ---------------------------------------------------------------- assembly

export const SURFACES = [
  { key: 'none', label: 'Empty' },
  { key: 'barGrid', label: 'Round-bar grid' },
  { key: 'vGrid', label: 'V-channel grid' },
  { key: 'plancha', label: 'Plancha' },
  { key: 'press', label: 'Sandwich press' },
];
// label = height of the cooking surface above the brick floor the coals lie on
export const LEVELS = DIM.rails.map((y, i) => `${y + 22 - DIM.floorTop} mm${i === 0 ? ' (closest)' : ''}`);

export const ACCESSORIES = [
  { key: 'lids', label: 'Brick-insulated oven lids' },
  { key: 'shelf', label: 'Upper shelf (lifts off)' },
  { key: 'firebox', label: 'Mobile firebox (sled)' },
  { key: 'rot1', label: 'Rotisserie 1 (back)' },
  { key: 'rot2', label: 'Rotisserie 2 (front)' },
  { key: 'boom', label: 'Potjie boom (chain + hook)' },
  { key: 'potjie', label: 'Potjie pot #3 on the boom' },
  { key: 'ribStand', label: 'Staan rib stand' },
  { key: 'breadClamp', label: 'Bread & coal clamp' },
  { key: 'table', label: 'Fold-up stainless table' },
  { key: 'cage', label: 'Back storage cage' },
  { key: 'storedGrids', label: 'Large & small zinc grids (stored)' },
  { key: 'poker', label: 'Rebar poker' },
  { key: 'shovel', label: 'Ash shovel' },
  { key: 'hooks', label: 'Tool hooks' },
  { key: 'lidHolder', label: 'Potjie lid holder' },
  { key: 'cover', label: 'Waterproof cover' },
];

const NOSHELF = ['lids', 'firebox', 'boom', 'table', 'cage', 'storedGrids', 'poker', 'shovel', 'hooks'];
const BASE = [...NOSHELF, 'shelf'];
export const PRESETS = {
  showcase: { label: 'Showcase', on: [...BASE, 'lidHolder'], slots: { L: ['plancha', 3], R: ['vGrid', 3] }, firebox: -347 },
  grill: { label: 'Twin grids', on: BASE, slots: { L: ['barGrid', 3], R: ['vGrid', 3] } },
  flat: { label: 'Plancha + press', on: BASE, slots: { L: ['plancha', 3], R: ['press', 3] } },
  spit: { label: 'Double rotisserie', on: [...BASE, 'rot1', 'rot2'] },
  potjie: { label: 'Potjie & ribs', on: [...BASE, 'potjie', 'ribStand', 'breadClamp', 'lidHolder'], firebox: 426, boom: 0 },
  oven: { label: 'Oven (lids closed)', on: NOSHELF, slots: { L: ['barGrid', 3], R: ['vGrid', 3] }, lids: [0, 0] },
  halfOven: { label: 'Half oven', on: NOSHELF, slots: { L: ['barGrid', 3], R: ['plancha', 3] }, lids: [0, 1], firebox: -347 },
  covered: { label: 'Covered', on: ['lids', 'cover', 'table', 'cage', 'firebox'], lids: [0, 0], tableOpen: 0 },
};

export function buildPaulo({ finish = 'raw' } = {}) {
  resetSeed();
  const M = createMaterials();
  applyFinish(M, finish);
  const root = new THREE.Group();
  root.name = 'Paulo Braai XL';
  root.scale.setScalar(0.001);

  const body = new THREE.Group(); body.name = 'Paulo body';
  body.add(cart(M), braaiBox(M), airVents(M));
  root.add(body);

  const parts = {};
  const put = (key, obj) => { parts[key] = obj; root.add(obj); };

  const lidL = lid(M, -1), lidR = lid(M, 1);
  const lids = new THREE.Group(); lids.name = 'Oven lids'; lids.add(lidL, lidR);
  put('lids', lids);
  put('shelf', upperShelf(M));
  put('firebox', fireboxSled(M));
  put('rot1', rotisserie(M, 0));
  put('rot2', rotisserie(M, 1));
  const boom = potjieBoom(M);
  boom.position.set(DIM.box.x1 + 26, 0, 0);
  put('boom', boom);
  const pot = potjiePot(M);
  boom.add(pot);
  const hp = boom.userData.hookPoint;
  pot.position.set(hp.x, hp.y - pot.userData.bailTop.y + 6, hp.z);
  parts.potjie = pot;
  const rs = ribStand(M); rs.position.set(-430, DIM.box.top - 204, -60); put('ribStand', rs);
  const bc = breadClamp(M); bc.position.set(-150, DIM.floorTop + 230, -210); put('breadClamp', bc);
  put('table', foldTable(M));
  put('cage', storageCage(M));
  put('storedGrids', storedGrids(M));
  put('poker', poker(M));
  put('shovel', ashShovel(M));
  put('hooks', toolHooks(M));
  put('lidHolder', lidHolder(M));
  put('cover', cover(M));

  // half-length cooking surfaces: any one in either half, at any of the three rail heights
  const surf = { barGrid: barGrid(M), vGrid: vGrid(M), plancha: plancha(M), press: sandwichPress(M) };
  for (const s of Object.values(surf)) root.add(s);
  const slots = { L: ['none', 3], R: ['none', 3] };
  const placeSlots = () => {
    for (const s of Object.values(surf)) s.visible = false;
    for (const side of ['L', 'R']) {
      const [type, lvl] = slots[side];
      if (type === 'none') continue;
      surf[type].visible = true;
      surf[type].position.set((side === 'L' ? -1 : 1) * DIM.half.cx, DIM.rails[lvl], 0);
    }
  };

  const api = {
    root, parts, materials: M, body, surf,
    setFinish: (k) => applyFinish(M, k),
    setVisible: (key, v) => {
      if (!parts[key]) return;
      parts[key].visible = v;
      if (key === 'boom' && !v) parts.potjie.visible = false;
    },
    // put a surface in the left or right half; a surface exists once, so it moves if already placed
    setSlot(side, type, lvl = slots[side][1]) {
      const other = side === 'L' ? 'R' : 'L';
      if (type !== 'none' && slots[other][0] === type) slots[other][0] = 'none';
      slots[side] = [type, lvl];
      placeSlots();
      return { L: [...slots.L], R: [...slots.R] };
    },
    applyPreset(name) {
      const p = PRESETS[name];
      for (const { key } of ACCESSORIES) parts[key].visible = p.on.includes(key);
      if (parts.potjie.visible) parts.boom.visible = true;
      slots.L = [...(p.slots?.L ?? ['none', 3])];
      slots.R = [...(p.slots?.R ?? ['none', 3])];
      placeSlots();
      const st = { tableOpen: p.tableOpen ?? 1, lidL: p.lids?.[0] ?? 1, lidR: p.lids?.[1] ?? 1, firebox: p.firebox ?? 0, boom: p.boom ?? 180, press: 0.4 };
      api.setTableOpen(st.tableOpen); api.setLid('L', st.lidL); api.setLid('R', st.lidR);
      api.setFirebox(st.firebox); api.setBoomAngle((st.boom * PI) / 180); api.setPress(st.press);
      return { ...st, vis: Object.fromEntries(ACCESSORIES.map(({ key }) => [key, parts[key].visible])), slots: { L: [...slots.L], R: [...slots.R] } };
    },
    setTableOpen: (f) => { parts.table.rotation.x = (1 - f) * (PI / 2); },   // 0 folded, 1 up
    setLid: (side, f) => { (side === 'L' ? lidL : lidR).rotation.x = -f * (100 * PI) / 180; },  // 0 closed, 1 open
    setFirebox: (x) => { parts.firebox.position.x = x; },                    // mm along the floor
    setPress: (f) => { surf.press.userData.top.rotation.x = -f * (75 * PI) / 180; },
    setBoomAngle: (a) => { parts.boom.rotation.y = a; },                     // 0 = over the fire
    spin: (dt) => { for (const k of ['rot1', 'rot2']) parts[k].userData.spit.rotation.x += dt * 1.2; },
  };
  api.applyPreset('showcase');
  return api;
}
