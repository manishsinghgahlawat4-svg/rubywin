import React, { useEffect, useRef, useState } from "react";
import { Shuffle, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { BetAmountPanel, Button, Card, ResultBanner, Stat, Tabs } from "../components/UI";
import { GameShell } from "./GameShell";
import { cn } from "../utils/cn";
import { formatMoney, freshRng } from "../utils/helpers";
import { gameSfx, sfx } from "../utils/audio";

// ================= PLINKO =================
type Risk = "low" | "medium" | "high";
const PLINKO_TABLE: Record<number, Record<Risk, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

interface Ball {
  id: number;
  path: number[]; // 0 left, 1 right
  row: number; // rows completed
  betId: string;
  amount: number;
}

const binColor = (m: number) => (m >= 10 ? "#e11d48" : m >= 2 ? "#f59e0b" : m >= 1 ? "#10b981" : "#475569");

export const Plinko: React.FC = () => {
  const { placeBet, settleBet } = useApp();
  const [amount, setAmount] = useState(10);
  const [rows, setRows] = useState<8 | 12 | 16>(12);
  const [risk, setRisk] = useState<Risk>("medium");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastHits, setLastHits] = useState<number[]>([]);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const [flashBin, setFlashBin] = useState<number | null>(null);
  const idRef = useRef(0);
  const ballsRef = useRef<Ball[]>([]);

  const table = PLINKO_TABLE[rows][risk];
  const W = 320;
  const H = 360;
  const cx = W / 2;
  const s = (W - 20) / (rows + 1);
  const vs = (H - 70) / rows;
  const topY = 30;

  useEffect(() => {
    ballsRef.current = balls;
  }, [balls]);

  const drop = () => {
    const id = placeBet({ game: "plinko", selection: `${rows}-${risk}`, selectionLabel: `Plinko · ${rows} rows · ${risk}`, amount });
    if (!id) return;
    gameSfx("plinko", "bet");
    setResult(null);
    const { rng } = freshRng("plinko");
    const path: number[] = Array.from({ length: rows }).map(() => (rng() < 0.5 ? 0 : 1));
    const ball: Ball = { id: ++idRef.current, path, row: 0, betId: id, amount };
    setBalls((b) => [...b, ball]);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      gameSfx("plinko", "step");
      setBalls((bs) => bs.map((b) => (b.id === ball.id ? { ...b, row: step } : b)));
      if (step >= rows) {
        clearInterval(timer);
        const bin = path.reduce((a, b) => a + b, 0);
        const mult = table[bin];
        const payout = Math.round(amount * mult * 100) / 100;
        settleBet(id, payout, `Landed in ${mult}x bin`);
        setLastHits((h) => [mult, ...h].slice(0, 10));
        setFlashBin(bin);
        setTimeout(() => setFlashBin(null), 500);
        setResult({ win: mult >= 1, amount: mult >= 1 ? payout : amount - payout, text: `${mult}x multiplier · payout ${formatMoney(payout)}` });
        gameSfx("plinko", mult >= 1 ? "win" : "lose");
        setTimeout(() => setBalls((bs) => bs.filter((b) => b.id !== ball.id)), 400);
      }
    }, 130);
  };

  const ballPos = (b: Ball) => {
    if (b.row === 0) return { x: cx, y: 8 };
    const k = b.path.slice(0, b.row).reduce((a, v) => a + v, 0);
    return { x: cx + (k - b.row / 2) * s, y: topY + (b.row - 1) * vs + vs / 2 };
  };

  return (
    <GameShell
      title="Plinko"
      gameId="plinko"
      rules={[
        "Choose the number of rows (8/12/16) and a risk level, then drop the ball.",
        "The ball bounces left or right at every peg and lands in a multiplier bin.",
        "Edge bins pay the highest multipliers; center bins the lowest. Higher risk = more extreme multipliers.",
        "Multiple balls can be in play at once.",
      ]}
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-h-[28px]">
        {lastHits.map((m, i) => (
          <span key={i} className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", i === 0 && "animate-pop")} style={{ borderColor: binColor(m), color: binColor(m), background: `${binColor(m)}22` }}>
            {m}x
          </span>
        ))}
      </div>

      <Card className="p-2 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: r + 3 }).map((_, i) => (
              <circle key={`${r}-${i}`} cx={cx + (i - (r + 2) / 2) * s} cy={topY + r * vs} r={Math.max(2.2, s * 0.14)} fill="#cbd5e1" />
            ))
          )}
          {table.map((m, k) => {
            const x = cx + (k - rows / 2) * s;
            const bw = s * 0.9;
            return (
              <g key={k} className={cn("transition-transform", flashBin === k && "animate-pop")}>
                <rect x={x - bw / 2} y={topY + rows * vs - 2} width={bw} height={rows === 16 ? 16 : 20} rx={3} fill={binColor(m)} />
                <text x={x} y={topY + rows * vs + (rows === 16 ? 9.5 : 11.5)} textAnchor="middle" dominantBaseline="middle" fontSize={rows === 16 ? 5.5 : rows === 12 ? 7.5 : 9} fontWeight={800} fill="#fff">
                  {m}x
                </text>
              </g>
            );
          })}
          {balls.map((b) => {
            const p = ballPos(b);
            return <circle key={b.id} cx={p.x} cy={p.y} r={Math.max(4, s * 0.28)} fill="#fbbf24" stroke="#fff" strokeWidth={1.5} style={{ transition: "cx 0.13s linear, cy 0.13s ease-in" }} />;
          })}
        </svg>
      </Card>

      <ResultBanner result={result} />

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-white/50 mb-1">Rows</p>
            <Tabs tabs={[{ id: "8", label: "8" }, { id: "12", label: "12" }, { id: "16", label: "16" }]} active={String(rows)} onChange={(v) => balls.length === 0 && setRows(parseInt(v, 10) as 8 | 12 | 16)} />
          </div>
          <div>
            <p className="text-[11px] text-white/50 mb-1">Risk</p>
            <Tabs tabs={[{ id: "low", label: "Low" }, { id: "medium", label: "Med" }, { id: "high", label: "High" }]} active={risk} onChange={(v) => balls.length === 0 && setRisk(v as Risk)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Max multiplier" value={`${Math.max(...table)}x`} valueClass="text-ruby-400" />
          <Stat label="Balls in play" value={balls.length} valueClass="text-gold-400" />
        </div>
        <BetAmountPanel amount={amount} onChange={setAmount} />
        <Button block size="lg" variant="violet" onClick={drop}>
          Drop ball · {formatMoney(amount)}
        </Button>
      </Card>
    </GameShell>
  );
};

// ================= KENO =================
const KENO_TABLE: number[][] = [
  [],
  [0, 3.96],
  [0, 1.9, 4.5],
  [0, 1, 3.1, 10.4],
  [0, 0.8, 1.8, 5, 22.5],
  [0, 0.25, 1.4, 4.1, 16.5, 36],
  [0, 0, 1, 3.68, 7, 16.5, 40],
  [0, 0, 0.47, 3, 4.5, 14, 31, 60],
  [0, 0, 0, 2.2, 4, 13, 22, 55, 70],
  [0, 0, 0, 1.55, 3, 8, 15, 44, 60, 85],
  [0, 0, 0, 1.4, 2.25, 4.5, 8, 17, 50, 80, 100],
];

export const Keno: React.FC = () => {
  const { placeBet, settleBet, toast } = useApp();
  const [amount, setAmount] = useState(10);
  const [picked, setPicked] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const toggle = (n: number) => {
    if (drawing) return;
    sfx.click();
    setDrawn([]);
    setResult(null);
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= 10 ? p : [...p, n]));
  };

  const autoPick = () => {
    if (drawing) return;
    const { rng } = freshRng("keno-auto");
    const set = new Set<number>();
    while (set.size < 10) set.add(1 + Math.floor(rng() * 40));
    setPicked([...set]);
    setDrawn([]);
    setResult(null);
    sfx.click();
  };

  const play = () => {
    if (picked.length === 0) return toast("Pick at least 1 number", "error");
    const id = placeBet({ game: "keno", selection: picked.join(","), selectionLabel: `Keno · ${picked.length} numbers`, amount });
    if (!id) return;
    gameSfx("keno", "bet");
    setDrawing(true);
    setDrawn([]);
    setResult(null);
    const { rng } = freshRng("keno");
    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    const draws: number[] = [];
    while (draws.length < 10) draws.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    draws.forEach((n, i) => {
      const t = window.setTimeout(() => {
        setDrawn((d) => [...d, n]);
        gameSfx("keno", picked.includes(n) ? "reveal" : "step");
        if (i === draws.length - 1) {
          const hits = picked.filter((p) => draws.includes(p)).length;
          const mult = KENO_TABLE[picked.length][hits] ?? 0;
          const payout = Math.round(amount * mult * 100) / 100;
          settleBet(id, payout, `${hits}/${picked.length} hits · ${mult}x`);
          setResult({ win: payout > 0, amount: payout > 0 ? payout : amount, text: `${hits} of ${picked.length} hit · ${mult}x` });
          setDrawing(false);
          gameSfx("keno", payout >= amount * 5 || payout > 0 ? "win" : "lose");
        }
      }, 180 * (i + 1));
      timers.current.push(t);
    });
  };

  const hits = picked.filter((p) => drawn.includes(p)).length;
  const payTable = KENO_TABLE[picked.length] ?? [];

  return (
    <GameShell
      title="Keno"
      gameId="keno"
      rules={[
        "Pick between 1 and 10 numbers from the 40-number grid.",
        "10 numbers are drawn. Your payout depends on how many of your picks were hit.",
        "The payout table updates based on the number of picks. Hitting all 10 of 10 pays 100x.",
      ]}
    >
      <Card className="p-3">
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => {
            const isP = picked.includes(n);
            const isD = drawn.includes(n);
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                className={cn(
                  "aspect-square rounded-lg text-sm font-bold border transition-all btn-press",
                  !isP && !isD && "bg-white/5 border-white/10 text-white/70",
                  isP && !isD && "grad-violet border-transparent",
                  isD && !isP && "bg-white/15 border-white/30 text-white animate-pop",
                  isD && isP && "grad-gold text-night-950 border-transparent animate-pop shadow-lg shadow-gold-500/40"
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <button onClick={autoPick} className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 text-xs font-bold"><Shuffle size={14} /> Auto</button>
            <button onClick={() => { setPicked([]); setDrawn([]); setResult(null); }} className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 text-xs font-bold"><Trash2 size={14} /> Clear</button>
          </div>
          <span className="text-xs text-white/60">{picked.length}/10 picked · {hits} hits</span>
        </div>
      </Card>

      {picked.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {payTable.map((m, h) => (
            <div key={h} className={cn("min-w-[52px] rounded-lg border p-1.5 text-center", drawn.length === 10 && h === hits ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10")}>
              <p className="text-[10px] opacity-70">{h} hit</p>
              <p className="text-xs font-black">{m}x</p>
            </div>
          ))}
        </div>
      )}

      <ResultBanner result={result} />

      <Card className="space-y-3">
        <BetAmountPanel amount={amount} onChange={setAmount} disabled={drawing} />
        <Button block size="lg" variant="violet" onClick={play} loading={drawing} disabled={picked.length === 0}>
          {drawing ? "Drawing…" : `Play · ${formatMoney(amount)}`}
        </Button>
      </Card>
    </GameShell>
  );
};
