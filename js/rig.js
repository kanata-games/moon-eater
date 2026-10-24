'use strict';
// =========================================================
// rig.js — 人型の体（箱の組み合わせ）と手付けモーション
// =========================================================
// o: { body, trim, eye, weapon:'sword'|'spear'|'axe'|'great'|'none', shield, shieldColor, cape, crest, horns, hood, scale }
function humanoid(o){
  const root = new THREE.Group(); const rig = new THREE.Group(); rig.position.y = .75; root.add(rig);
  const mB = lam(o.body), mT = lam(o.trim), mE = new THREE.MeshBasicMaterial({ color: o.eye, fog: false });
  const add = (p, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
  add(rig, .5, .3, .32, mT, 0, .15, 0);
  const torso = new THREE.Group(); torso.position.y = .25; rig.add(torso);
  add(torso, .64, .62, .38, mB, 0, .33, 0);
  add(torso, .74, .13, .44, mT, 0, .62, 0);
  const head = new THREE.Group(); head.position.y = .86; torso.add(head);
  add(head, .32, .36, .34, mB, 0, 0, 0); add(head, .25, .05, .02, mE, 0, .02, .176);
  if (o.crest) add(head, .05, .14, .3, mT, 0, .24, 0);
  if (o.hood){ add(head, .4, .44, .42, mT, 0, .04, -.02); }
  if (o.horns){ const h1 = add(head, .08, .46, .08, mT, .2, .26, -.04); h1.rotation.z = -.55; const h2 = add(head, .08, .46, .08, mT, -.2, .26, -.04); h2.rotation.z = .55; }
  if (o.cape){ const c = add(torso, .58, 1.05, .04, lam(o.cape), 0, -.02, -.22); c.rotation.x = .14; }
  const limb = (p, x, y, w, len, mat) => { const g = new THREE.Group(); g.position.set(x, y, 0); p.add(g); add(g, w, len, w + .02, mat, 0, -len/2, 0); return g; };
  const armR = limb(torso, -.42, .55, .18, .62, mB), armL = limb(torso, .42, .55, .18, .62, mB);
  add(armR, .21, .16, .23, mT, 0, -.56, 0); add(armL, .21, .16, .23, mT, 0, -.56, 0);
  const legR = limb(rig, -.15, .1, .21, .85, mT), legL = limb(rig, .15, .1, .21, .85, mT);
  const wpn = new THREE.Group(); wpn.position.y = -.62; armR.add(wpn);
  const mMetal = lam(0xb4b8c6), mWood = lam(0x4a3626); let tipY = -1.1;
  if (o.weapon === 'sword'){ add(wpn, .05, .2, .05, mWood, 0, 0, 0); add(wpn, .07, .05, .3, mT, 0, -.1, 0); add(wpn, .05, .95, .12, mMetal, 0, -.6, 0); tipY = -1.08; }
  if (o.weapon === 'spear'){ add(wpn, .05, 2.2, .05, mWood, 0, -.55, 0); add(wpn, .04, .34, .1, mMetal, 0, -1.8, 0); tipY = -1.95; }
  if (o.weapon === 'axe'){ add(wpn, .07, 1.5, .07, mWood, 0, -.55, 0); add(wpn, .06, .46, .52, mMetal, 0, -1.15, .2); tipY = -1.3; }
  if (o.weapon === 'great'){ add(wpn, .07, .3, .07, mWood, 0, 0, 0); add(wpn, .1, .07, .52, mT, 0, -.15, 0); add(wpn, .07, 1.75, .25, lam(0x8e94ab), 0, -1.05, 0); tipY = -1.9; }
  const tip = new THREE.Object3D(); tip.position.y = tipY; wpn.add(tip);
  let shieldPivot = null;
  if (o.shield){ shieldPivot = new THREE.Group(); shieldPivot.position.set(.06, -.45, .12); armL.add(shieldPivot); add(shieldPivot, .5, .64, .07, lam(o.shieldColor || 0x6b5a3a), 0, 0, .04); add(shieldPivot, .13, .13, .05, mT, 0, 0, .09); }
  root.scale.setScalar(o.scale || 1);
  return { root, rig, torso, head, armR, armL, legR, legL, wpn, tip, shieldPivot, eyeMat: mE };
}

// 構えの基本形と、攻撃ごとの「振りかぶり(wind)」「振り抜き(act)」
const REST = { aR: [-.35, 0, 0], aL: [-.2, 0, 0], tor: [0, 0, 0] };
const KF = {
  over:   { wind: { aR: [-2.8, 0, .2],  tor: [-.15, -.35, 0] }, act: { aR: [-.25, 0, 0], tor: [.35, .25, 0] } },
  side:   { wind: { aR: [-1.45, 0, -.9], tor: [0, -1.1, 0] },  act: { aR: [-1.45, 0, -.3], tor: [.1, 1.2, 0] } },
  side2:  { wind: { aR: [-1.45, 0, -.25], tor: [0, 1.05, 0] }, act: { aR: [-1.45, 0, -.9], tor: [.1, -1.2, 0] } },
  thrust: { wind: { aR: [-1.25, 0, -.2], tor: [0, -.8, 0] },  act: { aR: [-1.65, 0, 0], tor: [.15, .4, 0] } },
  slam:   { wind: { aR: [-3.0, 0, .1], aL: [-3.0, 0, -.1], tor: [-.32, 0, 0] }, act: { aR: [-.4, 0, 0], aL: [-.4, 0, 0], tor: [.5, 0, 0] } },
  heavy:  { wind: { aR: [-3.1, 0, .3], tor: [-.35, -.5, 0] }, act: { aR: [-.1, 0, 0], tor: [.5, .3, 0] } }
};
function attackPose(H, kind, stage, f){
  const k = KF[kind]; const g = (key, st) => st === 'rest' ? REST[key] : (k[st][key] || REST[key]);
  let A, B, ff;
  if (stage === 0){ A = 'rest'; B = 'wind'; ff = 1 - (1 - f)*(1 - f); }
  else if (stage === 1){ A = 'wind'; B = 'act'; ff = f*f*(3 - 2*f); }
  else { A = 'act'; B = 'rest'; ff = f*f*(3 - 2*f); }
  const mix = (a, b) => [lerp(a[0], b[0], ff), lerp(a[1], b[1], ff), lerp(a[2], b[2], ff)];
  const v1 = mix(g('aR', A), g('aR', B)); H.armR.rotation.set(v1[0], v1[1], v1[2]);
  const v2 = mix(g('aL', A), g('aL', B)); H.armL.rotation.set(v2[0], v2[1], v2[2]);
  const v3 = mix(g('tor', A), g('tor', B)); H.torso.rotation.set(v3[0], v3[1], v3[2]);
}
function applyPose(H, p, k){
  const L = (o, v) => { if (!v || !o) return; o.rotation.x += (v[0] - o.rotation.x)*k; o.rotation.y += (v[1] - o.rotation.y)*k; o.rotation.z += (v[2] - o.rotation.z)*k; };
  L(H.armR, p.aR); L(H.armL, p.aL); L(H.torso, p.tor); L(H.legR, p.legR); L(H.legL, p.legL); L(H.rig, p.rig); L(H.head, p.head);
  if (p.rigY !== undefined) H.rig.position.y += (p.rigY - H.rig.position.y)*k;
  if (p.sh !== undefined && H.shieldPivot) H.shieldPivot.rotation.x += (p.sh - H.shieldPivot.rotation.x)*k;
}
function locoPose(H, phase, amt, guard, dt, spr){
  const s = Math.sin(phase), k = 1 - Math.exp(-dt*16);
  applyPose(H, { legR: [s*.75*amt, 0, 0], legL: [-s*.75*amt, 0, 0], aR: [-.35 - (spr ? .5 : 0) - s*.3*amt, 0, 0], aL: guard ? [-1.25, 0, 0] : [-.2 + s*.3*amt, 0, 0], sh: guard ? 1.25 : 0, tor: [spr ? .3 : .06*amt, 0, 0] }, k);
}
