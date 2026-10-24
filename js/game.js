'use strict';
// =========================================================
// game.js — 進行管理・セーブ・入力・メニュー・HUD・カメラ・メインループ
// =========================================================
let running = false, paused = false, menu = null, simTime = 0, hitStop = 0, shake = 0;
let bossFight = false, timers = [];
let camYaw = Math.PI, camPitch = .28;
// G = 保存される進行状況
const G = { lit: {}, bosses: {}, stain: null, loc: null, taken: {}, opened: {}, inv: [] };
function later(sec, fn){ timers.push({ t: simTime + sec, fn }); }

// ---------- セーブ ----------
const SAVE_KEY = 'save1';
function save(){
  store.set(SAVE_KEY, { v: 1, char: P.char, eq: P.eq, inv: G.inv, vit: P.vit, end: P.end, str: P.str, souls: P.souls, lit: G.lit, bosses: G.bosses, taken: G.taken, opened: G.opened, stain: G.stain, loc: G.loc, bonfire: P.bonfire, at: Date.now() });
}
function readSave(){ const s = store.get(SAVE_KEY, null); return s && s.v === 1 ? s : null; }
function applySave(s){
  const C = CHARS[s.char] || CHARS.astarte;
  G.inv = Array.isArray(s.inv) ? s.inv.slice() : C.start.inv.slice();
  P.eq = s.eq ? { r: s.eq.r, l: s.eq.l } : { r: C.start.r, l: C.start.l };
  (C.own || []).forEach(id => { if (!G.inv.includes(id)) G.inv.push(id); }); // 専用武器は最初から持っている
  setCharacter(s.char || 'astarte');
  P.vit = s.vit || 1; P.end = s.end || 1; P.str = s.str || 1; P.souls = s.souls || 0;
  G.lit = s.lit || {}; G.bosses = s.bosses || {}; G.taken = s.taken || {}; G.opened = s.opened || {}; G.stain = s.stain || null; G.loc = s.loc || null; P.bonfire = s.bonfire || null;
  recompute();
}
function resetProgress(id){ const C = CHARS[id] || CHARS.astarte; G.inv = C.start.inv.slice(); P.eq = { r: C.start.r, l: C.start.l }; setCharacter(id); P.vit = P.end = P.str = 1; P.souls = 0; G.lit = {}; G.bosses = {}; G.taken = {}; G.opened = {}; G.stain = null; G.loc = null; P.bonfire = null; recompute(); }

// ---------- ステージの出入り ----------
function enterStage(id, bonfireId){
  unloadStage(); timers = []; bossFight = false; droneOff(); $('boss').hidden = true; $('note').hidden = true; noteRune = null;
  loadStage(id);
  let sp;
  if (stage.hub) sp = stage.spawn;
  else {
    const b = bonfires.find(b => b.id === bonfireId && b.lit) || bonfires.find(b => b.lit) || bonfires[0];
    sp = { x: b.x + (b.def.sx ?? 1.6), z: b.z + (b.def.sz ?? .4), face: b.def.face ?? Math.PI };
    P.bonfire = { stage: id, id: b.id };
  }
  P.pos.set(sp.x, 0, sp.z); P.face = sp.face; camYaw = sp.face; camPitch = .28;
  P.hp = P.maxHp; P.st = P.maxSt; P.mp = P.maxMp; P.flasks = P.maxFlasks; P.lock = null; P.kbT = 0; P.buf = null;
  P.H.root.visible = true; setState('idle'); resetPlayerBody(); hpLagV = P.hp;
  curArea = '';
  G.loc = { stage: id, bonfire: stage.hub ? null : P.bonfire.id };
  save();
}
// フェードしながら移動
function travel(id, bonfireId){
  menu = 'travel'; closeMenuUI(); sfx.warp();
  try { document.exitPointerLock(); } catch(e){}
  $('fade').classList.add('on');
  setTimeout(() => {
    enterStage(id, bonfireId);
    $('fade').classList.remove('on');
    menu = null; requestLock();
    banner(stage.name, 'soft', 2.2, stage.sub || '');
  }, 750);
}
function onPlayerDeath(){
  // 落とした魂（前の血痕は消える）
  G.stain = P.souls > 0 ? { stage: stage.id, x: P.deathPos.x, z: P.deathPos.z, souls: P.souls } : null;
  P.souls = 0; soulShown = 0;
  enterStage(stage.id, P.bonfire && P.bonfire.stage === stage.id ? P.bonfire.id : null);
}
function startBossFight(){
  bossFight = true; boss.reset(); boss.aggro = true; boss.state = 'roar'; boss.t = 0; sfx.roar(); shake = .5; droneOn();
  $('bossName').textContent = boss.T.name; $('boss').hidden = false; bossLagV = boss.hp;
}
function bossKilled(){
  G.bosses[stage.id] = true; bossFight = false; droneOff(); openGate(); save();
  enemies.forEach(e => { if (e.summoned && !e.dead) e.die(); }); // 呼ばれた手下も消える
  setTimeout(() => { $('boss').hidden = true; }, 1500);
  later(1.2, () => { banner('宿敵撃破', 'victory', 3.4, `${boss ? boss.T.name : ''}を討ち果たした`); sfx.victory(); });
  later(5.2, () => { spawnReturnStone(true); banner('帰還の要石が現れた', 'soft', 2.6, '祭壇へ戻り、魂を捧げよ'); });
}

// ---------- 篝火・要石・灯守り ----------
function useBonfire(b){
  if (!b.lit){
    b.lit = true; setFlame(b.flame, true); setLit(stage.id, b.id); P.bonfire = { stage: stage.id, id: b.id };
    banner('篝火を灯した', 'lit', 2.0, b.name); sfx.rest(); G.loc = { stage: stage.id, bonfire: b.id }; save(); return;
  }
  sfx.rest(); enterStage(stage.id, b.id); openBonfireMenu();
}
function openBonfireMenu(){
  const here = P.bonfire.id, def = (stage.bonfires || []).find(b => b.id === here);
  const items = litBonfires(stage.id).filter(b => b.id !== here).map(b => ({ label: b.name, fn: () => { enterStage(stage.id, b.id); openBonfireMenu(); } }));
  items.push({ label: '装備を変える', fn: () => openEquip(openBonfireMenu) });
  items.push({ label: '月影の祭壇へ帰る', sub: 'レベルアップは祭壇の灯守りで', fn: () => travel('nexus') });
  openMenu({ title: def ? def.name : '篝火', msg: '休息した。体力と月光の雫が戻り、倒した亡者たちが蘇った。', listTitle: '移動', items });
}
function openArchstone(stageId){
  const def = STAGES[stageId];
  const items = litBonfires(stageId).map(b => ({ label: b.name, fn: () => travel(stageId, b.id) }));
  const msg = G.bosses[stageId] ? `${def.sub || ''}　討伐済み` : (def.sub || '');
  openMenu({ title: def.name, msg, listTitle: '向かう篝火', items, leave: 'やめる' });
}
function openKeeper(){
  openMenu({ title: '灯守り', msg: '「魂を……。その器に、月の光を注ぎましょう」', level: true, items: [] });
}

// ---------- メニュー ----------
function openMenu(o){
  menu = 'menu'; try { document.exitPointerLock(); } catch(e){}
  $('mTitle').textContent = o.title; $('mMsg').textContent = o.msg || ''; $('mMsg').hidden = !o.msg;
  $('mLevel').hidden = !o.level; if (o.level) renderLevel();
  const list = $('mList'); list.innerHTML = '';
  $('mListSep').hidden = !o.items.length; $('mListSep').textContent = o.listTitle || '';
  o.items.forEach(it => {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = it.label;
    if (it.sub){ const s = document.createElement('small'); s.textContent = it.sub; b.appendChild(s); }
    b.addEventListener('click', it.fn); list.appendChild(b);
  });
  $('leaveBtn').textContent = o.leave || '立ち去る';
  $('menu').hidden = false;
}
function closeMenuUI(){ $('menu').hidden = true; }
function leaveMenu(){ if (menu !== 'menu') return; menu = null; closeMenuUI(); requestLock(); }
$('leaveBtn').addEventListener('click', leaveMenu);
const level = () => P.vit + P.end + P.str - 2;
const cost = () => Math.round(240*Math.pow(1.12, level() - 1));
function renderLevel(){
  $('lvNum').textContent = level(); $('lvSouls').textContent = P.souls; $('needSouls').textContent = cost();
  $('vVit').textContent = P.vit; $('vEnd').textContent = P.end; $('vStr').textContent = P.str;
  $('dVit').textContent = `最大HP ${P.maxHp}`; $('dEnd').textContent = `スタミナ ${P.maxSt}`;
  $('lStr').textContent = CH().stat3;
  $('dStr').textContent = CH().caster ? `魔力 ${Math.round(P.spell)}　MP ${P.maxMp}` : `攻撃力 ${Math.round(P.atk)}`;
  const can = P.souls >= cost(); ['pVit', 'pEnd', 'pStr'].forEach(id => $(id).disabled = !can);
}
function levelUp(stat){ if (P.souls < cost()) return; P.souls -= cost(); P[stat]++; recompute(); P.hp = P.maxHp; P.st = P.maxSt; P.mp = P.maxMp; hpLagV = P.hp; soulShown = P.souls; renderLevel(); sfx.levelUp(); save(); }
$('pVit').addEventListener('click', () => levelUp('vit')); $('pEnd').addEventListener('click', () => levelUp('end')); $('pStr').addEventListener('click', () => levelUp('str'));

function pause(){ paused = true; $('pause').hidden = false; $('ctrlSlot').appendChild($('ctrlBox')); }
function resume(){ paused = false; $('pause').hidden = true; requestLock(); }
$('resumeBtn').addEventListener('click', resume);
$('equipBtn').addEventListener('click', () => { $('pause').hidden = true; openEquip(() => { $('pause').hidden = false; }); });

// ---------- 装備画面 ----------
let eqSlot = 'r', eqBack = null, eqFocus = null;
function openEquip(back){
  eqBack = back; eqSlot = 'r'; eqFocus = null;
  if (menu === 'menu'){ closeMenuUI(); menu = 'equip'; }
  $('equip').hidden = false; renderEquip();
}
function closeEquip(){
  $('equip').hidden = true;
  if (menu === 'equip') menu = 'menu';
  const b = eqBack; eqBack = null; if (b) b();
}
$('eqBack').addEventListener('click', closeEquip);
$('slotR').addEventListener('click', () => { eqSlot = 'r'; eqFocus = null; renderEquip(); });
$('slotL').addEventListener('click', () => { eqSlot = 'l'; eqFocus = null; renderEquip(); });
const speedWord = s => s <= .8 ? 'とても速い' : s < .98 ? '速い' : s <= 1.05 ? '普通' : s < 1.3 ? '遅い' : 'とても遅い';
function itemStats(id){
  const it = ITEMS[id];
  if (it.slot === 'r'){
    let rows;
    if (it.mode === 'bow') rows = [['射撃', Math.round(P.atk*1.15)], ['貫通射', Math.round(P.atk*2.3)], ['速さ', '普通'], ['間合い', '遠く']];
    else if (it.mode === 'music') rows = [['音撃', Math.round(P.atk*.95)], ['調べ', '回復と攻撃+20%'], ['速さ', '普通'], ['間合い', '前方 4.8 m']];
    else rows = [['弱攻撃', Math.round(P.atk*it.mult)], ['強攻撃', Math.round(P.atk*it.heavy)], ['速さ', speedWord(it.spd)], ['間合い', it.reach.toFixed(1) + ' m']];
    if (it.catalyst) rows.push(['魔力', (CH().caster || it.only === P.char) && P.spell ? Math.round(P.spell*(it.spell || 1)) : '—（海音のみ）']);
    const tags = [];
    if (it.only) tags.push(CHARS[it.only].name + '専用'); if (it.heavyArc >= 360) tags.push('回転斬り'); if (it.parry) tags.push('パリィしやすい'); if (it.mode === 'music') tags.push('盾を崩す');
    if (it.guardBreak) tags.push('盾を崩す'); if (it.crit > 1) tags.push('致命が深い'); if (it.arc >= 110) tags.push('横に広い'); if (it.arc <= 40) tags.push('突き');
    if (tags.length) rows.push(['特徴', tags.join('・')]);
    return rows;
  }
  const sh = id === 'none' ? null : it;
  const drain = sh ? sh.drain : BARE.drain, par = sh ? sh.parry : BARE.parry;
  return [['受けの強さ', drain <= .5 ? 'とても強い' : drain <= .8 ? '強い' : drain <= 1 ? '普通' : '弱い'],
    ['削られにくさ', !sh ? '刃で受ける' : sh.chipMul === 0 ? '削られない' : sh.chipMul < 1 ? '少し削られる' : '削られる'],
    ['パリィ', (par[1] - par[0]) >= .25 ? '合わせやすい' : (par[1] - par[0]) >= .17 ? '普通' : '難しい'],
    ['構えて歩く', sh && sh.guardSpd ? '遅い' : '普通']];
}
function renderEquip(){
  $('slotR').classList.toggle('on', eqSlot === 'r'); $('slotL').classList.toggle('on', eqSlot === 'l');
  $('slotRName').textContent = ITEMS[P.eq.r].name; $('slotLName').textContent = ITEMS[P.eq.l].name;
  const owned = (eqSlot === 'l' ? ['none'] : []).concat(G.inv.filter(id => ITEMS[id] && ITEMS[id].slot === eqSlot && (!ITEMS[id].only || ITEMS[id].only === P.char)));
  const list = $('eqList'); list.innerHTML = '';
  owned.forEach(id => {
    const b = document.createElement('button'); b.className = 'eqitem'; const worn = P.eq[eqSlot] === id;
    b.classList.toggle('worn', worn); b.classList.toggle('focus', eqFocus === id);
    const n = document.createElement('span'); n.textContent = ITEMS[id].name;
    const k = document.createElement('span'); k.className = 'k'; k.textContent = worn ? '装備中' : ITEMS[id].kind;
    b.append(n, k);
    b.addEventListener('mouseenter', () => { eqFocus = id; renderDetail(id); });
    b.addEventListener('focus', () => { eqFocus = id; renderDetail(id); });
    b.addEventListener('click', () => { P.eq[eqSlot] = id; applyEquip(); sfx.block(); save(); eqFocus = id; renderEquip(); });
    list.appendChild(b);
  });
  renderDetail(eqFocus || P.eq[eqSlot]);
}
function renderDetail(id){
  const it = ITEMS[id], d = $('eqDetail'); d.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = it.name;
  const p = document.createElement('p'); p.textContent = it.desc;
  const dl = document.createElement('dl');
  const cur = itemStats(P.eq[eqSlot]), rows = itemStats(id);
  rows.forEach(([k, v], i) => {
    const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v;
    const c = cur[i]; if (c && typeof v === 'number' && typeof c[1] === 'number' && v !== c[1]) dd.className = v > c[1] ? 'up' : 'down';
    dl.append(dt, dd);
  });
  d.append(h, p, dl);
}
$('titleBtn').addEventListener('click', () => {
  paused = false; running = false; $('pause').hidden = true; $('hud').hidden = true;
  document.querySelector('#title .tcol').after($('ctrlBox'));
  showTitle();
});

// ---------- 設定 ----------
$('qual').value = String(pixelScale); $('qual2').value = String(pixelScale); $('sens').value = sens;
function setQuality(v){ pixelScale = parseFloat(v); store.set('qual', pixelScale); $('qual').value = String(pixelScale); $('qual2').value = String(pixelScale); resize(); }
$('qual').addEventListener('change', e => setQuality(e.target.value));
$('qual2').addEventListener('change', e => setQuality(e.target.value));
$('sens').addEventListener('input', e => { sens = parseFloat(e.target.value); store.set('sens', sens); });

// ---------- 入力 ----------
const keys = {}, pressed = new Set(); let mouseR = false, locked = false, spaceT = 0, gpPrev = [], gpRollT = 0;
addEventListener('keydown', e => {
  if (['Space', 'Tab', 'KeyQ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && running) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'Space') spaceT = 0;
  if (!$('equip').hidden && e.code === 'Escape'){ closeEquip(); return; }
  if (menu === 'menu' && (e.code === 'Escape' || e.code === 'KeyE')){ leaveMenu(); return; }
  if (running && !menu && !locked && (e.code === 'Escape' || e.code === 'KeyP')){ paused ? resume() : pause(); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') pressed.add('SpaceUp'); });
cv.addEventListener('mousedown', e => {
  if (!running || paused || menu) return;
  if (!locked) requestLock();
  if (e.button === 0) pressed.add('M0');
  if (e.button === 1){ pressed.add('M1'); e.preventDefault(); }
  if (e.button === 2) mouseR = true;
});
addEventListener('mouseup', e => { if (e.button === 2) mouseR = false; });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => {
  if (!running || paused || menu) return;
  if (locked || e.buttons){ camYaw -= e.movementX*.0024*sens; camPitch += e.movementY*.0022*sens; }
});
function requestLock(){ try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch(e){} }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (!locked && running && !menu && !paused) pause(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseR = false; if (running && !menu && !paused) pause(); });

function readInput(dt){
  const I = { mx: 0, mz: 0, light: false, heavy: false, guard: false, parry: false, roll: false, sprint: false, lock: false, heal: false, use: false };
  if (keys.KeyW) I.mz += 1; if (keys.KeyS) I.mz -= 1; if (keys.KeyA) I.mx -= 1; if (keys.KeyD) I.mx += 1;
  if (keys.ArrowLeft) camYaw += 2.4*dt*sens; if (keys.ArrowRight) camYaw -= 2.4*dt*sens; if (keys.ArrowUp) camPitch -= 1.5*dt*sens; if (keys.ArrowDown) camPitch += 1.5*dt*sens;
  const shift = keys.ShiftLeft || keys.ShiftRight;
  if (pressed.has('M0')){ if (shift) I.heavy = true; else I.light = true; }
  if (pressed.has('KeyJ')) I.light = true; if (pressed.has('KeyK')) I.heavy = true;
  if (pressed.has('KeyF')) I.parry = true; if (pressed.has('KeyQ') || pressed.has('M1')) I.lock = true;
  if (pressed.has('KeyR')) I.heal = true; if (pressed.has('KeyE')) I.use = true;
  I.guard = mouseR || !!keys.KeyL;
  if (keys.Space) spaceT += dt;
  if (pressed.has('SpaceUp')){ if (spaceT < .28) I.roll = true; spaceT = 0; }
  if (keys.Space && spaceT >= .28) I.sprint = true;
  // ゲームパッド
  const gp = getPad();
  if (gp){
    const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5));
    const edge = i => b(i) && !gpPrev[i];
    const dz = v => Math.abs(v) < .18 ? 0 : v;
    const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
    if (ax || ay){ I.mx = ax; I.mz = -ay; }
    camYaw -= dz(gp.axes[2] || 0)*2.6*dt*sens; camPitch += dz(gp.axes[3] || 0)*1.8*dt*sens;
    if (edge(5)) I.light = true; if (edge(7)) I.heavy = true; if (b(4)) I.guard = true; if (edge(6)) I.parry = true;
    if (edge(11) || edge(10)) I.lock = true; if (edge(2)) I.heal = true; if (edge(0)) I.use = true;
    if (b(1)){ gpRollT += dt; if (gpRollT >= .28) I.sprint = true; }
    else { if (gpPrev[1] && gpRollT < .28) I.roll = true; gpRollT = 0; }
    gpPrev = gp.buttons.map((_, i) => b(i));
  }
  return I;
}
function getPad(){ const pads = navigator.getGamepads ? navigator.getGamepads() : []; return pads && Array.from(pads).find(p => p && p.connected); }
function pollPadMenus(){
  const gp = getPad(); if (!gp) return;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  if (b(9) && !gpPrev[9]){ if (menu === 'menu') leaveMenu(); else if (running && !menu) (paused ? resume() : pause()); }
  if (b(1) && !gpPrev[1] && menu === 'menu') leaveMenu();
  if (paused || menu) gpPrev = gp.buttons.map((_, i) => b(i));
  else gpPrev[9] = b(9);
}

// ---------- 調べる ----------
let promptState = null, noteRune = null;
function nearInteract(){
  if (P.state !== 'idle') return null;
  for (const b of bonfires){
    if (Math.hypot(P.pos.x - b.x, P.pos.z - b.z) < 2.3){
      const threat = enemies.some(e => !e.dead && e.active() && (e.state === 'chase' || e.state === 'wind' || e.state === 'act') && Math.hypot(e.pos.x - b.x, e.pos.z - b.z) < 12);
      return threat ? { text: '敵が近くにいるため休めない', dim: true } : { text: b.lit ? '篝火で休む' : '篝火を灯す', use: () => useBonfire(b) };
    }
  }
  if (gate && !gate.col.off && !bossFight){
    const g = gate.def;
    if (P.pos.x > g.x1 && P.pos.x < g.x2 && P.pos.z > g.z1 - 1.6 && P.pos.z < g.z2 + 1.6) return { text: '霧の中へ入る', use: enterBossGate };
  }
  for (const it of interactables) if (it.near(P.pos)){ const p = it.prompt(); return { text: p.text, dim: p.dim, use: it.use }; }
  for (const r of runes) if (Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < 1.5) return { text: '書き置きを読む', use: () => { noteRune = r; $('noteText').textContent = r.text; $('note').hidden = false; } };
  return null;
}
function enterBossGate(){ setState('gate'); P.gateFrom = P.pos.clone(); sfx.gate(); P.lock = null; }

// ---------- HUD ----------
let bannerTimer = 0;
function banner(text, cls, hold, sub){
  const el = $('banner'); el.className = cls + ' on'; $('bannerT').textContent = text; $('bannerS').textContent = sub || '';
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.classList.remove('on'), hold*1000);
}
let areaTimer = 0, curArea = '';
function areaName(){
  const n = stage.area ? stage.area(P.pos) : stage.name;
  if (n !== curArea){ curArea = n; const el = $('area'); el.textContent = n; el.classList.add('on'); clearTimeout(areaTimer); areaTimer = setTimeout(() => el.classList.remove('on'), 2600); }
}
let hpLagV = P.hp, bossLagV = 0, soulShown = 0;
const ehpPool = [];
for (let i = 0; i < 8; i++){ const d = document.createElement('div'); d.className = 'ehp'; d.hidden = true; d.innerHTML = '<i></i>'; $('ehps').appendChild(d); ehpPool.push(d); }
function project(v){ _v2.copy(v).project(camera); return { x: (_v2.x*.5 + .5)*innerWidth, y: (-_v2.y*.5 + .5)*innerHeight, ok: _v2.z < 1 && Math.abs(_v2.x) < 1.1 && Math.abs(_v2.y) < 1.1 }; }
function updateHUD(dt){
  hpLagV = hpLagV > P.hp ? Math.max(P.hp, hpLagV - P.maxHp*.35*dt) : P.hp;
  $('hpBar').style.width = (P.maxHp*.58) + 'px'; $('stBar').style.width = (P.maxSt*1.9) + 'px';
  $('hpFill').style.width = (Math.max(0, P.hp)/P.maxHp*100) + '%'; $('hpLag').style.width = (hpLagV/P.maxHp*100) + '%';
  $('stFill').style.width = (Math.max(0, P.st)/P.maxSt*100) + '%';
  $('mpBar').hidden = !(P.maxMp && (CH().caster || canCast()));
  $('buff').hidden = !(P.buffT > 0); if (P.buffT > 0) $('buffT').textContent = Math.ceil(P.buffT);
  if (P.maxMp){ $('mpBar').style.width = (P.maxMp*1.6) + 'px'; $('mpFill').style.width = (Math.max(0, P.mp)/P.maxMp*100) + '%'; }
  $('flaskNum').textContent = '×' + P.flasks; $('vial').classList.toggle('empty', P.flasks === 0);
  soulShown += (P.souls - soulShown)*Math.min(1, dt*6); if (Math.abs(P.souls - soulShown) < 1) soulShown = P.souls;
  $('soulNum').textContent = Math.round(soulShown);
  if (boss && !$('boss').hidden){
    bossLagV = bossLagV > boss.hp ? Math.max(boss.hp, bossLagV - boss.T.hp*.25*dt) : boss.hp;
    $('bossFill').style.width = (Math.max(0, boss.hp)/boss.T.hp*100) + '%'; $('bossLag').style.width = (Math.max(0, bossLagV)/boss.T.hp*100) + '%';
  }
  const pr = $('prompt');
  if (promptState && !menu){ pr.hidden = false; pr.className = promptState.dim ? 'dim' : ''; pr.innerHTML = ''; if (!promptState.dim){ const k = document.createElement('span'); k.className = 'key'; k.textContent = 'E'; pr.appendChild(k); } pr.appendChild(document.createTextNode(promptState.text)); }
  else pr.hidden = true;
  const rt = $('reticle');
  if (P.lock){ P.lock.chest(_v); const p = project(_v); rt.hidden = !p.ok; rt.style.left = p.x + 'px'; rt.style.top = p.y + 'px'; } else rt.hidden = true;
  let n = 0;
  for (const e of enemies){
    if (n >= ehpPool.length) break;
    if (e.dead || e.T.boss || !(e.hpShow > 0 || P.lock === e)) continue;
    _v.set(e.pos.x, 2.3*e.T.scale, e.pos.z); const p = project(_v); if (!p.ok) continue;
    const d = ehpPool[n++]; d.hidden = false; d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; d.firstChild.style.width = (Math.max(0, e.hp)/e.T.hp*100) + '%';
  }
  for (; n < ehpPool.length; n++) ehpPool[n].hidden = true;
}

// ---------- カメラ ----------
const probe = new THREE.Vector3();
let camMode = 'title', selChar = 'astarte';
const previews = {};
function updateCamera(dt){
  if (!running && camMode === 'select'){
    const tx = selChar === 'astarte' ? -1.3 : 1.3;
    camera.position.x += (tx*.55 - camera.position.x)*Math.min(1, dt*4 || .05);
    camera.position.y = 1.75; camera.position.z = 8.9;
    camera.lookAt(camera.position.x*.9, .55, 4); return;
  }
  if (!running){
    const t = performance.now()/1000*.07;
    camera.position.set(Math.sin(t)*7.5, 3.2, 1 + Math.cos(t)*7.5); camera.lookAt(0, 1.2, -3); return;
  }
  const pivot = _v.set(P.pos.x, 1.55, P.pos.z);
  if (P.lock){
    const ty = angTo(P.lock); camYaw += angDiff(camYaw, ty)*Math.min(1, dt*7);
    const tp = P.lock.T.boss ? .12 : .3; camPitch += (tp - camPitch)*Math.min(1, dt*3);
  }
  camPitch = clamp(camPitch, -.45, 1.05);
  const cp = Math.cos(camPitch);
  const dx = Math.sin(camYaw)*cp, dy = -Math.sin(camPitch), dz = Math.cos(camYaw)*cp;
  const dist = bossFight ? 6.8 : 5.2;
  const steps = 16; let lx = pivot.x, ly = pivot.y, lz = pivot.z;
  for (let i = 1; i <= steps; i++){
    const f = i/steps*dist; probe.set(pivot.x - dx*f, Math.max(.35, pivot.y - dy*f), pivot.z - dz*f);
    if (insideAny(probe, .25)) break; lx = probe.x; ly = probe.y; lz = probe.z;
  }
  if (stage && stage.roof) ly = Math.min(ly, stage.roof - .45);
  camera.position.set(lx, ly, lz);
  if (shake > 0){ camera.position.x += (Math.random() - .5)*shake*.6; camera.position.y += (Math.random() - .5)*shake*.6; shake = Math.max(0, shake - dt*1.6); }
  camera.lookAt(pivot.x, pivot.y, pivot.z);
}

// ---------- メインループ ----------
function step(dt){
  simTime += dt;
  const I = readInput(dt);
  if (I.lock){ P.lock = P.lock ? null : pickLock(); }
  if (P.lock && (P.lock.dead || !P.lock.active() || Math.hypot(P.lock.pos.x - P.pos.x, P.lock.pos.z - P.pos.z) > 22)) P.lock = null;
  promptState = nearInteract();
  if (I.use){
    if (!$('note').hidden){ $('note').hidden = true; noteRune = null; }
    else if (promptState && promptState.use) promptState.use();
  }
  if (menu) return; // 篝火などでメニューが開いた
  updatePlayer(dt, I);
  for (const e of enemies) e.update(dt);
  separate();
  if (noteRune && Math.hypot(P.pos.x - noteRune.x, P.pos.z - noteRune.z) > 2.6){ $('note').hidden = true; noteRune = null; }
  if (stainSprite && G.stain && P.state !== 'dead'){
    stainSprite.position.y = .7 + Math.sin(simTime*3)*.12;
    if (Math.random() < dt*8){ _v.set(G.stain.x + (Math.random() - .5)*.6, .3, G.stain.z + (Math.random() - .5)*.6); burst(_v, 'soul', 1, .3, -1.2, 1.0); }
    if (Math.hypot(P.pos.x - G.stain.x, P.pos.z - G.stain.z) < 1.3){
      addSouls(G.stain.souls); sfx.soul(); banner('魂を取り戻した', 'soft', 1.6, '');
      stainSprite.visible = false; stainSprite = null; G.stain = null; save();
    }
  }
  if (timers.length){ const due = timers.filter(t => simTime >= t.t); if (due.length){ timers = timers.filter(t => simTime < t.t); due.forEach(t => t.fn()); } }
  if (!stage) return;
  areaName();
  const targetFog = bossFight ? stage._bossFog : stage._fog;
  scene.fog.color.lerp(targetFog, Math.min(1, dt*.8)); scene.background.copy(scene.fog.color);
  const fn = bossFight && stage.bossFogNear ? stage.bossFogNear : (stage.fogNear || 7), ff = bossFight && stage.bossFogFar ? stage.bossFogFar : (stage.fogFar || 46);
  scene.fog.near += (fn - scene.fog.near)*Math.min(1, dt); scene.fog.far += (ff - scene.fog.far)*Math.min(1, dt);
  moonSprite.material.color.lerp(boss && boss.phase2 && bossFight ? _c.set(0xff8a8a) : _c.set(0xffffff), Math.min(1, dt));
}
function animateWorld(dt, now){
  for (const f of flames){
    if (!f.on) continue;
    f.cones.forEach((c, i) => { const n = Math.sin(now*9 + f.seed + i*2) * .12 + Math.sin(now*23 + i) * .06; c.scale.set(1 + n, 1 + n*2 + Math.random()*.08, 1 + n); c.rotation.y += dt*(1 + i); });
    if (f.light) f.light.intensity = 1.9 + Math.sin(now*11 + f.seed)*.2 + Math.random()*.15;
  }
  if (gate) gate.g.children.forEach((p, i) => { p.material.map.offset.y = (now*.07*(i + 1)) % 1; p.material.map.offset.x = Math.sin(now*.3 + i)*.2; p.material.opacity = .5 + Math.sin(now*1.3 + i)*.12; });
  runes.forEach((r, i) => { r.m.material.opacity = .65 + Math.sin(now*2 + i)*.25; });
  lanternLight.intensity = running && stage && stage.lantern ? stage.lantern : 0;
  lanternLight.position.set(P.pos.x, 2.4, P.pos.z);
  for (let i = spinners.length - 1; i >= 0; i--){
    const s = spinners[i];
    if (s.lift){ s.t += dt; s.obj.position.y = Math.min(3.9, s.t*2.6); if (s.t > 1.6) spinners.splice(i, 1); continue; }
    if (s.water){ s.obj.material.opacity = .72 + Math.sin(now*1.3 + s.seed)*.08; continue; }
    if (s.glow){ s.obj.scale.setScalar(.7 + Math.sin(now*3 + s.seed)*.12); s.obj.position.y = .5 + Math.sin(now*2 + s.seed)*.08; continue; }
    if (s.pulse){ s.obj.material.opacity = .35 + Math.sin(now*1.6 + s.seed)*.15; continue; }
    s.obj.rotation.y += s.rot*dt; s.obj.rotation.x += s.rot*.5*dt; s.obj.position.y = s.y0 + Math.sin(now*s.bob + s.seed)*.5;
  }
}
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000); last = now;
  const sim = running && !paused && !menu;
  let sdt = 0;
  pollPadMenus();
  if (sim){ sdt = dt; if (hitStop > 0){ hitStop -= dt; sdt = dt*.08; } step(sdt); }
  pressed.clear();
  animateWorld(dt, now/1000);
  updateFx(sdt); updateMagic(sdt);
  if (!running && camMode === 'select') animatePreviews(dt, now/1000);
  updateCamera(sim || camMode === 'select' ? dt : 0);
  renderer.render(scene, camera);
  if (running) updateHUD(dt);
}

// ---------- タイトル ----------
let confirmNew = false;
function showTitle(){
  $('title').hidden = false; confirmNew = false;
  const s = readSave();
  $('contBtn').hidden = !s;
  if (s){
    const where = s.loc && STAGES[s.loc.stage] ? STAGES[s.loc.stage].name : '月影の祭壇';
    const who = (CHARS[s.char] || CHARS.astarte).name;
    $('contInfo').textContent = `${who}　${where}　レベル ${(s.vit||1) + (s.end||1) + (s.str||1) - 2}`;
  }
  $('newBtn').innerHTML = 'はじめから'; $('newBtn').classList.remove('warn');
  // 背景：城の入口を回るカメラ
  camMode = 'title'; $('select').hidden = true;
  bossFight = false; droneOff(); timers = []; $('fade').classList.remove('on');
  unloadStage(); loadStage('castle');
}
function startGame(fromSave, charId){
  audioInit();
  $('title').hidden = true; $('select').hidden = true; $('hud').hidden = false; running = true; paused = false; menu = null; camMode = 'play';
  const s = fromSave ? readSave() : null;
  if (s){ applySave(s); } else resetProgress(charId);
  const loc = G.loc;
  if (loc && STAGES[loc.stage]) enterStage(loc.stage, loc.bonfire); else enterStage('nexus');
  soulShown = P.souls;
  banner(stage.name, 'soft', 2.2, stage.sub || '');
  requestLock();
}
$('contBtn').addEventListener('click', () => startGame(true));
$('newBtn').addEventListener('click', () => {
  if (readSave() && !confirmNew){ confirmNew = true; $('newBtn').innerHTML = 'はじめから<small>もう一度押すと、今のセーブを消して始めます</small>'; $('newBtn').classList.add('warn'); return; }
  $('newBtn').classList.remove('warn'); showSelect();
});

// ---------- 旅人選択 ----------
function showSelect(){
  audioInit();
  $('title').hidden = true; $('select').hidden = false; camMode = 'select';
  unloadStage(); loadStage('nexus'); P.H.root.visible = false;
  ['astarte', 'umine'].forEach((id, i) => {
    const H = CHARS[id].build(); H.root.position.set(i ? 1.3 : -1.3, 0, 4); H.root.rotation.y = i ? -.18 : .18; add(H.root);
    resetPoseFor(H); previews[id] = H;
  });
  camera.position.set(-.7, 1.55, 8.4);
  pickChar('astarte');
}
function resetPoseFor(H){ H.rig.position.y = .75; locoPose(H, 0, 0, false, 1, false); }
function pickChar(id){
  selChar = id;
  $('cardAstarte').classList.toggle('on', id === 'astarte'); $('cardUmine').classList.toggle('on', id === 'umine');
}
function animatePreviews(dt, t){
  for (const id in previews){
    const H = previews[id], on = id === selChar;
    if (on) applyPose(H, id === 'umine' ? { aR: [-1.3, 0, -.15], aL: [-.6, 0, .3], tor: [0, 0, 0] } : { aR: [-1.0, 0, -.6], aL: [-.3, 0, .2], tor: [.05, -.2, 0] }, Math.min(1, dt*6));
    else applyPose(H, { aR: REST.aR, aL: REST.aL, tor: [0, 0, 0] }, Math.min(1, dt*6));
    H.rig.position.y = .75 + Math.sin(t*1.8 + (id === 'umine' ? 1 : 0))*.015;
    if (H.anim) H.anim(dt, t, 0);
  }
}
$('cardAstarte').addEventListener('click', () => pickChar('astarte'));
$('cardUmine').addEventListener('click', () => pickChar('umine'));
$('selBack').addEventListener('click', () => { for (const k in previews) delete previews[k]; P.H.root.visible = true; showTitle(); });
$('selGo').addEventListener('click', () => { for (const k in previews) delete previews[k]; store.del(SAVE_KEY); startGame(false, selChar); });

recompute();
showTitle();
requestAnimationFrame(frame);
