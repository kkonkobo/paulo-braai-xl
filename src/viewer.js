import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildPaulo, ACCESSORIES, PRESETS, FINISHES, SURFACES, LEVELS, SPIT_MODES } from './model.js';

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
controls.minDistance = 0.6;
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

// ------------------------------------------------------------- views
const VIEWS = {
  'Front ¾': [2.2, 1.8, 3.4],
  Front: [0, 1.15, 4.1],
  Inside: [0.5, 2.6, 1.7],
  Back: [-0.9, 1.6, -3.4],
  Top: [0, 4.4, 0.5],
  'Motor mount': [2.3, 1.5, 0.5],
  'Spit bridge': [-0.25, 1.75, 1.05],
};
let tween = null;
const goView = (name) => { tween = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[name]), t: 0 }; };
camera.position.set(...(VIEWS[params.get('view')] || VIEWS['Front ¾']));

// ------------------------------------------------------------- UI
const ui = document.getElementById('ui');
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : e.setAttribute(k, v);
  e.append(...kids);
  return e;
};
const section = (title) => { const s = el('section', {}, el('h3', {}, title)); ui.append(s); return s; };
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

const finish0 = params.get('finish') || 'black';
const finishRow = seg('seg');
for (const [k, f] of Object.entries(FINISHES)) {
  const b = el('button', { onclick: () => { paulo.setFinish(k); finishRow.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); } }, f.label);
  if (k === finish0) b.classList.add('on');
  finishRow.append(b);
}
section('Finish').append(finishRow);

const presetRow = seg();
for (const [k, p] of Object.entries(PRESETS)) presetRow.append(el('button', { onclick: () => sync(paulo.applyPreset(k)) }, p.label));
section('Setup').append(presetRow);

const sSurf = section('Cooking surfaces and height above the coals');
for (const [side, name] of [['L', 'Left half'], ['R', 'Right half']]) {
  const type = el('select', { 'aria-label': `${name} surface` }, ...SURFACES.map((s) => el('option', { value: s.key }, s.label)));
  const level = el('select', { 'aria-label': `${name} height` }, ...LEVELS.map((l, i) => el('option', { value: i }, l)));
  const apply = () => {
    const slots = paulo.setSlot(side, type.value, +level.value);
    for (const s of ['L', 'R']) selects[s].type.value = slots[s][0];
  };
  type.addEventListener('change', apply); level.addEventListener('change', apply);
  selects[side] = { type, level };
  sSurf.append(el('div', { class: 'slot' }, el('span', {}, name), type, level));
}

const sSpit = section('Rotisseries (full length, or half with a grill beside)');
selects.spit = ['Back spit', 'Front spit'].map((name, i) => {
  const sel = el('select', { 'aria-label': name }, ...SPIT_MODES.map((m) => el('option', { value: m.key }, m.label)));
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
const range = (key, label, min, max, fn) => {
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
  range('table', 'Table: folded ↔ up', 0, 100, (v) => paulo.setTableOpen(v / 100)),
  range('boom', 'Swing potjie boom', -180, 180, (v) => paulo.setBoomAngle((v * Math.PI) / 180)),
  el('label', {}, el('input', { type: 'checkbox', checked: '', onchange: (e) => (spin = e.target.checked) }), 'Turn the rotisseries'),
  el('label', {}, el('input', { type: 'checkbox', onchange: (e) => paulo.setBricks(!e.target.checked) }), 'Hide the firebricks (show how things are fixed)'),
);

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
  list.append(el('label', {}, cb, label));
}
section('Accessories').append(list);

const viewRow = seg();
for (const k of Object.keys(VIEWS)) viewRow.append(el('button', { onclick: () => goView(k) }, k));
let autoRotate = false;
viewRow.append(el('button', { onclick: (e) => { autoRotate = !autoRotate; e.target.classList.toggle('on', autoRotate); } }, 'Auto-rotate'));
section('View').append(viewRow);

section('Export').append(el('button', {
  class: 'primary', onclick: async () => {
    const clone = paulo.root.clone(true);
    const hidden = []; clone.traverse((o) => { if (!o.visible) hidden.push(o); });
    hidden.forEach((o) => o.removeFromParent());
    const glb = await new GLTFExporter().parseAsync(clone, { binary: true });
    el('a', { href: URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' })), download: 'paulo-braai-xl.glb' }).click();
  },
}, 'Download current setup (.glb)'));

if (params.get('bricks') === '0') paulo.setBricks(false);
sync(paulo.applyPreset(PRESETS[params.get('preset')] ? params.get('preset') : 'showcase'));

// name the part under the cursor / finger
const tip = document.getElementById('tip');
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const visibleUp = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObject(paulo.root, true).find((h) => visibleUp(h.object));
  if (!hit) { tip.style.opacity = 0; return; }
  tip.textContent = hit.object.name.split(':')[0];
  const x = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 8);
  tip.style.transform = `translate(${x}px, ${e.clientY - r.top + 14}px)`;
  tip.style.opacity = 1;
}
renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pick(e); });
renderer.domElement.addEventListener('pointerleave', () => (tip.style.opacity = 0));
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {   // a tap, not a drag
  if (e.pointerType !== 'mouse' && down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) pick(e);
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
  if (tween) {
    tween.t = Math.min(1, tween.t + dt * 1.6);
    const k = tween.t * tween.t * (3 - 2 * tween.t);
    camera.position.lerpVectors(tween.from, tween.to, k);
    if (tween.t >= 1) tween = null;
  }
  if (autoRotate) {
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.35);
    camera.position.copy(controls.target).add(off);
  }
  controls.update();
  renderer.render(scene, camera);
});
window.__paulo = paulo;
