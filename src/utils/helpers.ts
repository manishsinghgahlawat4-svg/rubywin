// ---------- Deterministic RNG ----------
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRng(key: string): () => number {
  return mulberry32(hashString(key));
}

let nonceCounter = Math.floor(Math.random() * 1e9);
/** Fresh RNG for instant games: deterministic per nonce, unpredictable per session */
export function freshRng(tag: string): { rng: () => number; nonce: number } {
  nonceCounter += 1;
  const nonce = nonceCounter;
  return { rng: seededRng(`${tag}:${nonce}:${Date.now()}`), nonce };
}

export function randomHex(rng: () => number, length: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(rng() * 16)];
  return out;
}

export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

// ---------- Formatting ----------
export function formatMoney(n: number, digits = 2): string {
  const v = Number.isFinite(n) ? n : 0;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return formatMoney(n, 0);
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function todayKey(ts = Date.now()): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function startOfDay(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function maskString(s: string, start = 2, end = 2): string {
  if (s.length <= start + end) return s;
  return `${s.slice(0, start)}${"*".repeat(Math.min(6, s.length - start - end))}${s.slice(-end)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------- Lottery rounds ----------
export interface RoundInfo {
  periodId: string;
  index: number;
  remainingMs: number;
  durationMs: number;
  startTs: number;
  endTs: number;
}

export function getRound(durationSec: number, now = Date.now()): RoundInfo {
  const durationMs = durationSec * 1000;
  const dayStart = startOfDay(now);
  const elapsed = now - dayStart;
  const index = Math.floor(elapsed / durationMs);
  const startTs = dayStart + index * durationMs;
  const endTs = startTs + durationMs;
  return {
    periodId: `${todayKey(now)}${String(index + 1).padStart(5, "0")}`,
    index,
    remainingMs: endTs - now,
    durationMs,
    startTs,
    endTs,
  };
}

/** Returns period ids for previous N rounds (most recent first), spanning across days */
export function previousPeriods(durationSec: number, count: number, now = Date.now()): { periodId: string; ts: number }[] {
  const out: { periodId: string; ts: number }[] = [];
  const durationMs = durationSec * 1000;
  for (let i = 1; i <= count; i++) {
    const ts = now - i * durationMs;
    const r = getRound(durationSec, ts);
    out.push({ periodId: r.periodId, ts: r.startTs });
  }
  return out;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
    resolve();
  });
}

export const MOCK_NAMES = [
  "Mem***GH", "Raj***12", "Pri***ya", "Ank***sh", "Vik***ram", "Nee***ha", "Sur***esh", "Dee***ka",
  "Ami***bh", "Kav***ta", "Roh***it", "Sne***ha", "Man***oj", "Poo***ja", "Arj***un", "Isha***nt",
];
