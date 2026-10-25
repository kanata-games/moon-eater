'use strict';
// =========================================================
// models.js — Tripoで作った骨入りモデル（.glb）を主人公の体に使う
//   ・今までの骨組み（root/rig/torso/head/armR/armL/legR/legL）はそのまま残し、
//     見えない「操り人形」として動かす。毎フレーム、その向きをモデルの骨へ写す
//   ・武器と盾は骨組みの腕に付いたまま、位置だけモデルの手に合わせる
//   ・読み込めなかった時（file:// で開いた時など）は、今までの見た目のまま遊べる
// =========================================================
const MODEL_FILES = {
  astarte: { url: 'models/astarte.glb', height: 1.9 },   // 画面での背の高さ
  umine:   { url: 'models/umine.glb',   height: 1.95 }
};
const MODEL_DATA = {};      // id -> 読み込んだ glTF
const MODEL_WAIT = {};      // id -> 読み込み待ちの体 H の一覧

// 輪郭線（骨で曲がる版）
const OUTLINE_SKIN = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0x110d18, side: THREE.BackSide, skinning: true });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0055;'); };
  return m;
})();

(function preloadModels(){
  if (!THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  const loader = new THREE.GLTFLoader();
  for (const id in MODEL_FILES){
    MODEL_WAIT[id] = [];
    loader.load(MODEL_FILES[id].url, g => {
      MODEL_DATA[id] = g;
      MODEL_WAIT[id].forEach(H => attachModel(H, id)); MODEL_WAIT[id] = [];
    }, undefined, () => { MODEL_WAIT[id] = []; });   // 失敗したら今までの見た目のまま
  }
})();

// CHARS の build を包んで、作った体にモデルを付ける
for (const id in MODEL_FILES){
  const orig = CHARS[id].build;
  CHARS[id].build = () => { const H = orig(); if (MODEL_DATA[id]) attachModel(H, id); else if (MODEL_WAIT[id]) MODEL_WAIT[id].push(H); return H; };
}

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qI = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _DOWN = new THREE.Vector3(0, -1, 0), _AX = new THREE.Vector3(1, 0, 0);

function attachModel(H, id){
  if (H.model) return;
  const g = MODEL_DATA[id];
  const model = THREE.SkeletonUtils.clone(g.scene);
  // 今までの体のパーツを隠す（武器・盾・水の膜は残す）
  const keep = new Set([H.wpn, H.shieldPivot, H.bubble].filter(Boolean));
  const kept = o => { for (let p = o; p; p = p.parent){ if (keep.has(p)) return true; if (p === H.root) return false; } return false; };
  H.hiddenParts = []; H.root.traverse(o => { if (o.isMesh && o.visible && !kept(o)){ o.visible = false; H.hiddenParts.push(o); } });
  // 材質をアニメ塗りに。輪郭線も付ける
  const skinned = [];
  model.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const src = o.material, map = src.map || null;
    if (map){ map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
    const m = new THREE.MeshToonMaterial({ color: 0xffffff, map, gradientMap: TOON_GRAD, skinning: true });
    m.emissive = new THREE.Color(0x2a2a2a); m.emissiveMap = map;
    o.material = m; o.frustumCulled = false; o.castShadow = true; skinned.push(o);
  });
  skinned.forEach(o => {
    const line = new THREE.SkinnedMesh(o.geometry, OUTLINE_SKIN);
    line.bind(o.skeleton, o.bindMatrix); line.bindMode = o.bindMode; line.frustumCulled = false; line.userData.outline = true;
    o.parent.add(line);
  });
  const s = MODEL_FILES[id].height/H.root.scale.x;
  model.scale.setScalar(s); H.root.add(model); H.model = model;

  // 骨の休みの姿勢を覚える（キャラ基準＝モデルの中の座標）
  const bones = skinned[0].skeleton.bones, B = {};
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(), invQ = new THREE.Quaternion();
  model.getWorldQuaternion(invQ); invQ.invert();
  const R = bones.map(b => {
    B[b.name.replace(/^mixamorig:?/, '')] = b;
    const wq = invQ.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
    return { b, L: b.quaternion.clone(), W: wq, Wi: wq.clone().invert(), p: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) };
  });
  const rest = {}; R.forEach(r => { rest[r.b.name.replace(/^mixamorig:?/, '')] = r; });
  const dirOf = (a, b) => rest[b].p.clone().sub(rest[a].p).normalize();
  const M = {
    B, rest, s, hipsRest: B.Hips.position.clone(), hipK: rest.Hips.p.y*s/.75,   // 骨組みの腰(高さ.75)とモデルの腰の高さの比
    armR0: dirOf('RightArm', 'RightForeArm'), armL0: dirOf('LeftArm', 'LeftForeArm'),
    legR0: dirOf('RightUpLeg', 'RightLeg'), legL0: dirOf('LeftUpLeg', 'LeftLeg'),
    hipsPMi: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(inv).multiply(B.Hips.parent.matrixWorld)).invert(),
    knee: { R: { a: 0, k: 0 }, L: { a: 0, k: 0 } }
  };
  H.modelRig = M;
  const origAnim = H.anim;
  H.anim = (dt, t, spd) => {
    if (origAnim) origAnim(dt, t, spd);
    if (!H.modelRig) return;
    try { driveModel(H, dt); }
    catch (e){ console.warn('モデルを動かせなかったので元の見た目に戻します', e); detachModel(H); }
  };
  driveModel(H, 0);
}

function detachModel(H){
  if (!H.model) return;
  H.root.remove(H.model); H.model = null; H.modelRig = null;
  (H.hiddenParts || []).forEach(o => { o.visible = true; });
}
// キャラ基準の回転 D を骨に入れる： local = L · (W⁻¹ · D · W)
function setBone(M, name, D){
  const r = M.rest[name]; if (!r) return;
  r.b.quaternion.copy(r.L).multiply(_q3.copy(r.Wi).multiply(D).multiply(r.W));
}
function aimBone(M, name, rest0, parentQ, dirWorld){
  // 親の回りを除いた向きへ、休みの向き rest0 から最短で回す
  _v1.copy(dirWorld).applyQuaternion(_q2.copy(parentQ).invert());
  setBone(M, name, _q1.setFromUnitVectors(rest0, _v1.normalize()));
}

function driveModel(H, dt){
  const M = H.modelRig; if (!M) return;
  const rigQ = H.rig.quaternion, torQ = H.torso.quaternion;
  // 腰（体全体の傾き・前転）と高さ
  setBone(M, 'Hips', rigQ);
  M.B.Hips.position.copy(_v1.set(0, (H.rig.position.y - .75)*M.hipK/M.s, 0).applyMatrix3(M.hipsPMi).add(M.hipsRest));
  // 背骨（3つに分ける）と頭
  _q1.copy(_qI).slerp(torQ, 1/3);
  setBone(M, 'Spine', _q1); setBone(M, 'Spine1', _q1); setBone(M, 'Spine2', _q1);
  setBone(M, 'Head', H.head.quaternion);
  // 腕：骨組みの腕と同じ方向へ。肘は少しだけ曲げる
  const upQ = _q2.copy(rigQ).multiply(torQ).clone();
  const armDir = (arm) => _v2.copy(_DOWN).applyQuaternion(_q1.copy(upQ).multiply(arm.quaternion)).clone();
  aimBone(M, 'RightArm', M.armR0, upQ, armDir(H.armR));
  aimBone(M, 'LeftArm', M.armL0, upQ, armDir(H.armL));
  setBone(M, 'RightForeArm', _q1.setFromAxisAngle(_v1.set(0, 1, 0), .18));
  setBone(M, 'LeftForeArm', _q1.setFromAxisAngle(_v1.set(0, 1, 0), -.18));
  // 脚：骨組みの脚の向き＋膝（前へ振る時と、脚を高く上げた時に曲げる）
  [['R', H.legR, M.legR0], ['L', H.legL, M.legL0]].forEach(([side, leg, r0]) => {
    const n = side === 'R' ? 'Right' : 'Left', st = M.knee[side], a = leg.rotation.x;
    const v = dt > 0 ? (a - st.a)/dt : 0; st.a = a;
    const want = Math.min(1.9, .06 + Math.max(0, -v)*.22 + Math.max(0, -a - .55)*1.25);
    st.k += (want - st.k)*Math.min(1, dt*14 || 1);
    aimBone(M, n + 'UpLeg', r0, rigQ, _v2.copy(_DOWN).applyQuaternion(_q1.copy(rigQ).multiply(leg.quaternion)));
    setBone(M, n + 'Leg', _q1.setFromAxisAngle(_AX, st.k));
    setBone(M, n + 'Foot', _q1.setFromAxisAngle(_AX, -st.k*.5));
  });
  // 武器と盾を、モデルの手の位置へ
  H.root.updateMatrixWorld(true);
  const hand = (a, b, f) => M.B[a].getWorldPosition(_v1).lerp(M.B[b] ? M.B[b].getWorldPosition(_v2) : _v1, f);
  H.wpn.position.copy(H.armR.worldToLocal(hand('RightHand', 'RightHandMiddle1', .6).clone()));
  if (H.shieldPivot){
    const p = H.armL.worldToLocal(hand('LeftForeArm', 'LeftHand', .55).clone());
    H.shieldPivot.position.set(p.x + .05, p.y, p.z + .08);
  }
}
