import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plane, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card } from "../components/UI";
import { GameShell } from "./GameShell";
import { cn } from "../utils/cn";
import { MOCK_NAMES, formatMoney, seededRng } from "../utils/helpers";
import { gameSfx } from "../utils/audio";

type Phase = "waiting" | "flying" | "crashed";
interface Slot {
  amount: number;
  auto: boolean;
  autoValue: number;
  status: "idle" | "queued" | "active" | "cashed";
  betId: string | null;
  cashedAt?: number;
  payout?: number;
}
interface FakePlayer {
  name: string;
  avatar: number;
  bet: number;
  target: number;
  cashed: boolean;
  payout: number;
}

const GROWTH = 0.0695; // m = e^(k t)
const WAIT_MS = 6000;
const CRASH_MS = 3200;
const SESSION_SEED = Math.random().toString(36).slice(2);

function crashPointFor(roundId: number): number {
  const rng = seededRng(`skyrush:${SESSION_SEED}:${roundId}`);
  const r = rng();
  if (r < 0.03) return 1.0;
  return Math.max(1, Math.floor((0.97 / (1 - r)) * 100) / 100);
}

const defaultSlot = (amount: number): Slot => ({ amount, auto: false, autoValue: 2, status: "idle", betId: null });

const multColor = (m: number) => (m < 2 ? "text-white" : m < 10 ? "text-violet-300" : "text-gold-400");
const chipColor = (m: number) => (m < 2 ? "bg-ruby-500/20 text-ruby-300 border-ruby-500/30" : m < 10 ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-gold-500/20 text-gold-300 border-gold-500/30");

export const SkyRush: React.FC = () => {
  const { placeBet, settleBet, cancelBet, toast } = useApp();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [mult, setMult] = useState(1);
  const [waitLeft, setWaitLeft] = useState(WAIT_MS);
  const [history, setHistory] = useState<number[]>(() => Array.from({ length: 12 }).map((_, i) => crashPointFor(-i - 1)));
  const [slots, setSlots] = useState<Slot[]>([defaultSlot(10), defaultSlot(50)]);
  const [players, setPlayers] = useState<FakePlayer[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const slotsRef = useRef(slots);
  const phaseRef = useRef<Phase>("waiting");
  const roundRef = useRef(1);
  const waitEndRef = useRef(Date.now() + WAIT_MS);
  const flyStartRef = useRef(0);
  const crashAtRef = useRef(1);
  const crashEndRef = useRef(0);
  const playersRef = useRef<FakePlayer[]>([]);
  const lastTickSecRef = useRef(-1);

  const updateSlot = useCallback((i: number, patch: Partial<Slot>) => {
    slotsRef.current = slotsRef.current.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setSlots(slotsRef.current);
  }, []);

  const doCashout = useCallback(
    (i: number, m: number, auto = false) => {
      const s = slotsRef.current[i];
      if (!s || s.status !== "active" || !s.betId) return;
      const payout = Math.round(s.amount * m * 100) / 100;
      settleBet(s.betId, payout, `${auto ? "Auto cash out" : "Cashed out"} @ ${m.toFixed(2)}x`);
      updateSlot(i, { status: "cashed", cashedAt: m, payout });
      gameSfx("skyrush", "cashout");
      toast(`Cashed out ${m.toFixed(2)}x · +${formatMoney(payout)}`, "success");
    },
    [settleBet, updateSlot, toast]
  );

  // Main loop
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const ph = phaseRef.current;
      if (ph === "waiting") {
        const left = waitEndRef.current - now;
        setWaitLeft(Math.max(0, left));
        const sec = Math.ceil(left / 1000);
        if (sec !== lastTickSecRef.current && sec <= 3 && sec > 0) {
          lastTickSecRef.current = sec;
          gameSfx("skyrush", "step");
        }
        if (left <= 0) {
          // take off
          phaseRef.current = "flying";
          flyStartRef.current = now;
          crashAtRef.current = crashPointFor(roundRef.current);
          slotsRef.current = slotsRef.current.map((s) => (s.status === "queued" ? { ...s, status: "active" } : s));
          setSlots(slotsRef.current);
          const rng = seededRng(`players:${SESSION_SEED}:${roundRef.current}`);
          const count = 8 + Math.floor(rng() * 7);
          playersRef.current = Array.from({ length: count }).map(() => ({
            name: MOCK_NAMES[Math.floor(rng() * MOCK_NAMES.length)],
            avatar: Math.floor(rng() * 12),
            bet: [10, 20, 50, 100, 200, 500, 1000, 2000][Math.floor(rng() * 8)],
            target: Math.round((1.05 + Math.pow(rng(), 2.2) * 12) * 100) / 100,
            cashed: false,
            payout: 0,
          }));
          setPlayers(playersRef.current);
          setPhase("flying");
          setMult(1);
          setElapsed(0);
        }
      } else if (ph === "flying") {
        const tSec = (now - flyStartRef.current) / 1000;
        let m = Math.exp(GROWTH * tSec);
        const crash = crashAtRef.current;
        if (m >= crash) {
          m = crash;
          phaseRef.current = "crashed";
          crashEndRef.current = now + CRASH_MS;
          // settle active bets as lost
          let lost = false;
          slotsRef.current.forEach((s) => {
            if (s.status === "active" && s.betId) {
              settleBet(s.betId, 0, `Crashed @ ${crash.toFixed(2)}x`);
              lost = true;
            }
          });
          slotsRef.current = slotsRef.current.map((s) => (s.status === "active" ? { ...s, status: "idle", betId: null } : s));
          setSlots(slotsRef.current);
          setHistory((h) => [crash, ...h].slice(0, 30));
          setPhase("crashed");
          setMult(crash);
          gameSfx("skyrush", "crash");
          if (lost) toast(`Flew away at ${crash.toFixed(2)}x`, "error");
        } else {
          // auto cash outs
          slotsRef.current.forEach((s, i) => {
            if (s.status === "active" && s.auto && m >= s.autoValue) doCashout(i, s.autoValue, true);
          });
          // fake players
          let changed = false;
          playersRef.current = playersRef.current.map((p) => {
            if (!p.cashed && m >= p.target && p.target < crash) {
              changed = true;
              return { ...p, cashed: true, payout: Math.round(p.bet * p.target * 100) / 100 };
            }
            return p;
          });
          if (changed) setPlayers(playersRef.current);
          setMult(m);
          setElapsed(tSec);
        }
      } else {
        if (now >= crashEndRef.current) {
          phaseRef.current = "waiting";
          roundRef.current += 1;
          waitEndRef.current = now + WAIT_MS;
          lastTickSecRef.current = -1;
          slotsRef.current = slotsRef.current.map((s) => (s.status === "cashed" ? { ...s, status: "idle", betId: null, cashedAt: undefined, payout: undefined } : s));
          setSlots(slotsRef.current);
          setPlayers([]);
          setPhase("waiting");
          setMult(1);
        }
      }
    }, 40);
    return () => clearInterval(t);
  }, [doCashout, settleBet, toast]);

  // Forfeit / refund on leave
  useEffect(() => {
    return () => {
      slotsRef.current.forEach((s) => {
        if (s.betId && s.status === "active") settleBet(s.betId, 0, "Left game mid-flight");
        if (s.betId && s.status === "queued") cancelBet(s.betId);
      });
    };
  }, [settleBet, cancelBet]);

  const placeSlotBet = (i: number) => {
    const s = slotsRef.current[i];
    if (s.status !== "idle") return;
    const id = placeBet({ game: "skyrush", selection: "flight", selectionLabel: `Sky Rush ${s.auto ? `auto ${s.autoValue}x` : "manual"}`, amount: s.amount });
    if (!id) return;
    gameSfx("skyrush", "bet");
    updateSlot(i, { betId: id, status: phaseRef.current === "waiting" ? "queued" : "queued" });
    if (phaseRef.current !== "waiting") toast("Bet queued for next round", "info");
  };

  const cancelSlot = (i: number) => {
    const s = slotsRef.current[i];
    if (s.status !== "queued" || !s.betId) return;
    cancelBet(s.betId);
    updateSlot(i, { status: "idle", betId: null });
    toast("Bet cancelled & refunded", "info");
  };

  // Plane geometry
  const W = 400;
  const H = 220;
  const progress = 1 - Math.exp(-elapsed / 7);
  const px = 20 + progress * (W - 70);
  const py = H - 20 - progress * (H - 60);
  const path = `M 20 ${H - 20} Q ${20 + (px - 20) * 0.65} ${H - 20} ${px} ${py}`;
  const area = `${path} L ${px} ${H - 20} Z`;

  return (
    <GameShell
      title="Sky Rush"
      gameId="skyrush"
      rules={[
        "Place your bet during the 6 second waiting phase. Two independent bet slots are available.",
        "Once the plane takes off, the multiplier grows. Cash out at any moment to win bet × current multiplier.",
        "If the plane flies away before you cash out, the bet is lost.",
        "Auto cash-out automatically secures your winnings at the chosen multiplier.",
        "Crash points are generated by a seeded RNG before each flight (3% chance of instant fly-away).",
      ]}
    >
      {/* History */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {history.map((h, i) => (
          <span key={i} className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", chipColor(h), i === 0 && "animate-pop")}>
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Stage */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 card-shadow" style={{ background: "radial-gradient(ellipse at 20% 100%, #3b0a16 0%, #0e1020 55%, #090a16 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "28px 28px", transform: `translateX(-${(elapsed * 20) % 28}px)` }} />
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 relative">
          <defs>
            <linearGradient id="skyfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {phase !== "waiting" && (
            <>
              <path d={area} fill="url(#skyfill)" />
              <path d={path} stroke="#fb7185" strokeWidth={4} fill="none" strokeLinecap="round" />
              <g transform={`translate(${px}, ${py}) rotate(${phase === "crashed" ? -35 : -18 - progress * 10})`} className={phase === "crashed" ? "opacity-0 transition-opacity duration-500" : ""}>
                <path d="M29 0 1-4 -14-14 -19-13 -13-2 -31 0 -13 2 -19 13 -14 14 1 4Z" fill="#ffe6a3" stroke="#9c5110" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {phase === "waiting" && (
            <>
              <Plane size={34} className="text-white/60 animate-float" />
              <p className="text-xs text-white/60 mt-2 uppercase tracking-widest">Waiting for next round</p>
              <div className="w-48 h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div className="h-full grad-red transition-all duration-100" style={{ width: `${(waitLeft / WAIT_MS) * 100}%` }} />
              </div>
              <p className="text-2xl font-black mt-1 tabular-nums">{(waitLeft / 1000).toFixed(1)}s</p>
            </>
          )}
          {phase === "flying" && <p className={cn("text-6xl font-black tabular-nums drop-shadow-lg", multColor(mult))}>{mult.toFixed(2)}x</p>}
          {phase === "crashed" && (
            <div className="text-center animate-pop">
              <p className="text-sm font-bold text-ruby-300 uppercase tracking-widest">Flew away!</p>
              <p className="text-6xl font-black text-ruby-400 tabular-nums">{mult.toFixed(2)}x</p>
            </div>
          )}
        </div>
        <div className="absolute top-2 left-3 flex items-center gap-1 text-[11px] text-white/60">
          <Users size={12} /> {players.length || 0} players online · Round #{roundRef.current}
        </div>
      </div>

      {/* Bet slots */}
      <div className="grid grid-cols-1 gap-3">
        {slots.map((s, i) => (
          <Card key={i} className={cn("space-y-3", s.status === "active" && "border-gold-400/50 animate-glow", s.status === "cashed" && "border-emerald-400/50")}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/60">Bet {i + 1}</span>
              <label className="flex items-center gap-2 text-xs">
                <span className="text-white/60">Auto cash out</span>
                <button onClick={() => updateSlot(i, { auto: !s.auto })} className={cn("w-10 h-5 rounded-full relative transition", s.auto ? "grad-green" : "bg-white/15")}>
                  <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", s.auto ? "left-5" : "left-0.5")} />
                </button>
                <input
                  type="number"
                  step="0.1"
                  min={1.01}
                  value={s.autoValue}
                  disabled={!s.auto}
                  onChange={(e) => updateSlot(i, { autoValue: Math.max(1.01, parseFloat(e.target.value) || 1.01) })}
                  className="w-16 h-7 rounded-md bg-black/40 text-center text-xs font-bold outline-none disabled:opacity-40"
                />
                <span className="text-white/50">x</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-black/30 rounded-xl border border-white/10 overflow-hidden">
                <button disabled={s.status !== "idle"} onClick={() => updateSlot(i, { amount: Math.max(1, Math.round(s.amount / 2)) })} className="px-3 h-11 text-xs font-bold text-white/70 disabled:opacity-30">½</button>
                <div className="flex-1 flex items-center justify-center gap-1">
                  <span className="text-gold-400 font-bold text-sm">₹</span>
                  <input type="number" min={1} value={s.amount} disabled={s.status !== "idle"} onChange={(e) => updateSlot(i, { amount: Math.max(1, parseFloat(e.target.value) || 1) })} className="w-full bg-transparent text-center font-bold outline-none disabled:opacity-60" />
                </div>
                <button disabled={s.status !== "idle"} onClick={() => updateSlot(i, { amount: s.amount * 2 })} className="px-3 h-11 text-xs font-bold text-white/70 disabled:opacity-30">2×</button>
              </div>
              {s.status === "idle" && (
                <Button className="w-32 h-12" onClick={() => placeSlotBet(i)}>
                  {phase === "waiting" ? "BET" : "NEXT ROUND"}
                </Button>
              )}
              {s.status === "queued" && (
                <Button variant="dark" className="w-32 h-12" onClick={() => cancelSlot(i)}>
                  Cancel
                </Button>
              )}
              {s.status === "active" && phase === "flying" && (
                <Button variant="gold" className="w-32 h-12 flex-col gap-0 leading-tight" onClick={() => doCashout(i, mult)}>
                  <span className="text-[10px]">CASH OUT</span>
                  <span>{formatMoney(s.amount * mult)}</span>
                </Button>
              )}
              {s.status === "active" && phase !== "flying" && (
                <Button variant="dark" className="w-32 h-12" disabled>
                  Taking off…
                </Button>
              )}
              {s.status === "cashed" && (
                <div className="w-32 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex flex-col items-center justify-center leading-tight">
                  <span className="text-[10px] text-emerald-300">Won @ {s.cashedAt?.toFixed(2)}x</span>
                  <span className="font-bold text-emerald-300 text-sm">+{formatMoney(s.payout ?? 0)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {[10, 50, 100, 500, 1000].map((p) => (
                <button key={p} disabled={s.status !== "idle"} onClick={() => updateSlot(i, { amount: p })} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-30", s.amount === p ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>
                  {p >= 1000 ? `${p / 1000}K` : p}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Live players */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Users size={16} className="text-gold-400" /> Simulated player feed
          </h3>
          <span className="text-xs text-white/50">{players.filter((p) => p.cashed).length}/{players.length} cashed</span>
        </div>
        <div className="max-h-56 overflow-y-auto no-scrollbar divide-y divide-white/5">
          {players.length === 0 && <p className="text-center text-white/40 text-sm py-6">Players are placing bets…</p>}
          {[...players]
            .sort((a, b) => Number(b.cashed) - Number(a.cashed))
            .map((p, i) => (
              <div key={i} className={cn("flex items-center gap-3 px-4 py-2", p.cashed && "bg-emerald-500/10")}>
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-300 to-ruby-500 border border-white/25 flex items-center justify-center text-[9px] font-black text-night-950">{p.name.slice(0, 2).toUpperCase()}</span>
                <span className="text-xs font-semibold flex-1">{p.name}</span>
                <span className="text-xs text-white/60 w-16 text-right">{formatMoney(p.bet, 0)}</span>
                <span className={cn("text-xs font-bold w-14 text-right", p.cashed ? "text-emerald-400" : "text-white/30")}>{p.cashed ? `${p.target.toFixed(2)}x` : "—"}</span>
                <span className={cn("text-xs font-bold w-20 text-right", p.cashed ? "text-emerald-400" : "text-white/30")}>{p.cashed ? formatMoney(p.payout, 0) : phase === "crashed" ? "Lost" : "…"}</span>
              </div>
            ))}
        </div>
      </Card>
    </GameShell>
  );
};
