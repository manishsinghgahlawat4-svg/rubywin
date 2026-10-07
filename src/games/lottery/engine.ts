import { randomHex, seededRng, startOfDay } from "../../utils/helpers";

export type LotteryGame = "wingo" | "trx" | "k3" | "5d";
export const LOTTERY_GAMES: LotteryGame[] = ["wingo", "trx", "k3", "5d"];
export const DURATIONS = [30, 60, 180, 300];
export const DURATION_LABELS: Record<number, string> = { 30: "30s", 60: "1 min", 180: "3 min", 300: "5 min" };

export type WinGoColor = "red" | "green" | "red-violet" | "green-violet";

export interface WinGoResult {
  number: number;
  color: WinGoColor;
  size: "big" | "small";
}
export interface TrxResult extends WinGoResult {
  hash: string;
  block: number;
}
export interface K3Result {
  dice: [number, number, number];
  sum: number;
  size: "big" | "small";
  parity: "odd" | "even";
}
export interface FiveDResult {
  digits: [number, number, number, number, number];
  sum: number;
}

export function colorOf(n: number): WinGoColor {
  if (n === 0) return "red-violet";
  if (n === 5) return "green-violet";
  return n % 2 === 0 ? "red" : "green";
}

export function wingoResult(periodId: string, duration: number): WinGoResult {
  const rng = seededRng(`wingo:${duration}:${periodId}`);
  const number = Math.floor(rng() * 10);
  return { number, color: colorOf(number), size: number >= 5 ? "big" : "small" };
}

export function trxResult(periodId: string, duration: number): TrxResult {
  const rng = seededRng(`trx:${duration}:${periodId}`);
  const hash = randomHex(rng, 64);
  const block = 61000000 + Math.floor(rng() * 900000) + parseInt(periodId.slice(-5), 10) * 20;
  let number = 0;
  for (let i = hash.length - 1; i >= 0; i--) {
    const c = hash[i];
    if (c >= "0" && c <= "9") {
      number = parseInt(c, 10);
      break;
    }
  }
  return { number, color: colorOf(number), size: number >= 5 ? "big" : "small", hash, block };
}

export function k3Result(periodId: string, duration: number): K3Result {
  const rng = seededRng(`k3:${duration}:${periodId}`);
  const dice: [number, number, number] = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
  const sum = dice[0] + dice[1] + dice[2];
  return { dice, sum, size: sum >= 11 ? "big" : "small", parity: sum % 2 === 0 ? "even" : "odd" };
}

export function fiveDResult(periodId: string, duration: number): FiveDResult {
  const rng = seededRng(`5d:${duration}:${periodId}`);
  const digits = [0, 0, 0, 0, 0].map(() => Math.floor(rng() * 10)) as [number, number, number, number, number];
  return { digits, sum: digits.reduce((a, b) => a + b, 0) };
}

export const K3_SUM_ODDS: Record<number, number> = {
  3: 207.36, 18: 207.36, 4: 69.12, 17: 69.12, 5: 34.56, 16: 34.56, 6: 20.74, 15: 20.74,
  7: 13.83, 14: 13.83, 8: 9.88, 13: 9.88, 9: 8.3, 12: 8.3, 10: 7.68, 11: 7.68,
};

/** Human readable odds for a selection code */
export function selectionOdds(game: LotteryGame, selection: string): number {
  if (game === "wingo" || game === "trx") {
    if (selection === "violet") return 4.5;
    if (selection.startsWith("n")) return 9;
    return 2;
  }
  if (game === "k3") {
    if (selection.startsWith("sum")) return K3_SUM_ODDS[parseInt(selection.slice(3), 10)] ?? 0;
    if (selection === "big" || selection === "small" || selection === "odd" || selection === "even") return 2;
    if (selection === "pairAny") return 13.83;
    if (selection.startsWith("pair")) return 13.83;
    if (selection === "tripleAny") return 34.56;
    if (selection.startsWith("triple")) return 207.36;
    if (selection === "straight") return 8.64;
    if (selection.startsWith("diff")) return 34.56;
    return 0;
  }
  // 5d
  const [, type] = selection.split("-");
  if (type && type.startsWith("n")) return 9;
  return 2;
}

export function selectionLabel(game: LotteryGame, selection: string): string {
  if (game === "wingo" || game === "trx") {
    if (selection.startsWith("n")) return `Number ${selection.slice(1)}`;
    return selection.charAt(0).toUpperCase() + selection.slice(1);
  }
  if (game === "k3") {
    if (selection.startsWith("sum")) return `Total ${selection.slice(3)}`;
    if (selection === "pairAny") return "Any Pair";
    if (selection.startsWith("pair")) return `Pair of ${selection.slice(4)}`;
    if (selection === "tripleAny") return "Any Triple";
    if (selection.startsWith("triple")) return `Triple ${selection.slice(6)}`;
    if (selection === "straight") return "Straight";
    if (selection.startsWith("diff")) return `Different ${selection.slice(4).split("").join(",")}`;
    return selection.charAt(0).toUpperCase() + selection.slice(1);
  }
  const [pos, type] = selection.split("-");
  const typeLabel = type.startsWith("n") ? `Number ${type.slice(1)}` : type.charAt(0).toUpperCase() + type.slice(1);
  return `${pos === "SUM" ? "Sum" : pos}: ${typeLabel}`;
}

/** Computes payout (0 if lost) for a settled lottery bet */
export function calcLotteryPayout(game: LotteryGame, selection: string, amount: number, periodId: string, duration: number): number {
  const pay = (odds: number) => Math.round(amount * odds * 100) / 100;
  if (game === "wingo" || game === "trx") {
    const r = game === "wingo" ? wingoResult(periodId, duration) : trxResult(periodId, duration);
    const n = r.number;
    switch (selection) {
      case "green":
        if (n === 5) return pay(1.5);
        return [1, 3, 7, 9].includes(n) ? pay(2) : 0;
      case "red":
        if (n === 0) return pay(1.5);
        return [2, 4, 6, 8].includes(n) ? pay(2) : 0;
      case "violet":
        return n === 0 || n === 5 ? pay(4.5) : 0;
      case "big":
        return n >= 5 ? pay(2) : 0;
      case "small":
        return n < 5 ? pay(2) : 0;
      default:
        if (selection.startsWith("n")) return parseInt(selection.slice(1), 10) === n ? pay(9) : 0;
        return 0;
    }
  }
  if (game === "k3") {
    const r = k3Result(periodId, duration);
    const [a, b, c] = r.dice;
    const sorted = [...r.dice].sort((x, y) => x - y);
    const isTriple = a === b && b === c;
    const isPair = !isTriple && (a === b || b === c || a === c);
    const isStraight = sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
    if (selection.startsWith("sum")) return r.sum === parseInt(selection.slice(3), 10) ? pay(K3_SUM_ODDS[r.sum]) : 0;
    if (selection === "big") return r.size === "big" && !isTriple ? pay(2) : 0;
    if (selection === "small") return r.size === "small" && !isTriple ? pay(2) : 0;
    if (selection === "odd") return r.parity === "odd" && !isTriple ? pay(2) : 0;
    if (selection === "even") return r.parity === "even" && !isTriple ? pay(2) : 0;
    if (selection === "pairAny") return isPair ? pay(13.83) : 0;
    if (selection.startsWith("pair")) {
      const v = parseInt(selection.slice(4), 10);
      const count = r.dice.filter((d) => d === v).length;
      return count === 2 ? pay(13.83) : 0;
    }
    if (selection === "tripleAny") return isTriple ? pay(34.56) : 0;
    if (selection.startsWith("triple")) return isTriple && a === parseInt(selection.slice(6), 10) ? pay(207.36) : 0;
    if (selection === "straight") return isStraight ? pay(8.64) : 0;
    if (selection.startsWith("diff")) {
      const nums = selection.slice(4).split("").map((x) => parseInt(x, 10)).sort((x, y) => x - y);
      return nums.length === 3 && nums.every((n, i) => n === sorted[i]) ? pay(34.56) : 0;
    }
    return 0;
  }
  // 5D
  const r = fiveDResult(periodId, duration);
  const [pos, type] = selection.split("-");
  const posIndex = ["A", "B", "C", "D", "E"].indexOf(pos);
  if (pos === "SUM") {
    if (type === "big") return r.sum >= 23 ? pay(2) : 0;
    if (type === "small") return r.sum < 23 ? pay(2) : 0;
    if (type === "odd") return r.sum % 2 === 1 ? pay(2) : 0;
    if (type === "even") return r.sum % 2 === 0 ? pay(2) : 0;
    return 0;
  }
  if (posIndex < 0) return 0;
  const d = r.digits[posIndex];
  if (type.startsWith("n")) return d === parseInt(type.slice(1), 10) ? pay(9) : 0;
  if (type === "big") return d >= 5 ? pay(2) : 0;
  if (type === "small") return d < 5 ? pay(2) : 0;
  if (type === "odd") return d % 2 === 1 ? pay(2) : 0;
  if (type === "even") return d % 2 === 0 ? pay(2) : 0;
  return 0;
}

/** Derive the end timestamp of a period from its id (YYYYMMDD + 5-digit index) */
export function periodEndTs(periodId: string, duration: number): number {
  const y = parseInt(periodId.slice(0, 4), 10);
  const m = parseInt(periodId.slice(4, 6), 10) - 1;
  const d = parseInt(periodId.slice(6, 8), 10);
  const idx = parseInt(periodId.slice(8), 10) - 1;
  const dayStart = startOfDay(new Date(y, m, d).getTime());
  return dayStart + (idx + 1) * duration * 1000;
}

export function resultSummary(game: LotteryGame, periodId: string, duration: number): string {
  if (game === "wingo") {
    const r = wingoResult(periodId, duration);
    return `${r.number} · ${r.size} · ${r.color}`;
  }
  if (game === "trx") {
    const r = trxResult(periodId, duration);
    return `${r.number} · ${r.size} · hash ...${r.hash.slice(-6)}`;
  }
  if (game === "k3") {
    const r = k3Result(periodId, duration);
    return `${r.dice.join("+")} = ${r.sum} · ${r.size} · ${r.parity}`;
  }
  const r = fiveDResult(periodId, duration);
  return `${r.digits.join(" ")} = ${r.sum}`;
}
