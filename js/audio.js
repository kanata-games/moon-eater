'use strict';
// =========================================================
// audio.js — 効果音とボス戦の低音（音声ファイルなし、その場で合成）
// =========================================================
let AC = null, master = null, nbuf = null, drone = null;
function audioInit(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  master = AC.createGain(); master.gain.value = .55; master.connect(AC.destination);
  const len = AC.sampleRate * 2; nbuf = AC.createBuffer(1, len, AC.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1;
  // 風の音
  const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280; const g = AC.createGain(); g.gain.value = .05; s.connect(f).connect(g).connect(master); s.start();
}
function nz(dur, freq, q, gain, type = 'bandpass', fEnd){
  if (!AC) return; const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (fEnd) f.frequency.exponentialRampToValueAtTime(fEnd, t + dur); f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tn(freq, dur, type, gain, fEnd, delay = 0){
  if (!AC) return; const t = AC.currentTime + delay;
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
}
const sfx = {
  swing(h){ nz(h ? .32 : .2, h ? 600 : 1100, .9, h ? .32 : .22, 'bandpass', h ? 250 : 500); },
  hit(){ nz(.14, 900, 1, .45, 'lowpass', 200); tn(110, .16, 'sine', .45, 50); },
  crit(){ nz(.3, 700, 1, .6, 'lowpass', 120); tn(80, .4, 'sine', .6, 35); tn(1600, .25, 'triangle', .1, 600, .05); },
  block(){ tn(1500, .14, 'square', .07, 900); nz(.1, 3200, 2, .22); },
  guardBreak(){ tn(700, .3, 'square', .1, 200); nz(.3, 1500, 1, .3, 'bandpass', 300); },
  parry(){ tn(2300, .45, 'triangle', .22, 2100); tn(3450, .35, 'sine', .12); nz(.1, 5000, 2, .2); },
  roll(){ nz(.3, 380, .7, .28, 'lowpass', 120); },
  hurt(){ nz(.18, 600, 1, .45, 'lowpass', 150); tn(160, .2, 'sawtooth', .12, 70); },
  die(){ tn(98, 3, 'sawtooth', .16, 41); tn(146, 3, 'sine', .14, 61); nz(1.5, 300, .5, .25, 'lowpass', 80); },
  rest(){ nz(1.2, 500, .5, .3, 'lowpass', 2000); tn(392, 1.4, 'sine', .09, 392, .2); tn(587, 1.4, 'sine', .07, 587, .45); },
  soul(){ tn(660, .35, 'sine', .14, 990); tn(990, .45, 'sine', .08, 1320, .08); },
  kill(){ nz(.6, 1800, 1, .12, 'bandpass', 600); tn(440, .5, 'sine', .07, 880); },
  roar(){ tn(72, 1.7, 'sawtooth', .3, 42); tn(108, 1.5, 'square', .08, 60); nz(1.5, 260, .6, .4, 'lowpass', 90); },
  slam(){ tn(55, .7, 'sine', .7, 28); nz(.6, 220, .6, .6, 'lowpass', 60); },
  heal(){ tn(523, .6, 'sine', .14, 784); tn(784, .6, 'sine', .08, 1046, .12); },
  glint(){ tn(2800, .12, 'sine', .05, 3400); },
  victory(){ [392, 494, 587, 784].forEach((f, i) => tn(f, 2.6, 'triangle', .07, f, i*.12)); },
  gate(){ nz(1.0, 2000, .5, .2, 'bandpass', 400); },
  warp(){ nz(1.4, 300, .6, .3, 'bandpass', 3000); tn(220, 1.4, 'sine', .1, 880); },
  levelUp(){ tn(523, .5, 'triangle', .1, 523); tn(659, .5, 'triangle', .08, 659, .08); tn(784, .7, 'triangle', .08, 784, .16); }
};
function droneOn(){
  if (!AC || drone) return; const g = AC.createGain(); g.gain.value = .0001; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340; f.connect(g).connect(master);
  const os = [55, 55.6, 82.4].map((fr, i) => { const o = AC.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
  g.gain.exponentialRampToValueAtTime(.075, AC.currentTime + 2); drone = { g, os };
}
function droneOff(){ if (!drone || !AC) return; const d = drone; drone = null; d.g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + 1.5); setTimeout(() => d.os.forEach(o => o.stop()), 1700); }
