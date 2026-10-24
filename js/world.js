'use strict';
// =========================================================
// world.js — ステージの登録・読み込み・片付けと、地形を組む道具
//   ステージ側（stages/*.js）は defineStage({...}) で登録し、
//   build() の中で block / wall / pillar などを呼んで地形を作る。
// =========================================================
const STAGES = {};
const STAGE_ORDER = [];
function defineStage(def){ STAGES[def.id] = def; STAGE_ORDER.push(def.id); }

let stage = null;          // いま読み込んでいるステージの定義
let stageGroup = null;     // ステージの3Dオブジェクトをまとめる入れ物
let boss = null, gate = null, stainSprite = null;
let wr = mulberry32(1);    // ステージごとの乱数（壁の高さのばらつきなど）
const colliders = [], flames = [], bonfires = [], runes = [], interactables = [], enemies = [], spinners = [];

function add(obj){ stageGroup.add(obj); return obj; }
function ownTex(base, rx, ry){ const t = base.clone(); t.needsUpdate = true; t.userData = { own: true }; t.repeat.set(rx, ry); return t; }
function boxMesh(w, h, d, mat){ return new THREE.Mesh(new THREE.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w/2)), Math.max(1, Math.ceil(h/2)), Math.max(1, Math.ceil(d/2))), mat); }

// ---------- 地形パーツ ----------
// 箱（x1,z1〜x2,z2 の範囲、高さh）。当たり判定つき。
function block(x1, z1, x2, z2, h, opts = {}){
  const w = x2 - x1, d = z2 - z1;
  const m = boxMesh(w, h, d, lam(opts.color || 0xffffff, ownTex(opts.tex || TEX.stone, Math.max(w, d) / 2, h / 2)));
  m.position.set((x1+x2)/2, (opts.y0 || 0) + h/2, (z1+z2)/2); add(m);
  if (opts.collide !== false) colliders.push({ x1, z1, x2, z2, h: (opts.y0 || 0) + h });
  return m;
}
// 崩れた城壁（高さがばらつく）
function wall(x1, z1, x2, z2, base = 4.4){
  const alongX = (x2 - x1) > (z2 - z1), L = Math.max(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / 3));
  for (let i = 0; i < n; i++){
    const a = i/n, b = (i+1)/n, h = base + (wr()*2.2 - 0.6);
    if (alongX) block(lerp(x1, x2, a), z1, lerp(x1, x2, b), z2, h, { color: 0xc8c6d0 });
    else block(x1, lerp(z1, z2, a), x2, lerp(z1, z2, b), h, { color: 0xc8c6d0 });
  }
}
function pillar(x, z, s, h){ block(x - s/2, z - s/2, x + s/2, z + s/2, h, { color: 0xb8b6c4 }); block(x - s/2 - .15, z - s/2 - .15, x + s/2 + .15, z + s/2 + .15, .5, { color: 0x9a98a6, collide: false }); }
// 床
function ground(x, z, size, tex = TEX.ground, color = 0xffffff){
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 64, 64), lam(color, ownTex(tex, size/4, size/4)));
  g.rotation.x = -Math.PI/2; g.position.set(x, 0, z); add(g);
}
// 円形の床の模様（ボス部屋など）
function floorDisc(x, z, r, tex = TEX.arena){
  const a = new THREE.Mesh(new THREE.CircleGeometry(r, 40, 0), lam(0xffffff, tex));
  a.rotation.x = -Math.PI/2; a.position.set(x, 0.02, z); add(a);
}
// 見えない壁（カメラはすり抜ける）
function invisibleWall(x1, z1, x2, z2){ colliders.push({ x1, z1, x2, z2, h: 6, cam: false }); }
function rubble(spots, seed = 77){
  const rr = mulberry32(seed), mat = lam(0x86848f, TEX.stone);
  spots.forEach(([x, z]) => { for (let i = 0; i < 4; i++){ const s = .25 + rr()*.5; const m = boxMesh(s, s*.7, s, mat); m.position.set(x + (rr()-.5)*2, s*.35, z + (rr()-.5)*2); m.rotation.y = rr()*3; add(m); } });
}
function deadTree(x, z){
  const m = lam(0x2b231e), g = new THREE.Group(); g.position.set(x, 0, z); add(g);
  const trunk = boxMesh(.45, 4.2, .45, m); trunk.position.y = 2.1; trunk.rotation.z = .08; g.add(trunk);
  [[1.2, 3.2, .7], [-1.0, 3.6, -.6], [.6, 4.1, 1.0], [-.5, 2.6, -1.1]].forEach(([dx, y, rz]) => { const b = boxMesh(.18, 1.8, .18, m); b.position.set(dx*.5, y, 0); b.rotation.z = rz; g.add(b); });
  colliders.push({ x1: x - .3, z1: z - .3, x2: x + .3, z2: z + .3, h: 4 });
}
// 壁に掛かった旗。side: 'L'=西の壁(東向き) / 'R'=東の壁(西向き)
function banners(list, color = 0x4a1418){
  const bm = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  list.forEach(([x, z, y = 3.4]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), bm); p.position.set(x, y, z); p.rotation.y = x < 0 ? Math.PI/2 : -Math.PI/2; add(p); });
}
// 炎
function makeFlame(x, y, z, s, withLight){
  const g = new THREE.Group(); g.position.set(x, y, z); add(g);
  const cols = [0xff6a1a, 0xffa040, 0xffe08a]; const cones = [];
  cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(.28*s*(1 - i*.25), (.9 - i*.18)*s, 5), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.position.y = (.45 - i*.08)*s; g.add(m); cones.push(m); });
  let light = null; if (withLight){ light = new THREE.PointLight(0xff8a3a, 2.2, 15, 1.4); light.position.set(x, y + 1, z); add(light); }
  const f = { g, cones, light, s, on: true, seed: Math.random()*10 }; flames.push(f); return f;
}
function setFlame(f, on){ f.on = on; f.g.visible = on; if (f.light) f.light.intensity = on ? 2.2 : 0; }
// 壁掛けの松明
function torch(x, z, y = 2.6){ const b = boxMesh(.3, .25, .3, lam(0x3a3430)); b.position.set(x, y, z); add(b); makeFlame(x, y + .12, z, .55, false); }
// 書き置き（床の紋様。Eで読める）
function rune(x, z, text){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: TEX.rune, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI/2; m.position.set(x, .04, z); add(m); runes.push({ x, z, text, m });
}

// 天井（地下ステージ用）。カメラはこの高さより上に行かない
function ceiling(x, z, w, d, y, color = 0x6a6e78){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 16, 32), lam(color, ownTex(TEX.stone, w/3, d/3)));
  m.rotation.x = Math.PI/2; m.position.set(x, y, z); add(m);
}
// 火の灯った台（周りを照らす）
function brazier(x, z){
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.35, .25, .9, 6), lam(0x3a3430)); st.position.set(x, .45, z); add(st);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.5, .32, .25, 7), lam(0x4a4038)); bowl.position.set(x, 1.0, z); add(bowl);
  makeFlame(x, 1.05, z, .9, true);
  colliders.push({ x1: x - .45, z1: z - .45, x2: x + .45, z2: z + .45, h: 1.2 });
}
// 棺（当たり判定つき）
function coffin(x, z, alongX){
  const w = alongX ? 2 : .9, d = alongX ? .9 : 2;
  block(x - w/2, z - d/2, x + w/2, z + d/2, .6, { color: 0x6a5a4c });
  block(x - w/2 + .05, z - d/2 + .05, x + w/2 - .05, z + d/2 - .05, .12, { color: 0x50443a, y0: .6, collide: false });
}
// 骨の山（飾り）
function bones(x, z, n = 8, seed = 1){
  const r = mulberry32(seed), mat = lam(0xd8d0bc);
  for (let i = 0; i < n; i++){
    const m = boxMesh(.08 + r()*.1, .08, .35 + r()*.3, mat); m.position.set(x + (r() - .5)*1.6, .05 + r()*.25, z + (r() - .5)*1.6); m.rotation.set(r(), r()*3, r()); add(m);
  }
  const skull = boxMesh(.22, .2, .24, mat); skull.position.set(x, .12, z); skull.rotation.y = r()*3; add(skull);
}
// 床の水たまり（飾り）
function pool(x1, z1, x2, z2){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), new THREE.MeshLambertMaterial({ color: 0x1c3a3a, emissive: 0x0a1c20, transparent: true, opacity: .8 }));
  m.rotation.x = -Math.PI/2; m.position.set((x1 + x2)/2, .03, (z1 + z2)/2); add(m);
  spinners.push({ obj: m, water: true, seed: Math.random()*6 });
}

// ---------- 拾える魂（一度取ったら消える） ----------
function soulPickup(id, x, z, souls){
  const taken = (G.taken[stage.id] || []).includes(id); if (taken) return;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soul, color: 0xfff2c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.position.set(x, .5, z); s.scale.setScalar(.8); add(s); spinners.push({ obj: s, glow: true, seed: Math.random()*6 });
  const it = {
    near: p => Math.hypot(p.x - x, p.z - z) < 1.4,
    prompt: () => ({ text: '拾う' }),
    use: () => {
      addSouls(souls); sfx.soul(); s.visible = false;
      if (!G.taken[stage.id]) G.taken[stage.id] = []; G.taken[stage.id].push(id);
      interactables.splice(interactables.indexOf(it), 1);
      banner(`魂の残滓を手に入れた`, 'soft', 1.8, `魂 +${souls}`); save();
    }
  };
  interactables.push(it);
}

// ---------- 拾える装備 ----------
function itemPickup(id, x, z, itemId){
  if ((G.taken[stage.id] || []).includes(id) || G.inv.includes(itemId)) return;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soul, color: 0xffd890, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.position.set(x, .5, z); s.scale.setScalar(.9); add(s); spinners.push({ obj: s, glow: true, seed: Math.random()*6 });
  const it = {
    near: p => Math.hypot(p.x - x, p.z - z) < 1.4,
    prompt: () => ({ text: '拾う' }),
    use: () => {
      s.visible = false; sfx.levelUp();
      if (!G.taken[stage.id]) G.taken[stage.id] = []; G.taken[stage.id].push(id);
      if (!G.inv.includes(itemId)) G.inv.push(itemId);
      interactables.splice(interactables.indexOf(it), 1);
      banner(`${ITEMS[itemId].name}を手に入れた`, 'soft', 2.4, `${ITEMS[itemId].kind}　装備は一時停止（Esc）か篝火から`); save();
    }
  };
  interactables.push(it);
}

// ---------- 近道の格子扉（裏側のレバーで開く。開けたら保存される） ----------
// def: { id, x1, z1, x2, z2, lever:{x,z}, back:(p)=>レバー側にいるか }
function shortcutGate(def){
  const opened = (G.opened[stage.id] || []).includes(def.id);
  const g = new THREE.Group(); add(g);
  const w = def.x2 - def.x1, d = def.z2 - def.z1, alongZ = d > w, len = Math.max(w, d), mBar = lam(0x4a4a52);
  for (let i = 0; i <= Math.floor(len/.35); i++){
    const t = -len/2 + i*.35, bar = boxMesh(.07, 4.2, .07, mBar);
    bar.position.set((def.x1 + def.x2)/2 + (alongZ ? 0 : t), 2.1, (def.z1 + def.z2)/2 + (alongZ ? t : 0)); g.add(bar);
  }
  [1, 2.3, 3.6].forEach(y => { const b = boxMesh(alongZ ? .08 : len, .08, alongZ ? len : .08, mBar); b.position.set((def.x1 + def.x2)/2, y, (def.z1 + def.z2)/2); g.add(b); });
  const col = { x1: def.x1, z1: def.z1, x2: def.x2, z2: def.z2, h: 5, off: opened };
  colliders.push(col);
  if (opened){ g.position.y = 3.9; }
  // レバー
  const lv = new THREE.Group(); lv.position.set(def.lever.x, 1.1, def.lever.z); add(lv);
  const base = boxMesh(.3, .4, .15, lam(0x3a3a40)); lv.add(base);
  const arm = new THREE.Group(); lv.add(arm); const stick = boxMesh(.06, .5, .06, lam(0x6a5a40)); stick.position.y = .25; arm.add(stick);
  arm.rotation.x = opened ? -1.0 : .9;
  const gateObj = { g, col, opening: false, t: 0 };
  interactables.push({
    near: p => !col.off && def.back(p) && Math.hypot(p.x - def.lever.x, p.z - def.lever.z) < 1.6,
    prompt: () => ({ text: 'レバーを引く' }),
    use: () => {
      if (col.off) return;
      col.off = true; arm.rotation.x = -1.0; sfx.gate(); sfx.slam(); shake = Math.max(shake, .15);
      if (!G.opened[stage.id]) G.opened[stage.id] = []; G.opened[stage.id].push(def.id);
      spinners.push({ obj: g, lift: true, t: 0 });
      banner('近道が開いた', 'soft', 2.0, ''); save();
    }
  });
  interactables.push({
    near: p => !col.off && !def.back(p) && p.x > def.x1 - 1.6 && p.x < def.x2 + 1.6 && p.z > def.z1 - 1.6 && p.z < def.z2 + 1.6,
    prompt: () => ({ text: '格子は固く閉ざされている。向こう側から開くようだ', dim: true }),
    use: () => {}
  });
  return gateObj;
}

// ---------- 篝火 ----------
function makeBonfire(def, lit){
  const { x, z } = def;
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, .3, 7), lam(0x3b3632)); ash.position.set(x, .15, z); add(ash);
  for (let i = 0; i < 5; i++){ const b = boxMesh(.12, .12, .9, lam(0x2a221c)); const a = i/5*Math.PI*2; b.position.set(x + Math.cos(a)*.35, .35, z + Math.sin(a)*.35); b.rotation.set(.5, -a, 0); add(b); }
  const sw = new THREE.Group(); sw.position.set(x, .3, z); sw.rotation.set(.18, .5, .12); add(sw);
  const bl = boxMesh(.06, 1.3, .14, lam(0x6d6a72)); bl.position.y = .55; sw.add(bl);
  const gd = boxMesh(.07, .06, .4, lam(0x5a4a2a)); gd.position.y = 1.2; sw.add(gd);
  const fl = makeFlame(x, .25, z, 1.15, true);
  const bf = { id: def.id, x, z, name: def.name, def, lit, flame: fl }; setFlame(fl, lit); bonfires.push(bf);
  colliders.push({ x1: x - .5, z1: z - .5, x2: x + .5, z2: z + .5, h: 1 });
  return bf;
}

// ---------- 霧の扉（ボス部屋の入口） ----------
function fogGate(gdef){
  const g = new THREE.Group(); add(g);
  const w = gdef.x2 - gdef.x1, cx = (gdef.x1 + gdef.x2)/2, cz = (gdef.z1 + gdef.z2)/2, h = gdef.h || 6.6;
  for (let i = 0; i < 3; i++){
    const mat = new THREE.MeshBasicMaterial({ map: ownTex(TEX.fog, 1, 1), transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, color: 0xd8deff, blending: THREE.AdditiveBlending, fog: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(cx, h/2, cz + (i - 1)*.12); g.add(p);
  }
  const col = { x1: gdef.x1, z1: gdef.z1, x2: gdef.x2, z2: gdef.z2, h, off: false };
  colliders.push(col);
  gate = { g, col, def: gdef }; return gate;
}
function openGate(){ if (!gate) return; gate.col.off = true; gate.g.visible = false; }

// ---------- 要石（拠点との行き来） ----------
// opts: { glow:true/false, text, use(), dimText }
function archstone(x, z, face, opts){
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = face; add(g);
  const base = boxMesh(1.8, .4, 1.4, lam(0x5a5a68, ownTex(TEX.stone, 1, .3))); base.position.y = .2; g.add(base);
  const body = boxMesh(1.1, 3.4, .7, lam(opts.glow ? 0x9a9cb0 : 0x5e5e6a, ownTex(TEX.stone, .6, 1.8))); body.position.y = 2.1; body.rotation.z = .04; g.add(body);
  const cap = boxMesh(1.3, .3, .85, lam(0x6a6a78)); cap.position.y = 3.9; g.add(cap);
  if (opts.glow){
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: TEX.sigil, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: opts.color || 0xc8d4ff }));
    s.position.set(0, 2.4, .36); g.add(s);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moonGlow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: opts.color || 0x9fb0ff, opacity: .45 }));
    halo.position.set(0, 2.4, .5); halo.scale.setScalar(2.6); g.add(halo);
    spinners.push({ obj: halo, pulse: true, seed: Math.random()*6 });
  }
  colliders.push({ x1: x - .75, z1: z - .75, x2: x + .75, z2: z + .75, h: 4 });
  const fx = Math.sin(face), fz = Math.cos(face);
  interactables.push({
    near: p => Math.hypot(p.x - (x + fx*1.3), p.z - (z + fz*1.3)) < 1.6,
    prompt: () => opts.glow ? { text: opts.text } : { text: opts.dimText || 'まだ封じられている', dim: true },
    use: () => { if (opts.glow) opts.use(); }
  });
  return g;
}

// ---------- 読み込みと片付け ----------
function isLit(stageId, bid){ return (G.lit[stageId] || []).includes(bid); }
function setLit(stageId, bid){ if (!G.lit[stageId]) G.lit[stageId] = []; if (!G.lit[stageId].includes(bid)) G.lit[stageId].push(bid); }
function litBonfires(stageId){ const def = STAGES[stageId]; return (def.bonfires || []).filter(b => b.lit || isLit(stageId, b.id)); }

function loadStage(id){
  const def = STAGES[id]; stage = def;
  stageGroup = new THREE.Group(); scene.add(stageGroup);
  wr = mulberry32(def.seed || 1);
  hemiLight.intensity = def.hemi ?? .62; moonLight.intensity = def.moon ?? .72; moonSprite.visible = !def.roof;
  def._fog = new THREE.Color(def.fog); def._bossFog = new THREE.Color(def.bossFog || def.fog);
  scene.fog.color.copy(def._fog); scene.fog.near = def.fogNear || 7; scene.fog.far = def.fogFar || 46; scene.background.copy(def._fog);
  def.build();
  (def.bonfires || []).forEach(b => makeBonfire(b, !!b.lit || isLit(id, b.id)));
  (def.runes || []).forEach(([x, z, t]) => rune(x, z, t));
  (def.enemies || []).forEach(([k, x, z, f]) => enemies.push(new Enemy(k, x, z, f)));
  boss = null; gate = null;
  if (def.boss){
    if (!G.bosses[id]){ boss = new Enemy(def.boss.type, def.boss.x, def.boss.z, def.boss.face || 0); enemies.push(boss); fogGate(def.boss.gate); }
    else spawnReturnStone(false);
  }
  if (G.stain && G.stain.stage === id){
    stainSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soul, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    stainSprite.position.set(G.stain.x, .7, G.stain.z); stainSprite.scale.setScalar(1.2); add(stainSprite);
  }
  enemies.forEach(e => e.pose(1, 0));
}
function spawnReturnStone(fx){
  const r = stage.boss.returnStone; if (!r) return;
  archstone(r.x, r.z, r.face || 0, { glow: true, text: '月影の祭壇へ帰る', use: () => travel('nexus') });
  const rw = stage.boss.reward; if (rw) itemPickup('reward', rw.x, rw.z, rw.item);
  if (fx){ _v.set(r.x, 2, r.z); burst(_v, 'heal', 40, 4, -1, 1.4, 1.3); sfx.warp(); }
}
function unloadStage(){
  if (!stageGroup) return;
  scene.remove(stageGroup);
  stageGroup.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material){ const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map && m.map.userData && m.map.userData.own) m.map.dispose(); m.dispose(); }); }
  });
  stageGroup = null; stainSprite = null;
  [colliders, flames, bonfires, runes, interactables, enemies, spinners].forEach(a => a.length = 0);
  boss = null; gate = null; clearFx();
}

// ---------- 当たり判定 ----------
function resolve(pos, r){
  for (const c of colliders){
    if (c.off) continue;
    const cx = clamp(pos.x, c.x1, c.x2), cz = clamp(pos.z, c.z1, c.z2);
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx*dx + dz*dz;
    if (d2 >= r*r) continue;
    if (d2 > 1e-8){ const d = Math.sqrt(d2); pos.x += dx/d*(r - d); pos.z += dz/d*(r - d); }
    else {
      const l = pos.x - c.x1, rr = c.x2 - pos.x, f = pos.z - c.z1, b = c.z2 - pos.z, m = Math.min(l, rr, f, b);
      if (m === l) pos.x = c.x1 - r; else if (m === rr) pos.x = c.x2 + r; else if (m === f) pos.z = c.z1 - r; else pos.z = c.z2 + r;
    }
  }
}
function insideAny(p, pad){
  for (const c of colliders){ if (c.off || c.cam === false) continue; if (p.x > c.x1 - pad && p.x < c.x2 + pad && p.z > c.z1 - pad && p.z < c.z2 + pad && p.y < c.h + pad) return true; }
  return false;
}
