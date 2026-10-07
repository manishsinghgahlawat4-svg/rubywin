import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Equal, Rocket, Shield, SkipForward } from "lucide-react";
import { useApp } from "../context/AppContext";
import { BetAmountPanel, Button, Card, ResultBanner, Stat, Tabs } from "../components/UI";
import { GameShell } from "./GameShell";
import { cn } from "../utils/cn";
import { formatMoney, freshRng } from "../utils/helpers";
import { gameSfx, sfx } from "../utils/audio";
import { BrandMark, gameArtwork } from "../components/GameArtwork";

// ================= LIMBO =================
export const Limbo: React.FC = () => {
  const { placeBet, settleBet } = useApp();
  const [amount, setAmount] = useState(10);
  const [target, setTarget] = useState(2);
  const [display, setDisplay] = useState(1);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ v: number; win: boolean }[]>([]);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const chance = Math.min(99, 99 / target);

  const play = () => {
    if (busy) return;
    const t = Math.min(1000, Math.max(1.01, target));
    const id = placeBet({ game: "limbo", selection: `x${t}`, selectionLabel: `Limbo · target ${t.toFixed(2)}x`, amount });
    if (!id) return;
    gameSfx("limbo", "bet");
    setBusy(true);
    setResult(null);
    const { rng } = freshRng("limbo");
    const r = Math.max(1e-9, rng());
    const final = Math.min(1000000, Math.max(1, Math.floor((99 / (100 * r)) * 100) / 100));
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(1 + (final - 1) * eased);
      if (p < 1) requestAnimationFrame(tick);
      else {
        const win = final >= t;
        const payout = win ? Math.round(amount * t * 100) / 100 : 0;
        settleBet(id, payout, `Result ${final.toFixed(2)}x`);
        setHistory((h) => [{ v: final, win }, ...h].slice(0, 12));
        setResult({ win, amount: win ? payout : amount, text: `Result ${final.toFixed(2)}x · target ${t.toFixed(2)}x` });
        setBusy(false);
        gameSfx("limbo", win ? "win" : "lose");
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <GameShell
      title="Limbo"
      gameId="limbo"
      rules={["Set a target multiplier between 1.01x and 1000x.", "A random multiplier is generated. If it is equal to or higher than your target, you win bet × target.", "Win chance = 99 ÷ target (1% house edge)."]}
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-h-[28px]">
        {history.map((h, i) => (
          <span key={i} className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", h.win ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-white/50 border-white/10", i === 0 && "animate-pop")}>
            {h.v.toFixed(2)}x
          </span>
        ))}
      </div>
      <Card className="h-48 flex flex-col items-center justify-center grad-dark relative overflow-hidden">
        <img src={gameArtwork("limbo")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-night-950/40 to-night-950/80" />
        <Rocket size={34} className={cn("absolute top-5 right-7 text-gold-200 transition-transform", busy && "animate-float")} />
        <p className={cn("text-6xl font-black tabular-nums relative", result ? (result.win ? "text-emerald-400" : "text-ruby-400") : "text-white")}>{display.toFixed(2)}x</p>
        <p className="text-xs text-white/70 mt-2 relative">Target {target.toFixed(2)}x</p>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/25 border border-white/5 p-3">
            <p className="text-[11px] text-white/50">Target multiplier</p>
            <input type="number" step="0.01" min={1.01} max={1000} value={target} onChange={(e) => setTarget(Math.min(1000, Math.max(1.01, parseFloat(e.target.value) || 1.01)))} className="w-full bg-transparent font-bold text-lg outline-none text-gold-400" />
          </div>
          <Stat label="Win chance" value={`${chance.toFixed(2)}%`} valueClass="text-emerald-400" />
        </div>
        <div className="flex gap-1.5">
          {[1.5, 2, 3, 5, 10, 50, 100].map((m) => (
            <button key={m} onClick={() => setTarget(m)} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold border", target === m ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>
              {m}x
            </button>
          ))}
        </div>
        <BetAmountPanel amount={amount} onChange={setAmount} disabled={busy} />
        <Button block size="lg" variant="gold" onClick={play} loading={busy}>
          Launch · win {formatMoney(amount * target)}
        </Button>
      </Card>
    </GameShell>
  );
};

// ================= HI-LO =================
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];
interface PlayingCard { rank: number; suit: number }
const drawCard = (rng: () => number): PlayingCard => ({ rank: 1 + Math.floor(rng() * 13), suit: Math.floor(rng() * 4) });

const CardView: React.FC<{ card: PlayingCard | null; small?: boolean; flip?: boolean }> = ({ card, small, flip }) => (
  <div className={cn("rounded-xl bg-white text-night-950 flex flex-col items-center justify-center font-black shadow-xl border-2 border-white/80", small ? "w-10 h-14 text-sm" : "w-28 h-40 text-4xl", flip && "animate-pop")}>
    {card ? (
      <>
        <span className={cn(card.suit === 1 || card.suit === 2 ? "text-ruby-600" : "text-night-950")}>{RANKS[card.rank - 1]}</span>
        <span className={cn(small ? "text-xs" : "text-2xl", card.suit === 1 || card.suit === 2 ? "text-ruby-600" : "text-night-950")}>{SUITS[card.suit]}</span>
      </>
    ) : (
      <span className="text-white/30">?</span>
    )}
  </div>
);

export const HiLo: React.FC = () => {
  const { placeBet, settleBet, toast } = useApp();
  const [amount, setAmount] = useState(10);
  const [active, setActive] = useState(false);
  const [card, setCard] = useState<PlayingCard | null>(null);
  const [prevCards, setPrevCards] = useState<PlayingCard[]>([]);
  const [total, setTotal] = useState(1);
  const [rounds, setRounds] = useState(0);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const betIdRef = useRef<string | null>(null);
  const rngRef = useRef<() => number>(() => Math.random());
  const activeRef = useRef(false);

  useEffect(() => () => { if (activeRef.current && betIdRef.current) settleBet(betIdRef.current, 0, "Left game"); }, [settleBet]);

  const probHigher = card ? (card.rank === 1 ? 12 / 13 : (14 - card.rank) / 13) : 0; // higher or same (A: strictly higher)
  const probLower = card ? (card.rank === 13 ? 12 / 13 : card.rank / 13) : 0;
  const probSame = 1 / 13;
  const multOf = (p: number) => Math.floor((0.99 / p) * 100) / 100;

  const start = () => {
    const id = placeBet({ game: "hilo", selection: "hilo", selectionLabel: "Hi-Lo", amount });
    if (!id) return;
    const { rng } = freshRng("hilo");
    rngRef.current = rng;
    betIdRef.current = id;
    activeRef.current = true;
    setCard(drawCard(rng));
    setPrevCards([]);
    setTotal(1);
    setRounds(0);
    setResult(null);
    setActive(true);
    gameSfx("hilo", "bet");
  };

  const finish = (win: boolean, payout: number, text: string) => {
    if (betIdRef.current) settleBet(betIdRef.current, payout, text);
    activeRef.current = false;
    setActive(false);
    setResult({ win, amount: win ? payout : amount, text });
    gameSfx("hilo", win ? "win" : "lose");
  };

  const guess = (kind: "higher" | "lower" | "same") => {
    if (!active || !card) return;
    const next = drawCard(rngRef.current);
    let ok = false;
    let p = probSame;
    if (kind === "higher") {
      ok = card.rank === 1 ? next.rank > 1 : next.rank >= card.rank;
      p = probHigher;
    } else if (kind === "lower") {
      ok = card.rank === 13 ? next.rank < 13 : next.rank <= card.rank;
      p = probLower;
    } else ok = next.rank === card.rank;
    setPrevCards((pc) => [...pc.slice(-5), card]);
    setCard(next);
    if (!ok) {
      finish(false, 0, `Lost on ${RANKS[next.rank - 1]}${SUITS[next.suit]} after ${rounds} correct`);
      return;
    }
    const newTotal = Math.floor(total * multOf(p) * 100) / 100;
    setTotal(newTotal);
    setRounds((r) => r + 1);
    gameSfx("hilo", "step");
  };

  const skip = () => {
    if (!active || !card) return;
    setPrevCards((pc) => [...pc.slice(-5), card]);
    setCard(drawCard(rngRef.current));
    sfx.click();
  };

  const cashout = () => {
    if (!active || rounds === 0) return;
    const payout = Math.round(amount * total * 100) / 100;
    finish(true, payout, `Cashed out ${total.toFixed(2)}x after ${rounds} correct`);
    toast(`+${formatMoney(payout)} cashed out!`, "success");
  };

  return (
    <GameShell
      title="Hi-Lo"
      gameId="hilo"
      rules={[
        "Guess whether the next card is higher or lower than the current one (Ace is lowest, King is highest).",
        "Higher/Lower include a tie, except on Ace (higher only) and King (lower only). 'Same' pays 12.87x.",
        "Each correct guess multiplies your total. Cash out anytime, or skip the current card for free.",
      ]}
    >
      <Card className="flex flex-col items-center gap-4 py-6 grad-dark">
        <div className="flex items-end gap-1 h-14">{prevCards.map((c, i) => <CardView key={i} card={c} small />)}</div>
        <CardView card={card} flip />
        <div className="grid grid-cols-3 gap-2 w-full">
          <Stat label="Total multiplier" value={`${total.toFixed(2)}x`} valueClass="text-gold-400" />
          <Stat label="Correct" value={rounds} valueClass="text-emerald-400" />
          <Stat label="Profit" value={formatMoney(amount * total - amount)} valueClass="text-white" />
        </div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        {active && card ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <button disabled={card.rank === 13} onClick={() => guess("higher")} className="rounded-xl grad-green py-3 flex flex-col items-center btn-press disabled:opacity-30">
                <ArrowUp size={20} />
                <span className="text-xs font-bold">Higher{card.rank === 1 ? "" : " / same"}</span>
                <span className="text-[11px] opacity-80">{multOf(probHigher).toFixed(2)}x</span>
              </button>
              <button onClick={() => guess("same")} className="rounded-xl grad-violet py-3 flex flex-col items-center btn-press">
                <Equal size={20} />
                <span className="text-xs font-bold">Same</span>
                <span className="text-[11px] opacity-80">{multOf(probSame).toFixed(2)}x</span>
              </button>
              <button disabled={card.rank === 1} onClick={() => guess("lower")} className="rounded-xl grad-red py-3 flex flex-col items-center btn-press disabled:opacity-30">
                <ArrowDown size={20} />
                <span className="text-xs font-bold">Lower{card.rank === 13 ? "" : " / same"}</span>
                <span className="text-[11px] opacity-80">{multOf(probLower).toFixed(2)}x</span>
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={skip}>
                <SkipForward size={16} /> Skip card
              </Button>
              <Button variant="gold" className="flex-[2]" disabled={rounds === 0} onClick={cashout}>
                Cash out {formatMoney(amount * total)}
              </Button>
            </div>
          </>
        ) : (
          <>
            <BetAmountPanel amount={amount} onChange={setAmount} />
            <Button block size="lg" onClick={start}>
              Deal cards · {formatMoney(amount)}
            </Button>
          </>
        )}
      </Card>
    </GameShell>
  );
};

// ================= GOAL =================
type GoalDiff = "easy" | "medium" | "hard" | "expert";
const GOAL_CFG: Record<GoalDiff, { cols: number; keepers: number; label: string }> = {
  easy: { cols: 4, keepers: 1, label: "Easy" },
  medium: { cols: 3, keepers: 1, label: "Medium" },
  hard: { cols: 2, keepers: 1, label: "Hard" },
  expert: { cols: 3, keepers: 2, label: "Expert" },
};
const GOAL_STEPS = 8;

export const Goal: React.FC = () => {
  const { placeBet, settleBet, toast } = useApp();
  const [amount, setAmount] = useState(10);
  const [diff, setDiff] = useState<GoalDiff>("medium");
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [lastShot, setLastShot] = useState<{ col: number; keepers: number[]; saved: boolean } | null>(null);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const betIdRef = useRef<string | null>(null);
  const rngRef = useRef<() => number>(() => Math.random());
  const activeRef = useRef(false);
  useEffect(() => () => { if (activeRef.current && betIdRef.current) settleBet(betIdRef.current, 0, "Left game"); }, [settleBet]);

  const cfg = GOAL_CFG[diff];
  const p = (cfg.cols - cfg.keepers) / cfg.cols;
  const factor = 0.97 / p;
  const multAt = (k: number) => Math.floor(Math.pow(factor, k) * 100) / 100;
  const current = multAt(step);

  const start = () => {
    const id = placeBet({ game: "goal", selection: diff, selectionLabel: `Goal · ${cfg.label}`, amount });
    if (!id) return;
    const { rng } = freshRng("goal");
    rngRef.current = rng;
    betIdRef.current = id;
    activeRef.current = true;
    setStep(0);
    setLastShot(null);
    setResult(null);
    setActive(true);
    gameSfx("goal", "bet");
  };

  const finish = (win: boolean, payout: number, text: string) => {
    if (betIdRef.current) settleBet(betIdRef.current, payout, text);
    activeRef.current = false;
    setActive(false);
    setResult({ win, amount: win ? payout : amount, text });
    gameSfx("goal", win ? "win" : "lose");
  };

  const shoot = (col: number) => {
    if (!active) return;
    const keepers = new Set<number>();
    while (keepers.size < cfg.keepers) keepers.add(Math.floor(rngRef.current() * cfg.cols));
    const saved = keepers.has(col);
    setLastShot({ col, keepers: [...keepers], saved });
    if (saved) {
      finish(false, 0, `Saved by keeper at step ${step + 1}`);
      return;
    }
    const next = step + 1;
    setStep(next);
    gameSfx("goal", "step");
    if (next === GOAL_STEPS) {
      const payout = Math.round(amount * multAt(next) * 100) / 100;
      finish(true, payout, `Perfect ${GOAL_STEPS}/${GOAL_STEPS} goals! ${multAt(next)}x`);
    }
  };

  const cashout = () => {
    if (!active || step === 0) return;
    const payout = Math.round(amount * current * 100) / 100;
    finish(true, payout, `Cashed out ${current.toFixed(2)}x after ${step} goals`);
    toast(`+${formatMoney(payout)} cashed out!`, "success");
  };

  return (
    <GameShell
      title="Goal"
      gameId="goal"
      rules={[
        "Choose a difficulty and shoot the ball into one of the goal zones. Avoid the goalkeeper!",
        `Each goal multiplies your bet. Score ${GOAL_STEPS} in a row for the maximum payout.`,
        "Cash out after any successful shot. Easy: 4 zones/1 keeper · Medium: 3/1 · Hard: 2/1 · Expert: 3/2.",
      ]}
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {Array.from({ length: GOAL_STEPS }).map((_, i) => (
          <div key={i} className={cn("min-w-[56px] rounded-lg border p-1.5 text-center", i < step ? "grad-green border-transparent" : i === step && active ? "border-gold-400 bg-gold-500/10 animate-pulse" : "bg-white/5 border-white/10 text-white/60")}>
            <p className="text-[10px] opacity-80">Goal {i + 1}</p>
            <p className="text-xs font-black">{multAt(i + 1)}x</p>
          </div>
        ))}
      </div>
      <Card className="relative overflow-hidden p-0 h-60" style={{ background: "linear-gradient(180deg, #14532d 0%, #166534 60%, #15803d 100%)" }}>
        <div className="absolute inset-x-6 top-5 h-24 border-4 border-white/80 border-b-0 rounded-t-md" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 10px)" }} />
        <div className="absolute inset-x-6 top-5 h-24 grid" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}>
          {Array.from({ length: cfg.cols }).map((_, c) => {
            const isKeeper = lastShot?.keepers.includes(c);
            const isBall = lastShot?.col === c;
            return (
              <button key={c} disabled={!active} onClick={() => shoot(c)} className={cn("relative flex items-center justify-center text-4xl transition btn-press", active && "hover:bg-white/10")}>
                {isKeeper && <Shield size={32} className={cn("absolute text-gold-200 drop-shadow-lg animate-pop", lastShot?.saved && isBall ? "scale-125 text-white" : "")} />}
                {isBall && !lastShot?.saved && <span className="soccer-ball absolute goal-ball-flight" />}
                {active && !lastShot && <span className="text-white/30 text-sm font-bold">{c + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center"><div className="soccer-ball" /><div className="mt-2 h-1.5 w-16 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,.5)]" /></div>
        <div className="absolute bottom-2 left-3 text-[11px] font-bold text-white/80">{active ? `Tap a zone to shoot · ${(p * 100).toFixed(0)}% success` : "Place a bet to start"}</div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Current multiplier" value={`${current.toFixed(2)}x`} valueClass="text-gold-400" />
          <Stat label="Potential" value={formatMoney(amount * current)} valueClass="text-emerald-400" />
        </div>
        {active ? (
          <Button block size="lg" variant="gold" disabled={step === 0} onClick={cashout}>
            {step === 0 ? "Shoot to start" : `Cash out ${formatMoney(amount * current)}`}
          </Button>
        ) : (
          <>
            <Tabs tabs={(Object.keys(GOAL_CFG) as GoalDiff[]).map((d) => ({ id: d, label: GOAL_CFG[d].label }))} active={diff} onChange={(v) => setDiff(v as GoalDiff)} />
            <BetAmountPanel amount={amount} onChange={setAmount} />
            <Button block size="lg" variant="green" onClick={start}>
              Kick off · {formatMoney(amount)}
            </Button>
          </>
        )}
      </Card>
    </GameShell>
  );
};

// ================= MINI WHEEL =================
const WHEEL = [1.5, 0, 1.2, 0, 2, 0, 1.2, 0, 3, 0, 1.2, 0, 4, 0, 1.5, 0];
const SEG = 360 / WHEEL.length;
const segColor = (m: number) => (m === 0 ? "#1f2937" : m >= 4 ? "#f59e0b" : m >= 3 ? "#e11d48" : m >= 2 ? "#7c3aed" : m >= 1.5 ? "#2563eb" : "#059669");

export const MiniWheel: React.FC = () => {
  const { placeBet, settleBet } = useApp();
  const [amount, setAmount] = useState(10);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const pendingRef = useRef<{ id: string; mult: number } | null>(null);

  const spin = () => {
    if (spinning) return;
    const id = placeBet({ game: "wheel", selection: "spin", selectionLabel: "Mini Wheel spin", amount });
    if (!id) return;
    gameSfx("wheel", "bet");
    setResult(null);
    setSpinning(true);
    const { rng } = freshRng("wheel");
    const idx = Math.floor(rng() * WHEEL.length);
    const jitter = (rng() - 0.5) * SEG * 0.7;
    const base = Math.ceil(rotation / 360) * 360;
    const target = base + 360 * 5 + (360 - (idx * SEG + SEG / 2 + jitter));
    pendingRef.current = { id, mult: WHEEL[idx] };
    setRotation(target);
  };

  const onEnd = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    const payout = Math.round(amount * p.mult * 100) / 100;
    settleBet(p.id, payout, `Wheel stopped on ${p.mult}x`);
    setHistory((h) => [p.mult, ...h].slice(0, 12));
    setResult({ win: payout > 0, amount: payout > 0 ? payout : amount, text: `Landed on ${p.mult}x` });
    setSpinning(false);
    gameSfx("wheel", p.mult > 0 ? "win" : "lose");
  };

  const gradient = `conic-gradient(${WHEEL.map((m, i) => `${segColor(m)} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`;

  return (
    <GameShell title="Mini Wheel" gameId="wheel" rules={["Place a bet and spin the wheel.", "The wheel has 16 segments with multipliers from 0x to 4x.", "Your payout equals bet × the multiplier the pointer stops on."]}>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-h-[28px]">
        {history.map((m, i) => (
          <span key={i} className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", i === 0 && "animate-pop")} style={{ borderColor: segColor(m), color: m === 0 ? "#9ca3af" : segColor(m), background: `${segColor(m)}22` }}>
            {m}x
          </span>
        ))}
      </div>
      <Card className="flex flex-col items-center py-6 relative overflow-hidden">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[9px] border-r-[9px] border-t-[18px] border-l-transparent border-r-transparent border-t-gold-200 drop-shadow-lg" />
        <div className="relative w-72 h-72 mt-4">
          <div
            onTransitionEnd={onEnd}
            className="w-full h-full rounded-full border-8 border-gold-500 shadow-2xl shadow-gold-500/30 relative"
            style={{ background: gradient, transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4.2s cubic-bezier(0.12, 0.8, 0.2, 1)" : "none" }}
          >
            {WHEEL.map((m, i) => (
              <span key={i} className="absolute left-1/2 top-1/2 text-[11px] font-black text-white drop-shadow" style={{ transform: `translate(-50%, -50%) rotate(${i * SEG + SEG / 2}deg) translateY(-112px)` }}>
                {m}x
              </span>
            ))}
          </div>
          <div className="absolute inset-0 m-auto w-16 h-16 rounded-full grad-gold border-4 border-night-900 flex items-center justify-center shadow-xl"><BrandMark className="w-11 h-11" /></div>
        </div>
      </Card>
      <ResultBanner result={result} />
      <Card className="space-y-3">
        <BetAmountPanel amount={amount} onChange={setAmount} disabled={spinning} />
        <Button block size="lg" variant="gold" onClick={spin} loading={spinning}>
          {spinning ? "Spinning…" : `Spin · ${formatMoney(amount)}`}
        </Button>
      </Card>
    </GameShell>
  );
};
