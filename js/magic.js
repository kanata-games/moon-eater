'use strict';
// =========================================================
// magic.js — 海音の水魔法（水弾・潮渦）
// =========================================================
const bolts = [], geysers = [];
const boltGeo = new THREE.IcosahedronGeometry(.17, 0);
const boltMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff, fog: false });
sfx.bolt = () => { nz(.25, 1800, 2, .18, 'bandpass', 700); tn(880, .18, 'sine', .08, 1320); };
sfx.splash = () => { nz(.22, 1200, .8, .3, 'bandpass', 300); };
sfx.geyser = () => { nz(.9, 400, .5, .5, 'lowpass', 2400); tn(140, .6, 'sine', .3, 70); };

// 水弾：まっすぐ飛ぶ。ロックオン中は少し追いかける
function castBolt(){
  const m = new THREE.Mesh(boltGeo, boltMat); P.H.tip.getWorldPosition(m.position); m.position.y = Math.max(1.0, m.position.y);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moonGlow, color: 0x7fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.setScalar(.9); m.add(glow); scene.add(m);
  const v = new THREE.Vector3(Math.sin(P.face), 0, Math.cos(P.face)).multiplyScalar(17);
  if (P.lock){ P.lock.chest(_v); v.y = clamp((_v.y - m.position.y) / Math.max(1, Math.hypot(_v.x - m.position.x, _v.z - m.position.z)) * 17, -6, 6); }
  bolts.push({ m, v, life: 1.5, dmg: P.spell, target: P.lock });
  sfx.bolt();
}
// 潮渦：狙った場所に水柱を噴き上げる（少し遅れて発動）
function castGeyser(){
  let x, z;
  if (P.lock && Math.hypot(P.lock.pos.x - P.pos.x, P.lock.pos.z - P.pos.z) < 14){ x = P.lock.pos.x; z = P.lock.pos.z; }
  else { x = P.pos.x + Math.sin(P.face)*4.5; z = P.pos.z + Math.cos(P.face)*4.5; }
  ring(x, z, 2.6, 0x8fd8ff);
  geysers.push({ x, z, r: 2.6, t: 0, delay: .35, fired: false, dmg: P.spell*2.4, col: null });
}
function splash(pos){ burst(pos, 'water', 10, 3.5, 9, .45); sfx.splash(); }

function updateMagic(dt){
  if (!dt) return;
  updateEnemyShots(dt);
  for (let i = bolts.length - 1; i >= 0; i--){
    const b = bolts[i]; b.life -= dt;
    if (b.target && !b.target.dead){
      b.target.chest(_v); _v.sub(b.m.position).normalize().multiplyScalar(17);
      b.v.lerp(_v, Math.min(1, dt*2.2));
    }
    b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt*9; b.m.rotation.y += dt*7;
    if (Math.random() < dt*40) burst(b.m.position, 'water', 1, .3, 2, .3, .7);
    let hit = b.life <= 0 || b.m.position.y < .05;
    if (!hit && insideAny(b.m.position, 0)) hit = true;
    if (!hit){
      for (const e of enemies){
        if (e.dead || !e.active() || e.state === 'critted') continue;
        const dx = e.pos.x - b.m.position.x, dz = e.pos.z - b.m.position.z;
        if (Math.hypot(dx, dz) > e.T.radius + .3) continue;
        if (b.m.position.y < e.y || b.m.position.y > e.y + 2.1*e.T.scale) continue;
        const r = e.hurt(b.dmg, false, Math.atan2(-b.v.x, -b.v.z));
        e.chest(_v); burst(_v, r === 'blocked' ? 'spark' : 'blood', r === 'blocked' ? 6 : 8, 3, 9, .45);
        if (r !== 'blocked') sfx.hit();
        hitStop = Math.max(hitStop, .03); hit = true; break;
      }
    }
    if (hit){ splash(b.m.position); scene.remove(b.m); b.m.children[0].material.dispose(); bolts.splice(i, 1); }
  }
  for (let i = geysers.length - 1; i >= 0; i--){
    const g = geysers[i]; g.t += dt;
    if (!g.fired && g.t >= g.delay){
      g.fired = true; sfx.geyser(); shake = Math.max(shake, .2);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(g.r*.55, g.r*.8, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      col.position.set(g.x, 0, g.z); scene.add(col); g.col = col;
      for (let k = 0; k < 4; k++){ _v.set(g.x + (Math.random() - .5)*g.r, .2, g.z + (Math.random() - .5)*g.r); burst(_v, 'water', 10, 4, 7, 1.0, 1.4); }
      for (const e of enemies){
        if (e.dead || !e.active() || e.state === 'critted' || e.y > 2.5) continue;
        if (Math.hypot(e.pos.x - g.x, e.pos.z - g.z) > g.r + e.T.radius*.5) continue;
        e.hurt(g.dmg, true, Math.atan2(P.pos.x - e.pos.x, P.pos.z - e.pos.z));
        e.chest(_v); burst(_v, 'blood', 14, 4, 9, .55); sfx.hit(); hitStop = Math.max(hitStop, .07);
      }
    }
    if (g.col){
      const f = (g.t - g.delay)/.6;
      g.col.scale.y = 5*Math.sin(Math.min(1, f)*Math.PI*.5) + .01; g.col.position.y = g.col.scale.y/2; g.col.material.opacity = .55*(1 - f);
      g.col.rotation.y += dt*4;
      if (f >= 1){ scene.remove(g.col); g.col.geometry.dispose(); g.col.material.dispose(); geysers.splice(i, 1); }
    }
  }
}
// ---------- 敵の飛び道具（矢・呪いの玉） ----------
const eshots = [];
const arrowGeo = new THREE.BoxGeometry(.05, .05, .7), orbGeo = new THREE.IcosahedronGeometry(.22, 0);
sfx.arrow = () => { nz(.18, 2600, 3, .15, 'bandpass', 1200); tn(300, .08, 'square', .04, 200); };
sfx.curse = () => { tn(220, .5, 'sawtooth', .07, 110); nz(.4, 900, 2, .12, 'bandpass', 400); };
function fireShots(e, A){
  const n = (e.phase2 && A.count2) || A.count || 1;
  e.H.tip.getWorldPosition(_v); const from = _v.clone(); from.y = Math.max(1.0, from.y);
  const ty = 1.2;
  for (let i = 0; i < n; i++){
    const ang = e.face + (i - (n - 1)/2)*(A.spread || 0);
    const mat = new THREE.MeshBasicMaterial({ color: A.color || 0xffffff, fog: false });
    const m = new THREE.Mesh(A.arrow ? arrowGeo : orbGeo, mat); m.position.copy(from);
    if (!A.arrow){ const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moonGlow, color: A.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glow.scale.setScalar(1.1); m.add(glow); }
    scene.add(m);
    const flat = Math.max(1, Math.hypot(P.pos.x - from.x, P.pos.z - from.z));
    const v = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(A.speed);
    v.y = clamp((ty - from.y)/flat*A.speed, -A.speed*.5, A.speed*.5);
    eshots.push({ m, v, life: A.life || 2.2, dmg: A.dmg*(e.phase2 ? 1.1 : 1), homing: A.homing || 0, A, arrow: !!A.arrow, dodged: false });
  }
  A.arrow ? sfx.arrow() : sfx.curse();
}
function removeShot(i){ const s = eshots[i]; scene.remove(s.m); s.m.material.dispose(); if (s.m.children[0]) s.m.children[0].material.dispose(); eshots.splice(i, 1); }
function updateEnemyShots(dt){
  for (let i = eshots.length - 1; i >= 0; i--){
    const s = eshots[i]; s.life -= dt;
    if (s.homing && P.state !== 'dead' && !s.dodged){
      _v.set(P.pos.x, 1.2, P.pos.z).sub(s.m.position).normalize().multiplyScalar(s.v.length());
      s.v.lerp(_v, Math.min(1, dt*s.homing));
    }
    s.m.position.addScaledVector(s.v, dt);
    if (s.arrow){ _v.copy(s.m.position).add(s.v); s.m.lookAt(_v); } else { s.m.rotation.x += dt*5; s.m.rotation.y += dt*4; if (Math.random() < dt*30) burst(s.m.position, 'purple', 1, .3, -1, .4, .8); }
    if (s.life <= 0 || s.m.position.y < .05 || insideAny(s.m.position, 0)){ burst(s.m.position, s.arrow ? 'dust' : 'purple', 6, 2.5, 6, .35); removeShot(i); continue; }
    if (!s.dodged && P.state !== 'dead'){
      const d = Math.hypot(P.pos.x - s.m.position.x, P.pos.z - s.m.position.z), dy = s.m.position.y - 1.1;
      if (d < .5 && Math.abs(dy) < 1.0){
        const r = hurtPlayer(s.dmg, s.m.position, s.A);
        if (r === 'dodge'){ s.dodged = true; continue; }
        if (r !== 'none'){ removeShot(i); continue; }
      }
    }
  }
}

function clearMagic(){
  while (eshots.length) removeShot(eshots.length - 1);
  bolts.forEach(b => { scene.remove(b.m); b.m.children[0].material.dispose(); }); bolts.length = 0;
  geysers.forEach(g => { if (g.col){ scene.remove(g.col); g.col.geometry.dispose(); g.col.material.dispose(); } }); geysers.length = 0;
}
