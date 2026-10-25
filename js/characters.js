'use strict';
// =========================================================
// characters.js — 主人公（アスターテ・海音）の見た目と能力
//   体の骨組みは敵と同じ（root/rig/torso/head/armR/armL/legR/legL/wpn/tip）なので、
//   モーションは共通。主人公だけはアニメ調の陰影（トゥーン）と輪郭線で、丸みのある形で作る。
//   キャラごとの飾り（しっぽ・髪・帽子・まばたき）は anim() で動かす。
// =========================================================

// ---------- 見た目の道具 ----------
// 3段階の陰影（アニメ塗り）
const TOON_GRAD = (() => {
  const d = new Uint8Array([100, 100, 100, 172, 172, 172, 238, 238, 238]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
// 主人公用の材質（夜でも見えるよう少し自ら光らせる）
function clam(col, o = {}){
  const m = new THREE.MeshToonMaterial({ color: col, gradientMap: TOON_GRAD });
  m.emissive = new THREE.Color(col).multiplyScalar(o.glow ?? .14);
  if (o.double) m.side = THREE.DoubleSide;
  if (o.opacity){ m.transparent = true; m.opacity = o.opacity; }
  return m;
}
// 輪郭線（裏返した面を法線方向に少し膨らませて黒く描く）
const OUTLINE = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0x110d18, side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0105;'); };
  return m;
})();
function ol(mesh){ const o = new THREE.Mesh(mesh.geometry, OUTLINE); o.userData.outline = true; mesh.add(o); return mesh; }
function mk(parent, geo, mat, x = 0, y = 0, z = 0, outline = true){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); if (outline) ol(m); return m; }
const sph = (r, w = 14, h = 10, ps, pl, ts, tl) => new THREE.SphereGeometry(r, w, h, ps, pl, ts, tl);
const cyl = (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
// 回転体（[半径, 高さ] の並びを y 軸まわりに回す）。phi=0 が正面
const lathe = (pts, seg = 22, ps = 0, pl = Math.PI*2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, ps, pl);
const latheAt = (r, y, phi) => new THREE.Vector3(r*Math.sin(phi), y, r*Math.cos(phi));
// 縁取り（回転体の縁に沿った細い管）
function rimTube(parent, r, y, ps, pl, rad, mat, closed = false){
  const n = 28, pts = []; for (let i = 0; i <= (closed ? n - 1 : n); i++) pts.push(latheAt(r, y, ps + pl*i/n));
  return mk(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), 48, rad, 4, closed), mat, 0, 0, 0, false);
}
function edgeTube(parent, profile, phi, rad, mat){
  const pts = profile.map(([r, y]) => latheAt(r*1.01, y, phi));
  return mk(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, rad, 4, false), mat, 0, 0, 0, false);
}
// 小さな三日月（金の飾り）
const crescent = (r, tube) => new THREE.TorusGeometry(r, tube, 4, 10, Math.PI*1.35);

// ---------- 顔（目を描いたテクスチャ・まばたき用に2枚） ----------
function faceTextures(o){
  const draw = closed => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const ell = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); g.fill(); };
    g.fillStyle = 'rgba(240,130,150,.25)'; ell(26, 90, 12, 5); ell(102, 90, 12, 5);         // 頬
    [40, 88].forEach((cx, i) => {
      const cy = 66, s = i ? 1 : -1;
      g.strokeStyle = o.brow; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy - 6, 15, 26, 0, Math.PI*1.25, Math.PI*1.75); g.stroke(); // 眉
      if (closed){
        g.strokeStyle = o.lash; g.lineWidth = 3.5; g.beginPath(); g.ellipse(cx, cy + 2, 13, 7, 0, Math.PI*.1, Math.PI*.9); g.stroke();
        return;
      }
      g.fillStyle = '#fbfbff'; ell(cx, cy + 2, 12.5, 16);                                   // 白目
      const gr = g.createLinearGradient(0, cy - 12, 0, cy + 16); gr.addColorStop(0, o.iris2); gr.addColorStop(1, o.iris);
      g.fillStyle = gr; ell(cx, cy + 3, 10, 13.5);                                           // 瞳
      g.fillStyle = o.pupil; ell(cx, cy + 4, 4.5, 6.5);
      g.fillStyle = 'rgba(255,255,255,.95)'; ell(cx - 4, cy - 3, 3.4, 3.8); ell(cx + 4, cy + 9, 1.7, 1.7);  // ハイライト
      g.strokeStyle = o.lash; g.lineWidth = 4.2; g.beginPath(); g.ellipse(cx, cy + 3, 14, 16.5, 0, Math.PI*1.07, Math.PI*1.93); g.stroke(); // 上まつげ
      g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx + 13.5*s, cy - 3); g.lineTo(cx + 18*s, cy - 7); g.stroke();
      g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, cy + 3, 11, 14.5, 0, Math.PI*.3, Math.PI*.7); g.stroke();       // 下まつげ
    });
    g.strokeStyle = o.mouth; g.lineWidth = 2; g.beginPath();
    if (o.smile) g.ellipse(64, 99, 5, 3, 0, Math.PI*.15, Math.PI*.85); else { g.moveTo(60, 101); g.lineTo(68, 101); }
    g.stroke();
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
  };
  return { open: draw(false), closed: draw(true) };
}
// 頭（肌の球＋顔を貼った前面）
function buildHead(H, skin, face){
  const r = .155;
  mk(H.head, sph(r, 18, 14), clam(skin, { glow: .25 })).scale.set(1, 1.07, 1);
  const tex = faceTextures(face);
  const fm = new THREE.MeshBasicMaterial({ map: tex.open, transparent: true, depthWrite: false });
  const f = mk(H.head, sph(r*1.012, 16, 12, Math.PI/2 - .78, 1.56, Math.PI*.3, Math.PI*.42), fm, 0, 0, 0, false); f.scale.set(1, 1.07, 1);
  f.renderOrder = 2;
  H.face = { mat: fm, tex, t: 2 + Math.random()*2 };
  mk(H.torso, cyl(.04, .046, .12, 10), clam(skin), 0, .7, 0, false);                       // 首
}
// まばたき
function blink(H, dt){
  const f = H.face; if (!f) return; f.t -= dt;
  if (f.t <= 0){ f.mat.map = f.tex.closed; if (f.t < -.12){ f.mat.map = f.tex.open; f.t = 2.5 + Math.random()*3; } }
}
// 体の骨組み（敵と同じ部位の名前）
function charRig(c){
  const root = new THREE.Group(); const rig = new THREE.Group(); rig.position.y = .75; root.add(rig);
  const torso = new THREE.Group(); torso.position.y = .25; rig.add(torso);
  const head = new THREE.Group(); head.position.y = .84; torso.add(head);
  const limb = (p, x, y) => { const g = new THREE.Group(); g.position.set(x, y, 0); p.add(g); return g; };
  const armR = limb(torso, -.25, .54), armL = limb(torso, .25, .54);
  const legR = limb(rig, -.09, .06), legL = limb(rig, .09, .06);
  const wpn = new THREE.Group(); wpn.position.y = -.64; armR.add(wpn);
  const H = { root, rig, torso, head, armR, armL, legR, legL, wpn, tip: null, shieldPivot: null, eyeMat: new THREE.MeshBasicMaterial({ color: c.eye }) };
  // 体
  mk(torso, lathe([[0, -.03], [.15, -.03], [.165, .08], [.148, .22], [.165, .36], [.182, .46], [.155, .56], [.08, .63], [0, .645]], 20), clam(c.torso)).scale.z = .74;
  mk(rig, sph(.16, 14, 10), clam(c.torso), 0, .08, 0, false).scale.set(1, .55, .78);
  // 腕（肩・上腕・手袋）
  [armR, armL].forEach(a => {
    mk(a, sph(.07, 10, 8), clam(c.sleeve), 0, -.02, 0);
    mk(a, cyl(.058, .07, .32, 10), clam(c.sleeve), 0, -.17, 0);
    mk(a, cyl(.034, .036, .08, 8), clam(c.glove), 0, -.6, 0, false);
    mk(a, sph(.048, 10, 8), clam(c.glove), 0, -.67, .005).scale.set(.85, 1.25, .75);
  });
  // 脚（タイツと靴）
  [legR, legL].forEach(l => {
    mk(l, cyl(.066, .048, .72, 10), clam(c.legs), 0, -.37, 0);
    mk(l, sph(.058, 10, 8), clam(c.shoe), 0, -.78, .045).scale.set(.9, .7, 1.7);
    mk(l, cyl(.025, .02, .08, 6), clam(c.shoe), 0, -.8, -.045, false);
  });
  return H;
}
// 釣鐘型の袖（外側と内側のレース）
function bellSleeve(a, outer, inner, rim, prof){
  const pr = prof || [[.068, -.28], [.095, -.38], [.14, -.5], [.175, -.61]];
  mk(a, lathe(pr, 18), clam(outer, { double: true }), 0, 0, 0, false);
  mk(a, lathe([[.055, -.44], [.085, -.53], [.115, -.6]], 14), clam(inner, { double: true }), 0, 0, 0, false);
  if (rim) rimTube(a, pr[pr.length - 1][0], pr[pr.length - 1][1], 0, Math.PI*2, .011, clam(rim), true);
}

// ---------- アスターテ ----------
function buildAstarte(){
  const NAVY = 0x1d2456, GOLD = 0xd0a650, WHITE = 0xe4e2ec, HAIR = 0xe8e9f2;
  const H = charRig({ torso: WHITE, sleeve: NAVY, glove: 0xf4f4f8, legs: 0x16182a, shoe: 0x1a1f48, eye: 0x4a7fe0 });
  buildHead(H, 0xf6e4da, { iris: '#3e7ae0', iris2: '#1a2f78', pupil: '#0e1638', lash: '#2a2230', brow: '#c8c8d4', mouth: '#a8606a' });
  const mGold = clam(GOLD, { glow: .22 }), mNavy = clam(NAVY), mHair = clam(HAIR, { glow: .12 });
  // 髪（白いボブ）：頭頂・前髪・毛先・横髪
  mk(H.head, sph(.165, 18, 12, 0, Math.PI*2, 0, Math.PI*.56), mHair, 0, .012, -.006).scale.set(1, 1.07, 1);
  mk(H.head, sph(.168, 18, 10, Math.PI/2 - 1.05, 2.1, Math.PI*.08, Math.PI*.36), mHair, 0, .012, .004).scale.set(1, 1.07, 1);
  for (let k = -2; k <= 2; k++){
    const phi = Math.PI/2 + k*.38, th = Math.PI*.385, r = .172;
    const tip = mk(H.head, new THREE.ConeGeometry(.03, .06, 4), mHair, -r*Math.cos(phi)*Math.sin(th), r*Math.cos(th)*1.07 - .03, r*Math.sin(phi)*Math.sin(th) - .004);
    tip.rotation.x = Math.PI + .25; tip.rotation.z = -k*.12;
  }
  [-1, 1].forEach(s => { const lock = mk(H.head, sph(.05, 10, 8), mHair, s*.135, -.085, .05); lock.scale.set(.6, 2.3, .95); lock.rotation.z = s*.1; });
  mk(H.head, sph(.13, 14, 10), mHair, 0, -.07, -.06).scale.set(1.1, .9, .9);                // 後ろ髪
  // 猫耳フード（前が開いた殻）＋金の縁
  const hood = new THREE.Group(); hood.position.set(0, .02, -.008); H.head.add(hood);
  const PS = Math.PI/2 + .98, PL = Math.PI*2 - 1.96, TL = Math.PI*.8, HR = .21;
  const hoodMesh = mk(hood, sph(HR, 22, 16, PS, PL, 0, TL), clam(NAVY, { double: true }), 0, 0, 0, false); hoodMesh.scale.set(1, 1.05, 1.02);
  const sp = (phi, th) => new THREE.Vector3(-HR*Math.cos(phi)*Math.sin(th)*1.01, HR*Math.cos(th)*1.06, HR*Math.sin(phi)*Math.sin(th)*1.03);
  const edge = []; for (let i = 10; i >= 1; i--) edge.push(sp(PS, TL*i/10)); edge.push(sp(PS + PL/2, 0)); for (let i = 1; i <= 10; i++) edge.push(sp(PS + PL, TL*i/10));
  mk(hood, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, .012, 4, false), mGold, 0, 0, 0, false);
  for (let i = 1; i <= 7; i++){ const p = sp(PS + .05, TL*i/8); mk(hood, new THREE.OctahedronGeometry(.009), mGold, p.x, p.y, p.z, false); const q = sp(PS + PL - .05, TL*i/8); mk(hood, new THREE.OctahedronGeometry(.009), mGold, q.x, q.y, q.z, false); }
  [-1, 1].forEach(s => {
    const ear = mk(hood, new THREE.ConeGeometry(.08, .19, 4), clam(0xf4f4f8), s*.105, .2, -.02); ear.scale.z = .55; ear.rotation.set(0, Math.PI/4, -s*.38);
    const inner = mk(hood, new THREE.ConeGeometry(.045, .12, 4), clam(0xeaa8b6), s*.1, .195, .012, false); inner.scale.z = .4; inner.rotation.set(0, Math.PI/4, -s*.38);
  });
  // 襟・ケープ・鈴
  mk(H.torso, cyl(.068, .08, .08, 14), clam(WHITE), 0, .64, 0);
  const capeProf = [[.085, .665], [.16, .62], [.25, .52], [.32, .4], [.355, .31]];
  const cape = new THREE.Group(); cape.scale.z = .84; H.torso.add(cape);
  mk(cape, lathe(capeProf, 26), clam(NAVY, { double: true }), 0, 0, 0, false);
  rimTube(cape, .355, .31, 0, Math.PI*2, .012, mGold, true);
  for (let i = 0; i < 12; i++){ const p = latheAt(.345, .345, i/12*Math.PI*2); mk(cape, new THREE.OctahedronGeometry(.012), mGold, p.x, p.y, p.z, false); }
  mk(H.torso, sph(.034, 10, 8), mGold, 0, .6, .115);
  mk(H.torso, new THREE.TorusGeometry(.012, .004, 4, 8), mGold, 0, .64, .11, false);
  // ベルト（月の飾り）とリボン・房
  const belt = mk(H.torso, cyl(.168, .158, .12, 22), mNavy, 0, .03, 0); belt.scale.z = .78;
  mk(H.torso, new THREE.TorusGeometry(.028, .007, 4, 12), mGold, 0, .03, .128, false);
  [-1.0, -.55, .55, 1.0].forEach(a => { const c = mk(H.torso, crescent(.018, .005), mGold, Math.sin(a)*.166, .03, Math.cos(a)*.166*.78 + .004, false); c.rotation.y = a; });
  [-1, 1].forEach(s => { const r = mk(H.torso, new THREE.ConeGeometry(.03, .06, 3), mNavy, s*.035, -.04, .12, false); r.rotation.z = s*Math.PI/2; });
  [[-.07, .12], [-.04, .16]].forEach(([x, l]) => { mk(H.torso, cyl(.004, .004, l, 4), mGold, x, -.06 - l/2, .12, false); mk(H.torso, cyl(.012, .018, .05, 6), mGold, x, -.07 - l, .12, false); });
  // 袖
  [H.armR, H.armL].forEach(a => bellSleeve(a, NAVY, WHITE, GOLD));
  // スカート（白）と前が開いた紺のローブ
  const skirtG = new THREE.Group(); H.rig.add(skirtG);
  mk(skirtG, lathe([[.165, .05], [.22, -.1], [.3, -.36], [.38, -.6], [.42, -.74]], 26), clam(WHITE, { double: true }), 0, 0, 0, false);
  const RP = [[.18, .06], [.25, -.1], [.34, -.36], [.44, -.62], [.5, -.76]], R0 = .42, RL = Math.PI*2 - .84;
  mk(skirtG, lathe(RP, 28, R0, RL), clam(NAVY, { double: true }), 0, 0, 0, false);
  rimTube(skirtG, .5, -.76, R0, RL, .012, mGold);
  edgeTube(skirtG, RP, R0, .01, mGold); edgeTube(skirtG, RP, R0 + RL, .01, mGold);
  [Math.PI - .55, Math.PI + .55].forEach(phi => { const p = latheAt(.47, -.62, phi); const c = mk(skirtG, crescent(.045, .01), mGold, p.x, p.y, p.z, false); c.rotation.y = phi; });
  for (let i = 0; i < 4; i++){ [R0 + .06, R0 + RL - .06].forEach(phi => { const prof = RP[i + 1], p = latheAt(prof[0] + .008, prof[1], phi); mk(skirtG, new THREE.OctahedronGeometry(.014), mGold, p.x, p.y, p.z, false); }); }
  // ふわふわのしっぽ
  const tail = []; let parent = H.rig;
  for (let i = 0; i < 9; i++){
    const g = new THREE.Group(); g.position.set(0, i === 0 ? .02 : .082, i === 0 ? -.22 : 0); parent.add(g);
    mk(g, sph(i === 8 ? .066 : .056 - i*.0015, 10, 8), clam(0xf4f4f8), 0, .04, 0); tail.push(g); parent = g;
  }
  equipVisual(H, 'moonStaff', 'none');
  H.root.scale.setScalar(.95);
  H.anim = (dt, t, spd) => {
    tail.forEach((g, i) => { g.rotation.x = (i === 0 ? -1.15 : .2) + Math.sin(t*3 - i*.6)*.06*(1 + spd*.3); g.rotation.z = Math.sin(t*2.2 - i*.55)*(.1 + spd*.04); });
    skirtG.rotation.x = -Math.min(.12, spd*.02);
    blink(H, dt);
  };
  return H;
}

// ---------- 海音 ----------
function buildUmine(){
  const ROBE = 0x2c3252, HAIR = 0x7eb2ec, GOLD = 0xc2ac6c, LAV = 0xaaa4dc, WHITE = 0xeef2fa;
  const H = charRig({ torso: WHITE, sleeve: ROBE, glove: 0xf6e6dc, legs: 0x262a40, shoe: 0x3c4260, eye: 0x6f74c9 });
  buildHead(H, 0xf7e6da, { iris: '#7a7ee0', iris2: '#2c2c78', pupil: '#16163a', lash: '#2a2840', brow: '#8aaad8', mouth: '#b0606a', smile: true });
  const mHair = clam(HAIR, { glow: .16 }), mGold = clam(GOLD, { glow: .3 }), mRobe = clam(ROBE);
  // 髪：頭頂・前髪・毛先
  mk(H.head, sph(.165, 18, 12, 0, Math.PI*2, 0, Math.PI*.58), mHair, 0, .012, -.006).scale.set(1, 1.07, 1);
  mk(H.head, sph(.168, 18, 10, Math.PI/2 - 1.1, 2.2, Math.PI*.08, Math.PI*.35), mHair, 0, .012, .004).scale.set(1, 1.07, 1);
  for (let k = -2; k <= 2; k++){
    const phi = Math.PI/2 + k*.36, th = Math.PI*.385, r = .172;
    const tip = mk(H.head, new THREE.ConeGeometry(.03, .065, 4), mHair, -r*Math.cos(phi)*Math.sin(th), r*Math.cos(th)*1.07 - .03, r*Math.sin(phi)*Math.sin(th) - .004);
    tip.rotation.x = Math.PI + .25; tip.rotation.z = -k*.14;
  }
  // 腰まで届く波打つ長い髪（房ごとに揺らす）
  const hair = new THREE.Group(); hair.position.set(0, .02, -.01); H.head.add(hair);
  const strands = [];
  const angles = [Math.PI/2 + .35, Math.PI/2 + .8, Math.PI*.82, Math.PI*.93, Math.PI, Math.PI*1.07, Math.PI*1.18, Math.PI*1.5 - .8, Math.PI*1.5 - .35, Math.PI/2 - .45, -(Math.PI/2 - .45)];
  angles.forEach((a0, n) => {
    // a0 はxz平面の角度（0=正面）。前に垂らす2房は短め
    const a = a0, front = n >= 9, len = front ? 4 : 6, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const st = new THREE.Group(); st.position.set(dir.x*.13, -.02, dir.z*.13 + (front ? .02 : 0)); hair.add(st);
    for (let k = 0; k < len; k++){
      const out = .03 + Math.min(k, 3)*.035 + (front ? .02 : 0), wav = Math.sin(k*1.3 + n)*.02;
      const seg = mk(st, sph(.05 - k*.0025, 10, 8), mHair, dir.x*out + dir.z*wav, -.08 - k*.15, dir.z*out - dir.x*wav - (front ? 0 : .02));
      seg.scale.set(1.25, 2.7, .55); seg.rotation.y = a;
    }
    strands.push(st);
  });
  // とんがり帽子（垂れたつば・折れた先・宝石）
  const hat = new THREE.Group(); hat.position.set(0, .135, -.01); hat.rotation.x = -.08; H.head.add(hat);
  const HAT = 0x2a3052, mHat = clam(HAT);
  mk(hat, lathe([[0, .0], [.2, .012], [.4, .0], [.53, -.035], [.59, -.075]], 32), clam(HAT, { double: true }), 0, 0, 0, false);
  rimTube(hat, .59, -.075, 0, Math.PI*2, .01, mGold, true);
  mk(hat, cyl(.205, .218, .075, 22), clam(LAV), 0, .04, 0, false);
  mk(hat, lathe([[.215, 0], [.2, .12], [.165, .26], [.12, .38], [.075, .47], [0, .48]], 20), mHat);
  const t1 = new THREE.Group(); t1.position.y = .45; t1.rotation.z = -.45; hat.add(t1);
  mk(t1, cyl(.06, .075, .14, 12), mHat, 0, .07, 0);
  const t2 = new THREE.Group(); t2.position.y = .14; t2.rotation.z = -.6; t1.add(t2);
  mk(t2, cyl(.036, .06, .14, 10), mHat, 0, .07, 0);
  const t3 = new THREE.Group(); t3.position.y = .14; t3.rotation.z = -.65; t2.add(t3);
  mk(t3, new THREE.ConeGeometry(.036, .13, 10), mHat, 0, .065, 0);
  const gemG = new THREE.Group(); gemG.position.y = .13; t3.add(gemG);
  mk(gemG, cyl(.003, .003, .1, 4), mGold, 0, -.05, 0, false);
  const gem = mk(gemG, new THREE.OctahedronGeometry(.045), new THREE.MeshBasicMaterial({ color: 0x8a96ff }), 0, -.12, 0, false); gem.scale.y = 1.7;
  // 襟・リボン・ブローチ
  mk(H.torso, cyl(.068, .08, .08, 14), clam(WHITE), 0, .64, 0);
  [-1, 1].forEach(s => { const r = mk(H.torso, new THREE.ConeGeometry(.035, .08, 3), clam(0x262a46), s*.04, .56, .12, false); r.rotation.z = s*Math.PI/2; });
  [-1, 1].forEach(s => { const r = mk(H.torso, cyl(.012, .02, .16, 4), clam(0x262a46), s*.02, .46, .125, false); r.rotation.z = s*.15; });
  mk(H.torso, new THREE.OctahedronGeometry(.022), new THREE.MeshBasicMaterial({ color: 0x8a96ff }), 0, .56, .14, false);
  // ローブ（上着と長い裾、前が開く）
  const CP = [[.09, .645], [.19, .57], [.2, .4], [.19, .2], [.2, .02], [.215, -.05]], C0 = .6, CL = Math.PI*2 - 1.2;
  const coat = new THREE.Group(); coat.scale.z = .8; H.torso.add(coat);
  mk(coat, lathe(CP, 24, C0, CL), clam(ROBE, { double: true }), 0, 0, 0, false);
  edgeTube(coat, CP, C0, .009, mGold); edgeTube(coat, CP, C0 + CL, .009, mGold);
  [H.armR, H.armL].forEach(a => bellSleeve(a, ROBE, WHITE, GOLD, [[.07, -.25], [.11, -.38], [.18, -.55], [.235, -.71]]));
  const skirtG = new THREE.Group(); H.rig.add(skirtG);
  mk(skirtG, lathe([[.16, .05], [.24, -.2], [.35, -.5], [.44, -.76]], 26), clam(0xa9c8f0, { double: true }), 0, 0, 0, false);
  mk(skirtG, lathe([[.17, .05], [.25, -.2], [.37, -.5], [.47, -.74]], 26), clam(0xe4ecf8, { double: true, opacity: .82 }), 0, 0, 0, false);
  const RP = [[.2, .06], [.27, -.15], [.38, -.4], [.5, -.66], [.58, -.82]], R0 = .5, RL = Math.PI*2 - 1.0;
  mk(skirtG, lathe(RP, 30, R0, RL), clam(ROBE, { double: true }), 0, 0, 0, false);
  rimTube(skirtG, .58, -.82, R0, RL, .012, mGold);
  edgeTube(skirtG, RP, R0, .01, mGold); edgeTube(skirtG, RP, R0 + RL, .01, mGold);
  [R0 + .25, R0 + RL - .25].forEach(phi => { const p = latheAt(.535, -.68, phi); const c = mk(skirtG, crescent(.05, .01), mGold, p.x, p.y, p.z, false); c.rotation.y = phi; });
  const book = mk(H.rig, new THREE.BoxGeometry(.15, .19, .055), clam(0x22263c), .25, -.03, .1); book.rotation.y = -.5;
  // 編み上げブーツ
  [H.legR, H.legL].forEach(l => mk(l, cyl(.062, .055, .24, 10), clam(0x3c4260), 0, -.66, 0));
  // 水の膜（ガード時）
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(.95, 14, 10), new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bubble.position.set(0, 1.0, .25); bubble.scale.set(1, 1.1, .55); bubble.visible = false; H.root.add(bubble); H.bubble = bubble;
  equipVisual(H, 'staff', 'none');
  H.root.scale.setScalar(.95);
  H.anim = (dt, t, spd) => {
    hair.rotation.x = .05 + Math.min(.4, spd*.065) + Math.sin(t*2)*.025;
    strands.forEach((s, i) => { s.rotation.z = Math.sin(t*1.5 + i*.7)*.035; s.rotation.x = Math.sin(t*1.8 + i)*.02; });
    t1.rotation.z = -.45 + Math.sin(t*2.4)*.05; gem.rotation.y += dt*1.5;
    skirtG.rotation.x = -Math.min(.12, spd*.02);
    if (bubble.visible) bubble.material.opacity = .18 + Math.sin(t*8)*.05;
    blink(H, dt);
  };
  return H;
}

// ---------- 能力 ----------
// stat3 = 3つ目の能力値の名前。近接型は攻撃力、魔法型は魔力とMPが伸びる
const CHARS = {
  astarte: {
    id: 'astarte', name: 'アスターテ', role: '近接型',
    desc: '猫耳フードの旅人。三日月の錫杖のほか、大鎌・弩・三味線・刺剣を使い分ける。',
    start: { r: 'moonStaff', l: 'none', inv: ['moonStaff', 'scythe', 'crossbow', 'shamisen', 'rapier', 'moonblade', 'buckler'] },
    own: ['moonStaff', 'scythe', 'crossbow', 'shamisen', 'rapier'],
    hp: [400, 42], st: [100, 7], atk: [32, 4.8], spell: [26, 3.5], mp: [60, 3], stat3: '筋力', guardChip: .08, build: buildAstarte
  },
  umine: {
    id: 'umine', name: '海音', role: '魔法型',
    desc: '旅好きの水の魔女。水弾と潮渦で離れて戦い、水の膜で身を守る。',
    start: { r: 'staff', l: 'none', inv: ['staff', 'buckler'] },
    hp: [320, 36], st: [95, 7], atk: [16, 1.5], spell: [34, 5], mp: [100, 6], stat3: '理力', caster: true, guardChip: .05, build: buildUmine
  }
};
