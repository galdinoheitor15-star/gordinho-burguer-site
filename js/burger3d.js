/* =========================================================
   Hambúrguer 3D — Three.js
   Montado com geometria procedural; desmonta camada por camada no scroll.
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('burger-canvas');
const stage = document.querySelector('.stage');
const heroEl = document.querySelector('.hero');
const chapterEl = document.querySelector('.stage__chapter');
const outroEl = document.querySelector('.stage__outro');
const progressEl = document.querySelector('.stage__progress span');
const wordEl = document.querySelector('.stage__word');
const labelsEl = document.getElementById('labels');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

/* ---------- Luzes ---------- */
scene.add(new THREE.HemisphereLight(0xffe6c7, 0x2a120a, 0.7));
const key = new THREE.DirectionalLight(0xffd6a8, 2.6);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 1;
key.shadow.camera.far = 25;
key.shadow.camera.left = key.shadow.camera.bottom = -4;
key.shadow.camera.right = key.shadow.camera.top = 4;
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xff6a1a, 4);
rim.position.set(-5, 3, -4);
scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffb070, 1.6);
rim2.position.set(5, 1, -3);
scene.add(rim2);

/* ---------- Utilidades ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rand = (a, b) => a + Math.random() * (b - a);

// value noise 3D simples
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
}
const fbm = (x, y, z) => noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.1;

/* ---------- Texturas ---------- */
const speckle = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${120 + Math.random() * 60},${60 + Math.random() * 30},20,${Math.random() * 0.12})`;
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 6, 0, 7); g.fill();
  }
});

const pattyTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#4a2614'; g.fillRect(0, 0, w, h);
  const cols = ['#2a1309', '#1a0b05', '#6b3a1f', '#7d4626', '#3a1b0e', '#8a5230'];
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.globalAlpha = Math.random() * 0.8;
    g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rand(1, 5), rand(1, 3.5), Math.random() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
});

const tomatoTex = canvasTex(256, 256, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#c4200f'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#e5331b'; g.beginPath(); g.arc(c, c, c * 0.96, 0, 7); g.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    g.save(); g.translate(c + Math.cos(a) * c * 0.48, c + Math.sin(a) * c * 0.48); g.rotate(a);
    g.fillStyle = '#ff6a4a'; g.beginPath(); g.ellipse(0, 0, c * 0.3, c * 0.2, 0, 0, 7); g.fill();
    g.fillStyle = '#f7d36b';
    for (let s = 0; s < 6; s++) { g.beginPath(); g.ellipse(rand(-c * 0.18, c * 0.18), rand(-c * 0.1, c * 0.1), 4, 2.4, Math.random() * 3, 0, 7); g.fill(); }
    g.restore();
  }
  g.fillStyle = '#d42a14'; g.beginPath(); g.arc(c, c, c * 0.16, 0, 7); g.fill();
});

const baconTex = canvasTex(1024, 128, (g, w, h) => {
  g.fillStyle = '#8e1f12'; g.fillRect(0, 0, w, h);
  const stripe = (y, th, col) => {
    g.strokeStyle = col; g.lineWidth = th; g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 6 + Math.sin(x * 0.07) * 2);
    g.stroke();
  };
  stripe(20, 14, '#f0cfae'); stripe(52, 22, '#b8382a'); stripe(80, 10, '#f3d8bd'); stripe(104, 18, '#7a170d');
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(40,10,4,${Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * h, rand(2, 10), rand(1, 3)); }
});

const shadowTex = canvasTex(256, 256, (g, w) => {
  const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
});

/* ---------- Camadas ---------- */
const wrapper = new THREE.Group(); // posição / inclinação (não gira)
const spinner = new THREE.Group(); // gira
wrapper.add(spinner);
scene.add(wrapper);

const layers = [];
function addLayer(obj, base, label) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const holder = new THREE.Group();
  holder.add(obj);
  spinner.add(holder);
  layers.push({ holder, base, label, drop: reduced ? 1 : 0 });
}

// cores de pão via vertex colors
const golden = new THREE.Color('#e08e32');
const toast = new THREE.Color('#7a3008');
const crumb = new THREE.Color('#f3c27c');

const bunMat = new THREE.MeshPhysicalMaterial({
  vertexColors: true, map: speckle, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.4, sheen: 0.15, sheenColor: new THREE.Color('#ffb060')
});

// Pão de baixo (lathe)
{
  const pts = [[0, 0], [0.98, 0], [1.1, 0.03], [1.17, 0.12], [1.19, 0.24], [1.15, 0.34], [1.07, 0.4], [0.9, 0.41], [0, 0.41]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 96);
  const col = [];
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), r = Math.hypot(p.getX(i), p.getZ(i));
    const c = y > 0.39 && r < 1.05 ? crumb.clone().lerp(toast, 0.25) : golden.clone().lerp(toast, Math.max(0, 0.35 - y) * 1.2);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  addLayer(new THREE.Mesh(geo, bunMat), 0, { k: 'Base', t: 'Brioche tostado' });
}

// Alface
{
  const geo = new THREE.RingGeometry(0.05, 1.38, 220, 10);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z), a = Math.atan2(z, x), k = r / 1.38;
    const rf = 1 + (0.07 * Math.sin(a * 11) + 0.035 * Math.sin(a * 23 + 1.3)) * k;
    const y = k * k * (0.09 * Math.sin(a * 13) + 0.045 * Math.sin(a * 31 + 0.7)) - Math.max(0, r - 1.1) * 0.35;
    p.setXYZ(i, x * rf, y, z * rf);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#73c94f', roughness: 0.5, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color('#d8ff9e'), transmission: 0.08, thickness: 0.2 });
  addLayer(new THREE.Mesh(geo, mat), 0.43, { k: 'Fresquinha', t: 'Alface crocante' });
}

// Tomate
{
  const g = new THREE.Group();
  const side = new THREE.MeshPhysicalMaterial({ color: '#d42a14', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const top = new THREE.MeshPhysicalMaterial({ map: tomatoTex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const geo = new THREE.CylinderGeometry(0.56, 0.56, 0.1, 48);
  [[-0.52, 0.18, 0.2], [0.5, -0.25, -0.6], [0.15, 0.62, 1.4]].forEach(([x, z, r]) => {
    const m = new THREE.Mesh(geo, [side, top, top]);
    m.position.set(x, 0.05, z);
    m.rotation.set(rand(-0.06, 0.06), r, rand(-0.06, 0.06));
    g.add(m);
  });
  addLayer(g, 0.48, { k: 'Suculento', t: 'Tomate fresco' });
}

// Carne
{
  const geo = new THREE.CylinderGeometry(1.14, 1.12, 0.36, 128, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 3.2 + 10, y * 3.2, z * 3.2) - 0.5;
    const r = Math.hypot(x, z);
    let nx = x, nz = z, ny = y;
    if (r > 0.9) { const s = 1 + n * 0.07; nx *= s; nz *= s; }
    if (Math.abs(y) > 0.17) ny += n * 0.06 * Math.sign(y);
    // borda arredondada
    if (r > 1.0 && Math.abs(y) > 0.12) { const s = 1 - (Math.abs(y) - 0.12) * 0.35; nx *= s; nz *= s; }
    p.setXYZ(i, nx, ny, nz);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: pattyTex, bumpMap: pattyTex, bumpScale: 3, roughness: 0.82, color: '#ffffff' });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0.18;
  addLayer(m, 0.58, { k: '150g', t: 'Blend de fraldinha' });
}

// Cheddar derretido
{
  const geo = new THREE.PlaneGeometry(1.95, 1.95, 80, 80);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI / 4 + 0.15);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    let y = Math.sin(x * 4) * Math.cos(z * 3.5) * 0.008;
    if (r > 1.1) {
      const d = r - 1.1;
      y -= d * 0.75 + d * d * 1.6;
      const s = 1 - d * 0.35;
      x *= s; z *= s;
    }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffa41c', roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.2, side: THREE.DoubleSide, sheen: 0.5, sheenColor: new THREE.Color('#ffd27a') });
  addLayer(new THREE.Mesh(geo, mat), 0.955, { k: 'Derretendo', t: 'Cheddar cremoso' });
}

// Bacon
{
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: baconTex, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide });
  [[0.35, 0.02, -0.25], [-0.55, 0.05, 0.25]].forEach(([ry, y, z], idx) => {
    const geo = new THREE.PlaneGeometry(2.25, 0.34, 90, 4);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, Math.sin(x * 5.5 + idx) * 0.055 + Math.sin(x * 13) * 0.01 - Math.max(0, Math.abs(x) - 0.95) * 0.25);
      p.setZ(i, p.getZ(i) + Math.sin(x * 3 + idx) * 0.05);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = ry; m.position.set(0, 0.06 + y, z);
    g.add(m);
  });
  addLayer(g, 1.0, { k: 'Crocante', t: 'Bacon na chapa' });
}

// Cebola caramelizada
{
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#a8521a', roughness: 0.25, clearcoat: 1, transmission: 0.25, thickness: 0.1 });
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.TorusGeometry(rand(0.16, 0.3), rand(0.025, 0.038), 10, 48);
    const m = new THREE.Mesh(geo, mat);
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.75;
    m.position.set(Math.cos(a) * r, 0.04 + Math.random() * 0.03, Math.sin(a) * r);
    m.rotation.set(Math.PI / 2 + rand(-0.2, 0.2), rand(-0.2, 0.2), 0);
    m.scale.set(1, rand(0.7, 1), 1);
    g.add(m);
  }
  addLayer(g, 1.06, { k: 'Adocicada', t: 'Cebola caramelizada' });
}

// Pão de cima + gergelim
{
  const g = new THREE.Group();
  const a = 1.22, b = 0.95;
  const geo = new THREE.SphereGeometry(1, 128, 64, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = geo.attributes.position;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 2 + 3, y * 2, z * 2) - 0.5;
    const flare = y < 0.2 ? 1 + (0.2 - y) * 0.12 : 1;
    x *= a * flare * (1 + n * 0.025); z *= a * flare * (1 + n * 0.025); y = y * b * (1 + n * 0.03);
    p.setXYZ(i, x, y, z);
    const c = golden.clone().lerp(toast, THREE.MathUtils.smoothstep(y / b, 0.05, 0.75) * 0.95);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, bunMat));

  const capGeo = new THREE.CircleGeometry(a * 1.02, 96);
  capGeo.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: '#efb56c', map: speckle, roughness: 0.9 })));

  const seedGeo = new THREE.SphereGeometry(1, 10, 6);
  seedGeo.scale(0.052, 0.018, 0.03);
  const seeds = new THREE.InstancedMesh(seedGeo, new THREE.MeshStandardMaterial({ color: '#fff0d2', roughness: 0.55 }), 230);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < seeds.count; i++) {
    const phi = Math.acos(1 - Math.random() * (1 - Math.cos(1.15)));
    const th = Math.random() * Math.PI * 2;
    const pos = new THREE.Vector3(a * Math.sin(phi) * Math.cos(th), b * Math.cos(phi), a * Math.sin(phi) * Math.sin(th));
    const nrm = new THREE.Vector3(pos.x / (a * a), pos.y / (b * b), pos.z / (a * a)).normalize();
    dummy.position.copy(pos).addScaledVector(nrm, 0.006);
    dummy.quaternion.setFromUnitVectors(up, nrm);
    dummy.rotateY(Math.random() * Math.PI);
    dummy.updateMatrix();
    seeds.setMatrixAt(i, dummy.matrix);
  }
  g.add(seeds);
  addLayer(g, 1.1, { k: 'Selado na hora', t: 'Pão brioche c/ gergelim' });
}

const STACK_H = 2.05;
const SPREAD = 0.46;

// sombra de contato
const contact = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
contact.rotation.x = -Math.PI / 2;
contact.position.y = -0.01;
wrapper.add(contact);

/* ---------- Brasas / partículas ---------- */
const EMBERS = 260;
const eGeo = new THREE.BufferGeometry();
const ePos = new Float32Array(EMBERS * 3);
const eSeed = new Float32Array(EMBERS);
for (let i = 0; i < EMBERS; i++) {
  ePos[i * 3] = rand(-7, 7); ePos[i * 3 + 1] = rand(-4, 5); ePos[i * 3 + 2] = rand(-5, 2);
  eSeed[i] = Math.random();
}
eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
eGeo.setAttribute('seed', new THREE.BufferAttribute(eSeed, 1));
const eMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
  vertexShader: `
    attribute float seed; uniform float uTime; uniform float uPR; varying float vA;
    void main(){
      vec3 p = position;
      float t = uTime * (0.25 + seed * 0.45);
      p.y = mod(p.y + 4.0 + t, 9.0) - 4.0;
      p.x += sin(uTime * 0.6 + seed * 20.0) * 0.35;
      vA = smoothstep(-4.0, -2.5, p.y) * (1.0 - smoothstep(2.5, 5.0, p.y)) * (0.4 + seed * 0.6);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (6.0 + seed * 16.0) * uPR * (1.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vA;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(mix(vec3(1.0,0.35,0.08), vec3(1.0,0.75,0.35), a), a * vA);
    }`
});
const embers = new THREE.Points(eGeo, eMat);
scene.add(embers);

/* ---------- Labels HTML ---------- */
const labelEls = layers.map((L, i) => {
  const el = document.createElement('div');
  const left = false;
  el.className = 'label';
  el.style.flexDirection = left ? 'row-reverse' : 'row';
  el.style.textAlign = left ? 'right' : 'left';
  el.innerHTML = `<span class="label__dot"></span><span class="label__line" style="transform-origin:${left ? 'right' : 'left'};background:linear-gradient(${left ? 270 : 90}deg,var(--orange),rgba(255,140,26,.15))"></span><span class="label__txt"><small>${L.label.k}</small><b>${L.label.t}</b></span>`;
  labelsEl.appendChild(el);
  return { el, left, line: el.querySelector('.label__line') };
});

/* ---------- Layout / resize ---------- */
let W = 1, H = 1, mobile = false;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  mobile = W / H < 0.85;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Input ---------- */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

let started = reduced || !!window.__siteReady;
let startTime = 0;
window.addEventListener('site:ready', () => { started = true; startTime = clock.getElapsedTime(); });

/* ---------- Loop ---------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ss = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

const clock = new THREE.Clock();
let pSmooth = 0;
const v3 = new THREE.Vector3();

function stageProgress() {
  const r = stage.getBoundingClientRect();
  return clamp01(-r.top / (r.height - window.innerHeight));
}

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = clock.getElapsedTime();
  const p = stageProgress();
  pSmooth += (p - pSmooth) * (reduced ? 1 : 0.09);
  const q = pSmooth;

  // fases
  const heroOut = ss(0.01, 0.12, q);
  const center = ss(0.04, 0.2, q);
  const explode = ss(0.2, 0.48, q) * (1 - ss(0.74, 0.88, q));
  const chapter = ss(0.22, 0.3, q) * (1 - ss(0.66, 0.74, q));
  const outro = ss(0.86, 0.95, q);

  // DOM
  heroEl.style.opacity = 1 - heroOut;
  heroEl.style.transform = `translateY(${-heroOut * 80}px)`;
  heroEl.style.visibility = heroOut > 0.99 ? 'hidden' : 'visible';
  chapterEl.style.opacity = chapter;
  chapterEl.style.transform = mobile ? `translateY(${(1 - chapter) * 30}px)` : `translateY(calc(-50% + ${(1 - chapter) * 30}px))`;
  outroEl.style.opacity = outro;
  outroEl.style.transform = `translateY(${(1 - outro) * 40}px)`;
  progressEl.style.transform = `scaleY(${q})`;
  wordEl.style.transform = `translate(calc(-50% + ${(0.5 - q) * 30}vw), -50%)`;

  // posição do hambúrguer
  const camDist = 10.5 + (mobile ? 3 : 0);
  const visW = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camDist * camera.aspect;
  const lerp = THREE.MathUtils.lerp;
  const bob = reduced ? 0 : Math.sin(t * 1.3) * 0.04;
  let x, y0, s, spread;
  if (mobile) {
    s = lerp(0.62, 0.55, center);
    x = -visW * 0.2 * center * (1 - outro);
    y0 = lerp(-2.7, -1.2, center) + outro * 0.9;
    spread = 1.0;
  } else {
    s = THREE.MathUtils.clamp(visW / 8.5, 0.75, 1.1);
    x = visW * 0.24 * (1 - center);
    y0 = lerp(-0.1, 0, center) + outro * 0.95;
    spread = SPREAD;
  }
  wrapper.scale.setScalar(s);
  wrapper.position.set(x, y0 - STACK_H * 0.5 * s - explode * spread * 3.5 * s + bob, 0);
  wrapper.rotation.x += ((0.18 + mouse.y * 0.12 - explode * 0.1) - wrapper.rotation.x) * 0.06;
  wrapper.rotation.z += ((-mouse.x * 0.08) - wrapper.rotation.z) * 0.06;
  spinner.rotation.y = (reduced ? 0 : t * 0.28) + q * Math.PI * 2.4 + mouse.x * 0.3;

  camera.position.set(0, 1.4 - explode * 0.3, 10.5 + explode * 2.6 + (mobile ? 3 : 0));
  camera.lookAt(0, 0.1 - explode * 0.15, 0);

  // camadas
  const since = t - startTime;
  layers.forEach((L, i) => {
    if (started && L.drop < 1) L.drop = clamp01((since - 0.15 - i * 0.11) / 0.75);
    const dropOff = (1 - easeOutBack(L.drop)) * 6;
    L.holder.position.y = L.base + i * spread * explode + (started ? dropOff : 30);
    L.holder.rotation.y = explode * (i % 2 ? 0.5 : -0.5);
    L.holder.rotation.x = explode * Math.sin(i * 1.7) * 0.12;
  });
  contact.material.opacity = 0.8 * (1 - explode * 0.7);

  // labels
  const hw = W / 2, hh = H / 2;
  layers.forEach((L, i) => {
    const lab = labelEls[i];
    const th = 0.12 + i * 0.07;
    const a = clamp01((explode - th) / 0.18) * chapterGate(q);
    if (a <= 0.001) { lab.el.style.opacity = 0; return; }
    const offX = (lab.left ? -1 : 1) * 1.45;
    v3.set(offX, L.base + i * spread * explode + 0.18, 0);
    wrapper.localToWorld(v3);
    v3.project(camera);
    const x = v3.x * hw + hw, y = -v3.y * hh + hh;
    lab.el.style.opacity = a;
    lab.el.style.transform = `translate(${lab.left ? `calc(${x}px - 100%)` : `${x}px`}, calc(${y}px - 50%))`;
    lab.line.style.transform = `scaleX(${a})`;
  });

  eMat.uniforms.uTime.value = t;
  renderer.render(scene, camera);
}
function chapterGate(q) { return 1 - ss(0.7, 0.78, q); }

frame();
