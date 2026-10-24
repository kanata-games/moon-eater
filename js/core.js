'use strict';
// =========================================================
// core.js — 共通の道具・描画の準備・テクスチャ・空・エフェクト
// =========================================================
const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function angDiff(a, b){ let d = b - a; while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI; return d; }
function turnTo(cur, target, step){ return cur + clamp(angDiff(cur, target), -step, step); }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color();

// ---------- 設定の保存（ブラウザ内） ----------
const store = {
  get(k, d){ try { const v = localStorage.getItem('moonEater.' + k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('moonEater.' + k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem('moonEater.' + k); } catch(e){} }
};
let pixelScale = store.get('qual', 3);
let sens = store.get('sens', 1);

// ---------- 描画 ----------
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c17);
scene.fog = new THREE.Fog(0x0b0c17, 7, 46);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
const SNAP = { value: new THREE.Vector2(160, 120) };
function resize(){
  const w = innerWidth, h = innerHeight;
  const rw = Math.max(200, Math.floor(w / pixelScale)), rh = Math.max(150, Math.floor(h / pixelScale));
  renderer.setSize(rw, rh, false);
  SNAP.value.set(rw / 2, rh / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0x6a78a8, 0x1c1612, 0.62));
const moonLight = new THREE.DirectionalLight(0xb9c4ff, 0.72); moonLight.position.set(-30, 50, 25); scene.add(moonLight);

// 初代PS風：頂点を画面のピクセルに吸着させてカクつかせる
function psx(mat){
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSnap = SNAP;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nvec4 _sp = gl_Position; _sp.xy = floor(_sp.xy / _sp.w * uSnap + 0.5) / uSnap * _sp.w; gl_Position = _sp;');
  };
  return mat;
}
const lam = (color, map) => psx(new THREE.MeshLambertMaterial({ color, map: map || null }));

// ---------- テクスチャ（画像ファイルを使わずに描く） ----------
function makeTex(draw, size){
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData = { shared: true }; return t;
}
const TEX = {};
TEX.stone = makeTex((g, s) => {
  const r = mulberry32(11); g.fillStyle = '#2f2d33'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 4; row++){
    const off = (row % 2) * 8;
    for (let col = -1; col < 3; col++){ const v = 78 + r()*34 | 0; g.fillStyle = `rgb(${v},${v-3},${v+4})`; g.fillRect(col*16 + off + 1, row*8 + 1, 14, 6); }
  }
  for (let i = 0; i < 110; i++){ g.fillStyle = r() < .55 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.08)'; g.fillRect(r()*s|0, r()*s|0, 1, 1); }
  for (let i = 0; i < 16; i++){ g.fillStyle = 'rgba(64,86,52,.55)'; g.fillRect(r()*s|0, r()*s|0, 2, 1); }
}, 32);
TEX.ground = makeTex((g, s) => {
  const r = mulberry32(5); g.fillStyle = '#1d1d23'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++){ const v = 46 + r()*16 | 0; g.fillStyle = `rgb(${v},${v},${v+7})`; g.fillRect(x*16+1, y*16+1, 14, 14); }
  for (let i = 0; i < 130; i++){ g.fillStyle = r() < .5 ? 'rgba(0,0,0,.3)' : 'rgba(180,190,215,.07)'; g.fillRect(r()*s|0, r()*s|0, 1, 1); }
  for (let i = 0; i < 12; i++){ g.fillStyle = 'rgba(64,88,50,.6)'; g.fillRect(r()*s|0, r()*s|0, 2, 2); }
}, 32);
TEX.arena = makeTex((g, s) => {
  const r = mulberry32(21); g.fillStyle = '#25232c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1400; i++){ g.fillStyle = r() < .5 ? 'rgba(0,0,0,.25)' : 'rgba(200,205,230,.05)'; g.fillRect(r()*s|0, r()*s|0, 2, 2); }
  const c = s/2; g.strokeStyle = 'rgba(190,198,235,.32)'; g.lineWidth = 2;
  [56, 44].forEach(rad => { g.beginPath(); g.arc(c, c, rad, 0, Math.PI*2); g.stroke(); });
  for (let i = 0; i < 8; i++){ // 月の満ち欠けの刻印
    const a = i/8*Math.PI*2, x = c + Math.cos(a)*50, y = c + Math.sin(a)*50;
    g.fillStyle = 'rgba(200,208,240,.45)'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI*2); g.fill();
    g.fillStyle = '#25232c'; g.beginPath(); g.arc(x + (i-4)*1.3, y, 5, 0, Math.PI*2); g.fill();
  }
  g.fillStyle = 'rgba(120,20,30,.35)'; g.beginPath(); g.arc(c, c, 14, 0, Math.PI*2); g.fill();
}, 128);
TEX.arena.wrapS = TEX.arena.wrapT = THREE.ClampToEdgeWrapping;
TEX.altar = makeTex((g, s) => {
  const r = mulberry32(31); g.fillStyle = '#22243a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1600; i++){ g.fillStyle = r() < .5 ? 'rgba(0,0,0,.25)' : 'rgba(200,210,250,.05)'; g.fillRect(r()*s|0, r()*s|0, 2, 2); }
  const c = s/2; g.strokeStyle = 'rgba(200,210,250,.35)'; g.lineWidth = 2;
  [60, 50, 20].forEach(rad => { g.beginPath(); g.arc(c, c, rad, 0, Math.PI*2); g.stroke(); });
  for (let i = 0; i < 12; i++){ const a = i/12*Math.PI*2; g.beginPath(); g.moveTo(c + Math.cos(a)*20, c + Math.sin(a)*20); g.lineTo(c + Math.cos(a)*50, c + Math.sin(a)*50); g.stroke(); }
  for (let i = 0; i < 8; i++){
    const a = i/8*Math.PI*2 + .2, x = c + Math.cos(a)*55, y = c + Math.sin(a)*55;
    g.fillStyle = 'rgba(210,218,250,.5)'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI*2); g.fill();
    g.fillStyle = '#22243a'; g.beginPath(); g.arc(x + (i-4)*1.1, y, 4, 0, Math.PI*2); g.fill();
  }
}, 128);
TEX.altar.wrapS = TEX.altar.wrapT = THREE.ClampToEdgeWrapping;
TEX.fog = makeTex((g, s) => {
  const r = mulberry32(3); g.clearRect(0, 0, s, s);
  for (let i = 0; i < 60; i++){ const x = r()*s, y = r()*s, rad = 4 + r()*12; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(225,230,255,.35)'); gr.addColorStop(1, 'rgba(225,230,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
}, 64);
TEX.fog.magFilter = THREE.LinearFilter;
function glowTex(inner, outer){ const t = makeTex((g, s) => { const gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, 32); t.magFilter = THREE.LinearFilter; return t; }
TEX.soul = glowTex('rgba(235,245,255,1)', 'rgba(120,200,190,.6)');
TEX.moonGlow = glowTex('rgba(235,240,255,1)', 'rgba(140,160,240,.5)');
TEX.star = makeTex((g, s) => { g.fillStyle = '#fff'; g.fillRect(s/2-1, 2, 2, s-4); g.fillRect(2, s/2-1, s-4, 2); g.fillRect(s/2-3, s/2-3, 6, 6); }, 32);
TEX.rune = makeTex((g, s) => {
  g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(255,160,70,.95)'; g.lineWidth = 2;
  g.beginPath(); g.arc(s/2, s/2, s/2 - 6, 0, Math.PI*2); g.stroke();
  const r = mulberry32(9); g.beginPath();
  for (let i = 0; i < 7; i++){ const x = 18 + r()*28, y = 18 + r()*28; g.moveTo(x, y); g.lineTo(x + (r()-.5)*18, y + (r()-.5)*18); }
  g.stroke();
}, 64);
TEX.sigil = makeTex((g, s) => { // 要石の紋
  g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(200,215,255,1)'; g.lineWidth = 3;
  g.beginPath(); g.arc(s/2, s/2, s/2 - 8, 0, Math.PI*2); g.stroke();
  g.fillStyle = 'rgba(200,215,255,1)'; g.beginPath(); g.arc(s/2, s/2, 14, 0, Math.PI*2); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(s/2 + 8, s/2 - 4, 13, 0, Math.PI*2); g.fill();
}, 64);
TEX.moon = (() => { const t = makeTex((g, s) => {
  const gr = g.createRadialGradient(s/2, s/2, s*.2, s/2, s/2, s/2); gr.addColorStop(0, 'rgba(230,234,255,1)'); gr.addColorStop(.36, 'rgba(210,216,245,1)'); gr.addColorStop(.42, 'rgba(160,170,230,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  const r = mulberry32(2); for (let i = 0; i < 9; i++){ g.fillStyle = 'rgba(140,145,180,.35)'; g.beginPath(); g.arc(s/2 + (r()-.5)*36, s/2 + (r()-.5)*36, 2 + r()*6, 0, Math.PI*2); g.fill(); }
  g.fillStyle = 'rgba(11,12,23,.92)'; g.beginPath(); g.arc(s/2 + 17, s/2 - 6, 23, 0, Math.PI*2); g.fill(); // 欠けた月
}, 128); t.magFilter = THREE.LinearFilter; return t; })();

// ---------- 空（どのステージでも共通） ----------
const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moon, fog: false, depthWrite: false, transparent: true }));
moonSprite.position.set(45, 85, -230); moonSprite.scale.set(64, 64, 1); scene.add(moonSprite);
{
  const pts = []; const r = mulberry32(13);
  for (let i = 0; i < 500; i++){ const a = r()*Math.PI*2, e = .15 + r()*1.2, R = 300; pts.push(Math.cos(a)*Math.cos(e)*R, Math.sin(e)*R, Math.sin(a)*Math.cos(e)*R - 50); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab4dd, size: 1.2, sizeAttenuation: false, fog: false })));
}

// ---------- エフェクト（血しぶき・火花・魂など） ----------
const parts = [], rings = [], glints = [];
const partGeo = new THREE.BoxGeometry(.09, .09, .09);
const partMats = {
  blood: new THREE.MeshBasicMaterial({ color: 0x8a1520 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false }),
  blue: new THREE.MeshBasicMaterial({ color: 0x9fd0ff, fog: false }),
  soul: new THREE.MeshBasicMaterial({ color: 0xbff0e6, fog: false }),
  dust: new THREE.MeshBasicMaterial({ color: 0x7a7468 }),
  heal: new THREE.MeshBasicMaterial({ color: 0xd8e2ff, fog: false }),
  purple: new THREE.MeshBasicMaterial({ color: 0x9a6cff, fog: false })
};
function burst(pos, kind, n, speed = 4, grav = 9, life = .6, size = 1){
  for (let i = 0; i < n; i++){
    const m = new THREE.Mesh(partGeo, partMats[kind]); m.position.copy(pos); m.scale.setScalar(size * (.6 + Math.random()*.8)); scene.add(m);
    const a = Math.random()*Math.PI*2, u = Math.random()*2 - .3;
    parts.push({ m, v: new THREE.Vector3(Math.cos(a)*speed*Math.random(), u*speed*.8 + speed*.3, Math.sin(a)*speed*Math.random()), life: life*(.6 + Math.random()*.6), max: life, grav, home: kind === 'soul' });
  }
}
function ring(x, z, r, color = 0xcfd6ff){
  const m = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI/2; m.position.set(x, .08, z); scene.add(m); rings.push({ m, t: 0, r });
}
function glint(obj){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.star, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, fog: false }));
  obj.getWorldPosition(s.position); s.scale.setScalar(.1); scene.add(s); glints.push({ s, t: 0, obj });
}
function clearFx(){
  parts.forEach(p => scene.remove(p.m)); parts.length = 0;
  rings.forEach(r => { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }); rings.length = 0;
  glints.forEach(g => { scene.remove(g.s); g.s.material.dispose(); }); glints.length = 0;
}
function updateFx(sdt){
  for (let i = parts.length - 1; i >= 0; i--){
    const p = parts[i]; p.life -= sdt;
    if (p.home && P.state !== 'dead'){ _v2.set(P.pos.x, 1.2, P.pos.z).sub(p.m.position); const d = _v2.length(); if (p.max - p.life > .35){ p.v.lerp(_v2.normalize().multiplyScalar(14), Math.min(1, sdt*5)); if (d < .5) p.life = 0; } }
    p.v.y -= p.grav*sdt; p.m.position.addScaledVector(p.v, sdt); if (p.m.position.y < .05 && p.grav > 0){ p.m.position.y = .05; p.v.multiplyScalar(.5); }
    if (p.life <= 0){ scene.remove(p.m); parts.splice(i, 1); } else p.m.scale.multiplyScalar(1 - sdt*.8);
  }
  for (let i = rings.length - 1; i >= 0; i--){ const r = rings[i]; r.t += sdt; const f = r.t/.45; r.m.scale.setScalar(lerp(.3, r.r, Math.min(1, f))); r.m.material.opacity = .85*(1 - f); if (f >= 1){ scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
  for (let i = glints.length - 1; i >= 0; i--){ const g = glints[i]; g.t += sdt; g.obj.getWorldPosition(g.s.position); const f = g.t/.28; g.s.scale.setScalar(Math.sin(Math.min(1, f)*Math.PI)*.9); g.s.material.rotation = f*2; if (f >= 1){ scene.remove(g.s); g.s.material.dispose(); glints.splice(i, 1); } }
}
