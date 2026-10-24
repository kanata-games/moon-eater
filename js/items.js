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
  moonblade: { slot: 'r', name: '月刃', kind: '直剣', desc: '三日月の鍔をもつ細身の長剣。扱いやすく、どんな相手にも向く。',
    spd: 1, mult: 1, heavy: 1.9, reach: 2.25, arc: 80, cost: 1, kinds: ['over', 'side'], heavyKind: 'heavy', crit: 1 },
  greatsword: { slot: 'r', name: '灰の大剣', kind: '大剣', desc: '月を喰らう番人が振るっていた灰色の大剣。重く遅いが、横薙ぎで周りをまとめて斬る。',
    spd: 1.35, mult: 1.7, heavy: 3.0, reach: 2.8, arc: 120, cost: 1.5, kinds: ['side', 'side2'], heavyKind: 'heavy', crit: 1, guardBreak: true },
  spear: { slot: 'r', name: '巡礼の槍', kind: '槍', desc: '城を目指した巡礼者の槍。突きは狭いが遠くまで届く。',
    spd: .95, mult: .95, heavy: 1.7, reach: 3.2, arc: 32, cost: .9, kinds: ['thrust', 'thrust'], heavyKind: 'thrust', crit: 1, lunge: 2.4 },
  dagger: { slot: 'r', name: '猫爪の短剣', kind: '短剣', desc: '供物として納められた小さな刃。とても速く、背後からの一撃は深く刺さる。',
    spd: .72, mult: .62, heavy: 1.3, reach: 1.7, arc: 90, cost: .7, kinds: ['side', 'side2'], heavyKind: 'thrust', crit: 1.6 },
  hammer: { slot: 'r', name: '墓守の鎚', kind: '鎚', desc: '墓を固めるための石の鎚。遅いが、弱攻撃でも盾ごと叩き崩す。',
    spd: 1.25, mult: 1.45, heavy: 2.6, reach: 2.3, arc: 70, cost: 1.3, kinds: ['over', 'over'], heavyKind: 'slam', crit: 1, guardBreak: true },
  staff: { slot: 'r', name: '水晶の杖', kind: '杖', desc: '水の結晶を戴く旅の杖。海音が持てば水の魔法を放てる。殴るには頼りない。',
    spd: .9, mult: .55, heavy: 1.1, reach: 2.0, arc: 70, cost: .8, kinds: ['thrust', 'side'], heavyKind: 'over', crit: 1, catalyst: true, spell: 1 },
  bishopStaff: { slot: 'r', name: '司教の杖', kind: '杖', desc: '骸の司教が遺した紫の杖。魔法がより強く響く。',
    spd: .95, mult: .6, heavy: 1.2, reach: 2.1, arc: 70, cost: .8, kinds: ['thrust', 'side'], heavyKind: 'over', crit: 1, catalyst: true, spell: 1.3 },
  // ---- 盾 ----
  none: { slot: 'l', name: 'なし', kind: '素手', desc: '盾を持たない。ガードは武器で受け、パリィも武器で弾く。' },
  buckler: { slot: 'l', name: '木の小盾', kind: '小盾', desc: '軽い木の盾。守りは薄いが、パリィを合わせやすい。', drain: 1.0, chipMul: 1, parry: [.04, .3] },
  knight: { slot: 'l', name: '騎士の盾', kind: '中盾', desc: '城の騎士たちの盾。しっかり受け止め、削られにくい。', drain: .72, chipMul: .5, parry: [.05, .22] },
  tomb: { slot: 'l', name: '墓石の大盾', kind: '大盾', desc: '墓石を削り出した大盾。ほとんどの攻撃を止めるが、構えると歩みが遅く、パリィは難しい。', drain: .45, chipMul: 0, parry: [.07, .16], guardSpd: .6 }
};
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
