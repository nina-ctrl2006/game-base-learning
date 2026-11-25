// Lightweight procedural Web Audio synthesizer for GameSimulator feedback

let muted = false;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(nextMuted: boolean): void {
  muted = nextMuted;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  delay = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {
    // Ignore audio context restrictions in headless/restricted browsers
  }
}

export function playClickSfx() {
  playTone(540, 0.06, 'triangle', 0.05);
}

export function playSnapSfx() {
  playTone(620, 0.07, 'sine', 0.06, 0);
  playTone(840, 0.09, 'sine', 0.06, 0.05);
}

export function playHintSfx() {
  playTone(720, 0.09, 'sine', 0.05, 0);
  playTone(960, 0.12, 'triangle', 0.05, 0.07);
}

export function playCorrectSfx(streak = 1) {
  const pitchBoost = Math.min(streak - 1, 5) * 40;
  playTone(523.25 + pitchBoost, 0.11, 'triangle', 0.08, 0);
  playTone(659.25 + pitchBoost, 0.12, 'triangle', 0.08, 0.08);
  playTone(783.99 + pitchBoost, 0.18, 'sine', 0.09, 0.16);
}

export function playWrongSfx() {
  playTone(260, 0.14, 'sawtooth', 0.04, 0);
  playTone(210, 0.2, 'sawtooth', 0.04, 0.11);
}

export function playMissionCompleteSfx() {
  playTone(523.25, 0.12, 'triangle', 0.08, 0);
  playTone(659.25, 0.12, 'triangle', 0.08, 0.1);
  playTone(783.99, 0.14, 'triangle', 0.08, 0.2);
  playTone(1046.5, 0.3, 'sine', 0.1, 0.3);
}
