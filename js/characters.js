'use strict';
// =========================================================
// characters.js — 主人公（アスターテ・海音）の見た目と能力
//   体の骨組みは敵と同じ（root/rig/torso/head/armR/armL/legR/legL/wpn/tip）なので、
//   モーションは共通。キャラごとの飾り（しっぽ・髪・帽子）は anim() で揺らす。
// =========================================================
// 主人公は夜でも見えるよう、少し自ら光らせる
function clam(col){ const m = lam(col); m.emissive = new THREE.Color(col).multiplyScalar(.32); return m; }
function charRig(c){
  const root = new THREE.Group(); const rig = new THREE.Group(); rig.position.y = .75; root.add(rig);
  const M = col => clam(col);
  const mSkin = M(c.skin), mTorso = M(c.torso), mSleeve = M(c.sleeve), mCuff = M(c.cuff), mLegs = M(c.legs), mShoe = M(c.shoe);
  const mEye = new THREE.MeshBasicMaterial({ color: c.eye, fog: false });
  const box = (p, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
  box(rig, .44, .26, .3, mTorso, 0, .13, 0);
  const torso = new THREE.Group(); torso.position.y = .25; rig.add(torso);
  box(torso, .5, .58, .3, mTorso, 0, .31, 0);
  const head = new THREE.Group(); head.position.y = .84; torso.add(head);
  box(head, .29, .31, .28, mSkin, 0, 0, 0);
  box(head, .065, .07, .02, mEye, -.065, .0, .142); box(head, .065, .07, .02, mEye, .065, .0, .142);
  const limb = (p, x, y, w, len, mat) => { const g = new THREE.Group(); g.position.set(x, y, 0); p.add(g); box(g, w, len, w + .02, mat, 0, -len/2, 0); return g; };
  const armR = limb(torso, -.36, .54, .16, .6, mSleeve), armL = limb(torso, .36, .54, .16, .6, mSleeve);
  // 広い袖口と手
  [armR, armL].forEach(a => { box(a, .27, .2, .27, mCuff, 0, -.52, 0); box(a, .1, .1, .1, mSkin, 0, -.66, 0); });
  const legR = limb(rig, -.12, .08, .16, .83, mLegs), legL = limb(rig, .12, .08, .16, .83, mLegs);
  [legR, legL].forEach(l => box(l, .19, .14, .28, mShoe, 0, -.8, .05));
  const wpn = new THREE.Group(); wpn.position.y = -.64; armR.add(wpn);
  return { root, rig, torso, head, armR, armL, legR, legL, wpn, tip: null, shieldPivot: null, eyeMat: mEye, box };
}
// 縁が開いたスカート・ローブ（円すい台）
function skirt(parent, rTop, rBot, h, y, mat, opts = {}){
  const g = new THREE.CylinderGeometry(rTop, rBot, h, opts.seg || 12, 1, true, opts.start || 0, opts.len || Math.PI*2);
  const m = new THREE.Mesh(g, mat); m.position.y = y; parent.add(m); return m;
}
const dbl = (col) => { const m = clam(col); m.side = THREE.DoubleSide; return m; };

// ---------- アスターテ ----------
function buildAstarte(){
  const NAVY = 0x1f2654, GOLD = 0xc9a24c, WHITE = 0xe9e7ef;
  const H = charRig({ skin: 0xf2dfd2, torso: WHITE, sleeve: NAVY, cuff: WHITE, legs: 0x1a1d33, shoe: 0x141833, eye: 0x4a7fe0 });
  const { box } = H, mNavy = clam(NAVY), mGold = clam(GOLD), mWhite = clam(WHITE), mPink = clam(0xe8b4bc);
  // 白いボブヘア
  box(H.head, .31, .09, .05, mWhite, 0, .12, .14);
  box(H.head, .06, .28, .22, mWhite, -.16, -.05, .02); box(H.head, .06, .28, .22, mWhite, .16, -.05, .02);
  box(H.head, .3, .2, .06, mWhite, 0, -.02, -.13);
  // 猫耳フード
  const hood = new THREE.Group(); H.head.add(hood);
  box(hood, .42, .09, .4, mNavy, 0, .2, -.02);
  box(hood, .42, .44, .08, mNavy, 0, .0, -.2);
  box(hood, .07, .4, .38, mNavy, -.2, .02, -.02); box(hood, .07, .4, .38, mNavy, .2, .02, -.02);
  box(hood, .025, .38, .025, mGold, -.2, .02, .18); box(hood, .025, .38, .025, mGold, .2, .02, .18); box(hood, .42, .025, .025, mGold, 0, .24, .18);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.1, .2, 4), mWhite); ear.position.set(s*.13, .33, -.02); ear.rotation.set(0, Math.PI/4, -s*.28); hood.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.055, .13, 4), mPink); inner.position.set(s*.125, .315, .03); inner.rotation.set(0, Math.PI/4, -s*.28); hood.add(inner);
  });
  // ケープ・鈴・ベルト
  skirt(H.torso, .2, .44, .34, .47, dbl(NAVY), { seg: 10 });
  skirt(H.torso, .44, .45, .03, .29, mGold, { seg: 10 });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 4), mGold); bell.position.set(0, .5, .17); H.torso.add(bell);
  skirt(H.torso, .27, .27, .1, .02, mNavy, { seg: 10 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.04, .012, 4, 8), mGold); ring.position.set(0, .02, .28); H.torso.add(ring);
  // 白いスカートと、前が開いた紺のローブ
  const skirtG = new THREE.Group(); H.rig.add(skirtG);
  skirt(skirtG, .25, .46, .8, -.32, dbl(WHITE));
  skirt(skirtG, .28, .52, .84, -.3, dbl(NAVY), { start: Math.PI*.12, len: Math.PI*1.76, seg: 14 });
  skirt(skirtG, .515, .53, .04, -.7, mGold, { start: Math.PI*.12, len: Math.PI*1.76, seg: 14 });
  [[-.36, -.6, -.35], [.36, -.6, -.35]].forEach(([x, y, z]) => box(skirtG, .05, .08, .02, mGold, x, y, z)); // 裾の三日月飾り
  // しっぽ（5節）
  const tail = []; let parent = H.rig;
  for (let i = 0; i < 6; i++){
    const g = new THREE.Group(); g.position.set(0, i === 0 ? .05 : .17, i === 0 ? -.3 : 0); parent.add(g);
    box(g, .1 - i*.006, .18, .1 - i*.006, mWhite, 0, .09, 0); tail.push(g); parent = g;
  }
  // 月刃（細身の長剣・三日月の鍔）
  box(H.wpn, .05, .22, .05, clam(0x2a2240), 0, 0, 0);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.1, .02, 4, 8, Math.PI), mGold); guard.position.y = -.12; guard.rotation.set(0, Math.PI/2, Math.PI); H.wpn.add(guard);
  box(H.wpn, .04, 1.05, .1, clam(0xc9d2e8), 0, -.66, 0);
  box(H.wpn, .045, .1, .06, clam(0xe4ebff), 0, -1.22, 0);
  const tip = new THREE.Object3D(); tip.position.y = -1.25; H.wpn.add(tip); H.tip = tip;
  H.guardStyle = 'blade';
  H.root.scale.setScalar(.95);
  H.anim = (dt, t, spd) => {
    tail.forEach((g, i) => { g.rotation.x = (i === 0 ? -1.0 : .28) + Math.sin(t*3 - i*.7)*.08*(1 + spd*.3); g.rotation.z = Math.sin(t*2.2 - i*.6)*(.12 + spd*.05); });
    skirtG.rotation.x = -Math.min(.12, spd*.02);
  };
  return H;
}

// ---------- 海音 ----------
function buildUmine(){
  const ROBE = 0x2f3654, HAIR = 0x9cc4ec, GOLD = 0xb7a46a, LAV = 0xa9a3d6, WHITE = 0xe6edf6;
  const H = charRig({ skin: 0xf4e2d6, torso: WHITE, sleeve: ROBE, cuff: 0x262c46, legs: 0x2a2f45, shoe: 0x3a4058, eye: 0x6f74c9 });
  const { box } = H, mHair = clam(HAIR), mRobe = clam(ROBE), mGold = clam(GOLD);
  // 長い水色の髪（頭の後ろから腰まで）
  box(H.head, .31, .08, .05, mHair, 0, .12, .14);
  box(H.head, .07, .3, .2, mHair, -.16, -.04, .03); box(H.head, .07, .3, .2, mHair, .16, -.04, .03);
  const hair = new THREE.Group(); hair.position.set(0, .1, -.12); H.head.add(hair);
  box(hair, .4, .95, .12, mHair, 0, -.48, -.04);
  box(hair, .12, .8, .12, mHair, -.22, -.42, .04); box(hair, .12, .8, .12, mHair, .22, -.42, .04);
  box(hair, .3, .2, .1, mHair, -.08, -.98, -.06); box(hair, .22, .16, .1, mHair, .1, -1.0, -.02);
  // とんがり帽子
  const hat = new THREE.Group(); hat.position.y = .17; H.head.add(hat);
  const mHat = clam(0x30365a);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.6, .62, .03, 16), mHat); hat.add(brim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.205, .22, .08, 12), clam(LAV)); band.position.y = .05; hat.add(band);
  const cone1 = new THREE.Mesh(new THREE.CylinderGeometry(.12, .21, .36, 10), mHat); cone1.position.y = .2; cone1.rotation.z = -.08; hat.add(cone1);
  const tipG = new THREE.Group(); tipG.position.set(.02, .37, 0); tipG.rotation.z = -.9; hat.add(tipG);
  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(.12, .34, 8), mHat); cone2.position.y = .15; tipG.add(cone2);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.05), new THREE.MeshBasicMaterial({ color: 0x7f8cff, fog: false })); gem.position.set(.0, .28, 0); gem.scale.y = 1.6; tipG.add(gem);
  // 襟とリボン
  box(H.torso, .22, .1, .05, clam(WHITE), 0, .56, .15); box(H.torso, .05, .2, .03, clam(0x2a2d4a), 0, .44, .165);
  // 前が開いたローブと白いスカート
  const skirtG = new THREE.Group(); H.rig.add(skirtG);
  skirt(skirtG, .25, .5, .82, -.33, dbl(0xdfe8f6));
  skirt(skirtG, .29, .58, .9, -.27, dbl(ROBE), { start: Math.PI*.16, len: Math.PI*1.68, seg: 14 });
  skirt(skirtG, .575, .585, .04, -.69, mGold, { start: Math.PI*.16, len: Math.PI*1.68, seg: 14 });
  skirt(H.torso, .27, .33, .62, .3, dbl(ROBE), { start: Math.PI*.2, len: Math.PI*1.6, seg: 10 }); // 上着
  const book = box(H.rig, .16, .2, .06, clam(0x22263c), .28, -.02, .08); book.rotation.y = -.4;
  // 杖（先に水の結晶）
  box(H.wpn, .045, .25, .045, clam(0x5a4230), 0, .1, 0);
  box(H.wpn, .045, 1.25, .045, clam(0x5a4230), 0, -.6, 0);
  const orbRing = new THREE.Mesh(new THREE.TorusGeometry(.09, .015, 4, 10), mGold); orbRing.position.y = -1.3; H.wpn.add(orbRing);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.08), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, fog: false })); crystal.position.y = -1.32; crystal.scale.y = 1.5; H.wpn.add(crystal);
  const tip = new THREE.Object3D(); tip.position.y = -1.4; H.wpn.add(tip); H.tip = tip;
  // 水の膜（ガード時）
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(.95, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bubble.position.set(0, 1.0, .25); bubble.scale.set(1, 1.1, .55); bubble.visible = false; H.root.add(bubble); H.bubble = bubble;
  H.guardStyle = 'bubble';
  H.root.scale.setScalar(.95);
  H.anim = (dt, t, spd) => {
    hair.rotation.x = .08 + Math.min(.45, spd*.07) + Math.sin(t*2)*.03;
    hair.rotation.z = Math.sin(t*1.6)*.04;
    tipG.rotation.z = -.9 + Math.sin(t*2.4)*.06;
    gem.rotation.y += dt*1.5; crystal.rotation.y += dt*2;
    skirtG.rotation.x = -Math.min(.12, spd*.02);
    if (bubble.visible) bubble.material.opacity = .18 + Math.sin(t*8)*.05;
  };
  return H;
}

// ---------- 能力 ----------
// stat3 = 3つ目の能力値の名前。近接型は攻撃力、魔法型は魔力とMPが伸びる
const CHARS = {
  astarte: {
    id: 'astarte', name: 'アスターテ', role: '近接型',
    desc: '猫耳フードの剣士。月刃で斬り込み、刃で攻撃を受け流す。',
    hp: [400, 42], st: [100, 7], atk: [32, 4.8], stat3: '筋力', guardChip: .08, build: buildAstarte
  },
  umine: {
    id: 'umine', name: '海音', role: '魔法型',
    desc: '旅好きの水の魔女。水弾と潮渦で離れて戦い、水の膜で身を守る。',
    hp: [320, 36], st: [95, 7], atk: [16, 1.5], spell: [34, 5], mp: [100, 6], stat3: '理力', caster: true, guardChip: .05, build: buildUmine
  }
};
