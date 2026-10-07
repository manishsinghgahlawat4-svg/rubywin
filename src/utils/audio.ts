import { hashString } from "./helpers";

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export function isSoundEnabled() {
  return enabled;
}

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Unlock audio on first user gesture */
export function initAudio() {
  const unlock = () => {
    getCtx();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function beep(freq = 880, duration = 0.08, type: OscillatorType = "sine", volume = 0.08, when = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + when);
  gain.gain.setValueAtTime(0.0001, c.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + when);
  osc.stop(c.currentTime + when + duration + 0.02);
}

export const sfx = {
  click: () => beep(600, 0.05, "square", 0.04),
  tick: () => beep(1200, 0.05, "sine", 0.05),
  tickUrgent: () => beep(1600, 0.07, "square", 0.06),
  bet: () => {
    beep(700, 0.06, "triangle", 0.06);
    beep(1000, 0.08, "triangle", 0.06, 0.07);
  },
  win: () => {
    beep(659, 0.1, "triangle", 0.08);
    beep(784, 0.1, "triangle", 0.08, 0.1);
    beep(1047, 0.2, "triangle", 0.08, 0.2);
    beep(1319, 0.25, "triangle", 0.07, 0.32);
  },
  bigWin: () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => beep(f, 0.15, "triangle", 0.08, i * 0.09));
  },
  lose: () => {
    beep(300, 0.15, "sawtooth", 0.05);
    beep(200, 0.25, "sawtooth", 0.05, 0.13);
  },
  cashout: () => {
    beep(880, 0.08, "sine", 0.08);
    beep(1320, 0.15, "sine", 0.08, 0.08);
  },
  crash: () => {
    beep(180, 0.3, "sawtooth", 0.07);
    beep(90, 0.4, "sawtooth", 0.06, 0.1);
  },
  reveal: () => beep(900, 0.05, "sine", 0.05),
  coin: () => {
    beep(1800, 0.05, "square", 0.04);
    beep(2400, 0.08, "square", 0.04, 0.05);
  },
  error: () => beep(220, 0.2, "square", 0.05),
  notify: () => {
    beep(1000, 0.08, "sine", 0.06);
    beep(1500, 0.1, "sine", 0.06, 0.1);
  },
};

export type GameSoundEvent = "tap" | "bet" | "spin" | "roll" | "reveal" | "step" | "cashout" | "win" | "lose" | "crash";

/** Small oscillator motifs give each game a recognisable sound without shipping audio assets. */
export function gameSfx(gameId: string, event: GameSoundEvent) {
  const signature = hashString(gameId);
  const base = 240 + (signature % 9) * 31;
  const wave: OscillatorType = ["sine", "triangle", "square", "sawtooth"][(signature >>> 5) % 4] as OscillatorType;
  const note = (step: number) => base + step * (65 + (signature % 5) * 9);

  if (event === "tap") {
    beep(note(3), 0.035, wave, 0.025);
    return;
  }
  if (event === "bet") {
    beep(note(1), 0.06, "triangle", 0.045);
    beep(note(4), 0.09, "triangle", 0.04, 0.065);
    return;
  }
  if (event === "spin") {
    [0, 2, 1, 3, 2, 4].forEach((n, i) => beep(note(n), 0.045, wave, 0.035, i * 0.06));
    return;
  }
  if (event === "roll") {
    [4, 1, 3, 0].forEach((n, i) => beep(note(n), 0.055, "square", 0.025, i * 0.075));
    return;
  }
  if (event === "reveal") {
    beep(note(5), 0.055, "sine", 0.04);
    beep(note(7), 0.08, "sine", 0.035, 0.06);
    return;
  }
  if (event === "step") {
    beep(note(2), 0.05, wave, 0.035);
    return;
  }
  if (event === "cashout") {
    [4, 6, 8].forEach((n, i) => beep(note(n), 0.09, "triangle", 0.055, i * 0.08));
    return;
  }
  if (event === "win") {
    [0, 2, 4, 7].forEach((n, i) => beep(note(n), 0.13, "triangle", 0.06, i * 0.095));
    return;
  }
  if (event === "lose") {
    beep(note(3), 0.11, wave, 0.035);
    beep(note(1), 0.16, wave, 0.035, 0.11);
    beep(note(-1), 0.18, wave, 0.03, 0.23);
    return;
  }
  if (event === "crash") {
    beep(note(0), 0.2, "sawtooth", 0.05);
    beep(Math.max(70, note(-3)), 0.3, "sawtooth", 0.045, 0.1);
  }
}
