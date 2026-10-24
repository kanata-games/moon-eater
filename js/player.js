'use strict';
// =========================================================
// player.js — プレイヤーの能力値・行動・被ダメージ
// =========================================================
const P = {
  pos: new THREE.Vector3(0, 0, 2.2), face: Math.PI, hp: 380, maxHp: 380, st: 95, maxSt: 95, stDelay: 0, atk: 30,
  flasks: 4, maxFlasks: 4, souls: 0, vit: 1, end: 1, str: 1, state: 'idle', t: 0, combo: 0, hitSet: new Set(), swung: false,
  lock: null, bonfire: null, buf: null, bufT: 0, walk: 0, guarding: false, sprinting: false, kb: new THREE.Vector3(), kbT: 0, healed: false,
  chestV: new THREE.Vector3(), char: 'astarte', mp: 0, maxMp: 0, mpDelay: 0, spell: 0, animT: 0,
  H: null
};
// 主人公を切り替える（見た目と能力）
function setCharacter(id){
  if (!CHARS[id]) id = 'astarte';
  if (P.H) scene.remove(P.H.root);
  P.char = id; P.H = CHARS[id].build(); scene.add(P.H.root);
  recompute();
}
const CH = () => CHARS[P.char];
function recompute(){
  const C = CH(), n3 = P.str - 1;
  P.maxHp = C.hp[0] + (P.vit - 1)*C.hp[1]; P.maxSt = C.st[0] + (P.end - 1)*C.st[1]; P.atk = C.atk[0] + n3*C.atk[1];
  P.spell = C.spell ? C.spell[0] + n3*C.spell[1] : 0; P.maxMp = C.mp ? C.mp[0] + n3*C.mp[1] : 0;
}
setCharacter('astarte');

// 行動ごとの長さ。act=攻撃判定の時間帯 cancel=次の行動を受け付け始める時間 iframe=無敵時間 window=パリィ受付
const ACT = {
  light:  { dur: .62, cost: 16, act: [.17, .29], cancel: .40, reach: 2.25, arc: 80, mult: 1,   move: [.05, .24, 1.8] },
  heavy:  { dur: 1.0, cost: 32, act: [.46, .6],  cancel: .78, reach: 2.5,  arc: 64, mult: 1.9, move: [.38, .58, 2.6], heavy: true },
  roll:   { dur: .62, cost: 22, iframe: [.03, .42], cancel: .5 },
  parry:  { dur: .7,  cost: 12, window: [.05, .24], cancel: .55 },
  heal:   { dur: 1.35, cost: 0, cancel: 99 },
  stagger:{ dur: .55, cancel: 99 }, guardHit: { dur: .32, cancel: .2 }, guardBreak: { dur: 1.15, cancel: 99 }, crit: { dur: 1.6, cancel: 99 },
  gate:   { dur: 1.4, cancel: 99 },
  // 魔法（海音）。mp=消費MP
  cast:      { dur: .58, cost: 8,  mp: 9,  act: [.24, .28], cancel: .44 },
  castHeavy: { dur: 1.1, cost: 18, mp: 26, act: [.56, .62], cancel: .9 }
};

function setState(s){ P.state = s; P.t = 0; P.hitSet.clear(); P.swung = false; P.healed = false; }
const angTo = e => Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
function addSouls(n){ P.souls += n; }
function resetPlayerBody(){ P.H.rig.rotation.set(0, 0, 0); P.H.rig.position.y = .75; locoPose(P.H, 0, 0, false, 1, false); }

function findCrit(){
  for (const e of enemies){
    if (e.dead || !e.active()) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz), toE = Math.atan2(dx, dz);
    const aim = Math.abs(angDiff(P.face, toE)) < 1.4 || P.lock === e;
    if (e.state === 'parried' && d < (e.T.boss ? 4.4 : 2.6) && aim) return { e, type: 'riposte' };
    if (!e.T.boss && d < 1.9 && ['idle', 'chase', 'home', 'rec', 'stagger', 'blockHit', 'wind'].includes(e.state)){
      const behind = Math.abs(angDiff(e.face, Math.atan2(-dx, -dz))) > 2.15;
      if (behind && aim) return { e, type: 'back' };
    }
  }
  return null;
}
function startCrit(c){
  const e = c.e; setState('crit'); P.critE = e; P.critType = c.type; P.critHit = false;
  const f = e.fwd();
  if (c.type === 'back'){ P.pos.set(e.pos.x - f.x*1.0, 0, e.pos.z - f.z*1.0); P.face = e.face; }
  else { const r = e.T.boss ? 2.7 : 1.3; P.pos.set(e.pos.x + f.x*r, 0, e.pos.z + f.z*r); P.face = e.face + Math.PI; }
  e.state = 'critted'; e.t = 0; e.critDur = e.T.boss ? 1.9 : 2.2; e.critType = c.type; e.A = null;
}
function startAction(a, mv, ml){
  if (a === 'heal'){ if (P.flasks <= 0) return true; P.flasks--; setState('heal'); return true; }
  if (ACT[a].cost && P.st <= 0) return false;
  if (a === 'light' || a === 'heavy'){ const c = findCrit(); if (c){ startCrit(c); return true; } }
  // 魔法型：MPが足りれば魔法、足りなければ杖で殴る
  if (CH().caster && (a === 'light' || a === 'heavy')){
    const ca = a === 'light' ? 'cast' : 'castHeavy';
    if (P.mp >= ACT[ca].mp){ a = ca; P.mp -= ACT[ca].mp; P.mpDelay = 1.3; }
  }
  const d = ACT[a];
  if (P.lock && a !== 'roll') P.face = angTo(P.lock);
  else if (ml > .2) P.face = Math.atan2(mv.x, mv.z);
  if (a === 'roll'){ P.rollDir = ml > .2 ? Math.atan2(mv.x, mv.z) : P.face; P.face = P.rollDir; sfx.roll(); }
  const combo = (a === 'light' && P.state === 'light') ? 1 - P.combo : 0;
  P.st -= d.cost; P.stDelay = .7;
  setState(a); P.combo = combo; P.H.rig.rotation.x = 0;
  return true;
}
function playerHitCheck(d){
  const dmg = P.atk*d.mult;
  for (const e of enemies){
    if (e.dead || !e.active() || P.hitSet.has(e) || e.y > 2 || e.state === 'critted') continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, dist = Math.hypot(dx, dz) - e.T.radius;
    if (dist > d.reach) continue;
    if (Math.abs(angDiff(P.face, Math.atan2(dx, dz))) > d.arc*DEG/2 && dist > .3) continue;
    P.hitSet.add(e);
    const r = e.hurt(dmg, !!d.heavy, Math.atan2(-dx, -dz));
    e.chest(_v);
    if (r === 'blocked'){ burst(_v, 'spark', 10, 4, 6, .35); hitStop = .04; }
    else if (r === 'break'){ burst(_v, 'spark', 18, 5, 6, .45); hitStop = .1; shake = .2; }
    else { burst(_v, 'blood', 12, 3.5, 9, .55); sfx.hit(); hitStop = d.heavy ? .09 : .055; if (d.heavy) shake = Math.max(shake, .15); }
  }
}
// 敵の攻撃が当たった時。戻り値: 'dodge' 'parry' 'block' 'hit' 'none'
function hurtPlayer(dmg, src, A = {}){
  if (P.state === 'dead' || P.state === 'crit' || P.state === 'gate') return 'none';
  const ang = Math.atan2(src.x - P.pos.x, src.z - P.pos.z), facing = Math.abs(angDiff(P.face, ang)) < 1.35;
  if (P.state === 'roll' && P.t >= ACT.roll.iframe[0] && P.t <= ACT.roll.iframe[1]) return 'dodge';
  if (P.state === 'parry' && P.t >= ACT.parry.window[0] && P.t <= ACT.parry.window[1] && facing && !A.unparry){ sfx.parry(); hitStop = .15; shake = .1; return 'parry'; }
  const kb = (s) => { P.kb.set(P.pos.x - src.x, 0, P.pos.z - src.z).normalize().multiplyScalar(s); P.kbT = .22; };
  P.chestV.set(P.pos.x, 1.3, P.pos.z);
  if (P.guarding && facing && (P.state === 'idle' || P.state === 'guardHit')){
    P.st -= dmg*(A.aoe ? 1.05 : .82); P.stDelay = .8;
    if (P.st < 0){ P.st = 0; setState('guardBreak'); P.hp -= dmg*.35; sfx.guardBreak(); kb(5); burst(P.chestV, 'spark', 16, 5, 6, .4); }
    else { setState('guardHit'); P.hp -= dmg*Math.max(A.chip || 0, CH().guardChip || 0); sfx.block(); kb(3.5); burst(P.chestV, CH().caster ? 'water' : 'spark', 8, 4, 6, .3); }
    if (P.hp <= 0) killPlayer(); return 'block';
  }
  P.hp -= dmg; sfx.hurt(); shake = Math.max(shake, .28); burst(P.chestV, 'blood', 14, 3.5, 9, .55); hitStop = .06;
  setState('stagger'); P.guarding = false; kb(dmg > 80 ? 7 : 4);
  if (P.hp <= 0) killPlayer();
  return 'hit';
}
function killPlayer(){
  if (P.state === 'dead') return;
  P.hp = 0; setState('dead'); P.lock = null; P.deathPos = P.pos.clone(); sfx.die();
  banner('汝、斃れたり', 'death', 3.0, '');
  later(3.6, () => $('fade').classList.add('on'));
  later(4.7, () => { onPlayerDeath(); $('fade').classList.remove('on'); });
}

function updatePlayer(dt, I){
  const H = P.H;
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const mv = { x: fx*I.mz - fz*I.mx, z: fz*I.mz + fx*I.mx };
  let ml = Math.hypot(mv.x, mv.z); if (ml > 1){ mv.x /= ml; mv.z /= ml; ml = 1; }
  if (P.stDelay > 0) P.stDelay -= dt; else if (!P.sprinting) P.st = Math.min(P.maxSt, P.st + (P.guarding ? 18 : 50)*dt);
  if (P.maxMp){ if (P.mpDelay > 0) P.mpDelay -= dt; else P.mp = Math.min(P.maxMp, P.mp + 3.5*dt); }
  P.animT += dt;
  if (P.kbT > 0){ P.kbT -= dt; P.pos.x += P.kb.x*dt; P.pos.z += P.kb.z*dt; }
  P.t += dt;
  if (P.state === 'dead'){
    applyPose(H, { rig: [-1.45, 0, 0], rigY: .22, aR: [-.3, 0, .6], aL: [-.3, 0, -.6], tor: [0, 0, 0] }, 1 - Math.exp(-dt*5));
    H.root.position.set(P.pos.x, 0, P.pos.z); H.root.rotation.y = P.face; return;
  }
  for (const a of ['light', 'heavy', 'roll', 'parry', 'heal']) if (I[a]){ P.buf = a; P.bufT = simTime; }
  if (P.buf && simTime - P.bufT > .3) P.buf = null;
  const def = ACT[P.state];
  if (P.state !== 'idle' && def && P.t >= def.dur){
    if (P.state === 'gate') startBossFight();
    setState('idle'); H.rig.rotation.x = 0;
  }
  const d0 = ACT[P.state];
  const canAct = P.state === 'idle' || (d0 && P.t >= d0.cancel);
  if (canAct && P.buf){ if (startAction(P.buf, mv, ml)) P.buf = null; }
  P.sprinting = false;
  P.guarding = I.guard && (P.state === 'idle' || P.state === 'guardHit');
  switch (P.state){
    case 'idle': {
      const spr = I.sprint && ml > .2 && P.st > 0 && !P.guarding;
      if (spr){ P.sprinting = true; P.st -= 16*dt; P.stDelay = .5; }
      const spd = P.guarding ? 2.1 : spr ? 7.2 : 4.4;
      P.pos.x += mv.x*spd*dt; P.pos.z += mv.z*spd*dt;
      if (P.lock && !spr) P.face = turnTo(P.face, angTo(P.lock), 14*dt);
      else if (ml > .15) P.face = turnTo(P.face, Math.atan2(mv.x, mv.z), 12*dt);
      P.walk += ml*spd*dt*2.0;
      locoPose(H, P.walk, Math.min(1, ml*spd/4.4), P.guarding, dt, spr);
      break;
    }
    case 'light': case 'heavy': {
      const d = ACT[P.state], kind = P.state === 'heavy' ? 'heavy' : (P.combo ? 'side' : 'over');
      if (P.t < d.act[0] && P.lock) P.face = turnTo(P.face, angTo(P.lock), 6*dt);
      if (P.t >= d.move[0] && P.t <= d.move[1]){ P.pos.x += Math.sin(P.face)*d.move[2]*dt; P.pos.z += Math.cos(P.face)*d.move[2]*dt; }
      if (!P.swung && P.t >= d.act[0]){ P.swung = true; sfx.swing(P.state === 'heavy'); }
      if (P.t >= d.act[0] && P.t <= d.act[1]) playerHitCheck(d);
      const stg = P.t < d.act[0] ? 0 : P.t < d.act[1] ? 1 : 2;
      const f = stg === 0 ? P.t/d.act[0] : stg === 1 ? (P.t - d.act[0])/(d.act[1] - d.act[0]) : Math.min(1, (P.t - d.act[1])/(d.dur - d.act[1]));
      attackPose(H, kind, stg, f);
      applyPose(H, { legR: [.35, 0, 0], legL: [-.35, 0, 0], rig: [0, 0, 0], rigY: .75, sh: 0 }, .3);
      break;
    }
    case 'roll': {
      const d = ACT.roll, f = P.t/d.dur, sp = 9*(1 - f*.85);
      if (f < .85){ P.pos.x += Math.sin(P.rollDir)*sp*dt; P.pos.z += Math.cos(P.rollDir)*sp*dt; }
      const rf = Math.min(1, f/.8);
      H.rig.rotation.x = rf*Math.PI*2; H.rig.position.y = .75 - Math.sin(rf*Math.PI)*.35;
      applyPose(H, { aR: [-1.2, 0, 0], aL: [-1.2, 0, 0], tor: [.6, 0, 0], legR: [-1.2, 0, 0], legL: [-1.2, 0, 0], sh: 0 }, .4);
      if (rf >= 1) H.rig.rotation.x = 0;
      break;
    }
    case 'parry': {
      const f = P.t, out = f < .25 ? Math.min(1, f/.07) : Math.max(0, 1 - (f - .25)/.4);
      if (H.shieldPivot) applyPose(H, { aL: [-.2 - 1.3*out, 0, 1.1*out], sh: out, tor: [0, -.5*out, 0], aR: REST.aR }, .6);
      else applyPose(H, { aR: [-.35 - 1.3*out, 0, -1.3*out], aL: [-.2 - .5*out, 0, .4*out], tor: [0, .55*out, 0] }, .6); // 武器で弾く
      break;
    }
    case 'cast': case 'castHeavy': {
      const d = ACT[P.state], heavy = P.state === 'castHeavy';
      if (P.t < d.act[0] && P.lock) P.face = turnTo(P.face, angTo(P.lock), 8*dt);
      if (!P.swung && P.t >= d.act[0]){ P.swung = true; heavy ? castGeyser() : castBolt(); }
      const stg = P.t < d.act[0] ? 0 : P.t < d.act[1] ? 1 : 2;
      const f = stg === 0 ? P.t/d.act[0] : stg === 1 ? (P.t - d.act[0])/(d.act[1] - d.act[0]) : Math.min(1, (P.t - d.act[1])/(d.dur - d.act[1]));
      attackPose(H, heavy ? 'slam' : 'thrust', stg, f);
      if (!heavy && stg === 1) H.armR.rotation.z = 0; // 杖をまっすぐ前に
      applyPose(H, { legR: [.3, 0, 0], legL: [-.3, 0, 0], rig: [0, 0, 0], rigY: .75 }, .3);
      if (P.t < d.act[0] && Math.random() < dt*30){ H.tip.getWorldPosition(_v); burst(_v, 'water', 1, .6, -1, .4, .8); }
      break;
    }
    case 'heal': {
      if (!P.healed && P.t >= .85){ P.healed = true; P.hp = Math.min(P.maxHp, P.hp + P.maxHp*.42); if (P.maxMp) P.mp = Math.min(P.maxMp, P.mp + P.maxMp*.4); sfx.heal(); _v.set(P.pos.x, 1.2, P.pos.z); burst(_v, 'heal', 18, 1.5, -2, .9); }
      P.pos.x += mv.x*1.3*dt; P.pos.z += mv.z*1.3*dt;
      applyPose(H, { aL: [-2.4, 0, -.5], aR: REST.aR, tor: [-.1, 0, 0], sh: 0 }, .2);
      break;
    }
    case 'stagger': applyPose(H, { tor: [-.4, 0, 0], rig: [-.15, 0, 0], aR: [-.8, 0, .5], aL: [-.8, 0, -.5] }, .3); break;
    case 'guardHit': applyPose(H, { aL: [-1.25, 0, 0], sh: 1.25, tor: [-.2, 0, 0] }, .4); break;
    case 'guardBreak': applyPose(H, { aL: [-2.6, 0, -.7], sh: .3, aR: [-2.2, 0, .6], tor: [-.45, 0, 0], rig: [-.2, 0, 0] }, .3); break;
    case 'crit': {
      const e = P.critE, t = P.t;
      if (t < .5) attackPose(H, 'thrust', 0, t/.5); else if (t < .65) attackPose(H, 'thrust', 1, (t - .5)/.15); else if (t > 1.1) attackPose(H, 'thrust', 2, Math.min(1, (t - 1.1)/.5));
      if (!P.critHit && t >= .6){
        P.critHit = true; const dmg = P.atk*(P.critType === 'back' ? 4 : 4.5)*(e.T.boss ? .85 : 1);
        e.hp -= dmg; e.hpShow = 3; e.chest(_v); burst(_v, 'blood', 28, 5, 9, .7, 1.3); sfx.crit(); hitStop = .16; shake = .25;
        if (e.T.boss && e.hp > 0 && !e.phase2 && e.hp < e.T.hp*.5) e.pendingP2 = true;
      }
      break;
    }
    case 'gate': {
      const f = Math.min(1, P.t/ACT.gate.dur), to = gate.def.to;
      P.pos.set(lerp(P.gateFrom.x, to.x, f), 0, lerp(P.gateFrom.z, to.z, f)); P.face = gate.def.face; P.walk += dt*5;
      locoPose(H, P.walk, .6, false, dt, false); break;
    }
  }
  if (!['roll', 'dead', 'stagger', 'guardBreak'].includes(P.state)){ H.rig.rotation.x *= (1 - Math.min(1, dt*12)); H.rig.position.y += (.75 - H.rig.position.y)*Math.min(1, dt*12); }
  if (P.state !== 'gate') resolve(P.pos, .42);
  H.root.position.set(P.pos.x, 0, P.pos.z); H.root.rotation.y = P.face;
  if (H.bubble) H.bubble.visible = P.guarding || P.state === 'guardHit';
  if (H.anim) H.anim(dt, P.animT, P.state === 'idle' ? ml*(P.sprinting ? 7.2 : 4.4) : P.state === 'roll' ? 6 : 0);
}

// プレイヤーと敵、敵同士が重ならないように押し合う
function separate(){
  const list = enemies.filter(e => !e.dead && e.active() && e.y < 1);
  const pBusy = P.state === 'crit' || P.state === 'gate' || P.state === 'dead';
  for (const e of list){
    if (e.state === 'critted' || pBusy) continue;
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), r = .42 + e.T.radius;
    if (d < r && d > 1e-4){ const push = (r - d); if (e.T.boss || e.T.poise){ P.pos.x += dx/d*push; P.pos.z += dz/d*push; } else { P.pos.x += dx/d*push*.6; P.pos.z += dz/d*push*.6; e.pos.x -= dx/d*push*.4; e.pos.z -= dz/d*push*.4; } }
  }
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++){
    const a = list[i], b = list[j], dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z, d = Math.hypot(dx, dz), r = a.T.radius + b.T.radius;
    if (d < r && d > 1e-4){ const p = (r - d)/2; a.pos.x += dx/d*p; a.pos.z += dz/d*p; b.pos.x -= dx/d*p; b.pos.z -= dz/d*p; }
  }
}
function pickLock(){
  let best = null, bs = 1e9;
  for (const e of enemies){
    if (e.dead || !e.active()) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 18) continue;
    const a = Math.abs(angDiff(camYaw, Math.atan2(dx, dz))); if (a > 1.35) continue;
    const s = d*.3 + a*4; if (s < bs){ bs = s; best = e; }
  }
  return best;
}
