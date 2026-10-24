'use strict';
// =========================================================
// enemies.js — 攻撃の定義・敵の種類・敵AI
//   新しい敵は TYPES に、新しい攻撃は ATK に足す。
// =========================================================
// wind=振りかぶり秒 act=判定が出ている秒 rec=硬直秒 range=届く距離 arc=当たる角度 dmg=ダメージ lunge=踏み込み速度
// unparry=パリィ不可 chip=ガード時に削れる割合 next=[次の技, 通常時の確率, 第2形態の確率] aoe=着地点の範囲攻撃
const ATK = {
  s_over:   { kind: 'over',   wind: .62, act: .18, rec: .6,  range: 2.2, arc: 70,  dmg: 58, lunge: 2.2 },
  s_side:   { kind: 'side',   wind: .5,  act: .2,  rec: .55, range: 2.3, arc: 120, dmg: 46, lunge: 1.2, next: ['s_over', .35, .35] },
  p_thrust: { kind: 'thrust', wind: .55, act: .16, rec: .5,  range: 3.1, arc: 35,  dmg: 52, lunge: 3.5, next: ['p_thrust2', .45, .45] },
  p_thrust2:{ kind: 'thrust', wind: .35, act: .16, rec: .65, range: 3.1, arc: 35,  dmg: 46, lunge: 3 },
  h_over:   { kind: 'slam',   wind: 1.05,act: .2,  rec: .95, range: 2.9, arc: 60,  dmg: 115, lunge: 1.5, unparry: true },
  h_side:   { kind: 'side',   wind: .85, act: .25, rec: .85, range: 3.1, arc: 160, dmg: 88, lunge: 1 },
  b_sweep:  { kind: 'side',   wind: .95, act: .28, rec: .85, range: 5.4, arc: 150, dmg: 72, lunge: 2.5, unparry: true, chip: .12, next: ['b_sweep2', .25, .75] },
  b_sweep2: { kind: 'side2',  wind: .55, act: .28, rec: .9,  range: 5.4, arc: 150, dmg: 72, lunge: 2.5, unparry: true, chip: .12, next: ['b_slam', 0, .5] },
  b_slam:   { kind: 'slam',   wind: 1.15,act: .15, rec: 1.1, range: 5,   arc: 45,  dmg: 98, lunge: 3,   unparry: true, chip: .15, aoe: { off: 3.6, r: 3.0 } },
  b_thrust: { kind: 'thrust', wind: .8,  act: .45, rec: .95, range: 3.6, arc: 40,  dmg: 70, lunge: 15,  start: 9, chip: .1 },
  b_jump:   { kind: 'jump',   wind: .55, act: .9,  rec: 1.2, range: 4.4, dmg: 92,  unparry: true, chip: .15, start: 14, aoe: { off: 0, r: 4.4 } },
  // 屍喰らい
  g_claw:   { kind: 'side',   wind: .34, act: .14, rec: .4,  range: 1.8, arc: 100, dmg: 32, lunge: 3.2, next: ['g_claw2', .55, .55] },
  g_claw2:  { kind: 'side2',  wind: .2,  act: .14, rec: .55, range: 1.8, arc: 100, dmg: 28, lunge: 3.2 },
  g_leap:   { kind: 'thrust', wind: .55, act: .32, rec: .75, range: 2.0, arc: 50,  dmg: 46, lunge: 10, start: 6 },
  // 飛び道具（fx:'shot'）。speed=弾の速さ homing=追尾の強さ count=同時に撃つ数 spread=広がり
  a_shot:   { kind: 'shoot',  fx: 'shot', wind: .95, act: .1, rec: .9, range: 18, start: 16, dmg: 38, speed: 24, arrow: true, color: 0xe8dcc0, unparry: true },
  // 骸の司教
  n_orb:    { kind: 'cast',   fx: 'shot', wind: .85, act: .1, rec: .7, range: 30, start: 30, dmg: 44, speed: 8.5, homing: 1.4, count: 3, count2: 5, spread: .35, life: 4, color: 0xc28cff, unparry: true, chip: .15 },
  n_wave:   { kind: 'slam',   wind: 1.0, act: .15, rec: 1.0, range: 4.6, arc: 360, dmg: 72, lunge: 0, unparry: true, chip: .15, aoe: { off: 0, r: 5.2 } },
  n_scythe: { kind: 'side',   wind: .7,  act: .25, rec: .75, range: 3.8, arc: 170, dmg: 58, lunge: 3, chip: .1, next: ['n_scythe2', .4, .7] },
  n_scythe2:{ kind: 'side2',  wind: .4,  act: .25, rec: .9,  range: 3.8, arc: 170, dmg: 58, lunge: 3, chip: .1 },
  n_blink:  { kind: 'cast',   fx: 'blink',  wind: .55, act: .1, rec: .35, range: 99, start: 99 },
  n_summon: { kind: 'cast',   fx: 'summon', wind: 1.2, act: .1, rec: .8,  range: 99, start: 99 }
};
const TYPES = {
  soldier: { name: '亡者兵', hp: 130, speed: 2.7, turn: 4.5, aggro: 12, radius: .45, scale: 1, atks: ['s_over', 's_side'], souls: 80, shield: true, guard: .35, weapon: 'sword', body: 0x4b4136, trim: 0x2c2620, eye: 0xff9a3a },
  spear:   { name: '亡者槍兵', hp: 115, speed: 2.5, turn: 4, aggro: 12, radius: .45, scale: 1, atks: ['p_thrust'], souls: 100, shield: true, guard: .5, weapon: 'spear', body: 0x3c4049, trim: 0x262830, eye: 0xff9a3a, shieldColor: 0x40444e },
  heavy:   { name: '大斧の亡者', hp: 340, speed: 2.0, turn: 2.8, aggro: 11, radius: .65, scale: 1.35, atks: ['h_over', 'h_side'], souls: 260, poise: 4, weapon: 'axe', body: 0x3a2e2a, trim: 0x1e1816, eye: 0xff5a3a },
  ghoul:   { name: '屍喰らい', hp: 85, speed: 3.6, turn: 6, aggro: 9, radius: .42, scale: .95, atks: ['g_claw', 'g_claw', 'g_leap'], souls: 70, weapon: 'none', body: 0x8a8f86, trim: 0x4c4f48, eye: 0x9cff7a, hunch: .55 },
  archer:  { name: '骸の弩兵', hp: 90, speed: 1.9, turn: 3.5, aggro: 18, radius: .45, scale: 1, atks: ['a_shot'], close: 's_side', keepAway: 5, souls: 110, weapon: 'bow', body: 0xb8b2a0, trim: 0x5a5040, eye: 0xff9a3a },
  necro: {
    name: '骸の司教', hp: 900, speed: 2.4, turn: 3, aggro: 99, radius: 1.0, scale: 2.0, souls: 7000, boss: true, weapon: 'scythe', body: 0x2a2433, trim: 0x51406e, eye: 0xb98cff, hood: true, cape: 0x1a1422, glow: .45, light: 0xa070ff,
    phase2Eye: 0xff4fd8, phase2Color: 0xd27bff,
    choose(dist, p2, e){
      const r = Math.random();
      if (p2 && !e.didSummon){ e.didSummon = true; return 'n_summon'; }
      if (dist < 4.2) return r < .45 ? 'n_wave' : (r < .8 ? 'n_scythe' : 'n_blink');
      if (dist < 9) return r < .5 ? 'n_orb' : (r < .75 ? 'n_blink' : 'n_scythe');
      return r < .75 ? 'n_orb' : 'n_blink';
    }
  },
  moonWarden: {
    name: '月喰いの番人', hp: 1050, speed: 3.0, turn: 2.4, aggro: 99, radius: 1.2, scale: 2.4, souls: 6000, boss: true, weapon: 'great', body: 0x2b2a3a, trim: 0x6a5c96, eye: 0xdfe6ff, horns: true, cape: 0x1a1626,
    phase2Eye: 0xff3046, phase2Color: 0xb48cff,
    choose(dist, p2){
      const r = Math.random();
      if (dist > 9) return (p2 && r < .55) ? 'b_jump' : 'b_thrust';
      if (dist > 5.5) return r < .35 ? 'b_thrust' : (p2 && r < .65 ? 'b_jump' : 'b_sweep');
      return r < .55 ? 'b_sweep' : 'b_slam';
    }
  }
};

class Enemy {
  constructor(key, x, z, face){
    this.key = key; this.T = TYPES[key]; this.home = { x, z, face };
    const T = this.T;
    this.H = humanoid({ body: T.body, trim: T.trim, eye: T.eye, weapon: T.weapon, shield: T.shield, shieldColor: T.shieldColor, scale: T.scale, horns: T.horns, cape: T.cape, hood: T.hood });
    // 暗い場所でも見えるように（glow=自ら光る強さ、light=まとう光の色）
    if (T.glow) this.H.root.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.copy(o.material.color).multiplyScalar(T.glow); });
    if (T.light){ const l = new THREE.PointLight(T.light, 1.8, 16, 1.2); l.position.y = 3.2/T.scale; this.H.root.add(l); }
    add(this.H.root); this.pos = new THREE.Vector3(); this.reset();
  }
  reset(){
    const T = this.T; this.hp = T.hp; this.lag = T.hp; this.pos.set(this.home.x, 0, this.home.z); this.face = this.home.face;
    this.state = 'idle'; this.t = 0; this.cd = .6 + Math.random(); this.atk = null; this.A = null; this.hitDone = false; this.aggro = false;
    this.poise = T.poise || 0; this.strafe = Math.random() < .5 ? 1 : -1; this.strafeT = 1; this.walk = 0; this.hpShow = 0; this.phase2 = false; this.pendingP2 = false;
    this.didSummon = false; this.dead = false; this.deadT = 0; this.y = 0; this.stunChain = 0; this.rethink = 0; this.guardUp = false;
    this.H.root.visible = true; this.H.rig.rotation.set(0, 0, 0); this.H.rig.position.y = .75; this.H.root.position.set(this.pos.x, 0, this.pos.z); this.H.root.rotation.y = this.face;
    if (T.boss) this.H.eyeMat.color.setHex(T.eye);
  }
  active(){ return !this.T.boss || bossFight; }
  chooseAtk(dist){
    const T = this.T;
    if (T.choose) return T.choose(dist, this.phase2, this);
    if (T.close && dist < 2.8) return T.close;
    return T.atks[Math.floor(Math.random()*T.atks.length)];
  }
  begin(key){ this.atk = key; this.A = ATK[key]; this.state = 'wind'; this.t = 0; this.hitDone = false; this.glinted = false; }
  fwd(){ return { x: Math.sin(this.face), z: Math.cos(this.face) }; }
  chest(v){ return v.set(this.pos.x, this.y + 1.3*this.T.scale, this.pos.z); }
  doAoe(){
    const A = this.A, f = this.fwd();
    const cx = this.pos.x + f.x*A.aoe.off, cz = this.pos.z + f.z*A.aoe.off;
    ring(cx, cz, A.aoe.r, this.phase2 ? (this.T.phase2Color || 0xb48cff) : 0xd8deff); shake = Math.max(shake, .45); sfx.slam();
    burst(new THREE.Vector3(cx, .2, cz), 'dust', 22, 6, 12, .8, 1.6);
    if (P.state !== 'dead' && Math.hypot(P.pos.x - cx, P.pos.z - cz) < A.aoe.r + .35) this.onResult(hurtPlayer(A.dmg*(this.phase2 ? 1.1 : 1), new THREE.Vector3(cx, 0, cz), A));
  }
  onResult(r){
    if (r === 'parry'){ this.state = 'parried'; this.t = 0; this.A = null; this.chest(_v); burst(_v, 'blue', 18, 5, 4, .5, 1.2); }
  }
  hurt(dmg, heavy, fromAng){
    if (this.dead) return 'none';
    const T = this.T; this.aggro = true; this.hpShow = 3;
    if (this.state === 'idle' || this.state === 'home'){ this.state = 'chase'; alertNearby(this); }
    const frontal = Math.abs(angDiff(this.face, fromAng)) < 1.1;
    if (this.guardUp && frontal && Math.random() < T.guard){
      if (heavy){ this.hp -= dmg*.4; this.state = 'parried'; this.t = 0; this.A = null; sfx.guardBreak(); if (this.hp <= 0) this.hp = 1; return 'break'; }
      this.hp -= dmg*.1; this.state = 'blockHit'; this.t = 0; sfx.block(); return 'blocked';
    }
    this.hp -= dmg;
    if (this.hp <= 0){ this.die(); return 'kill'; }
    if (T.boss){ if (!this.phase2 && this.hp < T.hp*.5) this.pendingP2 = true; return 'hit'; }
    if (T.poise){ this.poise -= heavy ? 2 : 1; if (this.poise <= 0){ this.poise = T.poise; this.stagger(.8); } return 'hit'; }
    if (this.state === 'stagger' && this.stunChain >= 2) return 'hit';
    this.stunChain++; this.stagger(heavy ? .75 : .5); return 'hit';
  }
  stagger(d){ if (this.state === 'critted') return; this.state = 'stagger'; this.t = 0; this.stagDur = d; this.A = null; }
  die(){
    if (this.dead) return;
    this.dead = true; this.state = 'dead'; this.deadT = 0; this.deadSign = this.H.rig.rotation.x > 0.3 ? 1 : -1;
    addSouls(this.summoned ? 0 : this.T.souls); sfx.kill(); this.chest(_v); burst(_v, 'soul', this.T.boss ? 60 : 16, 3, -1, 1.2, 1.2);
    if (P.lock === this) P.lock = null;
    if (this.T.boss) bossKilled();
  }
  update(dt){
    const T = this.T, H = this.H; this.t += dt; if (this.hpShow > 0) this.hpShow -= dt;
    this.lag += (this.hp - this.lag)*Math.min(1, dt*2.5);
    if (this.dead){
      this.deadT += dt; applyPose(H, { rig: [1.45*this.deadSign, 0, 0], rigY: .25 }, 1 - Math.exp(-dt*6));
      if (this.deadT > 1.4) H.root.position.y = -(this.deadT - 1.4)*.8;
      if (this.deadT > 3) H.root.visible = false; return;
    }
    if (!this.active()){ this.pose(dt, 0); H.root.position.set(this.pos.x, 0, this.pos.z); H.root.rotation.y = this.face; return; }
    const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
    const pd = P.state === 'dead';
    const sp = T.speed*(this.phase2 ? 1.3 : 1);
    let mspd = 0, mdir = this.face;
    if (this.state !== 'stagger') this.stunChain = 0;
    switch (this.state){
      case 'idle': {
        if (pd) break;
        const front = Math.abs(angDiff(this.face, ang)) < 1.25;
        const noisy = P.sprinting || P.state === 'roll';
        if (this.aggro || (dist < T.aggro && front) || (dist < 3.4 && noisy) || dist < 1.1){ this.state = 'chase'; this.aggro = true; alertNearby(this); }
        break;
      }
      case 'chase': {
        if (pd){ this.state = 'home'; break; }
        if (this.pendingP2){ this.pendingP2 = false; this.phase2 = true; this.state = 'roar'; this.t = 0; sfx.roar(); shake = .5; H.eyeMat.color.setHex(T.phase2Eye || 0xff3046); break; }
        const hd = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
        if (!T.boss && hd > 28 && dist > 12){ this.state = 'home'; break; }
        this.face = turnTo(this.face, ang, T.turn*(this.phase2 ? 1.3 : 1)*dt);
        this.rethink -= dt;
        if (!this.atk || this.rethink <= 0){ this.atk = this.chooseAtk(dist); this.rethink = 1.6; }
        const A = ATK[this.atk]; const want = A.start || A.range*.85;
        this.cd -= dt;
        const facingOk = Math.abs(angDiff(this.face, ang)) < .45;
        if (this.cd <= 0 && dist < want && facingOk){ this.begin(this.atk); break; }
        if (dist > want*.95 || this.cd <= 0){ mspd = sp; mdir = this.face; }
        else {
          this.strafeT -= dt; if (this.strafeT <= 0){ this.strafe *= -1; this.strafeT = 1.2 + Math.random()*1.8; }
          mspd = sp*.42; mdir = this.face + this.strafe*Math.PI/2;
          if (dist < 1.4 + T.radius){ mdir = this.face + Math.PI; mspd = sp*.5; }
          if (T.keepAway && dist < T.keepAway){ mdir = this.face + Math.PI; mspd = sp*.8; } // 距離を取る
        }
        break;
      }
      case 'wind': {
        const A = this.A;
        this.face = turnTo(this.face, ang, T.turn*(A.kind === 'jump' ? 2 : .9)*(this.phase2 ? 1.3 : 1)*dt);
        if (!this.glinted && this.t > A.wind - .2){ this.glinted = true; glint(H.tip); sfx.glint(); }
        if (this.t >= A.wind){
          this.state = 'act'; this.t = 0;
          if (A.kind === 'jump'){ this.jFrom = this.pos.clone(); this.jTo = new THREE.Vector3(P.pos.x, 0, P.pos.z); sfx.swing(true); }
          else if (A.fx === 'shot') fireShots(this, A);
          else if (A.fx === 'blink') this.blink();
          else if (A.fx === 'summon') this.summon();
          else { sfx.swing(A.dmg > 70); if (A.aoe) this.doAoe(); }
        }
        break;
      }
      case 'act': {
        const A = this.A;
        if (A.kind === 'jump'){
          const f = Math.min(1, this.t/A.act);
          this.pos.x = lerp(this.jFrom.x, this.jTo.x, f); this.pos.z = lerp(this.jFrom.z, this.jTo.z, f); this.y = Math.sin(f*Math.PI)*6;
          if (f >= 1){ this.y = 0; resolve(this.pos, T.radius); this.doAoe(); if (this.state === 'act'){ this.state = 'rec'; this.t = 0; } }
          break;
        }
        mspd = A.lunge || 0; mdir = this.face;
        if (!A.aoe && !A.fx && !this.hitDone && !pd){
          if (dist < A.range + .42 + (T.boss ? .3 : 0) && Math.abs(angDiff(this.face, ang)) < A.arc*DEG/2){
            this.hitDone = true; this.onResult(hurtPlayer(A.dmg*(this.phase2 ? 1.1 : 1), this.pos, A));
          }
        }
        if (this.state === 'act' && this.t >= A.act){ this.state = 'rec'; this.t = 0; }
        break;
      }
      case 'rec': {
        if (this.t >= this.A.rec){
          const nx = this.A.next; const pr = nx ? (this.phase2 ? nx[2] : nx[1]) : 0;
          if (nx && !pd && Math.random() < pr) this.begin(nx[0]);
          else { this.state = 'chase'; this.atk = null; this.cd = (T.boss ? (this.phase2 ? .2 : .55) : .8) + Math.random()*(T.boss ? .6 : 1.2); }
        }
        break;
      }
      case 'stagger': if (this.t >= this.stagDur){ this.state = 'chase'; this.atk = null; this.cd = .3 + Math.random()*.6; } break;
      case 'parried': if (this.t >= (T.boss ? 1.5 : 2.0)){ this.state = 'chase'; this.atk = null; this.cd = .5; } break;
      case 'blockHit': if (this.t >= .4){ this.state = 'chase'; } break;
      case 'critted': if (this.t >= this.critDur){ if (this.hp <= 0) this.die(); else { this.state = 'getup'; this.t = 0; } } break;
      case 'getup': if (this.t >= 1.0){ this.state = 'chase'; this.atk = null; this.cd = .4; } break;
      case 'roar': if (this.t >= 1.6){ this.state = 'chase'; this.atk = null; this.cd = .2; } break;
      case 'home': {
        const hx = this.home.x - this.pos.x, hz = this.home.z - this.pos.z, hd = Math.hypot(hx, hz);
        if (!pd && dist < T.aggro*.6){ this.state = 'chase'; break; }
        if (hd < .5){ this.state = 'idle'; this.aggro = false; this.hp = T.hp; this.face = this.home.face; }
        else { this.face = turnTo(this.face, Math.atan2(hx, hz), T.turn*dt); mspd = T.speed*.8; mdir = this.face; }
        break;
      }
    }
    if (this.dead) return;
    this.guardUp = !!T.shield && (this.state === 'chase' || this.state === 'blockHit') && dist < 4.5;
    if (mspd > 0){ this.pos.x += Math.sin(mdir)*mspd*dt; this.pos.z += Math.cos(mdir)*mspd*dt; this.walk += mspd*dt*2.2/T.scale; }
    if (!(this.state === 'act' && this.A && this.A.kind === 'jump')) resolve(this.pos, T.radius);
    if (this.phase2 && Math.random() < dt*20){ _v.set(this.pos.x + (Math.random() - .5)*1.5, this.y + Math.random()*4, this.pos.z + (Math.random() - .5)*1.5); burst(_v, 'purple', 1, .6, -1.5, 1.0, 1.4); }
    this.pose(dt, mspd);
    H.root.position.set(this.pos.x, this.y, this.pos.z); H.root.rotation.y = this.face;
  }
  pose(dt, mspd){
    const H = this.H, T = this.T, st = this.state, k = 1 - Math.exp(-dt*14);
    const A = this.A;
    if (A && (st === 'wind' || st === 'act' || st === 'rec')){
      if (A.kind === 'jump'){
        if (st === 'wind') applyPose(H, { rigY: .42, tor: [.45, 0, 0], aR: [.6, 0, .3], aL: [.6, 0, -.3], legR: [-1.1, 0, 0], legL: [-1.1, 0, 0] }, Math.min(1, k*1.5));
        else if (st === 'act') applyPose(H, { rigY: .75, tor: [-.3, 0, 0], aR: [-3, 0, 0], aL: [-3, 0, 0], legR: [.3, 0, 0], legL: [-.4, 0, 0] }, k);
        else applyPose(H, { rigY: .55, tor: [.5, 0, 0], aR: [-.4, 0, 0], aL: [-.4, 0, 0], legR: [-.7, 0, 0], legL: [-.7, 0, 0] }, this.t < .1 ? 1 : k*.4);
        return;
      }
      const stg = st === 'wind' ? 0 : st === 'act' ? 1 : 2; const dur = stg === 0 ? A.wind : stg === 1 ? A.act : A.rec;
      attackPose(H, A.kind, stg, Math.min(1, this.t/dur));
      applyPose(H, { legR: [.35, 0, 0], legL: [-.3, 0, 0], rig: [0, 0, 0], rigY: .75, sh: 0 }, k); return;
    }
    switch (st){
      case 'stagger': applyPose(H, { tor: [-.4, 0, 0], aR: [-.9, 0, .5], aL: [-.6, 0, -.4], rig: [-.12, 0, 0], rigY: .75, sh: 0 }, k); return;
      case 'blockHit': applyPose(H, { tor: [-.25, 0, 0], aL: [-1.25, 0, 0], sh: 1.25, rig: [0, 0, 0] }, k); return;
      case 'parried': applyPose(H, { tor: [-.35, 0, 0], aR: [-2.5, 0, .8], aL: [-2.2, 0, -.8], rig: [-.2, 0, 0], rigY: .75, sh: 0, legR: [.4, 0, 0], legL: [-.2, 0, 0] }, k); return;
      case 'critted': {
        const s = this.critType === 'back' ? 1 : -1, f = this.t;
        const rx = f < .6 ? s*.35 : f < 1.3 ? s*(.35 + (f - .6)/.7*1.1) : s*1.45;
        applyPose(H, { rig: [rx, 0, 0], rigY: f < .6 ? .75 : lerp(.75, .25, Math.min(1, (f - .6)/.7)), tor: [s*.3, 0, 0], aR: [-.5, 0, .6], aL: [-.5, 0, -.6] }, .5); return;
      }
      case 'getup': applyPose(H, { rig: [0, 0, 0], rigY: .75, tor: [0, 0, 0] }, Math.min(1, dt*4)); return;
      case 'roar': applyPose(H, { tor: [-.45, 0, 0], aR: [-1.1, 0, .9], aL: [-1.1, 0, -.9], rig: [0, 0, 0], rigY: .75 }, k); return;
    }
    if (T.boss && !bossFight){ applyPose(H, { rigY: .5, legR: [-1.4, 0, 0], legL: [.25, 0, 0], tor: [.5, 0, 0], aR: [-.9, 0, 0], aL: [-.6, 0, 0], rig: [0, 0, 0] }, k); return; }
    locoPose(H, this.walk, Math.min(1, mspd/T.speed), this.guardUp, dt, false);
    applyPose(H, { rig: [0, 0, 0], rigY: .75 }, k);
    if (T.hunch) H.torso.rotation.x = Math.max(H.torso.rotation.x, T.hunch);
  }
  // 瞬間移動：プレイヤーから少し離れた場所へ（ボス部屋の中）
  blink(){
    this.chest(_v); burst(_v, 'purple', 24, 4, -2, .8, 1.4); sfx.gate();
    const ar = stage.boss && stage.boss.arena;
    for (let i = 0; i < 8; i++){
      const a = Math.random()*Math.PI*2, d = 7 + Math.random()*3;
      let x = P.pos.x + Math.sin(a)*d, z = P.pos.z + Math.cos(a)*d;
      if (ar){ x = clamp(x, ar.x1, ar.x2); z = clamp(z, ar.z1, ar.z2); }
      if (Math.hypot(x - P.pos.x, z - P.pos.z) > 5){ this.pos.set(x, 0, z); break; }
    }
    this.face = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
    this.chest(_v); burst(_v, 'purple', 24, 4, -2, .8, 1.4);
  }
  // 手下を呼ぶ
  summon(){
    sfx.roar(); shake = Math.max(shake, .3);
    const f = this.fwd();
    [-1, 1].forEach(s => {
      const x = this.pos.x + f.z*s*3, z = this.pos.z - f.x*s*3;
      const g = new Enemy('ghoul', x, z, this.face); g.summoned = true; g.aggro = true; g.state = 'chase';
      enemies.push(g); _v.set(x, 1, z); burst(_v, 'purple', 20, 3, -1, .8, 1.2);
    });
  }
}
function alertNearby(src){ for (const e of enemies){ if (e !== src && !e.dead && !e.T.boss && e.state === 'idle' && Math.hypot(e.pos.x - src.pos.x, e.pos.z - src.pos.z) < 6){ e.state = 'chase'; e.aggro = true; } } }
