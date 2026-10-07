import React, { useEffect, useRef, useState } from "react";
import { Bomb, Gem } from "lucide-react";
import { useApp } from "../context/AppContext";
import { BetAmountPanel, Button, Card, ResultBanner, Stat } from "../components/UI";
import { GameShell } from "./GameShell";
import { cn } from "../utils/cn";
import { formatMoney, freshRng } from "../utils/helpers";
import { gameSfx, sfx } from "../utils/audio";

// ================= MINES =================
const TOTAL = 25;
function minesMultiplier(mines: number, picks: number): number {
  let m = 1;
  for (let i = 0; i < picks; i++) m *= (TOTAL - i) / (TOTAL - mines - i);
  return Math.floor(m * 0.97 * 100) / 100;
}

export const Mines: React.FC = () => {
  const { placeBet, settleBet, toast } = useApp();
  const [amount, setAmount] = useState(10);
  const [mines, setMines] = useState(3);
  const [active, setActive] = useState(false);
  const [mineSet, setMineSet] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [exploded, setExploded] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);
  const betIdRef = useRef<string | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      if (activeRef.current && betIdRef.current) settleBet(betIdRef.current, 0, "Left game");
    };
  }, [settleBet]);

  const picks = revealed.size;
  const currentMult = picks > 0 ? minesMultiplier(mines, picks) : 1;
  const nextMult = minesMultiplier(mines, picks + 1);

  const start = () => {
    const id = placeBet({ game: "mines", selection: `mines${mines}`, selectionLabel: `Mines · ${mines} mines`, amount });
    if (!id) return;
    const { rng } = freshRng("mines");
    const set = new Set<number>();
    while (set.size < mines) set.add(Math.floor(rng() * TOTAL));
    betIdRef.current = id;
    activeRef.current = true;
    setMineSet(set);
    setRevealed(new Set());
    setExploded(null);
    setShowAll(false);
    setResult(null);
    setActive(true);
    gameSfx("mines", "bet");
  };

  const finish = (win: boolean, payout: number, text: string) => {
    if (betIdRef.current) settleBet(betIdRef.current, payout, text);
    activeRef.current = false;
    setActive(false);
    setShowAll(true);
    setResult({ win, amount: win ? payout : amount, text });
    gameSfx("mines", win ? "win" : "crash");
  };

  const clickTile = (i: number) => {
    if (!active || revealed.has(i)) return;
    if (mineSet.has(i)) {
      setExploded(i);
      finish(false, 0, `Hit a mine after ${picks} gems`);
      return;
    }
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
    gameSfx("mines", "reveal");
    if (next.size === TOTAL - mines) {
      const payout = Math.round(amount * minesMultiplier(mines, next.size) * 100) / 100;
      finish(true, payout, `All gems found! ${minesMultiplier(mines, next.size)}x`);
    }
  };

  const cashout = () => {
    if (!active || picks === 0) return;
    const payout = Math.round(amount * currentMult * 100) / 100;
    finish(true, payout, `Cashed out ${currentMult}x after ${picks} gems`);
    toast(`+${formatMoney(payout)} cashed out!`, "success");
  };

  return (
    <GameShell
      title="Mines"
      gameId="mines"
      rules={[
        "Choose the number of mines (1-24) hidden in the 5×5 grid and place your bet.",
        "Reveal tiles one by one. Every gem increases your multiplier; hitting a mine loses the bet.",
        "Cash out at any time to collect bet × current multiplier.",
        "Multiplier = 0.97 × Π (25−i)/(25−mines−i). More mines = higher risk and reward.",
      ]}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Mines" value={mines} valueClass="text-ruby-400" />
        <Stat label="Current" value={`${currentMult.toFixed(2)}x`} valueClass="text-gold-400" />
        <Stat label="Next tile" value={`${nextMult.toFixed(2)}x`} valueClass="text-emerald-400" />
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const isMine = mineSet.has(i);
            const isRev = revealed.has(i);
            const show = isRev || (showAll && mineSet.size > 0);
            return (
              <button
                key={i}
                onClick={() => clickTile(i)}
                disabled={!active || isRev}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-300 btn-press border",
                  !show && "bg-gradient-to-br from-night-700 to-night-800 border-white/10 shadow-lg hover:border-gold-400/40",
                  show && isRev && "bg-emerald-500/20 border-emerald-400/50 animate-pop",
                  show && !isRev && isMine && (exploded === i ? "bg-ruby-600 border-ruby-400 animate-shake" : "bg-ruby-500/20 border-ruby-500/40"),
                  show && !isRev && !isMine && "bg-white/5 border-white/5 opacity-50"
                )}
              >
                {show && (isMine ? <Bomb size={22} className={exploded === i ? "text-white" : "text-ruby-300"} /> : <Gem size={22} className={isRev ? "text-emerald-300" : "text-white/40"} />)}
              </button>
            );
          })}
        </div>
      </Card>

      <ResultBanner result={result} />

      <Card className="space-y-3">
        {!active && (
          <>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white/60">Number of mines</span>
                <span className="font-bold text-ruby-400">{mines}</span>
              </div>
              <input type="range" min={1} max={24} value={mines} onChange={(e) => setMines(parseInt(e.target.value, 10))} className="w-full" style={{ background: `linear-gradient(90deg, #e11d48 ${((mines - 1) / 23) * 100}%, rgba(255,255,255,0.15) ${((mines - 1) / 23) * 100}%)` }} />
              <div className="flex gap-1.5 mt-2">
                {[1, 3, 5, 10, 15, 24].map((m) => (
                  <button key={m} onClick={() => setMines(m)} className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold border", mines === m ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/70")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <BetAmountPanel amount={amount} onChange={setAmount} />
            <Button block size="lg" onClick={start}>
              Start game · {formatMoney(amount)}
            </Button>
          </>
        )}
        {active && (
          <Button block size="lg" variant="gold" disabled={picks === 0} onClick={cashout}>
            {picks === 0 ? "Pick a tile to start" : `Cash out ${formatMoney(amount * currentMult)}`}
          </Button>
        )}
      </Card>
    </GameShell>
  );
};

// ================= DICE =================
export const Dice: React.FC = () => {
  const { placeBet, settleBet } = useApp();
  const [amount, setAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [roll, setRoll] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<{ roll: number; win: boolean }[]>([]);
  const [result, setResult] = useState<{ win: boolean; amount: number; text?: string } | null>(null);

  const chance = over ? 100 - target : target;
  const multiplier = Math.floor((99 / chance) * 10000) / 10000;

  const play = () => {
    if (rolling) return;
    const id = placeBet({ game: "dice", selection: `${over ? "over" : "under"}${target}`, selectionLabel: `Dice · Roll ${over ? "over" : "under"} ${target}`, amount });
    if (!id) return;
    gameSfx("dice", "bet");
    gameSfx("dice", "roll");
    setRolling(true);
    setResult(null);
    const { rng } = freshRng("dice");
    const r = Math.floor(rng() * 10000) / 100;
    let ticks = 0;
    const anim = setInterval(() => {
      setRoll(Math.round(Math.random() * 10000) / 100);
      ticks++;
      if (ticks > 10) {
        clearInterval(anim);
        setRoll(r);
        const win = over ? r > target : r < target;
        const payout = win ? Math.round(amount * multiplier * 100) / 100 : 0;
        settleBet(id, payout, `Rolled ${r.toFixed(2)}`);
        setHistory((h) => [{ roll: r, win }, ...h].slice(0, 12));
        setResult({ win, amount: win ? payout : amount, text: `Rolled ${r.toFixed(2)} · needed ${over ? ">" : "<"} ${target}` });
        setRolling(false);
        gameSfx("dice", win ? "win" : "lose");
      }
    }, 60);
  };

  return (
    <GameShell
      title="Dice"
      gameId="dice"
      rules={[
        "Pick a target between 2 and 98 and choose Roll Over or Roll Under.",
        "A number from 0.00 to 99.99 is rolled. You win if it lands on your side of the target.",
        "Payout multiplier = 99 ÷ win chance (1% house edge).",
      ]}
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-h-[28px]">
        {history.map((h, i) => (
          <span key={i} className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", h.win ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-white/50 border-white/10", i === 0 && "animate-pop")}>
            {h.roll.toFixed(2)}
          </span>
        ))}
      </div>

      <Card className="space-y-6 pt-10 pb-6">
        <div className="relative px-2">
          {roll !== null && (
            <div className="absolute -top-9 transition-all duration-150" style={{ left: `calc(${roll}% - 18px)` }}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black shadow-xl", result?.win ? "bg-emerald-500" : result ? "bg-ruby-500" : "bg-white text-night-950", rolling && "animate-pulse")}>
                {roll.toFixed(0)}
              </div>
            </div>
          )}
          <div className="relative h-3 rounded-full overflow-hidden bg-white/10">
            <div className={cn("absolute top-0 bottom-0", over ? "bg-ruby-500" : "bg-emerald-500")} style={{ left: 0, width: `${target}%` }} />
            <div className={cn("absolute top-0 bottom-0", over ? "bg-emerald-500" : "bg-ruby-500")} style={{ left: `${target}%`, right: 0 }} />
          </div>
          <input type="range" min={2} max={98} value={target} onChange={(e) => setTarget(parseInt(e.target.value, 10))} className="absolute inset-x-2 top-0 w-[calc(100%-16px)] opacity-0 h-3" style={{ cursor: "pointer" }} />
          <div className="flex justify-between text-[10px] text-white/40 mt-2">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
          <input type="range" min={2} max={98} value={target} onChange={(e) => setTarget(parseInt(e.target.value, 10))} className="w-full mt-2" style={{ background: `linear-gradient(90deg, ${over ? "#e11d48" : "#059669"} ${target}%, ${over ? "#059669" : "#e11d48"} ${target}%)` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Multiplier" value={`${multiplier.toFixed(4)}x`} valueClass="text-gold-400" />
          <button onClick={() => { sfx.click(); setOver((o) => !o); }} className="rounded-xl bg-black/25 border border-white/5 p-3 text-left btn-press">
            <p className="text-[11px] text-white/50">Roll {over ? "over" : "under"} ↻</p>
            <p className="font-bold text-sm mt-0.5">{target}</p>
          </button>
          <Stat label="Win chance" value={`${chance.toFixed(0)}%`} valueClass="text-emerald-400" />
        </div>
      </Card>

      <ResultBanner result={result} />

      <Card className="space-y-3">
        <BetAmountPanel amount={amount} onChange={setAmount} disabled={rolling} />
        <Button block size="lg" onClick={play} loading={rolling}>
          Roll dice · win {formatMoney(amount * multiplier)}
        </Button>
      </Card>
    </GameShell>
  );
};
