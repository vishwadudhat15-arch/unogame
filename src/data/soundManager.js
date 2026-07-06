/**
 * UNO Flip Sound Manager — Web Audio API Synthesizer
 * All sounds are generated procedurally. No audio files required.
 * Includes master mute/unmute support via localStorage persistence.
 */

let _ctx = null;
let _muted = localStorage.getItem('uno_muted') === 'true';

/** Get or create the AudioContext */
function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ─── Mute Controls ────────────────────────────────────────────────────────────
export function isMuted() { return _muted; }

export function setMuted(val) {
  _muted = val;
  localStorage.setItem('uno_muted', val ? 'true' : 'false');
}

export function toggleMute() {
  setMuted(!_muted);
  return _muted;
}

// ─── Low-level Synthesizers ────────────────────────────────────────────────────

function playTone(frequency, duration, type = 'sine', gainVal = 0.3, when = 0) {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + when);
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + duration + 0.02);
}

function playNoise(duration = 0.15, gainVal = 0.08, when = 0) {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(ctx.currentTime + when);
  source.stop(ctx.currentTime + when + duration + 0.02);
}

// ─── Public Sound Functions ────────────────────────────────────────────────────

/** Number card played — crisp whoosh + tick */
export function soundCardPlay() {
  playNoise(0.06, 0.12);
  playTone(800, 0.07, 'square', 0.08, 0.03);
  playTone(1200, 0.05, 'sine', 0.06, 0.06);
}

/** Card drawn from deck — soft thud */
export function soundCardDraw() {
  playNoise(0.08, 0.09);
  playTone(350, 0.10, 'sine', 0.12, 0.0);
  playTone(280, 0.09, 'sine', 0.08, 0.05);
}

/** Reverse card — two-tone ping */
export function soundReverse() {
  playTone(660, 0.12, 'sine', 0.22, 0.0);
  playTone(440, 0.15, 'sine', 0.18, 0.13);
  playTone(550, 0.10, 'triangle', 0.14, 0.26);
}

/** Skip / Block card — hard buzz drop */
export function soundSkip() {
  playTone(900, 0.06, 'sawtooth', 0.18, 0.0);
  playTone(600, 0.08, 'sawtooth', 0.14, 0.07);
  playTone(300, 0.12, 'square', 0.10, 0.14);
}

/** Draw penalty cards — rapid descending tones */
export function soundDrawPenalty(count = 2) {
  const steps = Math.min(count, 5);
  for (let i = 0; i < steps; i++) {
    playTone(500 - i * 55, 0.08, 'triangle', 0.15, i * 0.09);
    playNoise(0.04, 0.07, i * 0.09 + 0.03);
  }
}

/** Wild card — magical shimmer arpeggio */
export function soundWild() {
  const freqs = [523, 659, 784, 1047, 1319];
  freqs.forEach((f, i) => playTone(f, 0.12, 'sine', 0.14, i * 0.06));
}

/** Flip card (dark/light side switch) — dramatic swipe */
export function soundFlip() {
  playNoise(0.18, 0.15);
  playTone(200, 0.25, 'sawtooth', 0.18, 0.0);
  playTone(800, 0.18, 'sine', 0.15, 0.10);
  playTone(1200, 0.12, 'sine', 0.12, 0.22);
}

/** UNO called — sharp ascending alert */
export function soundUno() {
  playTone(880, 0.08, 'square', 0.25, 0.0);
  playTone(1100, 0.10, 'square', 0.22, 0.09);
  playTone(1320, 0.14, 'sine', 0.20, 0.18);
}

/** Round / Game Won — triumphant fanfare */
export function soundWin() {
  const melody = [
    [523, 0.0], [659, 0.12], [784, 0.24],
    [1047, 0.36], [1319, 0.50], [1047, 0.64],
    [1319, 0.76], [1568, 0.90],
  ];
  melody.forEach(([freq, when]) => playTone(freq, 0.18, 'sine', 0.20, when));
}

/** Color picker opened — bright ding */
export function soundColorPick() {
  playTone(880, 0.10, 'sine', 0.20, 0.0);
  playTone(1100, 0.08, 'sine', 0.16, 0.10);
}

/** Shuffle / new game start — rapid card rustle */
export function soundShuffle() {
  for (let i = 0; i < 6; i++) {
    playNoise(0.06, 0.10, i * 0.07);
    playTone(300 + i * 40, 0.05, 'triangle', 0.08, i * 0.07 + 0.02);
  }
}

/**
 * Master dispatcher — picks the right sound for any card type.
 * Call this whenever any card is played.
 */
export function soundForCard(card) {
  if (!card) return soundCardPlay();
  const t = card.type;
  if (t === 'reverse')                  return soundReverse();
  if (t === 'skip' || t === 'skip_everyone') return soundSkip();
  if (t === 'draw_one')                 { soundSkip(); setTimeout(() => soundDrawPenalty(1), 130); return; }
  if (t === 'draw_five')                { soundSkip(); setTimeout(() => soundDrawPenalty(5), 130); return; }
  if (t === 'wild')                     return soundWild();
  if (t === 'wild_draw_two')            { soundWild(); setTimeout(() => soundDrawPenalty(2), 200); return; }
  if (t === 'wild_draw_color')          { soundWild(); setTimeout(() => soundSkip(), 200); return; }
  if (t === 'flip')                     return soundFlip();
  return soundCardPlay();
}
