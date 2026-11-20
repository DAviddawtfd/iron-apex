// Короткие сигналы через Web Audio API — без аудиофайлов.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Вызывать из обработчика жеста пользователя, иначе браузер не даст играть звук */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gain = 0.2) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

export type BeepKind = 'end' | 'tick' | 'done';

export function beep(kind: BeepKind = 'end') {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.01;
  if (kind === 'tick') tone(c, 880, t, 0.08, 0.12);
  else if (kind === 'done') {
    tone(c, 660, t, 0.12);
    tone(c, 990, t + 0.13, 0.18);
  } else {
    tone(c, 880, t, 0.14);
    tone(c, 880, t + 0.2, 0.14);
    tone(c, 1320, t + 0.4, 0.3);
  }
}
