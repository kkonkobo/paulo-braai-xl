import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildPaulo, ACCESSORIES, PRESETS, FINISHES, SURFACES, LEVELS, SPIT_MODES, DIM } from './model.js';
import { t, lang } from './i18n.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcdfe2);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.85, -0.05);
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 0.25;
controls.maxDistance = 9;

const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
sun.position.set(2.2, 4, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2.2, bottom: -1.2, near: 0.5, far: 10 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.01;
scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8d8172, 0.6));

const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0xb9b5ae, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0xa9a49c, roughness: 1 }));
wall.position.set(0, 2, -1.5);
wall.receiveShadow = true;
scene.add(wall);

const paulo = buildPaulo({ finish: params.get('finish') || 'black' });
scene.add(paulo.root);

// ------------------------------------------------------------- dimensions (mm)
const { box: BX, rimY, floorTop, clearZ, half: HF } = DIM;
const shelfOn = () => paulo.parts.shelf.visible;
const tableUp = () => paulo.parts.table.visible && Math.abs(paulo.parts.table.rotation.x) < 0.05;
// [from, to, offset of the dimension line, shown when]; the label is the measured length
const DIMS = {
  outer: [
    [[BX.x0, rimY, BX.z1], [BX.x1, rimY, BX.z1], [0, 0, 170]],
    [[BX.x0, rimY, BX.z0], [BX.x0, rimY, BX.z1], [-190, 0, 0]],
    [[BX.x1, 0, BX.z1], [BX.x1, rimY, BX.z1], [110, 0, 110]],
    [[BX.x0, BX.base, BX.z1], [BX.x0, BX.top, BX.z1], [-90, 0, 90]],
    [[-848, 0, 400], [910, 0, 400], [0, 0, 260]],
    [[-806, 0, -330], [-806, 1330, -330], [-170, 0, 0], shelfOn],
    [[-806, 1341, -40], [806, 1341, -40], [0, 110, 0], shelfOn],
    [[806, 1341, -360], [806, 1341, -40], [120, 0, 0], shelfOn],
    [[-710, 641, 683], [710, 641, 683], [0, 0, 100], tableUp],
    [[710, 641, 363], [710, 641, 683], [120, 0, 0], tableUp],
  ],
  inner: [
    [[-695, rimY, -200], [695, rimY, -200], [0, 0, 0]],
    [[HF.cx, rimY, -clearZ], [HF.cx, rimY, clearZ], [0, 0, 0]],
    [[-HF.cx - HF.w / 2, rimY, 200], [-HF.cx + HF.w / 2, rimY, 200], [0, 0, 0]],
    [[690, floorTop, 0], [690, rimY, 0], [0, 0, 0]],
    [[-200, floorTop, 60], [200, floorTop, 60], [0, 0, 60]],
    [[200, floorTop, -60], [200, floorTop, 60], [60, 0, 0]],
  ],
};
const dimMat = new LineMaterial({ color: 0x1463c2, linewidth: 1.6, depthTest: false, transparent: true });
const dimSets = {};
for (const [key, list] of Object.entries(DIMS)) {
  const pos = [], labels = [];
  const grp = new THREE.Group();
  for (const [a, b, off, when] of list) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), O = new THREE.Vector3(...off);
    const dir = B.clone().sub(A).normalize();
    // end caps follow the offset; with no offset, any direction square to the line
    const cap = O.lengthSq() ? O.clone().normalize() : new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
    const P = A.clone().add(O), Q = B.clone().add(O), c = cap.multiplyScalar(22);
    const segs = [P, Q, P.clone().sub(c), P.clone().add(c), Q.clone().sub(c), Q.clone().add(c)];
    if (O.lengthSq()) segs.push(A, P, B, Q);
    const first = pos.length / 6;
    for (const v of segs) pos.push(v.x / 1000, v.y / 1000, v.z / 1000);
    const div = document.createElement('div');
    div.className = 'dim';
    div.textContent = `${Math.round(A.distanceTo(B))} mm`;
    app.append(div);
    labels.push({ div, at: P.clone().add(Q).multiplyScalar(0.0005), when, first, count: segs.length / 2 });
  }
  const geo = new LineSegmentsGeometry().setPositions(pos);
  const lines = new LineSegments2(geo, dimMat);
  lines.renderOrder = 10; lines.frustumCulled = false;
  grp.add(lines);
  scene.add(grp);
  dimSets[key] = { grp, labels, geo, pos, on: false };
}
function setDims(key, on) {
  const d = dimSets[key];
  d.on = on; d.grp.visible = on;
  if (!on) for (const l of d.labels) l.div.style.display = 'none';
}
const dimPt = new THREE.Vector3();
function placeDims() {
  const w = app.clientWidth, h = app.clientHeight;
  for (const d of Object.values(dimSets)) {
    if (!d.on) continue;
    let dirty = false;
    for (const l of d.labels) {
      const show = !l.when || l.when();
      if (show !== (l.shown ?? true)) {   // collapse the lines of a dimension whose part is away
        l.shown = show; dirty = true;
        const arr = d.geo.attributes.instanceStart.data.array;
        for (let i = l.first * 6; i < (l.first + l.count) * 6; i++) arr[i] = show ? d.pos[i] : 0;
      }
      dimPt.copy(l.at).project(camera);
      const vis = show && dimPt.z < 1;
      l.div.style.display = vis ? '' : 'none';
      if (vis) l.div.style.transform = `translate(-50%, -50%) translate(${((dimPt.x + 1) / 2) * w}px, ${((1 - dimPt.y) / 2) * h}px)`;
    }
    if (dirty) d.geo.attributes.instanceStart.data.needsUpdate = true;
  }
}

// ------------------------------------------------------------- views
const VIEWS = {
  'Front ¾': [2.2, 1.8, 3.4],
  Front: [0, 1.15, 4.1],
  Inside: [0.5, 2.6, 1.7],
  Back: [-0.9, 1.6, -3.4],
  Top: [0, 4.4, 0.5],
  'Motor mount': [1.75, 1.3, 0.75, 0.8, 1.0, -0.05],
  'Spit bridge': [-0.45, 1.5, 0.75, 0, 1.0, -0.1],
  'Ash clean-out': [-0.35, 2.15, 0.8, 0, 0.66, 0],
  'Rack hangers': [0.12, 1.24, 0.3, -0.2, 0.97, -0.34],   // close-ups carry their own look-at point
};
let tween = null;
const HOME = new THREE.Vector3(0, 0.85, -0.05);
const viewTarget = (name) => (VIEWS[name].length > 3 ? new THREE.Vector3(...VIEWS[name].slice(3)) : HOME.clone());
const goView = (name) => { tween = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[name].slice(0, 3)), t: 0, tFrom: controls.target.clone(), tTo: viewTarget(name) }; };
{ const v0 = VIEWS[params.get('view')] ? params.get('view') : 'Front ¾'; camera.position.set(...VIEWS[v0].slice(0, 3)); controls.target.copy(viewTarget(v0)); }

// ------------------------------------------------------------- UI
const ui = document.getElementById('ui');
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : e.setAttribute(k, v);
  e.append(...kids);
  return e;
};
const section = (title) => { const s = el('section', {}, el('h3', {}, t(title))); ui.append(s); return s; };
const seg = (cls = 'seg wrap') => el('div', { class: cls });

const boxes = {}, sliders = {}, selects = {};
// push model state (from a preset) back into the controls
function sync(st) {
  for (const [k, v] of Object.entries(st.vis)) if (boxes[k]) boxes[k].checked = v;
  st.spits.forEach((m, i) => (selects.spit[i].value = m));
  for (const side of ['L', 'R']) { selects[side].type.value = st.slots[side][0]; selects[side].level.value = st.slots[side][1]; }
  sliders.lidL.value = st.lidL * 100; sliders.lidR.value = st.lidR * 100;
  sliders.table.value = st.tableOpen * 100; sliders.firebox.value = st.firebox;
  sliders.boom.value = st.boom; sliders.press.value = st.press * 100;
}

document.documentElement.lang = lang;
document.title = t('Paulo Braai XL: 3D concept');
document.getElementById('sub').textContent = t('Drag to orbit, pinch to zoom · tap a part to move it');
document.getElementById('specs').innerHTML = `${t('Braai box')} <b>1520 × 720 mm</b> · ${t('cooking area')} <b>1390 × 658 mm</b>, ${t('two halves of')} <b>646 × 640</b> · ${t('surface height')} <b>92 ${t('to')} 292 mm</b> ${t('above the floor')}`;

const langRow = seg('seg');
for (const [k, name] of [['fr', 'Français'], ['en', 'English']]) {
  const b = el('button', { onclick: () => { const u = new URL(location.href); u.searchParams.set('lang', k); location.href = u; } }, name);
  if (k === lang) b.classList.add('on');
  langRow.append(b);
}
section('Language').append(langRow);

const finish0 = params.get('finish') || 'black';
const finishRow = seg('seg');
for (const [k, f] of Object.entries(FINISHES)) {
  const b = el('button', { onclick: () => { paulo.setFinish(k); finishRow.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); } }, t(f.label));
  if (k === finish0) b.classList.add('on');
  finishRow.append(b);
}
section('Finish').append(finishRow);

const presetRow = seg();
for (const [k, p] of Object.entries(PRESETS)) presetRow.append(el('button', { onclick: () => sync(paulo.applyPreset(k)) }, t(p.label)));
section('Setup').append(presetRow);

const sSurf = section('Cooking surfaces and height above the coals');
for (const [side, name] of [['L', t('Left half')], ['R', t('Right half')]]) {
  const type = el('select', { 'aria-label': `${name}, ${t('surface')}` }, ...SURFACES.map((s) => el('option', { value: s.key }, t(s.label))));
  const level = el('select', { 'aria-label': `${name}, ${t('height')}` }, ...LEVELS.map((l, i) => el('option', { value: i }, l.replace('(closest)', t('(closest)')))));
  const apply = () => {
    const slots = paulo.setSlot(side, type.value, +level.value);
    for (const s of ['L', 'R']) selects[s].type.value = slots[s][0];
  };
  type.addEventListener('change', apply); level.addEventListener('change', apply);
  selects[side] = { type, level };
  sSurf.append(el('div', { class: 'slot' }, el('span', {}, name), type, level));
}

const sSpit = section('Rotisseries (full length, or half with a grill beside)');
selects.spit = [t('Back spit'), t('Front spit')].map((name, i) => {
  const sel = el('select', { 'aria-label': name }, ...SPIT_MODES.map((m) => el('option', { value: m.key }, t(m.label))));
  sel.addEventListener('change', () => paulo.setSpit(i, sel.value));
  sSpit.append(el('div', { class: 'slot two' }, el('span', {}, name), sel));
  return sel;
});

const sMove = section('Move parts');
// the upper shelf sits in the lids' swing path: it lifts off before a lid moves
const moveLid = (side, v) => {
  if (v < 100 && boxes.shelf.checked) { boxes.shelf.checked = false; paulo.setVisible('shelf', false); }
  paulo.setLid(side, v / 100);
};
const range = (key, en, min, max, fn) => {
  const label = t(en);
  const r = el('input', { type: 'range', min, max, step: 1, 'aria-label': label, oninput: (e) => fn(+e.target.value) });
  sliders[key] = r;
  return el('label', { class: 'range' }, el('span', {}, label), r);
};
let spin = true;
sMove.append(
  range('lidL', 'Left lid: closed ↔ open', 0, 100, (v) => moveLid('L', v)),
  range('lidR', 'Right lid: closed ↔ open', 0, 100, (v) => moveLid('R', v)),
  range('firebox', 'Slide the mobile firebox', -480, 480, (v) => paulo.setFirebox(v)),
  range('press', 'Sandwich press: closed ↔ open', 0, 100, (v) => paulo.setPress(v / 100)),
  range('ashGate', 'Ash gate: shut ↔ open', 0, 100, (v) => paulo.setAshGate(v / 100)),
  range('ashDrawer', 'Ash drawer: in ↔ out', 0, 100, (v) => paulo.setAshDrawer(v / 100)),
  range('table', 'Table: folded ↔ up', 0, 100, (v) => paulo.setTableOpen(v / 100)),
  range('boom', 'Swing potjie boom', -180, 180, (v) => paulo.setBoomAngle((v * Math.PI) / 180)),
  el('label', {}, el('input', { type: 'checkbox', checked: '', onchange: (e) => (spin = e.target.checked) }), t('Turn the rotisseries')),
  el('label', {}, el('input', { type: 'checkbox', onchange: (e) => paulo.setBricks(!e.target.checked) }), t('Hide the firebricks (show how things are fixed)')),
);

sliders.ashGate.value = +(params.get('gate') || 0); sliders.ashDrawer.value = +(params.get('drawer') || 0);
paulo.setAshGate(sliders.ashGate.value / 100); paulo.setAshDrawer(sliders.ashDrawer.value / 100);
const list = el('div', { class: 'list' });
for (const { key, label } of ACCESSORIES) {
  if (key.startsWith('rot')) continue;   // rotisseries have their own selects
  const cb = el('input', {
    type: 'checkbox', onchange: (e) => {
      paulo.setVisible(key, e.target.checked);
      if (key === 'potjie' && e.target.checked) { paulo.setVisible('boom', true); boxes.boom.checked = true; }
      if (key === 'boom' && !e.target.checked) boxes.potjie.checked = false;
      if (key === 'shelf' && e.target.checked) for (const side of ['L', 'R']) { paulo.setLid(side, 1); sliders['lid' + side].value = 100; }
    },
  });
  boxes[key] = cb;
  list.append(el('label', {}, cb, t(label)));
}
section('Accessories').append(list);

const viewRow = seg();
for (const k of Object.keys(VIEWS)) viewRow.append(el('button', { onclick: () => goView(k) }, t(k)));
let autoRotate = false;
viewRow.append(el('button', { onclick: (e) => { autoRotate = !autoRotate; e.target.classList.toggle('on', autoRotate); } }, t('Auto-rotate')));
section('View').append(viewRow);

const sDim = section('Dimensions');
const dimBoxes = {};
for (const [key, label, on] of [['outer', 'Outside dimensions', true], ['inner', 'Inside dimensions', false]]) {
  const want = params.has('dims') ? ['all', key].includes(params.get('dims')) : on;
  const cb = el('input', { type: 'checkbox', onchange: (e) => setDims(key, e.target.checked) });
  cb.checked = want; setDims(key, want);
  dimBoxes[key] = cb;
  sDim.append(el('label', {}, cb, t(label)));
}
const H = LEVELS.map((l) => parseInt(l, 10)).join(' · ');
const rows = [
  ['Braai box, outside (L × W × H)', '1520 × 720 × 360'],
  ['Rim height above the ground', '1006'],
  ['Cooking area inside the bricks', '1390 × 658'],
  ['Depth from brick floor to rim', '330'],
  ['Half surface (grid, plancha, press)', '646 × 640'],
  ['Cooking height above the floor', H],
  ['Each half lid (length × height)', '758 × 260'],
  ['Upper shelf (L × W), deck height', `1612 × 320, ${t('at')} 1330`],
  ['Fold-up table (L × W), height', `1420 × 320, ${t('at')} 640`],
  ['Mobile firebox (L × W × H)', '484 × 294 × 219'],
  ['Ash slot in the floor', '400 × 120'],
  ['Ash drawer (W × D × H)', '428 × 480 × 98'],
  ['Spit axes: spacing, height above rim', `330 ${t('apart')}, 70 ${t('up')}`],
  ['Wheel diameter', '296'],
  ['Overall, cart with handles (L × W)', '1758 × 810'],
  ['Overall, lids open and table up (D × H)', '1523 × 1810'],
  ['Overall length with the boom swung out', '2018'],
  ['Under the cover (L × W × H)', '1803 × 1153 × 1482'],
];
sDim.append(
  el('table', { class: 'dims' }, ...rows.map(([k, v]) => el('tr', {}, el('th', { scope: 'row' }, t(k)), el('td', {}, v)))),
  el('p', { class: 'note' }, t('All sizes in millimetres (10 mm = 1 cm).')),
);

section('Export').append(el('button', {
  class: 'primary', onclick: async () => {
    const clone = paulo.root.clone(true);
    const hidden = []; clone.traverse((o) => { if (!o.visible) hidden.push(o); });
    hidden.forEach((o) => o.removeFromParent());
    const glb = await new GLTFExporter().parseAsync(clone, { binary: true });
    el('a', { href: URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' })), download: 'paulo-braai-xl.glb' }).click();
  },
}, t('Download current setup (.glb)')));

if (params.get('bricks') === '0') paulo.setBricks(false);
sync(paulo.applyPreset(PRESETS[params.get('preset')] ? params.get('preset') : 'showcase'));

// hover names a part; a click or tap on a moving part operates it
const tip = document.getElementById('tip');
const pop = document.getElementById('pop');
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const visibleUp = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const [lidLObj, lidRObj] = paulo.parts.lids.children;
const TOGGLES = new Map([
  [paulo.body.getObjectByName('Ash gate'), 'ashGate'], [paulo.body.getObjectByName('Ash drawer'), 'ashDrawer'],
  [lidLObj, 'lidL'], [lidRObj, 'lidR'], [paulo.parts.table, 'table'], [paulo.parts.boom, 'boom'],
  [paulo.surf.press.userData.top, 'press'],
]);
const SURF = new Map(Object.entries(paulo.surf).map(([k, o]) => [o, k]));
// what a part does when clicked: a slider to flip, a surface to raise / lower, or the firebox to slide
function actionOf(o) {
  for (; o; o = o.parent) {
    if (TOGGLES.has(o)) return { toggle: TOGGLES.get(o) };
    if (SURF.has(o)) return { surface: SURF.get(o) };
    if (o === paulo.parts.firebox) return { firebox: true };
  }
  return null;
}
const anims = {};   // slider key -> value it is gliding to
const glide = (key, to) => { anims[key] = Math.max(+sliders[key].min, Math.min(+sliders[key].max, to)); };
function stepAnims(dt) {
  for (const [key, to] of Object.entries(anims)) {
    const r = sliders[key], span = r.max - r.min, v = +r.value;
    const nv = Math.abs(to - v) <= span * dt * 1.6 ? to : v + Math.sign(to - v) * span * dt * 1.6;
    r.value = nv; r.dispatchEvent(new Event('input'));
    if (nv === to || +r.value === v) delete anims[key];
  }
}
function hitAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  return [ray.intersectObject(paulo.root, true).find((h) => visibleUp(h.object)), r];
}
const place = (box, e, r) => {
  const x = Math.max(8, Math.min(e.clientX - r.left + 14, r.width - box.offsetWidth - 8));
  const y = Math.min(e.clientY - r.top + 14, r.height - box.offsetHeight - 8);
  box.style.transform = `translate(${x}px, ${y}px)`;
};
function pick(e) {
  const [hit, r] = hitAt(e);
  renderer.domElement.style.cursor = hit && actionOf(hit.object) ? 'pointer' : '';
  if (!hit) { tip.style.opacity = 0; return; }
  tip.textContent = t(hit.object.name.split(':')[0]);
  place(tip, e, r);
  tip.style.opacity = 1;
}
const closePop = () => { pop.hidden = true; };
function openPop(e, r, title, build) {
  const body = el('div', { class: 'row' });
  const draw = () => { body.replaceChildren(...build(draw)); };
  draw();
  pop.replaceChildren(el('b', {}, title), body);
  pop.hidden = false;
  place(pop, e, r);
}
const btn = (label, name, off, fn) => { const b = el('button', { 'aria-label': name, title: name, onclick: fn }, label); b.disabled = off; return b; };
function click(e) {
  const [hit, r] = hitAt(e);
  closePop();
  const act = hit && actionOf(hit.object);
  if (!act) { if (e.pointerType !== 'mouse') pick(e); return; }
  tip.style.opacity = 0;
  if (act.toggle) {
    const sl = sliders[act.toggle], mid = (+sl.min + +sl.max) / 2;
    const now = anims[act.toggle] ?? +sl.value;
    glide(act.toggle, act.toggle === 'boom' ? (Math.abs(now) > 90 ? 0 : 180) : now > mid ? +sl.min : +sl.max);
  } else if (act.surface) {
    const side = selects.L.type.value === act.surface ? 'L' : 'R', lv = selects[side].level;
    const move = (d, redraw) => { lv.value = +lv.value + d; lv.dispatchEvent(new Event('change')); redraw(); };
    openPop(e, r, t(SURFACES.find((s) => s.key === act.surface).label), (redraw) => [
      btn('▼', t('Lower'), +lv.value === 0, () => move(-1, redraw)),
      el('span', {}, `${parseInt(LEVELS[+lv.value], 10)} mm`),
      btn('▲', t('Raise'), +lv.value === LEVELS.length - 1, () => move(1, redraw)),
    ]);
  } else {
    const sl = sliders.firebox, at = () => anims.firebox ?? +sl.value;
    openPop(e, r, t('Mobile firebox (sled)'), () => [
      btn('◀', t('Slide left'), false, () => glide('firebox', at() - 160)),
      btn('▶', t('Slide right'), false, () => glide('firebox', at() + 160)),
    ]);
  }
}
renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pick(e); });
renderer.domElement.addEventListener('pointerleave', () => (tip.style.opacity = 0));
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {   // a click or tap, not a drag
  if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) click(e); else closePop();
});

// ------------------------------------------------------------- loop
function resize() {
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the whole braai in frame on tall phone screens
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.max(0.315, 0.44 / camera.aspect)));
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(app);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (spin) paulo.spin(dt);
  stepAnims(dt);
  if (tween) {
    tween.t = Math.min(1, tween.t + dt * 1.6);
    const k = tween.t * tween.t * (3 - 2 * tween.t);
    camera.position.lerpVectors(tween.from, tween.to, k);
    controls.target.lerpVectors(tween.tFrom, tween.tTo, k);
    if (tween.t >= 1) tween = null;
  }
  if (autoRotate) {
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.35);
    camera.position.copy(controls.target).add(off);
  }
  controls.update();
  renderer.render(scene, camera);
  placeDims();
});
window.__paulo = paulo; window.__cam = camera; window.__T = THREE;
