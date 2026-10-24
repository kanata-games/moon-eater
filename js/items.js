'use strict';
// =========================================================
// items.js — 武器と盾（性能・見た目）
//   武器：spd=動きの遅さ（1が普通、大きいほど遅い） mult=弱攻撃の威力 heavy=強攻撃の威力
//        reach=間合い arc=当たる角度 cost=スタミナ消費の倍率 kinds=弱攻撃の振り方（1段目,2段目）
//        heavyKind=強攻撃の振り方 crit=致命の一撃の倍率 guardBreak=弱攻撃でも盾を崩せる
//        catalyst=魔法の触媒（海音が魔法を使える） spell=魔力の倍率
//   盾：drain=ガード時のスタミナ減りの倍率 chipMul=ガードしても受けるダメージの倍率
//        parry=パリィ受付の時間 guardSpd=構えたまま歩く速さの倍率
// =========================================================
const ITEMS = {
  // ---- 武器 ----
  moonblade: { slot: 'r', hold: 'down', name: '月刃', kind: '直剣', desc: '三日月の鍔をもつ細身の長剣。扱いやすく、どんな相手にも向く。',
    spd: 1, mult: 1, heavy: 1.9, reach: 2.25, arc: 80, cost: 1, kinds: ['over', 'side'], heavyKind: 'heavy', crit: 1 },
  greatsword: { slot: 'r', hold: 'shoulder', name: '灰の大剣', kind: '大剣', desc: '月を喰らう番人が振るっていた灰色の大剣。重く遅いが、横薙ぎで周りをまとめて斬る。',
    spd: 1.35, mult: 1.7, heavy: 3.0, reach: 2.8, arc: 120, cost: 1.5, kinds: ['side', 'side2'], heavyKind: 'heavy', crit: 1, guardBreak: true },
  spear: { slot: 'r', hold: 'staff', name: '巡礼の槍', kind: '槍', desc: '城を目指した巡礼者の槍。突きは狭いが遠くまで届く。',
    spd: .95, mult: .95, heavy: 1.7, reach: 3.2, arc: 32, cost: .9, kinds: ['thrust', 'thrust'], heavyKind: 'thrust', crit: 1, lunge: 2.4 },
  dagger: { slot: 'r', hold: 'down', name: '猫爪の短剣', kind: '短剣', desc: '供物として納められた小さな刃。とても速く、背後からの一撃は深く刺さる。',
    spd: .72, mult: .62, heavy: 1.3, reach: 1.7, arc: 90, cost: .7, kinds: ['side', 'side2'], heavyKind: 'thrust', crit: 1.6 },
  hammer: { slot: 'r', hold: 'shoulder', name: '墓守の鎚', kind: '鎚', desc: '墓を固めるための石の鎚。遅いが、弱攻撃でも盾ごと叩き崩す。',
    spd: 1.25, mult: 1.45, heavy: 2.6, reach: 2.3, arc: 70, cost: 1.3, kinds: ['over', 'over'], heavyKind: 'slam', crit: 1, guardBreak: true },
  staff: { slot: 'r', hold: 'staff', name: '水晶の杖', kind: '杖', desc: '水の結晶を戴く旅の杖。海音が持てば水の魔法を放てる。殴るには頼りない。',
    spd: .9, mult: .55, heavy: 1.1, reach: 2.0, arc: 70, cost: .8, kinds: ['thrust', 'side'], heavyKind: 'over', crit: 1, catalyst: true, spell: 1 },
  bishopStaff: { slot: 'r', hold: 'staff', name: '司教の杖', kind: '杖', desc: '骸の司教が遺した紫の杖。魔法がより強く響く。',
    spd: .95, mult: .6, heavy: 1.2, reach: 2.1, arc: 70, cost: .8, kinds: ['thrust', 'side'], heavyKind: 'over', crit: 1, catalyst: true, spell: 1.3 },
  // ---- アスターテ専用（only:'astarte'）----
  scythe: { slot: 'r', hold: 'scythe', only: 'astarte', name: '星詠みの大鎌', kind: '大鎌', desc: '星と月の紋を刻んだアスターテの大鎌。長い間合いで大きく薙ぎ払い、強攻撃はその場で一回転して周りを刈る。',
    spd: 1.12, mult: 1.35, heavy: 2.3, reach: 3.3, arc: 160, heavyArc: 360, cost: 1.15, kinds: ['side', 'side2'], heavyKind: 'side', crit: 1.1 },
  moonStaff: { slot: 'r', hold: 'staff', only: 'astarte', name: '三日月の錫杖', kind: '錫杖', desc: '三日月と鈴を戴くアスターテの錫杖。弱攻撃で月光弾を放ち、強攻撃で周りに月の輪を広げる。',
    spd: .95, mult: .6, heavy: 1.2, reach: 2.2, arc: 70, cost: .8, kinds: ['thrust', 'side'], heavyKind: 'over', crit: 1, catalyst: true, spell: 1, spellFx: 'moon' },
  crossbow: { slot: 'r', hold: 'bow', only: 'astarte', name: '機巧の弩', kind: '弩', desc: '歯車仕掛けの弩。弱攻撃で素早く撃ち、強攻撃で引き絞った矢が敵を貫く。近づかれると弱い。',
    spd: 1, mult: .5, heavy: 1, reach: 1.8, arc: 70, cost: 1, kinds: ['over', 'side'], heavyKind: 'over', crit: 1, mode: 'bow' },
  shamisen: { slot: 'r', hold: 'music', only: 'astarte', name: '月猫の三味線', kind: '楽器', desc: '月と猫をあしらった三味線。弱攻撃は前方へ音の衝撃を放って崩し、強攻撃の調べで傷を癒やし、しばらく力を高める。',
    spd: 1, mult: .5, heavy: 1, reach: 1.8, arc: 70, cost: 1, kinds: ['over', 'side'], heavyKind: 'over', crit: 1, mode: 'music' },
  rapier: { slot: 'r', hold: 'down', only: 'astarte', name: '星の刺剣', kind: '刺剣', desc: '星をかたどった鍔の細い剣。速い突きで刺し、盾がなくてもパリィを合わせやすい。致命の一撃が深い。',
    spd: .8, mult: .78, heavy: 1.5, reach: 2.6, arc: 30, cost: .75, kinds: ['thrust', 'thrust'], heavyKind: 'thrust', crit: 1.8, lunge: 2.6, parry: [.04, .32] },
  // ---- 盾 ----
  none: { slot: 'l', name: 'なし', kind: '素手', desc: '盾を持たない。ガードは武器で受け、パリィも武器で弾く。' },
  buckler: { slot: 'l', name: '木の小盾', kind: '小盾', desc: '軽い木の盾。守りは薄いが、パリィを合わせやすい。', drain: 1.0, chipMul: 1, parry: [.04, .3] },
  knight: { slot: 'l', name: '騎士の盾', kind: '中盾', desc: '城の騎士たちの盾。しっかり受け止め、削られにくい。', drain: .72, chipMul: .5, parry: [.05, .22] },
  tomb: { slot: 'l', name: '墓石の大盾', kind: '大盾', desc: '墓石を削り出した大盾。ほとんどの攻撃を止めるが、構えると歩みが遅く、パリィは難しい。', drain: .45, chipMul: 0, parry: [.07, .16], guardSpd: .6 }
};
// 構えていないときの持ち方。w=武器の向き（腕に対する回転）aR=右腕の角度
//   down=下げて持つ（剣など） staff=杖を立てる scythe=大鎌を斜めに掲げる shoulder=肩に担ぐ bow=前に向ける music=抱える
const HOLDS = {
  down:     { w: [0, 0, 0] },
  staff:    { w: [Math.PI, 0, 0], aR: [-.32, 0, -.1] },
  scythe:   { w: [Math.PI - .35, 0, .12], aR: [-.42, 0, -.18] },
  shoulder: { w: [-2.3, 1, -.8], aR: [-.9, 0, -.25] },
  bow:      { w: [-1.1, 0, 0], aR: [-.45, 0, -.05] },
  music:    { w: [2.7, .3, -1.4], aR: [-1.25, 0, .8] }
};
// 持ち方を反映（on=構えていない時。攻撃中などは0へ戻す）
function holdPose(H, holdId, on, k, swing = 0){
  const h = HOLDS[holdId] || HOLDS.down, t = on ? h.w : [0, 0, 0], r = H.wpn.rotation;
  r.x += (t[0] - r.x)*k; r.y += (t[1] - r.y)*k; r.z += (t[2] - r.z)*k;
  if (on && h.aR) applyPose(H, { aR: [h.aR[0] + swing*.12, h.aR[1], h.aR[2]] }, k);
}
// 盾なしのときの値
const BARE = { drain: 1.15, parry: [.05, .24] };

// ---------- 見た目 ----------
const WVIS = {
  moonblade(g, box, M){
    box(g, .05, .22, .05, M(0x2a2240), 0, 0, 0);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(.1, .02, 4, 8, Math.PI), M(0xc9a24c)); guard.position.y = -.12; guard.rotation.set(0, Math.PI/2, Math.PI); g.add(guard);
    box(g, .04, 1.05, .1, M(0xc9d2e8), 0, -.66, 0); box(g, .045, .1, .06, M(0xe4ebff), 0, -1.22, 0);
    return -1.25;
  },
  greatsword(g, box, M){
    box(g, .07, .32, .07, M(0x3a3028), 0, .02, 0); box(g, .1, .07, .55, M(0x6a6058), 0, -.16, 0);
    box(g, .07, 1.7, .24, M(0x8e94ab), 0, -1.05, 0); box(g, .06, .2, .14, M(0xa8aec4), 0, -1.98, 0);
    return -2.0;
  },
  spear(g, box, M){
    box(g, .05, 2.3, .05, M(0x5a4230), 0, -.5, 0);
    box(g, .04, .36, .1, M(0xc9d2e8), 0, -1.82, 0); box(g, .06, .05, .22, M(0xc9a24c), 0, -1.62, 0);
    return -2.0;
  },
  dagger(g, box, M){
    box(g, .05, .16, .05, M(0x2a2240), 0, 0, 0); box(g, .05, .04, .18, M(0xc9a24c), 0, -.09, 0);
    box(g, .035, .42, .08, M(0xd8deef), 0, -.32, 0);
    return -.55;
  },
  hammer(g, box, M){
    box(g, .06, 1.25, .06, M(0x4a3626), 0, -.45, 0);
    box(g, .3, .28, .5, M(0x7a7a84), 0, -1.12, 0); box(g, .32, .06, .52, M(0x5a5a64), 0, -1.12, 0);
    return -1.2;
  },
  staff(g, box, M){
    box(g, .045, .25, .045, M(0x5a4230), 0, .1, 0); box(g, .045, 1.25, .045, M(0x5a4230), 0, -.6, 0);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.09, .015, 4, 10), M(0xb7a46a)); r.position.y = -1.3; g.add(r);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(.08), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, fog: false })); c.position.y = -1.32; c.scale.y = 1.5; g.add(c);
    g.userData.spin = c; return -1.4;
  },
  bishopStaff(g, box, M){
    box(g, .05, 1.6, .05, M(0x2a2236), 0, -.55, 0);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.13, .02, 4, 10), M(0x8a6cc0)); r.position.y = -1.42; g.add(r);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(.1), new THREE.MeshBasicMaterial({ color: 0xc28cff, fog: false })); c.position.y = -1.44; c.scale.y = 1.6; g.add(c);
    g.userData.spin = c; return -1.55;
  }
};
// アスターテ専用武器の見た目
Object.assign(WVIS, {
  scythe(g, box, M){
    box(g, .055, 2.5, .055, M(0x1c1a26), 0, -.75, 0);                                   // 柄
    box(g, .08, .09, .08, M(0xc9a24c), 0, .5, 0); box(g, .08, .12, .08, M(0xc9a24c), 0, -1.9, 0);
    // 三日月形の大きな刃（柄の先から前へ張り出し、手元側へ反る）
    const sh = new THREE.Shape();
    sh.absarc(0, 1.15, 1.15, -Math.PI/2, Math.PI*.2, false);
    sh.absarc(.24, 1.28, .98, Math.PI*.2, -Math.PI/2 + .12, true);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: false, curveSegments: 10 });
    const blade = new THREE.Mesh(geo, M(0xe4e8f2)); blade.rotation.y = -Math.PI/2; blade.position.set(-.018, -2.25, 0); g.add(blade);
    const back = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const b = new THREE.Shape(); b.absarc(.24, 1.28, .98, -Math.PI/2 + .12, Math.PI*.2, false); b.absarc(.3, 1.34, .9, Math.PI*.2, -Math.PI/2 + .2, true); return b; })(), { depth: .05, bevelEnabled: false, curveSegments: 10 }), M(0x1f2654));
    back.rotation.y = -Math.PI/2; back.position.set(-.025, -2.25, 0); g.add(back);
    // 月と星の飾り
    const moon = new THREE.Mesh(new THREE.TorusGeometry(.13, .028, 4, 10, Math.PI*1.5), M(0xc9a24c)); moon.position.set(0, -2.12, .18); moon.rotation.y = Math.PI/2; g.add(moon);
    const moon2 = new THREE.Mesh(new THREE.TorusGeometry(.09, .022, 4, 10, Math.PI*1.5), M(0xc9a24c)); moon2.position.set(0, -1.75, .55); moon2.rotation.y = Math.PI/2; g.add(moon2);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(.08), new THREE.MeshBasicMaterial({ color: 0x6f8cff, fog: false })); star.position.set(0, -1.95, -.16); star.scale.y = 1.6; g.add(star);
    box(g, .05, .26, .05, M(0x24285a), 0, -1.72, -.1); box(g, .05, .2, .05, M(0x24285a), 0, -1.6, .08);   // 房
    box(g, .03, .25, .03, M(0xc9a24c), 0, .7, 0);                                       // 石突
    g.userData.spin = star; return -2.3;
  },
  moonStaff(g, box, M){
    box(g, .045, 2.0, .045, M(0x18181f), 0, -.6, 0); box(g, .07, .2, .07, M(0xc9a24c), 0, -1.6, 0);
    const moon = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 4, 14, Math.PI*1.55), M(0xd8b468)); moon.position.y = -1.92; moon.rotation.set(0, Math.PI/2, Math.PI*.72); g.add(moon);
    box(g, .03, .26, .03, M(0xd8b468), 0, -1.86, 0);
    [-.13, -.05, .05, .13].forEach((z, i) => box(g, .035, .2 + (i % 2)*.06, .035, M(0xc9a24c), 0, -1.6 + .13 + (i % 2)*.03, z)); // 鈴の管
    return -2.1;
  },
  crossbow(g, box, M){
    box(g, .08, .75, .1, M(0x4a2a24), 0, -.3, 0);                                       // 台
    box(g, .9, .05, .06, M(0x3a3a40), 0, -.62, 0);                                       // 弓
    [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.TorusGeometry(.08, .02, 4, 8), M(0xb08a4a)); w.position.set(s*.38, -.62, 0); w.rotation.y = Math.PI/2; g.add(w); });
    const gear = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 4, 8), M(0xb08a4a)); gear.position.set(0, -.15, .06); g.add(gear);
    box(g, .02, .02, .5, M(0xd8d0b8), 0, -.66, .12);                                    // 弦
    box(g, .03, .55, .03, M(0x9a9aa4), 0, -.55, .05);                                   // 矢
    return -.85;
  },
  shamisen(g, box, M){
    box(g, .05, 1.0, .06, M(0x14141c), 0, -.45, 0);                                      // 棹
    box(g, .08, .16, .1, M(0x14141c), 0, .12, 0);                                        // 天神
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.ConeGeometry(.04, .08, 4), M(0x14141c)); e.position.set(s*.04, .23, 0); g.add(e); });
    [-.1, .1].forEach(x => box(g, .2, .03, .03, M(0x20202a), x, .02, 0));                 // 糸巻き
    box(g, .36, .36, .12, M(0x1a2050), 0, -1.08, 0);                                     // 胴
    const face = new THREE.Mesh(new THREE.CircleGeometry(.1, 10), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false })); face.position.set(0, -1.06, .062); g.add(face);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.ConeGeometry(.05, .09, 4), M(0x14141c)); e.position.set(s*.15, -.86, 0); g.add(e); });
    [-.03, .03].forEach(x => { const b = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 4), M(0x4a62c8)); b.position.set(x + .1, -.12, .06); g.add(b); }); // 鈴
    return -1.2;
  },
  rapier(g, box, M){
    box(g, .045, .2, .045, M(0x2a2240), 0, 0, 0);
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(.09, .012, 4, 10), M(0xd8dce8)); r1.position.y = -.12; g.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(.09, .012, 4, 10), M(0xd8dce8)); r2.position.y = -.12; r2.rotation.y = Math.PI/2; g.add(r2);
    box(g, .025, 1.25, .03, M(0xe4e8f2), 0, -.78, 0);
    return -1.4;
  }
});

const SVIS = {
  buckler(g, box, M){ const m = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .06, 10), M(0x6b5236)); m.rotation.x = Math.PI/2; m.position.z = .05; g.add(m); box(g, .1, .1, .05, M(0x8a8a90), 0, 0, .09); },
  knight(g, box, M){ box(g, .5, .66, .07, M(0x3a4a6e), 0, 0, .04); box(g, .5, .08, .08, M(0xc9a24c), 0, .2, .05); box(g, .08, .5, .08, M(0xc9a24c), 0, 0, .05); },
  tomb(g, box, M){ box(g, .72, 1.25, .12, M(0x7a7a84), 0, -.18, .06); box(g, .2, .2, .05, M(0x5a5a64), 0, .1, .13); }
};

// 主人公の手に武器と盾を持たせる（見た目とガードの仕方が変わる）
function equipVisual(H, rId, lId){
  const disposeKids = g => { while (g.children.length){ const c = g.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } };
  const M = col => clam(col);
  const box = (p, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
  disposeKids(H.wpn); H.wpn.userData = {};
  const tipY = (WVIS[rId] || WVIS.moonblade)(H.wpn, box, M);
  const tip = new THREE.Object3D(); tip.position.y = tipY; H.wpn.add(tip); H.tip = tip;
  if (H.shieldPivot){ disposeKids(H.shieldPivot); H.armL.remove(H.shieldPivot); H.shieldPivot = null; }
  if (lId && lId !== 'none' && SVIS[lId]){
    const sp = new THREE.Group(); sp.position.set(.06, -.45, .12); H.armL.add(sp); SVIS[lId](sp, box, M); H.shieldPivot = sp;
  }
  H.guardStyle = H.shieldPivot ? null : (H.bubble && ITEMS[rId] && ITEMS[rId].catalyst ? 'bubble' : 'blade');
}
