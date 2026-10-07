import React, { useCallback, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Card, PageHeader, Tabs } from "../../components/UI";
import { cn } from "../../utils/cn";
import { BetSheet, CountdownOverlay, LotteryWalletCard, MyBetsList, Pager, PendingSelection, ResultPopup, TimerCard, useHistoryPeriods, useRound, useRoundSettlement } from "./LotteryShared";
import { K3_SUM_ODDS, fiveDResult, k3Result } from "./engine";
import { sfx } from "../../utils/audio";

// ---------- Dice face ----------
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const DiceFace: React.FC<{ value: number; size?: number; rolling?: boolean }> = ({ value, size = 48, rolling }) => (
  <div className={cn("dice-face", rolling && "animate-shake")} style={{ width: size, height: size }}>
    {Array.from({ length: 9 }).map((_, i) => (
      <span key={i}>{PIPS[value]?.includes(i) ? <i /> : null}</span>
    ))}
  </div>
);

const K3_RULES = [
  "Three dice are rolled every round. Bet on the total, pairs, triples, or specific combinations.",
  "Total 3/18 pays 207.36x · 4/17 69.12x · 5/16 34.56x · 6/15 20.74x · 7/14 13.83x · 8/13 9.88x · 9/12 8.3x · 10/11 7.68x.",
  "Big (11-18) / Small (3-10) / Odd / Even pay 2x. Triples lose on Big/Small/Odd/Even.",
  "Any pair pays 13.83x · Any triple 34.56x · Specific triple 207.36x · Straight (3 consecutive) 8.64x · 3 specific different numbers 34.56x.",
];

export const K3: React.FC = () => {
  const { state } = useApp();
  const [duration, setDuration] = useState(60);
  const { round, endedPeriod, locked } = useRound(duration, "k3");
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  const [mode, setMode] = useState("total");
  const [tab, setTab] = useState("history");
  const [page, setPage] = useState(0);
  const [diffPick, setDiffPick] = useState<number[]>([]);

  const resultText = useCallback((p: string) => {
    const r = k3Result(p, duration);
    return `${r.dice.join(" + ")} = ${r.sum} (${r.size}, ${r.parity})`;
  }, [duration]);
  const { popup, closePopup } = useRoundSettlement("k3", duration, endedPeriod, resultText);
  const history = useHistoryPeriods(duration, round, 10, page);
  const chartRows = useHistoryPeriods(duration, round, 16, 0);
  const latest = useHistoryPeriods(duration, round, 1, 0);
  const last = useMemo(() => k3Result(latest[0]?.periodId ?? round.periodId, duration), [latest, round.periodId, duration]);
  const pendingCount = state.bets.filter((b) => b.game === "k3" && b.period === round.periodId && b.duration === duration).length;

  const pick = (code: string, label: string, theme = "grad-violet") => {
    if (locked) return sfx.error();
    sfx.click();
    setSelection({ code, label, theme });
  };

  return (
    <div className="safe-bottom">
      <PageHeader title="K3 Lotre" showBalance />
      <div className="px-3 pt-3 space-y-4">
        <LotteryWalletCard rulesTitle="K3 rules" rules={K3_RULES} />
        <TimerCard gameName="K3" duration={duration} onDuration={(d) => { setDuration(d); setPage(0); }} round={round}>
          <div className="flex items-center gap-1.5 mt-2">
            {last.dice.map((d, i) => (
              <DiceFace key={i} value={d} size={26} />
            ))}
            <span className="text-xs font-bold text-gold-400 ml-1">= {last.sum}</span>
            {pendingCount > 0 && <span className="ml-2 text-[10px] font-bold text-gold-400">{pendingCount} bet(s)</span>}
          </div>
        </TimerCard>

        <Card className="relative space-y-3">
          <CountdownOverlay round={round} locked={locked} />
          <Tabs tabs={[{ id: "total", label: "Total" }, { id: "pair", label: "2 Same" }, { id: "triple", label: "3 Same" }, { id: "diff", label: "Different" }]} active={mode} onChange={setMode} />

          {mode === "total" && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 16 }).map((_, i) => {
                  const s = i + 3;
                  const big = s >= 11;
                  return (
                    <button key={s} onClick={() => pick(`sum${s}`, `Total ${s}`, big ? "grad-red" : "grad-green")} className={cn("rounded-xl py-2 flex flex-col items-center btn-press border", big ? "bg-ruby-500/15 border-ruby-500/30" : "bg-emerald-500/15 border-emerald-500/30")}>
                      <span className={cn("text-xl font-black", big ? "text-ruby-400" : "text-emerald-400")}>{s}</span>
                      <span className="text-[10px] text-white/50">{K3_SUM_ODDS[s]}x</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => pick("big", "Big", "grad-gold")} className="h-11 rounded-xl grad-gold text-night-950 font-black btn-press">Big</button>
                <button onClick={() => pick("small", "Small", "grad-blue")} className="h-11 rounded-xl grad-blue font-black btn-press">Small</button>
                <button onClick={() => pick("odd", "Odd", "grad-red")} className="h-11 rounded-xl grad-red font-black btn-press">Odd</button>
                <button onClick={() => pick("even", "Even", "grad-green")} className="h-11 rounded-xl grad-green font-black btn-press">Even</button>
              </div>
            </>
          )}

          {mode === "pair" && (
            <div className="space-y-3">
              <button onClick={() => pick("pairAny", "Any Pair", "grad-violet")} className="w-full h-12 rounded-xl grad-violet font-black btn-press">
                Any pair <span className="text-xs font-semibold opacity-80">13.83x</span>
              </button>
              <p className="text-xs text-white/50">Specific pair (two dice show this number) · 13.83x</p>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => pick(`pair${n}`, `Pair of ${n}`, "grad-violet")} className="flex flex-col items-center gap-1 btn-press">
                    <div className="flex -space-x-2">
                      <DiceFace value={n} size={26} />
                      <DiceFace value={n} size={26} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "triple" && (
            <div className="space-y-3">
              <button onClick={() => pick("tripleAny", "Any Triple", "grad-red")} className="w-full h-12 rounded-xl grad-red font-black btn-press">
                Any triple <span className="text-xs font-semibold opacity-80">34.56x</span>
              </button>
              <p className="text-xs text-white/50">Specific triple · 207.36x</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => pick(`triple${n}`, `Triple ${n}`, "grad-red")} className="rounded-xl bg-black/25 border border-white/10 p-2 flex items-center justify-center gap-1 btn-press">
                    <DiceFace value={n} size={22} />
                    <DiceFace value={n} size={22} />
                    <DiceFace value={n} size={22} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "diff" && (
            <div className="space-y-3">
              <button onClick={() => pick("straight", "Straight", "grad-green")} className="w-full h-12 rounded-xl grad-green font-black btn-press">
                Straight (3 consecutive) <span className="text-xs font-semibold opacity-80">8.64x</span>
              </button>
              <p className="text-xs text-white/50">Pick 3 different numbers · 34.56x</p>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      sfx.click();
                      setDiffPick((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 3 ? [...p, n] : p));
                    }}
                    className={cn("rounded-xl p-1 border-2 btn-press", diffPick.includes(n) ? "border-gold-400 bg-gold-500/20" : "border-transparent")}
                  >
                    <DiceFace value={n} size={34} />
                  </button>
                ))}
              </div>
              <Button block disabled={diffPick.length !== 3} onClick={() => { const s = [...diffPick].sort(); pick(`diff${s.join("")}`, `Different ${s.join(",")}`, "grad-green"); setDiffPick([]); }}>
                Confirm {diffPick.length}/3
              </Button>
            </div>
          )}
        </Card>

        <Tabs tabs={[{ id: "history", label: "Game history" }, { id: "chart", label: "Chart" }, { id: "mine", label: "My history" }]} active={tab} onChange={(t) => { setTab(t); setPage(0); }} />
        {tab === "history" && (
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr] text-[11px] font-bold px-3 py-2.5 grad-violet">
              <span>Period</span><span className="text-center">Sum</span><span className="text-center">Result</span><span className="text-center">Type</span>
            </div>
            <div className="divide-y divide-white/5">
              {history.map((h) => {
                const r = k3Result(h.periodId, duration);
                return (
                  <div key={h.periodId} className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr] items-center px-3 py-2">
                    <span className="text-[11px] font-mono text-white/80">{h.periodId}</span>
                    <span className="text-center text-lg font-black text-gold-400">{r.sum}</span>
                    <span className="flex justify-center gap-1">{r.dice.map((d, i) => <DiceFace key={i} value={d} size={20} />)}</span>
                    <span className="text-center text-[10px] font-bold text-white/70">{r.size === "big" ? "Big" : "Small"} · {r.parity === "odd" ? "Odd" : "Even"}</span>
                  </div>
                );
              })}
            </div>
            <Pager page={page} setPage={setPage} />
          </Card>
        )}
        {tab === "chart" && (
          <Card className="p-0 overflow-hidden">
            <div className="px-3 py-2.5 grad-violet text-[11px] font-bold">Sum trend (3 → 18)</div>
            <div className="relative">
              <svg className="absolute left-0 top-0 pointer-events-none" width="100%" height={chartRows.length * 36} viewBox={`0 0 430 ${chartRows.length * 36}`} preserveAspectRatio="none">
                <polyline fill="none" stroke="#a78bfa" strokeWidth={2} points={chartRows.map((h, i) => `${100 + (k3Result(h.periodId, duration).sum - 3) * 20.6 + 9},${i * 36 + 18}`).join(" ")} />
              </svg>
              <div className="divide-y divide-white/5">
                {chartRows.map((h) => {
                  const r = k3Result(h.periodId, duration);
                  return (
                    <div key={h.periodId} className="flex items-center h-9 px-3">
                      <span className="w-[88px] text-[10px] font-mono text-white/60">{h.periodId.slice(-6)}</span>
                      <div className="flex-1 flex justify-between">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <span key={i} className={cn("w-[18px] h-[18px] rounded-full text-[9px] flex items-center justify-center font-bold", i + 3 === r.sum ? (r.size === "big" ? "ball-red ball" : "ball-green ball") : "text-white/25")}>{i + 3}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
        {tab === "mine" && <Card><MyBetsList game="k3" duration={duration} /></Card>}
      </div>
      <BetSheet game="k3" selection={selection} period={round.periodId} duration={duration} onClose={() => setSelection(null)} />
      <ResultPopup data={popup} onClose={closePopup} gameName="K3" />
    </div>
  );
};

// ================= 5D =================
const FIVED_RULES = [
  "Five digits (A B C D E) from 0-9 are drawn every round. Sum = A+B+C+D+E.",
  "Position bets: exact number 9x · Big (5-9) / Small (0-4) / Odd / Even 2x.",
  "Sum bets: Big (23-45) / Small (0-22) / Odd / Even 2x.",
  "Betting closes 5 seconds before each draw.",
];
const POSITIONS = ["A", "B", "C", "D", "E", "SUM"];

export const FiveD: React.FC = () => {
  const { state } = useApp();
  const [duration, setDuration] = useState(60);
  const { round, endedPeriod, locked } = useRound(duration, "5d");
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  const [pos, setPos] = useState("A");
  const [tab, setTab] = useState("history");
  const [page, setPage] = useState(0);

  const resultText = useCallback((p: string) => {
    const r = fiveDResult(p, duration);
    return `${r.digits.join(" ")} = ${r.sum}`;
  }, [duration]);
  const { popup, closePopup } = useRoundSettlement("5d", duration, endedPeriod, resultText);
  const history = useHistoryPeriods(duration, round, 10, page);
  const latest = useHistoryPeriods(duration, round, 1, 0);
  const last = useMemo(() => fiveDResult(latest[0]?.periodId ?? round.periodId, duration), [latest, round.periodId, duration]);
  const pendingCount = state.bets.filter((b) => b.game === "5d" && b.period === round.periodId && b.duration === duration).length;

  const pick = (type: string, label: string, theme = "grad-blue") => {
    if (locked) return sfx.error();
    sfx.click();
    setSelection({ code: `${pos}-${type}`, label: `${pos === "SUM" ? "Sum" : pos}: ${label}`, theme });
  };

  return (
    <div className="safe-bottom">
      <PageHeader title="5D Lotre" showBalance />
      <div className="px-3 pt-3 space-y-4">
        <LotteryWalletCard rulesTitle="5D rules" rules={FIVED_RULES} />
        <TimerCard gameName="5D" duration={duration} onDuration={(d) => { setDuration(d); setPage(0); }} round={round}>
          <div className="flex items-center gap-1 mt-2">
            {last.digits.map((d, i) => (
              <span key={i} className="w-6 h-6 rounded-md grad-blue text-xs font-black flex items-center justify-center">{d}</span>
            ))}
            <span className="text-xs font-bold text-gold-400 ml-1">= {last.sum}</span>
            {pendingCount > 0 && <span className="ml-2 text-[10px] font-bold text-gold-400">{pendingCount} bet(s)</span>}
          </div>
        </TimerCard>

        <Card className="relative space-y-3">
          <CountdownOverlay round={round} locked={locked} />
          <div className="grid grid-cols-6 gap-1.5">
            {POSITIONS.map((p) => (
              <button key={p} onClick={() => { sfx.click(); setPos(p); }} className={cn("h-10 rounded-xl font-black text-sm btn-press border", pos === p ? "grad-blue border-transparent" : "bg-white/5 border-white/10 text-white/60")}>
                {p}
              </button>
            ))}
          </div>
          {pos !== "SUM" && (
            <div className="grid grid-cols-5 gap-2 bg-black/25 rounded-xl p-3">
              {Array.from({ length: 10 }).map((_, n) => (
                <button key={n} onClick={() => pick(`n${n}`, `Number ${n}`)} className="h-12 rounded-xl bg-white/10 border border-white/10 font-black text-lg btn-press hover:bg-sky-500/30">
                  {n}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => pick("big", "Big", "grad-gold")} className="h-11 rounded-xl grad-gold text-night-950 font-black btn-press">Big</button>
            <button onClick={() => pick("small", "Small", "grad-blue")} className="h-11 rounded-xl grad-blue font-black btn-press">Small</button>
            <button onClick={() => pick("odd", "Odd", "grad-red")} className="h-11 rounded-xl grad-red font-black btn-press">Odd</button>
            <button onClick={() => pick("even", "Even", "grad-green")} className="h-11 rounded-xl grad-green font-black btn-press">Even</button>
          </div>
          <p className="text-[11px] text-white/45 text-center">{pos === "SUM" ? "Sum Big = 23-45 · Small = 0-22" : `Position ${pos}: number 9x · Big/Small/Odd/Even 2x`}</p>
        </Card>

        <Tabs tabs={[{ id: "history", label: "Game history" }, { id: "chart", label: "Chart" }, { id: "mine", label: "My history" }]} active={tab} onChange={(t) => { setTab(t); setPage(0); }} />
        {tab === "history" && (
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1.8fr_0.6fr] text-[11px] font-bold px-3 py-2.5 grad-blue">
              <span>Period</span><span className="text-center">A B C D E</span><span className="text-center">Sum</span>
            </div>
            <div className="divide-y divide-white/5">
              {history.map((h) => {
                const r = fiveDResult(h.periodId, duration);
                return (
                  <div key={h.periodId} className="grid grid-cols-[1.4fr_1.8fr_0.6fr] items-center px-3 py-2">
                    <span className="text-[11px] font-mono text-white/80">{h.periodId}</span>
                    <span className="flex justify-center gap-1">{r.digits.map((d, i) => <span key={i} className="w-6 h-6 rounded-md bg-white/10 text-xs font-black flex items-center justify-center">{d}</span>)}</span>
                    <span className="text-center text-lg font-black text-gold-400">{r.sum}</span>
                  </div>
                );
              })}
            </div>
            <Pager page={page} setPage={setPage} />
          </Card>
        )}
        {tab === "chart" && (
          <Card className="p-0 overflow-hidden">
            <div className="px-3 py-2.5 grad-blue text-[11px] font-bold">Position trend · {pos === "SUM" ? "Sum parity/size" : `Position ${pos}`}</div>
            <div className="divide-y divide-white/5">
              {history.map((h) => {
                const r = fiveDResult(h.periodId, duration);
                const v = pos === "SUM" ? r.sum : r.digits[POSITIONS.indexOf(pos)];
                const big = pos === "SUM" ? r.sum >= 23 : v >= 5;
                return (
                  <div key={h.periodId} className="flex items-center h-9 px-3 gap-2">
                    <span className="w-[88px] text-[10px] font-mono text-white/60">{h.periodId.slice(-6)}</span>
                    {pos !== "SUM" ? (
                      <div className="flex-1 flex justify-between">
                        {Array.from({ length: 10 }).map((_, n) => (
                          <span key={n} className={cn("w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold", n === v ? "ball grad-blue" : "text-white/25 border border-white/10")}>{n}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="flex-1 text-sm font-black text-gold-400">{r.sum}</span>
                    )}
                    <span className={cn("text-xs font-black w-5 text-center", big ? "text-gold-400" : "text-sky-400")}>{big ? "B" : "S"}</span>
                    <span className={cn("text-xs font-black w-5 text-center", v % 2 ? "text-ruby-400" : "text-emerald-400")}>{v % 2 ? "O" : "E"}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
        {tab === "mine" && <Card><MyBetsList game="5d" duration={duration} /></Card>}
      </div>
      <BetSheet game="5d" selection={selection} period={round.periodId} duration={duration} onClose={() => setSelection(null)} />
      <ResultPopup data={popup} onClose={closePopup} gameName="5D" />
    </div>
  );
};
