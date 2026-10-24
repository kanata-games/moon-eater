'use strict';
// =========================================================
// 拠点：月影の祭壇
//   夜空に浮かぶ円形の祭壇。要石から各ステージへ旅立ち、灯守りに魂を捧げて強くなる。
//   新しいステージを作ったら ARCHSTONES に1行足す。
// =========================================================
const ARCHSTONES = [
  { stage: 'castle', x: -6, z: -9 },
  { stage: 'catacomb', x: 0, z: -11 },
  { stage: null, name: '灰の塔', x: 6, z: -9 }
];

defineStage({
  id: 'nexus',
  name: '月影の祭壇',
  hub: true,
  seed: 7,
  fog: 0x0a0c1a, fogNear: 14, fogFar: 75,
  spawn: { x: 0, z: 7, face: Math.PI },

  runes: [
    [0, 4, '要石に触れ、霧の地へ赴け。灯した篝火へは、いつでも要石から戻れる。'],
    [5.6, 3.2, '倒した者から奪った魂は、灯守りに捧げよ。それが汝の力となる。']
  ],

  area(){ return '月影の祭壇'; },

  build(){
    const R = 15;
    floorDisc(0, 0, R, TEX.altar);
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R*.55, 6, 40, 1, true), lam(0x3c3c4c, ownTex(TEX.stone, 20, 3)));
    edge.position.y = -3; add(edge);
    const under = new THREE.Mesh(new THREE.ConeGeometry(R*.55, 9, 12), lam(0x2a2a36, ownTex(TEX.stone, 6, 4)));
    under.rotation.x = Math.PI; under.position.y = -10.5; add(under);
    // 縁から落ちないための見えない壁
    for (let i = 0; i < 40; i++){ const a = i/40*Math.PI*2, x = Math.cos(a)*(R + .3), z = Math.sin(a)*(R + .3); invisibleWall(x - .7, z - .7, x + .7, z + .7); }
    // 縁の柱（南側と東西に、北の要石側は空ける）
    const pr = mulberry32(3);
    for (let i = 0; i < 12; i++){
      const a = Math.PI*.12 + i/11*Math.PI*.76; // 南半分
      const x = Math.cos(a)*13.2, z = Math.sin(a)*13.2;
      pillar(x, z, 1.1, 2 + pr()*5);
    }
    [[-12.5, -5], [12.5, -5], [-10, -9.5], [10, -9.5]].forEach(([x, z]) => pillar(x, z, 1.1, 3 + pr()*4));
    // 要石
    ARCHSTONES.forEach(a => {
      const face = Math.atan2(-a.x, -a.z);
      if (a.stage){
        const def = STAGES[a.stage];
        archstone(a.x, a.z, face, { glow: true, text: `${def.name}へ旅立つ`, use: () => openArchstone(a.stage) });
      } else archstone(a.x, a.z, face, { glow: false, dimText: `${a.name}：まだ封じられている` });
    });
    // 灯守り
    const kx = 9, kz = 1.5, kf = Math.atan2(-kx, -kz);
    const K = humanoid({ body: 0x2e3040, trim: 0x1c1d28, eye: 0xc8d4ff, weapon: 'none', hood: true, cape: 0x24263a, scale: 1 });
    K.root.position.set(kx, 0, kz); K.root.rotation.y = kf; add(K.root);
    applyPose(K, { rigY: .42, legR: [-1.5, 0, 0], legL: [.2, 0, 0], tor: [.35, 0, 0], aR: [-1.0, 0, -.2], aL: [-1.25, 0, .3], head: [.3, 0, 0], rig: [0, 0, 0] }, 1);
    const lx = kx + Math.sin(kf)*.75 + Math.cos(kf)*.1, lz = kz + Math.cos(kf)*.75;
    const lantern = boxMesh(.22, .3, .22, lam(0x4a4030)); lantern.position.set(lx, .95, lz); add(lantern);
    makeFlame(lx, .9, lz, .5, true);
    colliders.push({ x1: kx - .6, z1: kz - .6, x2: kx + .6, z2: kz + .6, h: 2 });
    interactables.push({
      near: p => Math.hypot(p.x - kx, p.z - kz) < 2.3,
      prompt: () => ({ text: '灯守りに魂を捧げる' }),
      use: () => openKeeper()
    });
    // 宙に浮かぶ瓦礫
    const fr = mulberry32(19), fm = lam(0x5a5a6a, TEX.stone);
    for (let i = 0; i < 26; i++){
      const a = fr()*Math.PI*2, d = R + 3 + fr()*20, s = .4 + fr()*1.6;
      const m = boxMesh(s, s*.8, s*1.1, fm); m.position.set(Math.cos(a)*d, -4 + fr()*12, Math.sin(a)*d); m.rotation.set(fr()*3, fr()*3, fr()*3); add(m);
      spinners.push({ obj: m, rot: (fr() - .5)*.4, bob: .3 + fr()*.6, y0: m.position.y, seed: fr()*6 });
    }
  }
});
