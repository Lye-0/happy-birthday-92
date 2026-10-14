'use strict';
const television = document.querySelector('.television');
const power = document.querySelector('.power');
const replay = document.querySelector('#replay');
const mute = document.querySelector('#mute');
const statusText = document.querySelector('#status');
const program = document.querySelector('.program');
const canvas = document.querySelector('.static');
const context = canvas.getContext('2d');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let state = 'off';
let muted = false;
let timers = [];
let noiseFrame = 0;
let audio;
let master;

// A fixed, small set of decorative pieces is reused on every playback.
const confetti = document.querySelector('.confetti');
for (let i = 0; i < 20; i++) {
  const piece = document.createElement('span');
  const side = i % 2;
  piece.style.setProperty('--x', `${side ? 82 + (i * 7 % 15) : 3 + (i * 7 % 15)}%`);
  piece.style.setProperty('--drift', `${(side ? -1 : 1) * (6 + i % 5 * 3)}px`);
  piece.style.setProperty('--delay', `${2.8 + i % 7 * .16}s`);
  piece.style.setProperty('--fall', `${4.2 + i % 4 * .3}s`);
  piece.style.setProperty('--turn', `${(side ? -1 : 1) * (150 + i * 19)}deg`);
  confetti.append(piece);
}

function cancelSequence() {
  timers.forEach(clearTimeout);
  timers = [];
  cancelAnimationFrame(noiseFrame);
}
function later(callback, delay) { timers.push(setTimeout(callback, delay)); }
function setState(next) {
  state = next;
  television.dataset.state = next;
  const on = ['starting', 'playing', 'on'].includes(next);
  power.setAttribute('aria-pressed', String(on));
  power.setAttribute('aria-label', on ? 'テレビの電源を切る' : 'テレビの電源を入れる');
  program.setAttribute('aria-hidden', String(!['playing', 'on'].includes(next)));
  replay.disabled = next !== 'on';
}
function announce(title, subtitle) {
  statusText.replaceChildren(document.createTextNode(title));
  const detail = document.createElement('span');
  detail.textContent = subtitle;
  statusText.append(detail);
}
// Audio is created only inside a user gesture. Failure never blocks the picture.
function clickSound() {
  if (muted) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audio) {
      audio = new Audio();
      master = audio.createGain();
      master.connect(audio.destination);
    }
    master.gain.value = .18;
    audio.resume().catch(() => {});
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * .045), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * .13));
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); };
    source.start();
  } catch { /* Sound is optional, including when denied by the browser. */ }
}
function drawNoise() {
  if (!context || state !== 'starting' || motion.matches) return;
  const frame = context.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < frame.data.length; i += 4) {
    const value = 55 + Math.random() * 125;
    frame.data[i] = value; frame.data[i + 1] = value; frame.data[i + 2] = value; frame.data[i + 3] = 255;
  }
  context.putImageData(frame, 0, 0);
  // Restrained contrast and a capped update rate avoid a harsh flashing effect.
  later(() => { noiseFrame = requestAnimationFrame(drawNoise); }, 80);
}
function finish() {
  cancelSequence();
  setState('on');
  announce('お誕生日、おめでとう。', '電源でおやすみ。もう一度見ることもできます。');
}
function showProgram() {
  cancelSequence();
  setState('playing');
  announce('おじいちゃんの、特別放送。', '家族みんなの気持ちを、こめて。');
  if (motion.matches) finish();
  // Let the one-shot confetti finish; the stars continue in the on state.
  else later(finish, 9000);
}
function start() {
  cancelSequence();
  setState('starting');
  announce('ただいま、準備中です。', 'まもなく特別放送がはじまります。');
  if (motion.matches) { showProgram(); return; }
  drawNoise();
  later(showProgram, 1650);
}
function stop() {
  cancelSequence();
  setState('stopping');
  announce('電源を入れてください', '小さな特別番組が、はじまります。');
  if (motion.matches) setState('off');
  else later(() => setState('off'), 400);
}
power.addEventListener('click', () => {
  clickSound();
  if (['off', 'stopping'].includes(state)) start();
  else stop();
});
replay.addEventListener('click', () => { if (state === 'on') { clickSound(); start(); } });
mute.addEventListener('click', () => {
  muted = !muted;
  mute.setAttribute('aria-pressed', String(muted));
  mute.querySelector('span').textContent = muted ? '消音中' : '音あり';
  if (master) master.gain.value = muted ? 0 : .18;
});
motion.addEventListener('change', () => {
  if (!motion.matches) return;
  if (['starting', 'playing'].includes(state)) finish();
  else if (state === 'stopping') { cancelSequence(); setState('off'); }
});


